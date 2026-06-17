/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

import { binaryToString, tryParseUrl } from '@n8n/backend-network';
import crypto from 'crypto';
import merge from 'lodash/merge';
import pick from 'lodash/pick';
import { NodeOperationError, jsonParse, sleep } from 'n8n-workflow';
import type {
	IAdditionalCredentialOptions,
	IExecuteData,
	IExecuteFunctions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INode,
	IRequestOptions,
	IWorkflowDataProxyAdditionalKeys,
	NodeParameterValueType,
	PaginationOptions,
} from 'n8n-workflow';
import { Readable } from 'stream';

/**
 * Resolves a (possibly expression) parameter value within the current execution
 * context. Matches the signature of the `getResolvedValue` closure defined in
 * `getRequestHelperFunctions`.
 */
export type ResolveValueFn = (
	parameterValue: NodeParameterValueType,
	itemIndex: number,
	runIndex: number,
	executeData: IExecuteData,
	additionalKeys?: IWorkflowDataProxyAdditionalKeys,
	returnObjectAsString?: boolean,
) => NodeParameterValueType;

export function applyPaginationRequestData(
	requestData: IRequestOptions,
	paginationRequestData: PaginationOptions['request'],
): IRequestOptions {
	const preparedPaginationData: Partial<IRequestOptions> = {
		...paginationRequestData,
		uri: paginationRequestData.url,
	};

	if ('formData' in requestData) {
		preparedPaginationData.formData = paginationRequestData.body;
		delete preparedPaginationData.body;
	} else if ('form' in requestData) {
		preparedPaginationData.form = paginationRequestData.body;
		delete preparedPaginationData.body;
	}

	return merge({}, requestData, preparedPaginationData);
}

// eslint-disable-next-line complexity
export async function requestWithAuthenticationPaginated(
	this: IExecuteFunctions,
	requestOptions: IRequestOptions,
	itemIndex: number,
	paginationOptions: PaginationOptions,
	resolveValue: ResolveValueFn,
	node: INode,
	credentialsType?: string,
	additionalCredentialOptions?: IAdditionalCredentialOptions,
): Promise<any[]> {
	const responseData = [];
	if (!requestOptions.qs) {
		requestOptions.qs = {};
	}
	requestOptions.resolveWithFullResponse = true;
	requestOptions.simple = false;

	let tempResponseData: IN8nHttpFullResponse;
	let makeAdditionalRequest: boolean;
	let paginateRequestData: PaginationOptions['request'];

	const runIndex = 0;

	const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
		$request: requestOptions,
		$response: {} as IN8nHttpFullResponse,
		$version: node.typeVersion,
		$pageCount: 0,
	};

	const executeData: IExecuteData = {
		data: {},
		node,
		source: null,
	};

	const hashData = {
		identicalCount: 0,
		previousLength: 0,
		previousHash: '',
	};
	do {
		paginateRequestData = resolveValue(
			paginationOptions.request as unknown as NodeParameterValueType,
			itemIndex,
			runIndex,
			executeData,
			additionalKeys,
			false,
		) as object as PaginationOptions['request'];

		const tempRequestOptions = applyPaginationRequestData(requestOptions, paginateRequestData);

		if (!tryParseUrl(tempRequestOptions.uri as string)) {
			throw new NodeOperationError(node, `'${paginateRequestData.url}' is not a valid URL.`, {
				itemIndex,
				runIndex,
				type: 'invalid_url',
			});
		}

		if (credentialsType) {
			tempResponseData = await this.helpers.requestWithAuthentication.call(
				this,
				credentialsType,
				tempRequestOptions,
				additionalCredentialOptions,
			);
		} else {
			tempResponseData = await this.helpers.request(tempRequestOptions);
		}

		const newResponse: IN8nHttpFullResponse = Object.assign(
			{
				body: {},
				headers: {},
				statusCode: 0,
			},
			pick(tempResponseData, ['body', 'headers', 'statusCode']),
		);

		let contentBody: Exclude<IN8nHttpResponse, Buffer>;

		if (newResponse.body instanceof Readable && paginationOptions.binaryResult !== true) {
			// Keep the original string version that we can use it to hash if needed
			contentBody = await binaryToString(newResponse.body as Buffer | Readable);

			const responseContentType = newResponse.headers['content-type']?.toString() ?? '';
			if (responseContentType.includes('application/json')) {
				newResponse.body = jsonParse(contentBody, { fallbackValue: {} });
			} else {
				newResponse.body = contentBody;
			}
			tempResponseData.__bodyResolved = true;
			tempResponseData.body = newResponse.body;
		} else {
			contentBody = newResponse.body;
		}

		if (paginationOptions.binaryResult !== true || tempResponseData.headers.etag) {
			// If the data is not binary (and so not a stream), or an etag is present,
			// we check via etag or hash if identical data is received

			let contentLength = 0;
			if ('content-length' in tempResponseData.headers) {
				contentLength = parseInt(tempResponseData.headers['content-length'] as string) || 0;
			}

			if (hashData.previousLength === contentLength) {
				let hash: string;
				if (tempResponseData.headers.etag) {
					// If an etag is provided, we use it as "hash"
					hash = tempResponseData.headers.etag as string;
				} else {
					// If there is no etag, we calculate a hash from the data in the body
					if (typeof contentBody !== 'string') {
						contentBody = JSON.stringify(contentBody);
					}
					hash = crypto.createHash('md5').update(contentBody).digest('base64');
				}

				if (hashData.previousHash === hash) {
					hashData.identicalCount += 1;
					if (hashData.identicalCount > 2) {
						// Length was identical 5x and hash 3x
						throw new NodeOperationError(
							node,
							'The returned response was identical 5x, so requests got stopped',
							{
								itemIndex,
								description: 'Check if "Pagination Completed When" has been configured correctly.',
							},
						);
					}
				} else {
					hashData.identicalCount = 0;
				}
				hashData.previousHash = hash;
			} else {
				hashData.identicalCount = 0;
			}
			hashData.previousLength = contentLength;
		}

		responseData.push(tempResponseData);

		additionalKeys.$response = newResponse;
		additionalKeys.$pageCount = (additionalKeys.$pageCount ?? 0) + 1;

		const maxRequests = resolveValue(
			paginationOptions.maxRequests,
			itemIndex,
			runIndex,
			executeData,
			additionalKeys,
			false,
		) as number;

		if (maxRequests && additionalKeys.$pageCount >= maxRequests) {
			break;
		}

		makeAdditionalRequest = resolveValue(
			paginationOptions.continue,
			itemIndex,
			runIndex,
			executeData,
			additionalKeys,
			false,
		) as boolean;

		if (makeAdditionalRequest) {
			if (paginationOptions.requestInterval) {
				const requestInterval = resolveValue(
					paginationOptions.requestInterval,
					itemIndex,
					runIndex,
					executeData,
					additionalKeys,
					false,
				) as number;

				await sleep(requestInterval);
			}
			if (tempResponseData.statusCode < 200 || tempResponseData.statusCode >= 300) {
				// We have it configured to let all requests pass no matter the response code
				// via "requestOptions.simple = false" to not by default fail if it is for example
				// configured to stop on 404 response codes. For that reason we have to throw here
				// now an error manually if the response code is not a success one.
				let data = tempResponseData.body;
				if (data instanceof Readable && paginationOptions.binaryResult !== true) {
					data = await binaryToString(data as Buffer | Readable);
				} else if (typeof data === 'object') {
					data = JSON.stringify(data);
				}

				throw Object.assign(new Error(`${tempResponseData.statusCode} - "${data?.toString()}"`), {
					statusCode: tempResponseData.statusCode,
					error: data,
					isAxiosError: true,
					response: {
						headers: tempResponseData.headers,
						status: tempResponseData.statusCode,
						statusText: tempResponseData.statusMessage,
					},
				});
			}
		}
	} while (makeAdditionalRequest);

	return responseData;
}
