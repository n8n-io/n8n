import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useSidebarLayout } from './useSidebarLayout';

// Mock UI Store
const mockUIStore = {
	sidebarMenuCollapsed: false as boolean | null,
	toggleSidebarMenuCollapse: vi.fn(),
};

vi.mock('../stores/ui.store', () => ({
	useUIStore: () => mockUIStore,
}));

// Mock useLocalStorage
vi.mock('@vueuse/core', () => ({
	useLocalStorage: vi.fn((_key: string, defaultValue: number) => ref(defaultValue)),
}));

// Mock constants
vi.mock('../constants', () => ({
	LOCAL_STORAGE_SIDEBAR_WIDTH: 'sidebarWidth',
}));

describe('useSidebarLayout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset UI store state
		mockUIStore.sidebarMenuCollapsed = false;
	});

	describe('initial setup', () => {
		it('should initialize with correct default width when not collapsed', () => {
			mockUIStore.sidebarMenuCollapsed = false;

			const { sidebarWidth } = useSidebarLayout();

			expect(sidebarWidth.value).toBe(300);
		});

		it('should initialize with correct default width when collapsed', () => {
			mockUIStore.sidebarMenuCollapsed = true;

			const { sidebarWidth } = useSidebarLayout();

			expect(sidebarWidth.value).toBe(42);
		});

		it('should default to expanded (not collapsed) when sidebarMenuCollapsed is null', () => {
			mockUIStore.sidebarMenuCollapsed = null;

			const { isCollapsed, sidebarWidth } = useSidebarLayout();

			expect(isCollapsed.value).toBe(false);
			expect(sidebarWidth.value).toBe(300);
		});

		it('should return computed isCollapsed from store', () => {
			mockUIStore.sidebarMenuCollapsed = true;

			const { isCollapsed } = useSidebarLayout();

			expect(isCollapsed.value).toBe(true);
		});

		it('should initialize isResizing as false', () => {
			const { isResizing } = useSidebarLayout();

			expect(isResizing.value).toBe(false);
		});
	});

	describe('toggleCollapse', () => {
		it('should call store toggle method', () => {
			const { toggleCollapse } = useSidebarLayout();

			toggleCollapse();

			expect(mockUIStore.toggleSidebarMenuCollapse).toHaveBeenCalledTimes(1);
		});

		it('should set width to 200 when expanding (not collapsed after toggle)', () => {
			mockUIStore.sidebarMenuCollapsed = false; // Will be true after toggle
			const { toggleCollapse, sidebarWidth } = useSidebarLayout();

			toggleCollapse();

			expect(sidebarWidth.value).toBe(200);
		});

		it('should set width to 42 when collapsing (collapsed after toggle)', () => {
			mockUIStore.sidebarMenuCollapsed = true; // Will be false after toggle
			const { toggleCollapse, sidebarWidth } = useSidebarLayout();

			toggleCollapse();

			expect(sidebarWidth.value).toBe(42);
		});
	});

	describe('resize state management', () => {
		it('should set isResizing to true when resize starts', () => {
			const { onResizeStart, isResizing } = useSidebarLayout();

			onResizeStart();

			expect(isResizing.value).toBe(true);
		});

		it('should set isResizing to false when resize ends', () => {
			const { onResizeStart, onResizeEnd, isResizing } = useSidebarLayout();

			// Start resize first
			onResizeStart();
			expect(isResizing.value).toBe(true);

			// End resize
			onResizeEnd();
			expect(isResizing.value).toBe(false);
		});
	});

	describe('onResize logic', () => {
		it('should expand when collapsed and dragging right past threshold', () => {
			mockUIStore.sidebarMenuCollapsed = true;
			const { onResize } = useSidebarLayout();

			onResize({ width: 250, x: 150 }); // x > 100

			expect(mockUIStore.toggleSidebarMenuCollapse).toHaveBeenCalledTimes(1);
		});

		it('should not resize when collapsed and dragging right below threshold', () => {
			mockUIStore.sidebarMenuCollapsed = true;
			const { onResize, sidebarWidth } = useSidebarLayout();
			const originalWidth = sidebarWidth.value;

			onResize({ width: 250, x: 80 }); // x < 100

			expect(sidebarWidth.value).toBe(originalWidth);
			expect(mockUIStore.toggleSidebarMenuCollapse).not.toHaveBeenCalled();
		});

		it('should collapse when expanded and dragging left below threshold', () => {
			mockUIStore.sidebarMenuCollapsed = false;
			const { onResize } = useSidebarLayout();

			onResize({ width: 250, x: 50 }); // x < 100

			expect(mockUIStore.toggleSidebarMenuCollapse).toHaveBeenCalledTimes(1);
		});

		it('should update width when expanded and dragging within normal range', () => {
			mockUIStore.sidebarMenuCollapsed = false;
			const { onResize, sidebarWidth } = useSidebarLayout();

			onResize({ width: 350, x: 200 });

			expect(sidebarWidth.value).toBe(350);
		});

		it('should not update width when collapsed', () => {
			mockUIStore.sidebarMenuCollapsed = true;
			const { onResize, sidebarWidth } = useSidebarLayout();
			const originalWidth = sidebarWidth.value;

			onResize({ width: 350, x: 80 }); // Below threshold, should not expand

			expect(sidebarWidth.value).toBe(originalWidth);
		});
	});
});
