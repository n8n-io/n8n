import type {
	IExecuteFunctions,
	IDataObject,
	IHttpRequestOptions,
	IRequestOptionsSimplified,
	IOAuth2Options,
	ExecutionError,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, jsonParse } from 'n8n-workflow';

import set from 'lodash/set';
import get from 'lodash/get';
import unset from 'lodash/unset';

import cheerio from 'cheerio';
import { convert } from 'html-to-text';
import type {
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

export const prettifyToolName = (toolName: string) => {
	const capitalize = (str: string) => {
		const chars = str.split('');
		chars[0] = chars[0].toUpperCase();
		return chars.join('');
	};

	return toolName.split('_').map(capitalize).join(' ');
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

				return JSON.stringify(returnData, null, 2);
			};
		}

		if (responseType === 'text') {
			const maxLength = ctx.getNodeParameter('maxLength', itemIndex, 0) as number;

			return <T>(response: T) => {
				if (typeof response !== 'string') {
					throw new NodeOperationError(
						ctx.getNode(),
						`The response type must be a string. Received: ${typeof response}`,
						{ itemIndex },
					);
				}
				if (maxLength > 0 && response.length > maxLength) {
					return response.substring(0, maxLength);
				}

				return response;
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

export function prepareParameters(
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
		let executionError: Error | undefined = undefined;

		try {
			if (query && toolParameters.length) {
				let queryParset;

				try {
					queryParset = jsonParse<IDataObject>(query);
				} catch (error) {
					if (toolParameters.length === 1) {
						queryParset = { [toolParameters[0].name]: query };
					} else {
						throw new NodeOperationError(
							ctx.getNode(),
							`Input is not a valid JSON: ${error.message}`,
							{ itemIndex },
						);
					}
				}

				for (const parameter of toolParameters) {
					let parameterValue = queryParset[parameter.name];

					if (parameterValue === undefined && parameter.required) {
						throw new NodeOperationError(
							ctx.getNode(),
							`Model did not provided required parameter: ${parameter.name}`,
							{
								itemIndex,
							},
						);
					}

					if (
						parameterValue &&
						parameter.type === 'json' &&
						!['qsRaw', 'headersRaw', 'bodyRaw'].includes(parameter.key ?? '') &&
						typeof parameterValue !== 'object'
					) {
						try {
							parameterValue = jsonParse(String(parameterValue));
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
						requestOptions.url = requestOptions.url.replace(
							`{${parameter.name}}`,
							encodeURIComponent(String(parameterValue)),
						);

						continue;
					}

					if (parameter.sendIn === parameter.name) {
						set(requestOptions, [parameter.sendIn], parameterValue);

						continue;
					}

					if (['qsRaw', 'headersRaw', 'bodyRaw'].includes(parameter.key ?? '')) {
						if (parameter.type === 'string') {
							parameterValue = String(parameterValue);
							if (
								!parameterValue.startsWith('"') &&
								!rawRequestOptions[parameter.sendIn].includes(`"{${parameter.name}}"`)
							) {
								parameterValue = `"${parameterValue}"`;
							}
						}

						if (typeof parameterValue === 'object') {
							parameterValue = JSON.stringify(parameterValue);
						}

						rawRequestOptions[parameter.sendIn] = rawRequestOptions[parameter.sendIn].replace(
							`{${parameter.name}}`,
							String(parameterValue),
						);

						continue;
					}

					if (parameter.key) {
						let requestOptionsValue = get(requestOptions, [parameter.sendIn, parameter.key]);

						if (typeof requestOptionsValue === 'string') {
							requestOptionsValue = requestOptionsValue.replace(
								`{${parameter.name}}`,
								String(parameterValue),
							);
						}

						set(requestOptions, [parameter.sendIn, parameter.key], requestOptionsValue);

						continue;
					}

					set(requestOptions, [parameter.sendIn, parameter.name], parameterValue);
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
						requestOptions[key as 'qs' | 'headers' | 'body'] = parsedValue;
					}
				}
			}

			if (!Object.keys(requestOptions.headers as IDataObject).length) {
				delete requestOptions.headers;
			}

			if (!Object.keys(requestOptions.qs as IDataObject).length) {
				delete requestOptions.qs;
			}

			if (!Object.keys(requestOptions.body as IDataObject).length) {
				delete requestOptions.body;
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

		try {
			response = optimizeResponse(await httpRequest(requestOptions));
		} catch (error) {
			response = `There was an error: "${error.message}"`;
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
