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
import assert from 'assert';
import nock from 'nock';
import sinon from 'sinon';
import stream, { Readable } from 'stream';
import { describe, it, afterEach } from 'mocha';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Gaxios, GaxiosError, request, } from '../src/index.js';
import { GAXIOS_ERROR_SYMBOL, } from '../src/common.js';
import util from '../src/util.cjs';
import fs from 'fs';
const pkg = util.pkg;
nock.disableNetConnect();
const sandbox = sinon.createSandbox();
afterEach(() => {
    sandbox.restore();
    nock.cleanAll();
});
const url = 'https://example.com';
function setEnv(obj) {
    return sandbox.stub(process, 'env').value(obj);
}
describe('🦖 option validation', () => {
    it('should throw an error if a url is not provided', async () => {
        await assert.rejects(request({}), /URL is required/);
    });
});
describe('🚙 error handling', () => {
    it('should throw on non-2xx responses by default', async () => {
        const scope = nock(url).get('/').reply(500);
        await assert.rejects(request({ url }), (err) => {
            scope.done();
            return err.status === 500;
        });
    });
    it('should throw the error as a GaxiosError object, regardless of Content-Type header', async () => {
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
        const scope = nock(url).get('/').reply(404, body);
        await assert.rejects(request({ url, responseType: 'json' }), (err) => {
            scope.done();
            assert.deepStrictEqual(err.cause, body.error);
            return err.status === 404 && err.message === 'File not found';
        });
    });
    it('should throw the error as a `GaxiosError` object (with the message as a string), even if the request type is requested as an arraybuffer', async () => {
        const body = {
            error: {
                status: 404,
                message: 'File not found',
            },
        };
        const scope = nock(url).get('/').reply(404, body);
        await assert.rejects(request({ url, responseType: 'arraybuffer' }), (err) => {
            scope.done();
            return (err.status === 404 &&
                err.message === 'Request failed with status code 404' &&
                err.response?.data.error.message === 'File not found');
        });
    });
    it('should handle AIP-193 error bodies: passes API error in message', async () => {
        const body = {
            error: {
                code: 429,
                message: "The zone 'us-east1-a' does not have enough resources available to fulfill the request. Try a different zone, or try again later.",
                status: 'RESOURCE_EXHAUSTED',
                details: [],
            },
        };
        const readableStream = Readable.from(JSON.stringify(body));
        const scope = nock(url).get('/').reply(429, readableStream);
        await assert.rejects(request({ url, responseType: 'stream' }), (err) => {
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
    it('should not throw an error during a translation error', () => {
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
        const error = new GaxiosError('translation test', {}, response);
        assert(error.response);
        assert.equal(error.response.data, notJSON);
    });
    it('should support `instanceof` for GaxiosErrors of the same version', () => {
        class A extends GaxiosError {
        }
        const wrongVersion = { [GAXIOS_ERROR_SYMBOL]: '0.0.0' };
        const correctVersion = { [GAXIOS_ERROR_SYMBOL]: pkg.version };
        const child = new A('', {});
        assert.equal(wrongVersion instanceof GaxiosError, false);
        assert.equal(correctVersion instanceof GaxiosError, true);
        assert.equal(child instanceof GaxiosError, true);
    });
});
describe('🥁 configuration options', () => {
    it('should accept `URL` objects', async () => {
        const scope = nock(url).get('/').reply(204);
        const res = await request({ url: new URL(url) });
        scope.done();
        assert.strictEqual(res.status, 204);
    });
    it('should accept `Request` objects', async () => {
        const scope = nock(url).get('/').reply(204);
        const res = await request(new Request(url));
        scope.done();
        assert.strictEqual(res.status, 204);
    });
    it('should use options passed into the constructor', async () => {
        const scope = nock(url).head('/').reply(200);
        const inst = new Gaxios({ method: 'HEAD' });
        const res = await inst.request({ url });
        scope.done();
        assert.strictEqual(res.config.method, 'HEAD');
    });
    it('should handle nested options passed into the constructor', async () => {
        const scope = nock(url).get('/').reply(200);
        const inst = new Gaxios({ headers: new Headers({ apple: 'juice' }) });
        const res = await inst.request({
            url,
            headers: { figgy: 'pudding' },
        });
        scope.done();
        assert.strictEqual(res.config.headers.get('apple'), 'juice');
        assert.strictEqual(res.config.headers.get('figgy'), 'pudding');
    });
    it('should allow setting a base url in the options', async () => {
        const scope = nock(url).get('/v1/mango').reply(200, {});
        const inst = new Gaxios({ baseURL: `${url}/v1/` });
        const res = await inst.request({ url: 'mango' });
        scope.done();
        assert.deepStrictEqual(res.data, {});
    });
    it('should allow overriding valid status', async () => {
        const scope = nock(url).get('/').reply(304);
        const res = await request({ url, validateStatus: () => true });
        scope.done();
        assert.strictEqual(res.status, 304);
    });
    it('should allow setting maxContentLength', async () => {
        const body = { hello: '🌎' };
        const scope = nock(url)
            .get('/')
            .reply(200, body, { 'content-length': body.toString().length.toString() });
        const maxContentLength = 1;
        await assert.rejects(request({ url, maxContentLength }), (err) => {
            return err instanceof GaxiosError && /limit/.test(err.message);
        });
        scope.done();
    });
    it('should support redirects by default', async () => {
        const body = { hello: '🌎' };
        const scopes = [
            nock(url).get('/foo').reply(200, body),
            nock(url).get('/').reply(302, undefined, { location: '/foo' }),
        ];
        const res = await request({ url });
        scopes.forEach(x => x.done());
        assert.deepStrictEqual(res.data, body);
        assert.strictEqual(res.url, `${url}/foo`);
    });
    it('should allow overriding the adapter', async () => {
        const response = {
            data: { hello: '🌎' },
            config: {},
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
        };
        const adapter = () => Promise.resolve(response);
        const res = await request({ url, adapter });
        assert.strictEqual(response, res);
    });
    it('should allow overriding the adapter with default adapter wrapper', async () => {
        const body = { hello: '🌎' };
        const extraProperty = '🦦';
        const scope = nock(url).get('/').reply(200, body);
        const timings = [];
        const res = await request({
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
        assert.deepStrictEqual(res.data, {
            ...body,
            extraProperty,
        });
        assert(timings.length === 1);
        assert(typeof timings[0].duration === 'number');
    });
    it('should encode URL parameters', async () => {
        const path = '/?james=kirk&montgomery=scott';
        const opts = { url: `${url}${path}` };
        const scope = nock(url).get(path).reply(200, {});
        const res = await request(opts);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.config.url?.toString(), url + path);
        scope.done();
    });
    it('should preserve the original querystring', async () => {
        const path = '/?robot';
        const opts = { url: `${url}${path}` };
        const scope = nock(url).get(path).reply(200, {});
        const res = await request(opts);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.config.url?.toString(), url + path);
        scope.done();
    });
    it('should handle empty querystring params', async () => {
        const scope = nock(url).get('/').reply(200, {});
        const res = await request({
            url,
            params: {},
        });
        assert.strictEqual(res.status, 200);
        scope.done();
    });
    it('should encode parameters from the params option', async () => {
        const opts = { url, params: { james: 'kirk', montgomery: 'scott' } };
        const qs = '?james=kirk&montgomery=scott';
        const path = `/${qs}`;
        const scope = nock(url).get(path).reply(200, {});
        const res = await request(opts);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.config.url?.toString(), new URL(url + qs).toString());
        scope.done();
    });
    it('should merge URL parameters with the params option', async () => {
        const opts = {
            url: `${url}/?james=beckwith&montgomery=scott`,
            params: { james: 'kirk' },
        };
        const path = '/?james=beckwith&montgomery=scott&james=kirk';
        const scope = nock(url).get(path).reply(200, {});
        const res = await request(opts);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.config.url?.toString(), url + path);
        scope.done();
    });
    it('should allow overriding the param serializer', async () => {
        const qs = '?oh=HAI';
        const params = { james: 'kirk' };
        const opts = {
            url,
            params,
            paramsSerializer: ps => {
                assert.strictEqual(JSON.stringify(params), JSON.stringify(ps));
                return '?oh=HAI';
            },
        };
        const scope = nock(url).get(`/${qs}`).reply(200, {});
        const res = await request(opts);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.config.url.toString(), new URL(url + qs).toString());
        scope.done();
    });
    it('should return json by default', async () => {
        const body = { hello: '🌎' };
        const scope = nock(url).get('/').reply(200, body);
        const res = await request({ url });
        scope.done();
        assert.deepStrictEqual(body, res.data);
    });
    it('should send an application/json header by default', async () => {
        const scope = nock(url)
            .matchHeader('accept', 'application/json')
            .get('/')
            .reply(200, {});
        const res = await request({ url, responseType: 'json' });
        scope.done();
        assert.deepStrictEqual(res.data, {});
    });
    describe('proxying', () => {
        const url = 'https://domain.example.com/with-path';
        const proxy = 'https://fake.proxy/';
        let gaxios;
        let request;
        let responseBody;
        let scope;
        beforeEach(() => {
            gaxios = new Gaxios();
            request = gaxios.request.bind(gaxios);
            responseBody = { hello: '🌎' };
            const direct = new URL(url);
            scope = nock(direct.origin).get(direct.pathname).reply(200, responseBody);
        });
        function expectDirect(res) {
            scope.done();
            assert.deepStrictEqual(res.data, responseBody);
            assert.strictEqual(res.config.agent, undefined);
        }
        function expectProxy(res) {
            scope.done();
            assert.deepStrictEqual(res.data, responseBody);
            assert.ok(res.config.agent instanceof HttpsProxyAgent);
            assert.equal(res.config.agent.proxy.toString(), proxy);
        }
        it('should use an https proxy if asked nicely (config)', async () => {
            const res = await request({ url, proxy });
            expectProxy(res);
        });
        it('should use an https proxy if asked nicely (env)', async () => {
            setEnv({ https_proxy: proxy });
            const res = await request({ url });
            expectProxy(res);
        });
        it('should use mTLS with proxy', async () => {
            const cert = 'cert';
            const key = 'key';
            const res = await request({ url, proxy, cert, key });
            expectProxy(res);
            assert(res.config.agent instanceof HttpsProxyAgent);
            assert.equal(res.config.agent.connectOpts.cert, cert);
            assert.equal(res.config.agent.connectOpts.key, key);
        });
        it('should load the proxy from the cache', async () => {
            const res1 = await request({ url, proxy });
            const agent = res1.config.agent;
            expectProxy(res1);
            const direct = new URL(url);
            scope = nock(direct.origin).get(direct.pathname).reply(200, responseBody);
            const res2 = await request({ url, proxy });
            assert.strictEqual(agent, res2.config.agent);
            expectProxy(res2);
        });
        it('should load the proxy from the cache with mTLS', async () => {
            const cert = 'cert';
            const key = 'key';
            const res1 = await request({ url, proxy, cert, key });
            const agent = res1.config.agent;
            expectProxy(res1);
            const direct = new URL(url);
            scope = nock(direct.origin).get(direct.pathname).reply(200, responseBody);
            const res2 = await request({ url, proxy });
            assert.strictEqual(agent, res2.config.agent);
            expectProxy(res2);
            assert(res2.config.agent instanceof HttpsProxyAgent);
            assert.equal(res2.config.agent.connectOpts.cert, cert);
            assert.equal(res2.config.agent.connectOpts.key, key);
        });
        describe('noProxy', () => {
            it('should not proxy when url matches `noProxy` (config > string)', async () => {
                const noProxy = [new URL(url).host];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            it('should not proxy when url matches `noProxy` (config > URL)', async () => {
                // should match by `URL#origin`
                const noProxyURL = new URL(url);
                noProxyURL.pathname = '/some-other-path';
                const noProxy = [noProxyURL];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            it('should not proxy when url matches `noProxy` (config > RegExp)', async () => {
                const noProxy = [/example.com/];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            it('should not proxy when url matches `noProxy` (config + env > match config)', async () => {
                const noProxy = [url];
                setEnv({ no_proxy: 'https://foo.bar' });
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            it('should not proxy when url matches `noProxy` (config + env > match env)', async () => {
                const noProxy = ['https://foo.bar'];
                setEnv({ no_proxy: url });
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            it('should proxy when url does not match `noProxy` (config > string)', async () => {
                const noProxy = [url];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            it('should proxy if url does not match `noProxy` (config > URL > diff origin > protocol)', async () => {
                const noProxyURL = new URL(url);
                noProxyURL.protocol = 'http:';
                const noProxy = [noProxyURL];
                const res = await request({ url, proxy, noProxy });
                expectProxy(res);
            });
            it('should proxy if url does not match `noProxy` (config > URL > diff origin > port)', async () => {
                const noProxyURL = new URL(url);
                noProxyURL.port = '8443';
                const noProxy = [noProxyURL];
                const res = await request({ url, proxy, noProxy });
                expectProxy(res);
            });
            it('should proxy if url does not match `noProxy` (env)', async () => {
                setEnv({ https_proxy: proxy, no_proxy: 'https://blah' });
                const res = await request({ url });
                expectProxy(res);
            });
            it('should not proxy if `noProxy` env var matches the origin or hostname of the URL (config > string)', async () => {
                const noProxy = [new URL(url).hostname];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            it('should not proxy if `noProxy` env var matches the origin or hostname of the URL (env)', async () => {
                setEnv({ https_proxy: proxy, no_proxy: new URL(url).hostname });
                const res = await request({ url });
                expectDirect(res);
            });
            it('should not proxy if `noProxy` env variable has asterisk, and URL partially matches (config)', async () => {
                const parentHost = new URL(url).hostname.split('.').slice(1).join('.');
                // ensure we have a host for a valid test
                assert(parentHost);
                const noProxy = [`*.${parentHost}`];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            it('should not proxy if `noProxy` env variable has asterisk, and URL partially matches (env)', async () => {
                const parentHost = new URL(url).hostname.split('.').slice(1).join('.');
                // ensure we have a host for a valid test
                assert(parentHost);
                setEnv({ https_proxy: proxy, no_proxy: `*.${parentHost}` });
                const res = await request({ url });
                expectDirect(res);
            });
            it('should not proxy if `noProxy` env variable starts with a dot, and URL partially matches (config)', async () => {
                const parentHost = new URL(url).hostname.split('.').slice(1).join('.');
                // ensure we have a host for a valid test
                assert(parentHost);
                const noProxy = [`.${parentHost}`];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            it('should not proxy if `noProxy` env variable starts with a dot, and URL partially matches (env)', async () => {
                const parentHost = new URL(url).hostname.split('.').slice(1).join('.');
                // ensure we have a host for a valid test
                assert(parentHost);
                setEnv({ https_proxy: proxy, no_proxy: '.example.com' });
                const res = await request({ url });
                expectDirect(res);
            });
            it('should proxy if `noProxy` env variable has asterisk, but URL is not matching (config)', async () => {
                const noProxy = ['*.no.match'];
                const res = await request({ url, proxy, noProxy });
                expectProxy(res);
            });
            it('should proxy if `noProxy` env variable has asterisk, but URL is not matching (env)', async () => {
                setEnv({ https_proxy: proxy, no_proxy: '*.no.match' });
                const res = await request({ url });
                expectProxy(res);
            });
            it('should allow comma-separated lists for `noProxy` env variables (config)', async () => {
                const parentHost = new URL(url).hostname.split('.').slice(1).join('.');
                // ensure we have a host for a valid test
                assert(parentHost);
                const noProxy = ['google.com', `*.${parentHost}`, 'hello.com'];
                const res = await request({ url, proxy, noProxy });
                expectDirect(res);
            });
            it('should allow comma-separated lists for `noProxy` env variables (env)', async () => {
                const parentHost = new URL(url).hostname.split('.').slice(1).join('.');
                // ensure we have a host for a valid test
                assert(parentHost);
                // added spaces to ensure trimming works as expected
                const noProxy = [' google.com ', ` *.${parentHost} `, ' hello.com '];
                setEnv({ https_proxy: proxy, no_proxy: noProxy.join(',') });
                const res = await request({ url });
                expectDirect(res);
            });
        });
    });
    it('should include the request data in the response config', async () => {
        const body = { hello: '🌎' };
        const scope = nock(url).post('/', body).reply(200);
        const res = await request({ url, method: 'POST', data: body });
        scope.done();
        assert.deepStrictEqual(res.config.data, body);
    });
    it('should not stringify the data if it is appended by a form', async () => {
        const formData = new FormData();
        formData.append('test', '123');
        const scope = nock(url)
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
        const res = await request({
            url,
            method: 'POST',
            data: formData,
        });
        scope.done();
        assert.deepStrictEqual(res.config.data, formData);
        assert.ok(res.config.body instanceof FormData);
        assert.ok(res.config.data instanceof FormData);
    });
    it('should allow explicitly setting the fetch implementation', async () => {
        let customFetchCalled = false;
        const myFetch = (...args) => {
            customFetchCalled = true;
            return fetch(...args);
        };
        const scope = nock(url).post('/').reply(204);
        const res = await request({
            url,
            method: 'POST',
            fetchImplementation: myFetch,
            // This `data` ensures the 'duplex' option has been set
            data: { sample: 'data' },
        });
        assert(customFetchCalled);
        assert.equal(res.status, 204);
        scope.done();
    });
    it('should be able to disable the `errorRedactor`', async () => {
        const scope = nock(url).get('/').reply(200);
        const instance = new Gaxios({ url, errorRedactor: false });
        assert.equal(instance.defaults.errorRedactor, false);
        await instance.request({ url });
        scope.done();
        assert.equal(instance.defaults.errorRedactor, false);
    });
    it('should be able to set a custom `errorRedactor`', async () => {
        const scope = nock(url).get('/').reply(200);
        const errorRedactor = (t) => t;
        const instance = new Gaxios({ url, errorRedactor });
        assert.equal(instance.defaults.errorRedactor, errorRedactor);
        await instance.request({ url });
        scope.done();
        assert.equal(instance.defaults.errorRedactor, errorRedactor);
    });
    describe('timeout', () => {
        it('should accept and use a `timeout`', async () => {
            nock(url).get('/').delay(2000).reply(204);
            const gaxios = new Gaxios();
            const timeout = 10;
            await assert.rejects(() => gaxios.request({ url, timeout }), /abort/);
        });
        it('should a `timeout`, an existing `signal`, and be triggered by timeout', async () => {
            nock(url).get('/').delay(2000).reply(204);
            const gaxios = new Gaxios();
            const signal = new AbortController().signal;
            const timeout = 10;
            await assert.rejects(() => gaxios.request({ url, timeout, signal }), /abort/);
        });
        it('should use a `timeout`, a `signal`, and be triggered by signal', async () => {
            nock(url).get('/').delay(2000).reply(204);
            const gaxios = new Gaxios();
            const ac = new AbortController();
            const signal = ac.signal;
            const timeout = 4000; // after network delay, so this shouldn't trigger
            const message = 'Changed my mind - no request please';
            setTimeout(() => ac.abort(message), 10);
            await assert.rejects(() => gaxios.request({ url, timeout, signal }), 
            // `node-fetch` always rejects with the generic 'abort' error:
            /abort/);
        });
    });
});
describe('🎏 data handling', () => {
    it('should accept a ReadableStream as request data', async () => {
        const scope = nock(url).post('/', 'test').reply(200, {});
        const res = await request({
            url,
            method: 'POST',
            data: Readable.from('test'),
        });
        scope.done();
        assert.deepStrictEqual(res.data, {});
    });
    it('should accept a string in the request data', async () => {
        const body = { hello: '🌎' };
        const encoded = new URLSearchParams(body);
        const scope = nock(url)
            .matchHeader('content-type', 'application/x-www-form-urlencoded')
            .post('/', encoded.toString())
            .reply(200, {});
        const res = await request({
            url,
            method: 'POST',
            data: encoded,
            headers: new Headers({
                'content-type': 'application/x-www-form-urlencoded',
            }),
        });
        scope.done();
        assert.deepStrictEqual(res.data, {});
    });
    it('should set application/json content-type for object request by default', async () => {
        const body = { hello: '🌎' };
        const scope = nock(url)
            .matchHeader('Content-Type', 'application/json')
            .post('/', JSON.stringify(body))
            .reply(200, {});
        const res = await request({
            url,
            method: 'POST',
            data: body,
        });
        scope.done();
        assert.deepStrictEqual(res.data, {});
    });
    it('should allow other JSON content-types to be specified', async () => {
        const body = { hello: '🌎' };
        const scope = nock(url)
            .matchHeader('Content-Type', 'application/json-patch+json')
            .post('/', JSON.stringify(body))
            .reply(200, {});
        const res = await request({
            url,
            method: 'POST',
            data: body,
            headers: new Headers({
                'Content-Type': 'application/json-patch+json',
            }),
        });
        scope.done();
        assert.deepStrictEqual(res.data, {});
    });
    it('should stringify with qs when content-type is set to application/x-www-form-urlencoded', async () => {
        const body = { hello: '🌎' };
        const scope = nock(url)
            .matchHeader('Content-Type', 'application/x-www-form-urlencoded')
            .post('/', new URLSearchParams(body).toString())
            .reply(200, {});
        const res = await request({
            url,
            method: 'POST',
            data: body,
            headers: new Headers({
                'Content-Type': 'application/x-www-form-urlencoded',
            }),
        });
        scope.done();
        assert.deepStrictEqual(res.data, {});
    });
    it('should return stream if asked nicely', async () => {
        const body = { hello: '🌎' };
        const scope = nock(url).get('/').reply(200, body);
        const res = await request({ url, responseType: 'stream' });
        scope.done();
        assert(res.data instanceof stream.Readable);
    });
    it('should return a `ReadableStream` when `fetch` has been provided ', async () => {
        const body = { hello: '🌎' };
        const scope = nock(url).get('/').reply(200, body);
        const res = await request({
            url,
            responseType: 'stream',
            fetchImplementation: fetch,
        });
        scope.done();
        assert(res.data instanceof ReadableStream);
    });
    it('should return an ArrayBuffer if asked nicely', async () => {
        const body = { hello: '🌎' };
        const scope = nock(url).get('/').reply(200, body);
        const res = await request({
            url,
            responseType: 'arraybuffer',
        });
        scope.done();
        assert(res.data instanceof ArrayBuffer);
        assert.deepStrictEqual(Buffer.from(JSON.stringify(body)), Buffer.from(res.data));
    });
    it('should return a blob if asked nicely', async () => {
        const body = { hello: '🌎' };
        const scope = nock(url).get('/').reply(200, body);
        const res = await request({ url, responseType: 'blob' });
        scope.done();
        assert.ok(res.data);
    });
    it('should return text if asked nicely', async () => {
        const body = 'hello 🌎';
        const scope = nock(url).get('/').reply(200, body);
        const res = await request({ url, responseType: 'text' });
        scope.done();
        assert.strictEqual(res.data, body);
    });
    it('should return status text', async () => {
        const body = { hello: '🌎' };
        const scope = nock(url).get('/').reply(200, body);
        const res = await request({ url });
        scope.done();
        assert.ok(res.data);
        // node-fetch and native fetch specs differ...
        // https://github.com/node-fetch/node-fetch/issues/1066
        assert.strictEqual(typeof res.statusText, 'string');
        // assert.strictEqual(res.statusText, 'OK');
    });
    it('should return JSON when response Content-Type=application/json', async () => {
        const body = { hello: 'world' };
        const scope = nock(url)
            .get('/')
            .reply(200, body, { 'Content-Type': 'application/json' });
        const res = await request({ url });
        scope.done();
        assert.ok(res.data);
        assert.deepStrictEqual(res.data, body);
    });
    it('should return invalid JSON as text when response Content-Type=application/json', async () => {
        const body = 'hello world';
        const scope = nock(url)
            .get('/')
            .reply(200, body, { 'Content-Type': 'application/json' });
        const res = await request({ url });
        scope.done();
        assert.ok(res.data);
        assert.deepStrictEqual(res.data, body);
    });
    it('should return text when response Content-Type=text/plain', async () => {
        const body = 'hello world';
        const scope = nock(url)
            .get('/')
            .reply(200, body, { 'Content-Type': 'text/plain' });
        const res = await request({ url });
        scope.done();
        assert.ok(res.data);
        assert.deepStrictEqual(res.data, body);
    });
    it('should return text when response Content-Type=text/csv', async () => {
        const body = '"col1","col2"\n"hello","world"';
        const scope = nock(url)
            .get('/')
            .reply(200, body, { 'Content-Type': 'text/csv' });
        const res = await request({ url });
        scope.done();
        assert.ok(res.data);
        assert.deepStrictEqual(res.data, body);
    });
    it('should return raw data when Content-Type is unable to be parsed', async () => {
        const body = Buffer.from('hello world', 'utf-8');
        const scope = nock(url)
            .get('/')
            .reply(200, body, { 'Content-Type': 'image/gif' });
        const res = await request({ url });
        scope.done();
        assert.ok(res.data);
        assert.notEqual(res.data, body);
    });
    it('should handle multipart/related when options.multipart is set and a single part', async () => {
        const bodyContent = { hello: '🌎' };
        const body = new Readable();
        body.push(JSON.stringify(bodyContent));
        body.push(null);
        const scope = nock(url)
            .matchHeader('Content-Type', /multipart\/related; boundary=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
            .post('/', /^(--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[\r\n]+Content-Type: application\/json[\r\n\r\n]+{"hello":"🌎"}[\r\n]+--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}--)$/)
            .reply(200, {});
        const res = await request({
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
        assert.ok(res.data);
    });
    it('should handle multipart/related when options.multipart is set and a multiple parts', async () => {
        const jsonContent = { hello: '🌎' };
        const textContent = 'hello world';
        const body = new Readable();
        body.push(JSON.stringify(jsonContent));
        body.push(null);
        const scope = nock(url)
            .matchHeader('Content-Type', /multipart\/related; boundary=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
            .post('/', /^(--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[\r\n]+Content-Type: application\/json[\r\n\r\n]+{"hello":"🌎"}[\r\n]+--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[\r\n]+Content-Type: text\/plain[\r\n\r\n]+hello world[\r\n]+--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}--)$/)
            .reply(200, {});
        const res = await request({
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
        assert.ok(res.data);
    });
    it('should redact sensitive props via the `errorRedactor` by default', async () => {
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
        const scope = nock(url)
            .post('/')
            .query(() => true)
            .reply(404, response, responseHeaders);
        const instance = new Gaxios(JSON.parse(JSON.stringify(config)));
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
            assert(e instanceof GaxiosError);
            // config should not be mutated
            assert.deepStrictEqual(instance.defaults, config);
            assert.deepStrictEqual(requestConfig, requestConfigCopy);
            assert.notStrictEqual(e.config, config);
            // config redactions - headers
            const expectedRequestHeaders = new Headers({
                ...config.headers, // non-redactables should be present
                Authentication: REDACT,
                AUTHORIZATION: REDACT,
            });
            const actualHeaders = e.config.headers;
            expectedRequestHeaders.forEach((value, key) => {
                assert.equal(actualHeaders.get(key), value);
            });
            // config redactions - data
            assert.deepStrictEqual(e.config.data, {
                ...config.data, // non-redactables should be present
                grant_type: REDACT,
                assertion: REDACT,
                client_secret: REDACT,
            });
            assert.deepStrictEqual(Object.fromEntries(e.config.body), {
                ...config.data, // non-redactables should be present
                grant_type: REDACT,
                assertion: REDACT,
                client_secret: REDACT,
            });
            expectedRequestHeaders.forEach((value, key) => {
                assert.equal(actualHeaders.get(key), value);
            });
            // config redactions - url
            assert(e.config.url);
            const resultURL = new URL(e.config.url);
            assert.notDeepStrictEqual(resultURL.toString(), customURL.toString());
            customURL.searchParams.set('token', REDACT);
            customURL.searchParams.set('client_secret', REDACT);
            assert.deepStrictEqual(resultURL.toString(), customURL.toString());
            // response redactions
            assert(e.response);
            assert.deepStrictEqual(e.response.config, e.config);
            const expectedResponseHeaders = new Headers({
                ...responseHeaders, // non-redactables should be present
            });
            expectedResponseHeaders.set('authentication', REDACT);
            expectedResponseHeaders.set('authorization', REDACT);
            expectedResponseHeaders.forEach((value, key) => {
                assert.equal(e.response?.headers.get(key), value);
            });
            assert.deepStrictEqual(e.response.data, {
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
    it('should redact after final retry', async () => {
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
                    assert.deepStrictEqual(err.config.data, new URLSearchParams(data));
                    retryAttempted = true;
                },
            },
        };
        const scope = nock(url)
            .post('/', data)
            .query(() => true)
            .reply(500)
            .post('/', data)
            .query(() => true)
            .reply(204);
        const gaxios = new Gaxios();
        try {
            await gaxios.request(config);
            assert(retryAttempted);
        }
        finally {
            scope.done();
        }
    });
    it('should handle "204 No Content" responses when response type is "json"', async () => {
        const scope = nock(url)
            .matchHeader('content-type', 'application/json')
            .put('/')
            .reply(204, '', { 'Content-Type': 'application/json' });
        const res = await request({
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
        assert.deepStrictEqual(res.data, '');
    });
    it('should not throw an error in case of invalid json and "json" response type', async () => {
        const invalidJsonText = '{foo: 1}', scope = nock(url)
            .matchHeader('content-type', 'application/json')
            .put('/')
            .reply(200, invalidJsonText, { 'Content-Type': 'application/json' });
        const res = await request({
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
        assert.deepStrictEqual(res.data, invalidJsonText);
    });
});
describe('🍂 defaults & instances', () => {
    it('should allow creating a new instance', () => {
        const requestInstance = new Gaxios();
        assert.strictEqual(typeof requestInstance.request, 'function');
    });
    it('should allow passing empty options', async () => {
        const body = { hello: '🌎' };
        const scope = nock(url).get('/').reply(200, body);
        const gax = new Gaxios({ url });
        const res = await gax.request();
        scope.done();
        assert.deepStrictEqual(res.data, body);
    });
    it('should allow buffer to be posted', async () => {
        const pkg = fs.readFileSync('./package.json');
        const pkgJson = JSON.parse(pkg.toString('utf8'));
        const scope = nock(url)
            .matchHeader('content-type', 'application/dicom')
            .post('/', pkgJson)
            .reply(200, {});
        const res = await request({
            url,
            method: 'POST',
            data: pkg,
            headers: new Headers({ 'content-type': 'application/dicom' }),
        });
        scope.done();
        assert.deepStrictEqual(res.data, {});
    });
    it('should not set a default content-type for buffers', async () => {
        const jsonLike = '{}';
        const data = Buffer.from(jsonLike);
        const scope = nock(url)
            // no content type should be present
            .matchHeader('content-type', v => v === undefined)
            .post('/', jsonLike)
            .reply(204);
        const res = await request({ url, method: 'POST', data });
        scope.done();
        assert.equal(res.status, 204);
    });
    describe('mtls', () => {
        class GaxiosAssertAgentCache extends Gaxios {
            getAgentCache() {
                return this.agentCache;
            }
            async _request(opts) {
                assert(opts.agent);
                return super._request(opts);
            }
        }
        it('uses HTTPS agent if cert and key provided, on first request', async () => {
            const key = fs.readFileSync('./test/fixtures/fake.key', 'utf8');
            const scope = nock(url).get('/').reply(200);
            const inst = new GaxiosAssertAgentCache({
                headers: new Headers({ apple: 'juice' }),
                cert: fs.readFileSync('./test/fixtures/fake.cert', 'utf8'),
                key,
            });
            const res = await inst.request({
                url,
                headers: new Headers({ figgy: 'pudding' }),
            });
            scope.done();
            assert.strictEqual(res.config.headers.get('apple'), 'juice');
            assert.strictEqual(res.config.headers.get('figgy'), 'pudding');
            const agentCache = inst.getAgentCache();
            assert(agentCache.get(key));
        });
        it('uses HTTPS agent if cert and key provided, on subsequent requests', async () => {
            const key = fs.readFileSync('./test/fixtures/fake.key', 'utf8');
            const scope = nock(url).get('/').reply(200).get('/').reply(200);
            const inst = new GaxiosAssertAgentCache({
                headers: new Headers({ apple: 'juice' }),
                cert: fs.readFileSync('./test/fixtures/fake.cert', 'utf8'),
                key,
            });
            await inst.request({ url, headers: new Headers({ figgy: 'pudding' }) });
            await inst.request({ url, headers: new Headers({ figgy: 'pudding' }) });
            scope.done();
            const agentCache = inst.getAgentCache();
            assert(agentCache.get(key));
        });
    });
});
describe('interceptors', () => {
    describe('request', () => {
        it('should invoke a request interceptor when one is provided', async () => {
            const scope = nock(url)
                .matchHeader('hello', 'world')
                .get('/')
                .reply(200, {});
            const instance = new Gaxios();
            instance.interceptors.request.add({
                resolved: config => {
                    config.headers.set('hello', 'world');
                    return Promise.resolve(config);
                },
            });
            await instance.request({ url });
            scope.done();
        });
        it('should not invoke a request interceptor after it is removed', async () => {
            const scope = nock(url).persist().get('/').reply(200, {});
            const spyFunc = sinon.fake(() => Promise.resolve({
                url,
                validateStatus: () => {
                    return true;
                },
            }));
            const instance = new Gaxios();
            const interceptor = { resolved: spyFunc };
            instance.interceptors.request.add(interceptor);
            await instance.request({ url });
            instance.interceptors.request.delete(interceptor);
            await instance.request({ url });
            scope.done();
            assert.strictEqual(spyFunc.callCount, 1);
        });
        it('should invoke multiple request interceptors in the order they were added', async () => {
            const scope = nock(url)
                .matchHeader('foo', 'bar')
                .matchHeader('bar', 'baz')
                .matchHeader('baz', 'buzz')
                .get('/')
                .reply(200, {});
            const instance = new Gaxios();
            instance.interceptors.request.add({
                resolved: config => {
                    config.headers.set('foo', 'bar');
                    return Promise.resolve(config);
                },
            });
            instance.interceptors.request.add({
                resolved: config => {
                    assert.strictEqual(config.headers.get('foo'), 'bar');
                    config.headers.set('bar', 'baz');
                    return Promise.resolve(config);
                },
            });
            instance.interceptors.request.add({
                resolved: config => {
                    assert.strictEqual(config.headers.get('foo'), 'bar');
                    assert.strictEqual(config.headers.get('bar'), 'baz');
                    config.headers.set('baz', 'buzz');
                    return Promise.resolve(config);
                },
            });
            await instance.request({ url });
            scope.done();
        });
        it('should not invoke a any request interceptors after they are removed', async () => {
            const scope = nock(url).persist().get('/').reply(200, {});
            const spyFunc = sinon.fake(() => Promise.resolve({
                url,
                validateStatus: () => {
                    return true;
                },
            }));
            const instance = new Gaxios();
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
            assert.strictEqual(spyFunc.callCount, 3);
        });
        it('should invoke the rejected function when a previous request interceptor rejects', async () => {
            const instance = new Gaxios();
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
                    assert.strictEqual(err.message, 'Something went wrong');
                },
            });
            // Because the options wind up being invalid the call will reject with a URL problem.
            await assert.rejects(instance.request({ url }));
        });
    });
    describe('response', () => {
        it('should invoke a response interceptor when one is provided', async () => {
            const scope = nock(url).get('/').reply(200, {});
            const instance = new Gaxios();
            instance.interceptors.response.add({
                resolved(response) {
                    response.headers.set('hello', 'world');
                    return Promise.resolve(response);
                },
            });
            const resp = await instance.request({ url });
            scope.done();
            assert.strictEqual(resp.headers.get('hello'), 'world');
        });
        it('should not invoke a response interceptor after it is removed', async () => {
            const scope = nock(url).persist().get('/').reply(200, {});
            const spyFunc = sinon.fake(() => Promise.resolve({
                url,
                validateStatus: () => {
                    return true;
                },
            }));
            const instance = new Gaxios();
            const interceptor = { resolved: spyFunc };
            instance.interceptors.response.add(interceptor);
            await instance.request({ url });
            instance.interceptors.response.delete(interceptor);
            await instance.request({ url });
            scope.done();
            assert.strictEqual(spyFunc.callCount, 1);
        });
        it('should invoke multiple response interceptors in the order they were added', async () => {
            const scope = nock(url).get('/').reply(200, {});
            const instance = new Gaxios();
            instance.interceptors.response.add({
                resolved: response => {
                    response.headers.set('foo', 'bar');
                    return Promise.resolve(response);
                },
            });
            instance.interceptors.response.add({
                resolved: response => {
                    assert.strictEqual(response.headers.get('foo'), 'bar');
                    response.headers.set('bar', 'baz');
                    return Promise.resolve(response);
                },
            });
            instance.interceptors.response.add({
                resolved: response => {
                    assert.strictEqual(response.headers.get('foo'), 'bar');
                    assert.strictEqual(response.headers.get('bar'), 'baz');
                    response.headers.set('baz', 'buzz');
                    return Promise.resolve(response);
                },
            });
            const resp = await instance.request({ url });
            scope.done();
            assert.strictEqual(resp.headers.get('foo'), 'bar');
            assert.strictEqual(resp.headers.get('bar'), 'baz');
            assert.strictEqual(resp.headers.get('baz'), 'buzz');
        });
        it('should not invoke a any response interceptors after they are removed', async () => {
            const scope = nock(url).persist().get('/').reply(200, {});
            const spyFunc = sinon.fake(() => Promise.resolve({
                url,
                validateStatus: () => {
                    return true;
                },
            }));
            const instance = new Gaxios();
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
            assert.strictEqual(spyFunc.callCount, 3);
        });
        it('should invoke the rejected function when a request has an error', async () => {
            const scope = nock(url).get('/').reply(404, {});
            const instance = new Gaxios();
            instance.interceptors.response.add({
                rejected: err => {
                    assert.strictEqual(err.status, 404);
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
describe('fetch-compatible API', () => {
    it('should accept a `string`', async () => {
        const scope = nock(url).get('/').reply(200, {});
        const gaxios = new Gaxios();
        const res = await gaxios.fetch(url);
        scope.done();
        assert(typeof url === 'string');
        assert.deepStrictEqual(res.data, {});
    });
    it('should accept a `URL`', async () => {
        const scope = nock(url).get('/').reply(200, {});
        const gaxios = new Gaxios();
        const res = await gaxios.fetch(new URL(url));
        scope.done();
        assert.deepStrictEqual(res.data, {});
    });
    it('should accept an input with initialization', async () => {
        const scope = nock(url).post('/', 'abc').reply(200, {});
        const gaxios = new Gaxios();
        const res = await gaxios.fetch(url, {
            body: Buffer.from('abc'),
            method: 'POST',
        });
        scope.done();
        assert.deepStrictEqual(res.data, {});
    });
    it('should accept `GaxiosOptions`', async () => {
        const scope = nock(url).post('/', 'abc').reply(200, {});
        const gaxios = new Gaxios();
        const options = {
            body: Buffer.from('abc'),
            method: 'POST',
        };
        const res = await gaxios.fetch(url, options);
        scope.done();
        assert.deepStrictEqual(res.data, {});
    });
});
describe('merge headers', () => {
    it('should merge Headers', () => {
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
                const headers = Gaxios.mergeHeaders(base, append);
                assert.deepStrictEqual(headers, expected);
            }
        }
    });
    it('should merge multiple Headers', () => {
        const base = { a: 'a' };
        const append = { b: 'b' };
        const appendMore = { c: 'c' };
        const expected = new Headers({ ...base, ...append, ...appendMore });
        const headers = Gaxios.mergeHeaders(base, append, appendMore);
        assert.deepStrictEqual(headers, expected);
    });
    it('should merge Set-Cookie Headers', () => {
        const base = { 'set-cookie': 'a=a' };
        const append = { 'set-cookie': 'b=b' };
        const expected = new Headers([
            ['set-cookie', 'a=a'],
            ['set-cookie', 'b=b'],
        ]);
        const headers = Gaxios.mergeHeaders(base, append);
        assert.deepStrictEqual(headers.getSetCookie(), expected.getSetCookie());
    });
});
//# sourceMappingURL=test.getch.js.map