import { ClientOAuth2 } from '@n8n/client-oauth2';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type {
	AINodeConnectionType,
	CloseFunction,
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteData,
	IFormUser,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ITaskDataConnections,
	IUser,
	IWebhookData,
	IWebhookFunctions,
	IWorkflowExecuteAdditionalData,
	WebhookType,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError, createDeferredPromise, createEmptyRunExecutionData } from 'n8n-workflow';

import { NodeExecutionContext } from './node-execution-context';
import { copyBinaryFile, getBinaryHelperFunctions } from './utils/binary-helper-functions';
import { getInputConnectionData } from './utils/get-input-connection-data';
import { getRequestHelperFunctions } from './utils/request-helper-functions';
import { returnJsonArray } from './utils/return-json-array';
import { getNodeWebhookUrl } from './utils/webhook-helper-functions';
import {
	createWebhookOAuth2State,
	generatePKCECodeChallenge,
	generatePKCECodeVerifier,
	verifyWebhookOAuth2State,
} from './utils/webhook-oauth2-helpers';

export class WebhookContext extends NodeExecutionContext implements IWebhookFunctions {
	readonly helpers: IWebhookFunctions['helpers'];

	readonly nodeHelpers: IWebhookFunctions['nodeHelpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		private readonly webhookData: IWebhookData,
		private readonly closeFunctions: CloseFunction[],
		runExecutionData: IRunExecutionData | null,
	) {
		let connectionInputData: INodeExecutionData[] = [];
		let executionData: IExecuteData | undefined;

		if (runExecutionData?.executionData !== undefined) {
			executionData = runExecutionData.executionData.nodeExecutionStack[0];
			if (executionData !== undefined) {
				connectionInputData = executionData.data.main[0]!;
			}
		}

		super(
			workflow,
			node,
			additionalData,
			mode,
			runExecutionData,
			0,
			connectionInputData,
			executionData,
		);

		this.helpers = {
			createDeferredPromise,
			returnJsonArray,
			...getRequestHelperFunctions(workflow, node, additionalData),
			...getBinaryHelperFunctions(additionalData, workflow.id),
		};

		this.nodeHelpers = {
			copyBinaryFile: async (filePath, fileName, mimeType) =>
				await copyBinaryFile(
					this.workflow.id,
					this.additionalData.executionId!,
					filePath,
					fileName,
					mimeType,
				),
		};
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		return await this._getCredentials<T>(type);
	}

	getBodyData() {
		return this.assertHttpRequest().body as IDataObject;
	}

	getHeaderData() {
		return this.assertHttpRequest().headers;
	}

	getParamsData(): object {
		return this.assertHttpRequest().params;
	}

	getQueryData(): object {
		return this.assertHttpRequest().query;
	}

	getRequestObject(): Request {
		return this.assertHttpRequest();
	}

	getResponseObject(): Response {
		if (this.additionalData.httpResponse === undefined) {
			throw new ApplicationError('Response is missing');
		}
		return this.additionalData.httpResponse;
	}

	private assertHttpRequest() {
		const { httpRequest } = this.additionalData;
		if (httpRequest === undefined) {
			throw new ApplicationError('Request is missing');
		}
		return httpRequest;
	}

	getNodeWebhookUrl(name: WebhookType): string | undefined {
		return getNodeWebhookUrl(
			name,
			this.workflow,
			this.node,
			this.additionalData,
			this.mode,
			this.additionalKeys,
		);
	}

	getWebhookName() {
		return this.webhookData.webhookDescription.name;
	}

	async validateCookieAuth(cookieValue: string): Promise<IUser> {
		if (!this.additionalData.validateCookieAuth) {
			throw new ApplicationError('Cookie auth validation is not available');
		}
		return await this.additionalData.validateCookieAuth(cookieValue);
	}

	async buildWebhookOAuth2RedirectUrl(): Promise<string> {
		const req = this.assertHttpRequest();
		const credentials = await this.getCredentials('webhookOAuth2Api');
		const returnUrl = req.originalUrl;
		const callbackUrl = `${this.additionalData.restApiUrl}/oauth2-credential/webhook-callback`;

		const isPkce = credentials.grantType === 'pkce';
		let codeVerifier: string | undefined;
		const queryAdditions: Record<string, string> = {};
		if (isPkce) {
			codeVerifier = generatePKCECodeVerifier();
			queryAdditions.code_challenge = generatePKCECodeChallenge(codeVerifier);
			queryAdditions.code_challenge_method = 'S256';
		}

		const state = createWebhookOAuth2State(returnUrl, codeVerifier);

		const oAuth = new ClientOAuth2({
			clientId: credentials.clientId as string,
			clientSecret: (credentials.clientSecret as string) || undefined,
			authorizationUri: credentials.authUrl as string,
			accessTokenUri: credentials.accessTokenUrl as string,
			redirectUri: callbackUrl,
			scopes: (credentials.scope as string).split(' ').filter(Boolean),
		});

		const authUri = oAuth.code.getUri({ state, query: queryAdditions });

		if ((req.query as Record<string, string>)['_oauth_reauth'] === '1') {
			const url = new URL(authUri);
			url.searchParams.set('prompt', 'login');
			return url.toString();
		}

		return authUri;
	}

	async exchangeOAuth2Code(code: string): Promise<IFormUser> {
		const req = this.assertHttpRequest();
		const credentials = await this.getCredentials('webhookOAuth2Api');
		const callbackUrl = `${this.additionalData.restApiUrl}/oauth2-credential/webhook-callback`;

		// Recover code_verifier from the state param (present for PKCE flows).
		const rawState = (req.query as Record<string, string>)['_oauth_state'];
		const state = rawState ? verifyWebhookOAuth2State(rawState) : undefined;
		const codeVerifier = state?.codeVerifier;

		const oAuth = new ClientOAuth2({
			clientId: credentials.clientId as string,
			clientSecret: (credentials.clientSecret as string) || undefined,
			authorizationUri: credentials.authUrl as string,
			accessTokenUri: credentials.accessTokenUrl as string,
			redirectUri: callbackUrl,
			scopes: (credentials.scope as string).split(' ').filter(Boolean),
		});

		const tokenCallbackUrl = `${callbackUrl}?code=${encodeURIComponent(code)}`;
		const token = await oAuth.code.getToken(
			tokenCallbackUrl,
			codeVerifier ? { body: { code_verifier: codeVerifier } } : {},
		);

		// Extract user info from id_token (present when openid scope was granted).
		const idToken = (token.data as Record<string, string>).id_token;
		if (!idToken) {
			return { id: '', email: '', firstName: '', lastName: '' };
		}

		const decoded = jwt.decode(idToken);
		if (!decoded || typeof decoded === 'string') {
			return { id: '', email: '', firstName: '', lastName: '' };
		}
		const claims = decoded as Record<string, unknown>;

		const sub = typeof claims.sub === 'string' ? claims.sub : '';
		const email = typeof claims.email === 'string' ? claims.email : '';
		const name = typeof claims.name === 'string' ? claims.name : '';
		const picture = typeof claims.picture === 'string' ? claims.picture : undefined;
		const emailVerified =
			typeof claims.email_verified === 'boolean' ? claims.email_verified : undefined;

		return { id: sub, email, firstName: name, lastName: '', picture, emailVerified };
	}

	async getInputConnectionData(
		connectionType: AINodeConnectionType,
		itemIndex: number,
	): Promise<unknown> {
		// To be able to use expressions like "$json.sessionId" set the
		// body data the webhook received to what is normally used for
		// incoming node data.
		const connectionInputData: INodeExecutionData[] = [
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			{ json: this.additionalData.httpRequest?.body || {} },
		];
		const runExecutionData = this.runExecutionData ?? createEmptyRunExecutionData();
		const executeData: IExecuteData = {
			data: {
				main: [connectionInputData],
			},
			node: this.node,
			source: null,
		};

		return await getInputConnectionData.call(
			this,
			this.workflow,
			runExecutionData,
			this.runIndex,
			connectionInputData,
			{} as ITaskDataConnections,
			this.additionalData,
			executeData,
			this.mode,
			this.closeFunctions,
			connectionType,
			itemIndex,
		);
	}
}
