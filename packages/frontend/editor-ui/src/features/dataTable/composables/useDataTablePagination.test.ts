import { describe, it, expect, vi } from 'vitest';
import { useDataTablePagination } from './useDataTablePagination';

describe('useDataTablePagination', () => {
	describe('initialization', () => {
		it('should initialize with default values', () => {
			const pagination = useDataTablePagination();

			expect(pagination.currentPage.value).toBe(1);
			expect(pagination.pageSize.value).toBe(20);
			expect(pagination.totalItems.value).toBe(0);
			expect(pagination.pageSizeOptions).toEqual([10, 20, 50]);
		});

		it('should initialize with custom values', () => {
			const pagination = useDataTablePagination({
				initialPage: 3,
				initialPageSize: 50,
				pageSizeOptions: [10, 20],
			});

			expect(pagination.currentPage.value).toBe(3);
			expect(pagination.pageSize.value).toBe(50);
			expect(pagination.pageSizeOptions).toEqual([10, 20]);
		});
	});

	describe('setTotalItems', () => {
		it('should update total items', () => {
			const pagination = useDataTablePagination();

			pagination.setTotalItems(100);

			expect(pagination.totalItems.value).toBe(100);
		});
	});

	describe('setCurrentPage', () => {
		it('should update current page', async () => {
			const pagination = useDataTablePagination();

			await pagination.setCurrentPage(3);

			expect(pagination.currentPage.value).toBe(3);
		});

		it('should call onChange callback when provided', async () => {
			const onChange = vi.fn();
			const pagination = useDataTablePagination({ onChange });

			await pagination.setCurrentPage(2);

			expect(onChange).toHaveBeenCalledWith(2, 20);
		});

		it('should not throw when onChange is not provided', async () => {
			const pagination = useDataTablePagination();

			await expect(pagination.setCurrentPage(2)).resolves.not.toThrow();
		});
	});

	describe('setPageSize', () => {
		it('should update page size and reset to page 1', async () => {
			const pagination = useDataTablePagination({ initialPage: 3 });

			await pagination.setPageSize(50);

			expect(pagination.pageSize.value).toBe(50);
			expect(pagination.currentPage.value).toBe(1);
		});

		it('should call onChange callback with new page size and page 1', async () => {
			const onChange = vi.fn();
			const pagination = useDataTablePagination({ onChange, initialPage: 5 });

			await pagination.setPageSize(10);

			expect(onChange).toHaveBeenCalledWith(1, 10);
		});
	});

	describe('ensureItemOnPage', () => {
		it('should not change page if item is already on current page', async () => {
			const onChange = vi.fn();
			const pagination = useDataTablePagination({ onChange, initialPageSize: 20 });

			await pagination.ensureItemOnPage(15);

			expect(pagination.currentPage.value).toBe(1);
			expect(onChange).not.toHaveBeenCalled();
		});

		it('should change to correct page for item index', async () => {
			const onChange = vi.fn();
			const pagination = useDataTablePagination({ onChange, initialPageSize: 20 });

			await pagination.ensureItemOnPage(25);

			expect(pagination.currentPage.value).toBe(2);
			expect(onChange).toHaveBeenCalledWith(2, 20);
		});

		it('should calculate correct page for various item indices', async () => {
			const pagination = useDataTablePagination({ initialPageSize: 10 });

			await pagination.ensureItemOnPage(1);
			expect(pagination.currentPage.value).toBe(1);

			await pagination.ensureItemOnPage(10);
			expect(pagination.currentPage.value).toBe(1);

			await pagination.ensureItemOnPage(11);
			expect(pagination.currentPage.value).toBe(2);

			await pagination.ensureItemOnPage(21);
			expect(pagination.currentPage.value).toBe(3);
		});

		it('should handle edge case of index 0', async () => {
			const pagination = useDataTablePagination({ initialPageSize: 10 });

			await pagination.ensureItemOnPage(0);

			expect(pagination.currentPage.value).toBe(1);
		});
	});
});
