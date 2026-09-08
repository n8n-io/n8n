import { tableSearch } from '../../DataTable/common/methods';
export * from './../../Google/Sheet/v2/methods/listSearch';
export async function dataTableSearch(filterString, prevPaginationToken) {
    return await tableSearch.call(this, filterString, prevPaginationToken);
}
//# sourceMappingURL=listSearch.js.map