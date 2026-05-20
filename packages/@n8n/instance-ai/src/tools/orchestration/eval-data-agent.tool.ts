import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';
import { populateEvalDataTable } from '../evals/populate-eval-data-table.service';

const evalDataInputSchema = z.object({
	workflowId: z.string().describe('ID of the workflow whose eval DataTable should be populated'),
	projectId: z.string().optional(),
	targetAgentNodeName: z
		.string()
		.optional()
		.describe('AI agent node name selected during eval setup for multi-agent workflows'),
});

const tableSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	projectId: z.string().optional(),
	rowCount: z.number(),
	inputColumns: z.array(z.string()),
	expectedOutputColumns: z.array(z.string()),
	previewRows: z.array(z.record(z.string(), z.unknown())),
});

const outputSchema = z.object({
	status: z.enum(['imported', 'generated', 'skipped']),
	rowCount: z.number().optional(),
	source: z.enum(['history', 'synthetic']).optional(),
	reason: z.string().optional(),
	/**
	 * True when synthetic rows were inserted with empty expected-output columns.
	 * The agent must tell the user to fill those columns in before running the
	 * evaluation, so the eval measures correctness instead of self-consistency
	 * with the generator's own guess at the right answer.
	 */
	expectedOutputsNeedUserReview: z.boolean().optional(),
	expectedOutputColumns: z.array(z.string()).optional(),
	/**
	 * Snapshot of the populated DataTable so the agent can show the user what
	 * was generated alongside the metric setup, without making them dig through
	 * the data-tables UI to verify. Includes the table id (for deep-linking) and
	 * a short row preview. Only present on success paths.
	 */
	table: tableSummarySchema.optional(),
});

export function createEvalDataAgentTool(context: OrchestrationContext) {
	return new Tool('eval-data')
		.description(
			'Populate an eval DataTable for a workflow that already has its eval setup wired. ' +
				'First scans the workflow execution history for real rows (these include real expected ' +
				'outputs); if fewer than 10 valid rows are available, generates synthetic rows with INPUT ' +
				'columns only — expected-output columns are left empty so the user can fill them in with ' +
				'the correct answers. We never auto-fill expected outputs with model-generated guesses, ' +
				'because that would measure self-consistency rather than correctness. ' +
				'Inserts at most 25 rows total. Synchronous — no sub-agent, no HITL.',
		)
		.input(evalDataInputSchema)
		.output(outputSchema)
		.handler(async (input: z.infer<typeof evalDataInputSchema>) => {
			const domain = context.domainContext;
			if (!domain) {
				return { status: 'skipped' as const, reason: 'Domain context unavailable.' };
			}
			return await populateEvalDataTable(domain, input);
		})
		.build();
}
