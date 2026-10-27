import type { Logger } from '@n8n/backend-common';
import type { InstanceWriteAccessService } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';

import type { OwnershipService } from '@/services/ownership.service';

import type { DataTableAggregateService } from '../data-table-aggregate.service';
import { DataTableProxyService } from '../data-table-proxy.service';
import type { DataTableService } from '../data-table.service';

describe('DataTableProxyService', () => {
	let dataTableService: DataTableService;
	let service: DataTableProxyService;

	beforeEach(() => {
		dataTableService = mock<DataTableService>();
		service = new DataTableProxyService(
			dataTableService,
			mock<DataTableAggregateService>(),
			mock<OwnershipService>(),
			mock<Logger>({ scoped: vi.fn().mockReturnThis() }),
			mock<InstanceWriteAccessService>(),
		);
		vi.mocked(dataTableService.getManyAndCount).mockResolvedValue({ count: 0, data: [] });
	});

	describe('makeAggregateOperations', () => {
		it('lists the pinned project even when the filter names another one', async () => {
			await service
				.makeAggregateOperations('project-1')
				.getManyAndCount({ filter: { projectId: 'other-project', name: 'orders' }, take: 5 });

			expect(dataTableService.getManyAndCount).toHaveBeenCalledExactlyOnceWith({
				filter: { name: 'orders', projectId: 'project-1' },
				take: 5,
			});
		});

		it('lists the pinned project when no filter is given', async () => {
			await service.makeAggregateOperations('project-1').getManyAndCount({});

			expect(dataTableService.getManyAndCount).toHaveBeenCalledExactlyOnceWith({
				filter: { projectId: 'project-1' },
			});
		});
	});
});
