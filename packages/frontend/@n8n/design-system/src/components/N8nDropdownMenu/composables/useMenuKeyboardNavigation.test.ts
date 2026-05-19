import { ref } from 'vue';

import { useMenuKeyboardNavigation, type MenuNavigationItem } from './useMenuKeyboardNavigation';

interface TestItem extends MenuNavigationItem {
	id: string;
	hasSubMenu?: boolean;
}

const createItems = (count: number, disabledIndices: number[] = []): TestItem[] => {
	return Array.from({ length: count }, (_, i) => ({
		id: `item-${i}`,
		disabled: disabledIndices.includes(i),
	}));
};

describe('useMenuKeyboardNavigation', () => {
	describe('initial state', () => {
		it('should start with highlightedIndex at -1', () => {
			const items = ref(createItems(3));
			const { highlightedIndex } = useMenuKeyboardNavigation({ items });

			expect(highlightedIndex.value).toBe(-1);
		});
	});

	describe('navigate down', () => {
		it('should highlight first item when navigating down from initial state', () => {
			const items = ref(createItems(3));
			const { highlightedIndex, navigate } = useMenuKeyboardNavigation({ items });

			navigate('down');

			expect(highlightedIndex.value).toBe(0);
		});

		it('should move to next item when navigating down', () => {
			const items = ref(createItems(3));
			const { highlightedIndex, navigate } = useMenuKeyboardNavigation({ items });

			navigate('down');
			navigate('down');

			expect(highlightedIndex.value).toBe(1);
		});

		it('should not move past last item when navigating down', () => {
			const items = ref(createItems(3));
			const { highlightedIndex, navigate } = useMenuKeyboardNavigation({ items });

			navigate('down');
			navigate('down');
			navigate('down');
			navigate('down');

			expect(highlightedIndex.value).toBe(2);
		});

		it('should skip disabled items when navigating down', () => {
			const items = ref(createItems(4, [1]));
			const { highlightedIndex, navigate } = useMenuKeyboardNavigation({ items });

			navigate('down');
			navigate('down');

			expect(highlightedIndex.value).toBe(2);
		});

		it('should skip multiple consecutive disabled items', () => {
			const items = ref(createItems(5, [1, 2]));
			const { highlightedIndex, navigate } = useMenuKeyboardNavigation({ items });

			navigate('down');
			navigate('down');

			expect(highlightedIndex.value).toBe(3);
		});

		it('should skip disabled first item', () => {
			const items = ref(createItems(3, [0]));
			const { highlightedIndex, navigate } = useMenuKeyboardNavigation({ items });

			navigate('down');

			expect(highlightedIndex.value).toBe(1);
		});
	});

	describe('navigate up', () => {
		it('should reset to -1 when navigating up from first item', () => {
			const items = ref(createItems(3));
			const { highlightedIndex, navigate } = useMenuKeyboardNavigation({ items });

			navigate('down');
			navigate('up');

			expect(highlightedIndex.value).toBe(-1);
		});

		it('should reset to -1 when navigating up from initial state', () => {
			const items = ref(createItems(3));
			const { highlightedIndex, navigate } = useMenuKeyboardNavigation({ items });

			navigate('up');

			expect(highlightedIndex.value).toBe(-1);
		});

		it('should move to previous item when navigating up', () => {
			const items = ref(createItems(3));
			const { highlightedIndex, navigate } = useMenuKeyboardNavigation({ items });

			navigate('down');
			navigate('down');
			navigate('down');
			navigate('up');

			expect(highlightedIndex.value).toBe(1);
		});

		it('should skip disabled items when navigating up', () => {
			const items = ref(createItems(4, [1]));
			const { highlightedIndex, navigate } = useMenuKeyboardNavigation({ items });

			navigate('down');
			navigate('down');
			navigate('up');

			expect(highlightedIndex.value).toBe(0);
		});

		it('should reset to -1 when all items above are disabled', () => {
			const items = ref(createItems(3, [0]));
			const { highlightedIndex, navigate } = useMenuKeyboardNavigation({ items });

			navigate('down');
			navigate('up');

			expect(highlightedIndex.value).toBe(-1);
		});
	});

	describe('handleEnter', () => {
		it('should call onSelect when Enter is pressed on a highlighted item', () => {
			const items = ref(createItems(3));
			const onSelect = vi.fn();
			const { navigate, handleEnter } = useMenuKeyboardNavigation({ items, onSelect });

			navigate('down');
			handleEnter();

			expect(onSelect).toHaveBeenCalledWith(0, items.value[0]);
		});

		it('should not call onSelect when no item is highlighted', () => {
			const items = ref(createItems(3));
			const onSelect = vi.fn();
			const { handleEnter } = useMenuKeyboardNavigation({ items, onSelect });

			handleEnter();

			expect(onSelect).not.toHaveBeenCalled();
		});

		it('should not call onSelect on disabled items', () => {
			const items = ref(createItems(3, [0]));
			const onSelect = vi.fn();
			const { highlightedIndex, handleEnter } = useMenuKeyboardNavigation({ items, onSelect });

			highlightedIndex.value = 0;
			handleEnter();

			expect(onSelect).not.toHaveBeenCalled();
		});

		it('should call onOpenSubMenu instead of onSelect for items with submenu', () => {
			const items = ref<TestItem[]>([{ id: 'item-0', hasSubMenu: true }, { id: 'item-1' }]);
			const onSelect = vi.fn();
			const onOpenSubMenu = vi.fn();
			const hasSubMenu = (item: TestItem) => item.hasSubMenu === true;

			const { navigate, handleEnter } = useMenuKeyboardNavigation({
				items,
				onSelect,
				onOpenSubMenu,
				hasSubMenu,
			});

			navigate('down');
			handleEnter();

			expect(onOpenSubMenu).toHaveBeenCalledWith(0, items.value[0]);
			expect(onSelect).not.toHaveBeenCalled();
		});
	});

	describe('handleArrowRight', () => {
		it('should call onOpenSubMenu when item has submenu', () => {
			const items = ref<TestItem[]>([{ id: 'item-0', hasSubMenu: true }, { id: 'item-1' }]);
			const onOpenSubMenu = vi.fn();
			const hasSubMenu = (item: TestItem) => item.hasSubMenu === true;

			const { navigate, handleArrowRight } = useMenuKeyboardNavigation({
				items,
				onOpenSubMenu,
				hasSubMenu,
			});

			navigate('down');
			handleArrowRight();

			expect(onOpenSubMenu).toHaveBeenCalledWith(0, items.value[0]);
		});

		it('should not call onOpenSubMenu when item does not have submenu', () => {
			const items = ref<TestItem[]>([{ id: 'item-0' }, { id: 'item-1' }]);
			const onOpenSubMenu = vi.fn();
			const hasSubMenu = (item: TestItem) => item.hasSubMenu === true;

			const { navigate, handleArrowRight } = useMenuKeyboardNavigation({
				items,
				onOpenSubMenu,
				hasSubMenu,
			});

			navigate('down');
			handleArrowRight();

			expect(onOpenSubMenu).not.toHaveBeenCalled();
		});

		it('should not call onOpenSubMenu when no item is highlighted', () => {
			const items = ref<TestItem[]>([{ id: 'item-0', hasSubMenu: true }]);
			const onOpenSubMenu = vi.fn();
			const hasSubMenu = (item: TestItem) => item.hasSubMenu === true;

			const { handleArrowRight } = useMenuKeyboardNavigation({
				items,
				onOpenSubMenu,
				hasSubMenu,
			});

			handleArrowRight();

			expect(onOpenSubMenu).not.toHaveBeenCalled();
		});

		it('should not call onOpenSubMenu on disabled items', () => {
			const items = ref<TestItem[]>([{ id: 'item-0', hasSubMenu: true, disabled: true }]);
			const onOpenSubMenu = vi.fn();
			const hasSubMenu = (item: TestItem) => item.hasSubMenu === true;

			const { highlightedIndex, handleArrowRight } = useMenuKeyboardNavigation({
				items,
				onOpenSubMenu,
				hasSubMenu,
			});

			highlightedIndex.value = 0;
			handleArrowRight();

			expect(onOpenSubMenu).not.toHaveBeenCalled();
		});
	});

	describe('handleArrowLeft', () => {
		it('should call onCloseSubMenu', () => {
			const items = ref(createItems(3));
			const onCloseSubMenu = vi.fn();

			const { handleArrowLeft } = useMenuKeyboardNavigation({ items, onCloseSubMenu });

			handleArrowLeft();

			expect(onCloseSubMenu).toHaveBeenCalled();
		});

		it('should not throw when onCloseSubMenu is not provided', () => {
			const items = ref(createItems(3));

			const { handleArrowLeft } = useMenuKeyboardNavigation({ items });

			expect(() => handleArrowLeft()).not.toThrow();
		});
	});

	describe('handleKeydown', () => {
		it('should call handleEnter and prevent default on Enter key', () => {
			const items = ref(createItems(3));
			const onSelect = vi.fn();
			const { navigate, handleKeydown } = useMenuKeyboardNavigation({ items, onSelect });

			navigate('down');

			const event = new KeyboardEvent('keydown', { key: 'Enter' });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			handleKeydown(event);

			expect(preventDefaultSpy).toHaveBeenCalled();
			expect(onSelect).toHaveBeenCalled();
		});

		it('should not prevent default for Enter when no item is highlighted', () => {
			const items = ref(createItems(3));
			const { handleKeydown } = useMenuKeyboardNavigation({ items });

			const event = new KeyboardEvent('keydown', { key: 'Enter' });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			handleKeydown(event);

			expect(preventDefaultSpy).not.toHaveBeenCalled();
		});

		it('should call handleArrowRight and prevent default on ArrowRight key', () => {
			const items = ref<TestItem[]>([{ id: 'item-0', hasSubMenu: true }]);
			const onOpenSubMenu = vi.fn();
			const hasSubMenu = (item: TestItem) => item.hasSubMenu === true;

			const { navigate, handleKeydown } = useMenuKeyboardNavigation({
				items,
				onOpenSubMenu,
				hasSubMenu,
			});

			navigate('down');

			const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			handleKeydown(event);

			expect(preventDefaultSpy).toHaveBeenCalled();
			expect(onOpenSubMenu).toHaveBeenCalled();
		});

		it('should not prevent default for ArrowRight when no item is highlighted', () => {
			const items = ref(createItems(3));
			const { handleKeydown } = useMenuKeyboardNavigation({ items });

			const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			handleKeydown(event);

			expect(preventDefaultSpy).not.toHaveBeenCalled();
		});

		it('should call handleArrowLeft and prevent default on ArrowLeft key', () => {
			const items = ref(createItems(3));
			const onCloseSubMenu = vi.fn();

			const { handleKeydown } = useMenuKeyboardNavigation({ items, onCloseSubMenu });

			const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			handleKeydown(event);

			expect(preventDefaultSpy).toHaveBeenCalled();
			expect(onCloseSubMenu).toHaveBeenCalled();
		});
	});

	describe('reset', () => {
		it('should reset highlightedIndex to -1', () => {
			const items = ref(createItems(3));
			const { highlightedIndex, navigate, reset } = useMenuKeyboardNavigation({ items });

			navigate('down');
			navigate('down');
			expect(highlightedIndex.value).toBe(1);

			reset();

			expect(highlightedIndex.value).toBe(-1);
		});
	});

	describe('reactive items', () => {
		it('should work with dynamically changing items', () => {
			const items = ref(createItems(3));
			const { highlightedIndex, navigate } = useMenuKeyboardNavigation({ items });

			navigate('down');
			navigate('down');
			expect(highlightedIndex.value).toBe(1);

			items.value = createItems(5);

			navigate('down');
			expect(highlightedIndex.value).toBe(2);
		});
	});
});
