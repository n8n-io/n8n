import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSidebarLayout } from './useSidebarLayout';

// Mock UI Store
const mockUIStore = {
	sidebarMenuCollapsed: false as boolean | null,
	sidebarWidth: 200,
	toggleSidebarMenuCollapse: vi.fn(),
};

vi.mock('../stores/ui.store', () => ({
	useUIStore: () => mockUIStore,
}));

describe('useSidebarLayout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUIStore.sidebarMenuCollapsed = false;
		mockUIStore.sidebarWidth = 200;
	});

	describe('initial setup', () => {
		it('should return sidebarWidth from store', () => {
			mockUIStore.sidebarWidth = 350;

			const { sidebarWidth } = useSidebarLayout();

			expect(sidebarWidth.value).toBe(350);
		});

		it('should default to expanded (not collapsed) when sidebarMenuCollapsed is null', () => {
			mockUIStore.sidebarMenuCollapsed = null;

			const { isCollapsed } = useSidebarLayout();

			expect(isCollapsed.value).toBe(false);
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
	});

	describe('resize state management', () => {
		it('should set isResizing to true when resize starts', () => {
			const { onResizeStart, isResizing } = useSidebarLayout();

			onResizeStart();

			expect(isResizing.value).toBe(true);
		});

		it('should set isResizing to false when resize ends', () => {
			const { onResizeStart, onResizeEnd, isResizing } = useSidebarLayout();

			onResizeStart();
			expect(isResizing.value).toBe(true);

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
			mockUIStore.sidebarWidth = 42;
			const { onResize, sidebarWidth } = useSidebarLayout();

			onResize({ width: 250, x: 80 }); // x < 100

			expect(sidebarWidth.value).toBe(42);
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
			mockUIStore.sidebarWidth = 42;
			const { onResize, sidebarWidth } = useSidebarLayout();

			onResize({ width: 350, x: 80 }); // Below threshold

			expect(sidebarWidth.value).toBe(42);
		});
	});
});
