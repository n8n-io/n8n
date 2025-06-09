import type { INodeProperties } from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-workflow';
import { pdfcoApiRequest, ActionConstants } from '../GenericFunctions';

export const description: INodeProperties[] = [
	{
		displayName: 'Upload Method',
		name: 'uploadMethod',
		type: 'options',
		default: 'presignedUrl',
		options: [
			{
				name: 'Standard Upload',
				value: 'presignedUrl',
				description: 'Upload files directly (supports larger files up to 2GB)',
			},
			{
				name: 'Base64',
				value: 'base64',
				description: 'Upload using base64 encoding (suitable for smaller files)',
			},
		],
		displayOptions: {
			show: {
				operation: [ActionConstants.UploadFile],
			},
		},
		description: 'The method to use for uploading the file',
	},
	{
		displayName: 'Binary File',
		name: 'binaryData',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: [ActionConstants.UploadFile],
				uploadMethod: ['presignedUrl'],
			},
		},
		description: 'Whether the data to upload should be taken from binary field',
	},
	{
		displayName: 'File Content',
		name: 'fileContent',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				operation: [ActionConstants.UploadFile],
				binaryData: [false],
				uploadMethod: ['presignedUrl'],
			},
		},
		placeholder: '',
		description: 'The text content of the file to upload',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				operation: [ActionConstants.UploadFile],
				binaryData: [true],
				uploadMethod: ['presignedUrl'],
			},
		},
		placeholder: '',
		hint: 'The name of the input binary field containing the file to be uploaded',
	},
	{
		displayName: 'Base64 Content',
		name: 'base64Content',
		type: 'string',
		default: '',
		required: true,
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				operation: [ActionConstants.UploadFile],
				uploadMethod: ['base64'],
			},
		},
		placeholder: '',
		description: 'The base64 encoded content of the file to upload',
	},
	{
		displayName: 'File Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the file to upload',
		displayOptions: {
			show: {
				operation: [ActionConstants.UploadFile],
			},
		},
	},
];

export async function execute(this: IExecuteFunctions, index: number) {
	const fileName = this.getNodeParameter('name', index) as string;
	const uploadMethod = this.getNodeParameter('uploadMethod', index) as string;

	if (uploadMethod === 'base64') {
		// Handle base64 upload
		const base64Content = this.getNodeParameter('base64Content', index) as string;

		const response = await pdfcoApiRequest.call(
			this,
			'/v1/file/upload/base64',
			{
				file: base64Content,
				name: fileName,
			},
			'POST',
		);

		return this.helpers.returnJsonArray({ url: response.url });
	} else {
		// Handle presigned URL upload
		const presignedUrlResponse = await pdfcoApiRequest.call(
			this,
			'/v1/file/upload/get-presigned-url',
			{},
			'GET',
			{ name: fileName },
		);

		const presignedUrl = presignedUrlResponse.presignedUrl;
		const finalUrl = presignedUrlResponse.url;

		// Step 2: Upload file using presigned URL
		let body: Buffer;

		if (this.getNodeParameter('binaryData', index)) {
			// Handle binary data upload
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index);
			this.helpers.assertBinaryData(index, binaryPropertyName);
			body = await this.helpers.getBinaryDataBuffer(index, binaryPropertyName);
		} else {
			// Handle text content upload
			body = Buffer.from(this.getNodeParameter('fileContent', index) as string, 'utf8');
		}

		// Create request options for the upload
		const uploadOptions = {
			url: presignedUrl,
			method: 'PUT' as const,
			body,
			headers: {
				'Content-Type': 'application/octet-stream',
			},
			skipSslCertificateValidation: true,
		};

		// Upload the file
		await this.helpers.request(uploadOptions);

		// Step 3: Return the final URL
		return this.helpers.returnJsonArray({ url: finalUrl });
	}
}