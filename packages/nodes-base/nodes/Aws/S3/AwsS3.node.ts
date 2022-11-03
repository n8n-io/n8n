import { paramCase, snakeCase } from 'change-case';

import { createHash } from 'crypto';

import { Builder } from 'xml2js';

import { IExecuteFunctions } from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeOperationError,
} from 'n8n-workflow';

import { bucketFields, bucketOperations } from './BucketDescription';

import { folderFields, folderOperations } from './FolderDescription';

import { fileFields, fileOperations } from './FileDescription';

import {
	awsApiRequestREST,
	awsApiRequestSOAP,
	awsApiRequestSOAPAllItems,
} from './GenericFunctions';

export class AwsS3 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS S3',
		name: 'awsS3',
		icon: 'file:s3.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to AWS S3',
		defaults: {
			name: 'AWS S3',
		},
		inputs: ['main'],
		outputs: ['main'],
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < items.length; i++) {
			const headers: IDataObject = {};
			try {
				if (resource === 'bucket') {
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucket.html
					if (operation === 'create') {
						const credentials = await this.getCredentials('aws');
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
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
						responseData = await awsApiRequestSOAP.call(
							this,
							`${name}.s3`,
							'PUT',
							'',
							data,
							qs,
							headers,
						);

						returnData.push({ success: true });
					}

					// https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucket.html
					if (operation === 'delete') {
						const name = this.getNodeParameter('name', i) as string;

						responseData = await awsApiRequestSOAP.call(
							this,
							`${name}.s3`,
							'DELETE',
							'',
							'',
							{},
							headers,
						);
						returnData.push({ success: true });
					}

					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBuckets.html
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						if (returnAll) {
							responseData = await awsApiRequestSOAPAllItems.call(
								this,
								'ListAllMyBucketsResult.Buckets.Bucket',
								's3',
								'GET',
								'',
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0) as number;
							responseData = await awsApiRequestSOAPAllItems.call(
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
						returnData.push.apply(returnData, responseData);
					}

					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
					if (operation === 'search') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;

						if (additionalFields.prefix) {
							qs['prefix'] = additionalFields.prefix as string;
						}

						if (additionalFields.encodingType) {
							qs['encoding-type'] = additionalFields.encodingType as string;
						}

						if (additionalFields.delmiter) {
							qs['delimiter'] = additionalFields.delmiter as string;
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

						responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
							location: '',
						});

						const region = responseData.LocationConstraint._ as string;

						if (returnAll) {
							responseData = await awsApiRequestSOAPAllItems.call(
								this,
								'ListBucketResult.Contents',
								`${bucketName}.s3`,
								'GET',
								'',
								'',
								qs,
								{},
								{},
								region,
							);
						} else {
							qs['max-keys'] = this.getNodeParameter('limit', 0) as number;
							responseData = await awsApiRequestSOAP.call(
								this,
								`${bucketName}.s3`,
								'GET',
								'',
								'',
								qs,
								{},
								{},
								region,
							);
							responseData = responseData.ListBucketResult.Contents;
						}
						if (Array.isArray(responseData)) {
							returnData.push.apply(returnData, responseData);
						} else {
							returnData.push(responseData);
						}
					}
				}
				if (resource === 'folder') {
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
					if (operation === 'create') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const folderName = this.getNodeParameter('folderName', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						let path = `/${folderName}/`;

						if (additionalFields.requesterPays) {
							headers['x-amz-request-payer'] = 'requester';
						}
						if (additionalFields.parentFolderKey) {
							path = `/${additionalFields.parentFolderKey}${folderName}/`;
						}
						if (additionalFields.storageClass) {
							headers['x-amz-storage-class'] = snakeCase(
								additionalFields.storageClass as string,
							).toUpperCase();
						}
						responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						responseData = await awsApiRequestSOAP.call(
							this,
							`${bucketName}.s3`,
							'PUT',
							path,
							'',
							qs,
							headers,
							{},
							region,
						);
						returnData.push({ success: true });
					}
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
					if (operation === 'delete') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const folderKey = this.getNodeParameter('folderKey', i) as string;

						responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						responseData = await awsApiRequestSOAPAllItems.call(
							this,
							'ListBucketResult.Contents',
							`${bucketName}.s3`,
							'GET',
							'/',
							'',
							{ 'list-type': 2, prefix: folderKey },
							{},
							{},
							region,
						);

						// folder empty then just delete it
						if (responseData.length === 0) {
							responseData = await awsApiRequestSOAP.call(
								this,
								`${bucketName}.s3`,
								'DELETE',
								`/${folderKey}`,
								'',
								qs,
								{},
								{},
								region,
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

							responseData = await awsApiRequestSOAP.call(
								this,
								`${bucketName}.s3`,
								'POST',
								'/',
								data,
								{ delete: '' },
								headers,
								{},
								region,
							);

							responseData = { deleted: responseData.DeleteResult.Deleted };
						}
						returnData.push(responseData);
					}
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
					if (operation === 'getAll') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const options = this.getNodeParameter('options', 0) as IDataObject;

						if (options.folderKey) {
							qs['prefix'] = options.folderKey as string;
						}

						if (options.fetchOwner) {
							qs['fetch-owner'] = options.fetchOwner as string;
						}

						qs['list-type'] = 2;

						responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						if (returnAll) {
							responseData = await awsApiRequestSOAPAllItems.call(
								this,
								'ListBucketResult.Contents',
								`${bucketName}.s3`,
								'GET',
								'',
								'',
								qs,
								{},
								{},
								region,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0) as number;
							responseData = await awsApiRequestSOAPAllItems.call(
								this,
								'ListBucketResult.Contents',
								`${bucketName}.s3`,
								'GET',
								'',
								'',
								qs,
								{},
								{},
								region,
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
							returnData.push.apply(returnData, responseData);
						}
					}
				}
				if (resource === 'file') {
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html
					if (operation === 'copy') {
						const sourcePath = this.getNodeParameter('sourcePath', i) as string;
						const destinationPath = this.getNodeParameter('destinationPath', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

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

						const destination = `/${destinationParts.slice(2, destinationParts.length).join('/')}`;

						responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						responseData = await awsApiRequestSOAP.call(
							this,
							`${bucketName}.s3`,
							'PUT',
							destination,
							'',
							qs,
							headers,
							{},
							region,
						);
						returnData.push(responseData.CopyObjectResult);
					}
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
					if (operation === 'download') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;

						const fileKey = this.getNodeParameter('fileKey', i) as string;

						const fileName = fileKey.split('/')[fileKey.split('/').length - 1];

						if (fileKey.substring(fileKey.length - 1) === '/') {
							throw new NodeOperationError(
								this.getNode(),
								'Downloding a whole directory is not yet supported, please provide a file key',
							);
						}

						let region = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
							location: '',
						});

						region = region.LocationConstraint._;

						const response = await awsApiRequestREST.call(
							this,
							`${bucketName}.s3`,
							'GET',
							`/${fileKey}`,
							'',
							qs,
							{},
							{ encoding: null, resolveWithFullResponse: true },
							region,
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

						const dataPropertyNameDownload = this.getNodeParameter(
							'binaryPropertyName',
							i,
						) as string;

						const data = Buffer.from(response.body as string, 'utf8');

						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
							data as unknown as Buffer,
							fileName,
							mimeType,
						);
					}
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html
					if (operation === 'delete') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;

						const fileKey = this.getNodeParameter('fileKey', i) as string;

						const options = this.getNodeParameter('options', i) as IDataObject;

						if (options.versionId) {
							qs.versionId = options.versionId as string;
						}

						responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						responseData = await awsApiRequestSOAP.call(
							this,
							`${bucketName}.s3`,
							'DELETE',
							`/${fileKey}`,
							'',
							qs,
							{},
							{},
							region,
						);

						returnData.push({ success: true });
					}
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
					if (operation === 'getAll') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const options = this.getNodeParameter('options', 0) as IDataObject;

						if (options.folderKey) {
							qs['prefix'] = options.folderKey as string;
						}

						if (options.fetchOwner) {
							qs['fetch-owner'] = options.fetchOwner as string;
						}

						qs['delimiter'] = '/';

						qs['list-type'] = 2;

						responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						if (returnAll) {
							responseData = await awsApiRequestSOAPAllItems.call(
								this,
								'ListBucketResult.Contents',
								`${bucketName}.s3`,
								'GET',
								'',
								'',
								qs,
								{},
								{},
								region,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0) as number;
							responseData = await awsApiRequestSOAPAllItems.call(
								this,
								'ListBucketResult.Contents',
								`${bucketName}.s3`,
								'GET',
								'',
								'',
								qs,
								{},
								{},
								region,
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
							returnData.push.apply(returnData, responseData);
						}
					}
					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
					if (operation === 'upload') {
						const bucketName = this.getNodeParameter('bucketName', i) as string;
						const fileName = this.getNodeParameter('fileName', i) as string;
						const isBinaryData = this.getNodeParameter('binaryData', i) as boolean;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const tagsValues = (this.getNodeParameter('tagsUi', i) as IDataObject)
							.tagsValues as IDataObject[];
						let path = '/';
						let body;

						if (additionalFields.requesterPays) {
							headers['x-amz-request-payer'] = 'requester';
						}
						if (additionalFields.parentFolderKey) {
							path = `/${additionalFields.parentFolderKey}/`;
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
						if (tagsValues) {
							const tags: string[] = [];
							tagsValues.forEach((o: IDataObject) => {
								tags.push(`${o.key}=${o.value}`);
							});
							headers['x-amz-tagging'] = tags.join('&');
						}

						responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
							location: '',
						});

						const region = responseData.LocationConstraint._;

						if (isBinaryData) {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0) as string;

							if (items[i].binary === undefined) {
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
									itemIndex: i,
								});
							}

							if ((items[i].binary as IBinaryKeyData)[binaryPropertyName] === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`No binary data property "${binaryPropertyName}" does not exists on item!`,
									{ itemIndex: i },
								);
							}

							const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];
							const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
								i,
								binaryPropertyName,
							);

							body = binaryDataBuffer;

							headers['Content-Type'] = binaryData.mimeType;

							headers['Content-MD5'] = createHash('md5').update(body).digest('base64');

							responseData = await awsApiRequestSOAP.call(
								this,
								`${bucketName}.s3`,
								'PUT',
								`${path}${fileName || binaryData.fileName}`,
								body,
								qs,
								headers,
								{},
								region,
							);
						} else {
							const fileContent = this.getNodeParameter('fileContent', i) as string;

							body = Buffer.from(fileContent, 'utf8');

							headers['Content-Type'] = 'text/html';

							headers['Content-MD5'] = createHash('md5').update(fileContent).digest('base64');

							responseData = await awsApiRequestSOAP.call(
								this,
								`${bucketName}.s3`,
								'PUT',
								`${path}${fileName}`,
								body,
								qs,
								headers,
								{},
								region,
							);
						}
						returnData.push({ success: true });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as JsonObject).message });
					continue;
				}
				throw error;
			}
		}
		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
