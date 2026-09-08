import { kebabCase, snakeCase } from 'change-case';
import { createHash } from 'crypto';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { Builder } from 'xml2js';
import { bucketFields, bucketOperations } from './BucketDescription';
import { fileFields, fileOperations } from './FileDescription';
import { folderFields, folderOperations } from './FolderDescription';
import { awsApiRequestREST, awsApiRequestSOAP, awsApiRequestSOAPAllItems, } from './GenericFunctions';
export class AwsS3V1 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
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
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < items.length; i++) {
            const headers = {};
            try {
                if (resource === 'bucket') {
                    //https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucket.html
                    if (operation === 'create') {
                        const credentials = await this.getCredentials('aws');
                        const name = this.getNodeParameter('name', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.acl) {
                            headers['x-amz-acl'] = kebabCase(additionalFields.acl);
                        }
                        if (additionalFields.bucketObjectLockEnabled) {
                            headers['x-amz-bucket-object-lock-enabled'] =
                                additionalFields.bucketObjectLockEnabled;
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
                        let region = credentials.region;
                        if (additionalFields.region) {
                            region = additionalFields.region;
                        }
                        const body = {
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
                        responseData = await awsApiRequestSOAP.call(this, `${name}.s3`, 'PUT', '', data, qs, headers);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                        returnData.push(...executionData);
                    }
                    // https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucket.html
                    if (operation === 'delete') {
                        const name = this.getNodeParameter('name', i);
                        responseData = await awsApiRequestSOAP.call(this, `${name}.s3`, 'DELETE', '', '', {}, headers);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                        returnData.push(...executionData);
                    }
                    //https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBuckets.html
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        if (returnAll) {
                            responseData = await awsApiRequestSOAPAllItems.call(this, 'ListAllMyBucketsResult.Buckets.Bucket', 's3', 'GET', '');
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', 0);
                            responseData = await awsApiRequestSOAPAllItems.call(this, 'ListAllMyBucketsResult.Buckets.Bucket', 's3', 'GET', '', '', qs);
                            responseData = responseData.slice(0, qs.limit);
                        }
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
                    }
                    //https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
                    if (operation === 'search') {
                        const bucketName = this.getNodeParameter('bucketName', i);
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const additionalFields = this.getNodeParameter('additionalFields', 0);
                        if (additionalFields.prefix) {
                            qs.prefix = additionalFields.prefix;
                        }
                        if (additionalFields.encodingType) {
                            qs['encoding-type'] = additionalFields.encodingType;
                        }
                        if (additionalFields.delimiter) {
                            qs.delimiter = additionalFields.delimiter;
                        }
                        if (additionalFields.fetchOwner) {
                            qs['fetch-owner'] = additionalFields.fetchOwner;
                        }
                        if (additionalFields.startAfter) {
                            qs['start-after'] = additionalFields.startAfter;
                        }
                        if (additionalFields.requesterPays) {
                            qs['x-amz-request-payer'] = 'requester';
                        }
                        qs['list-type'] = 2;
                        responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
                            location: '',
                        });
                        const region = responseData.LocationConstraint._;
                        if (returnAll) {
                            responseData = await awsApiRequestSOAPAllItems.call(this, 'ListBucketResult.Contents', `${bucketName}.s3`, 'GET', '', '', qs, {}, {}, region);
                        }
                        else {
                            qs['max-keys'] = this.getNodeParameter('limit', 0);
                            responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', qs, {}, {}, region);
                            responseData = responseData.ListBucketResult.Contents;
                        }
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
                    }
                }
                if (resource === 'folder') {
                    //https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
                    if (operation === 'create') {
                        const bucketName = this.getNodeParameter('bucketName', i);
                        const folderName = this.getNodeParameter('folderName', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        let path = `/${folderName}/`;
                        if (additionalFields.requesterPays) {
                            headers['x-amz-request-payer'] = 'requester';
                        }
                        if (additionalFields.parentFolderKey) {
                            path = `/${additionalFields.parentFolderKey}${folderName}/`;
                        }
                        if (additionalFields.storageClass) {
                            headers['x-amz-storage-class'] = snakeCase(additionalFields.storageClass).toUpperCase();
                        }
                        responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
                            location: '',
                        });
                        const region = responseData.LocationConstraint._;
                        responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'PUT', path, '', qs, headers, {}, region);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                        returnData.push(...executionData);
                    }
                    //https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
                    if (operation === 'delete') {
                        const bucketName = this.getNodeParameter('bucketName', i);
                        const folderKey = this.getNodeParameter('folderKey', i);
                        responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
                            location: '',
                        });
                        const region = responseData.LocationConstraint._;
                        responseData = await awsApiRequestSOAPAllItems.call(this, 'ListBucketResult.Contents', `${bucketName}.s3`, 'GET', '/', '', { 'list-type': 2, prefix: folderKey }, {}, {}, region);
                        // folder empty then just delete it
                        if (responseData.length === 0) {
                            responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'DELETE', `/${folderKey}`, '', qs, {}, {}, region);
                            responseData = { deleted: [{ Key: folderKey }] };
                        }
                        else {
                            // delete everything inside the folder
                            const body = {
                                Delete: {
                                    $: {
                                        xmlns: 'http://s3.amazonaws.com/doc/2006-03-01/',
                                    },
                                    Object: [],
                                },
                            };
                            for (const childObject of responseData) {
                                //@ts-ignore
                                body.Delete.Object.push({
                                    Key: childObject.Key,
                                });
                            }
                            const builder = new Builder();
                            const data = builder.buildObject(body);
                            headers['Content-MD5'] = createHash('md5').update(data).digest('base64');
                            headers['Content-Type'] = 'application/xml';
                            responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'POST', '/', data, { delete: '' }, headers, {}, region);
                            responseData = { deleted: responseData.DeleteResult.Deleted };
                        }
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
                    }
                    //https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
                    if (operation === 'getAll') {
                        const bucketName = this.getNodeParameter('bucketName', i);
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const options = this.getNodeParameter('options', 0);
                        if (options.folderKey) {
                            qs.prefix = options.folderKey;
                        }
                        if (options.fetchOwner) {
                            qs['fetch-owner'] = options.fetchOwner;
                        }
                        qs['list-type'] = 2;
                        responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
                            location: '',
                        });
                        const region = responseData.LocationConstraint._;
                        if (returnAll) {
                            responseData = await awsApiRequestSOAPAllItems.call(this, 'ListBucketResult.Contents', `${bucketName}.s3`, 'GET', '', '', qs, {}, {}, region);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', 0);
                            responseData = await awsApiRequestSOAPAllItems.call(this, 'ListBucketResult.Contents', `${bucketName}.s3`, 'GET', '', '', qs, {}, {}, region);
                        }
                        if (Array.isArray(responseData)) {
                            responseData = responseData.filter((e) => e.Key.endsWith('/') && e.Size === '0' && e.Key !== options.folderKey);
                            if (qs.limit) {
                                responseData = responseData.splice(0, qs.limit);
                            }
                            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                            returnData.push(...executionData);
                        }
                    }
                }
                if (resource === 'file') {
                    //https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html
                    if (operation === 'copy') {
                        const sourcePath = this.getNodeParameter('sourcePath', i);
                        const destinationPath = this.getNodeParameter('destinationPath', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        headers['x-amz-copy-source'] = sourcePath;
                        if (additionalFields.requesterPays) {
                            headers['x-amz-request-payer'] = 'requester';
                        }
                        if (additionalFields.storageClass) {
                            headers['x-amz-storage-class'] = snakeCase(additionalFields.storageClass).toUpperCase();
                        }
                        if (additionalFields.acl) {
                            headers['x-amz-acl'] = kebabCase(additionalFields.acl);
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
                            headers['x-amz-object-lock-legal-hold'] = additionalFields.lockLegalHold
                                ? 'ON'
                                : 'OFF';
                        }
                        if (additionalFields.lockMode) {
                            headers['x-amz-object-lock-mode'] = additionalFields.lockMode.toUpperCase();
                        }
                        if (additionalFields.lockRetainUntilDate) {
                            headers['x-amz-object-lock-retain-until-date'] =
                                additionalFields.lockRetainUntilDate;
                        }
                        if (additionalFields.serverSideEncryption) {
                            headers['x-amz-server-side-encryption'] =
                                additionalFields.serverSideEncryption;
                        }
                        if (additionalFields.encryptionAwsKmsKeyId) {
                            headers['x-amz-server-side-encryption-aws-kms-key-id'] =
                                additionalFields.encryptionAwsKmsKeyId;
                        }
                        if (additionalFields.serverSideEncryptionContext) {
                            headers['x-amz-server-side-encryption-context'] =
                                additionalFields.serverSideEncryptionContext;
                        }
                        if (additionalFields.serversideEncryptionCustomerAlgorithm) {
                            headers['x-amz-server-side-encryption-customer-algorithm'] =
                                additionalFields.serversideEncryptionCustomerAlgorithm;
                        }
                        if (additionalFields.serversideEncryptionCustomerKey) {
                            headers['x-amz-server-side-encryption-customer-key'] =
                                additionalFields.serversideEncryptionCustomerKey;
                        }
                        if (additionalFields.serversideEncryptionCustomerKeyMD5) {
                            headers['x-amz-server-side-encryption-customer-key-MD5'] =
                                additionalFields.serversideEncryptionCustomerKeyMD5;
                        }
                        if (additionalFields.taggingDirective) {
                            headers['x-amz-tagging-directive'] = additionalFields.taggingDirective.toUpperCase();
                        }
                        if (additionalFields.metadataDirective) {
                            headers['x-amz-metadata-directive'] = additionalFields.metadataDirective.toUpperCase();
                        }
                        const destinationParts = destinationPath.split('/');
                        const bucketName = destinationParts[1];
                        const destination = `/${destinationParts.slice(2, destinationParts.length).join('/')}`;
                        responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
                            location: '',
                        });
                        const region = responseData.LocationConstraint._;
                        responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'PUT', destination, '', qs, headers, {}, region);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData.CopyObjectResult), { itemData: { item: i } });
                        returnData.push(...executionData);
                    }
                    //https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
                    if (operation === 'download') {
                        const bucketName = this.getNodeParameter('bucketName', i);
                        const fileKey = this.getNodeParameter('fileKey', i);
                        const fileName = fileKey.split('/')[fileKey.split('/').length - 1];
                        if (fileKey.substring(fileKey.length - 1) === '/') {
                            throw new NodeOperationError(this.getNode(), 'Downloading a whole directory is not yet supported, please provide a file key');
                        }
                        let region = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
                            location: '',
                        });
                        region = region.LocationConstraint._;
                        const response = await awsApiRequestREST.call(this, `${bucketName}.s3`, 'GET', `/${fileKey}`, '', qs, {}, { encoding: null, resolveWithFullResponse: true }, region);
                        let mimeType;
                        if (response.headers['content-type']) {
                            mimeType = response.headers['content-type'];
                        }
                        const newItem = {
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
                        const data = Buffer.from(response.body, 'utf8');
                        items[i].binary[dataPropertyNameDownload] = await this.helpers.prepareBinaryData(data, fileName, mimeType);
                    }
                    //https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html
                    if (operation === 'delete') {
                        const bucketName = this.getNodeParameter('bucketName', i);
                        const fileKey = this.getNodeParameter('fileKey', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.versionId) {
                            qs.versionId = options.versionId;
                        }
                        responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
                            location: '',
                        });
                        const region = responseData.LocationConstraint._;
                        responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'DELETE', `/${fileKey}`, '', qs, {}, {}, region);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                        returnData.push(...executionData);
                    }
                    //https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
                    if (operation === 'getAll') {
                        const bucketName = this.getNodeParameter('bucketName', i);
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const options = this.getNodeParameter('options', 0);
                        if (options.folderKey) {
                            qs.prefix = options.folderKey;
                        }
                        if (options.fetchOwner) {
                            qs['fetch-owner'] = options.fetchOwner;
                        }
                        qs.delimiter = '/';
                        qs['list-type'] = 2;
                        responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
                            location: '',
                        });
                        const region = responseData.LocationConstraint._;
                        if (returnAll) {
                            responseData = await awsApiRequestSOAPAllItems.call(this, 'ListBucketResult.Contents', `${bucketName}.s3`, 'GET', '', '', qs, {}, {}, region);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', 0);
                            responseData = await awsApiRequestSOAPAllItems.call(this, 'ListBucketResult.Contents', `${bucketName}.s3`, 'GET', '', '', qs, {}, {}, region);
                            responseData = responseData.splice(0, qs.limit);
                        }
                        if (Array.isArray(responseData)) {
                            responseData = responseData.filter((e) => !e.Key.endsWith('/') && e.Size !== '0');
                            if (qs.limit) {
                                responseData = responseData.splice(0, qs.limit);
                            }
                            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                            returnData.push(...executionData);
                        }
                    }
                    //https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
                    if (operation === 'upload') {
                        const bucketName = this.getNodeParameter('bucketName', i);
                        const fileName = this.getNodeParameter('fileName', i);
                        const isBinaryData = this.getNodeParameter('binaryData', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const tagsValues = this.getNodeParameter('tagsUi', i)
                            .tagsValues;
                        let path = '/';
                        let body;
                        if (additionalFields.requesterPays) {
                            headers['x-amz-request-payer'] = 'requester';
                        }
                        if (additionalFields.parentFolderKey) {
                            path = `/${additionalFields.parentFolderKey}/`;
                        }
                        if (additionalFields.storageClass) {
                            headers['x-amz-storage-class'] = snakeCase(additionalFields.storageClass).toUpperCase();
                        }
                        if (additionalFields.acl) {
                            headers['x-amz-acl'] = kebabCase(additionalFields.acl);
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
                            headers['x-amz-object-lock-legal-hold'] = additionalFields.lockLegalHold
                                ? 'ON'
                                : 'OFF';
                        }
                        if (additionalFields.lockMode) {
                            headers['x-amz-object-lock-mode'] = additionalFields.lockMode.toUpperCase();
                        }
                        if (additionalFields.lockRetainUntilDate) {
                            headers['x-amz-object-lock-retain-until-date'] =
                                additionalFields.lockRetainUntilDate;
                        }
                        if (additionalFields.serverSideEncryption) {
                            headers['x-amz-server-side-encryption'] =
                                additionalFields.serverSideEncryption;
                        }
                        if (additionalFields.encryptionAwsKmsKeyId) {
                            headers['x-amz-server-side-encryption-aws-kms-key-id'] =
                                additionalFields.encryptionAwsKmsKeyId;
                        }
                        if (additionalFields.serverSideEncryptionContext) {
                            headers['x-amz-server-side-encryption-context'] =
                                additionalFields.serverSideEncryptionContext;
                        }
                        if (additionalFields.serversideEncryptionCustomerAlgorithm) {
                            headers['x-amz-server-side-encryption-customer-algorithm'] =
                                additionalFields.serversideEncryptionCustomerAlgorithm;
                        }
                        if (additionalFields.serversideEncryptionCustomerKey) {
                            headers['x-amz-server-side-encryption-customer-key'] =
                                additionalFields.serversideEncryptionCustomerKey;
                        }
                        if (additionalFields.serversideEncryptionCustomerKeyMD5) {
                            headers['x-amz-server-side-encryption-customer-key-MD5'] =
                                additionalFields.serversideEncryptionCustomerKeyMD5;
                        }
                        if (tagsValues) {
                            const tags = [];
                            tagsValues.forEach((o) => {
                                tags.push(`${o.key}=${o.value}`);
                            });
                            headers['x-amz-tagging'] = tags.join('&');
                        }
                        responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'GET', '', '', {
                            location: '',
                        });
                        const region = responseData.LocationConstraint._;
                        if (isBinaryData) {
                            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
                            const binaryPropertyData = this.helpers.assertBinaryData(i, binaryPropertyName);
                            const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                            body = binaryDataBuffer;
                            headers['Content-Type'] = binaryPropertyData.mimeType;
                            headers['Content-MD5'] = createHash('md5').update(body).digest('base64');
                            responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'PUT', `${path}${fileName || binaryPropertyData.fileName}`, body, qs, headers, {}, region);
                        }
                        else {
                            const fileContent = this.getNodeParameter('fileContent', i);
                            body = Buffer.from(fileContent, 'utf8');
                            headers['Content-Type'] = 'text/html';
                            headers['Content-MD5'] = createHash('md5').update(fileContent).digest('base64');
                            responseData = await awsApiRequestSOAP.call(this, `${bucketName}.s3`, 'PUT', `${path}${fileName}`, body, qs, headers, {}, region);
                        }
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                        returnData.push(...executionData);
                    }
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionData);
                    continue;
                }
                throw error;
            }
        }
        if (resource === 'file' && operation === 'download') {
            // For file downloads the files get attached to the existing items
            return [items];
        }
        else {
            return [returnData];
        }
    }
}
//# sourceMappingURL=AwsS3V1.node.js.map