import { v4 as uuid } from 'uuid';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { INodeTypeDescription } from 'n8n-workflow';

import { CodeWorkflowBuilder } from '../../src/code-builder/code-workflow-builder';
import type { TokenUsage } from '../../src/code-builder/types';
import type {
	StreamChunk,
	WorkflowUpdateChunk,
	ToolProgressChunk,
} from '../../src/types/streaming';

import { verifyChecklist } from './checklist';
import type { AgentResult, ChecklistItem, Iteration, PromptConfig, ToolCallDetail } from './types';

function isWorkflowUpdateChunk(chunk: StreamChunk): chunk is WorkflowUpdateChunk {
	return chunk.type === 'workflow-updated';
}

function isToolProgressChunk(chunk: StreamChunk): chunk is ToolProgressChunk {
	return chunk.type === 'tool';
}

export interface RunnerConfig {
	nodeTypes: INodeTypeDescription[];
	nodeDefinitionDirs: string[];
	llm: BaseChatModel;
	timeoutMs?: number;
	verbose?: boolean;
}

export async function runSingleExample(
	config: RunnerConfig,
	prompt: PromptConfig,
	checklist: ChecklistItem[],
): Promise<AgentResult> {
	const startTime = Date.now();

	// Track token usage per LLM call
	const tokenSnapshots: TokenUsage[] = [];
	const toolCallsPerIteration: ToolCallDetail[][] = [];
	let currentToolCalls: ToolCallDetail[] = [];
	// Map toolCallId -> ToolCallDetail for merging running/completed/error chunks
	const toolCallById = new Map<string, ToolCallDetail>();

	const builder = new CodeWorkflowBuilder({
		llm: config.llm,
		nodeTypes: config.nodeTypes,
		nodeDefinitionDirs: config.nodeDefinitionDirs,
		onTokenUsage: (usage: TokenUsage) => {
			tokenSnapshots.push(usage);
			// Each token usage callback = end of one LLM iteration
			// Capture accumulated tool calls for this iteration
			toolCallsPerIteration.push([...currentToolCalls]);
			currentToolCalls = [];
			toolCallById.clear();
		},
	});

	const payload = {
		id: `checklist-eval-${uuid()}`,
		featureFlags: { codeBuilder: true as const },
		message: prompt.text,
		workflowContext: {
			currentWorkflow: { id: `eval-${uuid()}`, nodes: [], connections: {} },
		},
	};

	let sourceCode = '';
	let workflowJson = '';
	let success = false;

	// Setup timeout
	const abortController = new AbortController();
	let timeoutId: NodeJS.Timeout | undefined;
	const timeoutMs = config.timeoutMs ?? 5 * 60 * 1000; // 5 min default

	if (timeoutMs > 0) {
		timeoutId = setTimeout(() => {
			abortController.abort(new Error(`Timed out after ${timeoutMs}ms`));
		}, timeoutMs);
	}

	try {
		for await (const output of builder.chat(payload, 'checklist-eval', abortController.signal)) {
			for (const message of output.messages) {
				if (isToolProgressChunk(message)) {
					const toolCallId = message.toolCallId as string | undefined;
					const status = message.status;

					if (status === 'running') {
						const detail: ToolCallDetail = {
							name: message.toolName,
							status,
							args: message.args as Record<string, unknown> | undefined,
						};
						currentToolCalls.push(detail);
						if (toolCallId) toolCallById.set(toolCallId, detail);
					} else if (toolCallId && toolCallById.has(toolCallId)) {
						// Merge completed/error data into existing detail
						const existing = toolCallById.get(toolCallId)!;
						existing.status = status;
						if (status === 'completed') {
							existing.result = message.result as string | undefined;
						}
						if (status === 'error') {
							existing.error = message.error as string | undefined;
						}
					}
				}

				if (isWorkflowUpdateChunk(message)) {
					workflowJson = message.codeSnippet ?? '';
					sourceCode = message.sourceCode ?? '';
					success = true;
				}
			}
		}
	} catch (error) {
		if (config.verbose) {
			console.error(
				`  Error running prompt: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	} finally {
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
	}

	const totalTimeMs = Date.now() - startTime;

	// Build iterations from token snapshots
	const iterations: Iteration[] = tokenSnapshots.map((snapshot, i) => ({
		iterationNumber: i + 1,
		durationMs: 0, // Individual iteration timing not available from token callback
		inputTokens: snapshot.inputTokens,
		outputTokens: snapshot.outputTokens,
		thinkingTokens: snapshot.thinkingTokens,
		toolCalls: toolCallsPerIteration[i] ?? [],
		errors: '',
	}));

	// Calculate totals
	const totalInputTokens = tokenSnapshots.reduce((sum, s) => sum + s.inputTokens, 0);
	const totalOutputTokens = tokenSnapshots.reduce((sum, s) => sum + s.outputTokens, 0);

	// Use sourceCode for verification; fall back to workflowJson if sourceCode is empty
	const codeForVerification = sourceCode || workflowJson;
	const linesOfCode = codeForVerification ? codeForVerification.split('\n').length : 0;

	// Verify checklist if we have code to verify
	let checklistResults = checklist.map((item) => ({
		id: item.id,
		pass: false,
		reasoning: 'No code generated',
	}));
	let checklistScore = 0;

	if (success && codeForVerification) {
		try {
			checklistResults = await verifyChecklist(codeForVerification, checklist);
			const passedCount = checklistResults.filter((r) => r.pass).length;
			checklistScore = checklist.length > 0 ? passedCount / checklist.length : 0;
		} catch (error) {
			if (config.verbose) {
				console.error(
					`  Checklist verification failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	return {
		prompt: prompt.text,
		complexity: prompt.complexity,
		tags: prompt.tags,
		generatedCode: sourceCode || workflowJson,
		workflowJson,
		success,
		totalTimeMs,
		iterations,
		checklist,
		checklistResults,
		checklistScore,
		totalInputTokens,
		totalOutputTokens,
		linesOfCode,
	};
}
