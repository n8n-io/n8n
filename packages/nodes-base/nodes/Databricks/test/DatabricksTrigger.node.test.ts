import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { INodeType, IPollFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { Databricks } from '../Databricks.node';
import { DatabricksTrigger } from '../DatabricksTrigger.node';
import { getJobs } from '../methods/listSearch';

const property = (node: INodeType, name: string) =>
	node.description.properties.find((candidate) => candidate.name === name);
const authenticationProperty = (node: INodeType) => property(node, 'authentication');

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

	it('should offer the job resource', () => {
		expect(property(trigger, 'resource')).toEqual({
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [{ name: 'Job', value: 'job', description: 'Watch the runs of a job' }],
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
		expect(property(trigger, 'events')).toMatchObject({
			type: 'multiOptions',
			required: true,
			displayOptions: { show: { resource: ['job'] } },
			options: [{ value: 'runFailed' }, { value: 'runStarted' }, { value: 'runSucceeded' }],
			default: ['runFailed', 'runSucceeded'],
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
});
