import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { AuditResult } from '../audit.ts';
import {
	applyInject,
	auditAll,
	compareRequests,
	emptyRequest,
	KNOWN_DIFFERENCES,
} from '../audit.ts';
import { DEFAULT_NODE_PACKAGES } from '../types.ts';

describe('applyInject', () => {
	it('sets a default header only when the request has no header of that name', () => {
		const inject = {
			headers: { Authorization: 'Bearer {{$credentials.key}}' },
			defaultHeaders: { 'Notion-Version': '2022-02-22' },
		};
		const data = { key: 'k' };
		expect(applyInject(inject, data).headers).toEqual({
			Authorization: 'Bearer k',
			'Notion-Version': '2022-02-22',
		});
		const withVersion = emptyRequest();
		withVersion.headers['notion-VERSION'] = '2021-05-13';
		expect(applyInject(inject, data, withVersion).headers).toEqual({
			'notion-VERSION': '2021-05-13',
			Authorization: 'Bearer k',
		});
		// A header of the rule counts as set, as in v1, which checks after it sets it.
		expect(
			applyInject(
				{ headers: { 'Notion-Version': 'x' }, defaultHeaders: { 'notion-version': 'y' } },
				{},
			).headers,
		).toEqual({ 'Notion-Version': 'x' });
	});

	it('sets query parameters, basic auth and body fields', () => {
		const request = applyInject(
			{
				qs: { api_key: '{{$credentials.key}}' },
				basicAuth: { user: '{{$credentials.user}}', password: '{{$credentials.password}}' },
				body: { auth_token: '{{$credentials.token}}', n: '1' },
			},
			{ key: 'a b', user: 'u', password: 'p', token: 't' },
		);
		expect(request.qs).toEqual({ api_key: 'a b' });
		expect(request.headers).toEqual({
			Authorization: `Basic ${Buffer.from('u:p').toString('base64')}`,
		});
		// The runtime writes an inject body value as a JSON string.
		expect(request.body).toEqual({ auth_token: '"t"', n: '"1"' });
	});
});

describe('compareRequests', () => {
	it('compares header names without case and reports values', () => {
		const ours = emptyRequest();
		ours.headers.Authorization = 'Bearer a';
		const v1 = emptyRequest();
		v1.headers.authorization = 'Bearer a';
		v1.headers['X-Extra'] = '1';
		expect(compareRequests(ours, v1)).toEqual([
			'header "X-Extra": v1 sets "1", the inject sets none',
		]);
		// Without values, the report names the header only.
		expect(compareRequests(ours, v1, false)).toEqual([
			'header "X-Extra": v1 sets it, the inject does not',
		]);
	});
});

const built = existsSync(join(DEFAULT_NODE_PACKAGES[0], 'dist/known/credentials.json'));

/** The types that stay different, with the reason: see `KNOWN_DIFFERENCES`. */
const KNOWN = new Set(Object.keys(KNOWN_DIFFERENCES));

describe.runIf(built)('the derived inject against the real n8n authenticate', () => {
	let audit: AuditResult;
	beforeAll(async () => {
		audit = await auditAll();
	}, 300_000);

	it('has no difference for any type that the runtime applies', () => {
		expect(audit.failures).toEqual([]);
		const differ = audit.appliedDiffs.filter((entry) => !KNOWN.has(entry.type));
		const report = differ.map((entry) => `${entry.type}: ${entry.differences.join('; ')}`);
		expect(report).toEqual([]);
		expect(audit.appliedDiffs.map((entry) => entry.type).sort()).toEqual([...KNOWN].sort());
	});

	it('compares the types with a manual rule', () => {
		const byName = new Map(audit.entries.map((entry) => [entry.type, entry]));
		// The HTTP Request node applies these three types in its own code, so v1
		// has no `authenticate` to compare with.
		for (const type of ['httpBasicAuth', 'httpQueryAuth', 'httpCustomAuth']) {
			expect(byName.get(type)?.skipped).toContain('no authenticate');
		}
		for (const type of ['notionApi', 'anthropicApi', 'twilioApi']) {
			const entry = byName.get(type);
			expect(entry?.kind).toBe('manual');
			expect(entry?.skipped).toBeUndefined();
			expect(entry?.differences).toEqual([]);
		}
		// The known difference: v1 sets the header, the rule leaves it out.
		expect(byName.get('openAiApi')?.differences).toEqual([
			'header "OpenAI-Organization": v1 sets "", the inject sets none',
		]);
	}, 300_000);
});
