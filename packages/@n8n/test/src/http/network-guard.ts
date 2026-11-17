import { subscribe, unsubscribe } from 'node:diagnostics_channel';
import nock from 'nock';

import { WorkflowTestError } from '../errors';
import type { ExecutionSetup } from '../execution-context';
import { recordClientRequest, recordRequest } from './http-request';
import { redact, secretsToRedact } from './redact';
import { isUndiciMessage, toHttpRequest } from './undici-request';

const HTTP_REQUEST_CREATED = 'http.client.request.created';
const UNDICI_REQUEST_CREATED = 'undici:request:create';

interface Guard {
	root: ExecutionSetup;
	allowHttp: boolean | string[];
}

export async function guardNetwork<T>(root: ExecutionSetup, run: () => Promise<T>): Promise<T> {
	const guard: Guard = { root, allowHttp: root.options.allowHttp ?? false };
	const onNoMatch = (...args: unknown[]) => checkUnmatchedRequest(guard, args);
	const onHttpRequest = (message: unknown) => recordClientRequest(guard.root, message);
	const onUndiciRequest = (message: unknown) => checkUndiciRequest(guard, message);

	blockHosts(guard.allowHttp);
	nock.emitter.on('no match', onNoMatch);
	subscribe(HTTP_REQUEST_CREATED, onHttpRequest);
	subscribe(UNDICI_REQUEST_CREATED, onUndiciRequest);
	try {
		return await run();
	} finally {
		unsubscribe(UNDICI_REQUEST_CREATED, onUndiciRequest);
		unsubscribe(HTTP_REQUEST_CREATED, onHttpRequest);
		nock.emitter.off('no match', onNoMatch);
		// nock has no getter for the earlier state, so this restores the nock default.
		nock.enableNetConnect();
	}
}

function blockHosts(allowHttp: boolean | string[]) {
	if (allowHttp === true) return nock.enableNetConnect();
	if (allowHttp === false) return nock.disableNetConnect();
	nock.enableNetConnect((host) => permits(allowHttp, new URL(`http://${host}`).hostname));
}

function permits(allowHttp: boolean | string[], hostname: string) {
	return allowHttp === true || (Array.isArray(allowHttp) && allowHttp.includes(hostname));
}

function checkUnmatchedRequest(guard: Guard, args: unknown[]) {
	const options = args.length > 1 ? args[1] : args[0];
	if (!isRequestOptions(options)) return;
	if (permits(guard.allowHttp, new URL(options.href).hostname)) return;
	failUnmocked(
		guard,
		`${options.method} ${options.href}`,
		'matches no nock mock. Add a nock mock or permit the host with allowHttp',
	);
}

function checkUndiciRequest(guard: Guard, message: unknown) {
	if (!isUndiciMessage(message)) return;
	const { request } = message;
	const url = new URL(request.path, request.origin);
	const record = guard.root.runs.open.at(-1)?.record;
	if (record) recordRequest(guard.root, record, toHttpRequest(request, url));
	if (permits(guard.allowHttp, url.hostname)) return;
	// undici 6 and 7 abort a request with this internal field before they send it.
	request.error = failUnmocked(
		guard,
		`${request.method} ${url.href}`,
		'uses an HTTP client that nock does not intercept. Mock the node with mockNode() or permit the host with allowHttp',
	);
}

function failUnmocked({ root }: Guard, request: string, reason: string) {
	const node = root.runs.open.at(-1)?.node;
	const error = new WorkflowTestError(
		'HTTP_NOT_MOCKED',
		`Node "${node}" sent ${redact(request, secretsToRedact(root))}, which ${reason}.`,
		{
			workflow: root.handle.name,
			node,
		},
	);
	root.fatalError ??= error;
	return error;
}

function isRequestOptions(value: unknown): value is { href: string; method: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'href' in value &&
		typeof value.href === 'string' &&
		'method' in value &&
		typeof value.method === 'string'
	);
}
