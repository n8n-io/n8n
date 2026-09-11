import { NodeOperationError, jsonParse } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	IExecuteWorkflowInfo,
	INodeParameterResourceLocator,
} from 'n8n-workflow';

export async function getWorkflowInfo(this: IExecuteFunctions, source: string, itemIndex = 0) {
	const workflowInfo: IExecuteWorkflowInfo = {};
	const nodeVersion = this.getNode().typeVersion;
	if (source === 'database') {
		// Read workflow from database
		if (nodeVersion === 1) {
			workflowInfo.id = this.getNodeParameter('workflowId', itemIndex) as string;
		} else {
			const { value } = this.getNodeParameter(
				'workflowId',
				itemIndex,
				{},
			) as INodeParameterResourceLocator;
			workflowInfo.id = value as string;
		}
	} else if (source === 'parameter') {
		// Read workflow from parameter
		const workflowJson = this.getNodeParameter('workflowJson', itemIndex) as string;
		workflowInfo.code = jsonParse(workflowJson);
	} else if (source === 'localFile' || source === 'url') {
		// Old workflows can still carry these values, so fail with a clear message
		throw new NodeOperationError(
			this.getNode(),
			`The "${source === 'localFile' ? 'Local File' : 'URL'}" source was removed. Save the sub-workflow on this n8n instance and use the "Database" source, or paste the workflow JSON into the "Define Below" source instead.`,
		);
	}

	return workflowInfo;
}
