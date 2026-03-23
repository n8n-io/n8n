import { mockLogger } from '@n8n/backend-test-utils';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { InstanceVersionHistoryRepository } from '../database/repositories/instance-version-history.repository';
import { InstanceVersionHistoryService } from '../instance-version-history.service';

// Mock N8N_VERSION
jest.mock('@/constants', () => ({
	N8N_VERSION: '2.5.0',
}));

describe('InstanceVersionHistoryService', () => {
	let service: InstanceVersionHistoryService;
	let repository: MockProxy<InstanceVersionHistoryRepository>;

	beforeEach(() => {
		jest.clearAllMocks();
		repository = mock<InstanceVersionHistoryRepository>();
	});

	function createService() {
		return new InstanceVersionHistoryService(repository, mockLogger());
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
	});

	describe('getMinVersionSince', () => {
		beforeEach(async () => {
			repository.find.mockResolvedValue([
				{ id: 1, major: 2, minor: 3, patch: 4, createdAt: new Date('2025-01-01') },
				{ id: 2, major: 2, minor: 2, patch: 0, createdAt: new Date('2025-01-02') },
				{ id: 3, major: 2, minor: 5, patch: 0, createdAt: new Date('2025-01-03') },
			] as never);

			service = createService();
			await service.init();
		});

		it('should return smallest version since the given date', () => {
			const result = service.getMinVersionSince(new Date('2025-01-01'));
			expect(result).toEqual({ major: 2, minor: 2, patch: 0 });
		});

		it('should filter by date', () => {
			const result = service.getMinVersionSince(new Date('2025-01-02'));
			expect(result).toEqual({ major: 2, minor: 2, patch: 0 });
		});

		it('should return only entries from after the date', () => {
			const result = service.getMinVersionSince(new Date('2025-01-03'));
			expect(result).toEqual({ major: 2, minor: 5, patch: 0 });
		});

		it('should return undefined when no entries match', () => {
			const result = service.getMinVersionSince(new Date('2025-02-01'));
			expect(result).toBeUndefined();
		});
	});

	describe('getDateSinceContinuouslyAtLeastVersion', () => {
		beforeEach(async () => {
			// Simulates: upgrade to 2.3.4, downgrade to 2.2.0, upgrade to 2.5.0 (current)
			repository.find.mockResolvedValue([
				{ id: 1, major: 2, minor: 3, patch: 4, createdAt: new Date('2025-01-01') },
				{ id: 2, major: 2, minor: 2, patch: 0, createdAt: new Date('2025-01-02') },
				{ id: 3, major: 2, minor: 5, patch: 0, createdAt: new Date('2025-01-03') },
			] as never);

			service = createService();
			await service.init();
		});

		it('should return date accounting for downgrades', () => {
			// Querying "since when at least 2.3.4" should return Jan 3 (not Jan 1)
			const result = service.getDateSinceContinuouslyAtLeastVersion({
				major: 2,
				minor: 3,
				patch: 4,
			});
			expect(result).toEqual(new Date('2025-01-03'));
		});

		it('should return earliest date when all entries satisfy', () => {
			const result = service.getDateSinceContinuouslyAtLeastVersion({
				major: 2,
				minor: 0,
				patch: 0,
			});
			expect(result).toEqual(new Date('2025-01-01'));
		});

		it('should return undefined when current version is below target', () => {
			const result = service.getDateSinceContinuouslyAtLeastVersion({
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
			await service.init();

			const result = service.getCurrentVersionDate();
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
			// Don't call init() - test with truly empty state
			// (init would add current version)
			// Instead, we test the method directly on empty cache
			// by creating service without init
			const emptyService = createService();
			const result = emptyService.getCurrentVersionDate();
			expect(result).toBeUndefined();
		});
	});

	describe('getFirstAdoptionDate', () => {
		beforeEach(async () => {
			// 2.3.4 -> 2.2.0 (downgrade) -> 2.3.5 -> 2.5.0 (current)
			repository.find.mockResolvedValue([
				{ id: 1, major: 2, minor: 3, patch: 4, createdAt: new Date('2025-01-01') },
				{ id: 2, major: 2, minor: 2, patch: 0, createdAt: new Date('2025-01-02') },
				{ id: 3, major: 2, minor: 3, patch: 5, createdAt: new Date('2025-01-03') },
				{ id: 4, major: 2, minor: 5, patch: 0, createdAt: new Date('2025-01-04') },
			] as never);

			service = createService();
			await service.init();
		});

		it('should return first time version or above was adopted', () => {
			const result = service.getFirstAdoptionDate({ major: 2, minor: 3, patch: 4 });
			expect(result).toEqual(new Date('2025-01-01'));
		});

		it('should find first entry matching a lower version requirement', () => {
			const result = service.getFirstAdoptionDate({ major: 2, minor: 2, patch: 0 });
			expect(result).toEqual(new Date('2025-01-01'));
		});

		it('should return undefined when no version matches', () => {
			const result = service.getFirstAdoptionDate({ major: 3, minor: 0, patch: 0 });
			expect(result).toBeUndefined();
		});
	});
});
