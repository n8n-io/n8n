"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var _AbstractPage_client;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageCursor = exports.TokenPage = exports.Page = exports.PagePromise = exports.AbstractPage = void 0;
const tslib_1 = require("../internal/tslib.js");
const error_1 = require("./error.js");
const parse_1 = require("../internal/parse.js");
const api_promise_1 = require("./api-promise.js");
const values_1 = require("../internal/utils/values.js");
class AbstractPage {
    constructor(client, response, body, options) {
        _AbstractPage_client.set(this, void 0);
        tslib_1.__classPrivateFieldSet(this, _AbstractPage_client, client, "f");
        this.options = options;
        this.response = response;
        this.body = body;
    }
    hasNextPage() {
        const items = this.getPaginatedItems();
        if (!items.length)
            return false;
        return this.nextPageRequestOptions() != null;
    }
    async getNextPage() {
        const nextOptions = this.nextPageRequestOptions();
        if (!nextOptions) {
            throw new error_1.AnthropicError('No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.');
        }
        return await tslib_1.__classPrivateFieldGet(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
    }
    async *iterPages() {
        let page = this;
        yield page;
        while (page.hasNextPage()) {
            page = await page.getNextPage();
            yield page;
        }
    }
    async *[(_AbstractPage_client = new WeakMap(), Symbol.asyncIterator)]() {
        for await (const page of this.iterPages()) {
            for (const item of page.getPaginatedItems()) {
                yield item;
            }
        }
    }
}
exports.AbstractPage = AbstractPage;
/**
 * This subclass of Promise will resolve to an instantiated Page once the request completes.
 *
 * It also implements AsyncIterable to allow auto-paginating iteration on an unawaited list call, eg:
 *
 *    for await (const item of client.items.list()) {
 *      console.log(item)
 *    }
 */
class PagePromise extends api_promise_1.APIPromise {
    constructor(client, request, Page) {
        super(client, request, async (client, props) => new Page(client, props.response, await (0, parse_1.defaultParseResponse)(client, props), props.options));
    }
    /**
     * Allow auto-paginating iteration on an unawaited list call, eg:
     *
     *    for await (const item of client.items.list()) {
     *      console.log(item)
     *    }
     */
    async *[Symbol.asyncIterator]() {
        const page = await this;
        for await (const item of page) {
            yield item;
        }
    }
}
exports.PagePromise = PagePromise;
class Page extends AbstractPage {
    constructor(client, response, body, options) {
        super(client, response, body, options);
        this.data = body.data || [];
        this.has_more = body.has_more || false;
        this.first_id = body.first_id || null;
        this.last_id = body.last_id || null;
    }
    getPaginatedItems() {
        return this.data ?? [];
    }
    hasNextPage() {
        if (this.has_more === false) {
            return false;
        }
        return super.hasNextPage();
    }
    nextPageRequestOptions() {
        if (this.options.query?.['before_id']) {
            // in reverse
            const first_id = this.first_id;
            if (!first_id) {
                return null;
            }
            return {
                ...this.options,
                query: {
                    ...(0, values_1.maybeObj)(this.options.query),
                    before_id: first_id,
                },
            };
        }
        const cursor = this.last_id;
        if (!cursor) {
            return null;
        }
        return {
            ...this.options,
            query: {
                ...(0, values_1.maybeObj)(this.options.query),
                after_id: cursor,
            },
        };
    }
}
exports.Page = Page;
class TokenPage extends AbstractPage {
    constructor(client, response, body, options) {
        super(client, response, body, options);
        this.data = body.data || [];
        this.has_more = body.has_more || false;
        this.next_page = body.next_page || null;
    }
    getPaginatedItems() {
        return this.data ?? [];
    }
    hasNextPage() {
        if (this.has_more === false) {
            return false;
        }
        return super.hasNextPage();
    }
    nextPageRequestOptions() {
        const cursor = this.next_page;
        if (!cursor) {
            return null;
        }
        return {
            ...this.options,
            query: {
                ...(0, values_1.maybeObj)(this.options.query),
                page_token: cursor,
            },
        };
    }
}
exports.TokenPage = TokenPage;
class PageCursor extends AbstractPage {
    constructor(client, response, body, options) {
        super(client, response, body, options);
        this.data = body.data || [];
        this.has_more = body.has_more || false;
        this.next_page = body.next_page || null;
    }
    getPaginatedItems() {
        return this.data ?? [];
    }
    hasNextPage() {
        if (this.has_more === false) {
            return false;
        }
        return super.hasNextPage();
    }
    nextPageRequestOptions() {
        const cursor = this.next_page;
        if (!cursor) {
            return null;
        }
        return {
            ...this.options,
            query: {
                ...(0, values_1.maybeObj)(this.options.query),
                page: cursor,
            },
        };
    }
}
exports.PageCursor = PageCursor;
//# sourceMappingURL=pagination.js.map