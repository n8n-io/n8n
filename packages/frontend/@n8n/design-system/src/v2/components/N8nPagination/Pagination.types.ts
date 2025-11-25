export interface PaginationProps {
	total: number;
	currentPage?: number;
	pageSize?: number;
	pageSizes?: number[];
	background?: boolean;
	hideOnSinglePage?: boolean;
	pagerCount?: number;
	layout?: string;
}
