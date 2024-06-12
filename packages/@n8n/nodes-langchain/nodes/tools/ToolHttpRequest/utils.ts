import type {
	IExecuteFunctions,
	IDataObject,
	IHttpRequestOptions,
	IRequestOptionsSimplified,
	IOAuth2Options,
	ExecutionError,
	NodeApiError,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, jsonParse } from 'n8n-workflow';

import set from 'lodash/set';
import get from 'lodash/get';
import unset from 'lodash/unset';

import cheerio from 'cheerio';
import { convert } from 'html-to-text';
import type {
	ParameterInputType,
	ParametersValues,
	PlaceholderDefinition,
	ParametersValues as RawParametersValues,
	SendIn,
	ToolParameter,
} from './interfaces';

const getOAuth2AdditionalParameters = (nodeCredentialType: string) => {
	const oAuth2Options: { [credentialType: string]: IOAuth2Options } = {
		bitlyOAuth2Api: {
			tokenType: 'Bearer',
		},
		boxOAuth2Api: {
			includeCredentialsOnRefreshOnBody: true,
		},
		ciscoWebexOAuth2Api: {
			tokenType: 'Bearer',
		},
		clickUpOAuth2Api: {
			keepBearer: false,
			tokenType: 'Bearer',
		},
		goToWebinarOAuth2Api: {
			tokenExpiredStatusCode: 403,
		},
		hubspotDeveloperApi: {
			tokenType: 'Bearer',
			includeCredentialsOnRefreshOnBody: true,
		},
		hubspotOAuth2Api: {
			tokenType: 'Bearer',
			includeCredentialsOnRefreshOnBody: true,
		},
		lineNotifyOAuth2Api: {
			tokenType: 'Bearer',
		},
		linkedInOAuth2Api: {
			tokenType: 'Bearer',
		},
		mailchimpOAuth2Api: {
			tokenType: 'Bearer',
		},
		mauticOAuth2Api: {
			includeCredentialsOnRefreshOnBody: true,
		},
		microsoftDynamicsOAuth2Api: {
			property: 'id_token',
		},
		philipsHueOAuth2Api: {
			tokenType: 'Bearer',
		},
		raindropOAuth2Api: {
			includeCredentialsOnRefreshOnBody: true,
		},
		shopifyOAuth2Api: {
			tokenType: 'Bearer',
			keyToIncludeInAccessTokenHeader: 'X-Shopify-Access-Token',
		},
		slackOAuth2Api: {
			tokenType: 'Bearer',
			property: 'authed_user.access_token',
		},
		stravaOAuth2Api: {
			includeCredentialsOnRefreshOnBody: true,
		},
	};
	return oAuth2Options[nodeCredentialType];
};

export const configureHttpRequestFunction = async (
	ctx: IExecuteFunctions,
	credentialsType: 'predefinedCredentialType' | 'genericCredentialType' | 'none',
	itemIndex: number,
) => {
	if (credentialsType === 'genericCredentialType') {
		const genericType = ctx.getNodeParameter('genericAuthType', itemIndex) as string;

		if (genericType === 'httpBasicAuth' || genericType === 'httpDigestAuth') {
			const basicAuth = await ctx.getCredentials('httpBasicAuth', itemIndex);
			const sendImmediately = genericType === 'httpDigestAuth' ? false : undefined;

			return async (options: IHttpRequestOptions) => {
				options.auth = {
					username: basicAuth.user as string,
					password: basicAuth.password as string,
					sendImmediately,
				};
				return await ctx.helpers.httpRequest(options);
			};
		} else if (genericType === 'httpHeaderAuth') {
			const headerAuth = await ctx.getCredentials('httpHeaderAuth', itemIndex);

			return async (options: IHttpRequestOptions) => {
				options.headers![headerAuth.name as string] = headerAuth.value;
				return await ctx.helpers.httpRequest(options);
			};
		} else if (genericType === 'httpQueryAuth') {
			const queryAuth = await ctx.getCredentials('httpQueryAuth', itemIndex);

			return async (options: IHttpRequestOptions) => {
				if (!options.qs) {
					options.qs = {};
				}
				options.qs[queryAuth.name as string] = queryAuth.value;
				return await ctx.helpers.httpRequest(options);
			};
		} else if (genericType === 'httpCustomAuth') {
			const customAuth = await ctx.getCredentials('httpCustomAuth', itemIndex);

			return async (options: IHttpRequestOptions) => {
				const auth = jsonParse<IRequestOptionsSimplified>((customAuth.json as string) || '{}', {
					errorMessage: 'Invalid Custom Auth JSON',
				});
				if (auth.headers) {
					options.headers = { ...options.headers, ...auth.headers };
				}
				if (auth.body) {
					options.body = { ...(options.body as IDataObject), ...auth.body };
				}
				if (auth.qs) {
					options.qs = { ...options.qs, ...auth.qs };
				}
				return await ctx.helpers.httpRequest(options);
			};
		} else if (genericType === 'oAuth1Api') {
			return async (options: IHttpRequestOptions) => {
				return await ctx.helpers.requestOAuth1.call(ctx, 'oAuth1Api', options);
			};
		} else if (genericType === 'oAuth2Api') {
			return async (options: IHttpRequestOptions) => {
				return await ctx.helpers.requestOAuth2.call(ctx, 'oAuth1Api', options, {
					tokenType: 'Bearer',
				});
			};
		}
	} else if (credentialsType === 'predefinedCredentialType') {
		const predefinedType = ctx.getNodeParameter('nodeCredentialType', itemIndex) as string;
		const additionalOptions = getOAuth2AdditionalParameters(predefinedType);

		return async (options: IHttpRequestOptions) => {
			return await ctx.helpers.requestWithAuthentication.call(
				ctx,
				predefinedType,
				options,
				additionalOptions && { oauth2: additionalOptions },
				itemIndex,
			);
		};
	}

	return async (options: IHttpRequestOptions) => {
		return await ctx.helpers.httpRequest(options);
	};
};

export const configureResponseOptimizer = (ctx: IExecuteFunctions, itemIndex: number) => {
	const optimizeResponse = ctx.getNodeParameter('optimizeResponse', itemIndex, false) as boolean;

	if (optimizeResponse) {
		const responseType = ctx.getNodeParameter('responseType', itemIndex) as
			| 'json'
			| 'text'
			| 'html';

		let maxLength = 0;
		const truncateResponse = ctx.getNodeParameter('truncateResponse', itemIndex, false) as boolean;

		if (truncateResponse) {
			maxLength = ctx.getNodeParameter('maxLength', itemIndex, 0) as number;
		}

		if (responseType === 'html') {
			const cssSelector = ctx.getNodeParameter('cssSelector', itemIndex, '') as string;
			const onlyContent = ctx.getNodeParameter('onlyContent', itemIndex, false) as boolean;
			let elementsToOmit: string[] = [];

			if (onlyContent) {
				const elementsToOmitUi = ctx.getNodeParameter('elementsToOmit', itemIndex, '') as
					| string
					| string[];

				if (typeof elementsToOmitUi === 'string') {
					elementsToOmit = elementsToOmitUi
						.split(',')
						.filter((s) => s)
						.map((s) => s.trim());
				}
			}

			return <T>(response: T) => {
				if (typeof response !== 'string') {
					throw new NodeOperationError(
						ctx.getNode(),
						`The response type must be a string. Received: ${typeof response}`,
						{ itemIndex },
					);
				}
				const returnData: string[] = [];
				const html = cheerio.load(response);
				const htmlElements = html(cssSelector);

				htmlElements.each((_, el) => {
					let value = html(el).html() || '';

					if (onlyContent) {
						let htmlToTextOptions;

						if (elementsToOmit?.length) {
							htmlToTextOptions = {
								selectors: elementsToOmit.map((selector) => ({
									selector,
									format: 'skip',
								})),
							};
						}

						value = convert(value, htmlToTextOptions);
					}

					value = value
						.trim()
						.replace(/^\s+|\s+$/g, '')
						.replace(/(\r\n|\n|\r)/gm, '')
						.replace(/\s+/g, ' ');

					returnData.push(value);
				});

				const text = JSON.stringify(returnData, null, 2);

				if (maxLength > 0 && text.length > maxLength) {
					return text.substring(0, maxLength);
				}

				return text;
			};
		}

		if (responseType === 'text') {
			return (response: string | IDataObject) => {
				if (typeof response === 'object') {
					try {
						response = JSON.stringify(response, null, 2);
					} catch (error) {}
				}

				if (typeof response !== 'string') {
					throw new NodeOperationError(
						ctx.getNode(),
						`The response type must be a string. Received: ${typeof response}`,
						{ itemIndex },
					);
				}

				let text: string = '';

				const $ = cheerio.load(response);
				const bodyHtml = $('body').html();

				if (bodyHtml) {
					text = convert(bodyHtml, {
						selectors: [
							{ selector: 'a', options: { ignoreHref: true } },
							{ selector: 'img', format: 'skip' },
							{ selector: 'a', options: { linkBrackets: false } },
							{ selector: 'p', options: { leadingLineBreaks: 1, trailingLineBreaks: 1 } },
							{ selector: 'pre', options: { leadingLineBreaks: 1, trailingLineBreaks: 1 } },
						],
					});
				} else {
					text = response;
				}

				if (maxLength > 0 && text.length > maxLength) {
					return text.substring(0, maxLength);
				}

				return text;
			};
		}

		if (responseType === 'json') {
			return (response: string): string => {
				let responseData: IDataObject | IDataObject[] | string = response;

				if (typeof responseData === 'string') {
					responseData = jsonParse(response);
				}

				if (typeof responseData !== 'object' || !responseData) {
					throw new NodeOperationError(
						ctx.getNode(),
						'The response type must be an object or an array of objects',
						{ itemIndex },
					);
				}

				const dataField = ctx.getNodeParameter('dataField', itemIndex, '') as string;
				let returnData: IDataObject[] = [];

				if (!Array.isArray(responseData)) {
					if (dataField) {
						const data = responseData[dataField] as IDataObject | IDataObject[];
						if (Array.isArray(data)) {
							responseData = data;
						} else {
							responseData = [data];
						}
					} else {
						responseData = [responseData];
					}
				} else {
					if (dataField) {
						responseData = responseData.map((data) => data[dataField]) as IDataObject[];
					}
				}

				const fieldsToInclude = ctx.getNodeParameter('fieldsToInclude', itemIndex, 'all') as
					| 'all'
					| 'selected'
					| 'except';

				let fields: string | string[] = [];

				if (fieldsToInclude !== 'all') {
					fields = ctx.getNodeParameter('fields', itemIndex, []) as string[] | string;

					if (typeof fields === 'string') {
						fields = fields.split(',').map((field) => field.trim());
					}
				} else {
					returnData = responseData;
				}

				if (fieldsToInclude === 'selected') {
					for (const item of responseData) {
						const newItem: IDataObject = {};

						for (const field of fields) {
							set(newItem, field, get(item, field));
						}

						returnData.push(newItem);
					}
				}

				if (fieldsToInclude === 'except') {
					for (const item of responseData) {
						for (const field of fields) {
							unset(item, field);
						}

						returnData.push(item);
					}
				}

				return JSON.stringify(returnData, null, 2);
			};
		}
	}

	return <T>(response: T) => {
		if (typeof response === 'string') {
			return response;
		}
		if (typeof response === 'object') {
			return JSON.stringify(response, null, 2);
		}

		return String(response);
	};
};

const extractPlaceholders = (text: string): string[] => {
	const placeholder = /(\{[a-zA-Z0-9_]+\})/g;
	const returnData: string[] = [];

	const matches = text.matchAll(placeholder);

	for (const match of matches) {
		returnData.push(match[0].replace(/{|}/g, ''));
	}

	return returnData;
};

export const extractParametersFromText = (
	placeholders: PlaceholderDefinition[],
	text: string,
	sendIn: SendIn,
	key?: string,
): ToolParameter[] => {
	if (typeof text !== 'string') return [];

	const parameters = extractPlaceholders(text);

	if (parameters.length) {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		const inputParameters = prepareParameters(
			parameters.map((name) => ({
				name,
				valueProvider: 'modelRequired',
			})),
			placeholders,
			'keypair',
			sendIn,
			'',
		);

		return key
			? inputParameters.parameters.map((p) => ({ ...p, key }))
			: inputParameters.parameters;
	}

	return [];
};

function prepareParameters(
	rawParameters: RawParametersValues,
	placeholders: PlaceholderDefinition[],
	parametersInputType: 'model' | 'keypair' | 'json',
	sendIn: SendIn,
	modelInputDescription: string,
	jsonWithPlaceholders?: string,
): { parameters: ToolParameter[]; values: IDataObject } {
	const parameters: ToolParameter[] = [];
	const values: IDataObject = {};

	if (parametersInputType === 'model') {
		return {
			parameters: [
				{
					name: sendIn,
					required: true,
					type: 'json',
					description: modelInputDescription,
					sendIn,
				},
			],
			values: {},
		};
	}

	if (parametersInputType === 'keypair') {
		for (const entry of rawParameters) {
			if (entry.valueProvider.includes('model')) {
				const placeholder = placeholders.find((p) => p.name === entry.name);

				const parameter: ToolParameter = {
					name: entry.name,
					required: entry.valueProvider === 'modelRequired',
					sendIn,
				};

				if (placeholder) {
					parameter.type = placeholder.type;
					parameter.description = placeholder.description;
				}

				parameters.push(parameter);
			} else {
				// if value has placeholders push them to parameters
				parameters.push(
					...extractParametersFromText(placeholders, entry.value as string, sendIn, entry.name),
				);
				values[entry.name] = entry.value; //push to user provided values
			}
		}
	}

	if (parametersInputType === 'json' && jsonWithPlaceholders) {
		parameters.push(
			...extractParametersFromText(placeholders, jsonWithPlaceholders, sendIn, `${sendIn + 'Raw'}`),
		);
	}

	return {
		parameters,
		values,
	};
}

const MODEL_INPUT_DESCRIPTION = {
	qs: 'Query parameters for request as key value pairs',
	headers: 'Headers parameters for request as key value pairs',
	body: 'Body parameters for request as key value pairs',
};

export const updateParametersAndOptions = (
	ctx: IExecuteFunctions,
	itemIndex: number,
	toolParameters: ToolParameter[],
	placeholdersDefinitions: PlaceholderDefinition[],
	requestOptions: IHttpRequestOptions,
	rawRequestOptions: { [key: string]: string },
	requestOptionsProperty: 'headers' | 'qs' | 'body',
	inputTypePropertyName: string,
	jsonPropertyName: string,
	parametersPropertyName: string,
) => {
	const inputType = ctx.getNodeParameter(
		inputTypePropertyName,
		itemIndex,
		'keypair',
	) as ParameterInputType;

	let parametersValues: ParametersValues = [];

	if (inputType === 'json') {
		rawRequestOptions[requestOptionsProperty] = ctx.getNodeParameter(
			jsonPropertyName,
			itemIndex,
			'',
		) as string;
	} else {
		parametersValues = ctx.getNodeParameter(
			parametersPropertyName,
			itemIndex,
			[],
		) as ParametersValues;
	}

	const inputParameters = prepareParameters(
		parametersValues,
		placeholdersDefinitions,
		inputType,
		requestOptionsProperty,
		MODEL_INPUT_DESCRIPTION[requestOptionsProperty],
		rawRequestOptions[requestOptionsProperty],
	);

	toolParameters.push(...inputParameters.parameters);

	requestOptions[requestOptionsProperty] = {
		...(requestOptions[requestOptionsProperty] as IDataObject),
		...inputParameters.values,
	};
};

export const prepareToolDescription = (
	toolDescription: string,
	toolParameters: ToolParameter[],
) => {
	let description = `${toolDescription}`;

	if (toolParameters.length) {
		description += `
	Tool expects valid stringified JSON object with ${toolParameters.length} properties.
	Property names with description, type and required status:

	${toolParameters
		.filter((p) => p.name)
		.map(
			(p) =>
				`${p.name}: (description: ${p.description || ''}, type: ${p.type || 'string'}, required: ${!!p.required})`,
		)
		.join(',\n ')}

		ALL parameters marked as required must be provided`;
	}

	return description;
};

export const configureToolFunction = (
	ctx: IExecuteFunctions,
	itemIndex: number,
	toolParameters: ToolParameter[],
	requestOptions: IHttpRequestOptions,
	rawRequestOptions: { [key: string]: string },
	httpRequest: (options: IHttpRequestOptions) => Promise<any>,
	optimizeResponse: (response: string) => string,
) => {
	return async (query: string): Promise<string> => {
		const { index } = ctx.addInputData(NodeConnectionType.AiTool, [[{ json: { query } }]]);

		let response: string = '';
		let options: IHttpRequestOptions | null = null;
		let executionError: Error | undefined = undefined;

		if (!toolParameters.length) {
			query = '{}';
		}

		try {
			if (query) {
				let dataFromModel;

				try {
					dataFromModel = jsonParse<IDataObject>(query);
				} catch (error) {
					if (toolParameters.length === 1) {
						dataFromModel = { [toolParameters[0].name]: query };
					} else {
						throw new NodeOperationError(
							ctx.getNode(),
							`Input is not a valid JSON: ${error.message}`,
							{ itemIndex },
						);
					}
				}

				for (const parameter of toolParameters) {
					if (
						parameter.required &&
						(dataFromModel[parameter.name] === undefined || dataFromModel[parameter.name] === null)
					) {
						throw new NodeOperationError(
							ctx.getNode(),
							`Model did not provide parameter '${parameter.name}' which is required and must be present in the input`,
							{ itemIndex },
						);
					}
				}

				options = requestOptions;

				for (const parameter of toolParameters) {
					let argument = dataFromModel[parameter.name];

					if (
						argument &&
						parameter.type === 'json' &&
						!['qsRaw', 'headersRaw', 'bodyRaw'].includes(parameter.key ?? '') &&
						typeof argument !== 'object'
					) {
						try {
							argument = jsonParse(String(argument));
						} catch (error) {
							throw new NodeOperationError(
								ctx.getNode(),
								`Parameter ${parameter.name} is not a valid JSON: ${error.message}`,
								{
									itemIndex,
								},
							);
						}
					}

					if (parameter.sendIn === 'path') {
						argument = String(argument);

						//remove " or ' from start or end
						argument = argument.replace(/^['"]+|['"]+$/g, '');

						options.url = options.url.replace(`{${parameter.name}}`, argument);
						continue;
					}

					if (parameter.sendIn === parameter.name) {
						set(options, [parameter.sendIn], argument);
						continue;
					}

					if (['qsRaw', 'headersRaw', 'bodyRaw'].includes(parameter.key ?? '')) {
						//enclose string in quotes as user and model could omit them
						if (parameter.type === 'string') {
							argument = String(argument);
							if (
								!argument.startsWith('"') &&
								!rawRequestOptions[parameter.sendIn].includes(`"{${parameter.name}}"`)
							) {
								argument = `"${argument}"`;
							}
						}

						if (typeof argument === 'object') {
							argument = JSON.stringify(argument);
						}

						rawRequestOptions[parameter.sendIn] = rawRequestOptions[parameter.sendIn].replace(
							`{${parameter.name}}`,
							String(argument),
						);
						continue;
					}

					if (parameter.key) {
						let requestOptionsValue = get(options, [parameter.sendIn, parameter.key]);

						if (typeof requestOptionsValue === 'string') {
							requestOptionsValue = requestOptionsValue.replace(
								`{${parameter.name}}`,
								String(argument),
							);
						}

						set(options, [parameter.sendIn, parameter.key], requestOptionsValue);
						continue;
					}

					set(options, [parameter.sendIn, parameter.name], argument);
				}

				for (const [key, value] of Object.entries(rawRequestOptions)) {
					if (value) {
						let parsedValue;
						try {
							parsedValue = jsonParse<IDataObject>(value);
						} catch (error) {
							let recoveredData = '';
							try {
								recoveredData = value
									.replace(/'/g, '"') // Replace single quotes with double quotes
									.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Wrap keys in double quotes
									.replace(/,\s*([\]}])/g, '$1') // Remove trailing commas from objects
									.replace(/,+$/, ''); // Remove trailing comma
								parsedValue = jsonParse<IDataObject>(recoveredData);
							} catch (err) {
								throw new NodeOperationError(
									ctx.getNode(),
									`Could not replace placeholders in ${key}: ${error.message}`,
								);
							}
						}
						options[key as 'qs' | 'headers' | 'body'] = parsedValue;
					}
				}
			}

			if (options) {
				options.url = encodeURI(options.url);

				if (!Object.keys(options.headers as IDataObject).length) {
					delete options.headers;
				}

				if (!Object.keys(options.qs as IDataObject).length) {
					delete options.qs;
				}

				if (!Object.keys(options.body as IDataObject).length) {
					delete options.body;
				}
			}
		} catch (error) {
			const errorMessage = 'Input provided by model is not valid';

			if (error instanceof NodeOperationError) {
				executionError = error;
			} else {
				executionError = new NodeOperationError(ctx.getNode(), errorMessage, {
					itemIndex,
				});
			}

			response = errorMessage;
		}

		if (options) {
			try {
				response = optimizeResponse(await httpRequest(options));
			} catch (error) {
				const httpCode = (error as NodeApiError).httpCode;
				response = `${httpCode ? `HTTP ${httpCode} ` : ''}There was an error: "${error.message}"`;
			}
		}

		if (typeof response !== 'string') {
			executionError = new NodeOperationError(ctx.getNode(), 'Wrong output type returned', {
				description: `The response property should be a string, but it is an ${typeof response}`,
			});
			response = `There was an error: "${executionError.message}"`;
		}

		if (executionError) {
			void ctx.addOutputData(NodeConnectionType.AiTool, index, executionError as ExecutionError);
		} else {
			void ctx.addOutputData(NodeConnectionType.AiTool, index, [[{ json: { response } }]]);
		}

		return response;
	};
};
