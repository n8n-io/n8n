import { sleep } from '@n8n/utils/sleep';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { JOB_RUN_DEFAULT_TIMEOUT_SECONDS } from '../../constants';
import {
	databricksApiRequest,
	getActiveCredentialType,
	getHost,
	readIdParameter,
	sanitizeApiMessage,
} from '../helpers';
import type { DatabricksJobRun, DatabricksRunNowResponse } from '../interfaces';

const POLL_INTERVAL_MS = 5000;
// TERMINATED ends `status.state`; SKIPPED and INTERNAL_ERROR end the deprecated `state.life_cycle_state`
const TERMINAL_RUN_STATES = new Set(['TERMINATED', 'SKIPPED', 'INTERNAL_ERROR']);

function isNamedEntry(entry: unknown): entry is { name: string; value?: unknown } {
	return (
		typeof entry === 'object' &&
		entry !== null &&
		'name' in entry &&
		typeof entry.name === 'string' &&
		entry.name !== ''
	);
}

function readJobParameters(context: IExecuteFunctions, i: number): Record<string, string> {
	const entries = context.getNodeParameter('jobParameters.parameters', i, []);
	if (!Array.isArray(entries)) return {};
	return Object.fromEntries(
		entries.filter(isNamedEntry).map((entry) => [entry.name, String(entry.value ?? '')]),
	);
}

function getRunState(run: DatabricksJobRun): string {
	return run.status?.state ?? run.state?.life_cycle_state ?? '';
}

function getRunOutcome(run: DatabricksJobRun): { success: boolean; code: string; message: string } {
	const details = run.status?.termination_details;
	if (details) {
		const code = details.code ?? details.type ?? 'UNKNOWN';
		return { success: code === 'SUCCESS', code, message: details.message ?? '' };
	}
	const code = run.state?.result_state ?? getRunState(run);
	return { success: code === 'SUCCESS', code, message: run.state?.state_message ?? '' };
}

function describeRunPage(run: DatabricksJobRun): string | undefined {
	return run.run_page_url
		? `Open the run page in Databricks for details: ${run.run_page_url}`
		: undefined;
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const jobId = readIdParameter(this, i, 'jobId', 'job');

	const jobParameters = readJobParameters(this, i);
	const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) === true;

	const options = this.getNodeParameter('options', i, {});
	const timeoutSeconds =
		options.timeout === undefined ? JOB_RUN_DEFAULT_TIMEOUT_SECONDS : Number(options.timeout);
	if (waitForCompletion && (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0)) {
		throw new NodeOperationError(this.getNode(), 'Timeout must be a positive number of seconds', {
			itemIndex: i,
		});
	}

	const runReference: DatabricksRunNowResponse = await databricksApiRequest(this, credentialType, {
		method: 'POST',
		url: `${host}/api/2.2/jobs/run-now`,
		body: {
			job_id: jobId,
			...(Object.keys(jobParameters).length > 0 && { job_parameters: jobParameters }),
		},
		headers: { 'Content-Type': 'application/json' },
		json: true,
	});

	if (!waitForCompletion) {
		return [{ json: runReference, pairedItem: { item: i } }];
	}

	const deadline = Date.now() + timeoutSeconds * 1000;
	const abortSignal = this.getExecutionCancelSignal();
	const fetchRun = async (): Promise<DatabricksJobRun> =>
		await databricksApiRequest(this, credentialType, {
			method: 'GET',
			url: `${host}/api/2.2/jobs/runs/get`,
			qs: { run_id: runReference.run_id },
			headers: { Accept: 'application/json' },
			json: true,
		});

	let run = await fetchRun();
	while (!TERMINAL_RUN_STATES.has(getRunState(run))) {
		const remainingMs = deadline - Date.now();
		if (remainingMs <= 0) {
			throw new NodeOperationError(
				this.getNode(),
				`Job run ${runReference.run_id} did not finish within ${timeoutSeconds} seconds`,
				{
					itemIndex: i,
					description: [
						`Last state: ${getRunState(run)}.`,
						'Raise the timeout in Options, or turn off Wait for Completion and look the run up later by its run ID.',
						describeRunPage(run),
					]
						.filter(Boolean)
						.join(' '),
				},
			);
		}
		await sleep(Math.min(POLL_INTERVAL_MS, remainingMs), abortSignal);
		run = await fetchRun();
	}

	const outcome = getRunOutcome(run);
	if (!outcome.success) {
		const reason = outcome.message ? sanitizeApiMessage(outcome.message) : outcome.code;
		throw new NodeOperationError(
			this.getNode(),
			`Job run ${runReference.run_id} failed (${outcome.code}): ${reason}`,
			{ itemIndex: i, description: describeRunPage(run) },
		);
	}

	return [{ json: run, pairedItem: { item: i } }];
}
