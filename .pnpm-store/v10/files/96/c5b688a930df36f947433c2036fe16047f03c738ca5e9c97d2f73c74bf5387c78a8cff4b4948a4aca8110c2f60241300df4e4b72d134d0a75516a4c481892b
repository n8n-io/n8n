"use strict";
// Copyright 2018 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const nock_1 = __importDefault(require("nock"));
const mocha_1 = require("mocha");
const index_js_1 = require("../src/index.js");
nock_1.default.disableNetConnect();
const url = 'https://example.com';
function getConfig(err) {
    const e = err;
    if (e && e.config && e.config.retryConfig) {
        return e.config.retryConfig;
    }
    return;
}
(0, mocha_1.afterEach)(() => {
    nock_1.default.cleanAll();
});
(0, mocha_1.describe)('🛸 retry & exponential backoff', () => {
    (0, mocha_1.it)('should provide an expected set of defaults', async () => {
        const scope = (0, nock_1.default)(url).get('/').times(4).reply(500);
        await assert_1.default.rejects((0, index_js_1.request)({ url, retry: true }), (e) => {
            scope.done();
            const config = getConfig(e);
            if (!config) {
                assert_1.default.fail('no config available');
            }
            assert_1.default.strictEqual(config.currentRetryAttempt, 3);
            assert_1.default.strictEqual(config.retry, 3);
            assert_1.default.strictEqual(config.noResponseRetries, 2);
            const expectedMethods = ['GET', 'HEAD', 'PUT', 'OPTIONS', 'DELETE'];
            for (const method of config.httpMethodsToRetry) {
                (0, assert_1.default)(expectedMethods.indexOf(method) > -1);
            }
            const expectedStatusCodes = [
                [100, 199],
                [408, 408],
                [429, 429],
                [500, 599],
            ];
            const statusCodesToRetry = config.statusCodesToRetry;
            for (let i = 0; i < statusCodesToRetry.length; i++) {
                const [min, max] = statusCodesToRetry[i];
                const [expMin, expMax] = expectedStatusCodes[i];
                assert_1.default.strictEqual(min, expMin);
                assert_1.default.strictEqual(max, expMax);
            }
            return true;
        });
    });
    (0, mocha_1.it)('should retry on 500 on the main export', async () => {
        const body = { buttered: '🥖' };
        const scopes = [
            (0, nock_1.default)(url).get('/').reply(500),
            (0, nock_1.default)(url).get('/').reply(200, body),
        ];
        const res = await (0, index_js_1.request)({
            url,
            retry: true,
        });
        assert_1.default.deepStrictEqual(res.data, body);
        scopes.forEach(s => s.done());
    });
    (0, mocha_1.it)('should not retry on a post', async () => {
        const scope = (0, nock_1.default)(url).post('/').reply(500);
        await assert_1.default.rejects((0, index_js_1.request)({ url, method: 'POST', retry: true }), (e) => {
            const config = getConfig(e);
            return config.currentRetryAttempt === 0;
        });
        scope.done();
    });
    (0, mocha_1.it)('should not retry if user aborted request', async () => {
        const ac = new AbortController();
        const config = {
            method: 'GET',
            url: 'https://google.com',
            signal: ac.signal,
            retryConfig: { retry: 10, noResponseRetries: 10 },
        };
        const req = (0, index_js_1.request)(config);
        ac.abort();
        try {
            await req;
            throw Error('unreachable');
        }
        catch (err) {
            (0, assert_1.default)(err instanceof index_js_1.GaxiosError);
            (0, assert_1.default)(err.config);
            assert_1.default.strictEqual(err.config.retryConfig?.currentRetryAttempt, 0);
        }
    });
    (0, mocha_1.it)('should retry at least the configured number of times', async () => {
        const body = { dippy: '🥚' };
        const scopes = [
            (0, nock_1.default)(url).get('/').times(3).reply(500),
            (0, nock_1.default)(url).get('/').reply(200, body),
        ];
        const cfg = { url, retryConfig: { retry: 4 } };
        const res = await (0, index_js_1.request)(cfg);
        assert_1.default.deepStrictEqual(res.data, body);
        scopes.forEach(s => s.done());
    });
    (0, mocha_1.it)('should not retry more than configured', async () => {
        const scope = (0, nock_1.default)(url).get('/').twice().reply(500);
        const cfg = { url, retryConfig: { retry: 1 } };
        await assert_1.default.rejects((0, index_js_1.request)(cfg), (e) => {
            return getConfig(e).currentRetryAttempt === 1;
        });
        scope.done();
    });
    (0, mocha_1.it)('should not retry on 4xx errors', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(404);
        await assert_1.default.rejects((0, index_js_1.request)({ url, retry: true }), (e) => {
            const cfg = getConfig(e);
            return cfg.currentRetryAttempt === 0;
        });
        scope.done();
    });
    (0, mocha_1.it)('should retain the baseURL on retry', async () => {
        const body = { pumpkin: '🥧' };
        const url = '/path';
        const baseURL = 'http://example.com';
        const scope = (0, nock_1.default)(baseURL).get(url).reply(500).get(url).reply(200, body);
        const gaxios = new index_js_1.Gaxios({ baseURL });
        const res = await gaxios.request({
            url,
            retry: true,
        });
        assert_1.default.deepStrictEqual(res.data, body);
        scope.done();
    });
    (0, mocha_1.it)('should not retry if retries set to 0', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(500);
        const cfg = { url, retryConfig: { retry: 0 } };
        await assert_1.default.rejects((0, index_js_1.request)(cfg), (e) => {
            const cfg = getConfig(e);
            return cfg.currentRetryAttempt === 0;
        });
        scope.done();
    });
    (0, mocha_1.it)('should notify on retry attempts', async () => {
        const body = { buttered: '🥖' };
        const scopes = [
            (0, nock_1.default)(url).get('/').reply(500),
            (0, nock_1.default)(url).get('/').reply(200, body),
        ];
        let flipped = false;
        const config = {
            url,
            retryConfig: {
                onRetryAttempt: err => {
                    const cfg = getConfig(err);
                    assert_1.default.strictEqual(cfg.currentRetryAttempt, 1);
                    flipped = true;
                },
            },
        };
        await (0, index_js_1.request)(config);
        assert_1.default.strictEqual(flipped, true);
        scopes.forEach(s => s.done());
    });
    (0, mocha_1.it)('accepts async onRetryAttempt handler', async () => {
        const body = { buttered: '🥖' };
        const scopes = [
            (0, nock_1.default)(url).get('/').reply(500),
            (0, nock_1.default)(url).get('/').reply(200, body),
        ];
        let flipped = false;
        const config = {
            url,
            retryConfig: {
                onRetryAttempt: async (err) => {
                    const cfg = getConfig(err);
                    assert_1.default.strictEqual(cfg.currentRetryAttempt, 1);
                    flipped = true;
                },
            },
        };
        await (0, index_js_1.request)(config);
        assert_1.default.strictEqual(flipped, true);
        scopes.forEach(s => s.done());
    });
    (0, mocha_1.it)('should support overriding the shouldRetry method', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(500);
        const config = {
            url,
            retryConfig: {
                shouldRetry: () => {
                    return false;
                },
            },
        };
        await assert_1.default.rejects((0, index_js_1.request)(config), (e) => {
            const cfg = getConfig(e);
            return cfg.currentRetryAttempt === 0;
        });
        scope.done();
    });
    (0, mocha_1.it)('should support overriding the shouldRetry method with a promise', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(500);
        const config = {
            url,
            retryConfig: {
                shouldRetry: async () => {
                    return false;
                },
            },
        };
        await assert_1.default.rejects((0, index_js_1.request)(config), (e) => {
            const cfg = getConfig(e);
            return cfg.currentRetryAttempt === 0;
        });
        scope.done();
    });
    (0, mocha_1.it)('should retry on ENOTFOUND', async () => {
        const body = { spicy: '🌮' };
        const scopes = [
            (0, nock_1.default)(url).get('/').reply(500, { code: 'ENOTFOUND' }),
            (0, nock_1.default)(url).get('/').reply(200, body),
        ];
        const res = await (0, index_js_1.request)({ url, retry: true });
        assert_1.default.deepStrictEqual(res.data, body);
        scopes.forEach(s => s.done());
    });
    (0, mocha_1.it)('should retry on ETIMEDOUT', async () => {
        const body = { sizzling: '🥓' };
        const scopes = [
            (0, nock_1.default)(url).get('/').reply(500, { code: 'ETIMEDOUT' }),
            (0, nock_1.default)(url).get('/').reply(200, body),
        ];
        const res = await (0, index_js_1.request)({ url, retry: true });
        assert_1.default.deepStrictEqual(res.data, body);
        scopes.forEach(s => s.done());
    });
    (0, mocha_1.it)('should allow configuring noResponseRetries', async () => {
        // `nock` is not listening, therefore it should fail
        const config = { url, retryConfig: { noResponseRetries: 0 } };
        await assert_1.default.rejects((0, index_js_1.request)(config), (e) => {
            return (e.code === 'ENETUNREACH' &&
                e.config.retryConfig?.currentRetryAttempt === 0);
        });
    });
    (0, mocha_1.it)('should delay the initial retry by 100ms by default', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(500).get('/').reply(200, {});
        const start = Date.now();
        await (0, index_js_1.request)({
            url,
            retry: true,
        });
        const delay = Date.now() - start;
        assert_1.default.ok(delay > 100 && delay < 199);
        scope.done();
    });
    (0, mocha_1.it)('should respect the retryDelay if configured', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(500).get('/').reply(200, {});
        const start = Date.now();
        await (0, index_js_1.request)({
            url,
            retryConfig: {
                retryDelay: 500,
            },
        });
        const delay = Date.now() - start;
        assert_1.default.ok(delay > 500 && delay < 599);
        scope.done();
    });
    (0, mocha_1.it)('should respect retryDelayMultiplier if configured', async () => {
        const scope = (0, nock_1.default)(url)
            .get('/')
            .reply(500)
            .get('/')
            .reply(500)
            .get('/')
            .reply(200, {});
        const start = Date.now();
        await (0, index_js_1.request)({
            url,
            retryConfig: {
                retryDelayMultiplier: 3,
            },
        });
        const delay = Date.now() - start;
        assert_1.default.ok(delay > 1000 && delay < 1999);
        scope.done();
    });
    (0, mocha_1.it)('should respect totalTimeout if configured', async () => {
        const scope = (0, nock_1.default)(url)
            .get('/')
            .reply(500)
            .get('/')
            .reply(500)
            .get('/')
            .reply(200, {});
        const start = Date.now();
        await (0, index_js_1.request)({
            url,
            retryConfig: {
                retryDelayMultiplier: 100,
                totalTimeout: 3000,
            },
        });
        const delay = Date.now() - start;
        assert_1.default.ok(delay > 3000 && delay < 3999);
        scope.done();
    });
    (0, mocha_1.it)('should respect maxRetryDelay if configured', async () => {
        const scope = (0, nock_1.default)(url)
            .get('/')
            .reply(500)
            .get('/')
            .reply(500)
            .get('/')
            .reply(200, {});
        const start = Date.now();
        await (0, index_js_1.request)({
            url,
            retryConfig: {
                retryDelayMultiplier: 100,
                maxRetryDelay: 4000,
            },
        });
        const delay = Date.now() - start;
        assert_1.default.ok(delay > 4000 && delay < 4999);
        scope.done();
    });
    (0, mocha_1.it)('should retry on `timeout`', async () => {
        const scope = (0, nock_1.default)(url).get('/').delay(500).reply(400).get('/').reply(204);
        const gaxios = new index_js_1.Gaxios();
        const timeout = 100;
        async function onRetryAttempt({ config, message }) {
            (0, assert_1.default)(config.signal?.reason instanceof DOMException);
            assert_1.default.equal(config.signal.reason.name, 'TimeoutError');
            assert_1.default.match(message, /timeout/i);
            // increase timeout to something higher to avoid time-sensitive flaky tests
            // note: the second `nock` GET is not delayed like the first one
            config.timeout = 10000;
        }
        const res = await gaxios.request({
            url,
            timeout,
            // NOTE: `node-fetch` does not yet support `TimeoutError` - testing with native `fetch` for now.
            fetchImplementation: fetch,
            retryConfig: {
                onRetryAttempt,
            },
        });
        assert_1.default.equal(res.status, 204);
        assert_1.default.equal(res.config?.retryConfig?.currentRetryAttempt, 1);
        scope.done();
    });
});
//# sourceMappingURL=test.retry.js.map