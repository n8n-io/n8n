import type { WorkflowCheckConfigDto } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import * as authoringChecksApi from '@/features/workflows/authoringChecks/authoringChecks.api';
import { useWorkflowAuthoringChecksStore } from '@/features/workflows/authoringChecks/authoringChecks.store';

vi.mock('@/features/workflows/authoringChecks/authoringChecks.api');

const enabledCheck: WorkflowCheckConfigDto = {
	checkId: 'check-1',
	title: 'Check 1',
	description: '',
	defaultSeverity: 'warning',
	severityOverride: null,
	effectiveSeverity: 'warning',
	enabled: true,
};

const disabledCheck: WorkflowCheckConfigDto = {
	...enabledCheck,
	checkId: 'check-2',
	enabled: false,
};

describe('useWorkflowAuthoringChecksStore', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.clearAllMocks();
	});

	it('reports no enabled checks before fetching', () => {
		const store = useWorkflowAuthoringChecksStore();
		expect(store.hasWorkflowChecksEnabled).toBe(false);
	});

	it('reports enabled checks after fetchChecks populates the list', async () => {
		vi.mocked(authoringChecksApi.listWorkflowAuthoringChecks).mockResolvedValue({
			checks: [enabledCheck, disabledCheck],
		});
		const store = useWorkflowAuthoringChecksStore();

		await store.fetchChecks();

		expect(store.checks).toEqual([enabledCheck, disabledCheck]);
		expect(store.hasWorkflowChecksEnabled).toBe(true);
	});

	it('reports no enabled checks when every check is disabled', async () => {
		vi.mocked(authoringChecksApi.listWorkflowAuthoringChecks).mockResolvedValue({
			checks: [disabledCheck],
		});
		const store = useWorkflowAuthoringChecksStore();

		await store.fetchChecks();

		expect(store.hasWorkflowChecksEnabled).toBe(false);
	});

	it('ensureChecksLoaded fetches only once across concurrent callers', async () => {
		vi.mocked(authoringChecksApi.listWorkflowAuthoringChecks).mockResolvedValue({
			checks: [enabledCheck],
		});
		const store = useWorkflowAuthoringChecksStore();

		await Promise.all([
			store.ensureChecksLoaded(),
			store.ensureChecksLoaded(),
			store.ensureChecksLoaded(),
		]);
		await store.ensureChecksLoaded();

		expect(authoringChecksApi.listWorkflowAuthoringChecks).toHaveBeenCalledTimes(1);
		expect(store.hasWorkflowChecksEnabled).toBe(true);
	});

	it('ensureChecksLoaded swallows fetch errors so callers proceed', async () => {
		vi.mocked(authoringChecksApi.listWorkflowAuthoringChecks).mockRejectedValue(
			new Error('network'),
		);
		const store = useWorkflowAuthoringChecksStore();

		await expect(store.ensureChecksLoaded()).resolves.toBeUndefined();
		expect(store.hasWorkflowChecksEnabled).toBe(false);
	});

	it('updateCheck replaces the matching entry in the list', async () => {
		vi.mocked(authoringChecksApi.listWorkflowAuthoringChecks).mockResolvedValue({
			checks: [enabledCheck],
		});
		vi.mocked(authoringChecksApi.updateWorkflowAuthoringCheckConfig).mockResolvedValue({
			...enabledCheck,
			enabled: false,
		});
		const store = useWorkflowAuthoringChecksStore();

		await store.fetchChecks();
		await store.updateCheck(enabledCheck.checkId, { enabled: false });

		expect(store.checks[0].enabled).toBe(false);
		expect(store.hasWorkflowChecksEnabled).toBe(false);
	});
});
