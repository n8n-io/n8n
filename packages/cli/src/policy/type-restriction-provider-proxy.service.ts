import type { NodeTypeAvailabilityScope } from '@n8n/api-types';
import { Service } from '@n8n/di';

export type RestrictableTypeKind = 'node' | 'credential';

export interface TypeRestriction {
	readonly scope: NodeTypeAvailabilityScope;
}

export interface TypeRestrictionProvider {
	/**
	 * The types among `typeNames` that a policy denies. `projectId: null` means no project scope
	 * applies, so only the instance policy decides.
	 *
	 * Discovery callers treat a failed read as "nothing restricted": the save-time policy check
	 * still refuses a restricted type.
	 */
	findRestrictedTypes(
		kind: RestrictableTypeKind,
		projectId: string | null,
		typeNames: readonly string[],
	): Promise<ReadonlyMap<string, TypeRestriction>>;
}

/**
 * Lets code outside the policy module ask which types a policy denies. The module registers its
 * provider on startup, so an instance without the module or its license reports nothing denied.
 */
@Service()
export class TypeRestrictionProviderProxy implements TypeRestrictionProvider {
	private provider: TypeRestrictionProvider | null = null;

	registerProvider(provider: TypeRestrictionProvider): void {
		this.provider = provider;
	}

	/** Whether a policy module answers. Callers use it to skip work that only a policy needs. */
	hasProvider(): boolean {
		return this.provider !== null;
	}

	async findRestrictedTypes(
		kind: RestrictableTypeKind,
		projectId: string | null,
		typeNames: readonly string[],
	): Promise<ReadonlyMap<string, TypeRestriction>> {
		if (!this.provider || typeNames.length === 0) return new Map();

		return await this.provider.findRestrictedTypes(kind, projectId, typeNames);
	}
}
