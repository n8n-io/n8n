import type { Message } from '@n8n/agents';

import { buildAssertionsBlock, judgeExpectations } from './assertion-judge';
import { EPHEMERAL_CACHE } from '../../src/utils/eval-agents';
import type { WorkflowResponse } from '../clients/n8n-client';
import { buildWorkflowContextBlock } from '../harness/workflow-context';
import type { BuildExpectationResult, ConversationMetrics, TranscriptTurn } from '../types';
import { perTurnToolCallCounts, transcriptAsText } from '../utils/conversation-text';

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
					text: buildConversationContext(expectations, build.transcript, build.metrics),
				},
			],
		},
	];

	return await judgeExpectations(messages, expectations);
}

// ---------------------------------------------------------------------------
// Artifact assembly
// ---------------------------------------------------------------------------

function buildConversationContext(
	expectations: string[],
	transcript: TranscriptTurn[],
	metrics: ConversationMetrics | undefined,
): string {
	const metricsBlock = metrics
		? `\`\`\`json\n${JSON.stringify(metrics, null, 2)}\n\`\`\``
		: '(none captured)';
	return [
		'## Conversation transcript',
		'',
		transcriptAsText(transcript),
		'',
		'## Conversation metrics (ground truth — do not recount)',
		'',
		metricsBlock,
		'',
		'## Tool calls per turn (ground truth — do not recount)',
		'',
		perTurnToolCallCounts(transcript),
		'',
		buildAssertionsBlock(expectations),
	].join('\n');
}
