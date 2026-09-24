import { zodSchemaToJsonSchema } from '@n8n/ai-utilities/json-schema';
import type { JSONSchema7 } from 'json-schema';

import { executeTool, isSuspendedToolResult, type SuspendedToolResult } from './tool-adapter';
import {
	guardToolErrorForModel,
	guardToolMessageForModel,
	guardToolResultForModel,
	type ToolResultGuardStorage,
} from './tool-result-guard';
import {
	protectUntrustedToolError,
	protectUntrustedToolMessage,
	protectUntrustedToolResult,
} from './untrusted-tool-output';
import { isAbortError, raceWithAbort } from '../../sdk/abort';
import { isCancellation } from '../../sdk/cancellation';
import { isLlmMessage } from '../../sdk/message';
import type { BuiltTool, ToolSuspendOptions } from '../../types';
import { AgentEvent } from '../../types/runtime/event';
import type {
	ProcessToolCallParams,
	ToolCallExecutorDeps,
	ToolCallOutcome,
} from '../../types/runtime/tool-execution';
import type { AgentMessage, ContentToolCall, Message } from '../../types/sdk/message';
import type { JSONValue } from '../../types/utils/json';
import { parseWithSchema } from '../../utils/parse';
import { isZodSchema } from '../../utils/zod';
import { incrementToolCallCount } from '../loop/execution-counter';
import { stringifyError } from '../loop/runtime-helpers';
import type { AgentMessageList } from '../model/message-list';
import type { AgentEventBus } from '../state/event-bus';
import type { RuntimeTelemetry } from '../telemetry/runtime-telemetry';

interface InterruptedToolSuspension {
	didSuspend: boolean;
	abortObserved: boolean;
	payload: unknown;
	options?: ToolSuspendOptions;
	cleanup?: Promise<void>;
}

/** A tool-call content block that has already been settled by the AI SDK. */
type SettledToolCall = ContentToolCall & { state: 'resolved' | 'rejected' };

function isDeniedApprovalResumeData(value: unknown): boolean {
	return value !== null && typeof value === 'object' && Reflect.get(value, 'approved') === false;
}

function shouldEmitToolExecutionStart(tool: BuiltTool, resumeData: unknown): boolean {
	if (!tool.approval) return true;
	if (!tool.approval.required && tool.approval.conditional !== true) return true;
	if (resumeData === undefined) return false;
	return !isDeniedApprovalResumeData(resumeData);
}

function getToolResumeJsonSchema(
	tool: BuiltTool,
	resumeSchemaOverride?: ToolSuspendOptions['resumeSchema'],
): JSONSchema7 | undefined {
	const resolvedSchema = resumeSchemaOverride ?? tool.resumeSchema;
	if (!resolvedSchema) return undefined;
	return isZodSchema(resolvedSchema) ? zodSchemaToJsonSchema(resolvedSchema) : resolvedSchema;
}

/** Execute one tool call and keep its result, cancellation, and lifecycle events together. */
export class ToolCallRunner {
	private offloadedToolResults = false;

	constructor(private readonly deps: ToolCallExecutorDeps) {}

	get hasOffloadedToolResults(): boolean {
		return this.offloadedToolResults;
	}

	private get telemetry(): RuntimeTelemetry {
		return this.deps.telemetry;
	}

	private get eventBus(): AgentEventBus {
		return this.deps.eventBus;
	}

	/**
	 * Execute a single tool call, emit lifecycle events, record the result in the
	 * message list, and return the outcome. The caller is responsible for writing
	 * any stream chunks and for handling suspension (building pendingToolCalls and
	 * persisting state).
	 *
	 * On tool execution errors, emits ToolExecutionEnd with isError=true, adds an
	 * error tool-result message to the list so the LLM can self-correct, and returns
	 * `{ outcome: 'error' }` — never re-throws.
	 */
	async processToolCall(params: ProcessToolCallParams): Promise<ToolCallOutcome> {
		const { toolName, toolMap, list, toolCallId, resumeData } = params;
		const builtTool = toolMap.get(toolName);

		if (!builtTool) {
			return await this.toolError(params, new Error(`Tool ${toolName} not found`));
		}

		// Already settled by the AI SDK (e.g. provider-executed tools): emit the
		// lifecycle end and skip re-execution.
		const settledBlock = this.findSettledToolCall(list, toolCallId);
		if (settledBlock) {
			return this.completeSettledToolCall(params, settledBlock);
		}

		if (isCancellation(resumeData) && !builtTool.handleCancellation) {
			try {
				await this.runCancellationCleanup(params, builtTool, resumeData.message);
			} catch {
				return { outcome: 'retryable-error' };
			}
			return this.buildCancelledOutcome(params, resumeData.message);
		}

		if (params.countToolCall ?? true) {
			incrementToolCallCount(params.executionCounter);
		}

		const validation = await this.validateToolInput(params, builtTool);
		if (!validation.ok) return validation.outcome;
		const input = validation.input;

		if (shouldEmitToolExecutionStart(builtTool, resumeData)) {
			this.eventBus.emit({
				type: AgentEvent.ToolExecutionStart,
				toolCallId,
				toolName,
				args: input,
			});
		}

		return await this.executeValidatedToolCall(params, builtTool, input);
	}

	private async executeValidatedToolCall(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		input: JSONValue,
	): Promise<ToolCallOutcome> {
		let toolResult: unknown;
		const suspension: InterruptedToolSuspension = {
			didSuspend: false,
			abortObserved: false,
			payload: undefined,
		};
		try {
			toolResult = await this.runToolHandler(params, builtTool, input, async (payload, options) => {
				suspension.didSuspend = true;
				suspension.payload = payload;
				suspension.options = options;
				if (suspension.abortObserved || params.abortSignal?.aborted) {
					await this.cleanupInterruptedSuspension(params, builtTool, input, suspension);
				}
			});
		} catch (error) {
			if (isAbortError(error) || params.abortSignal?.aborted) {
				suspension.abortObserved = true;
				await this.cleanupAbortedTool(params, builtTool, input, suspension);
				this.deps.onCancelled();
				return this.buildCancelledOutcome(params, 'Run aborted');
			}
			return await this.toolError(params, error, builtTool);
		}

		if (isSuspendedToolResult(toolResult)) {
			return await this.buildSuspendedOutcome(params, builtTool, toolResult);
		}
		return await this.buildSuccessOutcome(params, builtTool, input, toolResult);
	}

	private async cleanupInterruptedSuspension(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		input: JSONValue,
		suspension: InterruptedToolSuspension,
	): Promise<void> {
		// Both abort and late suspension can reach this path. Run cleanup only once.
		suspension.cleanup ??= this.runCancellationCleanup(
			{
				...params,
				input,
				suspendPayload: suspension.payload,
				continuation: suspension.options?.continuation,
				resumeSchema: getToolResumeJsonSchema(builtTool, suspension.options?.resumeSchema),
			},
			builtTool,
			'Run aborted',
		).catch(() => undefined);
		await suspension.cleanup;
	}

	private async cleanupAbortedTool(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		input: JSONValue,
		suspension: InterruptedToolSuspension,
	): Promise<void> {
		if (suspension.didSuspend) {
			await this.cleanupInterruptedSuspension(params, builtTool, input, suspension);
		} else if (params.suspendPayload !== undefined || params.continuation !== undefined) {
			try {
				await this.runCancellationCleanup({ ...params, input }, builtTool, 'Run aborted');
			} catch {
				// Parent shutdown must continue; persistent stores will prune stale checkpoints.
			}
		}
	}

	async runCancellationCleanup(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		message: string,
	): Promise<void> {
		if (!builtTool.onCancellation) return;
		await builtTool.onCancellation(params.input, {
			cancellation: { message },
			toolCallId: params.toolCallId,
			toolName: params.toolName,
			runId: params.runId,
			persistence: params.persistence,
			parentTelemetry: params.resolvedTelemetry,
			emitEvent: (event) => this.eventBus.emit(event),
			abortSignal: params.abortSignal,
			executionCounter: params.executionCounter,
			suspendPayload: params.suspendPayload,
			continuation: params.continuation,
			resumeSchema: params.resumeSchema,
		});
	}

	/**
	 * Emit a failed ToolExecutionEnd, record the error on the list, return an
	 * error outcome. Pass `builtTool` only for errors authored by the tool
	 * itself (handler or transform failures) so runtime-authored errors such as
	 * input validation stay plain; tool-authored text from untrusted tools is
	 * wrapped before the size guard so any offloaded copy stays protected.
	 */
	private async toolError(
		params: ProcessToolCallParams,
		error: unknown,
		builtTool?: BuiltTool,
	): Promise<ToolCallOutcome> {
		this.eventBus.emit({
			type: AgentEvent.ToolExecutionEnd,
			toolCallId: params.toolCallId,
			toolName: params.toolName,
			result: error,
			isError: true,
		});
		const errorText = stringifyError(error);
		const guardedError = await guardToolErrorForModel(
			builtTool?.outputTrust === 'untrusted'
				? protectUntrustedToolError(errorText, builtTool)
				: errorText,
			this.deps.tokenCounter,
			this.getResultStorage(params),
		);
		params.list.setToolCallError(params.toolCallId, guardedError);
		return { outcome: 'error', error: guardedError };
	}

	/** Find an already-settled (resolved/rejected) tool-call block for this id, if any. */
	private findSettledToolCall(
		list: AgentMessageList,
		toolCallId: string,
	): SettledToolCall | undefined {
		return list
			.responseDelta()
			.flatMap((m) => (isLlmMessage(m) && 'content' in m ? (m as Message).content : []))
			.find(
				(c): c is SettledToolCall =>
					c.type === 'tool-call' && c.toolCallId === toolCallId && c.state !== 'pending',
			);
	}

	/** Emit ToolExecutionEnd for a block the AI SDK already settled; the result was written earlier. */
	private completeSettledToolCall(
		params: ProcessToolCallParams,
		settledBlock: SettledToolCall,
	): ToolCallOutcome {
		const settledResult =
			settledBlock.state === 'resolved' ? settledBlock.output : settledBlock.error;
		this.eventBus.emit({
			type: AgentEvent.ToolExecutionEnd,
			toolCallId: params.toolCallId,
			toolName: params.toolName,
			result: settledResult,
			isError: settledBlock.state === 'rejected',
		});
		return { outcome: 'noop' };
	}

	/** Record a cancelled tool call (user declined / cancelled) and build its outcome. */
	private buildCancelledOutcome(
		params: ProcessToolCallParams,
		userMessage: string,
	): ToolCallOutcome {
		const { toolCallId, toolName, input, list } = params;
		const modelOutput = `[Tool call cancelled. User said: "${userMessage}"]`;
		this.eventBus.emit({
			type: AgentEvent.ToolExecutionEnd,
			toolCallId,
			toolName,
			result: modelOutput,
			isError: false,
		});
		list.setToolCallResult(toolCallId, modelOutput, { canceled: true });
		return {
			outcome: 'cancelled',
			toolEntry: { tool: toolName, input, output: modelOutput, transformed: false, canceled: true },
			modelOutput,
			userMessage,
			canceled: true,
		};
	}

	/** Validate input against the tool's input schema (if any). */
	private async validateToolInput(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
	): Promise<{ ok: true; input: JSONValue } | { ok: false; outcome: ToolCallOutcome }> {
		if (!builtTool.inputSchema) return { ok: true, input: params.input };
		const result = await parseWithSchema(builtTool.inputSchema, params.input);
		if (!result.success) {
			const reason = result.schemaInvalid
				? `Tool ${params.toolName} has an input schema that could not be compiled: ${result.error}`
				: `Invalid tool input: ${result.error}`;
			return { ok: false, outcome: await this.toolError(params, new Error(reason)) };
		}
		return { ok: true, input: result.data as JSONValue };
	}

	/** Execute the tool handler inside a telemetry span. Throws on handler failure. */
	private async runToolHandler(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		input: JSONValue,
		onSuspend: (payload: unknown, options?: ToolSuspendOptions) => void,
	): Promise<unknown> {
		const {
			toolCallId,
			toolName,
			runId,
			persistence,
			resumeData,
			resolvedTelemetry,
			executionCounter,
			abortSignal,
			suspendPayload,
			continuation,
			resumeSchema,
		} = params;
		return await this.telemetry.withToolSpan(
			toolCallId,
			toolName,
			input,
			resolvedTelemetry,
			async () =>
				await raceWithAbort(
					async () =>
						await executeTool(input, builtTool, resumeData, resolvedTelemetry, toolCallId, {
							runId,
							persistence,
							...(this.deps.loadSkill ? { loadSkill: this.deps.loadSkill } : {}),
							emitEvent: (event) => this.eventBus.emit(event),
							abortSignal,
							executionCounter,
							suspendPayload,
							continuation,
							resumeSchema,
							onSuspend,
						}),
					abortSignal,
				),
		);
	}

	/** Validate a suspend payload + resume schema and build the suspended outcome. */
	private async buildSuspendedOutcome(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		toolResult: SuspendedToolResult,
	): Promise<ToolCallOutcome> {
		if (builtTool.suspendSchema) {
			const parseResult = await parseWithSchema(builtTool.suspendSchema, toolResult.payload);
			if (!parseResult.success) {
				return await this.toolError(
					params,
					new Error(`Invalid suspend payload: ${parseResult.error}`),
				);
			}
			toolResult.payload = parseResult.data;
		}
		const resumeSchema = getToolResumeJsonSchema(builtTool, toolResult.resumeSchema);
		if (!resumeSchema) {
			return await this.toolError(
				params,
				new Error(`Tool ${params.toolName} has no resume schema`),
			);
		}
		return {
			outcome: 'suspended',
			payload: toolResult.payload,
			resumeSchema,
			...(toolResult.continuation !== undefined ? { continuation: toolResult.continuation } : {}),
		};
	}

	/** Convert the tool output before recording success. */
	private async buildSuccessOutcome(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		input: JSONValue,
		toolResult: unknown,
	): Promise<ToolCallOutcome> {
		const { toolCallId, toolName, list } = params;

		// Apply toModelOutput transform before emitting the success event.
		// If the transform throws, treat it as a tool error so processToolCall
		// never re-throws (preserving the "never re-throws" contract).
		// Untrusted results are wrapped before the size guard so any offloaded
		// or truncated copy stays protected while the guard's own envelope
		// remains plain runtime text.
		let modelResult: unknown;
		try {
			modelResult = builtTool.toModelOutput ? builtTool.toModelOutput(toolResult) : toolResult;
			if (builtTool.outputTrust === 'untrusted') {
				modelResult = protectUntrustedToolResult(modelResult, builtTool);
			}
		} catch (error) {
			return await this.toolError(params, error, builtTool);
		}
		const storage = this.getResultStorage(params);
		const guardedResult = await guardToolResultForModel(
			modelResult,
			this.deps.tokenCounter,
			storage,
		);
		let guardedCustomMessage: AgentMessage | undefined;
		try {
			guardedCustomMessage = await this.prepareCustomToolMessage(
				params,
				builtTool,
				toolResult,
				storage,
			);
		} catch (error) {
			return await this.toolError(params, error, builtTool);
		}

		this.eventBus.emit({
			type: AgentEvent.ToolExecutionEnd,
			toolCallId,
			toolName,
			result: toolResult,
			isError: false,
		});

		list.setToolCallResult(toolCallId, guardedResult.historyOutput);
		if (guardedCustomMessage) {
			list.addResponse([guardedCustomMessage]);
		}

		return {
			outcome: 'success',
			toolEntry: {
				tool: toolName,
				input,
				output: toolResult,
				transformed: !!builtTool.toModelOutput,
			},
			modelOutput: guardedResult.wireOutput,
			customMessage: guardedCustomMessage,
			...(builtTool.mcpServerName !== undefined ? { mcpServerName: builtTool.mcpServerName } : {}),
		};
	}

	private async prepareCustomToolMessage(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		toolResult: unknown,
		storage: ToolResultGuardStorage | undefined,
	): Promise<AgentMessage | undefined> {
		let customMessage = await builtTool.toMessage?.(toolResult);
		if (customMessage && builtTool.outputTrust === 'untrusted') {
			customMessage = protectUntrustedToolMessage(customMessage, builtTool);
		}
		let guardedCustomMessage = customMessage
			? await guardToolMessageForModel(customMessage, this.deps.tokenCounter, storage)
			: undefined;
		// Stamp tool provenance so derived transcripts (e.g. the observation
		// log observer) can keep this content inside untrusted-data boundaries.
		if (guardedCustomMessage && 'role' in guardedCustomMessage) {
			guardedCustomMessage = {
				...guardedCustomMessage,
				origin: { kind: 'tool', toolName: params.toolName },
			};
		}
		return guardedCustomMessage;
	}

	private getResultStorage(params: ProcessToolCallParams): ToolResultGuardStorage | undefined {
		const filesystem = this.deps.workspaceFilesystem;
		if (!filesystem) return undefined;

		return {
			filesystem,
			runId: params.runId,
			toolCallId: params.toolCallId,
			onOffloaded: () => {
				this.offloadedToolResults = true;
			},
			...(params.abortSignal ? { abortSignal: params.abortSignal } : {}),
		};
	}
}
