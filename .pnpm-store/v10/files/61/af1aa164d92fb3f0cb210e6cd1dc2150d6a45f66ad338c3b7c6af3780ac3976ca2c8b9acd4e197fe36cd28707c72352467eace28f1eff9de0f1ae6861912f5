import { ApiError, Fetcher } from '@qdrant/openapi-typescript-fetch';
import { createDispatcher } from './dispatcher.js';
import { QdrantClientResourceExhaustedError, QdrantClientTimeoutError, QdrantClientUnexpectedResponseError, } from './errors.js';
import { createClientApi } from './openapi/generated_api_client.js';
export function createApis(baseUrl, args) {
    const client = createClient(baseUrl, args);
    return createClientApi(client);
}
export function createClient(baseUrl, { headers, timeout, connections }) {
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
                    throw new QdrantClientTimeoutError(e.message);
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
            if (error instanceof ApiError && error.status === 429) {
                const retryAfterHeader = error.headers.get('retry-after')?.[0];
                if (retryAfterHeader) {
                    throw new QdrantClientResourceExhaustedError(error.message, retryAfterHeader);
                }
            }
            throw error;
        }
        throw QdrantClientUnexpectedResponseError.forResponse(response);
    });
    const client = Fetcher.for();
    // Configure client with 'undici' agent which is used in Node 18+
    client.configure({
        baseUrl,
        init: {
            headers,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            dispatcher: typeof process !== 'undefined' &&
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                process.versions?.node
                ? createDispatcher(connections)
                : undefined,
        },
        use,
    });
    return client;
}
