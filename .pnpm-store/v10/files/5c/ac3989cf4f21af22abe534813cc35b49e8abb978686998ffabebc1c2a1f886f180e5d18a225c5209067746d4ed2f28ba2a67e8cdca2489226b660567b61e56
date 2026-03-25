// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { __asyncDelegator, __asyncGenerator, __asyncValues, __await } from "tslib";
/**
 * returns an async iterator that iterates over results. It also has a `byPage`
 * method that returns pages of items at once.
 *
 * @param pagedResult - an object that specifies how to get pages.
 * @returns a paged async iterator that iterates over results.
 */
export function getPagedAsyncIterator(pagedResult) {
    var _a;
    const iter = getItemAsyncIterator(pagedResult);
    return {
        next() {
            return iter.next();
        },
        [Symbol.asyncIterator]() {
            return this;
        },
        byPage: (_a = pagedResult === null || pagedResult === void 0 ? void 0 : pagedResult.byPage) !== null && _a !== void 0 ? _a : ((settings) => {
            const { continuationToken, maxPageSize } = settings !== null && settings !== void 0 ? settings : {};
            return getPageAsyncIterator(pagedResult, {
                pageLink: continuationToken,
                maxPageSize,
            });
        }),
    };
}
function getItemAsyncIterator(pagedResult) {
    return __asyncGenerator(this, arguments, function* getItemAsyncIterator_1() {
        var e_1, _a;
        const pages = getPageAsyncIterator(pagedResult);
        const firstVal = yield __await(pages.next());
        // if the result does not have an array shape, i.e. TPage = TElement, then we return it as is
        if (!Array.isArray(firstVal.value)) {
            yield yield __await(firstVal.value);
            // `pages` is of type `AsyncIterableIterator<TPage>` but TPage = TElement in this case
            yield __await(yield* __asyncDelegator(__asyncValues(pages)));
        }
        else {
            yield __await(yield* __asyncDelegator(__asyncValues(firstVal.value)));
            try {
                for (var pages_1 = __asyncValues(pages), pages_1_1; pages_1_1 = yield __await(pages_1.next()), !pages_1_1.done;) {
                    const page = pages_1_1.value;
                    // pages is of type `AsyncIterableIterator<TPage>` so `page` is of type `TPage`. In this branch,
                    // it must be the case that `TPage = TElement[]`
                    yield __await(yield* __asyncDelegator(__asyncValues(page)));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (pages_1_1 && !pages_1_1.done && (_a = pages_1.return)) yield __await(_a.call(pages_1));
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
    });
}
function getPageAsyncIterator(pagedResult, options = {}) {
    return __asyncGenerator(this, arguments, function* getPageAsyncIterator_1() {
        const { pageLink, maxPageSize } = options;
        let response = yield __await(pagedResult.getPage(pageLink !== null && pageLink !== void 0 ? pageLink : pagedResult.firstPageLink, maxPageSize));
        yield yield __await(response.page);
        while (response.nextPageLink) {
            response = yield __await(pagedResult.getPage(response.nextPageLink, maxPageSize));
            yield yield __await(response.page);
        }
    });
}
//# sourceMappingURL=getPagedAsyncIterator.js.map