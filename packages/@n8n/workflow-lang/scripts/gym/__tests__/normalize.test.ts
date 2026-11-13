import { bindWorkflow } from '../binding.ts';
import { Normalizer } from '../normalize.ts';
import { hostMatches } from '../services.ts';

const win = { start: Date.parse('2026-11-12T10:00:00Z'), end: Date.parse('2026-11-12T10:00:05Z') };
const winB = { start: Date.parse('2026-11-12T10:00:10Z'), end: Date.parse('2026-11-12T10:00:15Z') };

describe('Normalizer', () => {
	it('accepts times inside the window of each run', () => {
		const n = new Normalizer(win, winB);
		expect(n.diff({ at: '2026-11-12T10:00:01.000Z' }, { at: '2026-11-12T10:00:11.000Z' })).toEqual(
			[],
		);
		expect(n.stats.time).toBe(1);
	});

	it('keeps times outside the window as differences', () => {
		const n = new Normalizer(win, winB);
		expect(n.diff({ at: '2020-01-01T00:00:00Z' }, { at: '2026-11-12T10:00:11Z' })).toHaveLength(1);
	});

	it('maps new ids one to one over the whole comparison', () => {
		const n = new Normalizer(win, winB);
		expect(n.diff({ id: 'C0AAAA1111' }, { id: 'C0BBBB2222' })).toEqual([]);
		expect(n.diff({ ref: 'C0AAAA1111' }, { ref: 'C0BBBB2222' })).toEqual([]);
		// The same (a) value cannot map to another (b) value.
		expect(n.diff({ ref: 'C0AAAA1111' }, { ref: 'C0CCCC3333' })).toHaveLength(1);
	});

	it('does not map values that the workflow or the world already holds', () => {
		const n = new Normalizer(win, winB, '{"channel":"C0AAAA1111"}');
		expect(n.diff('C0AAAA1111', 'C0BBBB2222')).toHaveLength(1);
	});

	it('does not map plain text or numbers that are not ids', () => {
		const n = new Normalizer(win, winB);
		expect(n.diff({ text: 'hello' }, { text: 'world' })).toHaveLength(1);
		expect(n.diff({ count: 3 }, { count: 4 })).toHaveLength(1);
		expect(n.diff({ name: 'item-1' }, { name: 'item-2' })).toHaveLength(1);
	});

	it('maps ids inside URLs', () => {
		const n = new Normalizer(win, winB);
		expect(
			n.diff(
				'https://x.test/m/1794470706.910001?u=9f8e7d6c5b4a3210',
				'https://x.test/m/1794470716.910002?u=0a1b2c3d4e5f6789',
			),
		).toEqual([]);
	});

	it('reports missing keys and array lengths', () => {
		const n = new Normalizer(win, winB);
		expect(n.diff({ a: 1 }, {})).toEqual([{ path: '$.a', a: 1, b: undefined }]);
		expect(n.diff([1, 2], [1])).toEqual([{ path: '$.length', a: 2, b: 1 }]);
	});
});

describe('hostMatches', () => {
	it('follows the gym rules for wildcards', () => {
		expect(hostMatches('*.atlassian.net', 'acme.atlassian.net')).toBe(true);
		expect(hostMatches('*.atlassian.net', 'a.b.atlassian.net')).toBe(false);
		expect(hostMatches('*-aiplatform.googleapis.com', 'us-aiplatform.googleapis.com')).toBe(true);
		expect(hostMatches('slack.com', 'SLACK.com.')).toBe(true);
	});
});

describe('bindWorkflow', () => {
	it('gives each distinct literal its own ref and keeps expressions', () => {
		const wf = {
			nodes: [
				{
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					parameters: {
						channelId: { __rl: true, value: 'C123', mode: 'url' },
						otherChannel: 'x',
						options: { channelIds: ['C123', 'C456'] },
						user: '={{ $json.user }}',
					},
				},
			],
			connections: {},
		};
		const tenant = {
			refs: { 'channel:a': 'C0AAA', 'channel:b': 'C0BBB', 'channel:leadership': 'G0LLL' },
		};
		const out = bindWorkflow(wf, tenant);
		const params = (out.workflow.nodes as Array<{ parameters: Record<string, unknown> }>)[0]
			.parameters;
		expect(params.channelId).toEqual({ __rl: true, value: 'C0AAA', mode: 'id' });
		expect(params.options).toEqual({ channelIds: ['C0AAA', 'C0BBB'] });
		expect(params.user).toBe('={{ $json.user }}');
		expect(out.unbound).toEqual([]);
	});
});

describe('Normalizer signatures', () => {
	it('ignores the signature of resume URLs', () => {
		const n = new Normalizer(win, winB);
		expect(
			n.diff(
				'http://localhost/webhook-waiting/100001?signature=74ab09',
				'http://localhost/webhook-waiting/100001?signature=1d7305a9dcac9432',
			),
		).toEqual([]);
		expect(
			n.diff(
				'http://localhost/webhook-waiting/100001?signature=74ab',
				'http://localhost/x/100001?signature=1d73',
			),
		).toHaveLength(1);
	});
});
