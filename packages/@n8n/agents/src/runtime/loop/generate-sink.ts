import type {
	CompleteEmission,
	ModelCallContext,
	ModelTurnResult,
	RunOutputSink,
	RunServices,
	SuspendEmission,
} from './run-output-sink';
import type { GenerateResult } from '../../types';
import type { ToolResultEntry } from '../../types/sdk/agent';
import { loadAi } from '../model/lazy-ai';
import { fromAiFinishReason, fromAiMessages } from '../model/messages';
import type { ToolCallBatchResult } from '../tools/tool-call-executor';

/**
 * Non-streaming output sink: drives the loop with `generateText`, accumulates a
 * tool-call summary, and assembles the final `GenerateResult` (including the
 * `pendingSuspend` shape on suspension).
 */
export class GenerateSink implements RunOutputSink<GenerateResult> {
	private readonly toolCallSummary: ToolResultEntry[] = [];

	constructor(private readonly services: RunServices) {}

	// The non-streaming path returns usage on its result; nothing to track here.
	reportUsage(): void {}

	async callModel(ctx: ModelCallContext): Promise<ModelTurnResult> {
		const { generateText } = loadAi();
		const result = await generateText({
			model: ctx.model,
			system: ctx.system,
			messages: ctx.messages,
			abortSignal: ctx.abortSignal,
			...(ctx.hasTools ? { tools: ctx.aiTools } : {}),
			...(ctx.providerOptions ? { providerOptions: ctx.providerOptions } : {}),
			...(ctx.outputSpec ? { output: ctx.outputSpec } : {}),
			...ctx.aiSdkOptions,
		});

		const aiFinishReason = result.finishReason;
		return {
			aiFinishReason,
			finishReason: fromAiFinishReason(aiFinishReason),
			usage: result.usage,
			newMessages: fromAiMessages(result.response.messages),
			toolCalls: result.toolCalls,
			structuredOutput:
				ctx.outputSpec && aiFinishReason !== 'tool-calls' ? result.output : undefined,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- sync work behind an async interface
	async emitToolBatch(batch: ToolCallBatchResult): Promise<void> {
		for (const r of batch.results) {
			this.toolCallSummary.push(r.toolEntry);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- sync work behind an async interface
	async finishSuspended(emission: SuspendEmission): Promise<GenerateResult> {
		const { suspendRunId, list, usage, suspensions } = emission;
		return {
			runId: suspendRunId,
			messages: list.responseDelta(),
			finishReason: 'tool-calls',
			usage,
			pendingSuspend: suspensions.map((s) => ({
				runId: suspendRunId,
				toolCallId: s.toolCallId,
				toolName: s.toolName,
				input: s.input,
				suspendPayload: s.payload,
				resumeSchema: s.resumeSchema,
			})),
			getState: () => this.services.getState(),
		};
	}

	async finishComplete(emission: CompleteEmission): Promise<GenerateResult> {
		const { list, options, finishReason, usage, structuredOutput } = emission;
		await this.services.saveToMemory(list, options);
		await this.services.maybeGenerateTitle(list, options);
		await this.services.cleanupRun();
		await this.services.flushTelemetry(options);

		return {
			runId: this.services.runId,
			messages: list.responseDelta(),
			finishReason,
			usage,
			...(structuredOutput !== undefined && { structuredOutput }),
			...(this.toolCallSummary.length > 0 && { toolCalls: this.toolCallSummary }),
			getState: () => this.services.getState(),
		};
	}
}
