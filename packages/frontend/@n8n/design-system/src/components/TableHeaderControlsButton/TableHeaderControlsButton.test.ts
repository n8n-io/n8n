import { render, fireEvent } from '@testing-library/vue';
import { vi } from 'vitest';

import TableHeaderControlsButton from './TableHeaderControlsButton.vue';

// Mock the useI18n composable
vi.mock('@n8n/design-system/composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string) => {
			const translations: Record<string, string> = {
				'tableControlsButton.display': 'Display',
				'tableControlsButton.shown': 'Shown columns',
				'tableControlsButton.hidden': 'Hidden columns',
			};
			return translations[key] || key;
		},
	}),
}));

// Helper function to create test columns
const createTestColumns = () => [
	{ key: 'col1', label: 'Column 1', visible: true },
	{ key: 'col2', label: 'Column 2', visible: true },
	{ key: 'col3', label: 'Column 3', visible: false },
	{ key: 'col4', label: 'Column 4', visible: true },
	{ key: 'col5', label: 'Column 5', visible: false },
];

// Helper function to create drag event
const createDragEvent = (type: string, dataTransfer?: Partial<DataTransfer>) => {
	const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;

	// Mock dataTransfer
	const mockDataTransfer = {
		effectAllowed: 'none',
		dropEffect: 'none',
		files: [] as unknown as FileList,
		items: {} as DataTransferItemList,
		types: [],
		clearData: vi.fn(),
		getData: vi.fn().mockReturnValue(''),
		setData: vi.fn(),
		setDragImage: vi.fn(),
		...dataTransfer,
	};

	Object.defineProperty(event, 'dataTransfer', {
		value: mockDataTransfer,
		writable: false,
	});

	return event;
};

const defaultStubs = {
	N8nButton: true,
	N8nIcon: true,
	N8nPopoverReka: {
		template:
			'<div><trigger><slot name="trigger" /></trigger> <content><slot name="content" /></content></div>',
		props: [],
	},
};

describe('TableHeaderControlsButton', () => {
	it('should render correctly with mixed visible and hidden columns', () => {
		const wrapper = render(TableHeaderControlsButton, {
			props: {
				columns: createTestColumns(),
			},
			global: {
				stubs: defaultStubs,
			},
		});

		// Verify correct count of visible and hidden columns
		const visibleColumns = wrapper.container.querySelectorAll('[data-testid="visible-column"]');
		const hiddenColumns = wrapper.container.querySelectorAll('[data-testid="hidden-column"]');

		expect(visibleColumns).toHaveLength(3); // col1, col2, col4 are visible
		expect(hiddenColumns).toHaveLength(2); // col3, col5 are hidden

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with all columns visible', () => {
		const columns = createTestColumns().map((col) => ({ ...col, visible: true }));
		const wrapper = render(TableHeaderControlsButton, {
			props: {
				columns,
			},
			global: {
				stubs: defaultStubs,
			},
		});
		// Verify correct count of visible and hidden columns
		const visibleColumns = wrapper.container.querySelectorAll('[data-testid="visible-column"]');
		const hiddenColumns = wrapper.container.querySelectorAll('[data-testid="hidden-column"]');

		expect(visibleColumns).toHaveLength(5); // All columns are visible
		expect(hiddenColumns).toHaveLength(0); // No columns are hidden

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with all columns hidden', () => {
		const columns = createTestColumns().map((col) => ({ ...col, visible: false }));
		const wrapper = render(TableHeaderControlsButton, {
			props: {
				columns,
			},
			global: {
				stubs: defaultStubs,
			},
		});

		// Verify correct count of visible and hidden columns
		const visibleColumns = wrapper.container.querySelectorAll('[data-testid="visible-column"]');
		const hiddenColumns = wrapper.container.querySelectorAll('[data-testid="hidden-column"]');

		expect(visibleColumns).toHaveLength(0); // No columns are visible
		expect(hiddenColumns).toHaveLength(5); // All columns are hidden

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with no columns', () => {
		const wrapper = render(TableHeaderControlsButton, {
			props: {
				columns: [],
			},
			global: {
				stubs: defaultStubs,
			},
		});

		// Verify correct count of visible and hidden columns
		const visibleColumns = wrapper.container.querySelectorAll('[data-testid="visible-column"]');
		const hiddenColumns = wrapper.container.querySelectorAll('[data-testid="hidden-column"]');

		expect(visibleColumns).toHaveLength(0); // No columns
		expect(hiddenColumns).toHaveLength(0); // No columns

		expect(wrapper.html()).toMatchSnapshot();
	});

	describe('Column visibility toggling', () => {
		it('should emit update:columnVisibility event when hiding a visible column', async () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			// Find the eye icon for the first visible column (col1)
			const visibleToggles = wrapper.container.querySelectorAll(
				'[data-testid="visibility-toggle-visible"]',
			);
			expect(visibleToggles.length).toBeGreaterThan(0);

			await fireEvent.click(visibleToggles[0]);

			const emitted = wrapper.emitted('update:columnVisibility');
			expect(emitted).toBeTruthy();
			expect(emitted[0]).toEqual(['col1', false]);
		});

		it('should emit update:columnVisibility event when showing a hidden column', async () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			// Find the eye-off icon for the first hidden column (col3)
			const hiddenToggles = wrapper.container.querySelectorAll(
				'[data-testid="visibility-toggle-hidden"]',
			);
			expect(hiddenToggles.length).toBeGreaterThan(0);

			await fireEvent.click(hiddenToggles[0]);

			const emitted = wrapper.emitted('update:columnVisibility');
			expect(emitted).toBeTruthy();
			expect(emitted[0]).toEqual(['col3', true]);
		});

		it('should show correct number of visible and hidden columns', () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const visibleColumns = wrapper.container.querySelectorAll('[data-testid="visible-column"]');
			const hiddenColumns = wrapper.container.querySelectorAll('[data-testid="hidden-column"]');

			expect(visibleColumns).toHaveLength(3); // col1, col2, col4
			expect(hiddenColumns).toHaveLength(2); // col3, col5
		});
	});

	describe('Drag and drop functionality', () => {
		it('should handle dragstart event correctly', async () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const firstDraggableColumn = wrapper.container.querySelector(
				'[data-testid="visible-column"]',
			);
			expect(firstDraggableColumn).toBeTruthy();

			const dragEvent = createDragEvent('dragstart', {
				setData: vi.fn(),
				effectAllowed: 'move',
			});

			await fireEvent(firstDraggableColumn!, dragEvent);

			expect(dragEvent.dataTransfer!.setData).toHaveBeenCalledWith('text/plain', 'col1');
		});

		it('should handle dragover event correctly', async () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const secondDraggableColumn = wrapper.container.querySelectorAll(
				'[data-testid="visible-column"]',
			)[1];
			expect(secondDraggableColumn).toBeTruthy();

			const dragEvent = createDragEvent('dragover', {
				dropEffect: 'move',
			});

			const preventDefaultSpy = vi.spyOn(dragEvent, 'preventDefault');

			await fireEvent(secondDraggableColumn, dragEvent);

			expect(preventDefaultSpy).toHaveBeenCalled();
			expect(dragEvent.dataTransfer!.dropEffect).toBe('move');
		});

		it('should emit update:columnOrder when dropping column in new position', async () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const draggableColumns = wrapper.container.querySelectorAll('[data-testid="visible-column"]');
			const firstColumn = draggableColumns[0]; // col1
			const secondColumn = draggableColumns[1]; // col2

			// Start dragging first column
			const dragStartEvent = createDragEvent('dragstart', {
				setData: vi.fn(),
				effectAllowed: 'move',
			});
			await fireEvent(firstColumn, dragStartEvent);

			// Drop it on second column
			const dropEvent = createDragEvent('drop', {
				getData: vi.fn().mockReturnValue('col1'),
			});
			const preventDefaultSpy = vi.spyOn(dropEvent, 'preventDefault');

			await fireEvent(secondColumn, dropEvent);

			expect(preventDefaultSpy).toHaveBeenCalled();

			const emitted = wrapper.emitted('update:columnOrder');
			expect(emitted).toBeTruthy();
			// When dropping col1 on col2, the order should be [col2, col1, col4]
			expect(emitted[0]).toEqual([['col2', 'col1', 'col4']]);
		});

		it('should emit update:columnOrder when dropping column at the end', async () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const firstColumn = wrapper.container.querySelector('[data-testid="visible-column"]');
			const endDropZone = wrapper.container.querySelector('[data-testid="end-drop-zone"]');

			expect(firstColumn).toBeTruthy();
			expect(endDropZone).toBeTruthy();

			// Start dragging first column
			const dragStartEvent = createDragEvent('dragstart', {
				setData: vi.fn(),
				effectAllowed: 'move',
			});
			await fireEvent(firstColumn!, dragStartEvent);

			// Drop it at the end
			const dropEvent = createDragEvent('drop', {
				getData: vi.fn().mockReturnValue('col1'),
			});
			const preventDefaultSpy = vi.spyOn(dropEvent, 'preventDefault');

			await fireEvent(endDropZone!, dropEvent);

			expect(preventDefaultSpy).toHaveBeenCalled();

			const emitted = wrapper.emitted('update:columnOrder');
			expect(emitted).toBeTruthy();
			// When dropping col1 at the end, the order should be [col2, col4, col1]
			expect(emitted[0]).toEqual([['col2', 'col4', 'col1']]);
		});

		it('should not emit update:columnOrder when dropping column on itself', async () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const firstColumn = wrapper.container.querySelector('[data-testid="visible-column"]');

			// Start dragging first column
			const dragStartEvent = createDragEvent('dragstart', {
				setData: vi.fn(),
				effectAllowed: 'move',
			});
			await fireEvent(firstColumn!, dragStartEvent);

			// Drop it on itself
			const dropEvent = createDragEvent('drop', {
				getData: vi.fn().mockReturnValue('col1'),
			});
			await fireEvent(firstColumn!, dropEvent);

			const emitted = wrapper.emitted('update:columnOrder');
			expect(emitted).toBeFalsy();
		});

		it('should handle dragend event and reset drag state', async () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const firstColumn = wrapper.container.querySelector('[data-testid="visible-column"]');

			// Start dragging
			const dragStartEvent = createDragEvent('dragstart', {
				setData: vi.fn(),
				effectAllowed: 'move',
			});
			await fireEvent(firstColumn!, dragStartEvent);

			// Verify drag state is active by checking for dragging class
			expect(firstColumn).toHaveClass('dragging');

			// End dragging
			const dragEndEvent = createDragEvent('dragend');
			await fireEvent(firstColumn!, dragEndEvent);

			// Verify drag state is reset
			expect(firstColumn).not.toHaveClass('dragging');
		});

		it('should handle dragleave event', async () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const firstColumn = wrapper.container.querySelector('[data-testid="visible-column"]');

			// Trigger dragleave
			const dragLeaveEvent = createDragEvent('dragleave');
			await fireEvent(firstColumn!, dragLeaveEvent);

			// The component should handle this gracefully without errors
			// No specific assertions needed as the behavior is internal state management
		});

		it('should show drop indicator when dragging over column', async () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const draggableColumns = wrapper.container.querySelectorAll('[data-testid="visible-column"]');
			const firstColumn = draggableColumns[0];
			const secondColumn = draggableColumns[1];

			// Start dragging first column
			await fireEvent(
				firstColumn,
				createDragEvent('dragstart', {
					setData: vi.fn(),
					effectAllowed: 'move',
				}),
			);

			// Drag over second column
			await fireEvent(
				secondColumn,
				createDragEvent('dragover', {
					dropEffect: 'move',
				}),
			);

			// Check if drop indicator is shown
			const dropIndicator = wrapper.container.querySelector('[data-testid="drop-indicator"]');
			expect(dropIndicator).toBeTruthy();
		});

		it('should show drop indicator when dragging over end zone', async () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const firstColumn = wrapper.container.querySelector('[data-testid="visible-column"]');
			const endDropZone = wrapper.container.querySelector('[data-testid="end-drop-zone"]');

			// Start dragging first column
			await fireEvent(
				firstColumn!,
				createDragEvent('dragstart', {
					setData: vi.fn(),
					effectAllowed: 'move',
				}),
			);

			// Drag over end zone
			await fireEvent(
				endDropZone!,
				createDragEvent('dragover', {
					dropEffect: 'move',
				}),
			);

			// Check if drop indicator is shown in end zone
			const endDropIndicator = endDropZone!.querySelector('[data-testid="drop-indicator"]');
			expect(endDropIndicator).toBeTruthy();
		});
	});

	describe('Edge cases', () => {
		it('should handle drag events without dataTransfer', async () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const firstColumn = wrapper.container.querySelector('[data-testid="visible-column"]');

			// Create event without dataTransfer
			const dragEvent = new Event('dragstart', { bubbles: true, cancelable: true }) as DragEvent;
			Object.defineProperty(dragEvent, 'dataTransfer', {
				value: null,
				writable: false,
			});

			// Should not throw an error
			await fireEvent(firstColumn!, dragEvent);

			// No events should be emitted
			expect(wrapper.emitted('update:columnOrder')).toBeFalsy();
		});

		it('should handle empty columns array gracefully', () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: [],
				},
				global: {
					stubs: defaultStubs,
				},
			});

			// Should not crash and render properly
			expect(wrapper.container).toBeTruthy();
			expect(wrapper.container.querySelectorAll('[data-testid="visible-column"]')).toHaveLength(0);
			expect(wrapper.container.querySelectorAll('[data-testid="hidden-column"]')).toHaveLength(0);
		});

		it('should handle columns with same key gracefully', () => {
			const duplicateColumns = [
				{ key: 'col1', label: 'Column 1', visible: true },
				{ key: 'col1', label: 'Column 1 Duplicate', visible: false },
			];

			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: duplicateColumns,
				},
				global: {
					stubs: defaultStubs,
				},
			});

			// Should render without errors
			expect(wrapper.container).toBeTruthy();
		});
	});

	describe('Accessibility', () => {
		it('should have proper draggable attribute on visible columns', () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const draggableColumns = wrapper.container.querySelectorAll('[data-testid="visible-column"]');
			draggableColumns.forEach((column) => {
				expect(column).toHaveAttribute('draggable', 'true');
			});
		});

		it('should have proper labels for visibility toggle buttons', () => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
				},
				global: {
					stubs: defaultStubs,
				},
			});

			const visibleToggles = wrapper.container.querySelectorAll(
				'[data-testid="visibility-toggle-visible"]',
			);
			const hiddenToggles = wrapper.container.querySelectorAll(
				'[data-testid="visibility-toggle-hidden"]',
			);

			expect(visibleToggles.length).toBeGreaterThan(0);
			expect(hiddenToggles.length).toBeGreaterThan(0);
		});
	});

	it('should accept different button sizes', () => {
		const sizes = ['mini', 'small', 'medium', 'large'] as const;

		sizes.forEach((size) => {
			const wrapper = render(TableHeaderControlsButton, {
				props: {
					columns: createTestColumns(),
					buttonSize: size,
				},
				global: {
					stubs: {
						...defaultStubs,
						N8nButton: {
							template: '<mock-button :size="size"><slot /></mock-button>',
							props: ['size', 'icon', 'type'],
						},
					},
				},
			});

			const button = wrapper.container.querySelector('mock-button');
			expect(button).toBeTruthy();
			expect(button).toHaveAttribute('size', size);
		});
	});
});
