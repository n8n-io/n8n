/**
 * Option shapes of `this.helpers.httpRequest` and `helpers.httpRequest` not covered by
 * `code-native-http.test.ts`.
 *
 * The oracle is n8n's real task runner (`runner-oracle.ts`): it runs the code as a Code node
 * in v1 and makes the real request to a server on 127.0.0.1, which records the request and
 * answers by its path. Native code runs in the bytecode VM with those answers as the results
 * of its `http` effect. The results must be equal, and the requests must match (method, path,
 * query, headers that the code sets, body bytes).
 */
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import { checkTranslation } from '../check.ts';
import { translateCode } from '../translate.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

interface Seen {
	method: string;
	url: string;
	headers: Record<string, string>;
	body: string;
	answer: { status: number; type: string | null; text: string };
}

function answerOf(path: string): { status: number; type: string | null; text: string } {
	const [, kind] = path.split('?')[0].split('/');
	if (kind === 'text') return { status: 200, type: 'text/plain', text: 'hello' };
	if (kind === 'echo') return { status: 200, type: 'application/json', text: '{"echo":true}' };
	return { status: 200, type: 'application/json; charset=utf-8', text: '{"ok":true,"n":[1,2]}' };
}

let server: Server;
let base = '';
const seen: Seen[] = [];

beforeAll(async () => {
	server = createServer((request, response) => {
		let body = '';
		request.setEncoding('utf8');
		request.on('data', (chunk: string) => {
			body += chunk;
		});
		request.on('end', () => {
			const answer = answerOf(request.url ?? '/');
			const headers: Record<string, string> = {};
			for (const [name, value] of Object.entries(request.headers)) {
				headers[name] = Array.isArray(value) ? value.join(', ') : (value ?? '');
			}
			seen.push({ method: request.method ?? '', url: request.url ?? '', headers, body, answer });
			response.writeHead(
				answer.status,
				answer.type === null ? {} : { 'content-type': answer.type },
			);
			response.end(answer.text);
		});
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

/** The result of the `http` effect for an answer, as the runtime gives it (spec 7.1). */
function effectResult(answer: Seen['answer']): unknown {
	const headers: Record<string, string> =
		answer.type === null ? {} : { 'content-type': answer.type };
	let body: unknown = answer.text;
	if (answer.type !== null && /json/i.test(answer.type) && answer.text.trim() !== '') {
		try {
			body = JSON.parse(answer.text);
		} catch {}
	}
	return { status: answer.status, headers, body };
}

/**
 * Runs the code in the real task runner, then natively with the answers that the server gave.
 * Compares the results and the requests.
 */
async function same(code: string): Promise<void> {
	const items = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }];
	const withBase = items.map((i) => ({ ...i, base }));
	seen.length = 0;
	const runner = await runnerCode(code, 'all', withBase);
	const requests = [...seen];
	const native = nativeCode(code, 'all', withBase, {
		effects: { code: requests.map((r) => effectResult(r.answer)) },
	});
	expect(native).toEqual(runner);
	expect(requests.length).toBeGreaterThan(0);
}

describe.skipIf(!taskRunnerAvailable())('httpRequest option shapes against the task runner', () => {
	beforeAll(async () => await startRunner(), 120_000);

	it('sends a template literal URL', async () => {
		await same('const r = await this.helpers.httpRequest({ url: `${items[0].json.base}/json?x=${items[0].json.id}` }); return [{ json: r }];');
	}, 60_000);

	it('sends through a constant that holds the helper', async () => {
		const code =
			'const req = this.helpers.httpRequest;\nconst out = [];\nfor (const i of items) out.push({ json: await req({ url: `${i.json.base}/json` }) });\nreturn out;';
		await same(code);
	}, 60_000);

	it('sends helpers.httpRequest', async () => {
		await same('const r = await helpers.httpRequest({ url: `${items[0].json.base}/text` }); return [{ json: { r, kind: typeof r } }];');
	}, 60_000);

	it('sends a boolean body', async () => {
		const code =
			'const out = [];\nfor (const i of items) out.push({ json: await this.helpers.httpRequest({ method: "POST", url: i.json.base + "/echo", body: i.json.id === 1 }) });\nreturn out;';
		await same(code);
	}, 60_000);

	it('sends a number body', async () => {
		await same('const r = await this.helpers.httpRequest({ method: "POST", url: `${items[0].json.base}/echo`, body: 42 }); return [{ json: r }];');
	}, 60_000);

	it('sends template literal headers', async () => {
		const code =
			'const r = await this.helpers.httpRequest({ url: `${items[0].json.base}/json`, headers: { "X-Id": `${items[0].json.id}`, "X-Name": items[0].json.name } }); return [{ json: r }];';
		await same(code);
	}, 60_000);
});

describe('httpRequest option shapes that must stay in the host', () => {
	const refused = (code: string): boolean => {
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false, timezone: 'system' });
		if (!t.ok) return true;
		return !checkTranslation(t.translation, 'all').ok;
	};

	it.each([
		[
			'bytes',
			"await this.helpers.httpRequest({ url: 'http://localhost/x', encoding: 'arraybuffer' })",
		],
		[
			'a multipart body',
			"await this.helpers.httpRequest({ method: 'POST', url: 'http://localhost/x', headers: { 'content-type': 'multipart/form-data' }, body: { a: 1 } })",
		],
		['the legacy request helper', "await this.helpers.request({ url: 'http://localhost/x' })"],
		[
			'another option',
			"await this.helpers.httpRequest({ url: 'http://localhost/x', proxy: { host: 'h' } })",
		],
	])('refuses %s', (_, expression) => {
		expect(refused(`const r = ${expression}; return [{ json: { r } }];`)).toBe(true);
	});
});