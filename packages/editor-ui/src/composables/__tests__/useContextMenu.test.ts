import type { INodeUi } from '@/Interface';
import { useContextMenu } from '@/composables/useContextMenu';
import { NO_OP_NODE_TYPE, STICKY_NODE_TYPE, STORES } from '@/constants';
import { faker } from '@faker-js/faker';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';

const nodeFactory = (data: Partial<INodeUi> = {}): INodeUi => ({
	id: faker.string.uuid(),
	name: faker.word.words(3),
	parameters: {},
	position: [faker.number.int(), faker.number.int()],
	type: NO_OP_NODE_TYPE,
	typeVersion: 1,
	...data,
});

describe('useContextMenu', () => {
	let sourceControlStore: ReturnType<typeof useSourceControlStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	const nodes = [nodeFactory(), nodeFactory(), nodeFactory()];
	const selectedNodes = nodes.slice(0, 2);

	beforeAll(() => {
		setActivePinia(
			createTestingPinia({
				initialState: {
					[STORES.UI]: { selectedNodes },
					[STORES.WORKFLOWS]: { workflow: { nodes } },
				},
			}),
		);
		sourceControlStore = useSourceControlStore();
		uiStore = useUIStore();
		vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(false);
		vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
			branchReadOnly: false,
		} as never);
	});

	afterEach(() => {
		useContextMenu().close();
		vi.clearAllMocks();
	});

	const mockEvent = new MouseEvent('contextmenu', { clientX: 500, clientY: 300 });

	it('should support opening and closing (default = right click on canvas)', () => {
		const { open, close, isOpen, actions, position, target, targetNodes } = useContextMenu();
		expect(isOpen.value).toBe(false);
		expect(actions.value).toEqual([]);
		expect(position.value).toEqual([0, 0]);
		expect(targetNodes.value).toEqual([]);

		open(mockEvent);
		expect(isOpen.value).toBe(true);
		expect(useContextMenu().isOpen.value).toEqual(true);
		expect(actions.value).toMatchSnapshot();
		expect(position.value).toEqual([500, 300]);
		expect(target.value).toEqual({ source: 'canvas' });
		expect(targetNodes.value).toEqual(selectedNodes);

		close();
		expect(isOpen.value).toBe(false);
		expect(useContextMenu().isOpen.value).toEqual(false);
		expect(actions.value).toEqual([]);
		expect(position.value).toEqual([0, 0]);
		expect(targetNodes.value).toEqual([]);
	});

	it('should return the correct actions when right clicking a sticky', () => {
		const { open, isOpen, actions, targetNodes } = useContextMenu();
		const sticky = nodeFactory({ type: STICKY_NODE_TYPE });
		open(mockEvent, { source: 'node-right-click', node: sticky });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodes.value).toEqual([sticky]);
	});

	it('should return the correct actions when right clicking a Node', () => {
		const { open, isOpen, actions, targetNodes } = useContextMenu();
		const node = nodeFactory();
		open(mockEvent, { source: 'node-right-click', node });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodes.value).toEqual([node]);
	});

	it('should return the correct actions opening the menu from the button', () => {
		const { open, isOpen, actions, targetNodes } = useContextMenu();
		const node = nodeFactory();
		open(mockEvent, { source: 'node-button', node });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodes.value).toEqual([node]);
	});

	describe('Read-only mode', () => {
		it('should return the correct actions when right clicking a sticky', () => {
			vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(true);
			const { open, isOpen, actions, targetNodes } = useContextMenu();
			const sticky = nodeFactory({ type: STICKY_NODE_TYPE });
			open(mockEvent, { source: 'node-right-click', node: sticky });

			expect(isOpen.value).toBe(true);
			expect(actions.value).toMatchSnapshot();
			expect(targetNodes.value).toEqual([sticky]);
		});

		it('should return the correct actions when right clicking a Node', () => {
			vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(true);
			const { open, isOpen, actions, targetNodes } = useContextMenu();
			const node = nodeFactory();
			open(mockEvent, { source: 'node-right-click', node });

			expect(isOpen.value).toBe(true);
			expect(actions.value).toMatchSnapshot();
			expect(targetNodes.value).toEqual([node]);
		});
	});
});
