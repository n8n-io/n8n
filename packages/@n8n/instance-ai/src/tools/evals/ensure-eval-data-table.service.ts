import { nanoid } from 'nanoid';

import type { InstanceAiContext, DataTableSummary } from '../../types';

export interface CreateEmptyEvalDataTableInput {
	workflowName: string;
	projectId?: string;
	columns: string[];
}

const NAME_COLLISION_RE = /already exists/i;

async function createWithUniqueName(
	ctx: InstanceAiContext,
	baseName: string,
	columns: Array<{ name: string; type: 'string' }>,
	options: { projectId?: string } | undefined,
): Promise<DataTableSummary> {
	try {
		return await ctx.dataTableService.create(baseName, columns, options);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		if (!NAME_COLLISION_RE.test(msg)) throw error;
		for (let attempt = 0; attempt < 3; attempt++) {
			const suffixedName = `${baseName} (${nanoid(5)})`;
			try {
				return await ctx.dataTableService.create(suffixedName, columns, options);
			} catch (retryError) {
				const retryMsg = retryError instanceof Error ? retryError.message : String(retryError);
				if (!NAME_COLLISION_RE.test(retryMsg)) throw retryError;
			}
		}
		throw error;
	}
}

/**
 * Create a fresh DataTable for a workflow's eval setup, with the requested
 * columns and zero rows. Population is the responsibility of `eval-data`,
 * invoked separately after the user confirms via
 * `evals(action="offer-data-population")`.
 */
export async function createEmptyEvalDataTable(
	ctx: InstanceAiContext,
	input: CreateEmptyEvalDataTableInput,
): Promise<{ id: string; name: string }> {
	const dt = await createWithUniqueName(
		ctx,
		`${input.workflowName} — eval samples`,
		input.columns.map((n) => ({ name: n, type: 'string' as const })),
		input.projectId ? { projectId: input.projectId } : undefined,
	);
	return { id: dt.id, name: dt.name };
}
