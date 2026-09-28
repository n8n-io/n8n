import { createTestingPinia } from '@pinia/testing';
import { renderComponent } from '@/__tests__/render';
import AnnotationTagsDropdown from './AnnotationTagsDropdown.ee.vue';
import { mockedStore } from '@/__tests__/utils';
import { useAnnotationTagsStore } from '../tags.store';

const hasPermission = vi.hoisted(() =>
	vi.fn<(_checks: unknown, opts?: { rbac?: { scope?: string } }) => boolean>(() => true),
);

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission,
}));

// Stub the inner TagsDropdown so we can inspect the props the wrapper passes to it
// without triggering Element Plus teleport/select complexity.
const capturedProps: Array<Record<string, unknown>> = [];
vi.mock('./TagsDropdown.vue', () => ({
	default: {
		name: 'TagsDropdown',
		props: {
			createEnabled: Boolean,
			createBlockedI18nKey: String,
			manageEnabled: Boolean,
			allTags: Array,
			isLoading: Boolean,
			tagsById: Object,
			modelValue: Array,
			placeholder: String,
			eventBus: Object,
			createTag: Function,
		},
		setup(props: Record<string, unknown>) {
			capturedProps.push({ ...props });
		},
		template: '<div data-test-id="tags-dropdown-stub" />',
	},
}));

describe('AnnotationTagsDropdown', () => {
	beforeEach(() => {
		createTestingPinia();
		capturedProps.length = 0;

		const store = mockedStore(useAnnotationTagsStore);
		store.fetchAll = vi.fn().mockResolvedValue([]);
		store.allTags = [];
		store.isLoading = false;
		store.tagsById = {};
	});

	it('never passes createBlockedI18nKey, whatever the annotation tag scopes are', () => {
		// The permission note is worded for workflow tags and driven by `tag:create`.
		// Annotation tags have their own scopes, so wiring them up is a separate change.
		hasPermission.mockReturnValue(false);
		renderComponent(AnnotationTagsDropdown, { props: { createEnabled: true } });

		expect(capturedProps).toHaveLength(1);
		expect(capturedProps.at(-1)?.createEnabled).toBe(false);
		expect(capturedProps.at(-1)?.createBlockedI18nKey).toBeUndefined();
	});
});
