import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { renderComponent } from '@/__tests__/render';
import WorkflowTagsDropdown from './WorkflowTagsDropdown.vue';
import { mockedStore } from '@/__tests__/utils';
import { useTagsStore } from '../tags.store';

const hasPermission = vi.hoisted(() =>
	vi.fn<(_checks: unknown, opts?: { rbac?: { scope?: string } }) => boolean>(() => true),
);

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission,
}));

// Stub the inner TagsDropdown so we can inspect the props the wrapper passes to it
// without triggering Element Plus teleport/select complexity.
const capturedProps: Record<string, unknown>[] = [];
vi.mock('./TagsDropdown.vue', () => ({
	default: {
		name: 'TagsDropdown',
		props: {
			createEnabled: Boolean,
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

function withScopes(...allowed: string[]) {
	hasPermission.mockImplementation(
		(_checks: unknown, opts?: { rbac?: { scope?: string } }) =>
			!opts?.rbac?.scope || allowed.includes(opts.rbac.scope),
	);
}

describe('WorkflowTagsDropdown — scope-derived props', () => {
	beforeEach(() => {
		createTestingPinia();
		capturedProps.length = 0;
		hasPermission.mockReturnValue(true);

		// Prevent fetchAll from calling the API in every test
		const store = mockedStore(useTagsStore);
		store.fetchAll = vi.fn().mockResolvedValue([]);
		store.allTags = [];
		store.isLoading = false;
		store.tagsById = {};
	});

	describe('createEnabled', () => {
		it('is true when props.createEnabled=true and tag:create is granted', () => {
			withScopes('tag:create', 'tag:update', 'tag:delete');
			renderComponent(WorkflowTagsDropdown, { props: { createEnabled: true } });

			expect(capturedProps.at(-1)?.createEnabled).toBe(true);
		});

		it('is false when props.createEnabled=true but tag:create is denied', () => {
			withScopes('tag:update', 'tag:delete');
			renderComponent(WorkflowTagsDropdown, { props: { createEnabled: true } });

			expect(capturedProps.at(-1)?.createEnabled).toBe(false);
		});

		it('is false when props.createEnabled=false even if tag:create is granted', () => {
			withScopes('tag:create', 'tag:update', 'tag:delete');
			renderComponent(WorkflowTagsDropdown, { props: { createEnabled: false } });

			expect(capturedProps.at(-1)?.createEnabled).toBe(false);
		});
	});

	describe('manageEnabled', () => {
		it('is true when the user has tag:create', () => {
			withScopes('tag:create');
			renderComponent(WorkflowTagsDropdown);

			expect(capturedProps.at(-1)?.manageEnabled).toBe(true);
		});

		it('is true when the user has tag:update', () => {
			withScopes('tag:update');
			renderComponent(WorkflowTagsDropdown);

			expect(capturedProps.at(-1)?.manageEnabled).toBe(true);
		});

		it('is true when the user has tag:delete', () => {
			withScopes('tag:delete');
			renderComponent(WorkflowTagsDropdown);

			expect(capturedProps.at(-1)?.manageEnabled).toBe(true);
		});

		it('is false when the user has only tag:read + tag:list (view-only)', () => {
			withScopes();
			renderComponent(WorkflowTagsDropdown);

			expect(capturedProps.at(-1)?.manageEnabled).toBe(false);
		});
	});
});
