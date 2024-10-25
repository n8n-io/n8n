import { createHash } from 'crypto';
import { Readable } from 'stream';
import { pick } from 'lodash';
import {
	IAdditionalCredentialOptions,
	IAllExecuteFunctions,
	IExecuteData,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INode,
	INodeExecutionData,
	IOAuth2Options,
	IRequestOptions,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	jsonParse,
	NodeOperationError,
	NodeParameterValueType,
	PaginationOptions,
	sleep,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import {
	applyPaginationRequestData,
	binaryToString,
	httpRequest,
	httpRequestWithAuthentication,
	proxyRequestToAxios,
	requestOAuth1,
	requestOAuth2,
	requestWithAuthentication,
	validateUrl,
} from '@/NodeExecuteFunctions';
import type { RequestHelperFunctions } from 'n8n-workflow';

export class RequestHelpers implements RequestHelperFunctions {
	constructor(
		private readonly context: IAllExecuteFunctions,
		private readonly workflow: Workflow,
		private readonly node: INode,
		private readonly additionalData: IWorkflowExecuteAdditionalData,
		private readonly runExecutionData: IRunExecutionData | null = null,
		private readonly connectionInputData: INodeExecutionData[] = [],
	) {}

	get httpRequest() {
		return httpRequest;
	}

	async httpRequestWithAuthentication(
		credentialsType: string,
		requestOptions: IHttpRequestOptions,
		additionalCredentialOptions?: IAdditionalCredentialOptions,
	) {
		return await httpRequestWithAuthentication(
			this.context,
			credentialsType,
			requestOptions,
			this.workflow,
			this.node,
			this.additionalData,
			additionalCredentialOptions,
		);
	}

	async requestWithAuthenticationPaginated(
		requestOptions: IRequestOptions,
		itemIndex: number,
		paginationOptions: PaginationOptions,
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

		const additionalKeys = {
			$request: requestOptions,
			$response: {} as IN8nHttpFullResponse,
			$version: this.node.typeVersion,
			$pageCount: 0,
		};

		const executeData: IExecuteData = {
			data: {},
			node: this.node,
			source: null,
		};

		const hashData = {
			identicalCount: 0,
			previousLength: 0,
			previousHash: '',
		};

		do {
			paginateRequestData = this.getResolvedValue(
				paginationOptions.request as unknown as NodeParameterValueType,
				itemIndex,
				runIndex,
				executeData,
				additionalKeys,
				false,
			) as object as PaginationOptions['request'];

			const tempRequestOptions = applyPaginationRequestData(requestOptions, paginateRequestData);

			if (!validateUrl(tempRequestOptions.uri as string)) {
				throw new NodeOperationError(
					this.node,
					`'${paginateRequestData.url}' is not a valid URL.`,
					{
						itemIndex,
						runIndex,
						type: 'invalid_url',
					},
				);
			}

			if (credentialsType) {
				tempResponseData = await this.requestWithAuthentication(
					credentialsType,
					tempRequestOptions,
					additionalCredentialOptions,
				);
			} else {
				tempResponseData = await this.request(tempRequestOptions);
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
						hash = createHash('md5').update(contentBody).digest('base64');
					}

					if (hashData.previousHash === hash) {
						hashData.identicalCount += 1;
						if (hashData.identicalCount > 2) {
							// Length was identical 5x and hash 3x
							throw new NodeOperationError(
								this.node,
								'The returned response was identical 5x, so requests got stopped',
								{
									itemIndex,
									description:
										'Check if "Pagination Completed When" has been configured correctly.',
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
			additionalKeys.$pageCount = additionalKeys.$pageCount + 1;

			const maxRequests = this.getResolvedValue(
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

			makeAdditionalRequest = this.getResolvedValue(
				paginationOptions.continue,
				itemIndex,
				runIndex,
				executeData,
				additionalKeys,
				false,
			) as boolean;

			if (makeAdditionalRequest) {
				if (paginationOptions.requestInterval) {
					const requestInterval = this.getResolvedValue(
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

	async request(uriOrObject: string | IRequestOptions, options?: IRequestOptions) {
		return await proxyRequestToAxios(
			this.workflow,
			this.additionalData,
			this.node,
			uriOrObject,
			options,
		);
	}

	async requestWithAuthentication(
		credentialsType: string,
		requestOptions: IRequestOptions,
		additionalCredentialOptions?: IAdditionalCredentialOptions,
		itemIndex?: number,
	) {
		return await requestWithAuthentication(
			this.context,
			credentialsType,
			requestOptions,
			this.workflow,
			this.node,
			this.additionalData,
			additionalCredentialOptions,
			itemIndex,
		);
	}

	async requestOAuth1(credentialsType: string, requestOptions: IRequestOptions) {
		return await requestOAuth1(this.context, credentialsType, requestOptions);
	}

	async requestOAuth2(
		credentialsType: string,
		requestOptions: IRequestOptions,
		oAuth2Options?: IOAuth2Options,
	) {
		return await requestOAuth2(
			this.context,
			credentialsType,
			requestOptions,
			this.node,
			this.additionalData,
			oAuth2Options,
		);
	}

	private getResolvedValue(
		parameterValue: NodeParameterValueType,
		itemIndex: number,
		runIndex: number,
		executeData: IExecuteData,
		additionalKeys?: IWorkflowDataProxyAdditionalKeys,
		returnObjectAsString = false,
	): NodeParameterValueType {
		const mode: WorkflowExecuteMode = 'internal';

		if (
			typeof parameterValue === 'object' ||
			(typeof parameterValue === 'string' && parameterValue.charAt(0) === '=')
		) {
			return this.workflow.expression.getParameterValue(
				parameterValue,
				this.runExecutionData,
				runIndex,
				itemIndex,
				this.node.name,
				this.connectionInputData,
				mode,
				additionalKeys ?? {},
				executeData,
				returnObjectAsString,
			);
		}

		return parameterValue;
	}
}
