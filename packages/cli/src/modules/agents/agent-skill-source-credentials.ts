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

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';
import { CredentialsService } from '@/credentials/credentials.service';
import { SkillSourceCredentials, type ResolvedSkillSourceCredential } from '@/modules/skills';

import { decryptAgentCredential } from './utils/decrypt-agent-credential';

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
		private readonly credentialTypes: CredentialTypes,
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
		scope: { projectId: string | null; user?: User; types: readonly string[] },
	): Promise<ResolvedSkillSourceCredential | null> {
		const { projectId, user, types } = scope;
		const credential = await this.credentialsRepository.findOneBy({ id: credentialId });
		if (!credential || !types.includes(credential.type)) return null;
		if (user && !(await this.usableBy(user, projectId)).some(({ id }) => id === credentialId)) {
			return null;
		}
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
		return { type: credential.type, data: await this.withFreshToken(credential.type, data) };
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
		const accepted = new Set<string>();
		for (const id of ids) {
			const owner = await this.sharedCredentialsRepository.findCredentialOwningProject(id);
			if (owner?.type !== 'personal') continue;
			const user = await this.userRepository.findPersonalOwnerForProject(owner.id);
			if (user && hasGlobalScope(user, 'skill:create')) accepted.add(id);
		}
		return accepted;
	}

	/**
	 * A type that mints short-lived tokens, such as a GitHub App, gets a new one from its own
	 * `preAuthentication`. The token is not stored: the next resolve mints another.
	 */
	private async withFreshToken(
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<Record<string, unknown>> {
		const { preAuthentication } = this.credentialTypes.getByName(type);
		if (typeof preAuthentication !== 'function') return data;
		const http = this.outboundHttp.requests();
		const helper: IHttpRequestHelper = {
			helpers: { httpRequest: async (options) => await http.request(options) },
		};
		return { ...data, ...(await preAuthentication.call(helper, data)) };
	}
}
