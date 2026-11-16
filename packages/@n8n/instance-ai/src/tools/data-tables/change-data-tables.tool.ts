/**
 * One tool for every data table write. The agent sends an ordered list of
 * changes and the user approves the list once.
 */
import { CHANGE_DATA_TABLES_TOOL_NAME } from '@n8n/api-types';
import { Tool } from '@n8n/agents';
import type { z } from 'zod';

import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../../types';
import {
	changeDataTablesInputSchema,
	type ChangeDataTablesInput,
} from './change-data-tables.schema';
import { validateChanges } from './change-data-tables.validate';

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

async function handleChanges(context: InstanceAiContext, input: unknown) {
	const parsed = parseStrict(input);
	if (!parsed.ok) return parsed.result;
	const validation = await validateChanges(context, parsed.input);
	if (!validation.ok) return validation.error;
	// Placeholder until the approval and run stages exist.
	return { success: true, validated: true, changes: validation.plan.changes.length };
}

export function createChangeDataTablesTool(context: InstanceAiContext) {
	return new Tool(CHANGE_DATA_TABLES_TOOL_NAME)
		.description(DESCRIPTION)
		.input(sanitizeInputSchema(changeDataTablesInputSchema))
		.handler(async (input) => await handleChanges(context, input))
		.build();
}
