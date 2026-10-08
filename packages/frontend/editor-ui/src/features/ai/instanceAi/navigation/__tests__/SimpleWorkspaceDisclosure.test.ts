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
	props: {
		collapsed: { type: Boolean, default: false },
		activeItemId: { type: String, default: undefined },
	},
	setup(props) {
		const open = ref(false);
		return () => [
			h(SimpleWorkspaceDisclosure, {
				open: open.value,
				'onUpdate:open': (value: boolean) => {
					open.value = value;
				},
				collapsed: props.collapsed,
				activeItemId: props.activeItemId,
			}),
			h('output', { 'data-test-id': 'parent-open' }, String(open.value)),
		];
	},
});

const renderDisclosure = createComponentRenderer(SimpleWorkspaceDisclosure);
const renderInParent = createComponentRenderer(Parent);

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
		const { getByRole, queryByRole, emitted } = renderDisclosure({
			props: { open: false, collapsed: false },
		});

		const heading = getByRole('heading', { level: 2, name: 'Workspace' });
		const button = within(heading).getByRole('button', { name: 'Workspace' });
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(queryByRole('link')).not.toBeInTheDocument();
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
		const { getByRole, getByTestId } = renderInParent({ props: { collapsed: false } });
		const button = getByRole('button', { name: 'Workspace' });

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

		const { getByRole, getByTestId } = renderInParent({ props: { collapsed: false } });

		await waitFor(() => expect(getByTestId('parent-open')).toHaveTextContent('true'));
		expect(getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-expanded', 'true');
	});

	it('tells the parent the remembered choice when it mounts', () => {
		storage.set(OPEN_KEY, 'true');

		const { emitted } = renderDisclosure({ props: { open: false, collapsed: false } });

		expect(emitted()['update:open']).toEqual([[true]]);
	});

	it('starts collapsed for a stored value that is not a boolean', () => {
		storage.set(OPEN_KEY, 'yes please');

		const { getByRole, getByTestId } = renderInParent({ props: { collapsed: false } });

		expect(getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-expanded', 'false');
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

		const { getByRole, getByTestId } = renderInParent({ props: { collapsed: false } });
		const button = getByRole('button', { name: 'Workspace' });
		expect(button).toHaveAttribute('aria-expanded', 'false');

		await userEvent.click(button);

		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(getByTestId('parent-open')).toHaveTextContent('true');
		await userEvent.click(button);
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(consoleError).not.toHaveBeenCalled();
	});

	it('keeps working for this page when the browser refuses access to the storage', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		// Some browsers throw on the `localStorage` lookup itself when site data is blocked.
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			get() {
				throw new DOMException('Access denied', 'SecurityError');
			},
		});

		const { getByRole, getByTestId } = renderInParent({ props: { collapsed: false } });
		const button = getByRole('button', { name: 'Workspace' });
		expect(button).toHaveAttribute('aria-expanded', 'false');

		await userEvent.click(button);

		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(getByTestId('parent-open')).toHaveTextContent('true');
		expect(consoleError).not.toHaveBeenCalled();
	});

	describe('when the current page is in the Workspace', () => {
		it('opens without changing the stored choice', async () => {
			const { getByRole, getByTestId } = renderInParent({
				props: { collapsed: false, activeItemId: 'shared' },
			});

			await waitFor(() => expect(getByTestId('parent-open')).toHaveTextContent('true'));
			expect(getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-expanded', 'true');
			expect(storage.has(OPEN_KEY)).toBe(false);
		});

		it('opens when the user goes to such a page, and stays open when the user leaves it', async () => {
			const { getByRole, rerender } = renderInParent({ props: { collapsed: false } });
			const button = getByRole('button', { name: 'Workspace' });
			expect(button).toHaveAttribute('aria-expanded', 'false');

			await rerender({ collapsed: false, activeItemId: 'project-1' });
			expect(button).toHaveAttribute('aria-expanded', 'true');

			await rerender({ collapsed: false, activeItemId: undefined });
			expect(button).toHaveAttribute('aria-expanded', 'true');
			expect(storage.has(OPEN_KEY)).toBe(false);
		});

		it('closes on one click, and the next visit starts closed', async () => {
			storage.set(OPEN_KEY, 'true');
			const { getByRole, getByTestId, unmount } = renderInParent({
				props: { collapsed: false, activeItemId: 'shared' },
			});
			const button = getByRole('button', { name: 'Workspace' });
			await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'));

			await userEvent.click(button);

			expect(button).toHaveAttribute('aria-expanded', 'false');
			expect(getByTestId('parent-open')).toHaveTextContent('false');
			await waitFor(() => expect(storage.get(OPEN_KEY)).toBe('false'));
			unmount();

			const next = renderInParent({ props: { collapsed: false } });
			expect(next.getByRole('button', { name: 'Workspace' })).toHaveAttribute(
				'aria-expanded',
				'false',
			);
		});

		it('opens again for the next page that it holds after the user closed it', async () => {
			const { getByRole, rerender } = renderInParent({
				props: { collapsed: false, activeItemId: 'shared' },
			});
			const button = getByRole('button', { name: 'Workspace' });
			await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'));
			await userEvent.click(button);

			await rerender({ collapsed: false, activeItemId: 'shared' });
			expect(button).toHaveAttribute('aria-expanded', 'false');

			await rerender({ collapsed: false, activeItemId: 'project-1' });
			expect(button).toHaveAttribute('aria-expanded', 'true');
		});

		it('opens the icon toggle of the collapsed sidebar too', async () => {
			const { getByRole } = renderInParent({ props: { collapsed: true, activeItemId: 'shared' } });

			await waitFor(() =>
				expect(getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-expanded', 'true'),
			);
		});
	});

	describe('in the collapsed sidebar', () => {
		it('shows an icon toggle with the same name and state, and no heading', async () => {
			const { getByRole, getByTestId, queryByRole } = renderInParent({
				props: { collapsed: true },
			});
			const button = getByRole('button', { name: 'Workspace' });

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
			const { getByRole, getByTestId } = renderInParent({ props: { collapsed: false } });
			expect(getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-expanded', 'false');

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
				expect(getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-expanded', 'true'),
			);
			expect(getByTestId('parent-open')).toHaveTextContent('true');
		});
	});
});
