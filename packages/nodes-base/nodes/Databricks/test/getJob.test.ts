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

describe('Job -> Get', () => {
	const task = (taskKey: string) => ({
		task_key: taskKey,
		notebook_task: { notebook_path: `/Repos/etl/${taskKey}` },
	});
	const cluster = (clusterKey: string) => ({
		job_cluster_key: clusterKey,
		new_cluster: { spark_version: '15.4.x-scala2.12', num_workers: 2 },
	});
	const jobHeader = {
		job_id: JOB_ID,
		creator_user_name: 'owner@example.com',
		run_as_user_name: 'owner@example.com',
		created_time: 1757923200000,
		trigger_state: {},
	};
	const firstPageSettings = {
		name: 'Nightly ETL',
		schedule: { quartz_cron_expression: '0 0 2 * * ?', timezone_id: 'UTC' },
		max_concurrent_runs: 1,
	};

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
	const getRequest = (qs: object) =>
		expect.objectContaining({ method: 'GET', url: `${HOST}/api/2.2/jobs/get`, qs });

	it('should return the job definition from a single page', async () => {
		const context = setupContext({}, 2);
		apiMock(context).mockResolvedValueOnce({
			...jobHeader,
			settings: { ...firstPageSettings, tasks: [task('main')], job_clusters: [cluster('etl')] },
			has_more: false,
		});

		const result = await getJob.call(context, 2);

		expect(apiMock(context)).toHaveBeenCalledTimes(1);
		expect(apiMock(context)).toHaveBeenCalledWith('databricksApi', getRequest({ job_id: JOB_ID }));
		expect(result).toEqual([
			{
				json: {
					...jobHeader,
					settings: {
						...firstPageSettings,
						tasks: [task('main')],
						job_clusters: [cluster('etl')],
					},
				},
				pairedItem: { item: 2 },
			},
		]);
	});

	it('should merge the paginated settings arrays of a large job in order', async () => {
		const context = setupContext();
		apiMock(context)
			.mockResolvedValueOnce({
				...jobHeader,
				settings: {
					...firstPageSettings,
					tasks: [task('extract')],
					job_clusters: [cluster('small')],
					environments: [{ environment_key: 'default' }],
					parameters: [{ name: 'env', default: 'prod' }],
				},
				has_more: true,
				next_page_token: 'page-2',
			})
			.mockResolvedValueOnce({
				job_id: JOB_ID,
				settings: { tasks: [task('transform')], job_clusters: [cluster('large')] },
				has_more: true,
				next_page_token: 'page-3',
			})
			.mockResolvedValueOnce({
				job_id: JOB_ID,
				settings: {
					tasks: [task('load')],
					environments: [{ environment_key: 'ml' }],
					parameters: [{ name: 'region', default: 'eu' }],
				},
				has_more: false,
			});

		const [item] = await getJob.call(context, 0);

		expect(apiMock(context)).toHaveBeenCalledTimes(3);
		expect(apiMock(context)).toHaveBeenNthCalledWith(
			2,
			'databricksApi',
			getRequest({ job_id: JOB_ID, page_token: 'page-2' }),
		);
		expect(apiMock(context)).toHaveBeenNthCalledWith(
			3,
			'databricksApi',
			getRequest({ job_id: JOB_ID, page_token: 'page-3' }),
		);
		expect(item.json).toEqual({
			...jobHeader,
			settings: {
				...firstPageSettings,
				tasks: [task('extract'), task('transform'), task('load')],
				job_clusters: [cluster('small'), cluster('large')],
				environments: [{ environment_key: 'default' }, { environment_key: 'ml' }],
				parameters: [
					{ name: 'env', default: 'prod' },
					{ name: 'region', default: 'eu' },
				],
			},
		});
		expect(item.json).not.toHaveProperty('has_more');
		expect(item.json).not.toHaveProperty('next_page_token');
	});

	it('should fail instead of returning a partial definition when the job has more pages than the node reads', async () => {
		const context = setupContext({}, 2);
		apiMock(context).mockImplementation(async () => ({
			...jobHeader,
			settings: { ...firstPageSettings, tasks: [task('extract')] },
			has_more: true,
			next_page_token: 'more',
		}));

		const result = getJob.call(context, 2);

		await expect(result).rejects.toBeInstanceOf(NodeOperationError);
		await expect(result).rejects.toMatchObject({
			message: `Job ${JOB_ID} has more tasks than the node can read`,
			context: { itemIndex: 2 },
		});
		expect(apiMock(context)).toHaveBeenCalledTimes(20);
	});

	it.each([
		['', 'Job ID must be a whole number'],
		['abc', 'Job ID must be a whole number'],
		['9007199254740993', 'Job ID is too large to send exactly'],
	])('should reject the job ID %j before calling the API', async (jobId, message) => {
		const context = setupContext({ jobId }, 2);

		const result = getJob.call(context, 2);

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
