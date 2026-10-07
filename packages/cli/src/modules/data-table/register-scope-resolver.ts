import { ProjectOwnedResourceScopeResolverRegistry } from '@n8n/backend-services';
import { Container } from '@n8n/di';

import { DataTableRepository } from './data-table.repository';

export function registerScopeResolver() {
	const repository = Container.get(DataTableRepository);
	Container.get(ProjectOwnedResourceScopeResolverRegistry).register('dataTable', {
		findProjectId: async (dataTableId) => await repository.findProjectId(dataTableId),
	});
}
