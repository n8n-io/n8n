import { Container } from '@n8n/di';
import { ScopedResourceResolverRegistry } from '@n8n/services-common';

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
