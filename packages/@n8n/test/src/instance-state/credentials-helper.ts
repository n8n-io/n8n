import { UnexpectedError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { getAdditionalKeys } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsExpressionResolveValues,
	IDataObject,
	IExecuteData,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	INodeParameters,
	IRequestOptionsSimplifiedAuth,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { deepCopy, ICredentialsHelper, isExpression, NodeHelpers } from 'n8n-workflow';

import { failExecution, type ExecutionSetup } from '../execution-context';
import { getCredentialProperties, getCredentialType, getParentTypes } from './credential-types';
import {
	findCredential,
	missingCredential,
	type TestCredential,
	typeMismatch,
} from './credentials';

export class TestCredentialsHelper extends ICredentialsHelper {
	constructor(private readonly context: ExecutionSetup) {
		super();
	}

	getParentTypes(type: string): string[] {
		return getParentTypes(type);
	}

	isCredentialUsableByNode(): boolean {
		return true;
	}

	getCredentialsProperties(type: string) {
		return getCredentialProperties(type);
	}

	async getDecrypted(
		additionalData: IWorkflowExecuteAdditionalData,
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		mode: WorkflowExecuteMode,
		executeData?: IExecuteData,
		raw?: boolean,
		expressionResolveValues?: ICredentialsExpressionResolveValues,
	): Promise<ICredentialDataDecryptedObject> {
		const node = executeData?.node ?? expressionResolveValues?.node;
		const credential = this.supplied(nodeCredentials, type, node?.name);
		const decrypted = raw
			? toCredentialData(deepCopy(credential.data))
			: this.resolve(
					credential,
					type,
					{ additionalData, mode, executeData, node },
					expressionResolveValues,
				);
		recordSecrets(this.context, nodeCredentials.name, type, decrypted);
		return decrypted;
	}

	private resolve(
		credential: TestCredential,
		type: string,
		{ additionalData, mode, executeData, node }: ResolveSource,
		expressionResolveValues?: ICredentialsExpressionResolveValues,
	) {
		const data = withDefaults(type, credential.data);
		const additionalKeys = getAdditionalKeys(additionalData, mode, null, { isCredential: true });
		const resolve = { data, mode, additionalKeys, executeData };
		if (expressionResolveValues) return resolveWithItem(resolve, expressionResolveValues);
		return resolveWithNode(resolve, this.context.workflow, node);
	}

	async getCredentials(): Promise<never> {
		throw new UnexpectedError('The test library holds no stored credentials');
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestOptions: IHttpRequestOptions,
		workflow?: Workflow,
		node?: INode,
	): Promise<IHttpRequestOptions> {
		const { authenticate } = getCredentialType(typeName);
		if (!authenticate) return requestOptions;
		if (typeof authenticate === 'function') return await authenticate(credentials, requestOptions);
		if (!workflow || !node) {
			throw new UnexpectedError(
				'Generic credential authentication needs the workflow and the node',
			);
		}
		const resolve = <T>(value: T) => resolveAuthValue(workflow, node, credentials, value);
		applyGenericAuth(requestOptions, authenticate.properties, resolve);
		return requestOptions;
	}

	async preAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		_node: INode,
		credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		const { properties, preAuthentication } = getCredentialType(typeName);
		const expirable = properties.find(
			(property) => property.type === 'hidden' && property.typeOptions?.expirable === true,
		);
		if (!expirable || typeof preAuthentication !== 'function') return undefined;
		if (credentials[expirable.name] !== '' && !credentialsExpired) return undefined;

		const output = await preAuthentication.call(helpers, credentials);
		if (output[expirable.name] === undefined) return undefined;
		return Object.assign(credentials, output);
	}

	async runPreAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		const { preAuthentication } = getCredentialType(typeName);
		if (typeof preAuthentication !== 'function') return undefined;
		const output = await preAuthentication.call(helpers, credentials);
		return isCredentialData(output) ? output : undefined;
	}

	async updateCredentials(): Promise<void> {}

	async updateCredentialsOauthTokenData(): Promise<void> {}

	private supplied(
		details: INodeCredentialsDetails,
		type: string,
		node: string | undefined,
	): TestCredential {
		const credential = findCredential(this.context, node ?? '', details);
		if (!credential) {
			return failExecution(this.context, missingCredential(this.context, node, type, details.name));
		}
		const mismatch = typeMismatch(this.context, node ?? '', type, credential);
		if (mismatch) return failExecution(this.context, mismatch);
		return credential;
	}
}

interface ResolveSource {
	additionalData: IWorkflowExecuteAdditionalData;
	mode: WorkflowExecuteMode;
	executeData?: IExecuteData;
	node?: INode;
}

interface CredentialResolution {
	data: INodeParameters;
	mode: WorkflowExecuteMode;
	additionalKeys: IWorkflowDataProxyAdditionalKeys;
	executeData?: IExecuteData;
}

function withDefaults(type: string, data: INodeParameters): INodeParameters {
	const properties = getCredentialProperties(type);
	const withTypeDefaults = NodeHelpers.getNodeParameters(properties, data, true, false, null, null);
	if (data.oauthTokenData === undefined) return { ...withTypeDefaults };
	return { ...withTypeDefaults, oauthTokenData: data.oauthTokenData };
}

function resolveWithItem(
	{ data, mode, additionalKeys, executeData }: CredentialResolution,
	values: ICredentialsExpressionResolveValues,
) {
	const resolved = values.workflow.expression.getParameterValue(
		data,
		values.runExecutionData,
		values.runIndex,
		values.itemIndex,
		values.node.name,
		values.connectionInputData,
		mode,
		additionalKeys,
		executeData,
		false,
		data,
	);
	return toCredentialData(resolved);
}

function resolveWithNode(
	{ data, mode, additionalKeys, executeData }: CredentialResolution,
	workflow: Workflow,
	node: INode | undefined,
) {
	if (!node) throw new UnexpectedError('Credential data needs a node to resolve its expressions');
	const resolved = workflow.expression.getComplexParameterValue(
		node,
		data,
		mode,
		additionalKeys,
		executeData,
		undefined,
		data,
	);
	return toCredentialData(resolved);
}

function recordSecrets(
	context: ExecutionSetup,
	name: string,
	type: string,
	data: ICredentialDataDecryptedObject,
) {
	const record = (field: string, value: unknown) => {
		if (typeof value !== 'string') return;
		if (context.redactions.some((redaction) => redaction.value === value)) return;
		context.redactions.push({ placeholder: `[credential: ${name}.${field}]`, value });
	};
	for (const property of getCredentialProperties(type)) {
		if (property.typeOptions?.password) record(property.name, data[property.name]);
	}
	const { oauthTokenData } = data;
	if (isRecord(oauthTokenData)) {
		record('oauthTokenData.access_token', oauthTokenData.access_token);
	}
}

function toCredentialData(value: unknown): ICredentialDataDecryptedObject {
	if (isCredentialData(value)) return value;
	throw new UnexpectedError('Credential data did not resolve to an object');
}

function isCredentialData(value: unknown): value is ICredentialDataDecryptedObject {
	return isRecord(value);
}

function resolveAuthValue<T>(
	workflow: Workflow,
	node: INode,
	credentials: ICredentialDataDecryptedObject,
	value: T,
): T | string {
	if (!isExpression(value)) return value;
	const resolved = workflow.expression.getSimpleParameterValue(
		node,
		value,
		'internal',
		{ $credentials: credentials },
		undefined,
		'',
	);
	return resolved ? String(resolved) : '';
}

function applyGenericAuth(
	options: IHttpRequestOptions,
	{ headers, qs, body, auth }: IRequestOptionsSimplifiedAuth,
	resolve: <T>(value: T) => T | string,
) {
	const resolveAll = (values: IDataObject) =>
		Object.fromEntries(
			Object.entries(values).map(([key, value]) => [String(resolve(key)), resolve(value)]),
		);
	if (headers) options.headers = Object.assign(options.headers ?? {}, resolveAll(headers));
	if (qs) options.qs = Object.assign(options.qs ?? {}, resolveAll(qs));
	if (body)
		options.body = Object.assign(isRecord(options.body) ? options.body : {}, resolveAll(body));
	if (auth) {
		options.auth = {
			...auth,
			username: String(resolve(auth.username)),
			password: String(resolve(auth.password)),
		};
	}
}
