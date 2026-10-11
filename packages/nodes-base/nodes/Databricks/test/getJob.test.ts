import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute as getJob } from '../actions/job/getJob.operation';
import { jobParameters } from '../resources/job/parameters';

const HOST = 'https://adb-1234567890.1.azuredatabricks.net';
const JOB_ID = 281874479417551;

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

type PaginatedKey = 'tasks' | 'job_clusters' | 'environments' | 'parameters';
const PAGINATED_KEYS: PaginatedKey[] = ['tasks', 'job_clusters', 'environments', 'parameters'];
type Settings = Record<string, unknown>;

describe('Job -> Get', () => {
	const entries = (key: PaginatedKey, from: number, count: number) =>
		Array.from({ length: count }, (_, offset) => ({
			[key.replace(/s$/, '_key')]: `${key}-${from + offset}`,
		}));

	const jobHeader = {
		job_id: JOB_ID,
		creator_user_name: 'owner@example.com',
		run_as_user_name: 'owner@example.com',
		created_time: 1757923200000,
		trigger_state: { file_arrival: { using_file_events: false } },
	};
	const firstPageSettings = {
		name: 'Nightly ETL',
		schedule: { quartz_cron_expression: '0 0 2 * * ?', timezone_id: 'UTC' },
		max_concurrent_runs: 1,
	};
	const paging = (nextPageToken?: string) =>
		nextPageToken ? { has_more: true, next_page_token: nextPageToken } : { has_more: false };
	const firstPage = (settings: Settings, nextPageToken?: string) => ({
		...jobHeader,
		settings: { ...firstPageSettings, ...settings },
		...paging(nextPageToken),
	});
	const laterPage = (settings: Settings, nextPageToken?: string) => ({
		job_id: JOB_ID,
		settings,
		...paging(nextPageToken),
	});
	const expectedJob = (settings: Settings) => ({
		...jobHeader,
		settings: { ...firstPageSettings, ...settings },
	});
	const getRequest = (pageToken?: string) =>
		expect.objectContaining({
			method: 'GET',
			url: `${HOST}/api/2.2/jobs/get`,
			qs: {
				job_id: JOB_ID,
				include_trigger_state: true,
				...(pageToken ? { page_token: pageToken } : {}),
			},
		});

	const setupContext = (
		overrides: Record<string, NodeParameterValueType | object> = {},
		itemIndex = 0,
	) => {
		const parameters: Record<string, NodeParameterValueType | object> = {
			authentication: 'accessToken',
			jobId: String(JOB_ID),
			...overrides,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getInputData.mockReturnValue([]);
		context.getExecutionCancelSignal.mockReturnValue(undefined);
		context.getNodeParameter.mockImplementation((name, index) =>
			index === itemIndex ? parameters[name] : undefined,
		);
		context.getCredentials.mockResolvedValue({ host: HOST });
		return context;
	};
	const apiMock = (context: ReturnType<typeof setupContext>) =>
		context.helpers.httpRequestWithAuthentication;
	const feedPages = (
		pages: object[],
		overrides: Record<string, NodeParameterValueType | object> = {},
		itemIndex = 0,
	) => {
		const context = setupContext(overrides, itemIndex);
		let call = 0;
		apiMock(context).mockImplementation(async () => pages[Math.min(call++, pages.length - 1)]);
		return { context, result: getJob.call(context, itemIndex) };
	};

	it.each([
		['accessToken', 'databricksApi'],
		['oAuth2', 'databricksOAuth2Api'],
	])(
		'should return the job definition from a single page with the %s credential',
		async (authentication, credentialType) => {
			const settings = {
				tasks: entries('tasks', 1, 1),
				job_clusters: entries('job_clusters', 1, 1),
			};
			const { context, result } = feedPages([firstPage(settings)], { authentication }, 2);

			await expect(result).resolves.toEqual([
				{ json: expectedJob(settings), pairedItem: { item: 2 } },
			]);
			expect(context.getCredentials).toHaveBeenCalledWith(credentialType);
			expect(apiMock(context)).toHaveBeenCalledTimes(1);
			expect(apiMock(context)).toHaveBeenCalledWith(credentialType, getRequest());
		},
	);

	it('should merge the paginated settings arrays of a large job in page order', async () => {
		const { context, result } = feedPages([
			firstPage(
				{
					tasks: entries('tasks', 1, 2),
					job_clusters: entries('job_clusters', 1, 1),
					environments: entries('environments', 1, 1),
					parameters: entries('parameters', 1, 1),
				},
				'page-2',
			),
			laterPage(
				{ tasks: entries('tasks', 3, 2), job_clusters: entries('job_clusters', 2, 1) },
				'page-3',
			),
			laterPage({
				tasks: entries('tasks', 5, 1),
				environments: entries('environments', 2, 1),
				parameters: entries('parameters', 2, 1),
			}),
		]);

		await expect(result).resolves.toEqual([
			{
				json: expectedJob({
					tasks: entries('tasks', 1, 5),
					job_clusters: entries('job_clusters', 1, 2),
					environments: entries('environments', 1, 2),
					parameters: entries('parameters', 1, 2),
				}),
				pairedItem: { item: 0 },
			},
		]);
		expect(apiMock(context)).toHaveBeenCalledTimes(3);
		expect(apiMock(context)).toHaveBeenNthCalledWith(1, 'databricksApi', getRequest());
		expect(apiMock(context)).toHaveBeenNthCalledWith(2, 'databricksApi', getRequest('page-2'));
		expect(apiMock(context)).toHaveBeenNthCalledWith(3, 'databricksApi', getRequest('page-3'));
	});

	it.each(PAGINATED_KEYS)(
		'should concatenate %s across pages in page order and leave the other arrays absent',
		async (key) => {
			const { result } = feedPages([
				firstPage({ [key]: entries(key, 1, 2) }, 'page-2'),
				laterPage({ [key]: entries(key, 3, 2) }, 'page-3'),
				laterPage({ [key]: entries(key, 5, 2) }),
			]);

			await expect(result).resolves.toEqual([
				{ json: expectedJob({ [key]: entries(key, 1, 6) }), pairedItem: { item: 0 } },
			]);
		},
	);

	it.each(PAGINATED_KEYS)('should ignore an empty %s array on a later page', async (key) => {
		const { result } = feedPages([firstPage({}, 'page-2'), laterPage({ [key]: [] })]);

		await expect(result).resolves.toEqual([{ json: expectedJob({}), pairedItem: { item: 0 } }]);
	});

	it('should keep the header and settings of the first page when a later page repeats them with other values', async () => {
		const { result } = feedPages([
			firstPage({ tasks: entries('tasks', 1, 1) }, 'page-2'),
			{
				...firstPage({ name: 'Renamed', tasks: entries('tasks', 2, 1) }),
				creator_user_name: 'other@example.com',
			},
		]);

		await expect(result).resolves.toEqual([
			{ json: expectedJob({ tasks: entries('tasks', 1, 2) }), pairedItem: { item: 0 } },
		]);
	});

	it('should fail instead of returning a partial definition when the job has more pages than the node reads', async () => {
		const { context, result } = feedPages(
			[firstPage({ tasks: entries('tasks', 1, 1) }, 'more')],
			{},
			2,
		);

		await expect(result).rejects.toBeInstanceOf(NodeOperationError);
		await expect(result).rejects.toMatchObject({
			message: `Job ${JOB_ID} has more settings entries than the node can read`,
			description:
				'The node reads at most 2000 tasks, job clusters, environments or parameters of one job. Open the job in Databricks to see its full definition.',
			context: { itemIndex: 2 },
		});
		expect(apiMock(context)).toHaveBeenCalledTimes(20);
	});

	it.each([
		['', 'Job ID must be a whole number'],
		['abc', 'Job ID must be a whole number'],
		['9007199254740993', 'Job ID is too large to send exactly'],
	])('should reject the job ID %j before calling the API', async (jobId, message) => {
		const { context, result } = feedPages([], { jobId }, 2);

		await expect(result).rejects.toBeInstanceOf(NodeOperationError);
		await expect(result).rejects.toMatchObject({ message, context: { itemIndex: 2 } });
		expect(apiMock(context)).not.toHaveBeenCalled();
	});

	it('should share the job picker with the Run operation', () => {
		const jobPicker = jobParameters.find((property) => property.name === 'jobId');

		expect(jobPicker?.displayOptions?.show?.operation).toEqual(['getJob', 'run']);
		expect(jobPicker?.modes?.map((mode) => mode.name)).toEqual(['list', 'id', 'url']);
	});
});
