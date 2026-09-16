import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	databricksApiRequest,
	getActiveCredentialType,
	getHost,
	readIdParameter,
} from '../helpers';
import type { DatabricksJob, DatabricksJobSettings } from '../interfaces';

const SETTINGS_PAGES_MAX = 20;

type PaginatedSettingsKey = 'tasks' | 'job_clusters' | 'environments' | 'parameters';
const PAGINATED_SETTINGS_KEYS: PaginatedSettingsKey[] = [
	'tasks',
	'job_clusters',
	'environments',
	'parameters',
];

async function fetchJobPage(
	context: IExecuteFunctions,
	credentialType: 'databricksApi' | 'databricksOAuth2Api',
	host: string,
	jobId: number,
	pageToken?: string,
): Promise<DatabricksJob> {
	const qs: IDataObject = { job_id: jobId };
	if (pageToken) qs.page_token = pageToken;
	return await databricksApiRequest(context, credentialType, {
		method: 'GET',
		url: `${host}/api/2.2/jobs/get`,
		qs,
		headers: { Accept: 'application/json' },
		json: true,
	});
}

function appendPaginatedSettings(
	target: DatabricksJobSettings,
	page: DatabricksJobSettings | undefined,
): void {
	for (const key of PAGINATED_SETTINGS_KEYS) {
		const entries = page?.[key];
		if (entries?.length) target[key] = [...(target[key] ?? []), ...entries];
	}
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const jobId = readIdParameter(this, i, 'jobId', 'job');

	const { has_more, next_page_token, ...job } = await fetchJobPage(
		this,
		credentialType,
		host,
		jobId,
	);
	let pageToken = next_page_token;
	for (let page = 1; pageToken && page < SETTINGS_PAGES_MAX; page++) {
		const next = await fetchJobPage(this, credentialType, host, jobId, pageToken);
		job.settings ??= {};
		appendPaginatedSettings(job.settings, next.settings);
		pageToken = next.next_page_token;
	}
	if (pageToken) {
		throw new NodeOperationError(
			this.getNode(),
			`Job ${jobId} has more tasks than the node can read`,
			{
				itemIndex: i,
				description: `The node reads at most ${SETTINGS_PAGES_MAX * 100} tasks of one job. Open the job in Databricks to see its full definition.`,
			},
		);
	}

	return [{ json: job, pairedItem: { item: i } }];
}
