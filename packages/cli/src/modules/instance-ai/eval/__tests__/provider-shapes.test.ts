import { applyProviderShapeNormalizers, findProviderShapeViolation } from '../provider-shapes';
import type { ProviderRequestInfo } from '../provider-shapes';

interface Spec {
	type: 'json' | 'text' | 'binary' | 'error';
	body?: unknown;
}

const info = (over: Partial<ProviderRequestInfo>): ProviderRequestInfo => ({
	method: 'POST',
	pathname: '/',
	hostname: undefined,
	...over,
});

const openAiImages = info({ hostname: 'api.openai.com', pathname: '/v1/images/generations' });
const gemini = info({
	hostname: 'generativelanguage.googleapis.com',
	pathname: '/v1beta/models/gemini-1.5-flash:generateContent',
});
const redditSubmit = info({ hostname: 'oauth.reddit.com', pathname: '/api/submit' });
const redditComment = info({ hostname: 'oauth.reddit.com', pathname: '/api/comment' });
const hubspotUpsert = info({
	hostname: 'api.hubapi.com',
	pathname: '/contacts/v1/contact/createOrUpdate/email/jane@example.com',
});
const googleDocs = info({
	hostname: 'docs.googleapis.com',
	pathname: '/v1/documents/abc123:batchUpdate',
});

// ---------------------------------------------------------------------------
// applyProviderShapeNormalizers
// ---------------------------------------------------------------------------

describe('applyProviderShapeNormalizers', () => {
	it('leaves non-json specs untouched', () => {
		const spec: Spec = { type: 'text', body: '<xml/>' };
		applyProviderShapeNormalizers(openAiImages, spec);
		expect(spec).toEqual({ type: 'text', body: '<xml/>' });
	});

	it('leaves unmatched endpoints untouched', () => {
		const spec: Spec = { type: 'json', body: { ok: true } };
		applyProviderShapeNormalizers(info({ hostname: 'api.slack.com', pathname: '/chat' }), spec);
		expect(spec.body).toEqual({ ok: true });
	});

	describe('OpenAI images', () => {
		it('wraps a bare image object into the data-array envelope with b64_json', () => {
			const spec: Spec = { type: 'json', body: { url: 'https://x/y.png' } };
			applyProviderShapeNormalizers(openAiImages, spec);
			const body = spec.body as { data: Array<Record<string, unknown>> };
			expect(Array.isArray(body.data)).toBe(true);
			expect(body.data).toHaveLength(1);
			expect(typeof body.data[0].b64_json).toBe('string');
			expect(body.data[0].url).toBe('https://x/y.png');
		});

		it('adds b64_json to a data entry that is missing it', () => {
			const spec: Spec = { type: 'json', body: { data: [{ url: 'https://x/y.png' }] } };
			applyProviderShapeNormalizers(openAiImages, spec);
			const body = spec.body as { data: Array<Record<string, unknown>> };
			expect(typeof body.data[0].b64_json).toBe('string');
		});

		it('synthesizes a data array when none is present', () => {
			const spec: Spec = { type: 'json', body: { created: 123 } };
			applyProviderShapeNormalizers(openAiImages, spec);
			const body = spec.body as { data: Array<Record<string, unknown>>; created: number };
			expect(body.data).toHaveLength(1);
			expect(typeof body.data[0].b64_json).toBe('string');
			expect(body.created).toBe(123);
		});

		it('preserves an already-correct b64_json envelope', () => {
			const spec: Spec = {
				type: 'json',
				body: { created: 1, data: [{ b64_json: 'AAAA', revised_prompt: 'p' }] },
			};
			applyProviderShapeNormalizers(openAiImages, spec);
			expect(spec.body).toMatchObject({
				data: [{ b64_json: 'AAAA', revised_prompt: 'p' }],
			});
		});
	});

	describe('Google Gemini', () => {
		it('wraps a bare text payload into the candidates envelope', () => {
			const spec: Spec = { type: 'json', body: { text: 'hello world' } };
			applyProviderShapeNormalizers(gemini, spec);
			const body = spec.body as {
				candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
			};
			expect(body.candidates[0].content.parts[0].text).toBe('hello world');
		});

		it('wraps a bare content string payload', () => {
			const spec: Spec = { type: 'json', body: { content: 'answer' } };
			applyProviderShapeNormalizers(gemini, spec);
			const body = spec.body as {
				candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
			};
			expect(body.candidates[0].content.parts[0].text).toBe('answer');
		});

		it('preserves an already-correct candidates envelope', () => {
			const spec: Spec = {
				type: 'json',
				body: {
					candidates: [{ content: { parts: [{ text: 'x' }], role: 'model' } }],
				},
			};
			const before = structuredClone(spec.body);
			applyProviderShapeNormalizers(gemini, spec);
			expect(spec.body).toEqual(before);
		});
	});

	describe('Reddit', () => {
		it('wraps an api/submit payload into { json: { data } }', () => {
			const spec: Spec = { type: 'json', body: { id: 't3_abc', url: 'https://reddit/x' } };
			applyProviderShapeNormalizers(redditSubmit, spec);
			const body = spec.body as { json: { data: Record<string, unknown> } };
			expect(body.json.data.id).toBe('t3_abc');
		});

		it('unwraps an already-enveloped api/submit payload without double-wrapping', () => {
			const spec: Spec = { type: 'json', body: { json: { errors: [], data: { id: 't3_abc' } } } };
			applyProviderShapeNormalizers(redditSubmit, spec);
			const body = spec.body as { json: { data: Record<string, unknown> } };
			expect(body.json.data.id).toBe('t3_abc');
			expect((body.json as { json?: unknown }).json).toBeUndefined();
		});

		it('wraps an api/comment payload into { json: { data: { things: [{ data }] } } }', () => {
			const spec: Spec = { type: 'json', body: { id: 't1_xyz', body: 'nice' } };
			applyProviderShapeNormalizers(redditComment, spec);
			const body = spec.body as {
				json: { data: { things: Array<{ data: Record<string, unknown> }> } };
			};
			expect(body.json.data.things[0].data.id).toBe('t1_xyz');
		});
	});

	describe('HubSpot contacts upsert', () => {
		it('injects a numeric vid and isNew when missing', () => {
			const spec: Spec = { type: 'json', body: { properties: {} } };
			applyProviderShapeNormalizers(hubspotUpsert, spec);
			const body = spec.body as { vid: number; isNew: boolean };
			expect(typeof body.vid).toBe('number');
			expect(typeof body.isNew).toBe('boolean');
		});

		it('coerces a string vid to a number and preserves isNew', () => {
			const spec: Spec = { type: 'json', body: { vid: '3234574', isNew: false } };
			applyProviderShapeNormalizers(hubspotUpsert, spec);
			const body = spec.body as { vid: number; isNew: boolean };
			expect(body.vid).toBe(3234574);
			expect(body.isNew).toBe(false);
		});
	});

	describe('Google Docs batchUpdate', () => {
		it('ensures a non-empty replies array', () => {
			const spec: Spec = { type: 'json', body: { documentId: 'abc123' } };
			applyProviderShapeNormalizers(googleDocs, spec);
			const body = spec.body as { replies: unknown[] };
			expect(Array.isArray(body.replies)).toBe(true);
			expect(body.replies.length).toBeGreaterThan(0);
		});

		it('preserves an existing non-empty replies array', () => {
			const spec: Spec = {
				type: 'json',
				body: { documentId: 'abc', replies: [{ insertText: {} }] },
			};
			applyProviderShapeNormalizers(googleDocs, spec);
			const body = spec.body as { replies: unknown[] };
			expect(body.replies).toEqual([{ insertText: {} }]);
		});
	});
});

// ---------------------------------------------------------------------------
// findProviderShapeViolation
// ---------------------------------------------------------------------------

describe('findProviderShapeViolation', () => {
	it('returns undefined for unmatched endpoints', () => {
		expect(
			findProviderShapeViolation(info({ hostname: 'api.slack.com', pathname: '/chat' }), {
				ok: true,
			}),
		).toBeUndefined();
	});

	it('flags an OpenAI images body with no data array', () => {
		expect(findProviderShapeViolation(openAiImages, { url: 'x' })).toContain('data');
	});

	it('flags an OpenAI images entry missing both b64_json and url', () => {
		expect(findProviderShapeViolation(openAiImages, { data: [{ revised_prompt: 'p' }] })).toContain(
			'b64_json',
		);
	});

	it('accepts a correct OpenAI images body', () => {
		expect(
			findProviderShapeViolation(openAiImages, { data: [{ b64_json: 'AAAA' }] }),
		).toBeUndefined();
	});

	it('flags a Gemini body missing candidates parts', () => {
		expect(findProviderShapeViolation(gemini, { text: 'hi' })).toContain('candidates');
	});

	it('accepts a correct Gemini body', () => {
		expect(
			findProviderShapeViolation(gemini, {
				candidates: [{ content: { parts: [{ text: 'x' }] } }],
			}),
		).toBeUndefined();
	});

	it('flags a Reddit submit body missing json.data', () => {
		expect(findProviderShapeViolation(redditSubmit, { id: 't3_abc' })).toContain('json');
	});

	it('flags a Reddit comment body missing things', () => {
		expect(findProviderShapeViolation(redditComment, { json: { data: { id: 't1' } } })).toContain(
			'things',
		);
	});

	it('flags a HubSpot upsert body missing vid', () => {
		expect(findProviderShapeViolation(hubspotUpsert, { id: 'abc' })).toContain('vid');
	});

	it('accepts a HubSpot upsert body with a vid', () => {
		expect(findProviderShapeViolation(hubspotUpsert, { vid: 123, isNew: true })).toBeUndefined();
	});

	it('flags a Google Docs batchUpdate body missing replies', () => {
		expect(findProviderShapeViolation(googleDocs, { documentId: 'abc' })).toContain('replies');
	});

	it('accepts a Google Docs batchUpdate body with replies', () => {
		expect(findProviderShapeViolation(googleDocs, { replies: [{}] })).toBeUndefined();
	});
});
