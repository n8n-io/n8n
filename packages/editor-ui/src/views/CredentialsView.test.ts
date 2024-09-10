import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import type { Scope } from '@n8n/permissions';
import { useCredentialsStore } from '@/stores/credentials.store';
import type { ProjectSharingData } from '@/types/projects.types';
import CredentialsView from '@/views/CredentialsView.vue';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';

vi.mock('@/components/layouts/ResourcesListLayout.vue', async (importOriginal) => {
	const original = await importOriginal<typeof ResourcesListLayout>();
	return {
		default: {
			...original.default,
			render: vi.fn(),
			setup: vi.fn(),
		},
	};
});

const renderComponent = createComponentRenderer(CredentialsView);

describe('CredentialsView', () => {
	describe('with fake stores', () => {
		let credentialsStore: ReturnType<typeof useCredentialsStore>;

		beforeEach(() => {
			createTestingPinia();
			credentialsStore = useCredentialsStore();
		});

		afterAll(() => {
			vi.resetAllMocks();
		});
		it('should have ResourcesListLayout render with necessary keys from credential object', () => {
			const homeProject: ProjectSharingData = {
				id: '1',
				name: 'test',
				type: 'personal',
				createdAt: '2021-05-05T00:00:00Z',
				updatedAt: '2021-05-05T00:00:00Z',
			};
			const scopes: Scope[] = ['credential:move', 'credential:delete'];
			const sharedWithProjects: ProjectSharingData[] = [
				{
					id: '2',
					name: 'test 2',
					type: 'personal',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
				},
			];
			vi.spyOn(credentialsStore, 'allCredentials', 'get').mockReturnValue([
				{
					id: '1',
					name: 'test',
					type: 'test',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					homeProject,
					scopes,
					sharedWithProjects,
				},
			]);
			renderComponent();
			expect(ResourcesListLayout.setup).toHaveBeenCalledWith(
				expect.objectContaining({
					resources: [
						expect.objectContaining({
							type: 'test',
							homeProject,
							scopes,
							sharedWithProjects,
						}),
					],
				}),
				null,
			);
		});

		it('should disable cards based on permissions', () => {
			vi.spyOn(credentialsStore, 'allCredentials', 'get').mockReturnValue([
				{
					id: '1',
					name: 'test',
					type: 'test',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
				},
				{
					id: '2',
					name: 'test2',
					type: 'test2',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
				},
			]);

			renderComponent();
			expect(ResourcesListLayout.setup).toHaveBeenCalledWith(
				expect.objectContaining({
					resources: [
						expect.objectContaining({
							readOnly: false,
						}),
						expect.objectContaining({
							readOnly: true,
						}),
					],
				}),
				null,
			);
		});
	});
});
