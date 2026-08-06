import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	// Fallbacks: the shell ships properties: [], so these parameters don't exist yet
	const resource = this.getNodeParameter('resource', 0, '');
	const operation = this.getNodeParameter('operation', 0, '');

	switch (resource) {
		// Op tickets (ENT-125/126/319/127/305/327/306) add their resource cases here
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${resource}:${operation}" is not supported`,
			);
	}
}
