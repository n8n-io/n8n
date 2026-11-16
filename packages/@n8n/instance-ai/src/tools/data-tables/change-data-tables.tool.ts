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
import { z } from 'zod';

import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../../types';
import {
	batchNeedsApproval,
	buildApprovalRequest,
	sessionGrantableActions,
} from './change-data-tables.approval';
import { FORMER_DATA_TABLES_TOOL_NAMES, normalizeLegacyInput } from './change-data-tables.legacy';
import {
	changeDataTablesInputSchema,
	type ChangeDataTablesInput,
} from './change-data-tables.schema';
import { runChanges } from './change-data-tables.run';
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
	return await runChanges(context, plan);
}

async function resumeChanges(context: InstanceAiContext, plan: ChangePlan, resumeData: ResumeData) {
	if (!resumeData.approved) {
		return {
			success: false,
			denied: true,
			reason: 'User denied the action',
			changes: plan.changes.length,
		};
	}
	if (resumeData.scope === 'session') await grantBatchActions(context, plan);
	return await runChanges(context, plan);
}

async function grantBatchActions(context: InstanceAiContext, plan: ChangePlan) {
	for (const action of sessionGrantableActions(plan)) {
		await context.grantSessionToolApproval?.(buildDataTablesSessionGrantKey(action));
	}
}

/**
 * The runtime validates a resumed call against this schema before the handler
 * runs, so stored inputs of the former write tools are converted first. The
 * preprocess step does not change the JSON schema that the model sees.
 */
const toolInputSchema = z.preprocess(
	normalizeLegacyInput,
	sanitizeInputSchema(changeDataTablesInputSchema),
);

export function createChangeDataTablesTool(context: InstanceAiContext) {
	const tool = new Tool(CHANGE_DATA_TABLES_TOOL_NAME)
		.description(DESCRIPTION)
		.input(toolInputSchema)
		.legacyNames(...DATA_TABLE_WRITE_TOOL_NAMES);
	for (const formerName of FORMER_DATA_TABLES_TOOL_NAMES) {
		tool.legacyActions(formerName, ...DATA_TABLE_WRITE_TOOL_ACTIONS);
	}
	return tool
		.suspend(confirmationSuspendSchema)
		.resume(confirmationResumeSchema)
		.handler(async (input, ctx) => await handleChanges(context, input, ctx))
		.build();
}
