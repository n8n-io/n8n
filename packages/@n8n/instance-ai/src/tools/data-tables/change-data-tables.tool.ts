/**
 * One tool for every data table write. The agent sends an ordered list of
 * changes and the user approves the list once.
 */
import { CHANGE_DATA_TABLES_TOOL_NAME, buildDataTablesSessionGrantKey } from '@n8n/api-types';
import { Tool } from '@n8n/agents';
import type { z } from 'zod';

import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../../types';
import { batchNeedsApproval, buildApprovalRequest } from './change-data-tables.approval';
import {
	changeDataTablesInputSchema,
	type ChangeDataTablesInput,
} from './change-data-tables.schema';
import { validateChanges, type ChangePlan } from './change-data-tables.validate';
import {
	confirmationResumeSchema,
	confirmationSuspendSchema,
	type ConfirmationToolContext,
	type ResumeData,
} from './confirmation';

const DESCRIPTION =
	'Create, change, or delete data tables, their columns, and their rows. Send all the changes ' +
	'for one request in `changes`, in the order they must run. The user approves the whole list ' +
	'at once. A later change can use a table or column that an earlier change creates.';

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

async function handleChanges(
	context: InstanceAiContext,
	input: unknown,
	ctx: ConfirmationToolContext,
) {
	const parsed = parseStrict(input);
	if (!parsed.ok) return parsed.result;
	// On resume the handler runs again with the same input, so tables may have changed meanwhile.
	const validation = await validateChanges(context, parsed.input);
	if (!validation.ok) return validation.error;
	const { plan } = validation;
	if (ctx.resumeData) return await resumeChanges(context, plan, ctx.resumeData);
	if (batchNeedsApproval(context, plan)) return await ctx.suspend(buildApprovalRequest(plan));
	return runChanges(plan);
}

async function resumeChanges(context: InstanceAiContext, plan: ChangePlan, resumeData: ResumeData) {
	if (!resumeData.approved) {
		return { denied: true, reason: 'User denied the action', changes: plan.changes.length };
	}
	if (resumeData.scope === 'session') await grantBatchActions(context, plan);
	return runChanges(plan);
}

async function grantBatchActions(context: InstanceAiContext, plan: ChangePlan) {
	const actions = new Set(plan.changes.map(({ change }) => change.action));
	for (const action of actions) {
		await context.grantSessionToolApproval?.(buildDataTablesSessionGrantKey(action));
	}
}

// Placeholder until the run stage exists.
function runChanges(plan: ChangePlan) {
	return { success: true, validated: true, changes: plan.changes.length };
}

export function createChangeDataTablesTool(context: InstanceAiContext) {
	return new Tool(CHANGE_DATA_TABLES_TOOL_NAME)
		.description(DESCRIPTION)
		.input(sanitizeInputSchema(changeDataTablesInputSchema))
		.suspend(confirmationSuspendSchema)
		.resume(confirmationResumeSchema)
		.handler(async (input, ctx) => await handleChanges(context, input, ctx))
		.build();
}
