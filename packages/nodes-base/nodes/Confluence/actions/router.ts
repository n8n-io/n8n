import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Compile-checked contract for operation modules. The router body (owned by ENT-125)
 * calls `<resource>.<operation>.execute.call(this, i)` once per item, SharePoint v2
 * shape; the other op tickets (ENT-126/319/127/305/327/306) implement against this.
 */
export type ConfluenceOperation = (
	this: IExecuteFunctions,
	itemIndex: number,
) => Promise<IDataObject | IDataObject[]>;

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
