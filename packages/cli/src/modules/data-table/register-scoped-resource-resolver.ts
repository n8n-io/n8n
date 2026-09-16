import { ScopedResourceResolverRegistry } from '@n8n/backend-services';
import { Container } from '@n8n/di';

import { DataTableRepository } from './data-table.repository';

export function registerScopedResourceResolver() {
	const dataTableRepository = Container.get(DataTableRepository);
	Container.get(ScopedResourceResolverRegistry).register('dataTable', {
		findProjectId: async (id) => {
			const dataTable = await dataTableRepository.findOne({
				where: { id },
				relations: ['project'],
			});
			return dataTable?.project.id ?? null;
		},
	});
}
