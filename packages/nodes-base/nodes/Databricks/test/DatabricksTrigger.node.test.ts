import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { isRecord } from '@n8n/utils/is-record';
import type { INodeProperties, INodeType, IPollFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { Databricks } from '../Databricks.node';
import { DatabricksTrigger } from '../DatabricksTrigger.node';
import { getJobs } from '../methods/listSearch';
import { getPipelines } from '../trigger/pipelines';

const PIPELINE_ID = '8199cd89-e2f5-4169-a6aa-656a24c8886d';

const property = (node: INodeType, name: string) =>
	node.description.properties.find((candidate) => candidate.name === name);
const propertyFor = (node: INodeType, name: string, resource: string) =>
	node.description.properties.find(
		(candidate) =>
			candidate.name === name && candidate.displayOptions?.show?.resource?.includes(resource),
	);
const authenticationProperty = (node: INodeType) => property(node, 'authentication');
const modeOf = (picker: INodeProperties | undefined, name: string) =>
	picker?.modes?.find((mode) => mode.name === name);
const regexOf = (rule: unknown) =>
	isRecord(rule) && isRecord(rule.properties) && typeof rule.properties.regex === 'string'
		? rule.properties.regex
		: '';

describe('DatabricksTrigger', () => {
	const trigger = new DatabricksTrigger();
	const action = new Databricks();

	it('should ship hidden as a polling trigger', () => {
		expect(trigger.description).toMatchObject({
			displayName: 'Databricks Trigger',
			name: 'databricksTrigger',
			group: ['trigger'],
			version: 1,
			hidden: true,
			polling: true,
			inputs: [],
			outputs: ['main'],
		});
	});

	it('should gate each credential on its authentication option', () => {
		expect(trigger.description.credentials).toEqual([
			{
				name: 'databricksApi',
				required: true,
				displayOptions: { show: { authentication: ['accessToken'] } },
			},
			{
				name: 'databricksOAuth2Api',
				required: true,
				displayOptions: { show: { authentication: ['oAuth2'] } },
			},
		]);
		expect(authenticationProperty(trigger)).toMatchObject({
			type: 'options',
			default: 'accessToken',
			options: [{ value: 'accessToken' }, { value: 'oAuth2' }],
		});
	});

	it('should share the authentication selector and credentials with the action node', () => {
		expect(trigger.description.credentials).toBe(action.description.credentials);
		expect(authenticationProperty(trigger)).toBe(authenticationProperty(action));
	});

	it('should ship both icon files next to the node', () => {
		expect(trigger.description.icon).toEqual({
			light: 'file:databricks.svg',
			dark: 'file:databricks.dark.svg',
		});
		for (const file of ['databricks.svg', 'databricks.dark.svg']) {
			expect(existsSync(resolve(__dirname, '..', file))).toBe(true);
		}
	});

	it('should be registered in the package manifest', () => {
		const manifest = JSON.parse(
			readFileSync(resolve(__dirname, '../../../package.json'), 'utf8'),
		) as { n8n: { nodes: string[] } };

		expect(manifest.n8n.nodes).toContain('dist/nodes/Databricks/DatabricksTrigger.node.js');
	});

	it('should recommend a service principal right after the authentication selector', () => {
		const names = trigger.description.properties.map((p) => p.name);

		expect(names.indexOf('servicePrincipalNotice')).toBe(names.indexOf('authentication') + 1);
		expect(property(trigger, 'servicePrincipalNotice')).toEqual({
			displayName: expect.stringContaining('service principal'),
			name: 'servicePrincipalNotice',
			type: 'notice',
			default: '',
		});
	});

	it('should offer the job and pipeline resources', () => {
		expect(property(trigger, 'resource')).toEqual({
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Job', value: 'job', description: 'Watch the runs of a job' },
				{ name: 'Pipeline', value: 'pipeline', description: 'Watch the updates of a pipeline' },
			],
			default: 'job',
		});
	});

	it('should pick the job with the locator modes of the action node', () => {
		const jobId = property(trigger, 'jobId');

		expect(jobId).toMatchObject({
			displayName: 'Job',
			type: 'resourceLocator',
			required: true,
			default: { mode: 'list', value: '' },
			description: 'The job whose runs start the workflow',
			displayOptions: { show: { resource: ['job'] } },
		});
		expect(jobId?.modes?.map((mode) => mode.name)).toEqual(['list', 'id', 'url']);
		expect(jobId?.modes).toBe(property(action, 'jobId')?.modes);
		expect(trigger.methods?.listSearch?.getJobs).toBe(getJobs);
	});

	it('should subscribe to failed and succeeded runs by default', () => {
		expect(propertyFor(trigger, 'events', 'job')).toMatchObject({
			type: 'multiOptions',
			required: true,
			displayOptions: { show: { resource: ['job'] } },
			options: [{ value: 'runFailed' }, { value: 'runStarted' }, { value: 'runSucceeded' }],
			default: ['runFailed', 'runSucceeded'],
		});
	});

	it('should pick the pipeline by list, ID or URL', () => {
		const pipelineId = property(trigger, 'pipelineId');

		expect(pipelineId).toMatchObject({
			displayName: 'Pipeline',
			type: 'resourceLocator',
			required: true,
			default: { mode: 'list', value: '' },
			description: 'The pipeline whose updates start the workflow',
			displayOptions: { show: { resource: ['pipeline'] } },
		});
		expect(pipelineId?.modes?.map((mode) => mode.name)).toEqual(['list', 'id', 'url']);
		expect(modeOf(pipelineId, 'list')?.typeOptions).toEqual({
			searchListMethod: 'getPipelines',
			searchable: true,
		});
		expect(trigger.methods?.listSearch?.getPipelines).toBe(getPipelines);
	});

	it.each([
		['a UUID', PIPELINE_ID, true],
		['a UUID in upper case', PIPELINE_ID.toUpperCase(), true],
		['a UUID without dashes', PIPELINE_ID.replaceAll('-', ''), false],
		['a job ID', '281874479417551', false],
		['a UUID with a trailing path', `${PIPELINE_ID}/events`, false],
	])('should validate %s typed as a pipeline ID', (_label, value, valid) => {
		const rule = modeOf(property(trigger, 'pipelineId'), 'id')?.validation?.[0];

		expect(rule).toMatchObject({ type: 'regex' });
		expect(new RegExp(regexOf(rule)).test(value)).toBe(valid);
	});

	it.each([
		['a workspace URL', `https://adb-1234567890.1.azuredatabricks.net/pipelines/${PIPELINE_ID}`],
		[
			'a workspace URL with a query',
			`https://dbc-a1b2c3d4-e5f6.cloud.databricks.com/pipelines/${PIPELINE_ID}?o=1234567890`,
		],
		[
			'a legacy URL',
			`https://dbc-a1b2c3d4-e5f6.cloud.databricks.com/?o=1234567890#joblist/pipelines/${PIPELINE_ID}`,
		],
	])('should extract the pipeline ID from %s', (_label, url) => {
		const extractor = modeOf(property(trigger, 'pipelineId'), 'url')?.extractValue;

		expect(extractor).toMatchObject({ type: 'regex' });
		expect(new RegExp(extractor?.regex ?? '').exec(url)?.[1]).toBe(PIPELINE_ID);
	});

	it('should subscribe to completed and failed updates by default', () => {
		expect(propertyFor(trigger, 'events', 'pipeline')).toMatchObject({
			type: 'multiOptions',
			required: true,
			options: [
				{ value: 'updateCompleted' },
				{ value: 'updateFailed' },
				{ value: 'updateStarted' },
			],
			default: ['updateCompleted', 'updateFailed'],
		});
	});

	it('should explain continuous pipelines right after the pipeline events', () => {
		const properties = trigger.description.properties;
		const eventsIndex = properties.indexOf(
			propertyFor(trigger, 'events', 'pipeline') ?? properties[0],
		);

		expect(properties[eventsIndex + 1]).toEqual({
			displayName: expect.stringContaining('continuous pipeline'),
			name: 'continuousPipelineNotice',
			type: 'notice',
			default: '',
			displayOptions: { show: { resource: ['pipeline'] } },
		});
	});

	it('should simplify the output by default', () => {
		expect(property(trigger, 'simplify')).toEqual({
			displayName: 'Simplify',
			name: 'simplify',
			type: 'boolean',
			default: true,
			description: 'Whether to return a simplified version of the response instead of the raw data',
		});
	});

	it('should hand the poll to the job run watcher', async () => {
		const context = mockDeep<IPollFunctions>();
		const staticData = {};
		context.getMode.mockReturnValue('trigger');
		context.getWorkflowStaticData.mockReturnValue(staticData);
		context.getNodeParameter.mockImplementation((name, fallback) =>
			name === 'events' ? ['runFailed'] : name === 'jobId' ? '281874479417551' : fallback,
		);

		await expect(trigger.poll.call(context)).resolves.toBeNull();

		expect(staticData).toMatchObject({ jobId: 281874479417551 });
		expect(context.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('should hand the poll to the pipeline update watcher', async () => {
		const context = mockDeep<IPollFunctions>();
		const staticData = {};
		context.getMode.mockReturnValue('trigger');
		context.getWorkflowStaticData.mockReturnValue(staticData);
		context.getCredentials.mockResolvedValue({ host: 'https://adb-example.cloud.databricks.com' });
		context.getNodeParameter.mockImplementation((name, fallback) => {
			switch (name) {
				case 'resource':
					return 'pipeline';
				case 'events':
					return ['updateFailed'];
				case 'pipelineId':
					return PIPELINE_ID;
				default:
					return fallback;
			}
		});

		await expect(trigger.poll.call(context)).resolves.toBeNull();

		expect(staticData).toMatchObject({ pipelineId: PIPELINE_ID });
		expect(context.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});
