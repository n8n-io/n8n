// ---------------------------------------------------------------------------
// In-process workflow build for pairwise evals.
//
// Rather than wire up the full orchestrator (which requires a
// BackgroundTaskManager, workflowTaskService, trace context, etc.), we
// invoke the same builder sub-agent that the orchestrator would delegate
// to — a Mastra Agent given BUILDER_AGENT_PROMPT plus the `build-workflow`
// tool and a few supporting domain tools. For single-workflow prompts in
// the pairwise dataset the orchestrator's only job is to route here, so
// skipping it loses nothing material.
//
// The built workflow is captured through the stub `workflowService`'s
// `createFromWorkflowJSON` hook — the `build-workflow` tool calls it.
// ---------------------------------------------------------------------------

import { Agent } from '@mastra/core/agent';
import { nanoid } from 'nanoid';

import type { SimpleWorkflow } from '../../../ai-workflow-builder.ee/evaluations/evaluators/pairwise';

import { createAllTools } from '../../src/tools';
import { BUILDER_AGENT_PROMPT } from '../../src/tools/orchestration/build-workflow-agent.prompt';
import type { ModelConfig } from '../../src/types';
import { createStubServices, defaultNodesJsonPath, type StubServiceHandle } from './stub-services';
import { normalizeWorkflow } from './normalize-workflow';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type BuildErrorClass = 'build_timeout' | 'no_workflow_built' | 'agent_error';

export interface InProcessBuildResult {
	success: boolean;
	workflow?: SimpleWorkflow;
	extraWorkflows: SimpleWorkflow[];
	errorClass?: BuildErrorClass;
	errorMessage?: string;
	durationMs: number;
	finalText?: string;
	interactivity: {
		askUserCount: number;
		planToolCount: number;
		autoApprovedSuspensions: number;
		mockedCredentialTypes: string[];
	};
}

export interface BuildInProcessOptions {
	prompt: string;
	modelId?: ModelConfig;
	nodesJsonPath?: string;
	timeoutMs?: number;
	/** Max builder steps — matches production default when omitted. */
	maxSteps?: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export async function buildInProcess(
	options: BuildInProcessOptions,
): Promise<InProcessBuildResult> {
	const started = Date.now();
	const timeoutMs = options.timeoutMs ?? 20 * 60 * 1000;
	const modelId: ModelConfig = options.modelId ?? 'anthropic/claude-sonnet-4-6';
	const maxSteps = options.maxSteps ?? 30;

	const interactivity = {
		askUserCount: 0,
		planToolCount: 0,
		autoApprovedSuspensions: 0,
		mockedCredentialTypes: new Set<string>(),
	};

	let services: StubServiceHandle;
	try {
		services = await createStubServices({
			nodesJsonPath: options.nodesJsonPath ?? defaultNodesJsonPath(),
		});
	} catch (error) {
		return failResult(started, 'agent_error', error, interactivity);
	}

	const allTools = createAllTools(services.context);
	// Subset matching the builder sub-agent's tool-mode toolset (see
	// `build-workflow-agent.tool.ts` lines 241-249).
	const builderToolNames = [
		'build-workflow',
		'nodes',
		'workflows',
		'data-tables',
		'templates',
	] as const;
	const builderTools: Record<string, unknown> = {};
	for (const name of builderToolNames) {
		const tool = (allTools as Record<string, unknown>)[name];
		if (tool) builderTools[name] = tool;
	}

	const agent = new Agent({
		id: 'eval-builder-' + nanoid(6),
		name: 'Eval Workflow Builder',
		instructions: {
			role: 'system' as const,
			content: BUILDER_AGENT_PROMPT,
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' as const } },
			},
		},
		model: modelId,
		tools: builderTools,
	});

	const abortController = new AbortController();
	const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs);

	let finalText: string | undefined;
	try {
		const streamSource = await agent.stream(options.prompt, {
			maxSteps,
			abortSignal: abortController.signal,
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' as const } },
			},
		});

		// Drain the stream — count tool calls of interest for the report.
		if (streamSource.fullStream) {
			for await (const chunk of streamSource.fullStream) {
				observeChunk(chunk, interactivity);
			}
		}
		if (streamSource.text) {
			finalText = await streamSource.text;
		}

		if (abortController.signal.aborted) {
			return failResult(
				started,
				'build_timeout',
				new Error(`Build exceeded ${timeoutMs}ms`),
				interactivity,
			);
		}
	} catch (error) {
		if (abortController.signal.aborted) {
			return failResult(
				started,
				'build_timeout',
				new Error(`Build exceeded ${timeoutMs}ms`),
				interactivity,
			);
		}
		return failResult(started, 'agent_error', error, interactivity);
	} finally {
		clearTimeout(timeoutHandle);
	}

	const captured = services.capturedWorkflows;
	if (captured.length === 0) {
		return failResult(
			started,
			'no_workflow_built',
			new Error('Builder finished without invoking build-workflow'),
			interactivity,
			finalText,
		);
	}

	const [first, ...extras] = captured.map(normalizeWorkflow);

	return {
		success: true,
		workflow: first,
		extraWorkflows: extras,
		durationMs: Date.now() - started,
		finalText,
		interactivity: {
			askUserCount: interactivity.askUserCount,
			planToolCount: interactivity.planToolCount,
			autoApprovedSuspensions: interactivity.autoApprovedSuspensions,
			mockedCredentialTypes: Array.from(interactivity.mockedCredentialTypes),
		},
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function observeChunk(
	chunk: unknown,
	interactivity: {
		askUserCount: number;
		planToolCount: number;
		autoApprovedSuspensions: number;
		mockedCredentialTypes: Set<string>;
	},
): void {
	if (!isRecord(chunk)) return;
	const type = typeof chunk.type === 'string' ? chunk.type : undefined;
	const payload = isRecord(chunk.payload) ? chunk.payload : chunk;

	if (type === 'tool-call') {
		const toolName = typeof payload.toolName === 'string' ? payload.toolName : undefined;
		if (toolName === 'ask-user') interactivity.askUserCount++;
	} else if (type === 'tool-result') {
		const toolName = typeof payload.toolName === 'string' ? payload.toolName : undefined;
		if (toolName !== 'build-workflow') return;
		const result = isRecord(payload.result) ? payload.result : undefined;
		const mocked = result?.mockedCredentialTypes;
		if (Array.isArray(mocked)) {
			for (const type of mocked) {
				if (typeof type === 'string') interactivity.mockedCredentialTypes.add(type);
			}
		}
	}
}

function failResult(
	startedAt: number,
	errorClass: BuildErrorClass,
	error: unknown,
	interactivity: {
		askUserCount: number;
		planToolCount: number;
		autoApprovedSuspensions: number;
		mockedCredentialTypes: Set<string>;
	},
	finalText?: string,
): InProcessBuildResult {
	return {
		success: false,
		extraWorkflows: [],
		errorClass,
		errorMessage: error instanceof Error ? error.message : String(error),
		durationMs: Date.now() - startedAt,
		finalText,
		interactivity: {
			askUserCount: interactivity.askUserCount,
			planToolCount: interactivity.planToolCount,
			autoApprovedSuspensions: interactivity.autoApprovedSuspensions,
			mockedCredentialTypes: Array.from(interactivity.mockedCredentialTypes),
		},
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
