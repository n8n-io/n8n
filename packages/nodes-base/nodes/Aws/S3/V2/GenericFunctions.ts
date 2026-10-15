import { sign } from 'aws4';
import type { Request as Aws4Request } from 'aws4';
import get from 'lodash/get';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	IHttpRequestOptions,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
} from 'n8n-workflow';
import { sanitizeXmlName } from 'n8n-workflow';
import { parseString } from 'xml2js';

import { getAwsDomain, type AWSRegion } from '@credentials/common/aws/regions';
import type {
	AwsSecurityHeaders,
	AwsAssumeRoleCredentialsType,
	AwsIamCredentialsType,
} from '@credentials/common/aws/types';
import { assumeRole } from '@credentials/common/aws/utils';
import { getAwsCredentials } from '../../GenericFunctions';

type S3RequestOption = Pick<IRequestOptions, 'encoding' | 'resolveWithFullResponse'>;

export async function awsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: RequestPath,
	body?: string | Buffer | any,
	query: IDataObject = {},
	headers?: object,
	option: S3RequestOption = {},
	_region?: string,
): Promise<any> {
	const requestOptions = {
		qs: {
			...query,
			service,
			path: path.value,
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
	const { credentialsType } = await getAwsCredentials(this);

	return await this.helpers.requestWithAuthentication.call(this, credentialsType, requestOptions);
}

export async function awsApiRequestREST(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: RequestPath,
	body?: string | Buffer | any,
	query: IDataObject = {},
	headers?: object,
	options: S3RequestOption = {},
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
				parseString(
					response as string,
					{
						explicitArray: false,
						tagNameProcessors: [sanitizeXmlName],
						attrNameProcessors: [sanitizeXmlName],
					},
					(err, data) => {
						if (err) {
							return reject(err);
						}
						resolve(data);
					},
				);
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
	path: RequestPath,
	body?: string,
	query: IDataObject = {},
	headers?: object,
	option: S3RequestOption = {},
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

export function normalizeS3Region(locationConstraint: string | null | undefined): AWSRegion {
	if (locationConstraint === 'EU') {
		return 'eu-west-1';
	}

	return (locationConstraint || 'us-east-1') as AWSRegion;
}

function encodeRFC5987ValueChars(value: string): string {
	return encodeURIComponent(value).replace(
		/[!'()*]/g,
		(char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
	);
}

// This function creates a Content-Disposition header value that is compatible with RFC 5987. 
// Otherwise s3 will return error: Header value cannot be represented using ISO-8859-1 for some edge cases
// e.g. when the filename contains non-ASCII characters.
export function createContentDisposition(filename: string): string {
	const asciiFilename = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '\\$&');

	return (
		`attachment; filename="${asciiFilename}"; ` +
		`filename*=UTF-8''${encodeRFC5987ValueChars(filename)}`
	);
}

export async function getPresignedS3Url(
	this: IExecuteFunctions,
	method: 'GET' | 'PUT',
	bucketName: string,
	objectPath: RequestPath,
	region: AWSRegion,
	expiresIn: number,
	responseContentDisposition?: string,
): Promise<string> {
	const { credentials, credentialsType } = await getAwsCredentials(this);

	// Resolve effective access key / secret / session token
	let securityHeaders: AwsSecurityHeaders;
	if (credentialsType === 'awsAssumeRole') {
		const tmp = await assumeRole(credentials as AwsAssumeRoleCredentialsType, region);
		securityHeaders = tmp;
	} else {
		const c = credentials as AwsIamCredentialsType;
		securityHeaders = {
			accessKeyId: c.accessKeyId,
			secretAccessKey: c.secretAccessKey,
			sessionToken: c.temporaryCredentials ? c.sessionToken : undefined,
		};
	}

	// Bucket names must be lowercase, but the DNS names are case-insensitive; however, the signature calculation is case-sensitive.
	// To avoid signature mismatches, we normalize the bucket name to lowercase.
	const normalizedBucketName = bucketName.toLowerCase();

	const useVirtualHost = !bucketName.includes('.');
	const domain = getAwsDomain(region);

	const host = useVirtualHost
		? `${normalizedBucketName}.s3.${region}.${domain}`
		: `s3.${region}.${domain}`;
	// const basePath = useVirtualHost ? '' : `/${normalizedBucketName}`;

	// Compose query for SigV4 query signing
	const qs = new URLSearchParams({ 'X-Amz-Expires': String(expiresIn) });
	if (responseContentDisposition) {
		qs.set('response-content-disposition', responseContentDisposition);
	}

	const path = `${objectPath.value}?${qs.toString()}`;
	const signOpts: Aws4Request = {
		host,
		method,
		path,
		service: 's3',
		region,
		signQuery: true,
	};

	const signed = sign(signOpts, securityHeaders);

	return `https://${signed.host}${signed.path}`;
}
