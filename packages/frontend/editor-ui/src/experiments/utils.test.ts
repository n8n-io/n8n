import { setActivePinia, createPinia } from 'pinia';
import {
	getExperimentTelemetryPayload,
	getTemplatePathByRole,
	isExtraTemplateLinksExperimentEnabled,
	TemplateClickSource,
	trackTemplatesClick,
} from './utils';

const getVariant = vi.fn();
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

let isTrialing = false;
vi.mock('@/app/stores/cloudPlan.store', () => ({
	useCloudPlanStore: vi.fn(() => ({
		userIsTrialing: isTrialing,
		currentUserCloudInfo: {
			role: 'test_role',
		},
	})),
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: vi.fn(() => ({
		activeWorkflows: [1, 2, 3],
	})),
}));

const mockTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: mockTrack,
	})),
}));

describe('Utils: experiments', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('getExperimentTelemetryPayload()', () => {
		it('adds PostHog experiment attribution properties', () => {
			expect(
				getExperimentTelemetryPayload({ name: 'example_experiment' }, 'control', {
					source: 'empty_state',
				}),
			).toEqual({
				source: 'empty_state',
				variant: 'control',
				'$feature/example_experiment': 'control',
			});
		});

		it('leaves payloads unchanged when the user is not enrolled', () => {
			expect(
				getExperimentTelemetryPayload({ name: 'example_experiment' }, undefined, {
					source: 'empty_state',
				}),
			).toEqual({
				source: 'empty_state',
			});
		});

		it('leaves payloads unchanged for boolean feature flags', () => {
			expect(
				getExperimentTelemetryPayload({ name: 'example_flag' }, true, {
					source: 'empty_state',
				}),
			).toEqual({
				source: 'empty_state',
			});
		});
	});

	describe('isExtraTemplateLinksExperimentEnabled()', () => {
		it.each([
			{
				variant: 'control',
				trial: false,
				enabled: false,
			},
			{
				variant: 'variant',
				trial: false,
				enabled: false,
			},
			{
				variant: 'control',
				trial: true,
				enabled: false,
			},
			{
				variant: 'variant',
				trial: true,
				enabled: true,
			},
		])(
			'should return $enabled when the variant is $variant and user trialing is $trial',
			({ variant, trial, enabled }) => {
				getVariant.mockReturnValueOnce(variant);
				isTrialing = trial;

				expect(isExtraTemplateLinksExperimentEnabled()).toEqual(enabled);
			},
		);
	});

	describe('getTemplatePathByRole()', () => {
		it.each([
			['Executive/Owner', 'categories/ai/'],
			['Product & Design', 'categories/ai/'],
			['Support', 'categories/support/'],
			['Sales', 'categories/sales/'],
			['IT', 'categories/it-ops/'],
			['Engineering', 'categories/it-ops/'],
			['Marketing', 'categories/marketing/'],
			['Other', 'categories/other/'],
			[null, ''],
			[undefined, ''],
			['Unknown Role', ''],
		])('should return correct path for role "%s"', (role, expectedPath) => {
			expect(getTemplatePathByRole(role)).toBe(expectedPath);
		});
	});

	describe('trackTemplatesClick()', () => {
		it.each([
			TemplateClickSource.sidebarButton,
			TemplateClickSource.emptyInstanceCard,
			TemplateClickSource.emptyWorkflowLink,
		])('should call telemetry track with correct parameters', (source) => {
			trackTemplatesClick(source);

			expect(mockTrack).toHaveBeenCalledWith('User clicked on templates', {
				role: 'test_role',
				active_workflow_count: 3,
				source,
			});
		});
	});
});
