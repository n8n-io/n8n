import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';
import type { ActionDropdownItem } from '@/Interface';
import type { ContextMenuAction } from '../composables/useContextMenuItems';
import ContextMenu from './ContextMenu.vue';

const menuState = vi.hoisted(() => ({
	target: { value: undefined as { source: 'canvas'; nodeIds: string[] } | undefined },
	position: { value: [0, 0] as [number, number] },
	actions: { value: [] as Array<ActionDropdownItem<ContextMenuAction>> },
	close: vi.fn(),
}));

vi.mock('../composables/useContextMenu', async () => {
	const { computed, ref } = await import('vue');
	const target = ref(menuState.target.value);
	const position = ref(menuState.position.value);
	const actions = ref(menuState.actions.value);
	menuState.target = target;
	menuState.position = position;
	menuState.actions = actions;
	menuState.close.mockImplementation(() => {
		target.value = undefined;
	});
	return {
		useContextMenu: () => ({
			isOpen: computed(() => target.value !== undefined),
			position,
			actions,
			targetNodeIds: computed(() => target.value?.nodeIds ?? []),
			targetGroupId: computed(() => undefined),
			close: menuState.close,
		}),
	};
});

const renderComponent = createComponentRenderer(ContextMenu, {
	pinia: createTestingPinia(),
});

function open(actions: Array<ActionDropdownItem<ContextMenuAction>> = []) {
	menuState.actions.value = actions;
	menuState.position.value = [120, 80];
	menuState.target.value = { source: 'canvas', nodeIds: ['node-1'] };
}

async function getMenu() {
	return await waitFor(() => {
		const el = document.querySelector('[data-test-id="context-menu"]');
		if (!el) throw new Error('Context menu not found');
		return el as HTMLElement;
	});
}

describe('ContextMenu', () => {
	beforeEach(() => {
		menuState.target.value = undefined;
		menuState.close.mockClear();
		document.body.innerHTML = '';
	});

	it('opens from state without dispatching a contextmenu event', async () => {
		const onContextMenu = vi.fn();
		document.addEventListener('contextmenu', onContextMenu, true);
		renderComponent();

		open([{ id: 'open', label: 'Open' }]);
		const menu = await getMenu();

		expect(menu).toHaveAttribute('role', 'menu');
		expect(onContextMenu).not.toHaveBeenCalled();
		document.removeEventListener('contextmenu', onContextMenu, true);
	});

	it('renders the actions and emits the selected one with the target node ids', async () => {
		const { emitted } = renderComponent();
		open([
			{ id: 'open', label: 'Open' },
			{ id: 'delete', label: 'Delete', divided: true },
		]);
		await getMenu();

		expect(document.querySelector('[data-test-id="context-menu-item-open"]')).toBeInTheDocument();
		expect(document.querySelector('[role="separator"]')).toBeInTheDocument();

		await userEvent.click(document.querySelector('[data-test-id="context-menu-item-delete"]')!);

		expect(emitted('action')).toEqual([['delete', ['node-1'], undefined]]);
	});

	it('closes the composable target when the menu is dismissed', async () => {
		renderComponent();
		open([{ id: 'open', label: 'Open' }]);
		const menu = await getMenu();

		await fireEvent.keyDown(menu, { key: 'Escape' });

		expect(menuState.close).toHaveBeenCalled();
		await waitFor(() =>
			expect(document.querySelector('[data-test-id="context-menu"]')).not.toBeInTheDocument(),
		);
	});

	it('restores focus to the previously focused element after a keyboard dismiss', async () => {
		const canvas = document.createElement('button');
		document.body.appendChild(canvas);
		canvas.focus();
		renderComponent();
		open([{ id: 'open', label: 'Open' }]);
		const menu = await getMenu();

		await fireEvent.keyDown(menu, { key: 'Escape' });

		await waitFor(() => expect(document.activeElement).toBe(canvas));
	});

	it('does not restore focus when the user clicked elsewhere', async () => {
		const canvas = document.createElement('button');
		const input = document.createElement('input');
		document.body.append(canvas, input);
		canvas.focus();
		renderComponent();
		open([{ id: 'open', label: 'Open' }]);
		await getMenu();

		input.focus();
		await fireEvent.pointerDown(input, { button: 0, pointerType: 'mouse' });

		await waitFor(() =>
			expect(document.querySelector('[data-test-id="context-menu"]')).not.toBeInTheDocument(),
		);
		expect(document.activeElement).toBe(input);
	});

	it('does not restore focus after an action that hands focus to another layer', async () => {
		const canvas = document.createElement('button');
		document.body.appendChild(canvas);
		canvas.focus();
		renderComponent();
		open([{ id: 'change_color', label: 'Change color' }]);
		await getMenu();

		await userEvent.click(
			document.querySelector('[data-test-id="context-menu-item-change_color"]')!,
		);

		await waitFor(() =>
			expect(document.querySelector('[data-test-id="context-menu"]')).not.toBeInTheDocument(),
		);
		expect(document.activeElement).not.toBe(canvas);
	});
});
