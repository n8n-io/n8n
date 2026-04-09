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
        var _a, e_1, _b, _c, _d, e_2, _e, _f;
        const pages = getPageAsyncIterator(pagedResult);
        const firstVal = yield __await(pages.next());
        // if the result does not have an array shape, i.e. TPage = TElement, then we return it as is
        if (!Array.isArray(firstVal.value)) {
            // can extract elements from this page
            const { toElements } = pagedResult;
            if (toElements) {
                yield __await(yield* __asyncDelegator(__asyncValues(toElements(firstVal.value))));
                try {
                    for (var _g = true, pages_1 = __asyncValues(pages), pages_1_1; pages_1_1 = yield __await(pages_1.next()), _a = pages_1_1.done, !_a; _g = true) {
                        _c = pages_1_1.value;
                        _g = false;
                        const page = _c;
                        yield __await(yield* __asyncDelegator(__asyncValues(toElements(page))));
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_g && !_a && (_b = pages_1.return)) yield __await(_b.call(pages_1));
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            else {
                yield yield __await(firstVal.value);
                // `pages` is of type `AsyncIterableIterator<TPage>` but TPage = TElement in this case
                yield __await(yield* __asyncDelegator(__asyncValues(pages)));
            }
        }
        else {
            yield __await(yield* __asyncDelegator(__asyncValues(firstVal.value)));
            try {
                for (var _h = true, pages_2 = __asyncValues(pages), pages_2_1; pages_2_1 = yield __await(pages_2.next()), _d = pages_2_1.done, !_d; _h = true) {
                    _f = pages_2_1.value;
                    _h = false;
                    const page = _f;
                    // pages is of type `AsyncIterableIterator<TPage>` so `page` is of type `TPage`. In this branch,
                    // it must be the case that `TPage = TElement[]`
                    yield __await(yield* __asyncDelegator(__asyncValues(page)));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_h && !_d && (_e = pages_2.return)) yield __await(_e.call(pages_2));
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    });
}
function getPageAsyncIterator(pagedResult, options = {}) {
    return __asyncGenerator(this, arguments, function* getPageAsyncIterator_1() {
        const { pageLink, maxPageSize } = options;
        let response = yield __await(pagedResult.getPage(pageLink !== null && pageLink !== void 0 ? pageLink : pagedResult.firstPageLink, maxPageSize));
        if (!response) {
            return yield __await(void 0);
        }
        yield yield __await(response.page);
        while (response.nextPageLink) {
            response = yield __await(pagedResult.getPage(response.nextPageLink, maxPageSize));
            if (!response) {
                return yield __await(void 0);
            }
            yield yield __await(response.page);
        }
    });
}
//# sourceMappingURL=getPagedAsyncIterator.js.map