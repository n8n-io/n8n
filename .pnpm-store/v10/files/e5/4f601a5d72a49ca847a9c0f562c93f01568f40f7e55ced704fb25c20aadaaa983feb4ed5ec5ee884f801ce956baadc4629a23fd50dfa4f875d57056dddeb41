// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { __asyncDelegator, __asyncGenerator, __asyncValues, __await } from "tslib";
import { createRestError, } from "@azure-rest/core-client";
import { RestError } from "@azure/core-rest-pipeline";
/**
 * Helper to paginate results in a generic way and return a PagedAsyncIterableIterator
 */
export function buildPagedAsyncIterator(client, getInitialResponse, processResponseBody, expectedStatuses, options = {}) {
    var _a, _b;
    const itemName = (_a = options.itemName) !== null && _a !== void 0 ? _a : "value";
    const nextLinkName = (_b = options.nextLinkName) !== null && _b !== void 0 ? _b : "nextLink";
    const pagedResult = {
        getPage: async (pageLink) => {
            const result = pageLink === undefined
                ? await getInitialResponse()
                : await client.pathUnchecked(pageLink).get();
            checkPagingRequest(result, expectedStatuses);
            const results = await processResponseBody(result);
            const nextLink = getNextLink(results, nextLinkName);
            const values = getElements(results, itemName);
            return {
                page: values,
                nextPageLink: nextLink,
            };
        },
        byPage: (settings) => {
            const { continuationToken } = settings !== null && settings !== void 0 ? settings : {};
            return getPageAsyncIterator(pagedResult, {
                pageLink: continuationToken,
            });
        },
    };
    return getPagedAsyncIterator(pagedResult);
}
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
            const { continuationToken } = settings !== null && settings !== void 0 ? settings : {};
            return getPageAsyncIterator(pagedResult, {
                pageLink: continuationToken,
            });
        }),
    };
}
function getItemAsyncIterator(pagedResult) {
    return __asyncGenerator(this, arguments, function* getItemAsyncIterator_1() {
        var _a, e_1, _b, _c;
        const pages = getPageAsyncIterator(pagedResult);
        try {
            for (var _d = true, pages_1 = __asyncValues(pages), pages_1_1; pages_1_1 = yield __await(pages_1.next()), _a = pages_1_1.done, !_a; _d = true) {
                _c = pages_1_1.value;
                _d = false;
                const page = _c;
                yield __await(yield* __asyncDelegator(__asyncValues(page)));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = pages_1.return)) yield __await(_b.call(pages_1));
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
}
function getPageAsyncIterator(pagedResult_1) {
    return __asyncGenerator(this, arguments, function* getPageAsyncIterator_1(pagedResult, options = {}) {
        const { pageLink } = options;
        let response = yield __await(pagedResult.getPage(pageLink !== null && pageLink !== void 0 ? pageLink : pagedResult.firstPageLink));
        if (!response) {
            return yield __await(void 0);
        }
        let result = response.page;
        result.continuationToken = response.nextPageLink;
        yield yield __await(result);
        while (response.nextPageLink) {
            response = yield __await(pagedResult.getPage(response.nextPageLink));
            if (!response) {
                return yield __await(void 0);
            }
            result = response.page;
            result.continuationToken = response.nextPageLink;
            yield yield __await(result);
        }
    });
}
/**
 * Gets for the value of nextLink in the body
 */
function getNextLink(body, nextLinkName) {
    if (!nextLinkName) {
        return undefined;
    }
    const nextLink = body[nextLinkName];
    if (typeof nextLink !== "string" &&
        typeof nextLink !== "undefined" &&
        nextLink !== null) {
        throw new RestError(`Body Property ${nextLinkName} should be a string or undefined or null but got ${typeof nextLink}`);
    }
    if (nextLink === null) {
        return undefined;
    }
    return nextLink;
}
/**
 * Gets the elements of the current request in the body.
 */
function getElements(body, itemName) {
    const value = body[itemName];
    if (!Array.isArray(value)) {
        throw new RestError(`Couldn't paginate response\n Body doesn't contain an array property with name: ${itemName}`);
    }
    return value !== null && value !== void 0 ? value : [];
}
/**
 * Checks if a request failed
 */
function checkPagingRequest(response, expectedStatuses) {
    if (!expectedStatuses.includes(response.status)) {
        throw createRestError(`Pagination failed with unexpected statusCode ${response.status}`, response);
    }
}
//# sourceMappingURL=pagingHelpers.js.map