import { Container } from '@n8n/di';

import type { DynamicCredentialResolver } from '@/modules/dynamic-credentials.ee/database/entities/credential-resolver';
import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';

/**
 * Creates a dynamic credential resolver for testing
 */
export async function createDynamicCredentialResolver(
	attributes: Partial<DynamicCredentialResolver>,
): Promise<DynamicCredentialResolver> {
	const repository = Container.get(DynamicCredentialResolverRepository);

	const resolver = repository.create({
		name: attributes.name ?? 'test-resolver',
		type: attributes.type ?? 'test-type',
		config: attributes.config ?? '{}',
		...attributes,
	});

	return await repository.save(resolver);
}
