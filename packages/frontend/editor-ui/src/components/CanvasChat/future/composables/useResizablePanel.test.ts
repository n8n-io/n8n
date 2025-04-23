import { type ResizeData } from '@n8n/design-system';
import { useResizablePanel } from './useResizablePanel';
import { v4 as uuid } from 'uuid';
import { nextTick } from 'vue';

describe(useResizablePanel, () => {
	let localStorageKey = uuid();
	let container = document.createElement('div');
	let resizeData: ResizeData;

	beforeEach(() => {
		localStorageKey = uuid();

		container = document.createElement('div');

		Object.defineProperty(container, 'offsetWidth', {
			configurable: true,
			get() {
				return 1000;
			},
		});
		Object.defineProperty(container, 'offsetHeight', {
			configurable: true,
			get() {
				return 800;
			},
		});
		Object.defineProperty(container, 'getBoundingClientRect', {
			configurable: true,
			get() {
				return () =>
					({
						x: 0,
						y: 0,
						width: 1000,
						height: 800,
					}) as DOMRect;
			},
		});

		resizeData = {
			height: Math.random(),
			width: Math.random(),
			dX: Math.random(),
			dY: Math.random(),
			x: Math.random(),
			y: Math.random(),
			direction: 'right',
		};
	});

	it('should return defaultSize if value is missing in local storage', () => {
		const { size } = useResizablePanel(localStorageKey, { container, defaultSize: 444 });

		expect(size.value).toBe(444);
	});

	it('should restore value from local storage if valid number is stored', () => {
		window.localStorage.setItem(localStorageKey, '0.333');

		const { size } = useResizablePanel(localStorageKey, { container, defaultSize: 444 });

		expect(size.value).toBe(333);
	});

	it('should return defaultSize if invalid value is stored in local storage', () => {
		window.localStorage.setItem(localStorageKey, '333');

		const { size } = useResizablePanel(localStorageKey, { container, defaultSize: 444 });

		expect(size.value).toBe(444);
	});

	it('should update size when onResize is called', () => {
		const { size, onResize } = useResizablePanel(localStorageKey, { container, defaultSize: 444 });

		onResize({ ...resizeData, x: 555 });
		expect(size.value).toBe(555);
	});

	it('should calculate and return height if position is "bottom"', () => {
		const { size, onResize } = useResizablePanel(localStorageKey, {
			container,
			defaultSize: 444,
			position: 'bottom',
		});

		onResize({ ...resizeData, y: 222 });
		expect(size.value).toBe(578); // container height minus y
	});

	it('should return size bound in the range between  minSize and maxSize', () => {
		const { size, onResize } = useResizablePanel(localStorageKey, {
			container,
			defaultSize: 444,
			minSize: 200,
			maxSize: (containerSize) => containerSize * 0.9,
		});

		onResize({ ...resizeData, x: 100 });
		expect(size.value).toBe(200);

		onResize({ ...resizeData, x: 950 });
		expect(size.value).toBe(900);
	});

	it('should update manually updated size so that proportion is maintained when container is resized', async () => {
		const spyResizeObserver = vi.spyOn(window, 'ResizeObserver');

		const { size, onResize } = useResizablePanel(localStorageKey, {
			container,
			defaultSize: 444,
			minSize: 200,
			maxSize: (containerSize) => containerSize * 0.9,
		});

		expect(spyResizeObserver).toHaveBeenCalledTimes(1);

		onResize({ ...resizeData, x: 600 });

		expect(size.value).toBe(600);
		Object.defineProperty(container, 'offsetWidth', {
			configurable: true,
			get() {
				return 500;
			},
		});
		spyResizeObserver.mock.calls[0]?.[0]?.([], {} as ResizeObserver);
		await nextTick();
		expect(size.value).toBe(300);
	});

	it('should return 0 and isCollapsed=true while resizing beyond minSize if allowCollapse is set to true', () => {
		const { size, isCollapsed, onResize, onResizeEnd } = useResizablePanel(localStorageKey, {
			container,
			defaultSize: 444,
			minSize: 300,
			allowCollapse: true,
		});

		expect(size.value).toBe(444);
		expect(isCollapsed.value).toBe(false);

		onResize({ ...resizeData, x: 200 });
		expect(size.value).toBe(300);
		expect(isCollapsed.value).toBe(false);

		onResize({ ...resizeData, x: 10 });
		expect(size.value).toBe(0);
		expect(isCollapsed.value).toBe(true);

		onResizeEnd();
		expect(size.value).toBe(300);
		expect(isCollapsed.value).toBe(false);
	});

	it('should return container size and isFullSize=true while resizing close to container size if allowFullSize is set to true', () => {
		const { size, isFullSize, onResize, onResizeEnd } = useResizablePanel(localStorageKey, {
			container,
			defaultSize: 444,
			maxSize: 800,
			allowFullSize: true,
		});

		expect(size.value).toBe(444);
		expect(isFullSize.value).toBe(false);

		onResize({ ...resizeData, x: 900 });
		expect(size.value).toBe(800);
		expect(isFullSize.value).toBe(false);

		onResize({ ...resizeData, x: 999 });
		expect(size.value).toBe(1000);
		expect(isFullSize.value).toBe(true);

		onResizeEnd();
		expect(size.value).toBe(800);
		expect(isFullSize.value).toBe(false);
	});
});
