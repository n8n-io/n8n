import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { generateSampleRows } from './generate-sample-rows.service';
import type { InstanceAiContext } from '../../types';

export interface EnsureEvalDataTableInput {
	workflowName: string;
	projectId?: string;
	columns: string[];
	workflowForSamples: WorkflowJSON;
}

export async function ensureEvalDataTable(
	ctx: InstanceAiContext,
	input: EnsureEvalDataTableInput,
): Promise<{ id: string; name: string }> {
	const dt = await ctx.dataTableService.create(
		`${input.workflowName} — eval samples`,
		input.columns.map((n) => ({ name: n, type: 'string' as const })),
		input.projectId ? { projectId: input.projectId } : undefined,
	);
	const rows = await generateSampleRows(input.workflowForSamples, input.columns);
	await ctx.dataTableService.insertRows(dt.id, rows);
	return { id: dt.id, name: dt.name };
}
