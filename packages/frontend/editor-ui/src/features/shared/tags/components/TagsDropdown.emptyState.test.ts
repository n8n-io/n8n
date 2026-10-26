import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { renderComponent } from '@/__tests__/render';
import TagsDropdown from './TagsDropdown.vue';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import type { BaseTextKey } from '@n8n/i18n';

/**
 * Covers the dropdown's empty state — the message shown in place of the option
 * list, and the note explaining why "Create tag …" is missing.
 *
 * `createBlockedI18nKey` is opt-in per consumer: TagsDropdown is also the model
 * picker on the Chat settings page and the tag *filter* on the workflow list,
 * neither of which has a permission problem to report.
 */
const ALL_TAGS: ITag[] = [
	{ id: '1', name: 'alpha', createdAt: '', updatedAt: '' },
	{ id: '2', name: 'beta', createdAt: '', updatedAt: '' },
];

const NO_PERMISSION_NOTE = "You don't have permission to create tags";

type Overrides = {
	allTags?: ITag[];
	createEnabled?: boolean;
	createBlockedI18nKey?: BaseTextKey;
};

const renderDropdown = (overrides: Overrides = {}) =>
	renderComponent(TagsDropdown, {
		pinia: createTestingPinia(),
		props: {
			placeholder: 'pick tags',
			modelValue: [],
			eventBus: null,
			allTags: [],
			isLoading: false,
			tagsById: {},
			manageEnabled: false,
			createEnabled: false,
			...overrides,
		},
	});

/** The dropdown panel is teleported out of the component's own container. */
const dropdownText = () => document.querySelector('.tags-dropdown')?.textContent ?? '';

const typeFilter = async (container: Element, text: string) => {
	const input = container.querySelector('input');
	if (!input) throw new Error('Found no filter input');
	await userEvent.type(input, text);
};

describe('TagsDropdown - empty state', () => {
	it('shows "No tags exist" and the note when the instance has no listable tags', async () => {
		renderDropdown({ createBlockedI18nKey: 'tagsDropdown.noPermissionToCreate' });

		await waitFor(() => expect(dropdownText()).toContain('No tags exist'));
		expect(dropdownText()).toContain(NO_PERMISSION_NOTE);
	});

	it('keeps the note while a filter is typed and no tags are listable', async () => {
		const { container } = renderDropdown({
			createBlockedI18nKey: 'tagsDropdown.noPermissionToCreate',
		});

		await typeFilter(container, 'anything');

		await waitFor(() => expect(dropdownText()).toContain('No tags exist'));
		expect(dropdownText()).toContain(NO_PERMISSION_NOTE);
	});

	it('shows "No matching tags exist" and the note when the filter matches nothing', async () => {
		const { container } = renderDropdown({
			allTags: ALL_TAGS,
			createBlockedI18nKey: 'tagsDropdown.noPermissionToCreate',
		});

		await typeFilter(container, 'zzz');

		await waitFor(() => expect(dropdownText()).toContain('No matching tags exist'));
		expect(dropdownText()).toContain(NO_PERMISSION_NOTE);
	});

	it('shows no note when creation is off and no key is passed (workflow-list filter)', async () => {
		renderDropdown();

		await waitFor(() => expect(dropdownText()).toContain('No tags exist'));
		expect(dropdownText()).not.toContain(NO_PERMISSION_NOTE);
	});

	it('keeps the create prompt, and never the note, when the user can create tags', async () => {
		const { container } = renderDropdown({
			createEnabled: true,
			createBlockedI18nKey: 'tagsDropdown.noPermissionToCreate',
		});

		await waitFor(() => expect(dropdownText()).toContain('Type to create a tag'));
		expect(dropdownText()).not.toContain(NO_PERMISSION_NOTE);

		await typeFilter(container, 'gamma');

		await waitFor(() => expect(dropdownText()).toContain('Create tag "gamma"'));
		expect(dropdownText()).not.toContain(NO_PERMISSION_NOTE);
	});
});
