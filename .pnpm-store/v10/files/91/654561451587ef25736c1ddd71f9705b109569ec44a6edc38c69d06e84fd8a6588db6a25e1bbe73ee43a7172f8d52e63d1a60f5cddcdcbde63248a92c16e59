/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { Agent } from 'undici';
export const createDispatcher = (connections = 25) => 
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
new Agent({
    // timeouts are handled by AbortSignal in our middleware
    bodyTimeout: 0,
    headersTimeout: 0,
    // https://stackoverflow.com/a/36437932/558180
    // pipelining: 1,
    // a sensible max connections value
    connections,
    // will be overriden by header Keep-Alive, just as sensible default
    keepAliveTimeout: 10000,
});
