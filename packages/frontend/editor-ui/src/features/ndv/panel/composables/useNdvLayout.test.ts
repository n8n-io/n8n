import { nextTick, ref, type Ref } from 'vue';
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

describe('useNdvLayout', () => {
	let containerRef: HTMLDivElement;
	let container: Ref<HTMLElement | null>;
	let hasInputPanel: Ref<boolean>;
	let paneType: Ref<'regular' | 'inputless' | 'wide'>;

	beforeEach(() => {
		containerRef = document.createElement('div');
		container = ref(containerRef);
		hasInputPanel = ref(true);
		paneType = ref('regular');
		containerWidth.value = 1000;

		localStorage.clear();
	});

	it('sets default panel sizes for "regular" layout', () => {
		const { panelWidthPercentage } = useNdvLayout({ container, hasInputPanel, paneType });
		expect(panelWidthPercentage.value.main).toBeGreaterThan(0);
		expect(
			panelWidthPercentage.value.left +
				panelWidthPercentage.value.main +
				panelWidthPercentage.value.right,
		).toBeCloseTo(100);
	});

	it('loads and uses stored values from localStorage', () => {
		const key = `${LOCAL_STORAGE_NDV_PANEL_WIDTH}_REGULAR`;
		localStorage.setItem(key, JSON.stringify({ left: 30, main: 40, right: 30 }));

		const { panelWidthPercentage } = useNdvLayout({ container, hasInputPanel, paneType });
		expect(panelWidthPercentage.value).toEqual({ left: 30, main: 40, right: 30 });
	});

	it('enforces minimum panel sizes', () => {
		const key = `${LOCAL_STORAGE_NDV_PANEL_WIDTH}_REGULAR`;
		localStorage.setItem(key, JSON.stringify({ left: 0, main: 5, right: 0 }));

		const { panelWidthPercentage } = useNdvLayout({ container, hasInputPanel, paneType });
		expect(panelWidthPercentage.value.left).toBeGreaterThanOrEqual(12);
		expect(panelWidthPercentage.value.right).toBeGreaterThanOrEqual(12);
		expect(panelWidthPercentage.value.main).toBeCloseTo(36.8);
	});

	it('updates layout on resize (left)', () => {
		const { panelWidthPercentage, onResize } = useNdvLayout({ container, hasInputPanel, paneType });

		onResize(mock({ width: 500, direction: 'left' }));
		expect(panelWidthPercentage.value.main).toBeGreaterThanOrEqual(50);
	});

	it('updates layout on resize (right)', () => {
		const { panelWidthPercentage, onResize } = useNdvLayout({ container, hasInputPanel, paneType });

		onResize(mock({ width: 500, direction: 'right' }));
		expect(panelWidthPercentage.value.main).toBeGreaterThanOrEqual(50);
	});

	it('updates layout on drag', () => {
		const { panelWidthPercentage, onDrag } = useNdvLayout({ container, hasInputPanel, paneType });

		onDrag([300, 0]);
		expect(panelWidthPercentage.value.left).toBeCloseTo(12);
		expect(panelWidthPercentage.value.main).toBeCloseTo(42);
		expect(panelWidthPercentage.value.right).toBeCloseTo(46);
	});

	it('persists layout changes on resize end', () => {
		const { onResizeEnd } = useNdvLayout({ container, hasInputPanel, paneType });

		const spy = vi.spyOn(localStorage.__proto__, 'setItem');
		onResizeEnd();
		expect(spy).toHaveBeenCalledWith(expect.stringContaining('_REGULAR'), expect.any(String));
	});

	it('restores correct proportions after container width changes (zoom simulation)', async () => {
		const key = `${LOCAL_STORAGE_NDV_PANEL_WIDTH}_REGULAR`;
		localStorage.setItem(key, JSON.stringify({ left: 29, main: 42, right: 29 }));

		const { panelWidthPercentage } = useNdvLayout({ container, hasInputPanel, paneType });

		// Manually corrupt in-memory state to simulate what the old code did when
		// zooming in inflated minMainPanelWidthPercentage and clamped main upward.
		panelWidthPercentage.value = { left: 15, main: 70, right: 15 };

		// Simulate zoom in — should reload from storage and restore correct proportions.
		containerWidth.value = 600;
		await nextTick();
		await nextTick();

		containerWidth.value = 1000;
		await nextTick();
		await nextTick();

		expect(panelWidthPercentage.value.left).toBeCloseTo(29);
		expect(panelWidthPercentage.value.main).toBeCloseTo(42);
		expect(panelWidthPercentage.value.right).toBeCloseTo(29);
	});

	describe('when the stored layout cannot be used as-is', () => {
		const totalOf = ({ left, main, right }: { left: number; main: number; right: number }) =>
			left + main + right;

		it('spans the full container when stored values fall below the minimums', () => {
			containerWidth.value = 1317;
			const key = `${LOCAL_STORAGE_NDV_PANEL_WIDTH}_REGULAR`;
			localStorage.setItem(key, JSON.stringify({ left: 1, main: 1, right: 1 }));

			const { panelWidthPercentage } = useNdvLayout({ container, hasInputPanel, paneType });

			// Minimums alone only add up to 46% of the container, leaving the canvas visible behind.
			expect(totalOf(panelWidthPercentage.value)).toBeCloseTo(100);
			expect(panelWidthPercentage.value.left).toBeGreaterThanOrEqual((120 / 1317) * 100);
			expect(panelWidthPercentage.value.right).toBeGreaterThanOrEqual((120 / 1317) * 100);
			expect(panelWidthPercentage.value.main).toBeGreaterThanOrEqual((368 / 1317) * 100);
		});

		it('falls back to the defaults when the stored value is not usable', () => {
			containerWidth.value = 1317;
			const key = `${LOCAL_STORAGE_NDV_PANEL_WIDTH}_REGULAR`;
			localStorage.setItem(key, JSON.stringify({ left: null, main: null, right: null }));

			const { panelWidthPercentage } = useNdvLayout({ container, hasInputPanel, paneType });

			expect(panelWidthPercentage.value.main).toBeCloseTo((420 / 1317) * 100);
			expect(totalOf(panelWidthPercentage.value)).toBeCloseTo(100);
		});

		it('keeps a usable layout while the container is unmeasured', () => {
			containerWidth.value = 0;

			const { panelWidthPercentage } = useNdvLayout({ container, hasInputPanel, paneType });

			expect(Object.values(panelWidthPercentage.value).every(Number.isFinite)).toBe(true);
			expect(totalOf(panelWidthPercentage.value)).toBeCloseTo(100);
		});

		it('does not persist while the container is unmeasured', () => {
			containerWidth.value = 0;
			const spy = vi.spyOn(Storage.prototype, 'setItem');

			const { onResizeEnd } = useNdvLayout({ container, hasInputPanel, paneType });
			onResizeEnd();

			expect(spy).not.toHaveBeenCalled();
			spy.mockRestore();
		});

		it('keeps the left panel collapsed for "inputless" layouts', () => {
			containerWidth.value = 1317;
			hasInputPanel.value = false;
			paneType.value = 'inputless';
			const key = `${LOCAL_STORAGE_NDV_PANEL_WIDTH}_INPUTLESS`;
			localStorage.setItem(key, JSON.stringify({ left: 0, main: 1, right: 1 }));

			const { panelWidthPercentage } = useNdvLayout({ container, hasInputPanel, paneType });

			expect(panelWidthPercentage.value.left).toBe(0);
			expect(totalOf(panelWidthPercentage.value)).toBeCloseTo(100);
		});
	});
});
