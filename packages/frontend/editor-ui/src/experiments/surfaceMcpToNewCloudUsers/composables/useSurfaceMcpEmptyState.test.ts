import { effectScope, ref, type EffectScope } from 'vue';
import { useSurfaceMcpEmptyState } from './useSurfaceMcpEmptyState';

const mocks = vi.hoisted(() => ({
	isEligible: { value: true },
	mcpAccessEnabled: false,
	isEnabled: false,
	isTileVariant: false,
	isFirstOpenModalVariant: false,
	hasDismissedFirstOpenModal: false,
	trackEntryPointViewed: vi.fn(),
	trackOpportunityViewed: vi.fn(),
}));

vi.mock('@/features/ai/mcpAccess/mcp.store', () => ({
	useMCPStore: () => ({
		get mcpAccessEnabled() {
			return mocks.mcpAccessEnabled;
		},
	}),
}));

vi.mock('../stores/surfaceMcpToNewCloudUsers.store', () => ({
	useSurfaceMcpToNewCloudUsersStore: () => ({
		get isEnabled() {
			return mocks.isEnabled;
		},
		get isTileVariant() {
			return mocks.isTileVariant;
		},
		get isFirstOpenModalVariant() {
			return mocks.isFirstOpenModalVariant;
		},
		get hasDismissedFirstOpenModal() {
			return mocks.hasDismissedFirstOpenModal;
		},
		trackEntryPointViewed: mocks.trackEntryPointViewed,
		trackOpportunityViewed: mocks.trackOpportunityViewed,
	}),
}));

vi.mock('./useSurfaceMcpToNewCloudUsersEligibility', () => ({
	useSurfaceMcpToNewCloudUsersEligibility: () => ({
		isEligible: mocks.isEligible,
	}),
}));

function renderComposable({
	canCreateWorkflow = true,
	showAppSelection = false,
	showBuilderPrompt = false,
	showRecommendedTemplatesInline = false,
}: Partial<{
	canCreateWorkflow: boolean;
	showAppSelection: boolean;
	showBuilderPrompt: boolean;
	showRecommendedTemplatesInline: boolean;
}> = {}) {
	const scope = effectScope();
	const result = scope.run(() =>
		useSurfaceMcpEmptyState({
			canCreateWorkflow: ref(canCreateWorkflow),
			showAppSelection: ref(showAppSelection),
			showBuilderPrompt: ref(showBuilderPrompt),
			showRecommendedTemplatesInline: ref(showRecommendedTemplatesInline),
		}),
	);

	if (!result) {
		throw new Error('Failed to render useSurfaceMcpEmptyState');
	}

	return { result, scope };
}

describe('useSurfaceMcpEmptyState', () => {
	let scope: EffectScope | undefined;

	beforeEach(() => {
		mocks.isEligible.value = true;
		mocks.mcpAccessEnabled = false;
		mocks.isEnabled = false;
		mocks.isTileVariant = false;
		mocks.isFirstOpenModalVariant = false;
		mocks.hasDismissedFirstOpenModal = false;
		mocks.trackEntryPointViewed.mockClear();
		mocks.trackOpportunityViewed.mockClear();
	});

	afterEach(() => {
		scope?.stop();
		scope = undefined;
	});

	it('tracks an eligible control opportunity without showing the tile', () => {
		mocks.isEnabled = true;
		mocks.isTileVariant = false;

		const rendered = renderComposable();
		scope = rendered.scope;

		expect(rendered.result.showOpportunity.value).toBe(true);
		expect(rendered.result.showTile.value).toBe(false);
		expect(rendered.result.suppressedBy.value).toBeNull();
		expect(mocks.trackOpportunityViewed).toHaveBeenCalledWith(
			'tile',
			'empty_state_tile',
			false,
			null,
			false,
		);
		expect(mocks.trackEntryPointViewed).not.toHaveBeenCalled();
	});

	it('tracks no-create suppression without showing the tile entry point', () => {
		mocks.isEnabled = true;
		mocks.isTileVariant = true;

		const rendered = renderComposable({ canCreateWorkflow: false });
		scope = rendered.scope;

		expect(rendered.result.showTile.value).toBe(false);
		expect(rendered.result.suppressedBy.value).toBe('no_create_permission');
		expect(mocks.trackOpportunityViewed).toHaveBeenCalledWith(
			'tile',
			'empty_state_tile',
			false,
			'no_create_permission',
			false,
		);
		expect(mocks.trackEntryPointViewed).not.toHaveBeenCalled();
	});

	it('shows and tracks the tile for tile variants', () => {
		mocks.isEnabled = true;
		mocks.isTileVariant = true;

		const rendered = renderComposable();
		scope = rendered.scope;

		expect(rendered.result.showTile.value).toBe(true);
		expect(rendered.result.suppressedBy.value).toBeNull();
		expect(mocks.trackOpportunityViewed).toHaveBeenCalledWith(
			'tile',
			'empty_state_tile',
			true,
			null,
			false,
		);
		expect(mocks.trackEntryPointViewed).toHaveBeenCalledWith('tile', 'empty_state_tile', false);
	});

	it('shows the reminder after the retained first-open modal was dismissed', () => {
		mocks.isFirstOpenModalVariant = true;
		mocks.hasDismissedFirstOpenModal = true;

		const rendered = renderComposable();
		scope = rendered.scope;

		expect(rendered.result.showReminder.value).toBe(true);
	});
});
