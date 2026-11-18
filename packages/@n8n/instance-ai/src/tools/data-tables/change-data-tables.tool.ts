/**
 * One tool for every data table write. The agent sends an ordered list of
 * changes and the user approves the list once.
 */
import {
	CHANGE_DATA_TABLES_TOOL_NAME,
	DATA_TABLE_WRITE_TOOL_ACTIONS,
	DATA_TABLE_WRITE_TOOL_NAMES,
	buildDataTablesSessionGrantKey,
} from '@n8n/api-types';
import { Tool } from '@n8n/agents';
import type { z } from 'zod';

import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../../types';
import {
	batchNeedsApproval,
	buildApprovalRequest,
	sessionGrantableActions,
} from './change-data-tables.approval';
import {
	FORMER_DATA_TABLES_TOOL_NAMES,
	convertFormerDataTableCall,
} from './change-data-tables.legacy';
import {
	changeDataTablesInputSchema,
	type ChangeDataTablesInput,
} from './change-data-tables.schema';
import { runChanges } from './change-data-tables.run';
import {
	approvedTablesChanged,
	approvedTablesOf,
	type ApprovedTables,
} from './change-data-tables.continuation';
import { validateChanges, type ChangePlan } from './change-data-tables.validate';
import {
	confirmationResumeSchema,
	confirmationSuspendSchema,
	type ConfirmationSuspendPayload,
	type ResumeData,
} from './confirmation';

const DESCRIPTION =
	'Create, change, or delete data tables, their columns, and their rows. Design the full ' +
	'schema first, then send every create, column, and seed row for one request in `changes`, ' +
	'in the order they must run. The user approves the whole list at once. A later change can ' +
	'use a table or column that an earlier change creates. The run stops at the first failed ' +
	'change; the result lists the `applied`, `failed`, and `skipped` changes.';

function formatIssuePath(path: Array<string | number>): string {
	return path
		.map((key, i) => (typeof key === 'number' ? `[${key}]` : i === 0 ? key : `.${key}`))
		.join('');
}

/** The model-facing schema is flattened, so parse again with the strict per-action schema. */
function parseStrict(
	input: unknown,
):
	| { ok: true; input: ChangeDataTablesInput }
	| { ok: false; result: ReturnType<typeof invalidInputResult> } {
	const parsed = changeDataTablesInputSchema.safeParse(input);
	if (parsed.success) return { ok: true, input: parsed.data };
	return { ok: false, result: invalidInputResult(parsed.error) };
}

function invalidInputResult(error: z.ZodError) {
	const [first] = error.issues;
	const [field, index] = first.path;
	const changeIndex = field === 'changes' && typeof index === 'number' ? index : undefined;
	return {
		success: false,
		error: `${formatIssuePath(first.path)}: ${first.message}. Fix it and call the tool again with the whole batch.`,
		...(changeIndex === undefined ? {} : { changeIndex }),
	};
}

/** The confirmation context plus the continuation that keeps the tables the card showed. */
interface ChangeDataTablesToolContext {
	resumeData: ResumeData | undefined;
	continuation?: unknown;
	suspend: (
		payload: ConfirmationSuspendPayload,
		options?: { continuation?: ApprovedTables },
	) => Promise<never>;
}

async function handleChanges(
	context: InstanceAiContext,
	input: unknown,
	ctx: ChangeDataTablesToolContext,
) {
	const parsed = parseStrict(input);
	if (!parsed.ok) return parsed.result;
	// A denial runs nothing, so it needs no lookups and must not invite a retry.
	if (ctx.resumeData && !ctx.resumeData.approved) return deniedResult(parsed.input.changes.length);
	// On resume the handler runs again with the same input, so tables may have changed meanwhile.
	const validation = await validateChanges(context, parsed.input);
	if (!validation.ok) return validation.error;
	const { plan } = validation;
	// The approval covers only the tables that the card showed.
	if (ctx.resumeData && approvedTablesChanged(plan, ctx.continuation)) {
		return await suspendForApproval(plan, ctx);
	}
	if (ctx.resumeData) return await resumeChanges(context, plan, ctx.resumeData);
	if (batchNeedsApproval(context, plan)) return await suspendForApproval(plan, ctx);
	return await runChanges(context, plan);
}

async function suspendForApproval(plan: ChangePlan, ctx: ChangeDataTablesToolContext) {
	return await ctx.suspend(buildApprovalRequest(plan), { continuation: approvedTablesOf(plan) });
}

function deniedResult(changes: number) {
	return { success: false, denied: true, reason: 'User denied the action', changes };
}

async function resumeChanges(context: InstanceAiContext, plan: ChangePlan, resumeData: ResumeData) {
	if (!resumeData.approved) return deniedResult(plan.changes.length);
	if (resumeData.scope === 'session') await grantBatchActions(context, plan);
	return await runChanges(context, plan);
}

async function grantBatchActions(context: InstanceAiContext, plan: ChangePlan) {
	for (const action of sessionGrantableActions(plan)) {
		await context.grantSessionToolApproval?.(buildDataTablesSessionGrantKey(action));
	}
}

export function createChangeDataTablesTool(context: InstanceAiContext) {
	const tool = new Tool(CHANGE_DATA_TABLES_TOOL_NAME)
		.description(DESCRIPTION)
		.input(sanitizeInputSchema(changeDataTablesInputSchema))
		.legacyNames(...DATA_TABLE_WRITE_TOOL_NAMES)
		// Old inputs are converted only on resume. A new call under an old name fails as unknown.
		.legacyForResumeOnly(convertFormerDataTableCall);
	for (const formerName of FORMER_DATA_TABLES_TOOL_NAMES) {
		tool.legacyActions(formerName, ...DATA_TABLE_WRITE_TOOL_ACTIONS);
	}
	return tool
		.suspend(confirmationSuspendSchema)
		.resume(confirmationResumeSchema)
		.handler(async (input, ctx) => await handleChanges(context, input, ctx))
		.build();
}
