import { readFileSync } from 'node:fs';
import { compileStringAsync } from 'sass-embedded';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems, mockedStore } from '@/__tests__/utils';
import { EnterpriseEditionFeature } from '@/app/constants';
import { createProjectListItem } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { BaseFilters } from '@/Interface';
import ResourceFiltersDropdown from './ResourceFiltersDropdown.vue';

const remoteProjects = Array.from({ length: 3 }, () => createProjectListItem('team'));

// Holds the filters like a parent view does, so the dropdown receives its own updates.
const Host = defineComponent({
	setup() {
		const filters = ref<BaseFilters>({ search: '', homeProject: '' });
		return () =>
			h(ResourceFiltersDropdown, {
				modelValue: filters.value,
				keys: ['search', 'homeProject'],
				'onUpdate:modelValue': (value: BaseFilters) => {
					filters.value = value;
				},
			});
	},
});

const renderComponent = createComponentRenderer(Host);

const openFilters = async (getByTestId: (id: string) => HTMLElement) => {
	await userEvent.click(getByTestId('resources-list-filters-trigger'));
	await waitFor(() => expect(getByTestId('resources-list-filters-dropdown')).toBeInTheDocument());
};

const ownerInput = (getByTestId: (id: string) => HTMLElement) =>
	within(getByTestId('project-sharing-select')).getByRole('combobox');

describe('ResourceFiltersDropdown', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());

		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.isEnterpriseFeatureEnabled = {
			...settingsStore.isEnterpriseFeatureEnabled,
			[EnterpriseEditionFeature.Sharing]: true,
		};

		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.isProjectHome = true;
		// The owner comes from a remote search and is not in the projects store.
		projectsStore.availableProjects = [];
		projectsStore.globalProjectPermissions = { list: true };
		projectsStore.searchProjects.mockResolvedValue({
			count: remoteProjects.length,
			data: remoteProjects,
		});
	});

	it('should show the selected owner after it is picked from a remote search', async () => {
		const { getByTestId } = renderComponent();
		await openFilters(getByTestId);

		const items = await getDropdownItems(getByTestId('project-sharing-select'));
		const option = [...items].find(
			(item) => item.querySelector('p')?.textContent?.trim() === remoteProjects[1].name,
		);
		await userEvent.click(option as Element);

		await waitFor(() => expect(ownerInput(getByTestId)).toHaveValue(remoteProjects[1].name));
		expect(getByTestId('resources-list-filters-count')).toHaveTextContent('1');
	});

	it('should clear the selected owner when the filters are reset', async () => {
		const { getByTestId, getByText } = renderComponent();
		await openFilters(getByTestId);

		const items = await getDropdownItems(getByTestId('project-sharing-select'));
		await userEvent.click(items[0]);
		await waitFor(() => expect(ownerInput(getByTestId)).not.toHaveValue(''));

		await userEvent.click(getByText('Reset all'));

		await waitFor(() => expect(ownerInput(getByTestId)).toHaveValue(''));
	});

	describe('layout', () => {
		// Vitest does not load component styles, so this suite compiles the style blocks that
		// lay out the filter panel and adds them to the document.
		const styledComponents = [
			'./ResourceFiltersDropdown.vue',
			'../../../../../@n8n/design-system/src/components/N8nPopover/Popover.vue',
			'../../../../../@n8n/design-system/src/components/N8nScrollArea/N8nScrollArea.vue',
		].map((path) => new URL(path, import.meta.url));

		const styleElements: HTMLStyleElement[] = [];

		beforeAll(async () => {
			for (const url of styledComponents) {
				const source = readFileSync(url, 'utf-8');
				const scss = source.match(/<style lang="scss" module>([\s\S]*?)<\/style>/)?.[1] ?? '';
				const { css } = await compileStringAsync(scss, { url, syntax: 'scss' });
				const style = document.createElement('style');
				// jsdom does not resolve CSS custom properties, so use a fixed length for each token.
				style.textContent = css.replace(/var\(--[^()]*?(?:\([^()]*\))?[^()]*\)/g, '4px');
				document.head.append(style);
				styleElements.push(style);
			}
		});

		afterAll(() => {
			styleElements.forEach((style) => style.remove());
		});

		const isSet = (value: string) => value !== '' && value !== '0' && value !== '0px';

		const clipsHorizontally = (element: Element) => {
			const style = getComputedStyle(element);
			return [style.overflow, style.overflowX].some((value) =>
				['hidden', 'clip', 'auto', 'scroll'].includes(value),
			);
		};

		const hasHorizontalGutter = (element: Element) => {
			const style = getComputedStyle(element);
			return isSet(style.paddingLeft) && isSet(style.paddingRight);
		};

		// A full-width control in the slot, like the type filter in the credentials view.
		const ControlHost = defineComponent({
			setup() {
				const filters = ref<BaseFilters>({ search: '', homeProject: '', type: [] });
				return () =>
					h(
						ResourceFiltersDropdown,
						{
							modelValue: filters.value,
							keys: ['search', 'homeProject', 'type'],
							shareable: false,
							'onUpdate:modelValue': (value: BaseFilters) => {
								filters.value = value;
							},
						},
						{
							default: () =>
								h('input', { 'data-test-id': 'type-filter', style: { width: '100%' } }),
						},
					);
			},
		});

		it('should keep a horizontal gutter for focus rings inside the area that clips the controls', async () => {
			const { getByTestId } = createComponentRenderer(ControlHost)();
			await openFilters(getByTestId);

			const control = getByTestId('type-filter');
			const panel = getByTestId('resources-list-filters-dropdown');

			// The nearest ancestor that cuts off content on the left and right of the full-width
			// control. A focus ring that grows outside the control is drawn in this box only.
			let clipper: Element | null = control.parentElement;
			while (clipper && !clipsHorizontally(clipper)) {
				clipper = clipper.parentElement;
			}
			expect(clipper).not.toBeNull();

			// Padding between the panel and the clipping box (both included) leaves room for the
			// focus ring. Padding outside the clipping box does not, because the box cuts the ring off.
			const gutterElements: Element[] = [];
			let current: Element | null = panel;
			while (current) {
				gutterElements.push(current);
				if (current === clipper) break;
				current = current.parentElement;
			}

			expect(gutterElements.some(hasHorizontalGutter)).toBe(true);
		});
	});
});
