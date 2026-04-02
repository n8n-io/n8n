import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAccessSettingsCsvExport } from './useAccessSettingsCsvExport';
import * as usersApi from '@n8n/rest-api-client/api/users';
import type { UsersList, User } from '@n8n/api-types';

const mockedRestApiContext = {};
vi.mock('@n8n/rest-api-client/api/users');
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: mockedRestApiContext,
	}),
}));

describe('useAccessSettingsCsvExport', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock DOM APIs used to create csv files on the client
		global.URL.createObjectURL = vi.fn(() => 'mock-url');
		global.URL.revokeObjectURL = vi.fn();
		global.document.createElement = vi.fn(() => ({
			setAttribute: vi.fn(),
			click: vi.fn(),
			style: {},
		})) as unknown as typeof document.createElement;
		global.document.body.appendChild = vi.fn();
		global.document.body.removeChild = vi.fn();
	});

	const createMockUser = (id: number, overrides?: Partial<User>): User => {
		return {
			id: id.toString(),
			email: `user${id}@example.com`,
			role: 'global:member',
			projectRelations: [],
			...overrides,
		} as User;
	};

	const createMockUsersResponse = (totalCount: number, itemsCount: number): UsersList => {
		const items: User[] = [];
		for (let i = 0; i < itemsCount; i++) {
			items.push(createMockUser(i + 1));
		}
		return {
			count: totalCount,
			items,
		};
	};

	describe('users list query pagination and caching', () => {
		it('fetches one page on instance that has less than 50 users', async () => {
			const mockResponse = createMockUsersResponse(30, 30);
			vi.mocked(usersApi.getUsers).mockResolvedValueOnce(mockResponse);

			await useAccessSettingsCsvExport().downloadProjectRolesCsv();

			expect(usersApi.getUsers).toHaveBeenCalledTimes(1);

			expect(usersApi.getUsers).toHaveBeenCalledWith(
				mockedRestApiContext,
				expect.objectContaining({
					sortBy: ['email:desc'],
					take: 50,
					skip: 0,
					select: ['email', 'role'],
					expand: ['projectRelations'],
				}),
			);
		});

		it('fetches three pages on instance that has 140 users', async () => {
			// Mock getUsers with different responses for each call
			const page1Response = createMockUsersResponse(140, 50);
			const page2Response = createMockUsersResponse(140, 50);
			const page3Response = createMockUsersResponse(140, 40);

			vi.mocked(usersApi.getUsers)
				.mockResolvedValueOnce(page1Response)
				.mockResolvedValueOnce(page2Response)
				.mockResolvedValueOnce(page3Response);

			await useAccessSettingsCsvExport().downloadProjectRolesCsv();

			// Assert getUsers was called exactly 3 times
			expect(usersApi.getUsers).toHaveBeenCalledTimes(3);

			// Verify each call had correct skip values
			expect(usersApi.getUsers).toHaveBeenNthCalledWith(
				1,
				mockedRestApiContext,
				expect.objectContaining({
					skip: 0,
					take: 50,
				}),
			);
			expect(usersApi.getUsers).toHaveBeenNthCalledWith(
				2,
				mockedRestApiContext,
				expect.objectContaining({
					skip: 50,
					take: 50,
				}),
			);
			expect(usersApi.getUsers).toHaveBeenNthCalledWith(
				3,
				mockedRestApiContext,
				expect.objectContaining({
					skip: 100,
					take: 50,
				}),
			);
		});

		it('reuses promise from first requested download in second csv download to avoid duplicated requests', async () => {
			const mockResponse = createMockUsersResponse(30, 30);
			vi.mocked(usersApi.getUsers).mockResolvedValueOnce(mockResponse);

			const composable = useAccessSettingsCsvExport();

			// Call both download functions without awaiting first
			const promise1 = composable.downloadProjectRolesCsv();
			const promise2 = composable.downloadInstanceRolesCsv();
			await Promise.all([promise1, promise2]);

			// Assert getUsers was called exactly once (not twice)
			expect(usersApi.getUsers).toHaveBeenCalledTimes(1);
		});

		it('returns the cached users list without refetching it if defined', async () => {
			// Mock getUsers to return some users (only once!)
			const mockResponse = createMockUsersResponse(30, 30);
			vi.mocked(usersApi.getUsers).mockResolvedValueOnce(mockResponse);

			const composable = useAccessSettingsCsvExport();

			// First call
			await composable.downloadProjectRolesCsv();

			// Second call (should use cache)
			await composable.downloadProjectRolesCsv();

			// Assert getUsers was called exactly once total
			expect(usersApi.getUsers).toHaveBeenCalledTimes(1);
		});
	});
});
