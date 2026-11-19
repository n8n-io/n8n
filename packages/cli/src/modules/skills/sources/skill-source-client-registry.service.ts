import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

import type { SkillSourceClient } from './skill-source-client';

/** The client of each source type. `SkillsModule.init()` registers them. */
@Service()
export class SkillSourceClientRegistry {
	private readonly clients = new Map<string, SkillSourceClient>();

	register(client: SkillSourceClient): void {
		if (this.clients.has(client.type)) {
			throw new UnexpectedError(`A client for the source type "${client.type}" is registered.`);
		}
		this.clients.set(client.type, client);
	}

	/** Undefined when no client reads this type, for example a GitLab source on a build without GitLab. */
	get(type: string): SkillSourceClient | undefined {
		return this.clients.get(type);
	}

	types(): string[] {
		return [...this.clients.keys()];
	}
}
