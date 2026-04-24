import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

import { generateSampleRows } from './generate-sample-rows.service';
import type { InstanceAiContext } from '../../types';

export interface EnsureEvalDataTableInput {
	workflowName: string;
	projectId?: string;
	columns: string[];
	workflowForSamples: WorkflowJSON;
}

async function createDataTableWithUniqueName(
	ctx: InstanceAiContext,
	baseName: string,
	columns: Array<{ name: string; type: 'string' }>,
	options: { projectId?: string } | undefined,
): Promise<Awaited<ReturnType<InstanceAiContext['dataTableService']['create']>>> {
	try {
		return await ctx.dataTableService.create(baseName, columns, options);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		if (!/already exists/i.test(msg)) throw error;
		// Name collision: retry with a short suffix. Keep retrying with a new
		// suffix on further collisions (extremely unlikely with nanoid).
		for (let attempt = 0; attempt < 3; attempt++) {
			const suffixedName = `${baseName} (${nanoid(5)})`;
			try {
				return await ctx.dataTableService.create(suffixedName, columns, options);
			} catch (retryError) {
				const retryMsg = retryError instanceof Error ? retryError.message : String(retryError);
				if (!/already exists/i.test(retryMsg)) throw retryError;
			}
		}
		throw error;
	}
}

export async function ensureEvalDataTable(
	ctx: InstanceAiContext,
	input: EnsureEvalDataTableInput,
): Promise<{ id: string; name: string }> {
	// eslint-disable-next-line no-console
	console.log('[evals] ensureEvalDataTable: creating DataTable', {
		name: `${input.workflowName} — eval samples`,
		columns: input.columns,
		projectId: input.projectId,
	});
	const dt = await createDataTableWithUniqueName(
		ctx,
		`${input.workflowName} — eval samples`,
		input.columns.map((n) => ({ name: n, type: 'string' as const })),
		input.projectId ? { projectId: input.projectId } : undefined,
	);
	// eslint-disable-next-line no-console
	console.log('[evals] ensureEvalDataTable: DataTable created, generating rows next', {
		dataTableId: dt.id,
	});
	const rows = await generateSampleRows(input.workflowForSamples, input.columns);
	// eslint-disable-next-line no-console
	console.log('[evals] ensureEvalDataTable: generated rows', {
		rowCount: rows.length,
		firstRow: rows[0],
	});
	try {
		const insertResult = await ctx.dataTableService.insertRows(dt.id, rows);
		// eslint-disable-next-line no-console
		console.log('[evals] ensureEvalDataTable: insertRows succeeded', {
			insertResult,
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('[evals] ensureEvalDataTable: insertRows FAILED', {
			dataTableId: dt.id,
			rowCount: rows.length,
			firstRow: rows[0],
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
	return { id: dt.id, name: dt.name };
}
