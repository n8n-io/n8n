import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { JOBS_ARRAY_PAGE_SIZE, JOBS_PAGES_MAX } from '../../constants';
import { fetchDatabricksPage, getActiveCredentialType, getHost, readIdParameter } from '../helpers';
import type { DatabricksJob, DatabricksJobSettings } from '../interfaces';

type PaginatedSettingsKey = 'tasks' | 'job_clusters' | 'environments' | 'parameters';
const PAGINATED_SETTINGS_KEYS: PaginatedSettingsKey[] = [
	'tasks',
	'job_clusters',
	'environments',
	'parameters',
];

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
	const fetchPage = async (pageToken?: string) =>
		await fetchDatabricksPage<DatabricksJob>(
			this,
			credentialType,
			host,
			'/api/2.2/jobs/get',
			{ job_id: jobId, include_trigger_state: true },
			pageToken,
		);

	const { has_more, next_page_token, ...job } = await fetchPage();
	let pageToken = next_page_token;
	for (let page = 1; pageToken && page < JOBS_PAGES_MAX; page++) {
		const next = await fetchPage(pageToken);
		job.settings ??= {};
		appendPaginatedSettings(job.settings, next.settings);
		pageToken = next.next_page_token;
	}
	if (pageToken) {
		throw new NodeOperationError(
			this.getNode(),
			`Job ${jobId} has more settings entries than the node can read`,
			{
				itemIndex: i,
				description: `The node reads at most ${JOBS_PAGES_MAX * JOBS_ARRAY_PAGE_SIZE} tasks, job clusters, environments or parameters of one job. Open the job in Databricks to see its full definition.`,
			},
		);
	}

	return [{ json: job, pairedItem: { item: i } }];
}
