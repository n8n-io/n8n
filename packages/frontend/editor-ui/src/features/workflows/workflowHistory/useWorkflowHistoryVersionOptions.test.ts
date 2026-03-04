import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import type { WorkflowHistory } from '@n8n/rest-api-client/api/workflowHistory';
import { useWorkflowHistoryVersionOptions } from './useWorkflowHistoryVersionOptions';

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

describe('useWorkflowHistoryVersionOptions', () => {
	it('builds options with current changes label and keeps selected fallback versions', () => {
		const availableVersions = computed(() => [
			createHistoryVersion({ versionId: 'v-current', name: null }),
			createHistoryVersion({ versionId: 'v-old', name: null }),
		]);

		const { versionOptions } = useWorkflowHistoryVersionOptions({
			availableVersions,
			currentWorkflowVersionId: ref('v-current'),
			publishedWorkflowVersionId: ref(undefined),
			selectedVersionIds: computed(() => ['v-current', 'v-loaded']),
			resolveUserDisplayName: () => null,
		});

		const optionsById = new Map(versionOptions.value.map((option) => [option.value, option]));

		expect(optionsById.get('v-current')?.label).toBe('Current changes');
		expect(optionsById.get('v-old')?.label).toBe('Version v-old');
		expect(optionsById.get('v-loaded')?.label).toBe('Version v-loaded');
		expect(optionsById.has('v-loaded')).toBe(true);
	});

	it('marks published version and exposes publish info', () => {
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
			currentWorkflowVersionId: ref(undefined),
			publishedWorkflowVersionId: ref('v-published'),
			selectedVersionIds: computed(() => ['v-published']),
			resolveUserDisplayName: (userId) => (userId === 'user-1' ? 'John Doe' : null),
		});

		expect(versionOptions.value[0].status).toBe('published');
		expect(versionOptions.value[0].publishInfo).toEqual({
			publishedBy: 'John Doe',
			publishedAt: '2026-02-25T16:19:43.000Z',
		});
	});
});
