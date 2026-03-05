import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class CredentialCheck implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Credential Check',
		name: 'credentialCheck',
		icon: 'fa:key',
		group: ['transform'],
		version: 1,
		description:
			'Checks dynamic credential status and routes to Ready or Not Ready based on availability',
		defaults: {
			name: 'Credential Check',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		outputNames: ['Ready', 'Not Ready'],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const executionContext = this.getExecutionContext();
		const workflowId = this.getWorkflow().id;

		if (!executionContext) {
			throw new NodeOperationError(
				this.getNode(),
				'No execution context available. This node requires dynamic credentials to be configured.',
			);
		}

		if (!workflowId) {
			throw new NodeOperationError(this.getNode(), 'Could not determine the workflow ID.');
		}

		if (!this.helpers.checkCredentialStatus) {
			throw new NodeOperationError(
				this.getNode(),
				'Credential check functionality is not available. Ensure the dynamic credentials module is enabled.',
			);
		}

		const result = await this.helpers.checkCredentialStatus(workflowId, executionContext);

		if (result.readyToExecute) {
			return [items, []];
		}

		const notReadyItems: INodeExecutionData[] = items.map((item) => ({
			json: {
				...item.json,
				credentialCheckResult: result,
			},
			pairedItem: item.pairedItem,
		}));

		return [[], notReadyItems];
	}
}
