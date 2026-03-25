'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tslib = require('tslib');

// Copyright (c) Microsoft Corporation.
/**
 * returns an async iterator that iterates over results. It also has a `byPage`
 * method that returns pages of items at once.
 *
 * @param pagedResult - an object that specifies how to get pages.
 * @returns a paged async iterator that iterates over results.
 */
function getPagedAsyncIterator(pagedResult) {
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
    return tslib.__asyncGenerator(this, arguments, function* getItemAsyncIterator_1() {
        var e_1, _a;
        const pages = getPageAsyncIterator(pagedResult);
        const firstVal = yield tslib.__await(pages.next());
        // if the result does not have an array shape, i.e. TPage = TElement, then we return it as is
        if (!Array.isArray(firstVal.value)) {
            yield yield tslib.__await(firstVal.value);
            // `pages` is of type `AsyncIterableIterator<TPage>` but TPage = TElement in this case
            yield tslib.__await(yield* tslib.__asyncDelegator(tslib.__asyncValues(pages)));
        }
        else {
            yield tslib.__await(yield* tslib.__asyncDelegator(tslib.__asyncValues(firstVal.value)));
            try {
                for (var pages_1 = tslib.__asyncValues(pages), pages_1_1; pages_1_1 = yield tslib.__await(pages_1.next()), !pages_1_1.done;) {
                    const page = pages_1_1.value;
                    // pages is of type `AsyncIterableIterator<TPage>` so `page` is of type `TPage`. In this branch,
                    // it must be the case that `TPage = TElement[]`
                    yield tslib.__await(yield* tslib.__asyncDelegator(tslib.__asyncValues(page)));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (pages_1_1 && !pages_1_1.done && (_a = pages_1.return)) yield tslib.__await(_a.call(pages_1));
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
    });
}
function getPageAsyncIterator(pagedResult, options = {}) {
    return tslib.__asyncGenerator(this, arguments, function* getPageAsyncIterator_1() {
        const { pageLink, maxPageSize } = options;
        let response = yield tslib.__await(pagedResult.getPage(pageLink !== null && pageLink !== void 0 ? pageLink : pagedResult.firstPageLink, maxPageSize));
        yield yield tslib.__await(response.page);
        while (response.nextPageLink) {
            response = yield tslib.__await(pagedResult.getPage(response.nextPageLink, maxPageSize));
            yield yield tslib.__await(response.page);
        }
    });
}

exports.getPagedAsyncIterator = getPagedAsyncIterator;
//# sourceMappingURL=index.js.map
