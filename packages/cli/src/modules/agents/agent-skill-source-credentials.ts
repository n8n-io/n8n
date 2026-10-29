import type { SkillSourceCredentialOption } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import {
	CredentialsRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	UserRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { ICredentialDataDecryptedObject, IHttpRequestHelper } from 'n8n-workflow';

import { CredentialsHelper } from '@/credentials-helper';
import { CredentialsService } from '@/credentials/credentials.service';
import {
	SkillSourceCredentials,
	type ResolvedSkillSourceCredential,
	type SkillSourceCredentialScope,
} from '@/modules/skills';

import { decryptAgentCredential } from './utils/decrypt-agent-credential';

/** The most a GitHub App token mint may take, as the GitHub client limits its own requests. */
const TOKEN_TIMEOUT_MS = 30_000;

/**
 * The credentials that a skill source may use, with the rules of the credential select of a
 * workflow. A project source accepts the credentials that its project can use. A Global source
 * accepts a credential whose owner may manage Global skills, so it does not depend on one
 * project. With a user, the user must also be able to use the credential.
 */
@Service()
export class AgentSkillSourceCredentials extends SkillSourceCredentials {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly userRepository: UserRepository,
		private readonly outboundHttp: OutboundHttp,
	) {
		super();
	}

	async listUsable(
		user: User,
		projectId: string | null,
		types: readonly string[],
	): Promise<SkillSourceCredentialOption[]> {
		const usable = await this.usableBy(user, projectId);
		const ofTypes = usable.filter((credential) => types.includes(credential.type));
		const accepted = await this.acceptedIds(
			ofTypes.map(({ id }) => id),
			projectId,
		);
		return ofTypes
			.filter(({ id }) => accepted.has(id))
			.map(({ id, name, type }) => ({ id, name, type }));
	}

	async resolve(
		credentialId: string,
		scope: SkillSourceCredentialScope,
	): Promise<ResolvedSkillSourceCredential | null> {
		const { projectId, user, types, check } = scope;
		// The user check runs first, so a missing credential and one the user cannot see take the
		// same path, and the response time does not tell that a credential exists.
		if (user && !(await this.usableBy(user, projectId)).some(({ id }) => id === credentialId)) {
			return null;
		}
		const credential = await this.credentialsRepository.findOneBy({ id: credentialId });
		if (!credential || !types.includes(credential.type)) return null;
		if (!(await this.acceptedIds([credentialId], projectId)).has(credentialId)) return null;
		// Decrypts in the project of the source, or for Global in the project that owns it.
		const decryptIn =
			projectId ??
			(await this.sharedCredentialsRepository.findCredentialOwningProject(credentialId))?.id;
		if (!decryptIn) return null;
		const data = await decryptAgentCredential(this.credentialsHelper, credential, {
			projectId: decryptIn,
			userId: user?.id,
		});
		check?.({ id: credential.id, type: credential.type, data });
		return {
			id: credential.id,
			type: credential.type,
			data: await this.withFreshToken(credential.type, data),
		};
	}

	/** The credentials the user can use in the scope, as the workflow credential select lists them. */
	private async usableBy(user: User, projectId: string | null) {
		const inProject =
			projectId ?? (await this.projectRepository.getPersonalProjectForUserOrFail(user.id)).id;
		return await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(user, {
			projectId: inProject,
			excludeResolvable: true,
		});
	}

	/** The credentials among `ids` that the scope accepts. */
	private async acceptedIds(ids: string[], projectId: string | null): Promise<Set<string>> {
		if (ids.length === 0) return new Set();
		if (projectId) {
			const inProject = await this.credentialsService.findAllCredentialIdsForProject(projectId);
			return new Set(inProject.map(({ id }) => id).filter((id) => ids.includes(id)));
		}
		// One query for the owners of all credentials, then one per owning personal project.
		const owners = (
			await this.sharedCredentialsRepository.getAllRelationsForCredentials(ids)
		).filter(({ role, project }) => role === 'credential:owner' && project.type === 'personal');
		const adminProjects = new Set<string>();
		for (const projectId of new Set(owners.map(({ projectId }) => projectId))) {
			const owner = await this.userRepository.findPersonalOwnerForProject(projectId);
			if (owner && hasGlobalScope(owner, 'skill:create')) adminProjects.add(projectId);
		}
		return new Set(
			owners
				.filter(({ projectId }) => adminProjects.has(projectId))
				.map(({ credentialsId }) => credentialsId),
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
