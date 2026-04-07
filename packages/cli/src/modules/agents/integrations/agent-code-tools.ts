import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { AgentSecureRuntime } from '../agent-secure-runtime';
import type { Agent } from '../entities/agent.entity';

interface AgentCodeRepository {
	findByIdAndProjectId(id: string, projectId: string): Promise<Agent | null>;
}

/**
 * Tool that returns the agent's current TypeScript source code.
 * The agent reads this before modifying itself so it has full context.
 */
export function createGetMyCodeTool(
	agentRepository: AgentCodeRepository,
	agentId: string,
	projectId: string,
) {
	return new Tool('get_my_code')
		.description(
			"Return this agent's current TypeScript source code. " +
				'Call this before modifying yourself so you have the full context.',
		)
		.input(z.object({}))
		.handler(async () => {
			const entity = await agentRepository.findByIdAndProjectId(agentId, projectId);
			return { code: entity?.code ?? '' };
		});
}

/**
 * Tool that compiles and validates proposed TypeScript agent code.
 * Mirrors the builder agent's typecheck tool — call this before set_code.
 */
export function createTypecheckTool(secureRuntime: Pick<AgentSecureRuntime, 'describeSecurely'>) {
	return new Tool('typecheck')
		.description(
			'Compile and validate TypeScript agent code. ' +
				'Returns { ok: true } if the code is valid, or { ok: false, error: string } with the error. ' +
				'Always call this before set_code.',
		)
		.input(
			z.object({
				code: z.string().describe('The full TypeScript source code to validate'),
			}),
		)
		.handler(async ({ code }: { code: string }) => {
			try {
				await secureRuntime.describeSecurely(code);
				return { ok: true, error: null };
			} catch (e) {
				return { ok: false, error: e instanceof Error ? e.message : String(e) };
			}
		});
}

/**
 * Tool that saves the agent's new TypeScript source code.
 * Only call this after typecheck passes.
 */
export function createSetCodeTool(setCode: (code: string) => Promise<void>) {
	return new Tool('set_code')
		.description(
			'Save the new TypeScript source code for this agent. ' +
				'Call this with the COMPLETE, final code only after typecheck passes. ' +
				'The change takes effect on the next conversation turn.',
		)
		.input(
			z.object({
				code: z.string().describe('The complete TypeScript agent source code'),
			}),
		)
		.handler(async ({ code }: { code: string }) => {
			await setCode(code);
			return { ok: true };
		});
}
