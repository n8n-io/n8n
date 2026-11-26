// ---------------------------------------------------------------------------
// Cases for the approval judge eval: one `<id>.json` file per case, in the
// main eval case format that LangTracer exports. The file name is the case id.
// The cases come from production traces, so they live outside this repository.
//
// A case is a pending action that Auto mode reviews: the conversation before
// the approval card, and the action as the card shows it (`pendingApproval`).
// Only this eval reads `pendingApproval`, so the main case schema does not
// have the key.
//
// The labels are tags: `approval-judge`, and one `expects:<decision>` with
// `approve` or `ask`. A `critical` tag marks a case where approving would cause
// harm the user did not ask for. A critical case always expects `ask`.
// ---------------------------------------------------------------------------

import {
	CHANGE_DATA_TABLES_TOOL_NAME,
	getDataTableCallAction,
	instanceAiApprovalDetailsSchema,
	instanceAiConfirmationSeveritySchema,
	isDataTableWriteToolAction,
	resolveBuilderToolName,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { toJsonValue } from '@n8n/utils/json/to-json-value';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { z } from 'zod';

import type { ApprovalJudgeInput } from '../../src/approval-review/approval-judge';
import type { PendingApproval } from '../../src/approval-review/pending-approval';
import { convertFormerDataTableCall } from '../../src/tools/data-tables/change-data-tables.legacy';
import { EvalTestCaseSchema } from '../harness/schema';
import { normalizeExportedCase } from '../langtracer/normalize';
import { getJsonFiles } from '../utils/get-json-files';

export const APPROVAL_JUDGE_TAG = 'approval-judge';
const EXPECTS_TAG_PREFIX = 'expects:';
const CRITICAL_TAG = 'critical';

export type ApprovalDecision = 'approve' | 'ask';

/** An action that waits for approval, as the approval card shows it. */
const pendingApprovalSchema = z.object({
	toolName: z.string().min(1),
	args: z.unknown(),
	message: z.string().min(1),
	severity: instanceAiConfirmationSeveritySchema,
	resourceName: z.string().optional(),
	approvalDetails: instanceAiApprovalDetailsSchema.optional(),
	mcp: z
		.object({
			serverName: z.string().optional(),
			annotations: z
				.object({
					readOnlyHint: z.boolean(),
					destructiveHint: z.boolean(),
					idempotentHint: z.boolean(),
					openWorldHint: z.boolean(),
				})
				.partial()
				.optional(),
		})
		.optional(),
});

const labelsSchema = z
	.object({
		expected: z
			.array(z.enum(['approve', 'ask']))
			.length(1, 'needs exactly one expects:<decision> tag')
			.transform((decisions) => decisions[0]),
		critical: z.boolean(),
	})
	.refine((labels) => !labels.critical || labels.expected === 'ask', {
		message: 'a critical case must expect ask',
		path: ['expected'],
	});

export interface ApprovalJudgeCase {
	id: string;
	conversation: Array<{ role: 'user' | 'assistant'; text: string }>;
	action: z.infer<typeof pendingApprovalSchema>;
	expected: ApprovalDecision;
	critical: boolean;
	/** The descriptive tags, without the labels. Reports group cases by them. */
	tags: string[];
}

/** The expectation of a case, in the text that LangTracer stores for it. */
export function expectationText(expected: ApprovalDecision): string {
	return `Decision: ${expected}`;
}

function formatIssues(error: z.ZodError): string {
	return error.issues
		.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
		.join('; ');
}

function isLabelTag(tag: string): boolean {
	return tag === APPROVAL_JUDGE_TAG || tag === CRITICAL_TAG || tag.startsWith(EXPECTS_TAG_PREFIX);
}

function parseCaseFile(file: string): ApprovalJudgeCase {
	const name = basename(file);
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(file, 'utf8'));
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(`Invalid approval judge case ${name}: ${reason}`);
	}
	// Strips export-only keys (id, name, suiteId, ...), as the LangTracer pull does.
	const parsed = EvalTestCaseSchema.safeParse(normalizeExportedCase(raw));
	if (!parsed.success) {
		throw new Error(`Invalid approval judge case ${name}: ${formatIssues(parsed.error)}`);
	}
	const { tags, conversation } = parsed.data;
	if (!tags.includes(APPROVAL_JUDGE_TAG)) {
		throw new Error(`Invalid approval judge case ${name}: has no "${APPROVAL_JUDGE_TAG}" tag`);
	}
	const pendingApproval = pendingApprovalSchema.safeParse(
		isRecord(raw) ? raw.pendingApproval : undefined,
	);
	if (!conversation || !pendingApproval.success) {
		const reason = pendingApproval.success ? '' : `: ${formatIssues(pendingApproval.error)}`;
		throw new Error(
			`Invalid approval judge case ${name}: needs a conversation and a pendingApproval${reason}`,
		);
	}
	const labels = labelsSchema.safeParse({
		expected: tags
			.filter((tag) => tag.startsWith(EXPECTS_TAG_PREFIX))
			.map((tag) => tag.slice(EXPECTS_TAG_PREFIX.length)),
		critical: tags.includes(CRITICAL_TAG),
	});
	if (!labels.success) {
		throw new Error(`Invalid approval judge case ${name}: ${formatIssues(labels.error)}`);
	}
	return {
		id: basename(file, '.json'),
		conversation: conversation.map(({ role, text }) => ({ role, text })),
		action: pendingApproval.data,
		...labels.data,
		tags: tags.filter((tag) => !isLabelTag(tag)),
	};
}

/** Loads and validates every case. Throws on an invalid file, naming it. */
export function loadApprovalJudgeCases(dir: string, filter?: string): ApprovalJudgeCase[] {
	return getJsonFiles(dir, filter).map(parseCaseFile);
}

/**
 * The tool name and arguments as the current tools take them. A case can keep
 * the name of a former multi-action tool with an `action` argument, such as
 * `workspace` with `create-folder`: that action is now its own tool. A former
 * data table write becomes one change of the batch tool.
 */
function currentToolCall(toolName: string, args: unknown): { toolName: string; args: unknown } {
	const action = isRecord(args) ? args.action : undefined;
	if (isDataTableWriteToolAction(getDataTableCallAction(toolName, action))) {
		return {
			toolName: CHANGE_DATA_TABLES_TOOL_NAME,
			args: convertFormerDataTableCall(toolName, toJsonValue(args)),
		};
	}
	const current = resolveBuilderToolName(toolName, action);
	if (current === toolName || !isRecord(args)) return { toolName: current, args };
	const { action: _action, ...rest } = args;
	return { toolName: current, args: rest };
}

/** The pending approval of a case, as the Auto mode wrapper would read it. */
export function toPendingApproval({ action }: ApprovalJudgeCase): PendingApproval {
	const call = action.mcp
		? { toolName: action.toolName, args: action.args }
		: currentToolCall(action.toolName, action.args);
	return {
		toolName: call.toolName,
		args: call.args,
		message: action.message,
		severity: action.severity,
		...(action.resourceName ? { resourceName: action.resourceName } : {}),
		...(action.approvalDetails ? { approvalDetails: action.approvalDetails } : {}),
		...(action.mcp
			? {
					mcp: {
						...(action.mcp.serverName ? { serverName: action.mcp.serverName } : {}),
						...(action.mcp.annotations ? { hints: action.mcp.annotations } : {}),
					},
				}
			: {}),
	};
}

export function toJudgeInput(testCase: ApprovalJudgeCase): ApprovalJudgeInput {
	return { conversation: testCase.conversation, approval: toPendingApproval(testCase) };
}
