import type {
	IExecuteFunctions,
	IDataObject,
	IHttpRequestOptions,
	IRequestOptionsSimplified,
	IOAuth2Options,
} from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';

import set from 'lodash/set';
import get from 'lodash/get';
import unset from 'lodash/unset';

import cheerio from 'cheerio';
import { convert } from 'html-to-text';
import type { ParametersValues, ToolParameter } from './interfaces';
import type { JSONSchema7Definition } from 'json-schema';

export const getOAuth2AdditionalParameters = (nodeCredentialType: string) => {
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

export const extractPlaceholders = (text: string): string[] => {
	const placeholder = /(\{[a-zA-Z0-9_]+\})/g;
	const returnData: string[] = [];

	const matches = text.matchAll(placeholder);

	for (const match of matches) {
		returnData.push(match[0].replace(/{|}/g, ''));
	}

	return returnData;
};

export const updatePlaceholders = (
	placeholders: ToolParameter[],
	name: string,
	required: boolean,
	type?: string,
) => {
	const placeholder = placeholders.find((p) => p.name === name);

	if (placeholder) {
		placeholder.required = required;
		if (type) placeholder.type = type;
	} else {
		placeholders.push({
			name,
			required,
			type: type ?? 'not specified',
		});
	}
};

export function prepareJSONSchema7Properties(
	parameters: ParametersValues,
	placeholders: ToolParameter[],
	parametersInputType: 'model' | 'keypair' | 'json',
	requestOptionKey: string,
	modelInputDescription: string,
): { schema: { [key: string]: JSONSchema7Definition }; values: IDataObject } {
	const schemaProperties: JSONSchema7Definition = {
		type: 'object',
		properties: {},
		required: [],
	};
	const userProvidedValues: IDataObject = {};

	if (parametersInputType === 'model') {
		return {
			schema: {
				[requestOptionKey]: {
					type: 'object',
					description: modelInputDescription,
				},
			},
			values: {},
		};
	}

	//TODO implement json input type to resolve placeholders
	if (parametersInputType === 'keypair' || parametersInputType === 'json') {
		for (const entry of parameters) {
			if (entry.valueProvider.includes('model')) {
				const placeholder = placeholders.find((p) => p.name === entry.name);
				const schemaEntry: IDataObject = {};
				const required = placeholder?.required ?? entry.valueProvider === 'modelRequired';

				if (placeholder) {
					schemaEntry.type = placeholder.type !== 'not specified' ? placeholder.type : undefined;
					schemaEntry.description = placeholder.description;
				}

				if (required) {
					schemaProperties.required!.push(entry.name);
				}

				schemaProperties.properties![entry.name] = schemaEntry;
			} else {
				userProvidedValues[entry.name] = entry.value;
			}
		}
	}

	return {
		schema: {
			[requestOptionKey]: schemaProperties,
		},
		values: userProvidedValues,
	};
}
