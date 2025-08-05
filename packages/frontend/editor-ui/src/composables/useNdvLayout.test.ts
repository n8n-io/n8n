import { ref, type Ref } from 'vue';
import { useNdvLayout } from './useNdvLayout';
import { LOCAL_STORAGE_NDV_PANEL_WIDTH } from '../constants';
import { mock } from 'vitest-mock-extended';

vi.mock('@vueuse/core', () => {
	return {
		useElementSize: () => ({
			width: ref(1000),
			height: ref(500),
		}),
	};
});

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
		expect(panelWidthPercentage.value.left).toBeCloseTo(12);
		expect(panelWidthPercentage.value.right).toBeCloseTo(12);
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
});
