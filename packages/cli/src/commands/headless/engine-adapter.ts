// VOLATILE SEAM. Only this file is allowed to import WorkflowRunner /
// ActiveWorkflowManager. When the execution-engine rewrite lands, this
// is the single file to update; nothing else in the headless code path
// should need to change. Keep the surface narrow.

import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { findCliWorkflowStart } from '@/utils';
import { WorkflowRunner } from '@/workflow-runner';

export interface RunOnceResult {
	status: 'success' | 'error';
	errorMessage?: string;
}

export const engineAdapter = {
	async runOnce(owner: User, workflowId: string): Promise<RunOnceResult> {
		const workflowData = await Container.get(WorkflowRepository).findOneBy({ id: workflowId });

		if (workflowData === null) {
			throw new UnexpectedError(`Workflow with id "${workflowId}" not found`);
		}

		// findCliWorkflowStart throws CliWorkflowOperationError if no eligible
		// start node exists; surface as UnexpectedError so headless callers can
		// rely on a single setup-failure error type without leaking the engine's
		// internal error hierarchy.
		let startingNode;
		try {
			startingNode = findCliWorkflowStart(workflowData.nodes);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'no valid CLI starting node';
			throw new UnexpectedError(`Workflow "${workflowData.name ?? workflowId}" has ${message}`);
		}

		const runData: IWorkflowExecutionDataProcess = {
			executionMode: 'cli',
			startNodes: [{ name: startingNode.name, sourceData: null }],
			workflowData,
			userId: owner.id,
		};

		const executionId = await Container.get(WorkflowRunner).run(runData);
		const run = await Container.get(ActiveExecutions).getPostExecutePromise(executionId);

		if (run === undefined) {
			return { status: 'error', errorMessage: 'Workflow did not return any data' };
		}

		const error = run.data.resultData.error;
		if (error) {
			return { status: 'error', errorMessage: error.message };
		}

		return { status: 'success' };
	},

	async waitWhileActive(signal: AbortSignal): Promise<void> {
		if (signal.aborted) return;
		await new Promise<void>((resolve) => {
			signal.addEventListener('abort', () => resolve(), { once: true });
		});
	},

	async deactivateAll(): Promise<void> {
		await Container.get(ActiveWorkflowManager).removeAll();
	},
};
