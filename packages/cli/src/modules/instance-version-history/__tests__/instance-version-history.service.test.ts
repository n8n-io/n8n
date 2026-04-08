import { mockLogger } from '@n8n/backend-test-utils';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { InstanceVersionHistoryRepository } from '../database/repositories/instance-version-history.repository';
import { InstanceVersionHistoryService } from '../instance-version-history.service';

// Mock N8N_VERSION
jest.mock('@/constants', () => ({
	N8N_VERSION: '2.5.0',
}));

describe('InstanceVersionHistoryService', () => {
	let service: InstanceVersionHistoryService;
	let repository: MockProxy<InstanceVersionHistoryRepository>;
	let instanceSettings: MockProxy<InstanceSettings>;

	beforeEach(() => {
		jest.clearAllMocks();
		repository = mock<InstanceVersionHistoryRepository>();
		instanceSettings = mock<InstanceSettings>({ isLeader: true });
	});

	function createService() {
		return new InstanceVersionHistoryService(repository, mockLogger(), instanceSettings);
	}

	describe('init', () => {
		it('should record current version when cache is empty', async () => {
			repository.find.mockResolvedValue([]);
			repository.create.mockImplementation((data) => data as never);
			repository.save.mockImplementation(
				async (data) =>
					({
						...data,
						id: 1,
						createdAt: new Date(),
					}) as never,
			);

			service = createService();
			await service.init();

			expect(repository.save).toHaveBeenCalledWith(
				expect.objectContaining({ major: 2, minor: 5, patch: 0 }),
			);
		});

		it('should record current version when it differs from newest', async () => {
			repository.find.mockResolvedValue([
				{ id: 1, major: 2, minor: 4, patch: 0, createdAt: new Date('2025-01-01') },
			] as never);
			repository.create.mockImplementation((data) => data as never);
			repository.save.mockImplementation(
				async (data) =>
					({
						...data,
						id: 2,
						createdAt: new Date(),
					}) as never,
			);

			service = createService();
			await service.init();

			expect(repository.save).toHaveBeenCalledWith(
				expect.objectContaining({ major: 2, minor: 5, patch: 0 }),
			);
		});

		it('should not record when current version matches newest', async () => {
			repository.find.mockResolvedValue([
				{ id: 1, major: 2, minor: 5, patch: 0, createdAt: new Date('2025-01-01') },
			] as never);

			service = createService();
			await service.init();

			expect(repository.save).not.toHaveBeenCalled();
		});

		it('should skip init when not leader', async () => {
			instanceSettings = mock<InstanceSettings>({ isLeader: false });
			service = createService();
			await service.init();

			expect(repository.find).not.toHaveBeenCalled();
			expect(repository.save).not.toHaveBeenCalled();
		});

		it('should skip init when not retries is 0', async () => {
			instanceSettings = mock<InstanceSettings>({ isLeader: false });
			service = createService();
			await service.init(0);

			expect(repository.find).not.toHaveBeenCalled();
			expect(repository.save).not.toHaveBeenCalled();
		});
	});

	describe('getMinVersionSince', () => {
		beforeEach(() => {
			repository.find.mockResolvedValue([
				{ id: 1, major: 2, minor: 3, patch: 4, createdAt: new Date('2025-01-01') },
				{ id: 2, major: 2, minor: 2, patch: 0, createdAt: new Date('2025-01-02') },
				{ id: 3, major: 2, minor: 5, patch: 0, createdAt: new Date('2025-01-03') },
			] as never);

			service = createService();
		});

		it('should return smallest version since the given date', async () => {
			const result = await service.getMinVersionSince(new Date('2025-01-01'));
			expect(result).toEqual({ major: 2, minor: 2, patch: 0 });
		});

		it('should filter by date', async () => {
			const result = await service.getMinVersionSince(new Date('2025-01-02'));
			expect(result).toEqual({ major: 2, minor: 2, patch: 0 });
		});

		it('should return only entries from after the date', async () => {
			const result = await service.getMinVersionSince(new Date('2025-01-03'));
			expect(result).toEqual({ major: 2, minor: 5, patch: 0 });
		});

		it('should return undefined when no entries match', async () => {
			const result = await service.getMinVersionSince(new Date('2025-02-01'));
			expect(result).toBeUndefined();
		});
	});

	describe('getDateSinceContinuouslyAtLeastVersion', () => {
		beforeEach(() => {
			// Simulates: upgrade to 2.3.4, downgrade to 2.2.0, upgrade to 2.5.0 (current)
			repository.find.mockResolvedValue([
				{ id: 1, major: 2, minor: 3, patch: 4, createdAt: new Date('2025-01-01') },
				{ id: 2, major: 2, minor: 2, patch: 0, createdAt: new Date('2025-01-02') },
				{ id: 3, major: 2, minor: 5, patch: 0, createdAt: new Date('2025-01-03') },
			] as never);

			service = createService();
		});

		it('should return date accounting for downgrades', async () => {
			// Querying "since when at least 2.3.4" should return Jan 3 (not Jan 1)
			const result = await service.getDateSinceContinuouslyAtLeastVersion({
				major: 2,
				minor: 3,
				patch: 4,
			});
			expect(result).toEqual(new Date('2025-01-03'));
		});

		it('should return earliest date when all entries satisfy', async () => {
			const result = await service.getDateSinceContinuouslyAtLeastVersion({
				major: 2,
				minor: 0,
				patch: 0,
			});
			expect(result).toEqual(new Date('2025-01-01'));
		});

		it('should return undefined when current version is below target', async () => {
			const result = await service.getDateSinceContinuouslyAtLeastVersion({
				major: 3,
				minor: 0,
				patch: 0,
			});
			expect(result).toBeUndefined();
		});
	});

	describe('getCurrentVersionDate', () => {
		it('should return newest entry', async () => {
			repository.find.mockResolvedValue([
				{ id: 1, major: 2, minor: 4, patch: 0, createdAt: new Date('2025-01-01') },
				{ id: 2, major: 2, minor: 5, patch: 0, createdAt: new Date('2025-01-02') },
			] as never);

			service = createService();

			const result = await service.getCurrentVersionDate();
			expect(result).toEqual(
				expect.objectContaining({
					major: 2,
					minor: 5,
					patch: 0,
					createdAt: new Date('2025-01-02'),
				}),
			);
		});

		it('should return undefined when cache is empty', async () => {
			repository.find.mockResolvedValue([]);

			service = createService();
			const result = await service.getCurrentVersionDate();
			expect(result).toBeUndefined();
		});
	});

	describe('getFirstAdoptionDate', () => {
		beforeEach(() => {
			// 2.3.4 -> 2.2.0 (downgrade) -> 2.3.5 -> 2.5.0 (current)
			repository.find.mockResolvedValue([
				{ id: 1, major: 2, minor: 3, patch: 4, createdAt: new Date('2025-01-01') },
				{ id: 2, major: 2, minor: 2, patch: 0, createdAt: new Date('2025-01-02') },
				{ id: 3, major: 2, minor: 3, patch: 5, createdAt: new Date('2025-01-03') },
				{ id: 4, major: 2, minor: 5, patch: 0, createdAt: new Date('2025-01-04') },
			] as never);

			service = createService();
		});

		it('should return first time version or above was adopted', async () => {
			const result = await service.getFirstAdoptionDate({ major: 2, minor: 3, patch: 4 });
			expect(result).toEqual(new Date('2025-01-01'));
		});

		it('should find first entry matching a lower version requirement', async () => {
			const result = await service.getFirstAdoptionDate({ major: 2, minor: 2, patch: 0 });
			expect(result).toEqual(new Date('2025-01-01'));
		});

		it('should return undefined when no version matches', async () => {
			const result = await service.getFirstAdoptionDate({ major: 3, minor: 0, patch: 0 });
			expect(result).toBeUndefined();
		});
	});

	describe('lazy cache loading', () => {
		it('should load cache from repository on first query when not initialized via init', async () => {
			repository.find.mockResolvedValue([
				{ id: 1, major: 2, minor: 3, patch: 0, createdAt: new Date('2025-01-01') },
			] as never);

			service = createService();
			// No init() call - query methods lazily load cache via getCache()
			const result = await service.getMinVersionSince(new Date('2025-01-01'));

			expect(repository.find).toHaveBeenCalledWith({ order: { createdAt: 'ASC' } });
			expect(result).toEqual({ major: 2, minor: 3, patch: 0 });
		});
	});
});
