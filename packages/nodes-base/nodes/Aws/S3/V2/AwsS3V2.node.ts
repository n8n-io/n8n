import { paramCase, snakeCase } from 'change-case';
import { createHash } from 'crypto';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type { Readable } from 'stream';
import { Builder } from 'xml2js';

import { bucketFields, bucketOperations } from './BucketDescription';
import { fileFields, fileOperations } from './FileDescription';
import { folderFields, folderOperations } from './FolderDescription';
import { awsApiRequestREST, awsApiRequestRESTAllItems } from './GenericFunctions';

// Minimum size 5MB for multipart upload in S3
const UPLOAD_CHUNK_SIZE = 5120 * 1024;

export class AwsS3V2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			displayName: 'AWS S3',
			name: 'awsS3',
			icon: 'file:s3.svg',
			group: ['output'],
			version: 2,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Sends data to AWS S3',
			defaults: {
				name: 'AWS S3',
			},
			usableAsTool: true,
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'aws',
					required: true,
				},
			],
			properties: [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Bucket',
							value: 'bucket',
						},
						{
							name: 'File',
							value: 'file',
						},
						{
							name: 'Folder',
							value: 'folder',
						},
					],
					default: 'file',
				},
				// BUCKET
				...bucketOperations,
				...bucketFields,
				// FOLDER
				...folderOperations,
				...folderFields,
				// UPLOAD
				...fileOperations,
				...fileFields,
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < items.length; i++) {
			let headers: IDataObject = {};
			try {
				if (resource === 'bucket') {
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucket.html
					if (operation === 'create') {
						const credentials = await this.getCredentials('aws');
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						if (additionalFields.acl) {
							headers['x-amz-acl'] = paramCase(additionalFields.acl as string);
						}
						if (additionalFields.bucketObjectLockEnabled) {
							headers['x-amz-bucket-object-lock-enabled'] =
								additionalFields.bucketObjectLockEnabled as boolean;
						}
						if (additionalFields.grantFullControl) {
							headers['x-amz-grant-full-control'] = '';
						}
						if (additionalFields.grantRead) {
							headers['x-amz-grant-read'] = '';
						}
						if (additionalFields.grantReadAcp) {
							headers['x-amz-grant-read-acp'] = '';
						}
						if (additionalFields.grantWrite) {
							headers['x-amz-grant-write'] = '';
						}
						if (additionalFields.grantWriteAcp) {
							headers['x-amz-grant-write-acp'] = '';
						}
						let region = credentials.region as string;

						if (additionalFields.region) {
							region = additionalFields.region as string;
						}

						const body: IDataObject = {
							CreateBucketConfiguration: {
								$: {
									xmlns: 'http://s3.amazonaws.com/doc/2006-03-01/',
								},
							},
						};
						let data = '';
						// if credentials has the S3 defaul region (us-east-1) the body (XML) does not have to be sent.
						if (region !== 'us-east-1') {
							// @ts-ignore
							body.CreateBucketConfiguration.LocationConstraint = [region];
							const builder = new Builder();
							data = builder.buildObject(body);
						}
						responseData = await awsApiRequestREST.call(
							this,
							`${name}.s3`,
							'PUT',
							'',
							data,
							qs,
							headers,
						);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ success: true }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}

					// https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucket.html
					if (operation === 'delete') {
						const name = this.getNodeParameter('name', i) as string;

						responseData = await awsApiRequestREST.call(
							this,
							`${name}.s3`,
							'DELETE',
							'',
							'',
							{},
							headers,
						);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ success: true }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}

					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBuckets.html
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', 0);
						if (returnAll) {
							responseData = await awsApiRequestRESTAllItems.call(
								this,
								'ListAllMyBucketsResult.Buckets.Bucket',
								's3',
								'GET',
								'',
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await awsApiRequestRESTAllItems.call(
								this,
								'ListAllMyBucketsResult.Buckets.Bucket',
								's3',
								'GET',
								'',
								'',
								qs,
							);
							responseData = responseData.slice(0, qs.limit);
						}
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}

					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
					if (operation === 'search') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const servicePath = bucketName.includes('.') ? 's3' : `${bucketName}.s3`;
						const basePath = bucketName.includes('.') ? `/${bucketName}` : '';
						const returnAll = this.getNodeParameter('returnAll', 0);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.prefix) {
							qs.prefix = additionalFields.prefix as string;
						}

						if (additionalFields.encodingType) {
							qs['encoding-type'] = additionalFields.encodingType as string;
						}

						if (additionalFields.delimiter) {
							qs.delimiter = additionalFields.delimiter as string;
						}

						if (additionalFields.fetchOwner) {
							qs['fetch-owner'] = additionalFields.fetchOwner as string;
						}

						if (additionalFields.startAfter) {
							qs['start-after'] = additionalFields.startAfter as string;
						}

						if (additionalFields.requesterPays) {
							qs['x-amz-request-payer'] = 'requester';
						}

						qs['list-type'] = 2;
						responseData = await awsApiRequestREST.call(this, servicePath, 'GET', basePath, '', {
							location: '',
						});

						const region = responseData.LocationConstraint._ as string;

						if (returnAll) {
							responseData = await awsApiRequestRESTAllItems.call(
								this,
								'ListBucketResult.Contents',
								servicePath,
								'GET',
								basePath,
								'',
								qs,
								{},
								{},
								region,
							);
						} else {
							qs['max-keys'] = this.getNodeParameter('limit', 0);
							responseData = await awsApiRequestREST.call(
								this,
								servicePath,
								'GET',
								basePath,
								'',
								qs,
								{},
								{},
								region,
							);
							responseData = responseData.ListBucketResult.Contents;
						}
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
				}
				if (resource === 'folder') {
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
					if (operation === 'create') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const servicePath = bucketName.includes('.') ? 's3' : `${bucketName}.s3`;
						const basePath = bucketName.includes('.') ? `/${bucketName}` : '';
						const folderName = this.getNodeParameter('folderName', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						let path = `${basePath}/${folderName}/`;

						if (additionalFields.requesterPays) {
							headers['x-amz-request-payer'] = 'requester';
						}
						if (additionalFields.parentFolderKey) {
							path = `${basePath}/${additionalFields.parentFolderKey}/${folderName}/`;
						}
						if (additionalFields.storageClass) {
							headers['x-amz-storage-class'] = snakeCase(
								additionalFields.storageClass as string,
							).toUpperCase();
						}
						responseData = await awsApiRequestREST.call(this, servicePath, 'GET', basePath, '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						responseData = await awsApiRequestREST.call(
							this,
							servicePath,
							'PUT',
							path,
							'',
							qs,
							headers,
							{},
							region as string,
						);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ success: true }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
					if (operation === 'delete') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const servicePath = bucketName.includes('.') ? 's3' : `${bucketName}.s3`;
						const basePath = bucketName.includes('.') ? `/${bucketName}` : '';
						const folderKey = this.getNodeParameter('folderKey', i) as string;

						responseData = await awsApiRequestREST.call(this, servicePath, 'GET', basePath, '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						responseData = await awsApiRequestRESTAllItems.call(
							this,
							'ListBucketResult.Contents',
							servicePath,
							'GET',
							basePath,
							'',
							{ 'list-type': 2, prefix: folderKey },
							{},
							{},
							region as string,
						);

						// folder empty then just delete it
						if (responseData.length === 0) {
							responseData = await awsApiRequestREST.call(
								this,
								servicePath,
								'DELETE',
								`${basePath}/${folderKey}`,
								'',
								qs,
								{},
								{},
								region as string,
							);

							responseData = { deleted: [{ Key: folderKey }] };
						} else {
							// delete everything inside the folder
							const body: IDataObject = {
								Delete: {
									$: {
										xmlns: 'http://s3.amazonaws.com/doc/2006-03-01/',
									},
									Object: [],
								},
							};

							for (const childObject of responseData) {
								//@ts-ignore
								(body.Delete.Object as IDataObject[]).push({
									Key: childObject.Key as string,
								});
							}

							const builder = new Builder();
							const data = builder.buildObject(body);

							headers['Content-MD5'] = createHash('md5').update(data).digest('base64');

							headers['Content-Type'] = 'application/xml';

							responseData = await awsApiRequestREST.call(
								this,
								servicePath,
								'POST',
								`${basePath}/`,
								data,
								{ delete: '' },
								headers,
								{},
								region as string,
							);

							responseData = { deleted: responseData.DeleteResult.Deleted };
						}
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
					if (operation === 'getAll') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const servicePath = bucketName.includes('.') ? 's3' : `${bucketName}.s3`;
						const basePath = bucketName.includes('.') ? `/${bucketName}` : '';
						const returnAll = this.getNodeParameter('returnAll', 0);
						const options = this.getNodeParameter('options', 0);

						if (options.folderKey) {
							qs.prefix = options.folderKey as string;
						}

						if (options.fetchOwner) {
							qs['fetch-owner'] = options.fetchOwner as string;
						}

						qs['list-type'] = 2;

						responseData = await awsApiRequestREST.call(this, servicePath, 'GET', basePath, '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						if (returnAll) {
							responseData = await awsApiRequestRESTAllItems.call(
								this,
								'ListBucketResult.Contents',
								servicePath,
								'GET',
								basePath,
								'',
								qs,
								{},
								{},
								region as string,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await awsApiRequestRESTAllItems.call(
								this,
								'ListBucketResult.Contents',
								servicePath,
								'GET',
								basePath,
								'',
								qs,
								{},
								{},
								region as string,
							);
						}
						if (Array.isArray(responseData)) {
							responseData = responseData.filter(
								(e: IDataObject) =>
									(e.Key as string).endsWith('/') && e.Size === '0' && e.Key !== options.folderKey,
							);
							if (qs.limit) {
								responseData = responseData.splice(0, qs.limit as number);
							}
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData),
								{ itemData: { item: i } },
							);
							returnData.push(...executionData);
						}
					}
				}
				if (resource === 'file') {
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html
					if (operation === 'copy') {
						const sourcePath = this.getNodeParameter('sourcePath', i) as string;
						const destinationPath = this.getNodeParameter('destinationPath', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						headers['x-amz-copy-source'] = sourcePath;

						if (additionalFields.requesterPays) {
							headers['x-amz-request-payer'] = 'requester';
						}
						if (additionalFields.storageClass) {
							headers['x-amz-storage-class'] = snakeCase(
								additionalFields.storageClass as string,
							).toUpperCase();
						}
						if (additionalFields.acl) {
							headers['x-amz-acl'] = paramCase(additionalFields.acl as string);
						}
						if (additionalFields.grantFullControl) {
							headers['x-amz-grant-full-control'] = '';
						}
						if (additionalFields.grantRead) {
							headers['x-amz-grant-read'] = '';
						}
						if (additionalFields.grantReadAcp) {
							headers['x-amz-grant-read-acp'] = '';
						}
						if (additionalFields.grantWriteAcp) {
							headers['x-amz-grant-write-acp'] = '';
						}
						if (additionalFields.lockLegalHold) {
							headers['x-amz-object-lock-legal-hold'] = (additionalFields.lockLegalHold as boolean)
								? 'ON'
								: 'OFF';
						}
						if (additionalFields.lockMode) {
							headers['x-amz-object-lock-mode'] = (
								additionalFields.lockMode as string
							).toUpperCase();
						}
						if (additionalFields.lockRetainUntilDate) {
							headers['x-amz-object-lock-retain-until-date'] =
								additionalFields.lockRetainUntilDate as string;
						}
						if (additionalFields.serverSideEncryption) {
							headers['x-amz-server-side-encryption'] =
								additionalFields.serverSideEncryption as string;
						}
						if (additionalFields.encryptionAwsKmsKeyId) {
							headers['x-amz-server-side-encryption-aws-kms-key-id'] =
								additionalFields.encryptionAwsKmsKeyId as string;
						}
						if (additionalFields.serverSideEncryptionContext) {
							headers['x-amz-server-side-encryption-context'] =
								additionalFields.serverSideEncryptionContext as string;
						}
						if (additionalFields.serversideEncryptionCustomerAlgorithm) {
							headers['x-amz-server-side-encryption-customer-algorithm'] =
								additionalFields.serversideEncryptionCustomerAlgorithm as string;
						}
						if (additionalFields.serversideEncryptionCustomerKey) {
							headers['x-amz-server-side-encryption-customer-key'] =
								additionalFields.serversideEncryptionCustomerKey as string;
						}
						if (additionalFields.serversideEncryptionCustomerKeyMD5) {
							headers['x-amz-server-side-encryption-customer-key-MD5'] =
								additionalFields.serversideEncryptionCustomerKeyMD5 as string;
						}
						if (additionalFields.taggingDirective) {
							headers['x-amz-tagging-directive'] = (
								additionalFields.taggingDirective as string
							).toUpperCase();
						}
						if (additionalFields.metadataDirective) {
							headers['x-amz-metadata-directive'] = (
								additionalFields.metadataDirective as string
							).toUpperCase();
						}

						const destinationParts = destinationPath.split('/');

						const bucketName = destinationParts[1];
						const servicePath = bucketName.includes('.') ? 's3' : `${bucketName}.s3`;
						const basePath = bucketName.includes('.') ? `/${bucketName}` : '';

						const destination = `${basePath}/${destinationParts
							.slice(2, destinationParts.length)
							.join('/')}`;

						responseData = await awsApiRequestREST.call(this, servicePath, 'GET', basePath, '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						responseData = await awsApiRequestREST.call(
							this,
							servicePath,
							'PUT',
							destination,
							'',
							qs,
							headers,
							{},
							region as string,
						);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData.CopyObjectResult as IDataObject[]),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
					if (operation === 'download') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const servicePath = bucketName.includes('.') ? 's3' : `${bucketName}.s3`;
						const basePath = bucketName.includes('.') ? `/${bucketName}` : '';

						const fileKey = this.getNodeParameter('fileKey', i) as string;

						const fileName = fileKey.split('/')[fileKey.split('/').length - 1];

						if (fileKey.substring(fileKey.length - 1) === '/') {
							throw new NodeOperationError(
								this.getNode(),
								'Downloading a whole directory is not yet supported, please provide a file key',
							);
						}

						let region = await awsApiRequestREST.call(this, servicePath, 'GET', basePath, '', {
							location: '',
						});

						region = region.LocationConstraint._;

						const response = await awsApiRequestREST.call(
							this,
							servicePath,
							'GET',
							`${basePath}/${fileKey}`,
							'',
							qs,
							{},
							{ encoding: null, resolveWithFullResponse: true },
							region as string,
						);

						let mimeType: string | undefined;
						if (response.headers['content-type']) {
							mimeType = response.headers['content-type'];
						}

						const newItem: INodeExecutionData = {
							json: items[i].json,
							binary: {},
						};

						if (items[i].binary !== undefined && newItem.binary) {
							// Create a shallow copy of the binary data so that the old
							// data references which do not get changed still stay behind
							// but the incoming data does not get changed.
							Object.assign(newItem.binary, items[i].binary);
						}

						items[i] = newItem;

						const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i);

						const data = Buffer.from(response.body as string, 'utf8');

						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
							data as unknown as Buffer,
							fileName,
							mimeType,
						);

						returnData.push(items[i]);
					}
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html
					if (operation === 'delete') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const servicePath = bucketName.includes('.') ? 's3' : `${bucketName}.s3`;
						const basePath = bucketName.includes('.') ? `/${bucketName}` : '';

						const fileKey = this.getNodeParameter('fileKey', i) as string;

						const options = this.getNodeParameter('options', i);

						if (options.versionId) {
							qs.versionId = options.versionId as string;
						}

						responseData = await awsApiRequestREST.call(this, servicePath, 'GET', basePath, '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						responseData = await awsApiRequestREST.call(
							this,
							servicePath,
							'DELETE',
							`${basePath}/${fileKey}`,
							'',
							qs,
							{},
							{},
							region as string,
						);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ success: true }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
					if (operation === 'getAll') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const servicePath = bucketName.includes('.') ? 's3' : `${bucketName}.s3`;
						const basePath = bucketName.includes('.') ? `/${bucketName}` : '';
						const returnAll = this.getNodeParameter('returnAll', 0);
						const options = this.getNodeParameter('options', 0);

						if (options.folderKey) {
							qs.prefix = options.folderKey as string;
						}

						if (options.fetchOwner) {
							qs['fetch-owner'] = options.fetchOwner as string;
						}

						qs.delimiter = '/';

						qs['list-type'] = 2;

						responseData = await awsApiRequestREST.call(this, servicePath, 'GET', basePath, '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						if (returnAll) {
							responseData = await awsApiRequestRESTAllItems.call(
								this,
								'ListBucketResult.Contents',
								servicePath,
								'GET',
								basePath,
								'',
								qs,
								{},
								{},
								region as string,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await awsApiRequestRESTAllItems.call(
								this,
								'ListBucketResult.Contents',
								servicePath,
								'GET',
								basePath,
								'',
								qs,
								{},
								{},
								region as string,
							);
							responseData = responseData.splice(0, qs.limit);
						}
						if (Array.isArray(responseData)) {
							responseData = responseData.filter(
								(e: IDataObject) => !(e.Key as string).endsWith('/') && e.Size !== '0',
							);
							if (qs.limit) {
								responseData = responseData.splice(0, qs.limit as number);
							}
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData),
								{ itemData: { item: i } },
							);
							returnData.push(...executionData);
						}
					}
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
					if (operation === 'upload') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const servicePath = bucketName.includes('.') ? 's3' : `${bucketName}.s3`;
						const basePath = bucketName.includes('.') ? `/${bucketName}` : '';
						const fileName = this.getNodeParameter('fileName', i) as string;
						const isBinaryData = this.getNodeParameter('binaryData', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const tagsValues = (this.getNodeParameter('tagsUi', i) as IDataObject)
							.tagsValues as IDataObject[];
						let path = `${basePath}/${fileName}`;
						let body;

						const multipartHeaders: IDataObject = {};
						const neededHeaders: IDataObject = {};

						if (additionalFields.requesterPays) {
							neededHeaders['x-amz-request-payer'] = 'requester';
						}
						if (additionalFields.parentFolderKey) {
							path = `${basePath}/${additionalFields.parentFolderKey}/${fileName}`;
						}
						if (additionalFields.storageClass) {
							multipartHeaders['x-amz-storage-class'] = snakeCase(
								additionalFields.storageClass as string,
							).toUpperCase();
						}

						if (additionalFields.acl) {
							multipartHeaders['x-amz-acl'] = paramCase(additionalFields.acl as string);
						}
						if (additionalFields.grantFullControl) {
							multipartHeaders['x-amz-grant-full-control'] = '';
						}
						if (additionalFields.grantRead) {
							multipartHeaders['x-amz-grant-read'] = '';
						}
						if (additionalFields.grantReadAcp) {
							multipartHeaders['x-amz-grant-read-acp'] = '';
						}
						if (additionalFields.grantWriteAcp) {
							multipartHeaders['x-amz-grant-write-acp'] = '';
						}
						if (additionalFields.lockLegalHold) {
							multipartHeaders['x-amz-object-lock-legal-hold'] =
								(additionalFields.lockLegalHold as boolean) ? 'ON' : 'OFF';
						}
						if (additionalFields.lockMode) {
							multipartHeaders['x-amz-object-lock-mode'] = (
								additionalFields.lockMode as string
							).toUpperCase();
						}
						if (additionalFields.lockRetainUntilDate) {
							multipartHeaders['x-amz-object-lock-retain-until-date'] =
								additionalFields.lockRetainUntilDate as string;
						}
						if (additionalFields.serverSideEncryption) {
							neededHeaders['x-amz-server-side-encryption'] =
								additionalFields.serverSideEncryption as string;
						}
						if (additionalFields.encryptionAwsKmsKeyId) {
							neededHeaders['x-amz-server-side-encryption-aws-kms-key-id'] =
								additionalFields.encryptionAwsKmsKeyId as string;
						}
						if (additionalFields.serverSideEncryptionContext) {
							neededHeaders['x-amz-server-side-encryption-context'] =
								additionalFields.serverSideEncryptionContext as string;
						}
						if (additionalFields.serversideEncryptionCustomerAlgorithm) {
							neededHeaders['x-amz-server-side-encryption-customer-algorithm'] =
								additionalFields.serversideEncryptionCustomerAlgorithm as string;
						}
						if (additionalFields.serversideEncryptionCustomerKey) {
							neededHeaders['x-amz-server-side-encryption-customer-key'] =
								additionalFields.serversideEncryptionCustomerKey as string;
						}
						if (additionalFields.serversideEncryptionCustomerKeyMD5) {
							neededHeaders['x-amz-server-side-encryption-customer-key-MD5'] =
								additionalFields.serversideEncryptionCustomerKeyMD5 as string;
						}
						if (tagsValues) {
							const tags: string[] = [];
							tagsValues.forEach((o: IDataObject) => {
								tags.push(`${o.key}=${o.value}`);
							});
							multipartHeaders['x-amz-tagging'] = tags.join('&');
						}
						// Get the region of the bucket
						responseData = await awsApiRequestREST.call(this, servicePath, 'GET', basePath, '', {
							location: '',
						});
						const region = responseData.LocationConstraint._;

						if (isBinaryData) {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
							const binaryPropertyData = this.helpers.assertBinaryData(i, binaryPropertyName);
							let uploadData: Buffer | Readable;
							multipartHeaders['Content-Type'] = binaryPropertyData.mimeType;
							if (binaryPropertyData.id) {
								uploadData = await this.helpers.getBinaryStream(
									binaryPropertyData.id,
									UPLOAD_CHUNK_SIZE,
								);
								const createMultiPartUpload = await awsApiRequestREST.call(
									this,
									servicePath,
									'POST',
									`${path}?uploads`,
									body,
									qs,
									{ ...neededHeaders, ...multipartHeaders },
									{},
									region as string,
								);

								const uploadId = createMultiPartUpload.InitiateMultipartUploadResult.UploadId;
								let part = 1;
								for await (const chunk of uploadData) {
									const chunkBuffer = await this.helpers.binaryToBuffer(chunk as Readable);
									const listHeaders: IDataObject = {
										'Content-Length': chunk.length,
										'Content-MD5': createHash('MD5').update(chunkBuffer).digest('base64'),
										...neededHeaders,
									};
									try {
										await awsApiRequestREST.call(
											this,
											servicePath,
											'PUT',
											`${path}?partNumber=${part}&uploadId=${uploadId}`,
											chunk,
											qs,
											listHeaders,
											{},
											region as string,
										);
										part++;
									} catch (error) {
										try {
											await awsApiRequestREST.call(
												this,
												servicePath,
												'DELETE',
												`${path}?uploadId=${uploadId}`,
											);
										} catch (err) {
											throw new NodeOperationError(this.getNode(), err as Error);
										}
										if (error.response?.status !== 308) throw error;
									}
								}

								const listParts = (await awsApiRequestREST.call(
									this,
									servicePath,
									'GET',
									`${path}?max-parts=${900}&part-number-marker=0&uploadId=${uploadId}`,
									'',
									qs,
									{ ...neededHeaders },
									{},
									region as string,
								)) as {
									ListPartsResult: {
										Part:
											| Array<{
													ETag: string;
													PartNumber: number;
											  }>
											| {
													ETag: string;
													PartNumber: number;
											  };
									};
								};
								if (!Array.isArray(listParts.ListPartsResult.Part)) {
									body = {
										CompleteMultipartUpload: {
											$: {
												xmlns: 'http://s3.amazonaws.com/doc/2006-03-01/',
											},
											Part: {
												ETag: listParts.ListPartsResult.Part.ETag,
												PartNumber: listParts.ListPartsResult.Part.PartNumber,
											},
										},
									};
								} else {
									body = {
										CompleteMultipartUpload: {
											$: {
												xmlns: 'http://s3.amazonaws.com/doc/2006-03-01/',
											},
											Part: listParts.ListPartsResult.Part.map((Part) => {
												return {
													ETag: Part.ETag,
													PartNumber: Part.PartNumber,
												};
											}),
										},
									};
								}
								const builder = new Builder();
								const data = builder.buildObject(body);
								const completeUpload = (await awsApiRequestREST.call(
									this,
									servicePath,
									'POST',
									`${path}?uploadId=${uploadId}`,
									data,
									qs,
									{
										...neededHeaders,
										'Content-MD5': createHash('md5').update(data).digest('base64'),
										'Content-Type': 'application/xml',
									},
									{},
									region as string,
								)) as {
									CompleteMultipartUploadResult: {
										Location: string;
										Bucket: string;
										Key: string;
										ETag: string;
									};
								};
								responseData = {
									...completeUpload.CompleteMultipartUploadResult,
								};
							} else {
								const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
									i,
									binaryPropertyName,
								);

								body = binaryDataBuffer;
								headers = { ...neededHeaders, ...multipartHeaders };
								headers['Content-Type'] = binaryPropertyData.mimeType;

								headers['Content-MD5'] = createHash('md5').update(body).digest('base64');

								responseData = await awsApiRequestREST.call(
									this,
									servicePath,
									'PUT',
									path,
									body,
									qs,
									headers,
									{},
									region as string,
								);
							}
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData ?? { success: true }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionData);
						} else {
							const fileContent = this.getNodeParameter('fileContent', i) as string;

							body = Buffer.from(fileContent, 'utf8');

							headers = { ...neededHeaders, ...multipartHeaders };

							headers['Content-Type'] = 'text/html';

							headers['Content-MD5'] = createHash('md5').update(fileContent).digest('base64');

							responseData = await awsApiRequestREST.call(
								this,
								servicePath,
								'PUT',
								path,
								body,
								qs,
								{ ...headers },
								{},
								region as string,
							);
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ success: true }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionData);
						}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				} else {
					throw error;
				}
			}
		}
		return [returnData];
	}
}
