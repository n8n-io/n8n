import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	databricksApiRequest,
	getActiveCredentialType,
	getHost,
	readIdParameter,
} from '../helpers';
import type { DatabricksJobRun, DatabricksJobRunTask, DatabricksRunOutput } from '../interfaces';

const TASK_PAGES_MAX = 20;

type RunTarget = { runId: number; taskKey?: string };

async function fetchRunPage(
	context: IExecuteFunctions,
	credentialType: 'databricksApi' | 'databricksOAuth2Api',
	host: string,
	runId: number,
	pageToken?: string,
): Promise<DatabricksJobRun> {
	const qs: IDataObject = { run_id: runId };
	if (pageToken) qs.page_token = pageToken;
	return await databricksApiRequest(context, credentialType, {
		method: 'GET',
		url: `${host}/api/2.2/jobs/runs/get`,
		qs,
		headers: { Accept: 'application/json' },
		json: true,
	});
}

async function resolveTargets(
	context: IExecuteFunctions,
	credentialType: 'databricksApi' | 'databricksOAuth2Api',
	host: string,
	runId: number,
	itemIndex: number,
): Promise<{ run: DatabricksJobRun; targets: RunTarget[] }> {
	const run = await fetchRunPage(context, credentialType, host, runId);
	const tasks: DatabricksJobRunTask[] = [...(run.tasks ?? [])];
	let pageToken = run.next_page_token;
	for (let page = 1; pageToken && page < TASK_PAGES_MAX; page++) {
		const next = await fetchRunPage(context, credentialType, host, runId, pageToken);
		tasks.push(...(next.tasks ?? []));
		pageToken = next.next_page_token;
	}
	if (pageToken) {
		throw new NodeOperationError(
			context.getNode(),
			`Run ${runId} has more tasks than the node can read`,
			{
				itemIndex,
				description: `The node reads at most ${TASK_PAGES_MAX * 100} tasks of one run. Read the remaining outputs by their task run IDs.`,
			},
		);
	}

	const targets = tasks
		.filter((task): task is DatabricksJobRunTask & { run_id: number } => task.run_id !== undefined)
		.map((task) => ({ runId: task.run_id, taskKey: task.task_key }));
	return { run, targets: targets.length > 0 ? targets : [{ runId }] };
}

function isTruncated(output: DatabricksRunOutput): boolean {
	return (
		output.notebook_output?.truncated === true ||
		output.clean_rooms_notebook_output?.notebook_output?.truncated === true ||
		output.logs_truncated === true
	);
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const runId = readIdParameter(this, i, 'runId', 'run');

	const { run, targets } = await resolveTargets(this, credentialType, host, runId, i);

	const items: INodeExecutionData[] = [];
	for (const target of targets) {
		const output: DatabricksRunOutput = await databricksApiRequest(this, credentialType, {
			method: 'GET',
			url: `${host}/api/2.2/jobs/runs/get-output`,
			qs: { run_id: target.runId },
			headers: { Accept: 'application/json' },
			json: true,
		});
		items.push({
			json: {
				run_id: runId,
				job_id: run.job_id,
				task_key: target.taskKey,
				task_run_id: target.runId,
				truncated: isTruncated(output),
				...output,
			},
			pairedItem: { item: i },
		});
	}
	return items;
}
