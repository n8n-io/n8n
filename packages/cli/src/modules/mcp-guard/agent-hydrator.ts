import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type { GymSeeder } from './gym-admin';
import { COMMON_INSTRUCTIONS } from './hydration-prompts';
import type { McpCaller } from './mcp-upstream';
import { OnceByKey } from './once-by-key';
import type { Hydrator } from './router';

export interface HydrationTool {
	name: string;
	description: string;
	input: z.ZodObject<z.ZodRawShape>;
	run(input: Record<string, unknown>): Promise<string>;
}

// Runs a model with tools until it stops. Kept apart from the agent SDK so tests can fake it.
export type HydrationLlm = (request: {
	instructions: string;
	prompt: string;
	tools: HydrationTool[];
	maxIterations: number;
}) => Promise<void>;

interface AgentHydratorDeps {
	admin: GymSeeder;
	tenant: string;
	upstream: McpCaller;
	gym: McpCaller;
	readTools: ReadonlySet<string>;
	// Service part of the instructions, see hydration-prompts.ts.
	serviceInstructions: string;
	llm: HydrationLlm;
}

const MAX_TEXT = 40_000;
const MAX_ITERATIONS = 24;

const clip = (text: string, max = MAX_TEXT): string =>
	text.length > max ? `${text.slice(0, max)}\n[cut: ${text.length - max} more characters]` : text;

const resultText = (res: CallToolResult): string =>
	res.content.flatMap((c) => (c.type === 'text' ? [c.text] : [])).join('\n');

const errText = (e: unknown): string => (e instanceof Error ? e.message : 'unknown error');

/**
 * Hydrates the gym with an LLM agent instead of one parser for each tool. The agent decides which
 * real reads it needs and what to seed, then checks the gym answers the original call.
 *
 * The agent can only call the real service's read tools (the allowlist is checked here, not in the
 * prompt) and write to this run's gym tenant. A failed hydration never fails the call: the gym
 * then answers with what it has, as with the parser hydrators.
 */
export class AgentHydrator implements Hydrator {
	private readonly once = new OnceByKey();

	constructor(private readonly deps: AgentHydratorDeps) {}

	async hydrate(
		toolName: string,
		args: Record<string, unknown>,
		result: CallToolResult,
	): Promise<void> {
		// An identical read that is running waits for it. One that finished is not run again.
		await this.once.run(`${toolName} ${JSON.stringify(args)}`, async () => {
			const prompt = [
				'An agent called a read tool. Make the gym answer this call like the real service did.',
				`Tool: ${toolName}`,
				`Args: ${JSON.stringify(args)}`,
				'Real result:',
				clip(resultText(result)),
			].join('\n');
			return await this.run(toolName, prompt);
		});
	}

	async hydrateWrite(toolName: string, args: Record<string, unknown>): Promise<void> {
		const prompt = [
			'An agent is about to call a write tool. The call runs in the gym only. Make sure the objects it refers to (its parent, target page, database or issue) exist in the gym with their real ids, so the call can run. Do not call the write tool and do not apply its change.',
			`Tool: ${toolName}`,
			`Args: ${JSON.stringify(args)}`,
			'There is no real result. Read the real objects you need with real_read, then seed them.',
		].join('\n');
		await this.run(toolName, prompt);
	}

	private async run(toolName: string, prompt: string): Promise<boolean> {
		const started = Date.now();
		try {
			const tools = this.tools();
			// Count the tool calls, to see how much work one hydration costs.
			let calls = 0;
			for (const t of tools) {
				const run = t.run;
				t.run = async (input) => {
					calls++;
					const at = Date.now() - started;
					const result = await run(input);
					// Time between two calls is model time. The call's own time is tool time.
					Container.get(Logger).info(
						`mcp-guard hydration ${toolName}: +${at} ms ${t.name} took ${Date.now() - started - at} ms, answer ${result.length} chars`,
					);
					return result;
				};
			}
			await this.deps.llm({
				instructions: `${COMMON_INSTRUCTIONS}\n${this.deps.serviceInstructions}`,
				prompt,
				tools,
				maxIterations: MAX_ITERATIONS,
			});
			Container.get(Logger).info(
				`mcp-guard hydration agent ${toolName}: ${calls} tool calls, ${Date.now() - started} ms`,
			);
			return true;
		} catch (e) {
			// Tool name and error only. Never log args or real data.
			Container.get(Logger).warn(`mcp-guard hydration agent failed for ${toolName}`);
			return false;
		}
	}

	private tools(): HydrationTool[] {
		const { admin, tenant, upstream, gym, readTools } = this.deps;
		const callArgs = z.object({
			tool: z.string().describe('Name of a read tool'),
			args: z.record(z.unknown()).describe('Arguments of the tool'),
		});
		const guarded =
			(caller: McpCaller) =>
			async (input: Record<string, unknown>): Promise<string> => {
				const tool = String(input.tool);
				// A tool outside the read list could change data. Refuse it in code.
				if (!readTools.has(tool)) return `error: ${tool} is not a read tool`;
				try {
					const args = (input.args ?? {}) as Record<string, unknown>;
					const res = await caller.callTool(tool, args);
					return `${res.isError ? 'tool error: ' : ''}${clip(resultText(res))}`;
				} catch (e) {
					return `error: ${errText(e)}`;
				}
			};
		const attempt = async (fn: () => Promise<unknown>): Promise<string> => {
			try {
				return clip(JSON.stringify((await fn()) ?? 'ok'), 4000);
			} catch (e) {
				return `error: ${errText(e)}`;
			}
		};
		return [
			{
				name: 'real_read',
				description: 'Call a read tool of the real service.',
				input: callArgs,
				run: guarded(upstream),
			},
			{
				name: 'gym_read',
				description: 'Call a read tool of the gym, to check what it answers.',
				input: callArgs,
				run: guarded(gym),
			},
			{
				name: 'gym_seed',
				description: 'Seed the gym with a world document (JSON object).',
				input: z.object({ overlay: z.record(z.unknown()).describe('The world document') }),
				run: async (input) => await attempt(async () => await admin.seed(tenant, input.overlay)),
			},
			{
				name: 'gym_event',
				description: 'Send an admin event to the gym, such as append_blocks.',
				input: z.object({ event: z.record(z.unknown()).describe('The event') }),
				run: async (input) => await attempt(async () => await admin.event(tenant, input.event)),
			},
		];
	}
}
