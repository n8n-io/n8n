import { computed, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { WorkflowHistory, WorkflowVersion } from '@n8n/rest-api-client/api/workflowHistory';
import { useWorkflowHistoryVersionOptions } from './useWorkflowHistoryVersionOptions';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			if (key === 'workflowHistory.item.currentChanges') {
				return 'Current changes';
			}
			if (key === 'workflowHistory.item.publishedBy') {
				return 'Published by';
			}
			if (key === 'workflowHistory.item.active') {
				return 'Active';
			}
			if (key === 'workflowHistory.item.createdAt') {
				const date = options?.interpolate?.date ?? '';
				const time = options?.interpolate?.time ?? '';
				return `${date} at ${time}`;
			}
			return key;
		},
	}),
}));

const createHistoryVersion = (overrides: Partial<WorkflowHistory> = {}): WorkflowHistory => ({
	versionId: 'version-1',
	authors: 'Author One',
	createdAt: '2026-02-25T16:19:43.000Z',
	updatedAt: '2026-02-25T16:19:43.000Z',
	workflowPublishHistory: [],
	name: 'Version One',
	description: null,
	...overrides,
});

const createLoadedVersion = (overrides: Partial<WorkflowVersion> = {}): WorkflowVersion => ({
	...createHistoryVersion(),
	workflowId: 'wf-1',
	nodes: [],
	connections: {},
	...overrides,
});

describe('useWorkflowHistoryVersionOptions', () => {
	it('builds options with current changes label and keeps selected fallback versions', () => {
		const availableVersions = computed(() => [
			createHistoryVersion({ versionId: 'v-current', name: null }),
			createHistoryVersion({ versionId: 'v-old', name: null }),
		]);
		const loadedVersions = ref(
			new Map<string, WorkflowVersion>([
				['v-loaded', createLoadedVersion({ versionId: 'v-loaded', name: 'Loaded Version' })],
			]),
		);

		const { versionOptions } = useWorkflowHistoryVersionOptions({
			availableVersions,
			activeWorkflowVersionId: ref('v-current'),
			loadedVersions,
			selectedVersionIds: computed(() => ['v-current', 'v-loaded']),
			resolveUserDisplayName: () => null,
		});

		const optionsById = new Map(versionOptions.value.map((option) => [option.value, option]));

		expect(optionsById.get('v-current')?.label).toBe('Current changes');
		expect(optionsById.get('v-old')?.label).toBe('Version v-old');
		expect(optionsById.get('v-loaded')?.label).toBe('Loaded Version');
		expect(optionsById.has('v-loaded')).toBe(true);
	});

	it('marks latest version and exposes publish info', () => {
		const availableVersions = computed(() => [
			createHistoryVersion({
				versionId: 'v-published',
				workflowPublishHistory: [
					{
						id: 1,
						event: 'activated',
						createdAt: '2026-02-25T16:19:43.000Z',
						userId: 'user-1',
						versionId: 'v-published',
						workflowId: 'wf-1',
					},
				],
			}),
		]);

		const { versionOptions } = useWorkflowHistoryVersionOptions({
			availableVersions,
			activeWorkflowVersionId: ref(undefined),
			loadedVersions: ref(new Map()),
			selectedVersionIds: computed(() => ['v-published']),
			resolveUserDisplayName: (userId) => (userId === 'user-1' ? 'John Doe' : null),
		});

		expect(versionOptions.value[0].status).toBe('latest');
		expect(versionOptions.value[0].publishInfo).toEqual({
			publishedBy: 'John Doe',
			publishedAt: '2026-02-25T16:19:43.000Z',
		});
	});
});
