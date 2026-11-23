import { createPinia, setActivePinia } from 'pinia';

import { createMockEnterpriseSettings } from '@/__tests__/mocks';
import { defaultSettings } from '@n8n/frontend-test-utils';
import { EnterpriseEditionFeature } from '@/app/constants';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useWorkflowReviewsFeature } from './useWorkflowReviewsFeature';

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

	it.each([
		{
			label: 'an unknown home project with reviews on',
			enabled: true,
			homeProject: undefined,
			expected: true,
		},
		{
			label: 'a team project with reviews off',
			enabled: false,
			homeProject: { type: 'team' as const },
			expected: false,
		},
	])(
		'returns $expected under an always required policy for $label',
		({ enabled, homeProject, expected }) => {
			const settingsStore = useSettingsStore();
			setGates({ licensed: true, instanceEnabled: enabled });
			settingsStore.settings = {
				...settingsStore.settings,
				workflowReviews: { enabled, alwaysRequired: true },
			};

			const { isReviewRequiredFor } = useWorkflowReviewsFeature();

			expect(isReviewRequiredFor(homeProject)).toBe(expected);
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
