import { Container } from '@n8n/di';

import { FavoriteResourceResolverRegistry } from '@/modules/favorites/favorite-resource-resolver.registry';

import { ProjectFileRepository } from './project-file.repository';

export function registerFavoriteResolver() {
	const projectFileRepository = Container.get(ProjectFileRepository);
	Container.get(FavoriteResourceResolverRegistry).register('file', {
		globalReadScope: 'file:read',
		findMeta: async (ids) =>
			new Map(
				(await projectFileRepository.findSummariesByIds(ids)).map(({ id, name, projectId }) => [
					id,
					{ name, projectId },
				]),
			),
		exists: async (id) => await projectFileRepository.existsBy({ id }),
	});
}
