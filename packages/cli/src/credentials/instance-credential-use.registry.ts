import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

export interface InstanceCredentialUse {
	readonly id: string;
	readonly credentialTypes: readonly string[];
}

@Service()
export class InstanceCredentialUseRegistry {
	private readonly uses = new Map<string, InstanceCredentialUse>();

	register(credentialUse: InstanceCredentialUse) {
		if (credentialUse.id.trim().length === 0) {
			throw new UnexpectedError('Instance credential use ID cannot be empty');
		}
		if (this.uses.has(credentialUse.id)) {
			throw new UnexpectedError(
				`Instance credential use "${credentialUse.id}" is already registered`,
			);
		}
		if (credentialUse.credentialTypes.length === 0) {
			throw new UnexpectedError(
				`Instance credential use "${credentialUse.id}" must allow at least one credential type`,
			);
		}

		this.uses.set(credentialUse.id, credentialUse);
	}

	get(credentialUseId: string): InstanceCredentialUse {
		const credentialUse = this.uses.get(credentialUseId);
		if (!credentialUse) {
			throw new UnexpectedError(`Unknown instance credential use "${credentialUseId}"`);
		}
		return credentialUse;
	}
}
