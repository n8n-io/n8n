import { Container } from '@n8n/di';

import { FavoriteResourceResolverRegistry } from '@/modules/favorites/favorite-resource-resolver.registry';

import { AgentRepository } from './repositories/agent.repository';

export function registerFavoriteResolver() {
	const agentRepository = Container.get(AgentRepository);
	Container.get(FavoriteResourceResolverRegistry).register('agent', {
		globalReadScope: 'agent:read',
		findMeta: async (ids) =>
			new Map(
				(await agentRepository.findSummariesByIds(ids)).map(({ id, name, projectId }) => [
					id,
					{ name, projectId },
				]),
			),
		exists: async (id) => await agentRepository.existsBy({ id }),
	});
}
