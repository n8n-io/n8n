import { createPinia, setActivePinia } from 'pinia';

import { createMockEnterpriseSettings } from '@/__tests__/mocks';
import { defaultSettings } from '@n8n/frontend-test-utils';
import { EnterpriseEditionFeature } from '@/app/constants';
import type { WorkflowReviewRequirementLevel } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import { fetchWorkflowReviewRequests } from '@/features/workflow-reviews/workflowReviews.api';
import { useWorkflowReviewsFeature } from './useWorkflowReviewsFeature';

vi.mock('@/features/workflow-reviews/workflowReviews.api', () => ({
	fetchWorkflowReviewRequests: vi.fn(),
}));

describe('useWorkflowReviewsFeature', () => {
	const setGates = ({
		licensed,
		instanceEnabled,
	}: {
		licensed: boolean;
		instanceEnabled?: boolean;
	}) => {
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			...defaultSettings,
			enterprise: createMockEnterpriseSettings({
				[EnterpriseEditionFeature.WorkflowReviews]: licensed,
			}),
			...(instanceEnabled === undefined
				? { workflowReviews: undefined }
				: { workflowReviews: { enabled: instanceEnabled } }),
		};
	};

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it.each([
		{ licensed: false, expected: false },
		{ licensed: true, expected: true },
	])('sets availability to $expected when licensed=$licensed', ({ licensed, expected }) => {
		setGates({ licensed, instanceEnabled: false });

		const { isWorkflowReviewsAvailable } = useWorkflowReviewsFeature();

		expect(isWorkflowReviewsAvailable.value).toBe(expected);
	});

	it('is enabled when availability and the instance switch are enabled', () => {
		setGates({ licensed: true, instanceEnabled: true });

		const { isWorkflowReviewsEnabled } = useWorkflowReviewsFeature();

		expect(isWorkflowReviewsEnabled.value).toBe(true);
	});

	it('reacts to instance policy changes at runtime', () => {
		setGates({ licensed: true, instanceEnabled: true });
		const settingsStore = useSettingsStore();
		const { isWorkflowReviewsEnabled } = useWorkflowReviewsFeature();

		expect(isWorkflowReviewsEnabled.value).toBe(true);

		settingsStore.settings = {
			...settingsStore.settings,
			workflowReviews: { enabled: false },
		};

		expect(isWorkflowReviewsEnabled.value).toBe(false);
	});

	it.each<{
		label: string;
		enabled: boolean;
		alwaysRequired?: boolean;
		serverLevel?: WorkflowReviewRequirementLevel | null;
		homeProject?: { type: 'team' | 'personal' };
		expected: WorkflowReviewRequirementLevel | null;
	}>([
		{
			label: 'the server level over the instance rule',
			enabled: true,
			serverLevel: 'project',
			homeProject: { type: 'team' },
			expected: 'project',
		},
		{
			label: 'the instance rule for a team workflow before the first fetch',
			enabled: true,
			homeProject: { type: 'team' },
			expected: 'instance',
		},
		{
			label: 'the instance rule for an unknown home project before the first fetch',
			enabled: true,
			expected: 'instance',
		},
		{
			label: 'no level for a personal workflow before the first fetch',
			enabled: true,
			homeProject: { type: 'personal' },
			expected: null,
		},
		{
			label:
				'no level for a team workflow before the first fetch when approval is required only when configured',
			enabled: true,
			alwaysRequired: false,
			homeProject: { type: 'team' },
			expected: null,
		},
		{
			label: 'no level when workflow reviews are off',
			enabled: false,
			serverLevel: 'project',
			homeProject: { type: 'team' },
			expected: null,
		},
	])(
		'reports $label',
		async ({ enabled, alwaysRequired = true, serverLevel, homeProject, expected }) => {
			setGates({ licensed: true, instanceEnabled: true });
			const settingsStore = useSettingsStore();
			settingsStore.settings = {
				...settingsStore.settings,
				workflowReviews: { enabled, alwaysRequired },
			};
			if (serverLevel !== undefined) {
				vi.mocked(fetchWorkflowReviewRequests).mockResolvedValue({
					count: 0,
					data: [],
					reviewRequiredBy: serverLevel,
				});
				await useWorkflowReviewStatusStore().fetchStatus('workflow-1');
			}

			const { reviewRequiredBy, isReviewRequiredFor } = useWorkflowReviewsFeature();
			const workflow = { id: 'workflow-1', homeProject };

			expect(reviewRequiredBy(workflow)).toBe(expected);
			expect(isReviewRequiredFor(workflow)).toBe(expected !== null);
		},
	);

	it.each([
		{ licensed: false, instanceEnabled: true },
		{ licensed: true, instanceEnabled: false },
		{ licensed: true, instanceEnabled: undefined },
	])('fails closed when an enabled gate is false or missing', (gates) => {
		setGates(gates);

		const { isWorkflowReviewsEnabled } = useWorkflowReviewsFeature();

		expect(isWorkflowReviewsEnabled.value).toBe(false);
	});
});
