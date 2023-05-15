import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { CreateTasksPayload } from '../../Interfaces';
import { createJob, getJobUploadTask, uploadInputFile, waitForJob } from '../../Utils';

export async function executeMetadata(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData = [];

	for (let i = 0; i < items.length; i++) {
		const tasks: CreateTasksPayload = {
			'n8n-upload': {
				operation: 'import/upload',
			},
			'n8n-process': {
				input: 'n8n-upload',
				operation: 'metadata',
			},
		};

		const createdJob = await createJob.call(this, tasks);

		const uploadTask = getJobUploadTask(createdJob);

		if (uploadTask) {
			await uploadInputFile.call(this, uploadTask, i);
		}

		const completedJob = await waitForJob.call(this, createdJob.id);

		const metadata = completedJob.tasks.filter(
			(task) => task.operation === 'metadata' && task.status === 'finished',
		)[0]?.result?.metadata as IDataObject;
		returnData.push({
			json: metadata,
			pairedItem: {
				item: i,
			},
		});
	}

	return this.prepareOutputData(returnData);
}
