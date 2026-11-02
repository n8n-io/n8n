import type { SkillSourceCredentialOption } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	SkillSourceCredentials,
	type ResolvedSkillSourceCredential,
	type SkillSourceCredentialScope,
} from './skill-source-credentials.contracts';

/**
 * Holds the `SkillSourceCredentials` of the agents module, which registers it on init. Until
 * then, no credential is usable, so only public sources work. The agents module registers a
 * factory, so the credential services are created on first use, not when the module starts.
 */
@Service()
export class SkillSourceCredentialsProxy extends SkillSourceCredentials {
	private factory: (() => SkillSourceCredentials) | null = null;

	private created: SkillSourceCredentials | null = null;

	register(factory: () => SkillSourceCredentials): void {
		this.factory = factory;
		this.created = null;
	}

	get isRegistered(): boolean {
		return this.factory !== null;
	}

	private get impl(): SkillSourceCredentials | null {
		if (!this.created && this.factory) this.created = this.factory();
		return this.created;
	}

	async listUsable(
		user: User,
		projectId: string | null,
		types: readonly string[],
	): Promise<SkillSourceCredentialOption[]> {
		if (!this.impl || types.length === 0) return [];
		return await this.impl.listUsable(user, projectId, types);
	}

	async resolve(
		credentialId: string,
		scope: SkillSourceCredentialScope,
	): Promise<ResolvedSkillSourceCredential | null> {
		if (!this.impl) return null;
		return await this.impl.resolve(credentialId, scope);
	}
}
