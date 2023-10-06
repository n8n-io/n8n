import {
	NodeOperationError,
	type IExecuteFunctions,
	type IExecuteWorkflowInfo,
	jsonParse,
} from 'n8n-workflow';

import { readFile as fsReadFile } from 'fs/promises';

export async function getWorkflowInfo(this: IExecuteFunctions, source: string, itemIndex = 0) {
	const workflowInfo: IExecuteWorkflowInfo = {};

	if (source === 'database') {
		// Read workflow from database
		workflowInfo.id = this.getNodeParameter('workflowId', itemIndex) as string;
	} else if (source === 'localFile') {
		// Read workflow from filesystem
		const workflowPath = this.getNodeParameter('workflowPath', itemIndex) as string;

		let workflowJson;
		try {
			workflowJson = await fsReadFile(workflowPath, { encoding: 'utf8' });
		} catch (error) {
			if (error.code === 'ENOENT') {
				throw new NodeOperationError(
					this.getNode(),
					`The file "${workflowPath}" could not be found, [item ${itemIndex}]`,
				);
			}

			throw error;
		}

		workflowInfo.code = jsonParse(workflowJson);
	} else if (source === 'parameter') {
		// Read workflow from parameter
		const workflowJson = this.getNodeParameter('workflowJson', itemIndex) as string;
		workflowInfo.code = jsonParse(workflowJson);
	} else if (source === 'url') {
		// Read workflow from url
		const workflowUrl = this.getNodeParameter('workflowUrl', itemIndex) as string;

		const requestOptions = {
			headers: {
				accept: 'application/json,text/*;q=0.99',
			},
			method: 'GET',
			uri: workflowUrl,
			json: true,
			gzip: true,
		};

		const response = await this.helpers.request(requestOptions);
		workflowInfo.code = response;
	}

	return workflowInfo;
}
