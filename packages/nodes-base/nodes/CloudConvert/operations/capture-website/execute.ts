import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { CreateTasksPayload } from '../../Interfaces';
import merge from 'lodash.merge';
import { createJob, downloadOutputFile, getJobExportUrls, waitForJob } from '../../Utils';

export async function executeCaptureWebsite(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData = [];

	for (let i = 0; i < items.length; i++) {
		const tasks: CreateTasksPayload = {
			'n8n-process': {
				operation: 'capture-website',
				url: this.getNodeParameter('url', i),
				output_format: this.getNodeParameter('outputFormat', i),
			},
			'n8n-export': {
				input: 'n8n-process',
				operation: 'export/url',
			},
		};

		if (this.getNodeParameter('additionalOptions', i, null)) {
			let additionalOptions = this.getNodeParameter('additionalOptions', i) as string;
			try {
				additionalOptions = JSON.parse(additionalOptions);
			} catch (exception) {
				throw new NodeOperationError(this.getNode(), 'Additional Options must be a valid JSON');
			}
			tasks['n8n-process'] = merge(tasks['n8n-process'], additionalOptions);
		}

		const createdJob = await createJob.call(this, tasks);

		const completedJob = await waitForJob.call(this, createdJob.id);

		// download output files

		const exportUrls = getJobExportUrls(completedJob);

		for (const exportUrl of exportUrls) {
			returnData.push({
				json: {},
				binary: {
					data: await downloadOutputFile.call(this, exportUrl),
				},
				pairedItem: {
					item: i,
				},
			});
		}
	}

	return this.prepareOutputData(returnData);
}
