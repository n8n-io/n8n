import { createHash, createHmac } from 'crypto';
import get from 'lodash/get';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { parseString } from 'xml2js';

export async function awsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string | Buffer | any,
	query: IDataObject = {},
	headers?: object,
	option: IDataObject = {},
	_region?: string,
): Promise<any> {
	const requestOptions = {
		qs: {
			...query,
			service,
			path,
			query,
			_region,
		},
		method,
		body,
		url: '',
		headers,
	} as IHttpRequestOptions;

	if (Object.keys(option).length !== 0) {
		Object.assign(requestOptions, option);
	}
	return await this.helpers.requestWithAuthentication.call(this, 'aws', requestOptions);
}

export async function awsApiRequestREST(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string | Buffer | any,
	query: IDataObject = {},
	headers?: object,
	options: IDataObject = {},
	region?: string,
): Promise<any> {
	const response = await awsApiRequest.call(
		this,
		service,
		method,
		path,
		body,
		query,
		headers,
		options,
		region,
	);
	try {
		if (response.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
			return await new Promise((resolve, reject) => {
				parseString(response as string, { explicitArray: false }, (err, data) => {
					if (err) {
						return reject(err);
					}
					resolve(data);
				});
			});
		}
		return JSON.parse(response as string);
	} catch (error) {
		return response;
	}
}

export async function awsApiRequestRESTAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string,
	query: IDataObject = {},
	headers?: object,
	option: IDataObject = {},
	region?: string,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	do {
		responseData = await awsApiRequestREST.call(
			this,
			service,
			method,
			path,
			body,
			query,
			headers,
			option,
			region,
		);
		//https://forums.aws.amazon.com/thread.jspa?threadID=55746
		if (get(responseData, [propertyName.split('.')[0], 'NextContinuationToken'])) {
			query['continuation-token'] = get(responseData, [
				propertyName.split('.')[0],
				'NextContinuationToken',
			]);
		}
		if (get(responseData, propertyName)) {
			if (Array.isArray(get(responseData, propertyName))) {
				returnData.push.apply(returnData, get(responseData, propertyName) as IDataObject[]);
			} else {
				returnData.push(get(responseData, propertyName) as IDataObject);
			}
		}
		const limit = query.limit as number | undefined;
		if (limit && limit <= returnData.length) {
			return returnData;
		}
	} while (
		get(responseData, [propertyName.split('.')[0], 'IsTruncated']) !== undefined &&
		get(responseData, [propertyName.split('.')[0], 'IsTruncated']) !== 'false'
	);
	return returnData;
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
	return createHmac('sha256', key).update(data).digest();
}

function getSignatureKey(
	secretKey: string,
	dateStamp: string,
	regionName: string,
	serviceName: string,
): Buffer {
	const kDate = hmacSha256('AWS4' + secretKey, dateStamp);
	const kRegion = hmacSha256(kDate, regionName);
	const kService = hmacSha256(kRegion, serviceName);
	const kSigning = hmacSha256(kService, 'aws4_request');
	return kSigning;
}

export async function generatePresignedUrl(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	bucketName: string,
	fileKey: string,
	expiresIn: number,
	query: IDataObject = {},
	region?: string,
): Promise<string> {
	const credentials = await this.getCredentials('aws');

	const accessKeyId = `${credentials.accessKeyId}`.trim();
	const secretAccessKey = `${credentials.secretAccessKey}`.trim();
	const regionName = (region || credentials.region || 'us-east-1') as string;

	// Determine the endpoint
	let host: string;
	let canonicalUri: string;

	if (bucketName.includes('.')) {
		// Bucket name contains dots, use path-style
		host = `s3.${regionName}.amazonaws.com`;
		canonicalUri = `/${bucketName}/${fileKey}`;
	} else {
		// Use virtual-hosted-style
		host = `${bucketName}.s3.${regionName}.amazonaws.com`;
		canonicalUri = `/${fileKey}`;
	}

	// Get current time
	const now = new Date();
	const amzDate = now
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}Z$/, 'Z');
	const dateStamp = amzDate.substring(0, 8);
	const credentialScope = `${dateStamp}/${regionName}/s3/aws4_request`;

	// Build canonical query string
	const queryParams: Record<string, string> = {
		'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
		'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
		'X-Amz-Date': amzDate,
		'X-Amz-Expires': expiresIn.toString(),
		'X-Amz-SignedHeaders': 'host',
	};

	// Add session token if using temporary credentials
	if (credentials.sessionToken) {
		queryParams['X-Amz-Security-Token'] = `${credentials.sessionToken}`.trim();
	}

	// Add additional query parameters
	Object.entries(query).forEach(([key, value]) => {
		queryParams[key] = value as string;
	});

	// Sort query parameters
	const sortedQueryParams = Object.keys(queryParams)
		.sort()
		.map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
		.join('&');

	// Build canonical request
	const canonicalHeaders = `host:${host}\n`;
	const signedHeaders = 'host';
	const payloadHash = 'UNSIGNED-PAYLOAD';

	const canonicalRequest = `GET\n${canonicalUri}\n${sortedQueryParams}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

	// Create string to sign
	const algorithm = 'AWS4-HMAC-SHA256';
	const canonicalRequestHash = createHash('sha256').update(canonicalRequest).digest('hex');
	const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

	// Calculate signature
	const signingKey = getSignatureKey(secretAccessKey, dateStamp, regionName, 's3');
	const signature = hmacSha256(signingKey, stringToSign).toString('hex');

	// Build final URL with signature
	const finalUrl = `https://${host}${canonicalUri}?${sortedQueryParams}&X-Amz-Signature=${signature}`;

	return finalUrl;
}
