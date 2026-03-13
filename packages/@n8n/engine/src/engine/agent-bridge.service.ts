import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { ResumeCondition } from '../sdk/types';

// ---------------------------------------------------------------------------
// Minimal agent type surface — avoids importing @n8n/agents at build time
// due to TS moduleResolution issues with the monorepo workspace link.
// The runtime objects (Agent, Tool) come from the compiled workflow code
// which does its own `require("@n8n/agents")`.
// ---------------------------------------------------------------------------

/** Subset of @n8n/agents BuiltAgent used by the bridge */
interface AgentLike {
	generate(input: unknown, options?: unknown): Promise<GenerateResultLike>;
	resume(
		method: 'generate',
		data: unknown,
		options: { runId: string; toolCallId: string },
	): Promise<GenerateResultLike>;
}

/** Subset of @n8n/agents GenerateResult used by the bridge */
interface GenerateResultLike {
	messages: unknown[];
	structuredOutput?: unknown;
	usage?: { promptTokens?: number; completionTokens?: number };
	toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
	pendingSuspend?: {
		runId: string;
		toolCallId: string;
		toolName: string;
		input: unknown;
		suspendPayload: unknown;
	};
}

export interface AgentInvocation {
	executionId: string;
	stepId: string;
	agent: AgentLike;
	input: string | unknown[];
	/** Opaque state blob from a previous suspension (undefined on first invocation) */
	resumeState?: unknown;
	/** Resume data from the external caller (approval decision, user input, etc.) */
	resumeData?: unknown;
}

export interface AgentInvocationResult {
	status: 'completed' | 'suspended';
	/** Final output (when completed) */
	output?: unknown;
	/** Opaque snapshot blob for restoring agent state on resume (when suspended) */
	snapshot?: unknown;
	/** What condition must be met before the engine resumes this step */
	resumeCondition?: ResumeCondition;
	/** Human-readable payload for the UI/caller (when suspended) */
	suspendPayload?: unknown;
	/** Token usage */
	usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
	/** Tool calls made */
	toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
}

export class AgentBridgeService {
	constructor(
		private readonly stateDir: string, // e.g., '<data-dir>/agent-state'
	) {}

	/**
	 * Execute an agent invocation, bridging suspend/resume.
	 * TODO: Add streaming support — use agent.stream() and pipe chunks through sendChunk.
	 */
	async invoke(invocation: AgentInvocation): Promise<AgentInvocationResult> {
		const { agent, input, executionId, stepId, resumeState, resumeData } = invocation;

		let result: GenerateResultLike;

		if (resumeState && resumeData !== undefined) {
			// --- RESUME PATH ---
			const state = (await this.loadState(executionId, stepId)) as Record<string, unknown>;
			if (!state) throw new Error(`No saved agent state for ${executionId}/${stepId}`);

			result = await agent.resume('generate', resumeData, {
				runId: state.runId as string,
				toolCallId: state.toolCallId as string,
			});
		} else {
			// --- FIRST INVOCATION ---
			result = await agent.generate(input);
		}

		// Normalize token usage from the agents framework format
		const usage = result.usage
			? {
					promptTokens: result.usage.promptTokens ?? 0,
					completionTokens: result.usage.completionTokens ?? 0,
					totalTokens: (result.usage.promptTokens ?? 0) + (result.usage.completionTokens ?? 0),
				}
			: undefined;

		// Check if agent suspended
		if (result.pendingSuspend) {
			const stateBlob = {
				runId: result.pendingSuspend.runId,
				toolCallId: result.pendingSuspend.toolCallId,
			};
			await this.saveState(executionId, stepId, stateBlob);

			return {
				status: 'suspended',
				snapshot: stateBlob,
				resumeCondition: { type: 'approval' },
				suspendPayload: result.pendingSuspend.suspendPayload,
				usage,
				toolCalls: result.toolCalls,
			};
		}

		// Agent completed normally
		await this.deleteState(executionId, stepId);
		return {
			status: 'completed',
			output: result.structuredOutput ?? this.extractTextOutput(result),
			usage,
			toolCalls: result.toolCalls,
		};
	}

	// --- Filesystem state persistence ---

	async saveState(executionId: string, stepId: string, state: unknown): Promise<void> {
		const path = this.statePath(executionId, stepId);
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, JSON.stringify(state));
	}

	async loadState(executionId: string, stepId: string): Promise<unknown> {
		const path = this.statePath(executionId, stepId);
		const data = await readFile(path, 'utf-8');
		return JSON.parse(data);
	}

	async deleteState(executionId: string, stepId: string): Promise<void> {
		const path = this.statePath(executionId, stepId);
		await unlink(path).catch(() => {});
	}

	private statePath(executionId: string, stepId: string): string {
		return join(this.stateDir, executionId, `${stepId}.json`);
	}

	private extractTextOutput(result: GenerateResultLike): string | undefined {
		// Extract the last text content from agent messages
		for (let i = result.messages.length - 1; i >= 0; i--) {
			const msg = result.messages[i] as Record<string, unknown>;
			if ('content' in msg && Array.isArray(msg.content)) {
				for (let j = (msg.content as unknown[]).length - 1; j >= 0; j--) {
					const content = (msg.content as Record<string, unknown>[])[j];
					if (content.type === 'text' && 'text' in content) {
						return content.text as string;
					}
				}
			}
		}
		return undefined;
	}
}
