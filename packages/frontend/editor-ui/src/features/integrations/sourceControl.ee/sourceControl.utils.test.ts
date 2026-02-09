import {
	getStatusText,
	getStatusTheme,
	getPullPriorityByStatus,
	getPushPriorityByStatus,
	notifyUserAboutPullWorkFolderOutcome,
} from './sourceControl.utils';
import type { useToast } from '@/app/composables/useToast';
import type { Router } from 'vue-router';

import { SOURCE_CONTROL_FILE_STATUS } from '@n8n/api-types';

describe('source control utils', () => {
	describe('getStatusText()', () => {
		it('uses i18n', () => {
			expect(getStatusText(SOURCE_CONTROL_FILE_STATUS.new)).toStrictEqual(
				expect.stringContaining(SOURCE_CONTROL_FILE_STATUS.new),
			);
		});
	});

	describe('getStatusTheme()', () => {
		it('only handles known values', () => {
			expect(getStatusTheme('unknown')).toBe(undefined);
		});
	});

	describe('getPullPriorityByStatus()', () => {
		it('defaults to 0', () => {
			expect(getPullPriorityByStatus(SOURCE_CONTROL_FILE_STATUS.new)).toBe(0);
		});
	});

	describe('getPushPriorityByStatus()', () => {
		it('defaults to 0', () => {
			expect(getPushPriorityByStatus(SOURCE_CONTROL_FILE_STATUS.new)).toBe(0);
		});
	});

	describe('notifyUserAboutPullWorkFolderOutcome()', () => {
		it('should show up to date notification when there are no changes', async () => {
			const toast = { showMessage: vi.fn() } as unknown as ReturnType<typeof useToast>;
			const router = {
				push: vi.fn(),
				resolve: vi.fn().mockReturnValue({ href: '/test' }),
			} as unknown as Router;
			await notifyUserAboutPullWorkFolderOutcome([], toast, router);

			expect(toast.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Up to date',
				}),
			);
		});

		it('should show granular feedback', async () => {
			const toast = { showToast: vi.fn() } as unknown as ReturnType<typeof useToast>;
			const router = {
				push: vi.fn(),
				resolve: vi.fn().mockReturnValue({ href: '/test' }),
			} as unknown as Router;
			await notifyUserAboutPullWorkFolderOutcome(
				[
					{
						id: '014da93897f146d2b880-baa374b9d02d',
						name: 'vuelfow2',
						type: 'workflow',
						status: 'created',
						location: 'remote',
						conflict: false,
						file: '/014da93897f146d2b880-baa374b9d02d.json',
						updatedAt: '2025-01-09T13:12:24.580Z',
					},
					{
						id: 'a102c0b9-28ac-43cb-950e-195723a56d54',
						name: 'Gmail account',
						type: 'credential',
						status: 'created',
						location: 'remote',
						conflict: false,
						file: '/a102c0b9-28ac-43cb-950e-195723a56d54.json',
						updatedAt: '2025-01-09T13:12:24.586Z',
					},
					{
						id: 'variables',
						name: 'variables',
						type: 'variables',
						status: 'modified',
						location: 'remote',
						conflict: false,
						file: '/variable_stubs.json',
						updatedAt: '2025-01-09T13:12:24.588Z',
					},
					{
						id: 'mappings',
						name: 'tags',
						type: 'tags',
						status: 'modified',
						location: 'remote',
						conflict: false,
						file: '/tags.json',
						updatedAt: '2024-12-16T12:53:12.155Z',
					},
				],
				toast,
				router,
			);

			expect(toast.showToast).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					title: 'Finish setting up your new variables to use in workflows',
				}),
			);
			expect(toast.showToast).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					title: 'Finish setting up your new credentials to use in workflows',
				}),
			);
			expect(toast.showToast).toHaveBeenNthCalledWith(
				3,
				expect.objectContaining({
					message: '1 Workflow, 1 Credential, Variables, and Tags were pulled',
				}),
			);
		});

		it('should show granular feedback with data tables', async () => {
			const toast = { showToast: vi.fn() } as unknown as ReturnType<typeof useToast>;
			const router = {
				push: vi.fn(),
				resolve: vi.fn().mockReturnValue({ href: '/test' }),
			} as unknown as Router;
			await notifyUserAboutPullWorkFolderOutcome(
				[
					{
						id: '014da93897f146d2b880-baa374b9d02d',
						name: 'My Workflow',
						type: 'workflow',
						status: 'created',
						location: 'remote',
						conflict: false,
						file: '/014da93897f146d2b880-baa374b9d02d.json',
						updatedAt: '2025-01-09T13:12:24.580Z',
					},
					{
						id: 'data-table-1',
						name: 'Customer Data',
						type: 'datatable',
						status: 'created',
						location: 'remote',
						conflict: false,
						file: '/data_tables.json',
						updatedAt: '2025-01-09T13:12:24.586Z',
					},
					{
						id: 'data-table-2',
						name: 'Sales Data',
						type: 'datatable',
						status: 'modified',
						location: 'remote',
						conflict: false,
						file: '/data_tables.json',
						updatedAt: '2025-01-09T13:12:24.587Z',
					},
				],
				toast,
				router,
			);

			expect(toast.showToast).toHaveBeenCalledWith(
				expect.objectContaining({
					message: '1 Workflow and 2 Data tables were pulled',
				}),
			);
		});

		it('should use plural verb when only plural-only resources are pulled', async () => {
			const toast = { showToast: vi.fn() } as unknown as ReturnType<typeof useToast>;
			const router = {
				push: vi.fn(),
				resolve: vi.fn().mockReturnValue({ href: '/test' }),
			} as unknown as Router;

			// Test with only 1 tag (plural-only resource)
			await notifyUserAboutPullWorkFolderOutcome(
				[
					{
						id: 'mappings',
						name: 'tags',
						type: 'tags',
						status: 'modified',
						location: 'remote',
						conflict: false,
						file: '/tags.json',
						updatedAt: '2024-12-16T12:53:12.155Z',
					},
				],
				toast,
				router,
			);

			expect(toast.showToast).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Tags were pulled',
				}),
			);
		});

		it('should use plural verb when only variables are pulled', async () => {
			const toast = { showToast: vi.fn() } as unknown as ReturnType<typeof useToast>;
			const router = {
				push: vi.fn(),
				resolve: vi.fn().mockReturnValue({ href: '/test' }),
			} as unknown as Router;

			// Test with only variables (plural-only resource)
			await notifyUserAboutPullWorkFolderOutcome(
				[
					{
						id: 'variables',
						name: 'variables',
						type: 'variables',
						status: 'modified',
						location: 'remote',
						conflict: false,
						file: '/variable_stubs.json',
						updatedAt: '2025-01-09T13:12:24.588Z',
					},
				],
				toast,
				router,
			);

			expect(toast.showToast).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					title: 'Finish setting up your new variables to use in workflows',
				}),
			);
			expect(toast.showToast).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					message: 'Variables were pulled',
				}),
			);
		});
	});
});
