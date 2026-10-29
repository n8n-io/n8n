import type { SkillSourceCredentialOption } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import { CredentialsFinderService } from '@n8n/backend-services';
import {
	CredentialsRepository,
	ProjectRelationRepository,
	SharedCredentialsRepository,
	type CredentialsEntity,
	type User,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { ICredentialDataDecryptedObject, IHttpRequestHelper } from 'n8n-workflow';

import { CredentialsHelper } from '@/credentials-helper';
import { CredentialsService } from './credentials.service';
import {
	SkillSourceCredentials,
	SkillSourceCredentialsProxy,
	type ResolvedSkillSourceCredential,
	type SkillSourceCredentialScope,
} from '@/modules/skills';

/** The most a GitHub App token mint may take, as the GitHub client limits its own requests. */
const TOKEN_TIMEOUT_MS = 30_000;

/**
 * The credentials that a skill source may use, with the rules of the credential select of a
 * workflow. The skills module cannot import the credential services, so cli implements its
 * `SkillSourceCredentials` contract here and `registerSkillSourceCredentials` registers it. A project source accepts the credentials of its project and the global
 * credentials. A Global source accepts a credential whose owner may manage Global skills, so it
 * does not depend on one project. With a user, the user must also be able to read the
 * credential. A resolvable credential is never accepted.
 */
@Service()
export class CliSkillSourceCredentials extends SkillSourceCredentials {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinder: CredentialsFinderService,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly outboundHttp: OutboundHttp,
	) {
		super();
	}

	async listUsable(
		user: User,
		projectId: string | null,
		types: readonly string[],
	): Promise<SkillSourceCredentialOption[]> {
		const options = (credentials: Array<Pick<CredentialsEntity, 'id' | 'name' | 'type'>>) =>
			credentials
				.filter(({ type }) => types.includes(type))
				.map(({ id, name, type }) => ({ id, name, type }));
		if (projectId) {
			// The workflow select of the project: its credentials and the global ones.
			return options(
				await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(user, {
					projectId,
					excludePersonalRoute: true,
					excludeResolvable: true,
				}),
			);
		}
		const readable = (
			await this.credentialsFinder.findCredentialsForUser(user, ['credential:read'])
		).filter(({ type, isResolvable }) => types.includes(type) && !isResolvable);
		const owners = await this.adminOwners(readable.map(({ id }) => id));
		return options(readable.filter(({ id }) => owners.has(id)));
	}

	async resolve(
		credentialId: string,
		scope: SkillSourceCredentialScope,
	): Promise<ResolvedSkillSourceCredential | null> {
		const { projectId, user, types, check } = scope;
		// With a user, the read check runs first, so a missing credential and one the user cannot
		// read take the same path, and the response time does not tell that a credential exists.
		const credential = user
			? await this.credentialsFinder.findCredentialForUser(credentialId, user, ['credential:read'])
			: await this.credentialsRepository.findOneBy({ id: credentialId });
		if (!credential || credential.isResolvable || !types.includes(credential.type)) return null;
		// Decrypts in the project of the source, or for Global in the project that owns it.
		const decryptIn = projectId
			? (await this.acceptedInProject(credential, projectId)) && projectId
			: (await this.adminOwners([credentialId])).get(credentialId);
		if (!decryptIn) return null;
		const data = await this.decrypt(credential, { projectId: decryptIn, userId: user?.id });
		check?.({ id: credential.id, type: credential.type, data });
		return {
			id: credential.id,
			type: credential.type,
			data: await this.withFreshToken(credential.type, data),
		};
	}

	/**
	 * The decrypted data in the scope of the source. A source has no workflow execution, so no
	 * dynamic credential resolution applies.
	 */
	private async decrypt(
		credential: Pick<CredentialsEntity, 'id' | 'name' | 'type'>,
		scope: { projectId: string; userId?: string },
	): Promise<ICredentialDataDecryptedObject> {
		// Loaded lazily, as the execution stack is large.
		const { getBase } = await import('@/workflow-execute-additional-data.js');
		return await this.credentialsHelper.getDecrypted(
			await getBase(scope),
			{ id: credential.id, name: credential.name },
			credential.type,
			'internal',
		);
	}

	/** A credential of the project, or a global one, as the workflow select of the project. */
	private async acceptedInProject(credential: CredentialsEntity, projectId: string) {
		if (credential.isGlobal) return true;
		const inProject = await this.credentialsService.findAllCredentialIdsForProject(projectId);
		return inProject.some(({ id }) => id === credential.id);
	}

	/**
	 * The owning project of each credential among `ids` that a user with the global
	 * `skill:create` scope owns in a personal project. Two queries for any number of ids.
	 */
	private async adminOwners(ids: string[]): Promise<Map<string, string>> {
		if (ids.length === 0) return new Map();
		const owningProjects =
			await this.sharedCredentialsRepository.findOwnerProjectsByCredentialIds(ids);
		const personal = [...owningProjects].filter(([, project]) => project.type === 'personal');
		const owners = await this.projectRelationRepository.getPersonalProjectOwners(
			personal.map(([, project]) => project.id),
		);
		const adminProjects = new Set(
			owners
				.filter(({ user }) => hasGlobalScope(user, 'skill:create'))
				.map(({ projectId }) => projectId),
		);
		return new Map(
			personal
				.filter(([, project]) => adminProjects.has(project.id))
				.map(([credentialId, project]) => [credentialId, project.id]),
		);
	}

	/**
	 * A type that mints short-lived tokens, such as a GitHub App, gets a new one from its own
	 * `preAuthentication`, held to the allowed domains of the credential. The token is not
	 * stored: the next resolve mints another.
	 */
	private async withFreshToken(
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<Record<string, unknown>> {
		const http = this.outboundHttp.requests({ timeout: TOKEN_TIMEOUT_MS });
		const helper: IHttpRequestHelper = {
			helpers: { httpRequest: async (options) => await http.request(options) },
		};
		const fresh = await this.credentialsHelper.runPreAuthentication(helper, data, type);
		return fresh ? { ...data, ...fresh } : data;
	}
}

/**
 * Registers the credentials of skill sources on the skills module. Call it after the modules
 * started, on a main instance, which serves the Skill Sync routes.
 */
export function registerSkillSourceCredentials(): void {
	Container.get(SkillSourceCredentialsProxy).register(() =>
		Container.get(CliSkillSourceCredentials),
	);
}
