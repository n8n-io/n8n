import { createTestingPinia } from '@pinia/testing';

import { renderComponent } from '@/__tests__/render';
import TagsDropdown from './TagsDropdown.vue';
import { MAX_TAG_NAME_LENGTH } from '../tags.constants';

/**
 * Covers TagsDropdown reaching through N8nSelect's exposed template ref into the
 * wrapped element-plus instance.
 *
 * `onMounted` does:
 *
 *     const select = selectRef.value?.innerSelect;
 *     if (select) {
 *       const input = select.$refs.input as Element | undefined;
 *       if (input) { input.setAttribute('maxlength', `${MAX_TAG_NAME_LENGTH}`); ... }
 *     }
 *
 * Both reads sit behind guards, so if `innerSelect` ever stops resolving this
 * fails *silently* - nothing throws and every existing test still passes. The
 * tag-name cap and the Escape/Enter handling just quietly disappear.
 *
 * These assertions therefore target the observable side effects of that block
 * rather than the ref itself, and they are the only coverage of this integration:
 * WorkflowTagsDropdown.test.ts and ExecutionsFilter.test.ts both mock TagsDropdown
 * away, so neither exercises it.
 *
 * `$refs.input` only exists on ElSelect when both `filterable` and `multiple` are
 * set, which TagsDropdown's template does.
 */
const ALL_TAGS = [
	{ id: '1', name: 'alpha', createdAt: '', updatedAt: '' },
	{ id: '2', name: 'beta', createdAt: '', updatedAt: '' },
];

const renderDropdown = () =>
	renderComponent(TagsDropdown, {
		pinia: createTestingPinia(),
		props: {
			placeholder: 'pick tags',
			modelValue: [],
			eventBus: null,
			allTags: ALL_TAGS,
			isLoading: false,
			tagsById: { '1': ALL_TAGS[0], '2': ALL_TAGS[1] },
		},
	});

const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));

describe('TagsDropdown - N8nSelect innerSelect integration', () => {
	it('caps the tag name length on the inner element-plus input', async () => {
		const { container } = renderDropdown();
		await flush();

		const input = container.querySelector('input');

		expect(input).not.toBeNull();
		// Only passes if `innerSelect` resolved to the element-plus instance and
		// `innerSelect.$refs.input` was present.
		expect(input?.getAttribute('maxlength')).toBe(String(MAX_TAG_NAME_LENGTH));
	});

	it('emits esc from the keydown listener bound to that same input', async () => {
		const { container, emitted } = renderDropdown();
		await flush();

		const input = container.querySelector('input');
		input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await flush();

		expect(emitted().esc).toBeTruthy();
	});
});
