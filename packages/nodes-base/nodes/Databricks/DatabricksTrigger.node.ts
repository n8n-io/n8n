import {
	NodeConnectionTypes,
	UnexpectedError,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
} from 'n8n-workflow';

import { authenticationProperty, databricksCredentials } from './authentication';
import { DATABRICKS_TRIGGER_NODE_VERSION } from './constants';
import { getJobs } from './methods/listSearch';
import { jobParameters } from './resources';
import { pollJobRunEvents } from './trigger/jobRunEvents';
import { getPipelines } from './trigger/pipelines';
import { pollPipelineUpdateEvents } from './trigger/pipelineUpdateEvents';

const showForJob = { resource: ['job'] };
const showForPipeline = { resource: ['pipeline'] };

const UUID_REGEX = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

function findJobPicker(): INodeProperties {
	const picker = jobParameters.find((property) => property.name === 'jobId');
	if (picker === undefined) {
		throw new UnexpectedError('The Databricks job parameters do not include the jobId picker');
	}
	return picker;
}

export class DatabricksTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Databricks Trigger',
		name: 'databricksTrigger',
		hidden: true,
		icon: { light: 'file:databricks.svg', dark: 'file:databricks.dark.svg' },
		group: ['trigger'],
		version: DATABRICKS_TRIGGER_NODE_VERSION,
		description: 'Starts the workflow when Databricks job runs or pipeline updates change state',
		defaults: {
			name: 'Databricks Trigger',
		},
		credentials: databricksCredentials,
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			authenticationProperty,
			{
				displayName:
					'Use a credential that belongs to a service principal for triggers. A credential tied to a person stops firing when that person leaves or revokes consent.',
				name: 'servicePrincipalNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Job',
						value: 'job',
						description: 'Watch the runs of a job',
					},
					{
						name: 'Pipeline',
						value: 'pipeline',
						description: 'Watch the updates of a pipeline',
					},
				],
				default: 'job',
			},
			{
				...findJobPicker(),
				description: 'The job whose runs start the workflow',
				displayOptions: {
					show: showForJob,
				},
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				displayOptions: {
					show: showForJob,
				},
				options: [
					{
						name: 'Run Failed',
						value: 'runFailed',
						description:
							'A run ended with any result other than a full success, including cancelled, skipped and partly failed runs. A repair of a run that was already reported does not fire again.',
					},
					{
						name: 'Run Started',
						value: 'runStarted',
						description: 'A new run of the job was seen',
					},
					{
						name: 'Run Succeeded',
						value: 'runSucceeded',
						description:
							'A run ended with every task successful. A repair of a run that was already reported does not fire again.',
					},
				],
				default: ['runFailed', 'runSucceeded'],
			},
			{
				displayName: 'Pipeline',
				name: 'pipelineId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The pipeline whose updates start the workflow',
				displayOptions: {
					show: showForPipeline,
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'getPipelines',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. 8199cd89-e2f5-4169-a6aa-656a24c8886d',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: `^${UUID_REGEX}$`,
									errorMessage: 'Must be a pipeline ID, which is a UUID',
								},
							},
						],
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder:
							'e.g. https://adb-xxx.azuredatabricks.net/pipelines/8199cd89-e2f5-4169-a6aa-656a24c8886d',
						extractValue: {
							type: 'regex',
							regex: `https://[^/]+/(?:pipelines|\\?o=[0-9]+#joblist/pipelines|#joblist/pipelines)/(${UUID_REGEX})`,
						},
					},
				],
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				displayOptions: {
					show: showForPipeline,
				},
				options: [
					{
						name: 'Update Completed',
						value: 'updateCompleted',
						description: 'An update finished successfully',
					},
					{
						name: 'Update Failed',
						value: 'updateFailed',
						description:
							'An update failed or was cancelled. Stopping a pipeline cancels the update that is running.',
					},
					{
						name: 'Update Started',
						value: 'updateStarted',
						description: 'A new update of the pipeline was seen',
					},
				],
				default: ['updateCompleted', 'updateFailed'],
			},
			{
				displayName:
					'A continuous pipeline runs one update until it is stopped, so Update Completed does not fire for it. Update Started fires when the pipeline starts or restarts, and Update Failed fires when the update fails or the pipeline is stopped.',
				name: 'continuousPipelineNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: showForPipeline,
				},
			},
			{
				displayName: 'Simplify',
				name: 'simplify',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
		],
	};

	methods = {
		listSearch: { getJobs, getPipelines },
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		if (this.getNodeParameter('resource', 'job') === 'pipeline') {
			return await pollPipelineUpdateEvents.call(this);
		}
		return await pollJobRunEvents.call(this);
	}
}
