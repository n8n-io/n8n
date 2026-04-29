import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

import { generateSampleRows } from './generate-sample-rows.service';
import type { InstanceAiContext } from '../../types';

export interface EnsureEvalDataTableInput {
	workflowName: string;
	projectId?: string;
	columns: string[];
	workflowForSamples: WorkflowJSON;
	rowCount?: number;
	targetAgentNodeName?: string;
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
	const dt = await createDataTableWithUniqueName(
		ctx,
		`${input.workflowName} — eval samples`,
		input.columns.map((n) => ({ name: n, type: 'string' as const })),
		input.projectId ? { projectId: input.projectId } : undefined,
	);
	const rows = await generateSampleRows({
		workflow: input.workflowForSamples,
		columns: input.columns,
		rowCount: input.rowCount,
		targetAgentNodeName: input.targetAgentNodeName,
	});
	await ctx.dataTableService.insertRows(dt.id, rows);
	return { id: dt.id, name: dt.name };
}
