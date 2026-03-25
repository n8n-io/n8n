"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = exports.createApis = void 0;
const openapi_typescript_fetch_1 = require("@qdrant/openapi-typescript-fetch");
const dispatcher_js_1 = require("./dispatcher.js");
const errors_js_1 = require("./errors.js");
const generated_api_client_js_1 = require("./openapi/generated_api_client.js");
function createApis(baseUrl, args) {
    const client = createClient(baseUrl, args);
    return (0, generated_api_client_js_1.createClientApi)(client);
}
exports.createApis = createApis;
function createClient(baseUrl, { headers, timeout, connections }) {
    const use = [];
    if (Number.isFinite(timeout)) {
        use.push(async (url, init, next) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                return await next(url, Object.assign(init, { signal: controller.signal }));
            }
            catch (e) {
                if (e instanceof Error && e.name === 'AbortError') {
                    throw new errors_js_1.QdrantClientTimeoutError(e.message);
                }
                throw e;
            }
            finally {
                clearTimeout(id);
            }
        });
    }
    use.push(async (url, init, next) => {
        let response;
        try {
            response = await next(url, init);
            if (response.status === 200 || response.status === 201) {
                return response;
            }
        }
        catch (error) {
            if (error instanceof openapi_typescript_fetch_1.ApiError && error.status === 429) {
                const retryAfterHeader = error.headers.get('retry-after')?.[0];
                if (retryAfterHeader) {
                    throw new errors_js_1.QdrantClientResourceExhaustedError(error.message, retryAfterHeader);
                }
            }
            throw error;
        }
        throw errors_js_1.QdrantClientUnexpectedResponseError.forResponse(response);
    });
    const client = openapi_typescript_fetch_1.Fetcher.for();
    // Configure client with 'undici' agent which is used in Node 18+
    client.configure({
        baseUrl,
        init: {
            headers,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            dispatcher: typeof process !== 'undefined' &&
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                process.versions?.node
                ? (0, dispatcher_js_1.createDispatcher)(connections)
                : undefined,
        },
        use,
    });
    return client;
}
exports.createClient = createClient;
