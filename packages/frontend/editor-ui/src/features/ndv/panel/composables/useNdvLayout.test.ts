import { ref, type Ref } from 'vue';
import { useNdvLayout } from './useNdvLayout';
import { LOCAL_STORAGE_NDV_PANEL_WIDTH } from '@/features/ndv/shared/ndv.constants';
import { mock } from 'vitest-mock-extended';

const containerWidth = ref(1000);

vi.mock('@vueuse/core', () => ({
	useElementSize: vi.fn(() => ({
		width: containerWidth,
		height: ref(500),
	})),
}));

const AUTO_SIDE = 'minmax(96px, 300px)';
const CENTER = 'minmax(280px, 1fr)';

describe('useNdvLayout', () => {
	let grid: Ref<HTMLElement | null>;
	let hasInputPanel: Ref<boolean>;
	let paneType: Ref<'regular' | 'inputless' | 'wide'>;

	beforeEach(() => {
		const gridEl = document.createElement('div');
		// getComputedStyle reads the resolved tracks from here. It is only read at
		// gesture boundaries (drag start / end), never during a move.
		gridEl.style.gridTemplateColumns = '300px 400px 300px';
		// The grid spans x = [0, 1000]; onResize converts the pointer to a side width.
		gridEl.getBoundingClientRect = () => ({ left: 0, right: 1000, width: 1000 }) as DOMRect;
		grid = ref(gridEl);
		hasInputPanel = ref(true);
		paneType = ref('regular');
		containerWidth.value = 1000;
		localStorage.clear();
	});

	it('uses the automatic 3-track template with no overrides', () => {
		const { gridTemplateColumns } = useNdvLayout({ grid, hasInputPanel, paneType });
		expect(gridTemplateColumns.value).toBe(`${AUTO_SIDE} ${CENTER} ${AUTO_SIDE}`);
	});

	it('drops the input track for inputless layouts', () => {
		hasInputPanel.value = false;
		paneType.value = 'inputless';
		const { gridTemplateColumns } = useNdvLayout({ grid, hasInputPanel, paneType });
		expect(gridTemplateColumns.value).toBe(`${CENTER} ${AUTO_SIDE}`);
	});

	it('pins the input side to a fixed pixel width on a left resize', () => {
		const { gridTemplateColumns, onResizeStart, onResize } = useNdvLayout({
			grid,
			hasInputPanel,
			paneType,
		});

		onResizeStart();
		onResize(mock({ x: 350, direction: 'left' }));

		expect(gridTemplateColumns.value).toBe(`350px ${CENTER} ${AUTO_SIDE}`);
	});

	it('pins the output side on a right resize', () => {
		const { gridTemplateColumns, onResizeStart, onResize } = useNdvLayout({
			grid,
			hasInputPanel,
			paneType,
		});

		onResizeStart();
		// output = containerRight(1000) - x(700) = 300
		onResize(mock({ x: 700, direction: 'right' }));

		expect(gridTemplateColumns.value).toBe(`${AUTO_SIDE} ${CENTER} 300px`);
	});

	it('caps a dragged side at 420px', () => {
		const { gridTemplateColumns, onResizeStart, onResize } = useNdvLayout({
			grid,
			hasInputPanel,
			paneType,
		});

		onResizeStart();
		onResize(mock({ x: 900, direction: 'left' }));

		expect(gridTemplateColumns.value).toBe(`420px ${CENTER} ${AUTO_SIDE}`);
	});

	it('never shrinks a dragged side below 96px', () => {
		const { gridTemplateColumns, onResizeStart, onResize } = useNdvLayout({
			grid,
			hasInputPanel,
			paneType,
		});

		onResizeStart();
		onResize(mock({ x: 40, direction: 'left' }));

		expect(gridTemplateColumns.value).toBe(`96px ${CENTER} ${AUTO_SIDE}`);
	});

	it('shifts both sides on drag while keeping the center width', () => {
		const { gridTemplateColumns, onResizeStart, onDrag } = useNdvLayout({
			grid,
			hasInputPanel,
			paneType,
		});

		// center 400 (from the resolved template snapshot), cursor 450 =>
		// left = 450 - 200 = 250, right = 1000 - 250 - 400 = 350.
		onResizeStart();
		onDrag([450, 0]);

		expect(gridTemplateColumns.value).toBe(`250px ${CENTER} 350px`);
	});

	it('does not read the DOM during a move (no forced reflow per pointer move)', () => {
		const { onResizeStart, onResize, onDrag } = useNdvLayout({ grid, hasInputPanel, paneType });

		onResizeStart();
		const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle');
		const rectSpy = vi.spyOn(grid.value as HTMLElement, 'getBoundingClientRect');

		onResize(mock({ x: 300, direction: 'left' }));
		onResize(mock({ x: 320, direction: 'left' }));
		onDrag([500, 0]);

		expect(getComputedStyleSpy).not.toHaveBeenCalled();
		expect(rectSpy).not.toHaveBeenCalled();

		getComputedStyleSpy.mockRestore();
		rectSpy.mockRestore();
	});

	it('resets a single side back to automatic', () => {
		const { gridTemplateColumns, onResizeStart, onResize, resetSide } = useNdvLayout({
			grid,
			hasInputPanel,
			paneType,
		});

		onResizeStart();
		onResize(mock({ x: 350, direction: 'left' }));
		expect(gridTemplateColumns.value).toContain('350px');

		resetSide('input');
		expect(gridTemplateColumns.value).toBe(`${AUTO_SIDE} ${CENTER} ${AUTO_SIDE}`);
	});

	it('resets both sides back to automatic', () => {
		const { gridTemplateColumns, onResizeStart, onDrag, resetAll } = useNdvLayout({
			grid,
			hasInputPanel,
			paneType,
		});

		onResizeStart();
		onDrag([450, 0]);
		resetAll();

		expect(gridTemplateColumns.value).toBe(`${AUTO_SIDE} ${CENTER} ${AUTO_SIDE}`);
	});

	it('persists the resolved widths as percentages on resize end', () => {
		const gridEl = grid.value as HTMLElement;
		// The tracks the browser resolves once the left side is pinned to 350px.
		gridEl.style.gridTemplateColumns = '350px 350px 300px';
		const { onResizeStart, onResize, onResizeEnd } = useNdvLayout({
			grid,
			hasInputPanel,
			paneType,
		});
		const spy = vi.spyOn(Storage.prototype, 'setItem');

		onResizeStart();
		onResize(mock({ x: 350, direction: 'left' }));
		onResizeEnd();

		expect(spy).toHaveBeenCalledWith(
			`${LOCAL_STORAGE_NDV_PANEL_WIDTH}_REGULAR`,
			JSON.stringify({ left: 35, main: 35, right: 30 }),
		);
		spy.mockRestore();
	});

	it('removes the stored value when the layout returns to automatic', () => {
		localStorage.setItem(
			`${LOCAL_STORAGE_NDV_PANEL_WIDTH}_REGULAR`,
			JSON.stringify({ left: 35, main: 35, right: 30 }),
		);
		const spy = vi.spyOn(Storage.prototype, 'removeItem');

		const { resetAll } = useNdvLayout({ grid, hasInputPanel, paneType });
		resetAll();

		expect(spy).toHaveBeenCalledWith(`${LOCAL_STORAGE_NDV_PANEL_WIDTH}_REGULAR`);
		spy.mockRestore();
	});

	it('loads stored percentages as pixel overrides (backward compatible with the legacy format)', () => {
		localStorage.setItem(
			`${LOCAL_STORAGE_NDV_PANEL_WIDTH}_REGULAR`,
			// container is 1000px: 38% -> 380px, 25% -> 250px.
			JSON.stringify({ left: 38, main: 37, right: 25 }),
		);

		const { gridTemplateColumns } = useNdvLayout({ grid, hasInputPanel, paneType });

		expect(gridTemplateColumns.value).toBe(`380px ${CENTER} 250px`);
	});
});
