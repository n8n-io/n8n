import {
	getTemplatePathByRole,
	isExtraTemplateLinksExperimentEnabled,
	TemplateClickSource,
	trackTemplatesClick,
} from './experiments';

const getVariant = vi.fn();
vi.mock('@/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

let isTrialing = false;
vi.mock('@/stores/cloudPlan.store', () => ({
	useCloudPlanStore: vi.fn(() => ({
		userIsTrialing: isTrialing,
		currentUserCloudInfo: {
			role: 'test_role',
		},
	})),
}));

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		userIsTrialing: isTrialing,
		activeWorkflows: [1, 2, 3],
	})),
}));

const mockTrack = vi.fn();
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: mockTrack,
	})),
}));

describe('Utils: experiments', () => {
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
