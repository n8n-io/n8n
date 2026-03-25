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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const nock_1 = __importDefault(require("nock"));
const sinon_1 = __importDefault(require("sinon"));
const stream_1 = __importStar(require("stream"));
const mocha_1 = require("mocha");
const https_proxy_agent_1 = require("https-proxy-agent");
const index_js_1 = require("../src/index.js");
const common_js_1 = require("../src/common.js");
const util_cjs_1 = __importDefault(require("../src/util.cjs"));
const fs_1 = __importDefault(require("fs"));
const pkg = util_cjs_1.default.pkg;
nock_1.default.disableNetConnect();
const sandbox = sinon_1.default.createSandbox();
(0, mocha_1.afterEach)(() => {
    sandbox.restore();
    nock_1.default.cleanAll();
});
const url = 'https://example.com';
function setEnv(obj) {
    return sandbox.stub(process, 'env').value(obj);
}
(0, mocha_1.describe)('🦖 option validation', () => {
    (0, mocha_1.it)('should throw an error if a url is not provided', async () => {
        await assert_1.default.rejects((0, index_js_1.request)({}), /URL is required/);
    });
});
(0, mocha_1.describe)('🚙 error handling', () => {
    (0, mocha_1.it)('should throw on non-2xx responses by default', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(500);
        await assert_1.default.rejects((0, index_js_1.request)({ url }), (err) => {
            scope.done();
            return err.status === 500;
        });
    });
    (0, mocha_1.it)('should throw the error as a GaxiosError object, regardless of Content-Type header', async () => {
        const body = {
            error: {
                message: 'File not found',
                code: 404,
                status: 'NOT FOUND',
                details: [
                    {
                        some: 'details',
                    },
                ],
            },
        };
        const scope = (0, nock_1.default)(url).get('/').reply(404, body);
        await assert_1.default.rejects((0, index_js_1.request)({ url, responseType: 'json' }), (err) => {
            scope.done();
            assert_1.default.deepStrictEqual(err.cause, body.error);
            return err.status === 404 && err.message === 'File not found';
        });
    });
    (0, mocha_1.it)('should throw the error as a `GaxiosError` object (with the message as a string), even if the request type is requested as an arraybuffer', async () => {
        const body = {
            error: {
                status: 404,
                message: 'File not found',
            },
        };
        const scope = (0, nock_1.default)(url).get('/').reply(404, body);
        await assert_1.default.rejects((0, index_js_1.request)({ url, responseType: 'arraybuffer' }), (err) => {
            scope.done();
            return (err.status === 404 &&
                err.message === 'Request failed with status code 404' &&
                err.response?.data.error.message === 'File not found');
        });
    });
    (0, mocha_1.it)('should handle AIP-193 error bodies: passes API error in message', async () => {
        const body = {
            error: {
                code: 429,
                message: "The zone 'us-east1-a' does not have enough resources available to fulfill the request. Try a different zone, or try again later.",
                status: 'RESOURCE_EXHAUSTED',
                details: [],
            },
        };
        const readableStream = stream_1.Readable.from(JSON.stringify(body));
        const scope = (0, nock_1.default)(url).get('/').reply(429, readableStream);
        await assert_1.default.rejects((0, index_js_1.request)({ url, responseType: 'stream' }), (err) => {
            scope.done();
            const apiError = JSON.parse(err.message);
            return (apiError.error.code === 429 &&
                apiError.error.message ===
                    "The zone 'us-east1-a' does not have enough resources available to fulfill the request. Try a different zone, or try again later." &&
                apiError.error.status === 'RESOURCE_EXHAUSTED' &&
                Array.isArray(apiError.error.details) &&
                apiError.error.details.length === 0);
        });
    });
    (0, mocha_1.it)('should not throw an error during a translation error', () => {
        const notJSON = '.';
        const response = {
            config: {
                responseType: 'json',
            },
            data: notJSON,
            status: 500,
            statusText: '',
            headers: new Headers(),
            // workaround for `node-fetch`'s `.data` deprecation...
            bodyUsed: true,
        };
        const error = new index_js_1.GaxiosError('translation test', {}, response);
        (0, assert_1.default)(error.response);
        assert_1.default.equal(error.response.data, notJSON);
    });
    (0, mocha_1.it)('should support `instanceof` for GaxiosErrors of the same version', () => {
        class A extends index_js_1.GaxiosError {
        }
        const wrongVersion = { [common_js_1.GAXIOS_ERROR_SYMBOL]: '0.0.0' };
        const correctVersion = { [common_js_1.GAXIOS_ERROR_SYMBOL]: pkg.version };
        const child = new A('', {});
        assert_1.default.equal(wrongVersion instanceof index_js_1.GaxiosError, false);
        assert_1.default.equal(correctVersion instanceof index_js_1.GaxiosError, true);
        assert_1.default.equal(child instanceof index_js_1.GaxiosError, true);
    });
});
(0, mocha_1.describe)('🥁 configuration options', () => {
    (0, mocha_1.it)('should accept `URL` objects', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(204);
        const res = await (0, index_js_1.request)({ url: new URL(url) });
        scope.done();
        assert_1.default.strictEqual(res.status, 204);
    });
    (0, mocha_1.it)('should accept `Request` objects', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(204);
        const res = await (0, index_js_1.request)(new Request(url));
        scope.done();
        assert_1.default.strictEqual(res.status, 204);
    });
    (0, mocha_1.it)('should use options passed into the constructor', async () => {
        const scope = (0, nock_1.default)(url).head('/').reply(200);
        const inst = new index_js_1.Gaxios({ method: 'HEAD' });
        const res = await inst.request({ url });
        scope.done();
        assert_1.default.strictEqual(res.config.method, 'HEAD');
    });
    (0, mocha_1.it)('should handle nested options passed into the constructor', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(200);
        const inst = new index_js_1.Gaxios({ headers: new Headers({ apple: 'juice' }) });
        const res = await inst.request({
            url,
            headers: { figgy: 'pudding' },
        });
        scope.done();
        assert_1.default.strictEqual(res.config.headers.get('apple'), 'juice');
        assert_1.default.strictEqual(res.config.headers.get('figgy'), 'pudding');
    });
    (0, mocha_1.it)('should allow setting a base url in the options', async () => {
        const scope = (0, nock_1.default)(url).get('/v1/mango').reply(200, {});
        const inst = new index_js_1.Gaxios({ baseURL: `${url}/v1/` });
        const res = await inst.request({ url: 'mango' });
        scope.done();
        assert_1.default.deepStrictEqual(res.data, {});
    });
    (0, mocha_1.it)('should allow overriding valid status', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(304);
        const res = await (0, index_js_1.request)({ url, validateStatus: () => true });
        scope.done();
        assert_1.default.strictEqual(res.status, 304);
    });
    (0, mocha_1.it)('should allow setting maxContentLength', async () => {
        const body = { hello: '🌎' };
        const scope = (0, nock_1.default)(url)
            .get('/')
            .reply(200, body, { 'content-length': body.toString().length.toString() });
        const maxContentLength = 1;
        await assert_1.default.rejects((0, index_js_1.request)({ url, maxContentLength }), (err) => {
            return err instanceof index_js_1.GaxiosError && /limit/.test(err.message);
        });
        scope.done();
    });
    (0, mocha_1.it)('should support redirects by default', async () => {
        const body = { hello: '🌎' };
        const scopes = [
            (0, nock_1.default)(url).get('/foo').reply(200, body),
            (0, nock_1.default)(url).get('/').reply(302, undefined, { location: '/foo' }),
        ];
        const res = await (0, index_js_1.request)({ url });
        scopes.forEach(x => x.done());
        assert_1.default.deepStrictEqual(res.data, body);
        assert_1.default.strictEqual(res.url, `${url}/foo`);
    });
    (0, mocha_1.it)('should allow overriding the adapter', async () => {
        const response = {
            data: { hello: '🌎' },
            config: {},
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
        };
        const adapter = () => Promise.resolve(response);
        const res = await (0, index_js_1.request)({ url, adapter });
        assert_1.default.strictEqual(response, res);
    });
    (0, mocha_1.it)('should allow overriding the adapter with default adapter wrapper', async () => {
        const body = { hello: '🌎' };
        const extraProperty = '🦦';
        const scope = (0, nock_1.default)(url).get('/').reply(200, body);
        const timings = [];
        const res = await (0, index_js_1.request)({
            url,
            adapter: async (opts, defaultAdapter) => {
                const begin = Date.now();
                const res = await defaultAdapter(opts);
                const end = Date.now();
                res.data = {
                    ...res.data,
                    extraProperty,
                };
                timings.push({ duration: end - begin });
                return res;
            },
        });
        scope.done();
        assert_1.default.deepStrictEqual(res.data, {
            ...body,
            extraProperty,
        });
        (0, assert_1.default)(timings.length === 1);
        (0, assert_1.default)(typeof timings[0].duration === 'number');
    });
    (0, mocha_1.it)('should encode URL parameters', async () => {
        const path = '/?james=kirk&montgomery=scott';
        const opts = { url: `${url}${path}` };
        const scope = (0, nock_1.default)(url).get(path).reply(200, {});
        const res = await (0, index_js_1.request)(opts);
        assert_1.default.strictEqual(res.status, 200);
        assert_1.default.strictEqual(res.config.url?.toString(), url + path);
        scope.done();
    });
    (0, mocha_1.it)('should preserve the original querystring', async () => {
        const path = '/?robot';
        const opts = { url: `${url}${path}` };
        const scope = (0, nock_1.default)(url).get(path).reply(200, {});
        const res = await (0, index_js_1.request)(opts);
        assert_1.default.strictEqual(res.status, 200);
        assert_1.default.strictEqual(res.config.url?.toString(), url + path);
        scope.done();
    });
    (0, mocha_1.it)('should handle empty querystring params', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(200, {});
        const res = await (0, index_js_1.request)({
            url,
            params: {},
        });
        assert_1.default.strictEqual(res.status, 200);
        scope.done();
    });
    (0, mocha_1.it)('should encode parameters from the params option', async () => {
        const opts = { url, params: { james: 'kirk', montgomery: 'scott' } };
        const qs = '?james=kirk&montgomery=scott';
        const path = `/${qs}`;
        const scope = (0, nock_1.default)(url).get(path).reply(200, {});
        const res = await (0, index_js_1.request)(opts);
        assert_1.default.strictEqual(res.status, 200);
        assert_1.default.strictEqual(res.config.url?.toString(), new URL(url + qs).toString());
        scope.done();
    });
    (0, mocha_1.it)('should merge URL parameters with the params option', async () => {
        const opts = {
            url: `${url}/?james=beckwith&montgomery=scott`,
            params: { james: 'kirk' },
        };
        const path = '/?james=beckwith&montgomery=scott&james=kirk';
        const scope = (0, nock_1.default)(url).get(path).reply(200, {});
        const res = await (0, index_js_1.request)(opts);
        assert_1.default.strictEqual(res.status, 200);
        assert_1.default.strictEqual(res.config.url?.toString(), url + path);
        scope.done();
    });
    (0, mocha_1.it)('should allow overriding the param serializer', async () => {
        const qs = '?oh=HAI';
        const params = { james: 'kirk' };
        const opts = {
            url,
            params,
            paramsSerializer: ps => {
                assert_1.default.strictEqual(JSON.stringify(params), JSON.stringify(ps));
                return '?oh=HAI';
            },
        };
        const scope = (0, nock_1.default)(url).get(`/${qs}`).reply(200, {});
        const res = await (0, index_js_1.request)(opts);
        assert_1.default.strictEqual(res.status, 200);
        assert_1.default.strictEqual(res.config.url.toString(), new URL(url + qs).toString());
        scope.done();
    });
    (0, mocha_1.it)('should return json by default', async () => {
        const body = { hello: '🌎' };
        const scope = (0, nock_1.default)(url).get('/').reply(200, body);
        const res = await (0, index_js_1.request)({ url });
        scope.done();
        assert_1.default.deepStrictEqual(body, res.data);
    });
    (0, mocha_1.it)('should send an application/json header by default', async () => {
        const scope = (0, nock_1.default)(url)
            .matchHeader('accept', 'application/json')
            .get('/')
            .reply(200, {});
        const res = await (0, index_js_1.request)({ url, responseType: 'json' });
        scope.done();
        assert_1.default.deepStrictEqual(res.data, {});
    });
    (0, mocha_1.describe)('proxying', () => {
        const url = 'https://domain.example.com/with-path';
        const proxy = 'https://fake.proxy/';
        let gaxios;
        let request;
        let responseBody;
        let scope;
        beforeEach(() => {
            gaxios = new index_js_1.Gaxios();
            request = gaxios.request.bind(gaxios);
            responseBody = { hello: '🌎' };
            const direct = new URL(url);
            scope = (0, nock_1.default)(direct.origin).get(direct.pathname).reply(200, responseBody);
        });
        function expectDirect(res) {
            scope.done();
            assert_1.default.deepStrictEqual(res.data, responseBody);
            assert_1.default.strictEqual(res.config.agent, undefined);
        }
        function expectProxy(res) {
            scope.done();
            assert_1.default.deepStrictEqual(res.data, responseBody);
            assert_1.default.ok(res.config.agent instanceof https_proxy_agent_1.HttpsProxyAgent);
            assert_1.default.equal(res.config.agent.proxy.toString(), proxy);
        }
        (0, mocha_1.it)('should use an https proxy if asked nicely (config)', async () => {
            const res = await request({ url, proxy });
            expectProxy(res);
        });
        (0, mocha_1.it)('should use an https proxy if asked nicely (env)', async () => {
            setEnv({ https_proxy: proxy });
            const res = await request({ url });
            expectProxy(res);
        });
        (0, mocha_1.it)('should use mTLS with proxy', async () => {
            const cert = 'cert';
            const key = 'key';
            const res = await request({ url, proxy, cert, key });
            expectProxy(res);
            (0, assert_1.default)(res.config.agent instanceof https_proxy_agent_1.HttpsProxyAgent);
            assert_1.default.equal(res.config.agent.connectOpts.cert, cert);
            assert_1.default.equal(res.config.agent.connectOpts.key, key);
        });
        (0, mocha_1.it)('should load the proxy from the cache', async () => {
            const res1 = await request({ url, proxy });
            const agent = res1.config.agent;
            expectProxy(res1);
            const direct = new URL(url);
            scope = (0, nock_1.default)(direct.origin).get(direct.pathname).reply(200, responseBody);
            const res2 = await request({ url, proxy });
            assert_1.default.strictEqual(agent, res2.config.agent);
            expectProxy(res2);
        });
        (0, mocha_1.it)('should load the proxy from the cache with mTLS', async () => {
            const cert = 'cert';
            const key = 'key';
            const res1 = await request({ url, proxy, cert, key });
            const agent = res1.config.agent;
            expectProxy(res1);
            const direct = new URL(url);
            scope = (0, nock_1.default)(direct.origin).get(direct.pathname).reply(200, responseBody);
            const res2 = await request({ url, proxy });
            assert_1.default.strictEqual(agent, res2.config.agent);
            expectProxy(res2);
            (0, assert_1.default)(res2.config.agent instanceof https_proxy_agent_1.HttpsProxyAgent);
            assert_1.default.equal(res2.config.agent.connectOpts.cert, cert);
            assert_1.default.equal(res2.config.agent.connectOpts.key, key);
        });
        (0, mocha_1.describe)('noProxy', () => {
            (0, mocha_1.it)('should not proxy when url matches `noProxy` (config > string)', async () => {
                const noProxy = [new URL(url).host];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            (0, mocha_1.it)('should not proxy when url matches `noProxy` (config > URL)', async () => {
                // should match by `URL#origin`
                const noProxyURL = new URL(url);
                noProxyURL.pathname = '/some-other-path';
                const noProxy = [noProxyURL];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            (0, mocha_1.it)('should not proxy when url matches `noProxy` (config > RegExp)', async () => {
                const noProxy = [/example.com/];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            (0, mocha_1.it)('should not proxy when url matches `noProxy` (config + env > match config)', async () => {
                const noProxy = [url];
                setEnv({ no_proxy: 'https://foo.bar' });
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            (0, mocha_1.it)('should not proxy when url matches `noProxy` (config + env > match env)', async () => {
                const noProxy = ['https://foo.bar'];
                setEnv({ no_proxy: url });
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            (0, mocha_1.it)('should proxy when url does not match `noProxy` (config > string)', async () => {
                const noProxy = [url];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            (0, mocha_1.it)('should proxy if url does not match `noProxy` (config > URL > diff origin > protocol)', async () => {
                const noProxyURL = new URL(url);
                noProxyURL.protocol = 'http:';
                const noProxy = [noProxyURL];
                const res = await request({ url, proxy, noProxy });
                expectProxy(res);
            });
            (0, mocha_1.it)('should proxy if url does not match `noProxy` (config > URL > diff origin > port)', async () => {
                const noProxyURL = new URL(url);
                noProxyURL.port = '8443';
                const noProxy = [noProxyURL];
                const res = await request({ url, proxy, noProxy });
                expectProxy(res);
            });
            (0, mocha_1.it)('should proxy if url does not match `noProxy` (env)', async () => {
                setEnv({ https_proxy: proxy, no_proxy: 'https://blah' });
                const res = await request({ url });
                expectProxy(res);
            });
            (0, mocha_1.it)('should not proxy if `noProxy` env var matches the origin or hostname of the URL (config > string)', async () => {
                const noProxy = [new URL(url).hostname];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            (0, mocha_1.it)('should not proxy if `noProxy` env var matches the origin or hostname of the URL (env)', async () => {
                setEnv({ https_proxy: proxy, no_proxy: new URL(url).hostname });
                const res = await request({ url });
                expectDirect(res);
            });
            (0, mocha_1.it)('should not proxy if `noProxy` env variable has asterisk, and URL partially matches (config)', async () => {
                const parentHost = new URL(url).hostname.split('.').slice(1).join('.');
                // ensure we have a host for a valid test
                (0, assert_1.default)(parentHost);
                const noProxy = [`*.${parentHost}`];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            (0, mocha_1.it)('should not proxy if `noProxy` env variable has asterisk, and URL partially matches (env)', async () => {
                const parentHost = new URL(url).hostname.split('.').slice(1).join('.');
                // ensure we have a host for a valid test
                (0, assert_1.default)(parentHost);
                setEnv({ https_proxy: proxy, no_proxy: `*.${parentHost}` });
                const res = await request({ url });
                expectDirect(res);
            });
            (0, mocha_1.it)('should not proxy if `noProxy` env variable starts with a dot, and URL partially matches (config)', async () => {
                const parentHost = new URL(url).hostname.split('.').slice(1).join('.');
                // ensure we have a host for a valid test
                (0, assert_1.default)(parentHost);
                const noProxy = [`.${parentHost}`];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            (0, mocha_1.it)('should not proxy if `noProxy` env variable starts with a dot, and URL partially matches (env)', async () => {
                const parentHost = new URL(url).hostname.split('.').slice(1).join('.');
                // ensure we have a host for a valid test
                (0, assert_1.default)(parentHost);
                setEnv({ https_proxy: proxy, no_proxy: '.example.com' });
                const res = await request({ url });
                expectDirect(res);
            });
            (0, mocha_1.it)('should proxy if `noProxy` env variable has asterisk, but URL is not matching (config)', async () => {
                const noProxy = ['*.no.match'];
                const res = await request({ url, proxy, noProxy });
                expectProxy(res);
            });
            (0, mocha_1.it)('should proxy if `noProxy` env variable has asterisk, but URL is not matching (env)', async () => {
                setEnv({ https_proxy: proxy, no_proxy: '*.no.match' });
                const res = await request({ url });
                expectProxy(res);
            });
            (0, mocha_1.it)('should allow comma-separated lists for `noProxy` env variables (config)', async () => {
                const parentHost = new URL(url).hostname.split('.').slice(1).join('.');
                // ensure we have a host for a valid test
                (0, assert_1.default)(parentHost);
                const noProxy = ['google.com', `*.${parentHost}`, 'hello.com'];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            (0, mocha_1.it)('should allow comma-separated lists for `noProxy` env variables (env)', async () => {
                const parentHost = new URL(url).hostname.split('.').slice(1).join('.');
                // ensure we have a host for a valid test
                (0, assert_1.default)(parentHost);
                // added spaces to ensure trimming works as expected
                const noProxy = [' google.com ', ` *.${parentHost} `, ' hello.com '];
                setEnv({ https_proxy: proxy, no_proxy: noProxy.join(',') });
                const res = await request({ url });
                expectDirect(res);
            });
        });
    });
    (0, mocha_1.it)('should include the request data in the response config', async () => {
        const body = { hello: '🌎' };
        const scope = (0, nock_1.default)(url).post('/', body).reply(200);
        const res = await (0, index_js_1.request)({ url, method: 'POST', data: body });
        scope.done();
        assert_1.default.deepStrictEqual(res.config.data, body);
    });
    (0, mocha_1.it)('should not stringify the data if it is appended by a form', async () => {
        const formData = new FormData();
        formData.append('test', '123');
        const scope = (0, nock_1.default)(url)
            .post('/', body => {
            /**
             * Sample from native `node-fetch`
             * body: '------3785545705014550845559551617\r\n' +
             * 'Content-Disposition: form-data; name="test"\r\n' +
             * '\r\n' +
             * '123\r\n' +
             * '------3785545705014550845559551617--',
             */
            /**
             * Sample from native `fetch`
             * body: '------formdata-undici-0.39470493152687736\r\n' +
             * 'Content-Disposition: form-data; name="test"\r\n' +
             * '\r\n' +
             * '123\r\n' +
             * '------formdata-undici-0.39470493152687736--',
             */
            return body.match('Content-Disposition: form-data;');
        })
            .reply(200);
        const res = await (0, index_js_1.request)({
            url,
            method: 'POST',
            data: formData,
        });
        scope.done();
        assert_1.default.deepStrictEqual(res.config.data, formData);
        assert_1.default.ok(res.config.body instanceof FormData);
        assert_1.default.ok(res.config.data instanceof FormData);
    });
    (0, mocha_1.it)('should allow explicitly setting the fetch implementation', async () => {
        let customFetchCalled = false;
        const myFetch = (...args) => {
            customFetchCalled = true;
            return fetch(...args);
        };
        const scope = (0, nock_1.default)(url).post('/').reply(204);
        const res = await (0, index_js_1.request)({
            url,
            method: 'POST',
            fetchImplementation: myFetch,
            // This `data` ensures the 'duplex' option has been set
            data: { sample: 'data' },
        });
        (0, assert_1.default)(customFetchCalled);
        assert_1.default.equal(res.status, 204);
        scope.done();
    });
    (0, mocha_1.it)('should be able to disable the `errorRedactor`', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(200);
        const instance = new index_js_1.Gaxios({ url, errorRedactor: false });
        assert_1.default.equal(instance.defaults.errorRedactor, false);
        await instance.request({ url });
        scope.done();
        assert_1.default.equal(instance.defaults.errorRedactor, false);
    });
    (0, mocha_1.it)('should be able to set a custom `errorRedactor`', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(200);
        const errorRedactor = (t) => t;
        const instance = new index_js_1.Gaxios({ url, errorRedactor });
        assert_1.default.equal(instance.defaults.errorRedactor, errorRedactor);
        await instance.request({ url });
        scope.done();
        assert_1.default.equal(instance.defaults.errorRedactor, errorRedactor);
    });
    (0, mocha_1.describe)('timeout', () => {
        (0, mocha_1.it)('should accept and use a `timeout`', async () => {
            (0, nock_1.default)(url).get('/').delay(2000).reply(204);
            const gaxios = new index_js_1.Gaxios();
            const timeout = 10;
            await assert_1.default.rejects(() => gaxios.request({ url, timeout }), /abort/);
        });
        (0, mocha_1.it)('should a `timeout`, an existing `signal`, and be triggered by timeout', async () => {
            (0, nock_1.default)(url).get('/').delay(2000).reply(204);
            const gaxios = new index_js_1.Gaxios();
            const signal = new AbortController().signal;
            const timeout = 10;
            await assert_1.default.rejects(() => gaxios.request({ url, timeout, signal }), /abort/);
        });
        (0, mocha_1.it)('should use a `timeout`, a `signal`, and be triggered by signal', async () => {
            (0, nock_1.default)(url).get('/').delay(2000).reply(204);
            const gaxios = new index_js_1.Gaxios();
            const ac = new AbortController();
            const signal = ac.signal;
            const timeout = 4000; // after network delay, so this shouldn't trigger
            const message = 'Changed my mind - no request please';
            setTimeout(() => ac.abort(message), 10);
            await assert_1.default.rejects(() => gaxios.request({ url, timeout, signal }), 
            // `node-fetch` always rejects with the generic 'abort' error:
            /abort/);
        });
    });
});
(0, mocha_1.describe)('🎏 data handling', () => {
    (0, mocha_1.it)('should accept a ReadableStream as request data', async () => {
        const scope = (0, nock_1.default)(url).post('/', 'test').reply(200, {});
        const res = await (0, index_js_1.request)({
            url,
            method: 'POST',
            data: stream_1.Readable.from('test'),
        });
        scope.done();
        assert_1.default.deepStrictEqual(res.data, {});
    });
    (0, mocha_1.it)('should accept a string in the request data', async () => {
        const body = { hello: '🌎' };
        const encoded = new URLSearchParams(body);
        const scope = (0, nock_1.default)(url)
            .matchHeader('content-type', 'application/x-www-form-urlencoded')
            .post('/', encoded.toString())
            .reply(200, {});
        const res = await (0, index_js_1.request)({
            url,
            method: 'POST',
            data: encoded,
            headers: new Headers({
                'content-type': 'application/x-www-form-urlencoded',
            }),
        });
        scope.done();
        assert_1.default.deepStrictEqual(res.data, {});
    });
    (0, mocha_1.it)('should set application/json content-type for object request by default', async () => {
        const body = { hello: '🌎' };
        const scope = (0, nock_1.default)(url)
            .matchHeader('Content-Type', 'application/json')
            .post('/', JSON.stringify(body))
            .reply(200, {});
        const res = await (0, index_js_1.request)({
            url,
            method: 'POST',
            data: body,
        });
        scope.done();
        assert_1.default.deepStrictEqual(res.data, {});
    });
    (0, mocha_1.it)('should allow other JSON content-types to be specified', async () => {
        const body = { hello: '🌎' };
        const scope = (0, nock_1.default)(url)
            .matchHeader('Content-Type', 'application/json-patch+json')
            .post('/', JSON.stringify(body))
            .reply(200, {});
        const res = await (0, index_js_1.request)({
            url,
            method: 'POST',
            data: body,
            headers: new Headers({
                'Content-Type': 'application/json-patch+json',
            }),
        });
        scope.done();
        assert_1.default.deepStrictEqual(res.data, {});
    });
    (0, mocha_1.it)('should stringify with qs when content-type is set to application/x-www-form-urlencoded', async () => {
        const body = { hello: '🌎' };
        const scope = (0, nock_1.default)(url)
            .matchHeader('Content-Type', 'application/x-www-form-urlencoded')
            .post('/', new URLSearchParams(body).toString())
            .reply(200, {});
        const res = await (0, index_js_1.request)({
            url,
            method: 'POST',
            data: body,
            headers: new Headers({
                'Content-Type': 'application/x-www-form-urlencoded',
            }),
        });
        scope.done();
        assert_1.default.deepStrictEqual(res.data, {});
    });
    (0, mocha_1.it)('should return stream if asked nicely', async () => {
        const body = { hello: '🌎' };
        const scope = (0, nock_1.default)(url).get('/').reply(200, body);
        const res = await (0, index_js_1.request)({ url, responseType: 'stream' });
        scope.done();
        (0, assert_1.default)(res.data instanceof stream_1.default.Readable);
    });
    (0, mocha_1.it)('should return a `ReadableStream` when `fetch` has been provided ', async () => {
        const body = { hello: '🌎' };
        const scope = (0, nock_1.default)(url).get('/').reply(200, body);
        const res = await (0, index_js_1.request)({
            url,
            responseType: 'stream',
            fetchImplementation: fetch,
        });
        scope.done();
        (0, assert_1.default)(res.data instanceof ReadableStream);
    });
    (0, mocha_1.it)('should return an ArrayBuffer if asked nicely', async () => {
        const body = { hello: '🌎' };
        const scope = (0, nock_1.default)(url).get('/').reply(200, body);
        const res = await (0, index_js_1.request)({
            url,
            responseType: 'arraybuffer',
        });
        scope.done();
        (0, assert_1.default)(res.data instanceof ArrayBuffer);
        assert_1.default.deepStrictEqual(Buffer.from(JSON.stringify(body)), Buffer.from(res.data));
    });
    (0, mocha_1.it)('should return a blob if asked nicely', async () => {
        const body = { hello: '🌎' };
        const scope = (0, nock_1.default)(url).get('/').reply(200, body);
        const res = await (0, index_js_1.request)({ url, responseType: 'blob' });
        scope.done();
        assert_1.default.ok(res.data);
    });
    (0, mocha_1.it)('should return text if asked nicely', async () => {
        const body = 'hello 🌎';
        const scope = (0, nock_1.default)(url).get('/').reply(200, body);
        const res = await (0, index_js_1.request)({ url, responseType: 'text' });
        scope.done();
        assert_1.default.strictEqual(res.data, body);
    });
    (0, mocha_1.it)('should return status text', async () => {
        const body = { hello: '🌎' };
        const scope = (0, nock_1.default)(url).get('/').reply(200, body);
        const res = await (0, index_js_1.request)({ url });
        scope.done();
        assert_1.default.ok(res.data);
        // node-fetch and native fetch specs differ...
        // https://github.com/node-fetch/node-fetch/issues/1066
        assert_1.default.strictEqual(typeof res.statusText, 'string');
        // assert.strictEqual(res.statusText, 'OK');
    });
    (0, mocha_1.it)('should return JSON when response Content-Type=application/json', async () => {
        const body = { hello: 'world' };
        const scope = (0, nock_1.default)(url)
            .get('/')
            .reply(200, body, { 'Content-Type': 'application/json' });
        const res = await (0, index_js_1.request)({ url });
        scope.done();
        assert_1.default.ok(res.data);
        assert_1.default.deepStrictEqual(res.data, body);
    });
    (0, mocha_1.it)('should return invalid JSON as text when response Content-Type=application/json', async () => {
        const body = 'hello world';
        const scope = (0, nock_1.default)(url)
            .get('/')
            .reply(200, body, { 'Content-Type': 'application/json' });
        const res = await (0, index_js_1.request)({ url });
        scope.done();
        assert_1.default.ok(res.data);
        assert_1.default.deepStrictEqual(res.data, body);
    });
    (0, mocha_1.it)('should return text when response Content-Type=text/plain', async () => {
        const body = 'hello world';
        const scope = (0, nock_1.default)(url)
            .get('/')
            .reply(200, body, { 'Content-Type': 'text/plain' });
        const res = await (0, index_js_1.request)({ url });
        scope.done();
        assert_1.default.ok(res.data);
        assert_1.default.deepStrictEqual(res.data, body);
    });
    (0, mocha_1.it)('should return text when response Content-Type=text/csv', async () => {
        const body = '"col1","col2"\n"hello","world"';
        const scope = (0, nock_1.default)(url)
            .get('/')
            .reply(200, body, { 'Content-Type': 'text/csv' });
        const res = await (0, index_js_1.request)({ url });
        scope.done();
        assert_1.default.ok(res.data);
        assert_1.default.deepStrictEqual(res.data, body);
    });
    (0, mocha_1.it)('should return raw data when Content-Type is unable to be parsed', async () => {
        const body = Buffer.from('hello world', 'utf-8');
        const scope = (0, nock_1.default)(url)
            .get('/')
            .reply(200, body, { 'Content-Type': 'image/gif' });
        const res = await (0, index_js_1.request)({ url });
        scope.done();
        assert_1.default.ok(res.data);
        assert_1.default.notEqual(res.data, body);
    });
    (0, mocha_1.it)('should handle multipart/related when options.multipart is set and a single part', async () => {
        const bodyContent = { hello: '🌎' };
        const body = new stream_1.Readable();
        body.push(JSON.stringify(bodyContent));
        body.push(null);
        const scope = (0, nock_1.default)(url)
            .matchHeader('Content-Type', /multipart\/related; boundary=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
            .post('/', /^(--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[\r\n]+Content-Type: application\/json[\r\n\r\n]+{"hello":"🌎"}[\r\n]+--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}--)$/)
            .reply(200, {});
        const res = await (0, index_js_1.request)({
            url,
            method: 'POST',
            multipart: [
                {
                    headers: new Headers({ 'Content-Type': 'application/json' }),
                    content: body,
                },
            ],
        });
        scope.done();
        assert_1.default.ok(res.data);
    });
    (0, mocha_1.it)('should handle multipart/related when options.multipart is set and a multiple parts', async () => {
        const jsonContent = { hello: '🌎' };
        const textContent = 'hello world';
        const body = new stream_1.Readable();
        body.push(JSON.stringify(jsonContent));
        body.push(null);
        const scope = (0, nock_1.default)(url)
            .matchHeader('Content-Type', /multipart\/related; boundary=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
            .post('/', /^(--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[\r\n]+Content-Type: application\/json[\r\n\r\n]+{"hello":"🌎"}[\r\n]+--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[\r\n]+Content-Type: text\/plain[\r\n\r\n]+hello world[\r\n]+--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}--)$/)
            .reply(200, {});
        const res = await (0, index_js_1.request)({
            url,
            method: 'POST',
            multipart: [
                {
                    headers: new Headers({ 'Content-Type': 'application/json' }),
                    content: body,
                },
                {
                    headers: new Headers({ 'Content-Type': 'text/plain' }),
                    content: textContent,
                },
            ],
        });
        scope.done();
        assert_1.default.ok(res.data);
    });
    (0, mocha_1.it)('should redact sensitive props via the `errorRedactor` by default', async () => {
        const REDACT = '<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.';
        const customURL = new URL(url);
        customURL.searchParams.append('token', 'sensitive');
        customURL.searchParams.append('client_secret', 'data');
        customURL.searchParams.append('random', 'non-sensitive');
        const config = {
            headers: {
                Authentication: 'My Auth',
                /**
                 * Ensure casing is properly handled
                 */
                AUTHORIZATION: 'My Auth',
                'content-type': 'application/x-www-form-urlencoded',
                random: 'data',
            },
            data: {
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: 'somesensitivedata',
                unrelated: 'data',
                client_secret: 'data',
            },
            body: 'grant_type=somesensitivedata&assertion=somesensitivedata&client_secret=data',
        };
        // simulate JSON response
        const responseHeaders = {
            ...config.headers,
            'content-type': 'application/json',
        };
        const response = { ...config.data };
        const scope = (0, nock_1.default)(url)
            .post('/')
            .query(() => true)
            .reply(404, response, responseHeaders);
        const instance = new index_js_1.Gaxios(JSON.parse(JSON.stringify(config)));
        const requestConfig = {
            url: customURL.toString(),
            method: 'POST',
        };
        const requestConfigCopy = JSON.parse(JSON.stringify({ ...requestConfig }));
        try {
            await instance.request(requestConfig);
            throw new Error('Expected a GaxiosError');
        }
        catch (e) {
            (0, assert_1.default)(e instanceof index_js_1.GaxiosError);
            // config should not be mutated
            assert_1.default.deepStrictEqual(instance.defaults, config);
            assert_1.default.deepStrictEqual(requestConfig, requestConfigCopy);
            assert_1.default.notStrictEqual(e.config, config);
            // config redactions - headers
            const expectedRequestHeaders = new Headers({
                ...config.headers, // non-redactables should be present
                Authentication: REDACT,
                AUTHORIZATION: REDACT,
            });
            const actualHeaders = e.config.headers;
            expectedRequestHeaders.forEach((value, key) => {
                assert_1.default.equal(actualHeaders.get(key), value);
            });
            // config redactions - data
            assert_1.default.deepStrictEqual(e.config.data, {
                ...config.data, // non-redactables should be present
                grant_type: REDACT,
                assertion: REDACT,
                client_secret: REDACT,
            });
            assert_1.default.deepStrictEqual(Object.fromEntries(e.config.body), {
                ...config.data, // non-redactables should be present
                grant_type: REDACT,
                assertion: REDACT,
                client_secret: REDACT,
            });
            expectedRequestHeaders.forEach((value, key) => {
                assert_1.default.equal(actualHeaders.get(key), value);
            });
            // config redactions - url
            (0, assert_1.default)(e.config.url);
            const resultURL = new URL(e.config.url);
            assert_1.default.notDeepStrictEqual(resultURL.toString(), customURL.toString());
            customURL.searchParams.set('token', REDACT);
            customURL.searchParams.set('client_secret', REDACT);
            assert_1.default.deepStrictEqual(resultURL.toString(), customURL.toString());
            // response redactions
            (0, assert_1.default)(e.response);
            assert_1.default.deepStrictEqual(e.response.config, e.config);
            const expectedResponseHeaders = new Headers({
                ...responseHeaders, // non-redactables should be present
            });
            expectedResponseHeaders.set('authentication', REDACT);
            expectedResponseHeaders.set('authorization', REDACT);
            expectedResponseHeaders.forEach((value, key) => {
                assert_1.default.equal(e.response?.headers.get(key), value);
            });
            assert_1.default.deepStrictEqual(e.response.data, {
                ...response, // non-redactables should be present
                assertion: REDACT,
                client_secret: REDACT,
                grant_type: REDACT,
            });
        }
        finally {
            scope.done();
        }
    });
    (0, mocha_1.it)('should redact after final retry', async () => {
        const customURL = new URL(url);
        customURL.searchParams.append('token', 'sensitive');
        customURL.searchParams.append('client_secret', 'data');
        customURL.searchParams.append('random', 'non-sensitive');
        const data = {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: 'somesensitivedata',
            unrelated: 'data',
            client_secret: 'data',
        };
        let retryAttempted = false;
        const config = {
            url: customURL,
            method: 'POST',
            data: new URLSearchParams(data),
            retry: true,
            retryConfig: {
                httpMethodsToRetry: ['POST'],
                onRetryAttempt: err => {
                    assert_1.default.deepStrictEqual(err.config.data, new URLSearchParams(data));
                    retryAttempted = true;
                },
            },
        };
        const scope = (0, nock_1.default)(url)
            .post('/', data)
            .query(() => true)
            .reply(500)
            .post('/', data)
            .query(() => true)
            .reply(204);
        const gaxios = new index_js_1.Gaxios();
        try {
            await gaxios.request(config);
            (0, assert_1.default)(retryAttempted);
        }
        finally {
            scope.done();
        }
    });
    (0, mocha_1.it)('should handle "204 No Content" responses when response type is "json"', async () => {
        const scope = (0, nock_1.default)(url)
            .matchHeader('content-type', 'application/json')
            .put('/')
            .reply(204, '', { 'Content-Type': 'application/json' });
        const res = await (0, index_js_1.request)({
            url,
            method: 'PUT',
            data: {},
            headers: new Headers({
                'content-type': 'application/json',
                accept: 'application/json',
            }),
            responseType: 'json',
        });
        scope.done();
        assert_1.default.deepStrictEqual(res.data, '');
    });
    (0, mocha_1.it)('should not throw an error in case of invalid json and "json" response type', async () => {
        const invalidJsonText = '{foo: 1}', scope = (0, nock_1.default)(url)
            .matchHeader('content-type', 'application/json')
            .put('/')
            .reply(200, invalidJsonText, { 'Content-Type': 'application/json' });
        const res = await (0, index_js_1.request)({
            url,
            method: 'PUT',
            data: {},
            headers: new Headers({
                'content-type': 'application/json',
                accept: 'application/json',
            }),
            responseType: 'json',
        });
        scope.done();
        assert_1.default.deepStrictEqual(res.data, invalidJsonText);
    });
});
(0, mocha_1.describe)('🍂 defaults & instances', () => {
    (0, mocha_1.it)('should allow creating a new instance', () => {
        const requestInstance = new index_js_1.Gaxios();
        assert_1.default.strictEqual(typeof requestInstance.request, 'function');
    });
    (0, mocha_1.it)('should allow passing empty options', async () => {
        const body = { hello: '🌎' };
        const scope = (0, nock_1.default)(url).get('/').reply(200, body);
        const gax = new index_js_1.Gaxios({ url });
        const res = await gax.request();
        scope.done();
        assert_1.default.deepStrictEqual(res.data, body);
    });
    (0, mocha_1.it)('should allow buffer to be posted', async () => {
        const pkg = fs_1.default.readFileSync('./package.json');
        const pkgJson = JSON.parse(pkg.toString('utf8'));
        const scope = (0, nock_1.default)(url)
            .matchHeader('content-type', 'application/dicom')
            .post('/', pkgJson)
            .reply(200, {});
        const res = await (0, index_js_1.request)({
            url,
            method: 'POST',
            data: pkg,
            headers: new Headers({ 'content-type': 'application/dicom' }),
        });
        scope.done();
        assert_1.default.deepStrictEqual(res.data, {});
    });
    (0, mocha_1.it)('should not set a default content-type for buffers', async () => {
        const jsonLike = '{}';
        const data = Buffer.from(jsonLike);
        const scope = (0, nock_1.default)(url)
            // no content type should be present
            .matchHeader('content-type', v => v === undefined)
            .post('/', jsonLike)
            .reply(204);
        const res = await (0, index_js_1.request)({ url, method: 'POST', data });
        scope.done();
        assert_1.default.equal(res.status, 204);
    });
    (0, mocha_1.describe)('mtls', () => {
        class GaxiosAssertAgentCache extends index_js_1.Gaxios {
            getAgentCache() {
                return this.agentCache;
            }
            async _request(opts) {
                (0, assert_1.default)(opts.agent);
                return super._request(opts);
            }
        }
        (0, mocha_1.it)('uses HTTPS agent if cert and key provided, on first request', async () => {
            const key = fs_1.default.readFileSync('./test/fixtures/fake.key', 'utf8');
            const scope = (0, nock_1.default)(url).get('/').reply(200);
            const inst = new GaxiosAssertAgentCache({
                headers: new Headers({ apple: 'juice' }),
                cert: fs_1.default.readFileSync('./test/fixtures/fake.cert', 'utf8'),
                key,
            });
            const res = await inst.request({
                url,
                headers: new Headers({ figgy: 'pudding' }),
            });
            scope.done();
            assert_1.default.strictEqual(res.config.headers.get('apple'), 'juice');
            assert_1.default.strictEqual(res.config.headers.get('figgy'), 'pudding');
            const agentCache = inst.getAgentCache();
            (0, assert_1.default)(agentCache.get(key));
        });
        (0, mocha_1.it)('uses HTTPS agent if cert and key provided, on subsequent requests', async () => {
            const key = fs_1.default.readFileSync('./test/fixtures/fake.key', 'utf8');
            const scope = (0, nock_1.default)(url).get('/').reply(200).get('/').reply(200);
            const inst = new GaxiosAssertAgentCache({
                headers: new Headers({ apple: 'juice' }),
                cert: fs_1.default.readFileSync('./test/fixtures/fake.cert', 'utf8'),
                key,
            });
            await inst.request({ url, headers: new Headers({ figgy: 'pudding' }) });
            await inst.request({ url, headers: new Headers({ figgy: 'pudding' }) });
            scope.done();
            const agentCache = inst.getAgentCache();
            (0, assert_1.default)(agentCache.get(key));
        });
    });
});
(0, mocha_1.describe)('interceptors', () => {
    (0, mocha_1.describe)('request', () => {
        (0, mocha_1.it)('should invoke a request interceptor when one is provided', async () => {
            const scope = (0, nock_1.default)(url)
                .matchHeader('hello', 'world')
                .get('/')
                .reply(200, {});
            const instance = new index_js_1.Gaxios();
            instance.interceptors.request.add({
                resolved: config => {
                    config.headers.set('hello', 'world');
                    return Promise.resolve(config);
                },
            });
            await instance.request({ url });
            scope.done();
        });
        (0, mocha_1.it)('should not invoke a request interceptor after it is removed', async () => {
            const scope = (0, nock_1.default)(url).persist().get('/').reply(200, {});
            const spyFunc = sinon_1.default.fake(() => Promise.resolve({
                url,
                validateStatus: () => {
                    return true;
                },
            }));
            const instance = new index_js_1.Gaxios();
            const interceptor = { resolved: spyFunc };
            instance.interceptors.request.add(interceptor);
            await instance.request({ url });
            instance.interceptors.request.delete(interceptor);
            await instance.request({ url });
            scope.done();
            assert_1.default.strictEqual(spyFunc.callCount, 1);
        });
        (0, mocha_1.it)('should invoke multiple request interceptors in the order they were added', async () => {
            const scope = (0, nock_1.default)(url)
                .matchHeader('foo', 'bar')
                .matchHeader('bar', 'baz')
                .matchHeader('baz', 'buzz')
                .get('/')
                .reply(200, {});
            const instance = new index_js_1.Gaxios();
            instance.interceptors.request.add({
                resolved: config => {
                    config.headers.set('foo', 'bar');
                    return Promise.resolve(config);
                },
            });
            instance.interceptors.request.add({
                resolved: config => {
                    assert_1.default.strictEqual(config.headers.get('foo'), 'bar');
                    config.headers.set('bar', 'baz');
                    return Promise.resolve(config);
                },
            });
            instance.interceptors.request.add({
                resolved: config => {
                    assert_1.default.strictEqual(config.headers.get('foo'), 'bar');
                    assert_1.default.strictEqual(config.headers.get('bar'), 'baz');
                    config.headers.set('baz', 'buzz');
                    return Promise.resolve(config);
                },
            });
            await instance.request({ url });
            scope.done();
        });
        (0, mocha_1.it)('should not invoke a any request interceptors after they are removed', async () => {
            const scope = (0, nock_1.default)(url).persist().get('/').reply(200, {});
            const spyFunc = sinon_1.default.fake(() => Promise.resolve({
                url,
                validateStatus: () => {
                    return true;
                },
            }));
            const instance = new index_js_1.Gaxios();
            instance.interceptors.request.add({
                resolved: spyFunc,
            });
            instance.interceptors.request.add({
                resolved: spyFunc,
            });
            instance.interceptors.request.add({
                resolved: spyFunc,
            });
            await instance.request({ url });
            instance.interceptors.request.clear();
            await instance.request({ url });
            scope.done();
            assert_1.default.strictEqual(spyFunc.callCount, 3);
        });
        (0, mocha_1.it)('should invoke the rejected function when a previous request interceptor rejects', async () => {
            const instance = new index_js_1.Gaxios();
            instance.interceptors.request.add({
                resolved: () => {
                    throw new Error('Something went wrong');
                },
            });
            instance.interceptors.request.add({
                resolved: config => {
                    config.headers.set('hello', 'world');
                    return Promise.resolve(config);
                },
                rejected: err => {
                    assert_1.default.strictEqual(err.message, 'Something went wrong');
                },
            });
            // Because the options wind up being invalid the call will reject with a URL problem.
            await assert_1.default.rejects(instance.request({ url }));
        });
    });
    (0, mocha_1.describe)('response', () => {
        (0, mocha_1.it)('should invoke a response interceptor when one is provided', async () => {
            const scope = (0, nock_1.default)(url).get('/').reply(200, {});
            const instance = new index_js_1.Gaxios();
            instance.interceptors.response.add({
                resolved(response) {
                    response.headers.set('hello', 'world');
                    return Promise.resolve(response);
                },
            });
            const resp = await instance.request({ url });
            scope.done();
            assert_1.default.strictEqual(resp.headers.get('hello'), 'world');
        });
        (0, mocha_1.it)('should not invoke a response interceptor after it is removed', async () => {
            const scope = (0, nock_1.default)(url).persist().get('/').reply(200, {});
            const spyFunc = sinon_1.default.fake(() => Promise.resolve({
                url,
                validateStatus: () => {
                    return true;
                },
            }));
            const instance = new index_js_1.Gaxios();
            const interceptor = { resolved: spyFunc };
            instance.interceptors.response.add(interceptor);
            await instance.request({ url });
            instance.interceptors.response.delete(interceptor);
            await instance.request({ url });
            scope.done();
            assert_1.default.strictEqual(spyFunc.callCount, 1);
        });
        (0, mocha_1.it)('should invoke multiple response interceptors in the order they were added', async () => {
            const scope = (0, nock_1.default)(url).get('/').reply(200, {});
            const instance = new index_js_1.Gaxios();
            instance.interceptors.response.add({
                resolved: response => {
                    response.headers.set('foo', 'bar');
                    return Promise.resolve(response);
                },
            });
            instance.interceptors.response.add({
                resolved: response => {
                    assert_1.default.strictEqual(response.headers.get('foo'), 'bar');
                    response.headers.set('bar', 'baz');
                    return Promise.resolve(response);
                },
            });
            instance.interceptors.response.add({
                resolved: response => {
                    assert_1.default.strictEqual(response.headers.get('foo'), 'bar');
                    assert_1.default.strictEqual(response.headers.get('bar'), 'baz');
                    response.headers.set('baz', 'buzz');
                    return Promise.resolve(response);
                },
            });
            const resp = await instance.request({ url });
            scope.done();
            assert_1.default.strictEqual(resp.headers.get('foo'), 'bar');
            assert_1.default.strictEqual(resp.headers.get('bar'), 'baz');
            assert_1.default.strictEqual(resp.headers.get('baz'), 'buzz');
        });
        (0, mocha_1.it)('should not invoke a any response interceptors after they are removed', async () => {
            const scope = (0, nock_1.default)(url).persist().get('/').reply(200, {});
            const spyFunc = sinon_1.default.fake(() => Promise.resolve({
                url,
                validateStatus: () => {
                    return true;
                },
            }));
            const instance = new index_js_1.Gaxios();
            instance.interceptors.response.add({
                resolved: spyFunc,
            });
            instance.interceptors.response.add({
                resolved: spyFunc,
            });
            instance.interceptors.response.add({
                resolved: spyFunc,
            });
            await instance.request({ url });
            instance.interceptors.response.clear();
            await instance.request({ url });
            scope.done();
            assert_1.default.strictEqual(spyFunc.callCount, 3);
        });
        (0, mocha_1.it)('should invoke the rejected function when a request has an error', async () => {
            const scope = (0, nock_1.default)(url).get('/').reply(404, {});
            const instance = new index_js_1.Gaxios();
            instance.interceptors.response.add({
                rejected: err => {
                    assert_1.default.strictEqual(err.status, 404);
                },
            });
            await instance.request({ url });
            scope.done();
        });
    });
});
/**
 * Fetch-compliant API testing.
 *
 * Documentation:
 * - https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 * - https://nodejs.org/docs/latest/api/globals.html#fetch
 */
(0, mocha_1.describe)('fetch-compatible API', () => {
    (0, mocha_1.it)('should accept a `string`', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(200, {});
        const gaxios = new index_js_1.Gaxios();
        const res = await gaxios.fetch(url);
        scope.done();
        (0, assert_1.default)(typeof url === 'string');
        assert_1.default.deepStrictEqual(res.data, {});
    });
    (0, mocha_1.it)('should accept a `URL`', async () => {
        const scope = (0, nock_1.default)(url).get('/').reply(200, {});
        const gaxios = new index_js_1.Gaxios();
        const res = await gaxios.fetch(new URL(url));
        scope.done();
        assert_1.default.deepStrictEqual(res.data, {});
    });
    (0, mocha_1.it)('should accept an input with initialization', async () => {
        const scope = (0, nock_1.default)(url).post('/', 'abc').reply(200, {});
        const gaxios = new index_js_1.Gaxios();
        const res = await gaxios.fetch(url, {
            body: Buffer.from('abc'),
            method: 'POST',
        });
        scope.done();
        assert_1.default.deepStrictEqual(res.data, {});
    });
    (0, mocha_1.it)('should accept `GaxiosOptions`', async () => {
        const scope = (0, nock_1.default)(url).post('/', 'abc').reply(200, {});
        const gaxios = new index_js_1.Gaxios();
        const options = {
            body: Buffer.from('abc'),
            method: 'POST',
        };
        const res = await gaxios.fetch(url, options);
        scope.done();
        assert_1.default.deepStrictEqual(res.data, {});
    });
});
(0, mocha_1.describe)('merge headers', () => {
    (0, mocha_1.it)('should merge Headers', () => {
        const base = { a: 'a' };
        const append = { b: 'b' };
        const expected = new Headers({ ...base, ...append });
        const matrixBase = [{ ...base }, Object.entries(base), new Headers(base)];
        const matrixAppend = [
            { ...append },
            Object.entries(append),
            new Headers(append),
        ];
        for (const base of matrixBase) {
            for (const append of matrixAppend) {
                const headers = index_js_1.Gaxios.mergeHeaders(base, append);
                assert_1.default.deepStrictEqual(headers, expected);
            }
        }
    });
    (0, mocha_1.it)('should merge multiple Headers', () => {
        const base = { a: 'a' };
        const append = { b: 'b' };
        const appendMore = { c: 'c' };
        const expected = new Headers({ ...base, ...append, ...appendMore });
        const headers = index_js_1.Gaxios.mergeHeaders(base, append, appendMore);
        assert_1.default.deepStrictEqual(headers, expected);
    });
    (0, mocha_1.it)('should merge Set-Cookie Headers', () => {
        const base = { 'set-cookie': 'a=a' };
        const append = { 'set-cookie': 'b=b' };
        const expected = new Headers([
            ['set-cookie', 'a=a'],
            ['set-cookie', 'b=b'],
        ]);
        const headers = index_js_1.Gaxios.mergeHeaders(base, append);
        assert_1.default.deepStrictEqual(headers.getSetCookie(), expected.getSetCookie());
    });
});
//# sourceMappingURL=test.getch.js.map