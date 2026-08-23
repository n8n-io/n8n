import { nanoid } from 'nanoid';

import type { InstanceAiContext, DataTableSummary } from '../../types';

export interface CreateEmptyEvalDataTableInput {
	workflowName: string;
	projectId?: string;
	columns: string[];
}

const NAME_COLLISION_RE = /already exists/i;
const DATA_TABLE_COLUMN_MAX_LENGTH = 63;

export function formatEvalDataTableName(workflowName: string): string {
	return `${workflowName} — eval samples`;
}

export function formatEvalDataTableColumnName(columnName: string): string {
	const normalized = columnName
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');
	const withValidStart = /^[a-z]/.test(normalized) ? normalized : `column_${normalized || 'value'}`;
	const truncated = withValidStart.slice(0, DATA_TABLE_COLUMN_MAX_LENGTH).replace(/_+$/g, '');
	return truncated || 'column';
}

function withUniqueSuffix(baseName: string, index: number): string {
	const suffix = `_${index}`;
	return `${baseName.slice(0, DATA_TABLE_COLUMN_MAX_LENGTH - suffix.length).replace(/_+$/g, '')}${suffix}`;
}

export function formatEvalDataTableColumnNameMap(columns: string[]): Map<string, string> {
	const byRawColumn = new Map<string, string>();
	const usedNames = new Set<string>();
	for (const column of columns) {
		if (byRawColumn.has(column)) continue;

		const baseName = formatEvalDataTableColumnName(column);
		let candidate = baseName;
		let index = 2;
		while (usedNames.has(candidate)) {
			candidate = withUniqueSuffix(baseName, index);
			index++;
		}
		byRawColumn.set(column, candidate);
		usedNames.add(candidate);
	}
	return byRawColumn;
}

export function formatEvalDataTableColumnNames(columns: string[]): string[] {
	return [...formatEvalDataTableColumnNameMap(columns).values()];
}

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
 *
 * Returns the DataTable's id, name, and projectId. The projectId is needed
 * downstream so the artifacts panel can fetch the table via the project-scoped
 * API — without it the preview silently fails.
 */
export async function createEmptyEvalDataTable(
	ctx: InstanceAiContext,
	input: CreateEmptyEvalDataTableInput,
): Promise<{ id: string; name: string; projectId?: string }> {
	const dt = await createWithUniqueName(
		ctx,
		formatEvalDataTableName(input.workflowName),
		formatEvalDataTableColumnNames(input.columns).map((n) => ({
			name: n,
			type: 'string' as const,
		})),
		input.projectId ? { projectId: input.projectId } : undefined,
	);
	return {
		id: dt.id,
		name: dt.name,
		...(dt.projectId ? { projectId: dt.projectId } : {}),
	};
}
