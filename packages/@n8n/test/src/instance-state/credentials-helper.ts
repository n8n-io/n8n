import { UnexpectedError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import {
	authenticateCredential,
	prepareCredentialData,
	preAuthenticateCredential,
	runCredentialPreAuthentication,
} from 'n8n/dist/testing.js';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsExpressionResolveValues,
	IExecuteData,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { deepCopy, ICredentialsHelper } from 'n8n-workflow';

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
		const node = expressionResolveValues?.node ?? executeData?.node;
		const credential = this.supplied(nodeCredentials, type, node?.name);
		const decrypted = raw
			? toCredentialData(deepCopy(credential.data))
			: await prepareCredentialData({
					credentialType: getCredentialType(type),
					properties: getCredentialProperties(type),
					data: toCredentialData(deepCopy(credential.data)),
					applyOverwrite: (data) => data,
					additionalData,
					mode,
					executeData,
					expressionResolveValues,
				});
		recordSecrets(this.context, nodeCredentials.name, type, decrypted);
		return decrypted;
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
		return await authenticateCredential(
			getCredentialType(typeName),
			credentials,
			requestOptions,
			workflow,
			node,
		);
	}

	async preAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		node: INode,
		credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		const prepared = await preAuthenticateCredential({
			credentialType: getCredentialType(typeName),
			helpers,
			credentials,
			node,
			credentialsExpired,
		});
		return prepared && Object.assign(credentials, prepared.data);
	}

	async runPreAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		return await runCredentialPreAuthentication(getCredentialType(typeName), helpers, credentials);
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
