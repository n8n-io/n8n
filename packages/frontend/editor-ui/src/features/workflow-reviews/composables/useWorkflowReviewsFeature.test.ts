import { createPinia, setActivePinia } from 'pinia';

import { createMockEnterpriseSettings } from '@/__tests__/mocks';
import { defaultSettings } from '@/__tests__/defaults';
import { EnterpriseEditionFeature } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowReviewsFeature } from './useWorkflowReviewsFeature';

const { checkEnvFeatureFlag } = vi.hoisted(() => ({
	checkEnvFeatureFlag: vi.fn(),
}));

vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag: () => ({ check: { value: checkEnvFeatureFlag } }),
}));

describe('useWorkflowReviewsFeature', () => {
	const setGates = ({
		licensed,
		environmentEnabled,
		instanceEnabled,
	}: {
		licensed: boolean;
		environmentEnabled: boolean;
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
		checkEnvFeatureFlag.mockReturnValue(environmentEnabled);
	};

	beforeEach(() => {
		setActivePinia(createPinia());
		checkEnvFeatureFlag.mockReset();
	});

	it.each([
		{ licensed: false, environmentEnabled: false, expected: false },
		{ licensed: true, environmentEnabled: false, expected: false },
		{ licensed: false, environmentEnabled: true, expected: false },
		{ licensed: true, environmentEnabled: true, expected: true },
	])(
		'sets availability to $expected when licensed=$licensed and environmentEnabled=$environmentEnabled',
		({ licensed, environmentEnabled, expected }) => {
			setGates({ licensed, environmentEnabled, instanceEnabled: false });

			const { isWorkflowReviewsAvailable } = useWorkflowReviewsFeature();

			expect(isWorkflowReviewsAvailable.value).toBe(expected);
		},
	);

	it('is enabled when availability and the instance switch are enabled', () => {
		setGates({ licensed: true, environmentEnabled: true, instanceEnabled: true });

		const { isWorkflowReviewsEnabled } = useWorkflowReviewsFeature();

		expect(isWorkflowReviewsEnabled.value).toBe(true);
	});

	it('reacts to instance policy changes at runtime', () => {
		setGates({ licensed: true, environmentEnabled: true, instanceEnabled: true });
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
		{ licensed: false, environmentEnabled: true, instanceEnabled: true },
		{ licensed: true, environmentEnabled: false, instanceEnabled: true },
		{ licensed: true, environmentEnabled: true, instanceEnabled: false },
		{ licensed: true, environmentEnabled: true, instanceEnabled: undefined },
	])('fails closed when an enabled gate is false or missing', (gates) => {
		setGates(gates);

		const { isWorkflowReviewsEnabled } = useWorkflowReviewsFeature();

		expect(isWorkflowReviewsEnabled.value).toBe(false);
	});
});
