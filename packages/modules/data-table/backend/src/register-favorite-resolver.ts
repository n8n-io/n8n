import { Container } from '@n8n/di';
import { FavoriteResourceResolverRegistry } from '@n8n/backend-services';

import { DataTableRepository } from './data-table.repository';

export function registerFavoriteResolver() {
	const dataTableRepository = Container.get(DataTableRepository);
	Container.get(FavoriteResourceResolverRegistry).register('dataTable', {
		globalReadScope: 'dataTable:read',
		findMeta: async (ids) =>
			new Map(
				(await dataTableRepository.findSummariesByIds(ids)).map(({ id, name, projectId }) => [
					id,
					{ name, projectId },
				]),
			),
		exists: async (id) => await dataTableRepository.existsBy({ id }),
	});
}
