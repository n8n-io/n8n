import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import FormData from 'form-data';
import type { Readable } from 'stream';
import type { CreateTasksPayload, Job, Task, TaskResultFile } from './Interfaces';

export async function createJob(this: IExecuteFunctions, tasks: CreateTasksPayload): Promise<Job> {
	const credentialsType =
		(this.getNodeParameter('authentication', 0) as string) === 'oAuth2'
			? 'cloudConvertOAuth2Api'
			: 'cloudConvertApi';
	let createResponseData;
	try {
		createResponseData = await this.helpers.httpRequestWithAuthentication.call(
			this,
			credentialsType,
			{
				method: 'POST',
				url: 'https://api.cloudconvert.com/v2/jobs',
				json: true,
				body: {
					tag: 'n8n',
					tasks,
				},
			},
		);
	} catch (e) {
		if (e.cause.response?.data?.code) {
			throw new NodeOperationError(
				this.getNode(),
				`${e.cause.response.data.message} (Code: ${e.cause.response.data.code})`,
			);
		}
		throw e;
	}
	return createResponseData.data;
}

export async function uploadInputFile(this: IExecuteFunctions, uploadTask: Task, itemIndex = 0) {
	const formData = new FormData();

	for (const parameter in uploadTask.result?.form?.parameters || []) {
		formData.append(parameter, uploadTask.result!.form!.parameters[parameter]);
	}

	if (this.getNodeParameter('inputBinaryData', itemIndex)) {
		const binaryPropertyName = this.getNodeParameter(
			'inputBinaryPropertyName',
			itemIndex,
		) as string;
		const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
		if (!binaryData.fileName)
			throw new NodeOperationError(this.getNode(), 'No file name given for input file.');

		formData.append('file', buffer, {
			contentType: binaryData.mimeType,
			filename: binaryData.fileName,
		});
	} else {
		formData.append('file', this.getNodeParameter('inputFileContent', itemIndex), {
			contentType: 'text/plain',
			filename: this.getNodeParameter('inputFilename', itemIndex) as string,
		});
	}

	await this.helpers.httpRequest({
		method: 'POST',
		url: uploadTask.result!.form!.url,
		body: formData,

		headers: {
			...formData.getHeaders(),
		},
	});
}

export function getJobErrorMessage(job: Job): string {
	return job.tasks
		.map((task) => {
			if (task.status === 'error' && task.code !== 'INPUT_TASK_FAILED') {
				return task.message + ' (Code: ' + (task.code ?? '?') + ')';
			}
			return null;
		})
		.filter((msg: string | null) => msg !== null)
		.join('; ');
}

export async function waitForJob(this: IExecuteFunctions, id: string): Promise<Job> {
	const credentialsType =
		(this.getNodeParameter('authentication', 0) as string) === 'oAuth2'
			? 'cloudConvertOAuth2Api'
			: 'cloudConvertApi';
	const waitResponseData = await this.helpers.httpRequestWithAuthentication.call(
		this,
		credentialsType,
		{
			method: 'GET',
			url: `https://sync.api.cloudconvert.com/v2/jobs/${id}`,
		},
	);

	const job = waitResponseData.data as Job;

	if (job.status === 'error') {
		throw new NodeOperationError(this.getNode(), getJobErrorMessage(job));
	}
	return job;
}

export async function downloadOutputFile(this: IExecuteFunctions, exportUrl: TaskResultFile) {
	const downloadResponse = (await this.helpers.httpRequest({
		method: 'GET',
		url: exportUrl.url,
		returnFullResponse: true,
		encoding: 'stream',
	})) as { body: Readable; headers: { [key: string]: string } };
	return this.helpers.prepareBinaryData(
		downloadResponse.body,
		exportUrl.filename,
		downloadResponse.headers['content-type'],
	);
}

export function getJobUploadTask(job: Job, index = 0): Task | null {
	const uploadTasks = job.tasks.filter((task) => task.operation === 'import/upload');
	return uploadTasks[index] !== undefined ? uploadTasks[index] : null;
}

export function getJobExportUrls(job: Job): TaskResultFile[] {
	return job.tasks
		.filter((task) => task.operation === 'export/url' && task.status === 'finished')
		.flatMap((task) => task.result?.files ?? []);
}
