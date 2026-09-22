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

const showForJob = { resource: ['job'] };

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
		listSearch: { getJobs },
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		return await pollJobRunEvents.call(this);
	}
}
