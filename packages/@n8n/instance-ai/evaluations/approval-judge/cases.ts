// ---------------------------------------------------------------------------
// Cases for the approval judge eval: one `<id>.json` file per case in a cases
// directory. The cases come from production traces, so they live outside this
// repository. A case is a pending action that Auto mode reviews: the
// conversation before the approval card, the action as the card shows it, and
// the decision that the case expects.
//
// `critical: true` marks a case where approving would cause harm the user did
// not ask for. A critical case always expects `ask`.
// ---------------------------------------------------------------------------

import {
	instanceAiApprovalDetailsSchema,
	instanceAiConfirmationSeveritySchema,
	resolveBuilderToolName,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { z } from 'zod';

import type { ApprovalJudgeInput } from '../../src/approval-review/approval-judge';
import type { PendingApproval } from '../../src/approval-review/pending-approval';
import { getJsonFiles } from '../utils/get-json-files';

const mcpHintsSchema = z
	.object({
		readOnlyHint: z.boolean(),
		destructiveHint: z.boolean(),
		idempotentHint: z.boolean(),
		openWorldHint: z.boolean(),
	})
	.partial();

export const approvalJudgeCaseSchema = z
	.object({
		id: z.string().regex(/^[a-z0-9-]+$/, 'use a kebab-case id'),
		description: z.string().min(1),
		source: z.discriminatedUnion('kind', [
			z.object({
				kind: z.literal('trace'),
				ref: z.string().min(1),
				userDecision: z.enum(['approved', 'denied', 'abandoned', 'unknown']),
			}),
			z.object({ kind: z.literal('synthetic'), basedOn: z.string().nullable() }),
		]),
		conversation: z
			.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().min(1) }))
			.min(1),
		action: z.object({
			toolName: z.string().min(1),
			args: z.unknown(),
			message: z.string().min(1),
			severity: instanceAiConfirmationSeveritySchema,
			resourceName: z.string().optional(),
			approvalDetails: instanceAiApprovalDetailsSchema.optional(),
			mcp: z
				.object({ serverName: z.string().optional(), annotations: mcpHintsSchema.optional() })
				.optional(),
		}),
		expected: z.enum(['approve', 'ask']),
		critical: z.boolean().default(false),
		rationale: z.string().min(1),
		tags: z.array(z.string()).default([]),
	})
	.refine((testCase) => !testCase.critical || testCase.expected === 'ask', {
		message: 'a critical case must expect ask',
		path: ['expected'],
	});

export type ApprovalJudgeCase = z.infer<typeof approvalJudgeCaseSchema>;

/** Loads and validates every case. Throws on an invalid file, naming it. */
export function loadApprovalJudgeCases(dir: string, filter?: string): ApprovalJudgeCase[] {
	return getJsonFiles(dir, filter).map((file) => {
		let raw: unknown;
		try {
			raw = JSON.parse(readFileSync(file, 'utf8'));
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			throw new Error(`Invalid approval judge case ${basename(file)}: ${reason}`);
		}
		const parsed = approvalJudgeCaseSchema.safeParse(raw);
		if (!parsed.success) {
			throw new Error(`Invalid approval judge case ${basename(file)}: ${parsed.error.message}`);
		}
		if (`${parsed.data.id}.json` !== basename(file)) {
			throw new Error(`Approval judge case ${basename(file)} must be named ${parsed.data.id}.json`);
		}
		return parsed.data;
	});
}

/**
 * The tool name and arguments as the current tools take them. A case can keep
 * the name of a former multi-action tool with an `action` argument, such as
 * `data_tables` with `delete`: that action is now its own tool.
 */
function currentToolCall(toolName: string, args: unknown): { toolName: string; args: unknown } {
	const action = isRecord(args) ? args.action : undefined;
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
