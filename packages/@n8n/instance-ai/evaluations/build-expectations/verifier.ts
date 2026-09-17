import type {
	InstanceAiEvalThreadMemoryResponse,
	InstanceAiRunDebugResponse,
} from '@n8n/api-types';
import type { Message } from '@n8n/agents';

import { buildAssertionsBlock, judgeExpectations } from './assertion-judge';
import { EPHEMERAL_CACHE } from '../../src/utils/eval-agents';
import type { WorkflowResponse } from '../clients/n8n-client';
import { buildWorkflowContextBlock } from '../harness/workflow-context';
import type { BuildExpectationResult, ConversationMetrics, TranscriptTurn } from '../types';
import { perTurnToolCallCounts, transcriptAsText, usageTokens } from '../utils/conversation-text';

// Re-exported for import-site stability — cli/index.ts and runner.ts import it from here.
export { allFailVerdicts } from './assertion-judge';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** The conversation/build artifacts the judge reasons over. */
export interface BuildExpectationsInput {
	transcript: TranscriptTurn[];
	workflowJson?: WorkflowResponse;
	metrics?: ConversationMetrics;
	/** Per-step debug from the build; source of every token number below. */
	runDebug?: InstanceAiRunDebugResponse[];
	/** Observational memory for the thread: rows plus the compaction cursor. */
	threadMemory?: InstanceAiEvalThreadMemoryResponse;
	/** Rendered agent/config-eval sections (each with a "(no … produced)" fallback), appended
	 *  to the cached build context so outcome expectations can be judged against them. */
	artifactContext?: string;
}

/**
 * Judge author-written natural-language expectations about the build conversation +
 * resulting workflow. Verdicts are scored as units alongside execution scenarios
 * (pass rates, gate) and are embedded in LangSmith run outputs for the baseline
 * comparison. On judge failure (errors or timeouts across all attempts) it returns
 * `incomplete` verdicts so the report stays complete while reading as "no verdict"
 * rather than failures; callers additionally guard with `.catch()`.
 */
export async function verifyBuildExpectations(
	expectations: string[],
	build: BuildExpectationsInput,
): Promise<BuildExpectationResult[]> {
	if (expectations.length === 0) return [];

	// Workflow + artifact blocks are stable per build — mark them as one Anthropic cache breakpoint.
	const buildContext = [buildWorkflowContextBlock(build.workflowJson), build.artifactContext]
		.filter((block): block is string => block !== undefined)
		.join('\n\n');
	const messages: Message[] = [
		{
			role: 'user',
			content: [
				{
					type: 'text',
					text: buildContext,
					providerOptions: EPHEMERAL_CACHE,
				},
				{
					type: 'text',
					text: buildConversationContext(
						expectations,
						build.transcript,
						build.metrics,
						build.runDebug,
						build.threadMemory,
					),
				},
			],
		},
	];

	await dumpJudgeContext(messages);

	return await judgeExpectations(messages, expectations);
}

/** Dump the assembled judge prompt to `DEBUG_JUDGE_CONTEXT`; nothing else shows it. */
async function dumpJudgeContext(messages: Message[]): Promise<void> {
	const target = process.env.DEBUG_JUDGE_CONTEXT;
	if (!target) return;
	const text = messages
		.flatMap((message) =>
			Array.isArray(message.content)
				? message.content.flatMap((part) => ('text' in part ? [part.text] : []))
				: [],
		)
		.join('\n\n--- block ---\n\n');
	try {
		const { appendFile } = await import('fs/promises');
		await appendFile(target, `\n\n===== JUDGE CALL =====\n\n${text}\n`);
	} catch {
		// Diagnostics must never fail a run.
	}
}

// ---------------------------------------------------------------------------
// Artifact assembly
// ---------------------------------------------------------------------------

function buildConversationContext(
	expectations: string[],
	transcript: TranscriptTurn[],
	metrics: ConversationMetrics | undefined,
	runDebug: InstanceAiRunDebugResponse[] | undefined,
	threadMemory: InstanceAiEvalThreadMemoryResponse | undefined,
): string {
	const metricsBlock = metrics
		? `\`\`\`json\n${JSON.stringify(metrics, null, 2)}\n\`\`\``
		: '(none captured)';
	return [
		'## Conversation transcript',
		'',
		transcriptAsText(transcript, runDebug),
		'',
		'## Conversation metrics (ground truth — do not recount)',
		'',
		metricsBlock,
		'',
		'## Tool calls per turn (ground truth — do not recount)',
		'',
		perTurnToolCallCounts(transcript),
		'',
		'## Token usage totals (ground truth — do not recount)',
		'',
		tokenUsageTotals(runDebug),
		'',
		'## Observational memory after compaction (ground truth — do not recount)',
		'',
		observationLogBlock(threadMemory),
		'',
		buildAssertionsBlock(expectations),
	].join('\n');
}

/** What the agent remembers after compaction, so an expectation can grade the summary
 *  itself. Markers are the Observer's own priority labels. */
function observationLogBlock(memory: InstanceAiEvalThreadMemoryResponse | undefined): string {
	if (!memory) return '(not captured)';
	if (!memory.cursor) return '(observational memory has not compacted this conversation)';
	if (memory.observations.length === 0) return '(compacted, but no observations were kept)';
	return memory.observations
		.map(({ marker, text }) => `- [${marker.toUpperCase()}] ${text}`)
		.join('\n');
}

// ---------------------------------------------------------------------------
// Token usage totals
// ---------------------------------------------------------------------------

/** Build-wide sum, the one number the turn headers don't carry. Orchestrator steps
 *  only, so a delegated `build-agent` leg is absent (workflow builds are not). */
function tokenUsageTotals(runDebug: InstanceAiRunDebugResponse[] | undefined): string {
	if (!runDebug || runDebug.length === 0) return '(no run debug captured)';

	let input = 0;
	let output = 0;
	let cacheRead = 0;
	let cacheWrite = 0;
	let stepCount = 0;
	for (const run of runDebug) {
		for (const step of run.steps) {
			const usage = usageTokens(step.output?.usage);
			input += usage.input;
			output += usage.output;
			cacheRead += usage.cacheRead;
			cacheWrite += usage.cacheWrite;
			stepCount++;
		}
	}

	// Instructions + tool schemas + one message: the floor cost of any turn here.
	const opening = usageTokens(runDebug[0]?.steps[0]?.output?.usage).input;
	const runWord = runDebug.length === 1 ? 'run' : 'runs';
	return [
		`Total: ${String(input)} tokens in / ${String(output)} tokens out across ${String(stepCount)} LLM steps, ${String(runDebug.length)} ${runWord}`,
		`Cache: ${String(cacheRead)} tokens read / ${String(cacheWrite)} tokens written`,
		`Fixed overhead: ${String(opening)} tokens on the opening step, before the conversation had any history`,
	].join('\n');
}
