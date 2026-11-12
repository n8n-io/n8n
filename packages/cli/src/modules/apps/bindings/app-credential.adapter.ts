import type { AppCredentialBinding, AppDescribedCredentialBinding } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	AppCredentialPort,
	AppRuntimeError,
	type AppCallContext,
	type AppHttpRequest,
	type AppHttpResponse,
} from '@n8n/backend-module-apps';
import { OutboundHttp } from '@n8n/backend-network';
import { CredentialsRepository, type CredentialsEntity, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import {
	getCredentialAllowedDomains,
	isDomainAllowed,
	shouldRefreshMcpOAuth2Token,
	Workflow,
} from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INode,
	IN8nHttpFullResponse,
} from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';
import { CredentialsService } from '@/credentials/credentials.service';
import { createMockNodeTypes } from '@/credentials/mock-node-types';
import { getOAuth2TokenRevision, OauthService } from '@/oauth/oauth.service';

const REQUEST_TIMEOUT_MS = 30_000;

const mockNode: INode = {
	id: 'app-credential',
	name: 'App credential',
	typeVersion: 1,
	type: 'mock',
	position: [0, 0],
	parameters: {},
};

/**
 * Signs the requests of credential bindings. Prototype: OAuth2 types send the
 * stored access token and refresh it once on a 401. Other types use the
 * `authenticate` definition of the credential type.
 */
@Service()
export class AppCredentialAdapter extends AppCredentialPort {
	private readonly mockNodeTypes = createMockNodeTypes().nodeTypes;

	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly credentialTypes: CredentialTypes,
		private readonly oauthService: OauthService,
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {
		super();
	}

	/** The same rule as the credential select of a workflow in the app project. */
	async assertCanBind(user: User, projectId: string, binding: AppCredentialBinding) {
		const usable = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(user, {
			projectId,
			excludePersonalRoute: true,
			excludeResolvable: true,
		});
		const credential = usable.some(({ id }) => id === binding.credentialId)
			? await this.findInProject(binding.credentialId, projectId)
			: null;
		if (!credential) {
			throw new NotFoundError(
				`Binding "${binding.key}": you cannot use this credential in the app project.`,
			);
		}
		const data = await this.decrypt(credential, { projectId, userId: user.id });
		const denied = this.domainDenial(data, binding.servers[0].url);
		if (denied) throw new BadRequestError(`Binding "${binding.key}": ${denied}`);
	}

	async describe(
		projectId: string,
		binding: AppCredentialBinding,
	): Promise<AppDescribedCredentialBinding | null> {
		const credential = await this.findInProject(binding.credentialId, projectId);
		if (!credential) return null;
		return { ...binding, name: credential.name, credentialType: credential.type };
	}

	async send(
		ctx: AppCallContext,
		credentialId: string,
		request: AppHttpRequest,
	): Promise<AppHttpResponse> {
		const credential = await this.findInProject(credentialId, ctx.projectId);
		if (!credential || credential.isResolvable) {
			throw new AppRuntimeError(404, 'resource_missing', 'The credential is not available.');
		}
		let data = await this.decrypt(credential, ctx);
		const denied = this.domainDenial(data, request.url);
		if (denied) throw new AppRuntimeError(403, 'permission_denied', denied);

		const oauth2 = this.isOAuth2(credential.type);
		if (oauth2 && shouldRefreshMcpOAuth2Token(data.oauthTokenData)) {
			data = await this.refresh(credential, ctx, data);
		}
		let response = await this.sendSigned(credential.type, data, request, oauth2);
		if (oauth2 && response.statusCode === 401) {
			data = await this.refresh(credential, ctx, data);
			response = await this.sendSigned(credential.type, data, request, oauth2);
		}

		const contentType = response.headers['content-type'];
		return {
			status: response.statusCode,
			contentType: typeof contentType === 'string' ? contentType : undefined,
			body: response.body,
		};
	}

	private async sendSigned(
		type: string,
		data: ICredentialDataDecryptedObject,
		request: AppHttpRequest,
		oauth2: boolean,
	): Promise<IN8nHttpFullResponse> {
		const options: IHttpRequestOptions = {
			method: request.method as IHttpRequestMethods,
			url: request.url,
			headers: { ...request.headers },
			...(request.body !== undefined && { body: request.body as IDataObject, json: true }),
			timeout: REQUEST_TIMEOUT_MS,
			disableFollowRedirect: true,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
		};
		const signed = oauth2
			? this.withBearer(options, data)
			: await this.authenticate(type, data, options);
		try {
			return await this.outboundHttp
				.requests({ timeout: REQUEST_TIMEOUT_MS })
				.request({ ...signed, returnFullResponse: true, ignoreHttpStatusErrors: true });
		} catch (error) {
			this.logger.debug('App credential request failed.', { error: ensureError(error).message });
			throw new AppRuntimeError(502, 'request_failed', 'The request to the API failed.');
		}
	}

	private withBearer(
		options: IHttpRequestOptions,
		data: ICredentialDataDecryptedObject,
	): IHttpRequestOptions {
		const tokenData = data.oauthTokenData as IDataObject | undefined;
		const token = typeof tokenData?.access_token === 'string' ? tokenData.access_token : '';
		if (!token) {
			throw new AppRuntimeError(403, 'permission_denied', 'The credential is not connected.');
		}
		return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
	}

	/** Declarative `authenticate` definitions resolve expressions, so they need a workflow and a node. */
	private async authenticate(
		type: string,
		data: ICredentialDataDecryptedObject,
		options: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const workflow = new Workflow({
			nodes: [mockNode],
			connections: {},
			active: false,
			nodeTypes: this.mockNodeTypes,
		});
		await workflow.expression.acquireIsolate();
		try {
			return await this.credentialsHelper.authenticate(data, type, options, workflow, mockNode);
		} finally {
			await workflow.expression.releaseIsolate();
		}
	}

	private async refresh(
		credential: CredentialsEntity,
		ctx: AppCallContext,
		data: ICredentialDataDecryptedObject,
	): Promise<ICredentialDataDecryptedObject> {
		await this.oauthService.refreshOAuth2CredentialById(
			credential.id,
			ctx.projectId,
			getOAuth2TokenRevision(data.oauthTokenData),
		);
		return await this.decrypt(credential, ctx);
	}

	/**
	 * The binding author chooses the URL, as in the HTTP Request node, so the
	 * domain settings of the credential apply the same way.
	 */
	private domainDenial(data: ICredentialDataDecryptedObject, url: string): string | null {
		let allowedDomains: string | undefined;
		try {
			allowedDomains = getCredentialAllowedDomains({
				node: mockNode,
				credentialData: data,
				surface: 'HTTP Request or app',
			});
		} catch (error) {
			return ensureError(error).message;
		}
		if (allowedDomains === undefined || isDomainAllowed({ url, allowedDomains })) return null;
		return `This credential is restricted from accessing ${new URL(url).host}. Only the following domains are allowed: ${allowedDomains}`;
	}

	private isOAuth2(type: string): boolean {
		return type === 'oAuth2Api' || this.credentialTypes.getParentTypes(type).includes('oAuth2Api');
	}

	private async decrypt(
		credential: Pick<CredentialsEntity, 'id' | 'name' | 'type'>,
		ctx: Pick<AppCallContext, 'projectId' | 'userId'>,
	): Promise<ICredentialDataDecryptedObject> {
		const { getBase } = await import('@/workflow-execute-additional-data.js');
		return await this.credentialsHelper.getDecrypted(
			await getBase({ projectId: ctx.projectId, userId: ctx.userId }),
			{ id: credential.id, name: credential.name },
			credential.type,
			'internal',
		);
	}

	private async findInProject(credentialId: string, projectId: string) {
		const credential = await this.credentialsRepository.findOneBy({ id: credentialId });
		return credential && (await this.inProject(credential, projectId)) ? credential : null;
	}

	private async inProject(credential: CredentialsEntity, projectId: string): Promise<boolean> {
		if (credential.isGlobal) return true;
		const inProject = await this.credentialsService.findAllCredentialIdsForProject(projectId);
		return inProject.some(({ id }) => id === credential.id);
	}
}
