import { ref } from 'vue';

export type PageSize = 10 | 20 | 50;
export type UseDataStorePaginationOptions = {
	initialPage?: number;
	initialPageSize?: PageSize;
	pageSizeOptions?: PageSize[];
	onChange?: (page: number, pageSize: number) => Promise<void> | void;
};

export const useDataStorePagination = (options: UseDataStorePaginationOptions = {}) => {
	const currentPage = ref<number>(options.initialPage ?? 1);
	const pageSize = ref<PageSize>(options.initialPageSize ?? 20);
	const totalItems = ref<number>(0);
	const pageSizeOptions = options.pageSizeOptions ?? [10, 20, 50];

	const setTotalItems = (count: number) => {
		totalItems.value = count;
	};

	const setCurrentPage = async (page: number) => {
		currentPage.value = page;
		if (options.onChange) await options.onChange(currentPage.value, pageSize.value);
	};

	const setPageSize = async (size: PageSize) => {
		pageSize.value = size;
		currentPage.value = 1;
		if (options.onChange) await options.onChange(currentPage.value, pageSize.value);
	};

	const ensureItemOnPage = async (itemIndex: number) => {
		const itemPage = Math.max(1, Math.ceil(itemIndex / pageSize.value));
		if (currentPage.value !== itemPage) {
			currentPage.value = itemPage;
			if (options.onChange) await options.onChange(currentPage.value, pageSize.value);
		}
	};

	return {
		currentPage,
		pageSize,
		pageSizeOptions,
		totalItems,
		setTotalItems,
		setCurrentPage,
		setPageSize,
		ensureItemOnPage,
	};
};
