import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IWorkflowDb } from '@/Interface';
import { LOCAL_STORAGE_RECENT_WORKFLOWS } from '@/app/constants/localStorage';
import { useRecentWorkflowsStore } from '@/app/stores/recentWorkflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

describe('recentWorkflows.store', () => {
	beforeEach(() => {
		localStorage.removeItem(LOCAL_STORAGE_RECENT_WORKFLOWS);
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-22T10:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('should migrate the legacy array into the unscoped bucket', () => {
		localStorage.setItem(
			LOCAL_STORAGE_RECENT_WORKFLOWS,
			JSON.stringify([
				{ id: 'workflow-1', openedAt: 100 },
				{ id: '', openedAt: 200 },
				{ id: 'workflow-1', openedAt: 300 },
				{ id: 'workflow-2', openedAt: 200 },
				{ id: 'workflow-invalid', openedAt: 'invalid' },
			]),
		);

		const store = useRecentWorkflowsStore();

		expect(store.globalRecentWorkflowOpens).toEqual([
			{ id: 'workflow-1', openedAt: 300 },
			{ id: 'workflow-2', openedAt: 200 },
		]);
		expect(store.getRecentWorkflowOpensForProject('project-1')).toEqual([]);
		expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_RECENT_WORKFLOWS) ?? '')).toEqual({
			version: 2,
			byProject: {},
			unscoped: [
				{ id: 'workflow-1', openedAt: 300 },
				{ id: 'workflow-2', openedAt: 200 },
			],
		});
	});

	it('should keep project buckets independent and move reopened workflows to the front', () => {
		const store = useRecentWorkflowsStore();

		store.registerWorkflowOpen('workflow-1', 'project-1');
		vi.advanceTimersByTime(1);
		store.registerWorkflowOpen('workflow-2', 'project-1');
		vi.advanceTimersByTime(1);
		store.registerWorkflowOpen('workflow-1', 'project-1');
		store.registerWorkflowOpen('workflow-3', 'project-2');

		expect(store.getRecentWorkflowOpensForProject('project-1').map(({ id }) => id)).toEqual([
			'workflow-1',
			'workflow-2',
		]);
		expect(store.getRecentWorkflowOpensForProject('project-2').map(({ id }) => id)).toEqual([
			'workflow-3',
		]);
	});

	it('should cap each bucket at 50 workflows', () => {
		const store = useRecentWorkflowsStore();

		for (let index = 0; index < 51; index++) {
			vi.advanceTimersByTime(1);
			store.registerWorkflowOpen(`workflow-${index}`, 'project-1');
			store.registerWorkflowOpen(`unscoped-${index}`);
		}

		expect(store.getRecentWorkflowOpensForProject('project-1')).toHaveLength(50);
		expect(
			store.globalRecentWorkflowOpens.filter(({ id }) => id.startsWith('unscoped-')),
		).toHaveLength(50);
	});

	it('should order global workflows by recency and de-duplicate workflow ids', () => {
		const store = useRecentWorkflowsStore();

		store.registerWorkflowOpen('workflow-1');
		vi.advanceTimersByTime(1);
		store.registerWorkflowOpen('workflow-2', 'project-1');
		vi.advanceTimersByTime(1);
		store.registerWorkflowOpen('workflow-1', 'project-2');

		expect(store.globalRecentWorkflowOpens.map(({ id }) => id)).toEqual([
			'workflow-1',
			'workflow-2',
		]);
	});

	it('should resolve candidates in one project-scoped request and restore local order', async () => {
		localStorage.setItem(
			LOCAL_STORAGE_RECENT_WORKFLOWS,
			JSON.stringify({
				version: 2,
				byProject: {
					'project-1': [{ id: 'project-missing', openedAt: 400 }],
				},
				unscoped: [
					{ id: 'workflow-1', openedAt: 300 },
					{ id: 'workflow-2', openedAt: 200 },
					{ id: 'missing-workflow', openedAt: 100 },
				],
			}),
		);
		const workflowsListStore = useWorkflowsListStore();
		vi.spyOn(workflowsListStore, 'searchWorkflows').mockResolvedValue([
			{ id: 'workflow-2', name: 'Second' },
			{ id: 'workflow-1', name: 'First' },
		] as IWorkflowDb[]);
		const store = useRecentWorkflowsStore();

		const result = await store.resolveRecentWorkflows('project-1', ['workflow-2']);

		expect(workflowsListStore.searchWorkflows).toHaveBeenCalledExactlyOnceWith({
			projectId: 'project-1',
			ids: ['project-missing', 'workflow-1', 'workflow-2', 'missing-workflow'],
			isArchived: false,
			select: ['id', 'name', 'updatedAt'],
			options: { take: 50, skip: 0, includeScopes: false },
		});
		expect(result.map(({ id }) => id)).toEqual(['workflow-1']);
		expect(store.getRecentWorkflowOpensForProject('project-1').map(({ id }) => id)).toEqual([
			'workflow-1',
			'workflow-2',
		]);
	});

	it('should return at most 10 resolved workflows', async () => {
		const workflowsListStore = useWorkflowsListStore();
		const workflows = Array.from({ length: 12 }, (_, index) => ({
			id: `workflow-${index}`,
			name: `Workflow ${index}`,
		})) as IWorkflowDb[];
		vi.spyOn(workflowsListStore, 'searchWorkflows').mockResolvedValue([...workflows].reverse());
		const store = useRecentWorkflowsStore();
		for (let index = 0; index < workflows.length; index++) {
			vi.advanceTimersByTime(1);
			store.registerWorkflowOpen(`workflow-${index}`, 'project-1');
		}

		const result = await store.resolveRecentWorkflows('project-1');

		expect(result).toHaveLength(10);
		expect(result.map(({ id }) => id)).toEqual([
			'workflow-11',
			'workflow-10',
			'workflow-9',
			'workflow-8',
			'workflow-7',
			'workflow-6',
			'workflow-5',
			'workflow-4',
			'workflow-3',
			'workflow-2',
		]);
	});

	it('should preserve a workflow reopened while resolution is in progress', async () => {
		const workflowsListStore = useWorkflowsListStore();
		let resolveSearch: (workflows: IWorkflowDb[]) => void = () => {};
		vi.spyOn(workflowsListStore, 'searchWorkflows').mockReturnValue(
			new Promise((resolve) => {
				resolveSearch = resolve;
			}),
		);
		const store = useRecentWorkflowsStore();
		store.registerWorkflowOpen('workflow-1', 'project-1');
		const resolution = store.resolveRecentWorkflows('project-1');

		vi.advanceTimersByTime(1);
		store.registerWorkflowOpen('workflow-1', 'project-1');
		const reopenedAt = store.getRecentWorkflowOpensForProject('project-1')[0].openedAt;
		resolveSearch([]);
		await resolution;

		expect(store.getRecentWorkflowOpensForProject('project-1')).toEqual([
			{ id: 'workflow-1', openedAt: reopenedAt },
		]);
	});
});
