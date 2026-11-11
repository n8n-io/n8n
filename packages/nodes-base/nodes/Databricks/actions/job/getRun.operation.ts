import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	databricksApiRequest,
	getActiveCredentialType,
	getHost,
	readIdParameter,
	sanitizeApiMessage,
} from '../helpers';
import type { DatabricksJobRun } from '../interfaces';

import { getRunOutcome, getRunState, isRunFinished } from './runState';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const runId = readIdParameter(this, i, 'runId', 'run');

	const run: DatabricksJobRun = await databricksApiRequest(this, credentialType, {
		method: 'GET',
		url: `${host}/api/2.2/jobs/runs/get`,
		qs: { run_id: runId },
		headers: { Accept: 'application/json' },
		json: true,
	});

	// An unfinished run has no outcome yet, so its result fields stay null rather
	// than reporting the current state as a failure
	const finished = isRunFinished(run);
	const outcome = getRunOutcome(run);
	const errorMessage = finished && !outcome.success ? sanitizeApiMessage(outcome.message) : '';

	return [
		{
			json: {
				...run,
				run_state: getRunState(run) || null,
				run_finished: finished,
				run_result: finished ? outcome.code : null,
				run_succeeded: finished ? outcome.success : null,
				run_error_message: errorMessage || null,
			},
			pairedItem: { item: i },
		},
	];
}
