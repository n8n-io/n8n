/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import get from 'lodash/get';
import merge from 'lodash/merge';
import set from 'lodash/set';
import {
	NodeHelpers,
	NodeApiError,
	NodeOperationError,
	sleep,
	NodeConnectionTypes,
} from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	DeclarativeRestApiSettings,
	IWorkflowDataProxyAdditionalKeys,
	NodeParameterValue,
	IDataObject,
	IExecuteData,
	IExecuteSingleFunctions,
	IN8nRequestOperations,
	INodeProperties,
	INodePropertyCollection,
	NodeParameterValueType,
	PostReceiveAction,
	JsonObject,
	INodeCredentialDescription,
	IExecutePaginationFunctions,
} from 'n8n-workflow';
import url from 'node:url';

import { type ExecuteContext, ExecuteSingleContext } from './node-execution-context';

export class RoutingNode {
	constructor(
		private readonly context: ExecuteContext,
		private readonly nodeType: INodeType,
		private readonly credentialsDecrypted?: ICredentialsDecrypted,
	) {}

	// eslint-disable-next-line complexity
	async runNode(): Promise<INodeExecutionData[][] | undefined> {
		const { context, nodeType, credentialsDecrypted } = this;
		const {
			additionalData,
			executeData,
			inputData,
			node,
			workflow,
			mode,
			runIndex,
			connectionInputData,
			runExecutionData,
		} = context;
		const abortSignal = context.getExecutionCancelSignal();

		const items = (inputData[NodeConnectionTypes.Main] ??
			inputData[NodeConnectionTypes.AiTool])[0] as INodeExecutionData[];
		const returnData: INodeExecutionData[] = [];

		const { credentials, credentialDescription } = await this.prepareCredentials();

		const { batching } = context.getNodeParameter('requestOptions', 0, {}) as {
			batching: { batch: { batchSize: number; batchInterval: number } };
		};

		const batchSize = batching?.batch?.batchSize > 0 ? batching?.batch?.batchSize : 1;
		const batchInterval = batching?.batch.batchInterval;

		const requestPromises = [];
		const itemContext: Array<{
			thisArgs: IExecuteSingleFunctions;
			requestData: DeclarativeRestApiSettings.ResultOptions;
		}> = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			if (itemIndex > 0 && batchSize >= 0 && batchInterval > 0) {
				if (itemIndex % batchSize === 0) {
					await sleep(batchInterval);
				}
			}

			const thisArgs = new ExecuteSingleContext(
				workflow,
				node,
				additionalData,
				mode,
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				itemIndex,
				executeData,
				abortSignal,
			);

			itemContext.push({
				thisArgs,
				requestData: {
					options: {
						qs: {},
						body: {},
						headers: {},
					},
					preSend: [],
					postReceive: [],
					requestOperations: {},
				} as DeclarativeRestApiSettings.ResultOptions,
			});

			const { proxy, timeout, allowUnauthorizedCerts } = itemContext[
				itemIndex
			].thisArgs.getNodeParameter('requestOptions', 0, {}) as {
				proxy: string;
				timeout: number;
				allowUnauthorizedCerts: boolean;
			};

			if (nodeType.description.requestOperations) {
				itemContext[itemIndex].requestData.requestOperations = {
					...nodeType.description.requestOperations,
				};
			}

			if (nodeType.description.requestDefaults) {
				for (const key of Object.keys(nodeType.description.requestDefaults)) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					let value = (nodeType.description.requestDefaults as Record<string, any>)[key];
					// If the value is an expression resolve it
					value = this.getParameterValue(
						value,
						itemIndex,
						runIndex,
						executeData,
						{ $credentials: credentials, $version: node.typeVersion },
						false,
					) as string;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(itemContext[itemIndex].requestData.options as Record<string, any>)[key] = value;
				}
			}

			for (const property of nodeType.description.properties) {
				let value = get(node.parameters, property.name, []) as string | NodeParameterValue;
				// If the value is an expression resolve it
				value = this.getParameterValue(
					value,
					itemIndex,
					runIndex,
					executeData,
					{ $credentials: credentials, $version: node.typeVersion },
					false,
				) as string | NodeParameterValue;

				const tempOptions = this.getRequestOptionsFromParameters(
					itemContext[itemIndex].thisArgs,
					property,
					itemIndex,
					runIndex,
					'',
					{ $credentials: credentials, $value: value, $version: node.typeVersion },
				);

				this.mergeOptions(itemContext[itemIndex].requestData, tempOptions);
			}

			if (proxy) {
				const proxyParsed = url.parse(proxy);
				const proxyProperties = ['host', 'port'];

				for (const property of proxyProperties) {
					if (
						!(property in proxyParsed) ||
						proxyParsed[property as keyof typeof proxyParsed] === null
					) {
						throw new NodeOperationError(node, 'The proxy is not value', {
							runIndex,
							itemIndex,
							description: `The proxy URL does not contain a valid value for "${property}"`,
						});
					}
				}

				itemContext[itemIndex].requestData.options.proxy = {
					host: proxyParsed.hostname as string,
					port: parseInt(proxyParsed.port!),
					protocol: proxyParsed.protocol?.replace(/:$/, '') || undefined,
				};

				if (proxyParsed.auth) {
					const [username, password] = proxyParsed.auth.split(':');
					itemContext[itemIndex].requestData.options.proxy!.auth = {
						username,
						password,
					};
				}
			}

			if (allowUnauthorizedCerts) {
				itemContext[itemIndex].requestData.options.skipSslCertificateValidation =
					allowUnauthorizedCerts;
			}

			if (timeout) {
				itemContext[itemIndex].requestData.options.timeout = timeout;
			} else {
				// set default timeout to 5 minutes
				itemContext[itemIndex].requestData.options.timeout = 300_000;
			}

			requestPromises.push(
				this.makeRequest(
					itemContext[itemIndex].requestData,
					itemContext[itemIndex].thisArgs,
					itemIndex,
					runIndex,
					credentialDescription?.name,
					itemContext[itemIndex].requestData.requestOperations,
					credentialsDecrypted,
				),
			);
		}

		const promisesResponses = await Promise.allSettled(requestPromises);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let responseData: any;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			responseData = promisesResponses.shift();
			if (responseData!.status !== 'fulfilled') {
				if (responseData.reason.statusCode === 429) {
					responseData.reason.message =
						"Try spacing your requests out using the batching settings under 'Options'";
				}

				const error = responseData.reason;

				if (itemContext[itemIndex].thisArgs?.continueOnFail()) {
					returnData.push({ json: {}, error: error as NodeApiError });
					continue;
				}

				if (error instanceof NodeApiError) {
					set(error, 'context.itemIndex', itemIndex);
					set(error, 'context.runIndex', runIndex);
					throw error;
				}

				throw new NodeApiError(node, error as JsonObject, {
					runIndex,
					itemIndex,
					message: error?.message,
					description: error?.description,
					httpCode: error.isAxiosError && error.response ? String(error.response?.status) : 'none',
				});
			}

			if (itemContext[itemIndex].requestData.maxResults) {
				// Remove not needed items in case APIs return to many
				responseData.value.splice(itemContext[itemIndex].requestData.maxResults as number);
			}

			returnData.push(...responseData.value);
		}

		return [returnData];
	}

	private mergeOptions(
		destinationOptions: DeclarativeRestApiSettings.ResultOptions,
		sourceOptions?: DeclarativeRestApiSettings.ResultOptions,
	): void {
		if (sourceOptions) {
			destinationOptions.paginate = destinationOptions.paginate ?? sourceOptions.paginate;
			destinationOptions.maxResults = sourceOptions.maxResults
				? sourceOptions.maxResults
				: destinationOptions.maxResults;
			merge(destinationOptions.options, sourceOptions.options);
			destinationOptions.preSend.push(...sourceOptions.preSend);
			destinationOptions.postReceive.push(...sourceOptions.postReceive);
			if (sourceOptions.requestOperations && destinationOptions.requestOperations) {
				destinationOptions.requestOperations = Object.assign(
					destinationOptions.requestOperations,
					sourceOptions.requestOperations,
				);
			}
		}
	}

	private async runPostReceiveAction(
		executeSingleFunctions: IExecuteSingleFunctions,
		action: PostReceiveAction,
		inputData: INodeExecutionData[],
		responseData: IN8nHttpFullResponse,
		parameterValue: string | IDataObject | undefined,
		itemIndex: number,
		runIndex: number,
	): Promise<INodeExecutionData[]> {
		if (typeof action === 'function') {
			return await action.call(executeSingleFunctions, inputData, responseData);
		}

		const { node } = this.context;

		if (action.type === 'rootProperty') {
			try {
				return inputData.flatMap((item) => {
					let itemContent = get(item.json, action.properties.property);

					if (!Array.isArray(itemContent)) {
						itemContent = [itemContent];
					}
					return (itemContent as IDataObject[]).map((json) => {
						return {
							json,
						};
					});
				});
			} catch (error) {
				throw new NodeOperationError(node, error as Error, {
					runIndex,
					itemIndex,
					description: `The rootProperty "${action.properties.property}" could not be found on item.`,
				});
			}
		}

		if (action.type === 'filter') {
			const passValue = action.properties.pass;
			const { credentials } = await this.prepareCredentials();

			inputData = inputData.filter((item) => {
				// If the value is an expression resolve it
				return this.getParameterValue(
					passValue,
					itemIndex,
					runIndex,
					executeSingleFunctions.getExecuteData(),
					{
						$credentials: credentials,
						$response: responseData,
						$responseItem: item.json,
						$value: parameterValue,
						$version: node.typeVersion,
					},
					false,
				) as boolean;
			});

			return inputData;
		}

		if (action.type === 'limit') {
			const maxResults = this.getParameterValue(
				action.properties.maxResults,
				itemIndex,
				runIndex,
				executeSingleFunctions.getExecuteData(),
				{ $response: responseData, $value: parameterValue, $version: node.typeVersion },
				false,
			) as string;
			return inputData.slice(0, parseInt(maxResults, 10));
		}

		if (action.type === 'set') {
			const { value } = action.properties;
			// If the value is an expression resolve it
			return [
				{
					json: this.getParameterValue(
						value,
						itemIndex,
						runIndex,
						executeSingleFunctions.getExecuteData(),
						{ $response: responseData, $value: parameterValue, $version: node.typeVersion },
						false,
					) as IDataObject,
				},
			];
		}

		if (action.type === 'sort') {
			// Sort the returned options
			const sortKey = action.properties.key;
			inputData.sort((a, b) => {
				const aSortValue = a.json[sortKey]?.toString().toLowerCase() ?? '';
				const bSortValue = b.json[sortKey]?.toString().toLowerCase() ?? '';
				if (aSortValue < bSortValue) {
					return -1;
				}
				if (aSortValue > bSortValue) {
					return 1;
				}
				return 0;
			});

			return inputData;
		}

		if (action.type === 'setKeyValue') {
			const returnData: INodeExecutionData[] = [];

			inputData.forEach((item) => {
				const returnItem: IDataObject = {};
				for (const key of Object.keys(action.properties)) {
					let propertyValue = (
						action.properties as Record<
							string,
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							any
						>
					)[key];
					// If the value is an expression resolve it
					propertyValue = this.getParameterValue(
						propertyValue,
						itemIndex,
						runIndex,
						executeSingleFunctions.getExecuteData(),
						{
							$response: responseData,
							$responseItem: item.json,
							$value: parameterValue,
							$version: node.typeVersion,
						},
						false,
					) as string;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(returnItem as Record<string, any>)[key] = propertyValue;
				}
				returnData.push({ json: returnItem });
			});

			return returnData;
		}

		if (action.type === 'binaryData') {
			const body = (responseData.body = Buffer.from(responseData.body as string));
			let { destinationProperty } = action.properties;

			destinationProperty = this.getParameterValue(
				destinationProperty,
				itemIndex,
				runIndex,
				executeSingleFunctions.getExecuteData(),
				{ $response: responseData, $value: parameterValue, $version: node.typeVersion },
				false,
			) as string;

			const binaryData = await executeSingleFunctions.helpers.prepareBinaryData(body);

			return inputData.map((item) => {
				if (typeof item.json === 'string') {
					// By default is probably the binary data as string set, in this case remove it
					item.json = {};
				}

				item.binary = {
					[destinationProperty]: binaryData,
				};

				return item;
			});
		}

		return [];
	}

	private async postProcessResponseData(
		executeSingleFunctions: IExecuteSingleFunctions,
		responseData: IN8nHttpFullResponse,
		requestData: DeclarativeRestApiSettings.ResultOptions,
		itemIndex: number,
		runIndex: number,
	): Promise<INodeExecutionData[]> {
		let returnData: INodeExecutionData[] = [
			{
				json: responseData.body as IDataObject,
			},
		];

		if (requestData.postReceive.length) {
			// If postReceive functionality got defined execute all of them
			for (const postReceiveMethod of requestData.postReceive) {
				for (const action of postReceiveMethod.actions) {
					returnData = await this.runPostReceiveAction(
						executeSingleFunctions,
						action,
						returnData,
						responseData,
						postReceiveMethod.data.parameterValue,
						itemIndex,
						runIndex,
					);
				}
			}
		} else {
			// No postReceive functionality got defined so simply add data as it is

			if (Array.isArray(responseData.body)) {
				returnData = responseData.body.map((json) => {
					return {
						json,
					} as INodeExecutionData;
				});
			} else {
				returnData[0].json = responseData.body as IDataObject;
			}
		}

		return returnData;
	}

	private async rawRoutingRequest(
		executeSingleFunctions: IExecuteSingleFunctions,
		requestData: DeclarativeRestApiSettings.ResultOptions,
		credentialType?: string,
		credentialsDecrypted?: ICredentialsDecrypted,
	): Promise<IN8nHttpFullResponse> {
		let responseData: IN8nHttpFullResponse;
		requestData.options.returnFullResponse = true;
		if (credentialType) {
			responseData = (await executeSingleFunctions.helpers.httpRequestWithAuthentication.call(
				executeSingleFunctions,
				credentialType,
				requestData.options as IHttpRequestOptions,
				{ credentialsDecrypted },
			)) as IN8nHttpFullResponse;
		} else {
			responseData = (await executeSingleFunctions.helpers.httpRequest(
				requestData.options as IHttpRequestOptions,
			)) as IN8nHttpFullResponse;
		}

		return responseData;
	}

	private async makeRequest(
		requestData: DeclarativeRestApiSettings.ResultOptions,
		executeSingleFunctions: IExecuteSingleFunctions,
		itemIndex: number,
		runIndex: number,
		credentialType?: string,
		requestOperations?: IN8nRequestOperations,
		credentialsDecrypted?: ICredentialsDecrypted,
	): Promise<INodeExecutionData[]> {
		let responseData: INodeExecutionData[];
		for (const preSendMethod of requestData.preSend) {
			requestData.options = await preSendMethod.call(
				executeSingleFunctions,
				requestData.options as IHttpRequestOptions,
			);
		}

		const makeRoutingRequest = async (requestOptions: DeclarativeRestApiSettings.ResultOptions) => {
			return await this.rawRoutingRequest(
				executeSingleFunctions,
				requestOptions,
				credentialType,
				credentialsDecrypted,
			).then(
				async (data) =>
					await this.postProcessResponseData(
						executeSingleFunctions,
						data,
						requestData,
						itemIndex,
						runIndex,
					),
			);
		};

		const { node } = this.context;
		const executePaginationFunctions = Object.create(executeSingleFunctions, {
			makeRoutingRequest: { value: makeRoutingRequest },
		}) as IExecutePaginationFunctions;

		if (requestData.paginate && requestOperations?.pagination) {
			// Has pagination

			if (typeof requestOperations.pagination === 'function') {
				// Pagination via function
				responseData = await requestOperations.pagination.call(
					executePaginationFunctions,
					requestData,
				);
			} else {
				// Pagination via JSON properties
				responseData = [];
				if (!requestData.options.qs) {
					requestData.options.qs = {};
				}

				// Different predefined pagination types
				if (requestOperations.pagination.type === 'generic') {
					let tempResponseData: IN8nHttpFullResponse;
					let tempResponseItems: INodeExecutionData[];
					let makeAdditionalRequest: boolean;
					let paginateRequestData: IHttpRequestOptions;

					const additionalKeys = {
						$request: requestData.options,
						$response: {} as IN8nHttpFullResponse,
						$version: node.typeVersion,
					};

					do {
						additionalKeys.$request = requestData.options;

						paginateRequestData = this.getParameterValue(
							requestOperations.pagination.properties.request as unknown as NodeParameterValueType,
							itemIndex,
							runIndex,
							executeSingleFunctions.getExecuteData(),
							additionalKeys,
							false,
						) as object as IHttpRequestOptions;

						// Make the HTTP request
						tempResponseData = await this.rawRoutingRequest(
							executeSingleFunctions,
							{ ...requestData, options: { ...requestData.options, ...paginateRequestData } },
							credentialType,
							credentialsDecrypted,
						);

						additionalKeys.$response = tempResponseData;

						tempResponseItems = await this.postProcessResponseData(
							executeSingleFunctions,
							tempResponseData,
							requestData,
							itemIndex,
							runIndex,
						);

						responseData.push(...tempResponseItems);

						makeAdditionalRequest = this.getParameterValue(
							requestOperations.pagination.properties.continue,
							itemIndex,
							runIndex,
							executeSingleFunctions.getExecuteData(),
							additionalKeys,
							false,
						) as boolean;
					} while (makeAdditionalRequest);
				} else if (requestOperations.pagination.type === 'offset') {
					const { properties } = requestOperations.pagination;

					const optionsType = properties.type === 'body' ? 'body' : 'qs';
					if (properties.type === 'body' && !requestData.options.body) {
						requestData.options.body = {};
					}

					(requestData.options[optionsType] as IDataObject)[properties.limitParameter] =
						properties.pageSize;
					(requestData.options[optionsType] as IDataObject)[properties.offsetParameter] = 0;
					let tempResponseData: INodeExecutionData[];
					do {
						if (requestData?.maxResults) {
							// Only request as many results as needed
							const resultsMissing = (requestData?.maxResults as number) - responseData.length;
							if (resultsMissing < 1) {
								break;
							}
							(requestData.options[optionsType] as IDataObject)[properties.limitParameter] =
								Math.min(properties.pageSize, resultsMissing);
						}

						tempResponseData = await this.rawRoutingRequest(
							executeSingleFunctions,
							requestData,
							credentialType,
							credentialsDecrypted,
						).then(
							async (data) =>
								await this.postProcessResponseData(
									executeSingleFunctions,
									data,
									requestData,
									itemIndex,
									runIndex,
								),
						);

						(requestData.options[optionsType] as IDataObject)[properties.offsetParameter] =
							((requestData.options[optionsType] as IDataObject)[
								properties.offsetParameter
							] as number) + properties.pageSize;

						if (properties.rootProperty) {
							const tempResponseValue = get(tempResponseData[0].json, properties.rootProperty) as
								| IDataObject[]
								| undefined;
							if (tempResponseValue === undefined) {
								throw new NodeOperationError(
									node,
									`The rootProperty "${properties.rootProperty}" could not be found on item.`,
									{ runIndex, itemIndex },
								);
							}

							tempResponseData = tempResponseValue.map((item) => {
								return {
									json: item,
								};
							});
						}

						responseData.push(...tempResponseData);
					} while (tempResponseData.length && tempResponseData.length === properties.pageSize);
				}
			}
		} else {
			// No pagination
			responseData = await this.rawRoutingRequest(
				executeSingleFunctions,
				requestData,
				credentialType,
				credentialsDecrypted,
			).then(
				async (data) =>
					await this.postProcessResponseData(
						executeSingleFunctions,
						data,
						requestData,
						itemIndex,
						runIndex,
					),
			);
		}
		return responseData;
	}

	private getParameterValue(
		parameterValue: NodeParameterValueType,
		itemIndex: number,
		runIndex: number,
		executeData: IExecuteData,
		additionalKeys?: IWorkflowDataProxyAdditionalKeys,
		returnObjectAsString = false,
	): NodeParameterValueType {
		if (
			typeof parameterValue === 'object' ||
			(typeof parameterValue === 'string' && parameterValue.charAt(0) === '=')
		) {
			const { node, workflow, mode, connectionInputData, runExecutionData } = this.context;
			return workflow.expression.getParameterValue(
				parameterValue,
				runExecutionData ?? null,
				runIndex,
				itemIndex,
				node.name,
				connectionInputData,
				mode,
				additionalKeys ?? {},
				executeData,
				returnObjectAsString,
			);
		}

		return parameterValue;
	}

	// eslint-disable-next-line complexity
	getRequestOptionsFromParameters(
		executeSingleFunctions: IExecuteSingleFunctions,
		nodeProperties: INodeProperties | INodePropertyOptions,
		itemIndex: number,
		runIndex: number,
		path: string,
		additionalKeys?: IWorkflowDataProxyAdditionalKeys,
	): DeclarativeRestApiSettings.ResultOptions | undefined {
		const returnData: DeclarativeRestApiSettings.ResultOptions = {
			options: {
				qs: {},
				body: {},
				headers: {},
			},
			preSend: [],
			postReceive: [],
			requestOperations: {},
		};
		let basePath = path ? `${path}.` : '';

		const { node, nodeType } = this.context;
		if (
			!NodeHelpers.displayParameter(
				node.parameters,
				nodeProperties,
				node,
				nodeType.description,
				node.parameters,
			)
		) {
			return undefined;
		}
		if (nodeProperties.routing) {
			let parameterValue: string | undefined;
			if (basePath + nodeProperties.name && 'type' in nodeProperties) {
				// Extract value if it has extractValue defined or if it's a
				// resourceLocator component. Resource locators are likely to have extractors
				// and we can't know if the mode has one unless we dig all the way in.
				const shouldExtractValue =
					nodeProperties.extractValue !== undefined || nodeProperties.type === 'resourceLocator';
				parameterValue = executeSingleFunctions.getNodeParameter(
					basePath + nodeProperties.name,
					undefined,
					{ extractValue: shouldExtractValue },
				) as string;
			}

			if (nodeProperties.routing.operations) {
				returnData.requestOperations = { ...nodeProperties.routing.operations };
			}
			if (nodeProperties.routing.request) {
				for (const key of Object.keys(nodeProperties.routing.request)) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					let propertyValue = (nodeProperties.routing.request as Record<string, any>)[key];
					// If the value is an expression resolve it
					propertyValue = this.getParameterValue(
						propertyValue,
						itemIndex,
						runIndex,
						executeSingleFunctions.getExecuteData(),
						{ ...additionalKeys, $value: parameterValue },
						false,
					) as string;

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(returnData.options as Record<string, any>)[key] = propertyValue;
				}
			}

			if (nodeProperties.routing.send) {
				let propertyName = nodeProperties.routing.send.property;
				if (propertyName !== undefined) {
					// If the propertyName is an expression resolve it
					propertyName = this.getParameterValue(
						propertyName,
						itemIndex,
						runIndex,
						executeSingleFunctions.getExecuteData(),
						additionalKeys,
						true,
					) as string;

					let value = parameterValue;

					if (nodeProperties.routing.send.value) {
						const valueString = nodeProperties.routing.send.value;
						// Special value got set
						// If the valueString is an expression resolve it
						value = this.getParameterValue(
							valueString,
							itemIndex,
							runIndex,
							executeSingleFunctions.getExecuteData(),
							{ ...additionalKeys, $value: value },
							false,
						) as string;
					}

					if (nodeProperties.routing.send.type === 'body') {
						// Send in "body"

						if (nodeProperties.routing.send.propertyInDotNotation === false) {
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							(returnData.options.body as Record<string, any>)[propertyName] = value;
						} else {
							set(returnData.options.body as object, propertyName, value);
						}
					} else {
						// Send in "query"

						if (nodeProperties.routing.send.propertyInDotNotation === false) {
							returnData.options.qs![propertyName] = value;
						} else {
							set(returnData.options.qs as object, propertyName, value);
						}
					}
				}

				if (nodeProperties.routing.send.paginate !== undefined) {
					let paginateValue = nodeProperties.routing.send.paginate;
					if (typeof paginateValue === 'string' && paginateValue.charAt(0) === '=') {
						// If the propertyName is an expression resolve it
						paginateValue = this.getParameterValue(
							paginateValue,
							itemIndex,
							runIndex,
							executeSingleFunctions.getExecuteData(),
							{ ...additionalKeys, $value: parameterValue },
							true,
						) as string;
					}

					returnData.paginate = !!paginateValue;
				}

				if (nodeProperties.routing.send.preSend) {
					returnData.preSend.push(...nodeProperties.routing.send.preSend);
				}
			}
			if (nodeProperties.routing.output) {
				if (nodeProperties.routing.output.maxResults !== undefined) {
					let maxResultsValue = nodeProperties.routing.output.maxResults;
					if (typeof maxResultsValue === 'string' && maxResultsValue.charAt(0) === '=') {
						// If the propertyName is an expression resolve it
						maxResultsValue = this.getParameterValue(
							maxResultsValue,
							itemIndex,
							runIndex,
							executeSingleFunctions.getExecuteData(),
							{ ...additionalKeys, $value: parameterValue },
							true,
						) as string;
					}

					returnData.maxResults = maxResultsValue;
				}

				if (nodeProperties.routing.output.postReceive) {
					const postReceiveActions = nodeProperties.routing.output.postReceive.filter((action) => {
						if (typeof action === 'function') {
							return true;
						}

						if (typeof action.enabled === 'string' && action.enabled.charAt(0) === '=') {
							// If the propertyName is an expression resolve it
							return this.getParameterValue(
								action.enabled,
								itemIndex,
								runIndex,
								executeSingleFunctions.getExecuteData(),
								{ ...additionalKeys, $value: parameterValue },
								true,
							) as boolean;
						}

						return action.enabled !== false;
					});

					if (postReceiveActions.length) {
						returnData.postReceive.push({
							data: {
								parameterValue,
							},
							actions: postReceiveActions,
						});
					}
				}
			}
		}

		// Check if there are any child properties
		if (!Object.prototype.hasOwnProperty.call(nodeProperties, 'options')) {
			// There are none so nothing else to check
			return returnData;
		}

		// Everything after this point can only be of type INodeProperties
		nodeProperties = nodeProperties as INodeProperties;

		// Check the child parameters
		let value;
		if (nodeProperties.type === 'options') {
			const optionValue = NodeHelpers.getParameterValueByPath(
				node.parameters,
				nodeProperties.name,
				basePath.slice(0, -1),
			);

			// Find the selected option
			const selectedOption = (nodeProperties.options as INodePropertyOptions[]).filter(
				(option) => option.value === optionValue,
			);

			if (selectedOption.length) {
				// Check only if option is set and if of type INodeProperties
				const tempOptions = this.getRequestOptionsFromParameters(
					executeSingleFunctions,
					selectedOption[0],
					itemIndex,
					runIndex,
					`${basePath}${nodeProperties.name}`,
					{ $value: optionValue, $version: node.typeVersion },
				);

				this.mergeOptions(returnData, tempOptions);
			}
		} else if (nodeProperties.type === 'collection') {
			value = NodeHelpers.getParameterValueByPath(
				node.parameters,
				nodeProperties.name,
				basePath.slice(0, -1),
			);

			for (const propertyOption of nodeProperties.options as INodeProperties[]) {
				if (
					Object.keys(value as IDataObject).includes(propertyOption.name) &&
					propertyOption.type !== undefined
				) {
					// Check only if option is set and if of type INodeProperties
					const tempOptions = this.getRequestOptionsFromParameters(
						executeSingleFunctions,
						propertyOption,
						itemIndex,
						runIndex,
						`${basePath}${nodeProperties.name}`,
						{ $version: node.typeVersion },
					);

					this.mergeOptions(returnData, tempOptions);
				}
			}
		} else if (nodeProperties.type === 'fixedCollection') {
			basePath = `${basePath}${nodeProperties.name}.`;
			for (const propertyOptions of nodeProperties.options as INodePropertyCollection[]) {
				// Check if the option got set and if not skip it
				value = NodeHelpers.getParameterValueByPath(
					node.parameters,
					propertyOptions.name,
					basePath.slice(0, -1),
				);

				if (value === undefined) {
					continue;
				}

				// Make sure that it is always an array to be able to use the same code for multi and single
				if (!Array.isArray(value)) {
					value = [value];
				}

				// Resolve expressions
				value = this.getParameterValue(
					value as INodeParameters[],
					itemIndex,
					runIndex,
					executeSingleFunctions.getExecuteData(),
					{ ...additionalKeys },
					false,
				) as INodeParameters[];

				const loopBasePath = `${basePath}${propertyOptions.name}`;
				for (let i = 0; i < value.length; i++) {
					for (const option of propertyOptions.values) {
						const tempOptions = this.getRequestOptionsFromParameters(
							executeSingleFunctions,
							option,
							itemIndex,
							runIndex,
							nodeProperties.typeOptions?.multipleValues ? `${loopBasePath}[${i}]` : loopBasePath,
							{ ...(additionalKeys || {}), $index: i, $parent: value[i] },
						);

						this.mergeOptions(returnData, tempOptions);
					}
				}
			}
		}
		return returnData;
	}

	private async prepareCredentials() {
		const { context, nodeType, credentialsDecrypted } = this;
		const { node } = context;

		let credentialDescription: INodeCredentialDescription | undefined;

		if (nodeType.description.credentials?.length) {
			if (nodeType.description.credentials.length === 1) {
				credentialDescription = nodeType.description.credentials[0];
			} else {
				const authenticationMethod = context.getNodeParameter('authentication', 0) as string;
				credentialDescription = nodeType.description.credentials.find((x) =>
					x.displayOptions?.show?.authentication?.includes(authenticationMethod),
				);
				if (!credentialDescription) {
					throw new NodeOperationError(
						node,
						`Node type "${node.type}" does not have any credentials of type "${authenticationMethod}" defined`,
						{ level: 'warning' },
					);
				}
			}
		}

		let credentials: ICredentialDataDecryptedObject | undefined;
		if (credentialsDecrypted) {
			credentials = credentialsDecrypted.data;
		} else if (credentialDescription) {
			try {
				credentials =
					(await context.getCredentials<ICredentialDataDecryptedObject>(
						credentialDescription.name,
						0,
					)) || {};
			} catch (error) {
				if (credentialDescription.required) {
					// Only throw error if credential is mandatory
					throw error;
				} else {
					// Do not request cred type since it doesn't exist
					credentialDescription = undefined;
				}
			}
		}

		return { credentials, credentialDescription };
	}
}
