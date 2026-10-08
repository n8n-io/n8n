import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import SimpleWorkspaceDisclosure from '../SimpleWorkspaceDisclosure.vue';
import { stubLocalStorage } from './navigationFixtures';

const OPEN_KEY = 'n8n:sidebar:workspace-open';

const storage = new Map<string, string>();

/** A parent that owns `open` through v-model and shows it, as ProjectNavigation does. */
const Parent = defineComponent({
	props: { collapsed: { type: Boolean, default: false } },
	setup(props) {
		const open = ref(false);
		return () => [
			h(SimpleWorkspaceDisclosure, {
				open: open.value,
				'onUpdate:open': (value: boolean) => {
					open.value = value;
				},
				collapsed: props.collapsed,
			}),
			h('output', { 'data-test-id': 'parent-open' }, String(open.value)),
		];
	},
});

const renderDisclosure = createComponentRenderer(SimpleWorkspaceDisclosure);
const renderInParent = createComponentRenderer(Parent);

function workspaceButton(container: HTMLElement) {
	return within(container).getByRole('button', { name: 'Workspace' });
}

describe('SimpleWorkspaceDisclosure', () => {
	beforeEach(() => {
		createTestingPinia();
		storage.clear();
		stubLocalStorage(storage);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('shows a collapsed Workspace heading whose button names the section', () => {
		const { getByRole, emitted } = renderDisclosure({ props: { open: false, collapsed: false } });

		const heading = getByRole('heading', { level: 2, name: 'Workspace' });
		const button = within(heading).getByRole('button', { name: 'Workspace' });
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(emitted()['update:open']).toBeUndefined();
		expect(storage.has(OPEN_KEY)).toBe(false);
	});

	it('emits update:open on a click and remembers the choice', async () => {
		const { getByRole, emitted } = renderDisclosure({ props: { open: false, collapsed: false } });

		await userEvent.click(getByRole('button', { name: 'Workspace' }));

		expect(emitted()['update:open']).toEqual([[true]]);
		await waitFor(() => expect(storage.get(OPEN_KEY)).toBe('true'));
	});

	it('opens and closes with the keyboard', async () => {
		const { container, getByTestId } = renderInParent({ props: { collapsed: false } });
		const button = workspaceButton(container);

		button.focus();
		await userEvent.keyboard('{Enter}');

		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(getByTestId('parent-open')).toHaveTextContent('true');

		await userEvent.keyboard(' ');

		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(getByTestId('parent-open')).toHaveTextContent('false');
		await waitFor(() => expect(storage.get(OPEN_KEY)).toBe('false'));
	});

	it('opens again after a reload when the user left it open', async () => {
		storage.set(OPEN_KEY, 'true');

		const { container, getByTestId } = renderInParent({ props: { collapsed: false } });

		await waitFor(() => expect(getByTestId('parent-open')).toHaveTextContent('true'));
		expect(workspaceButton(container)).toHaveAttribute('aria-expanded', 'true');
	});

	it('tells the parent the remembered choice when it mounts', () => {
		storage.set(OPEN_KEY, 'true');

		const { emitted } = renderDisclosure({ props: { open: false, collapsed: false } });

		expect(emitted()['update:open']).toEqual([[true]]);
	});

	it('starts collapsed for a stored value that is not a boolean', () => {
		storage.set(OPEN_KEY, 'yes please');

		const { container, getByTestId } = renderInParent({ props: { collapsed: false } });

		expect(workspaceButton(container)).toHaveAttribute('aria-expanded', 'false');
		expect(getByTestId('parent-open')).toHaveTextContent('false');
	});

	it('keeps working for this page when the storage throws', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => {
				throw new Error('storage blocked');
			}),
			setItem: vi.fn(() => {
				throw new Error('storage blocked');
			}),
			removeItem: vi.fn(),
		});

		const { container, getByTestId } = renderInParent({ props: { collapsed: false } });
		const button = workspaceButton(container);
		expect(button).toHaveAttribute('aria-expanded', 'false');

		await userEvent.click(button);

		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(getByTestId('parent-open')).toHaveTextContent('true');
		await userEvent.click(button);
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(consoleError).not.toHaveBeenCalled();
	});

	describe('in the collapsed sidebar', () => {
		it('shows an icon toggle with the same name and state, and no heading', async () => {
			const { container, getByTestId, queryByRole } = renderInParent({
				props: { collapsed: true },
			});
			const button = workspaceButton(container);

			expect(queryByRole('heading')).not.toBeInTheDocument();
			expect(button).toHaveAttribute('aria-expanded', 'false');

			await userEvent.click(button);

			expect(button).toHaveAttribute('aria-expanded', 'true');
			expect(getByTestId('parent-open')).toHaveTextContent('true');
			await waitFor(() => expect(storage.get(OPEN_KEY)).toBe('true'));
		});
	});

	describe('with the browser storage', () => {
		beforeEach(() => {
			vi.unstubAllGlobals();
			window.localStorage.clear();
		});

		afterEach(() => {
			window.localStorage.clear();
		});

		it('follows a change that another tab stored', async () => {
			const { container, getByTestId } = renderInParent({ props: { collapsed: false } });
			expect(workspaceButton(container)).toHaveAttribute('aria-expanded', 'false');

			window.localStorage.setItem(OPEN_KEY, 'true');
			window.dispatchEvent(
				new StorageEvent('storage', {
					key: OPEN_KEY,
					oldValue: null,
					newValue: 'true',
					storageArea: window.localStorage,
				}),
			);

			await waitFor(() =>
				expect(workspaceButton(container)).toHaveAttribute('aria-expanded', 'true'),
			);
			expect(getByTestId('parent-open')).toHaveTextContent('true');
		});
	});
});
