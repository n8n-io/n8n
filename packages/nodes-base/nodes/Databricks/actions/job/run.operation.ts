import { sleep } from '@n8n/utils/sleep';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	databricksApiRequest,
	getActiveCredentialType,
	getHost,
	sanitizeApiMessage,
} from '../helpers';
import type { DatabricksJobRun, DatabricksRunNowResponse } from '../interfaces';

const POLL_INTERVAL_MS = 5000;
const DEFAULT_TIMEOUT_SECONDS = 600;
const TERMINAL_RUN_STATES = new Set(['TERMINATED', 'SKIPPED', 'INTERNAL_ERROR']);

function isJobParameterEntry(entry: unknown): entry is { name: string; value?: unknown } {
	return (
		typeof entry === 'object' && entry !== null && 'name' in entry && typeof entry.name === 'string'
	);
}

function readJobParameters(context: IExecuteFunctions, i: number): Record<string, string> {
	const entries = context.getNodeParameter('jobParameters.parameters', i, []);
	const parameters: Record<string, string> = {};
	if (!Array.isArray(entries)) return parameters;
	for (const entry of entries) {
		if (isJobParameterEntry(entry) && entry.name) {
			parameters[entry.name] = String(entry.value ?? '');
		}
	}
	return parameters;
}

function getRunState(run: DatabricksJobRun): string {
	return run.status?.state ?? run.state?.life_cycle_state ?? '';
}

// Prefer `status.termination_details`; fall back to the deprecated `state` object.
function getRunOutcome(run: DatabricksJobRun): { success: boolean; code: string; message: string } {
	const details = run.status?.termination_details;
	if (details) {
		const code = details.code ?? details.type ?? 'UNKNOWN';
		return { success: code === 'SUCCESS', code, message: details.message ?? '' };
	}
	const code = run.state?.result_state ?? getRunState(run);
	return { success: code === 'SUCCESS', code, message: run.state?.state_message ?? '' };
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const jobId = String(this.getNodeParameter('jobId', i, '', { extractValue: true }));

	if (!/^[0-9]+$/.test(jobId)) {
		throw new NodeOperationError(this.getNode(), 'Job ID must be a whole number', {
			itemIndex: i,
			description: 'Use the numeric ID shown in the job URL in Databricks.',
		});
	}
	if (!Number.isSafeInteger(Number(jobId))) {
		throw new NodeOperationError(this.getNode(), 'Job ID is too large to send exactly', {
			itemIndex: i,
			description:
				'IDs above 9007199254740991 lose precision in JavaScript, so the node cannot run this job.',
		});
	}

	const jobParameters = readJobParameters(this, i);
	const waitForCompletion = this.getNodeParameter('waitForCompletion', i, false) === true;

	const options = this.getNodeParameter('options', i, {});
	const timeoutSeconds =
		options.timeout === undefined ? DEFAULT_TIMEOUT_SECONDS : Number(options.timeout);
	if (waitForCompletion && (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0)) {
		throw new NodeOperationError(this.getNode(), 'Timeout must be a positive number of seconds', {
			itemIndex: i,
		});
	}

	const runReference: DatabricksRunNowResponse = await databricksApiRequest(this, credentialType, {
		method: 'POST',
		url: `${host}/api/2.2/jobs/run-now`,
		body: {
			job_id: Number(jobId),
			...(Object.keys(jobParameters).length > 0 && { job_parameters: jobParameters }),
		},
		headers: { 'Content-Type': 'application/json' },
		json: true,
	});

	if (!waitForCompletion) {
		return [{ json: runReference, pairedItem: { item: i } }];
	}

	const maxPolls = Math.max(1, Math.ceil((timeoutSeconds * 1000) / POLL_INTERVAL_MS));
	const abortSignal = this.getExecutionCancelSignal();

	let run: DatabricksJobRun | undefined;
	for (let poll = 0; poll < maxPolls; poll++) {
		await sleep(POLL_INTERVAL_MS, abortSignal);
		const latest: DatabricksJobRun = await databricksApiRequest(this, credentialType, {
			method: 'GET',
			url: `${host}/api/2.2/jobs/runs/get`,
			qs: { run_id: runReference.run_id },
			headers: { Accept: 'application/json' },
			json: true,
		});
		run = latest;
		if (TERMINAL_RUN_STATES.has(getRunState(latest))) break;
	}

	if (!run || !TERMINAL_RUN_STATES.has(getRunState(run))) {
		throw new NodeOperationError(
			this.getNode(),
			`Job run ${runReference.run_id} did not finish within ${timeoutSeconds} seconds`,
			{
				itemIndex: i,
				description:
					'Raise the timeout in Options, or turn off Wait for Completion and look the run up later by its run ID.',
			},
		);
	}

	const outcome = getRunOutcome(run);
	if (!outcome.success) {
		const reason = outcome.message ? sanitizeApiMessage(outcome.message) : outcome.code;
		throw new NodeOperationError(
			this.getNode(),
			`Job run ${runReference.run_id} failed (${outcome.code}): ${reason}`,
			{
				itemIndex: i,
				description: run.run_page_url
					? `Open the run page in Databricks for details: ${run.run_page_url}`
					: undefined,
			},
		);
	}

	return [{ json: run, pairedItem: { item: i } }];
}
