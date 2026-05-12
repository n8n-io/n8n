import type { InstanceAiEvalMockedCredential } from '@n8n/api-types';
import type {
	ICredentialDataDecryptedObject,
	ICredentials,
	ICredentialsExpressionResolveValues,
	IExecuteData,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	INodeProperties,
	IRequestOptionsSimplified,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ICredentialsHelper } from 'n8n-workflow';

import { CredentialNotFoundError } from '@/errors/credential-not-found.error';

const MOCK_MARKER = '__evalMockedCredential' as const;

/**
 * CredentialsHelper proxy for evaluation runs. Delegates everything to the
 * wrapped real helper, except:
 *
 *   - `getDecrypted`: when a credential ID cannot be resolved, returns a
 *     marker-only payload instead of throwing. This stops the credential
 *     lookup from halting the workflow before the LLM mock layer can run.
 *
 *   - `authenticate` / `preAuthentication` / `runPreAuthentication`: when
 *     called with a marker payload, return the input unchanged so the
 *     unauthed request flows into `helpers.httpRequest`, where the LLM
 *     mock handler intercepts and synthesizes a response.
 *
 * Eval-mode HTTP never reaches real services, so credential data shape is
 * irrelevant — the only contract we preserve is that the auth path doesn't
 * throw on missing data.
 */
export class EvalMockedCredentialsHelper extends ICredentialsHelper {
	readonly mockedCredentials: InstanceAiEvalMockedCredential[] = [];

	constructor(private readonly inner: ICredentialsHelper) {
		super();
	}

	getParentTypes(name: string): string[] {
		return this.inner.getParentTypes(name);
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
		workflow: Workflow,
		node: INode,
	): Promise<IHttpRequestOptions> {
		if (credentials[MOCK_MARKER] === true) {
			return requestOptions as IHttpRequestOptions;
		}
		return await this.inner.authenticate(credentials, typeName, requestOptions, workflow, node);
	}

	async preAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		node: INode,
		credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		if (credentials[MOCK_MARKER] === true) return credentials;
		return await this.inner.preAuthentication(
			helpers,
			credentials,
			typeName,
			node,
			credentialsExpired,
		);
	}

	async runPreAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		if (credentials[MOCK_MARKER] === true) return credentials;
		return await this.inner.runPreAuthentication(helpers, credentials, typeName);
	}

	async getCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<ICredentials> {
		return await this.inner.getCredentials(nodeCredentials, type);
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
		try {
			return await this.inner.getDecrypted(
				additionalData,
				nodeCredentials,
				type,
				mode,
				executeData,
				raw,
				expressionResolveValues,
			);
		} catch (error) {
			if (!(error instanceof CredentialNotFoundError)) throw error;

			this.mockedCredentials.push({
				nodeName: executeData?.node?.name ?? 'unknown',
				credentialType: type,
				credentialId: nodeCredentials.id ?? undefined,
			});

			return { [MOCK_MARKER]: true };
		}
	}

	async updateCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<void> {
		return await this.inner.updateCredentials(nodeCredentials, type, data);
	}

	async updateCredentialsOauthTokenData(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		data: ICredentialDataDecryptedObject,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<void> {
		return await this.inner.updateCredentialsOauthTokenData(
			nodeCredentials,
			type,
			data,
			additionalData,
		);
	}

	getCredentialsProperties(type: string): INodeProperties[] {
		return this.inner.getCredentialsProperties(type);
	}
}
