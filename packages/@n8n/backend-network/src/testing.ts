/**
 * Test-only entry point (`@n8n/backend-network/testing`).
 *
 * These helpers are not part of the runtime contract: they exist so existing
 * test suites in other packages can exercise the axios translation internals
 * directly. Keep them out of the main barrel so the public surface stays
 * limited to what production callers actually need.
 */
export { convertN8nRequestToAxios } from './http/axios/request';
export { generateContentLengthHeader, isFormDataInstance } from './http/axios/utils';
export { buildRfcStyleUserAgent, getDefaultN8nOutboundUserAgent } from './http/axios/user-agent';
export { startServer, type LocalServer } from './http/local-server';
