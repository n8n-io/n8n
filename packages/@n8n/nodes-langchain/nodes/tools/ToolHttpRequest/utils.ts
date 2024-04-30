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

export type ToolParameter = {
	name: string;
	type: 'any' | 'string' | 'number' | 'boolean';
	description: string;
};

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
	auth: 'predefinedCredentialType' | 'genericCredentialType' | 'none',
	itemIndex: number,
) => {
	if (auth === 'genericCredentialType') {
		const genericCredentialType = ctx.getNodeParameter('genericAuthType', itemIndex) as string;

		if (genericCredentialType === 'httpBasicAuth' || genericCredentialType === 'httpDigestAuth') {
			const httpBasicAuth = await ctx.getCredentials('httpBasicAuth', itemIndex);
			const sendImmediately = genericCredentialType === 'httpDigestAuth' ? false : undefined;
			return async (requestOptions: IHttpRequestOptions) => {
				requestOptions.auth = {
					username: httpBasicAuth.user as string,
					password: httpBasicAuth.password as string,
					sendImmediately,
				};
				return await ctx.helpers.httpRequest(requestOptions);
			};
		} else if (genericCredentialType === 'httpHeaderAuth') {
			const httpHeaderAuth = await ctx.getCredentials('httpHeaderAuth', itemIndex);
			return async (requestOptions: IHttpRequestOptions) => {
				requestOptions.headers![httpHeaderAuth.name as string] = httpHeaderAuth.value;
				return await ctx.helpers.httpRequest(requestOptions);
			};
		} else if (genericCredentialType === 'httpQueryAuth') {
			const httpQueryAuth = await ctx.getCredentials('httpQueryAuth', itemIndex);
			return async (requestOptions: IHttpRequestOptions) => {
				if (!requestOptions.qs) {
					requestOptions.qs = {};
				}
				requestOptions.qs[httpQueryAuth.name as string] = httpQueryAuth.value;
				return await ctx.helpers.httpRequest(requestOptions);
			};
		} else if (genericCredentialType === 'httpCustomAuth') {
			const httpCustomAuth = await ctx.getCredentials('httpCustomAuth', itemIndex);
			return async (requestOptions: IHttpRequestOptions) => {
				const customAuth = jsonParse<IRequestOptionsSimplified>(
					(httpCustomAuth.json as string) || '{}',
					{ errorMessage: 'Invalid Custom Auth JSON' },
				);
				if (customAuth.headers) {
					requestOptions.headers = { ...requestOptions.headers, ...customAuth.headers };
				}
				if (customAuth.body) {
					requestOptions.body = { ...(requestOptions.body as IDataObject), ...customAuth.body };
				}
				if (customAuth.qs) {
					requestOptions.qs = { ...requestOptions.qs, ...customAuth.qs };
				}
				return await ctx.helpers.httpRequest(requestOptions);
			};
		} else if (genericCredentialType === 'oAuth1Api') {
			return async (requestOptions: IHttpRequestOptions) => {
				return await ctx.helpers.requestOAuth1.call(ctx, 'oAuth1Api', requestOptions);
			};
		} else if (genericCredentialType === 'oAuth2Api') {
			return async (requestOptions: IHttpRequestOptions) => {
				return await ctx.helpers.requestOAuth2.call(ctx, 'oAuth1Api', requestOptions, {
					tokenType: 'Bearer',
				});
			};
		}
	} else if (auth === 'predefinedCredentialType') {
		const nodeCredentialType = ctx.getNodeParameter('nodeCredentialType', itemIndex) as string;
		const additionalOAuth2Options = getOAuth2AdditionalParameters(nodeCredentialType);

		return async (requestOptions: IHttpRequestOptions) => {
			return await ctx.helpers.requestWithAuthentication.call(
				ctx,
				nodeCredentialType,
				requestOptions,
				additionalOAuth2Options && { oauth2: additionalOAuth2Options },
				itemIndex,
			);
		};
	}

	return async (requestOptions: IHttpRequestOptions) => {
		return await ctx.helpers.httpRequest(requestOptions);
	};
};

export const configureResponseOptimizer = (ctx: IExecuteFunctions, itemIndex: number) => {
	const optimizeToolResponse = ctx.getNodeParameter(
		'optimizeToolResponse',
		itemIndex,
		false,
	) as boolean;

	if (optimizeToolResponse) {
		const responseType = ctx.getNodeParameter('responseType', itemIndex) as
			| 'object'
			| 'array'
			| 'text'
			| 'html';

		if (responseType === 'html') {
			const cssSelector = ctx.getNodeParameter('cssSelector', itemIndex, '') as string;
			const onlyText = ctx.getNodeParameter('onlyText', itemIndex, false) as boolean;
			let skipSelectors = '';
			if (onlyText) {
				skipSelectors = ctx.getNodeParameter('skipSelectors', itemIndex, '') as string;
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

					if (onlyText) {
						let options;
						if (skipSelectors) {
							options = {
								selectors: skipSelectors.split(',').map((s) => ({
									selector: s.trim(),
									format: 'skip',
								})),
							};
						}
						value = convert(value, options);
					}

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

		if (responseType === 'object' || responseType === 'array') {
			return (response: IDataObject | IDataObject[]): string => {
				if (typeof response !== 'object' || !response) {
					throw new NodeOperationError(
						ctx.getNode(),
						'The response type must be an object or an array of objects',
						{ itemIndex },
					);
				}
				let returnData: IDataObject[] = [];

				if (!Array.isArray(response)) {
					response = [response];
				}

				if (responseType === 'array') {
					const returnAll = ctx.getNodeParameter('returnAll', itemIndex, false) as boolean;

					if (!returnAll) {
						const limit = ctx.getNodeParameter('limit', itemIndex, 50);

						response = response.slice(0, limit);
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
					returnData = response;
				}

				if (fieldsToInclude === 'selected') {
					for (const item of response) {
						const newItem: IDataObject = {};

						for (const field of fields) {
							set(newItem, field, get(item, field));
						}

						returnData.push(newItem);
					}
				}

				if (fieldsToInclude === 'except') {
					for (const item of response) {
						for (const field of fields) {
							unset(item, field);
						}

						returnData.push(item);
					}
				}

				if (responseType === 'object') {
					return JSON.stringify(returnData[0], null, 2);
				} else {
					return JSON.stringify(returnData, null, 2);
				}
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
