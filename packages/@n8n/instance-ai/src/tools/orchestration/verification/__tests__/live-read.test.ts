import { toEngineConnections } from '@n8n/workflow-sdk';
import { loop, manual, set, workflow } from '@n8n/workflow-sdk/next';

import { liveReadRunOptions } from '../live-read';

const field = (name: string) => set({ name, fields: { n: 1 } });

describe('liveReadRunOptions', () => {
	it('ends a loop that holds a live read at its pass limit, where `until` ends it', async () => {
		const json = workflow(
			'Walk',
			manual({ sample: [{ n: 1 }] }),
			loop(
				{ name: 'Walk', maxIterations: 5, until: (out) => out.n > 1, next: (out) => out },
				field('Fetch'),
			),
			field('After'),
		).toJSON();

		const options = await liveReadRunOptions(json, ['Fetch']);

		expect(options).toEqual({
			readOnceNodeNames: ['Fetch'],
			redirectOutputs: [{ nodeName: 'Walk until', output: 1, asOutput: 0 }],
		});
		const check = toEngineConnections(json.connections)['Walk until'].main;
		expect(check[0]?.map(({ node }) => node)).toEqual(['After']);
		expect(check[1]?.map(({ node }) => node)).toEqual(['Walk limit']);
	});

	it('keeps a loop without a live read, and a loop that already ends at its limit', async () => {
		const json = workflow(
			'Walk',
			manual({ sample: [{ n: 1 }] }),
			field('Fetch'),
			loop(
				{ name: 'Walk', maxIterations: 5, until: (out) => out.n > 1, next: (out) => out },
				field('Step'),
			),
			loop(
				{
					name: 'Count',
					maxIterations: 5,
					onLimit: 'continue',
					until: (out) => out.n > 1,
					next: (out) => out,
				},
				field('Read'),
			),
		).toJSON();

		expect(await liveReadRunOptions(json, ['Fetch', 'Read'])).toEqual({
			readOnceNodeNames: ['Fetch', 'Read'],
		});
	});

	it('gives no options without live reads, and only the reads without a workflow', async () => {
		expect(await liveReadRunOptions(undefined, [])).toEqual({});
		expect(await liveReadRunOptions(undefined, ['Fetch'])).toEqual({
			readOnceNodeNames: ['Fetch'],
		});
	});
});
