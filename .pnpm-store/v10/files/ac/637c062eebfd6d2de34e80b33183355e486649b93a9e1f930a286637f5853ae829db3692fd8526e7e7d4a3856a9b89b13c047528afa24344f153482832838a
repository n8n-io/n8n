
//#region src/Pagination/utils.ts
function range(start, end) {
	const length = end - start + 1;
	return Array.from({ length }, (_, idx) => idx + start);
}
function transform(items) {
	return items.map((value) => {
		if (typeof value === "number") return {
			type: "page",
			value
		};
		return { type: "ellipsis" };
	});
}
const ELLIPSIS = "ellipsis";
function getRange(currentPage, pageCount, siblingCount, showEdges) {
	const firstPageIndex = 1;
	const lastPageIndex = pageCount;
	const leftSiblingIndex = Math.max(currentPage - siblingCount, firstPageIndex);
	const rightSiblingIndex = Math.min(currentPage + siblingCount, lastPageIndex);
	if (showEdges) {
		/**
		* `2 * siblingCount + 5` explanation:
		* 2 * siblingCount for left/right siblings
		* 5 for 2x left/right ellipsis, 2x first/last page + 1x current page
		*
		* For some page counts (e.g. totalPages: 8, siblingCount: 2),
		* calculated max page is higher than total pages,
		* so we need to take the minimum of both.
		*/
		const totalPageNumbers = Math.min(2 * siblingCount + 5, pageCount);
		const itemCount = totalPageNumbers - 2;
		const showLeftEllipsis = leftSiblingIndex > firstPageIndex + 2 && Math.abs(lastPageIndex - itemCount - firstPageIndex + 1) > 2 && Math.abs(leftSiblingIndex - firstPageIndex) > 2;
		const showRightEllipsis = rightSiblingIndex < lastPageIndex - 2 && Math.abs(lastPageIndex - itemCount) > 2 && Math.abs(lastPageIndex - rightSiblingIndex) > 2;
		if (!showLeftEllipsis && showRightEllipsis) {
			const leftRange = range(1, itemCount);
			return [
				...leftRange,
				ELLIPSIS,
				lastPageIndex
			];
		}
		if (showLeftEllipsis && !showRightEllipsis) {
			const rightRange = range(lastPageIndex - itemCount + 1, lastPageIndex);
			return [
				firstPageIndex,
				ELLIPSIS,
				...rightRange
			];
		}
		if (showLeftEllipsis && showRightEllipsis) {
			const middleRange = range(leftSiblingIndex, rightSiblingIndex);
			return [
				firstPageIndex,
				ELLIPSIS,
				...middleRange,
				ELLIPSIS,
				lastPageIndex
			];
		}
		const fullRange = range(firstPageIndex, lastPageIndex);
		return fullRange;
	} else {
		const itemCount = siblingCount * 2 + 1;
		if (pageCount < itemCount) return range(1, lastPageIndex);
		else if (currentPage <= siblingCount + 1) return range(firstPageIndex, itemCount);
		else if (pageCount - currentPage <= siblingCount) return range(pageCount - itemCount + 1, lastPageIndex);
		else return range(leftSiblingIndex, rightSiblingIndex);
	}
}

//#endregion
Object.defineProperty(exports, 'getRange', {
  enumerable: true,
  get: function () {
    return getRange;
  }
});
Object.defineProperty(exports, 'transform', {
  enumerable: true,
  get: function () {
    return transform;
  }
});
//# sourceMappingURL=utils.cjs.map