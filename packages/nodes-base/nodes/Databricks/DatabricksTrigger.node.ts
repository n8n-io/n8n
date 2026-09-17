import {
	NodeConnectionTypes,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
} from 'n8n-workflow';

import { authenticationProperty, databricksCredentials } from './authentication';
import { DATABRICKS_TRIGGER_NODE_VERSION } from './constants';

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
		properties: [authenticationProperty],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		return null;
	}
}
