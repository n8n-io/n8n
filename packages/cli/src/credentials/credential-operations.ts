import { UnexpectedError, UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { getAdditionalKeys } from 'n8n-core';
import type {
	CredentialInformation,
	ICredentialDataDecryptedObject,
	ICredentialType,
	ICredentialsExpressionResolveValues,
	IExecuteData,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeParameters,
	INodeProperties,
	IRequestOptionsSimplified,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	getCredentialOwnRequestAllowedDomains,
	isExpression,
	jsonParse,
	NodeHelpers,
	Workflow,
} from 'n8n-workflow';

import { DCR_MANAGED_CREDENTIAL_FIELDS, OAUTH_PINNED_FIELDS } from '../oauth/dcr-managed-fields';
import { createMockNodeTypes } from './mock-node-types';

const mockNode: INode = {
	id: 'credential-expression',
	name: '',
	typeVersion: 1,
	type: 'mock',
	position: [0, 0],
	parameters: {},
};
const { nodeTypes: mockNodeTypes } = createMockNodeTypes();
const INVALID_JSON_VALUE = Symbol('invalidJsonValue');

interface CredentialPreparation {
	credentialType: ICredentialType;
	properties: INodeProperties[];
	data: ICredentialDataDecryptedObject;
	applyOverwrite(data: ICredentialDataDecryptedObject): ICredentialDataDecryptedObject;
	additionalData: IWorkflowExecuteAdditionalData;
	mode: WorkflowExecuteMode;
	executeData?: IExecuteData;
	expressionResolveValues?: ICredentialsExpressionResolveValues;
}

export async function prepareCredentialData({
	credentialType,
	properties: credentialsProperties,
	data: decryptedDataOriginal,
	applyOverwrite,
	additionalData,
	mode,
	executeData,
	expressionResolveValues,
}: CredentialPreparation): Promise<ICredentialDataDecryptedObject> {
	const dynamicClientRegistration = !!credentialType.dynamicClientRegistration;

	const storedData = { ...decryptedDataOriginal };
	for (const field of OAUTH_PINNED_FIELDS) {
		if (dynamicClientRegistration && field === 'useDynamicClientRegistration') continue;
		if (credentialsProperties.some((p) => p.name === field && p.type === 'hidden')) {
			delete storedData[field];
		}
	}

	const dataWithOverwrites = applyOverwrite(storedData);

	let decryptedData = toCredentialData(
		NodeHelpers.getNodeParameters(
			credentialsProperties,
			dataWithOverwrites as INodeParameters,
			true,
			false,
			null,
			null,
		),
	);

	if (decryptedDataOriginal.oauthTokenData !== undefined) {
		decryptedData.oauthTokenData = decryptedDataOriginal.oauthTokenData;
	}

	if (
		decryptedData.allowedHttpRequestDomains === undefined &&
		decryptedDataOriginal.allowedHttpRequestDomains !== undefined
	) {
		decryptedData.allowedHttpRequestDomains = decryptedDataOriginal.allowedHttpRequestDomains;
	}
	if (
		decryptedData.allowedDomains === undefined &&
		decryptedDataOriginal.allowedDomains !== undefined
	) {
		decryptedData.allowedDomains = decryptedDataOriginal.allowedDomains;
	}

	if (decryptedData.useDynamicClientRegistration) {
		for (const field of DCR_MANAGED_CREDENTIAL_FIELDS) {
			decryptedData[field] = decryptedDataOriginal[field];
		}
	}

	const parsedJsonLeafExpressionFields = parseJsonLeafExpressionFields(
		credentialsProperties,
		decryptedData,
	);

	const additionalKeys = getAdditionalKeys(additionalData, mode, null, {
		isCredential: true,
	});

	const selfData = { ...decryptedData };
	for (const { name, typeOptions } of credentialsProperties) {
		if (
			(typeOptions?.password || typeOptions?.expirable) &&
			dataWithOverwrites[name] !== storedData[name]
		) {
			delete selfData[name];
		}
	}

	if (expressionResolveValues) {
		try {
			decryptedData = toCredentialData(
				expressionResolveValues.workflow.expression.getParameterValue(
					decryptedData as INodeParameters,
					expressionResolveValues.runExecutionData,
					expressionResolveValues.runIndex,
					expressionResolveValues.itemIndex,
					expressionResolveValues.node.name,
					expressionResolveValues.connectionInputData,
					mode,
					additionalKeys,
					executeData,
					false,
					selfData,
				),
			);
		} catch (e) {
			e.message += ' [Error resolving credentials]';
			throw e;
		}
	} else {
		const workflow = new Workflow({
			nodes: [mockNode],
			connections: {},
			active: false,
			nodeTypes: mockNodeTypes,
		});

		await workflow.expression.acquireIsolate();
		try {
			decryptedData = resolveCredentialExpressions(
				workflow,
				credentialsProperties,
				decryptedData,
				mode,
				additionalKeys,
				selfData,
			);
		} finally {
			await workflow.expression.releaseIsolate();
		}
	}

	stringifyJsonLeafExpressionFields(decryptedData, parsedJsonLeafExpressionFields);

	return decryptedData;
}

function resolveCredentialExpressions(
	workflow: Workflow,
	credentialsProperties: INodeProperties[],
	decryptedData: ICredentialDataDecryptedObject,
	mode: WorkflowExecuteMode,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
	selfData: ICredentialDataDecryptedObject,
): ICredentialDataDecryptedObject {
	try {
		return toCredentialData(
			workflow.expression.getComplexParameterValue(
				mockNode,
				decryptedData as INodeParameters,
				mode,
				additionalKeys,
				undefined,
				undefined,
				selfData,
			),
		);
	} catch (error) {
		return resolveCredentialExpressionsByProperty(
			workflow,
			credentialsProperties,
			decryptedData,
			mode,
			additionalKeys,
			selfData,
			error,
		);
	}
}

function resolveCredentialExpressionsByProperty(
	workflow: Workflow,
	credentialsProperties: INodeProperties[],
	decryptedData: ICredentialDataDecryptedObject,
	mode: WorkflowExecuteMode,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
	selfData: ICredentialDataDecryptedObject,
	originalError: unknown,
): ICredentialDataDecryptedObject {
	const propertiesByName = new Map(
		credentialsProperties.map((property) => [property.name, property]),
	);
	const resolvedData: ICredentialDataDecryptedObject = {};

	for (const [propertyName, propertyValue] of Object.entries(decryptedData)) {
		try {
			const resolvedProperty = toCredentialData(
				workflow.expression.getComplexParameterValue(
					mockNode,
					{ [propertyName]: propertyValue } as INodeParameters,
					mode,
					additionalKeys,
					undefined,
					undefined,
					selfData,
				),
			);

			if (Object.prototype.hasOwnProperty.call(resolvedProperty, propertyName)) {
				resolvedData[propertyName] = resolvedProperty[propertyName];
			}
		} catch {
			const credentialProperty = propertiesByName.get(propertyName);
			if (credentialProperty?.typeOptions?.ignoreCredentialExpressionResolveError === true) {
				continue;
			}

			throw originalError;
		}
	}

	return resolvedData;
}

function parseJsonLeafExpressionFields(
	credentialsProperties: INodeProperties[],
	decryptedData: ICredentialDataDecryptedObject,
): Map<string, string> {
	const parsedFields = new Map<string, string>();

	for (const property of credentialsProperties) {
		if (!property.typeOptions?.resolveCredentialJsonLeaves) continue;

		const value = decryptedData[property.name];
		if (typeof value !== 'string' || value === '') continue;

		const parsed = jsonParse<CredentialInformation | typeof INVALID_JSON_VALUE>(value, {
			fallbackValue: INVALID_JSON_VALUE,
		});
		if (parsed === INVALID_JSON_VALUE) continue;

		parsedFields.set(property.name, value);
		decryptedData[property.name] = parsed;
	}

	return parsedFields;
}

function stringifyJsonLeafExpressionFields(
	decryptedData: ICredentialDataDecryptedObject,
	parsedFields: Map<string, string>,
) {
	for (const [propertyName, originalValue] of parsedFields) {
		const serializedValue = JSON.stringify(decryptedData[propertyName]);
		decryptedData[propertyName] = serializedValue ?? originalValue;
	}
}

export async function authenticateCredential(
	credentialType: ICredentialType,
	credentials: ICredentialDataDecryptedObject,
	incomingRequestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
	workflow?: Workflow,
	node?: INode,
): Promise<IHttpRequestOptions> {
	const requestOptions = incomingRequestOptions as IHttpRequestOptions;
	const { authenticate } = credentialType;
	if (!authenticate) return requestOptions;
	if (typeof authenticate === 'function') return await authenticate(credentials, requestOptions);
	if (!workflow || !node) {
		throw new UnexpectedError(
			'Workflow and node are required for declarative credential authentication',
		);
	}
	requestOptions.headers ??= {};
	const resolve = (value: unknown): unknown => {
		if (!isExpression(value)) return value;
		const result = workflow.expression.getSimpleParameterValue(
			node,
			value,
			'internal',
			{ $credentials: credentials },
			undefined,
			'',
		);
		return result ? result.toString() : '';
	};
	for (const [section, properties] of Object.entries(authenticate.properties)) {
		const values = Object.fromEntries(
			Object.entries(properties).map(([key, value]) => [String(resolve(key)), resolve(value)]),
		);
		const current: unknown = Reflect.get(requestOptions, section);
		if (!current) {
			Reflect.set(requestOptions, section, values);
		} else if (isRecord(current)) {
			Object.assign(current, values);
		} else {
			throw new UnexpectedError(`Credential authentication cannot update ${section}`);
		}
	}
	return requestOptions;
}

interface CredentialPreAuthentication {
	credentialType: ICredentialType;
	helpers: IHttpRequestHelper;
	credentials: ICredentialDataDecryptedObject;
	node: INode;
	credentialsExpired: boolean;
}

export async function preAuthenticateCredential({
	credentialType,
	helpers,
	credentials,
	node,
	credentialsExpired,
}: CredentialPreAuthentication): Promise<
	{ data: ICredentialDataDecryptedObject; property: string } | undefined
> {
	const property = credentialType.properties.find(
		(property) => property.type === 'hidden' && property.typeOptions?.expirable === true,
	);
	if (!property) return undefined;
	const isTestingCredentials = node?.parameters?.temp === '' && node.type === 'n8n-nodes-base.noOp';
	if (credentials[property.name] !== '' && !credentialsExpired && !isTestingCredentials)
		return undefined;
	const data = await runCredentialPreAuthentication(credentialType, helpers, credentials);
	if (data?.[property.name] === undefined) return undefined;
	return { data, property: property.name };
}

export async function runCredentialPreAuthentication(
	credentialType: ICredentialType,
	helpers: IHttpRequestHelper,
	credentials: ICredentialDataDecryptedObject,
): Promise<ICredentialDataDecryptedObject | undefined> {
	if (typeof credentialType.preAuthentication !== 'function') return undefined;
	const output: unknown = await credentialType.preAuthentication.call(
		restrictToCredentialDomains(helpers, credentials),
		credentials,
	);
	return isCredentialData(output) ? output : undefined;
}

function restrictToCredentialDomains(
	helpers: IHttpRequestHelper,
	credentials: ICredentialDataDecryptedObject,
): IHttpRequestHelper {
	return {
		helpers: {
			httpRequest: async (requestOptions: IHttpRequestOptions): Promise<unknown> => {
				const allowedDomains = getCredentialOwnRequestAllowedDomains(credentials);
				if (allowedDomains === undefined) {
					return await helpers.helpers.httpRequest(requestOptions);
				}

				if (requestOptions.allowedDomains !== undefined) {
					throw new UserError(
						'This credential restricts requests to specific domains, which cannot be combined with the domains its authentication step asks for.',
					);
				}

				return await helpers.helpers.httpRequest({ ...requestOptions, allowedDomains });
			},
		},
	};
}

function isCredentialData(value: unknown): value is ICredentialDataDecryptedObject {
	return isRecord(value);
}

function toCredentialData(value: unknown): ICredentialDataDecryptedObject {
	if (isCredentialData(value)) return value;
	throw new UnexpectedError('Credential data did not resolve to an object');
}
