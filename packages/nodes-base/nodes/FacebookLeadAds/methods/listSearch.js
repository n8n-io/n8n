import { facebookFormList, facebookPageList } from '../GenericFunctions';
const filterMatches = (name, filter) => !filter || name?.toLowerCase().includes(filter.toLowerCase());
export async function pageList(filter, paginationToken) {
    const { data: pages, paging } = await facebookPageList.call(this, paginationToken);
    return {
        results: pages
            .filter((page) => filterMatches(page.name, filter))
            .map((page) => ({
            name: page.name,
            value: page.id,
            url: `https://facebook.com/${page.id}`,
        })),
        paginationToken: paging?.next ? paging?.cursors?.after : undefined,
    };
}
export async function formList(filter, paginationToken) {
    const pageId = this.getNodeParameter('page', '', { extractValue: true });
    const { data: forms, paging } = await facebookFormList.call(this, pageId, paginationToken);
    return {
        results: forms
            .filter((form) => filterMatches(form.name, filter))
            .map((form) => ({
            name: form.name,
            value: form.id,
        })),
        paginationToken: paging?.next ? paging?.cursors?.after : undefined,
    };
}
//# sourceMappingURL=listSearch.js.map