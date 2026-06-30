import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import * as databricksSql from './databricksSql/DatabricksSql.resource';
import * as files from './files/Files.resource';
import * as genie from './genie/Genie.resource';
import * as modelServing from './modelServing/ModelServing.resource';
import * as unityCatalog from './unityCatalog/UnityCatalog.resource';
import * as vectorSearch from './vectorSearch/VectorSearch.resource';

type ResourceMap =
	| typeof databricksSql
	| typeof files
	| typeof genie
	| typeof modelServing
	| typeof unityCatalog
	| typeof vectorSearch;

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

	let resourceModule: ResourceMap;

	switch (resource) {
		case 'databricksSql':
			resourceModule = databricksSql;
			break;
		case 'files':
			resourceModule = files;
			break;
		case 'genie':
			resourceModule = genie;
			break;
		case 'modelServing':
			resourceModule = modelServing;
			break;
		case 'unityCatalog':
			resourceModule = unityCatalog;
			break;
		case 'vectorSearch':
			resourceModule = vectorSearch;
			break;
		default:
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
	}

	const operationModule = (
		resourceModule as Record<
			string,
			{ execute: (this: IExecuteFunctions, i: number) => Promise<INodeExecutionData[]> }
		>
	)[operation];

	if (!operationModule) {
		throw new NodeOperationError(
			this.getNode(),
			`The operation "${operation}" is not known for resource "${resource}"`,
		);
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const result = await operationModule.execute.call(this, i);
			returnData.push(...result);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
				continue;
			}
			throw error;
		}
	}

	return [returnData];
}
