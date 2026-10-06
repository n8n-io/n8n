import { loop, manual, paginate, set, workflow } from '@n8n/workflow-sdk/next';

import { liveReadRunOptions } from '../live-read';

const field = (name: string) => set({ name, fields: { n: 1 } });

describe('liveReadRunOptions', () => {
	it('ends a region that holds a live read at its pass limit', () => {
		const json = workflow(
			'Walk',
			manual({ sample: [{ n: 1 }] }),
			loop(
				{ name: 'Walk', maxIterations: 5, until: (out) => out.n > 1, next: (out) => out },
				field('Fetch'),
			),
			paginate({ name: 'Pages', maxPages: 3, next: () => null }, field('Page')),
			field('After'),
		).toJSON();

		expect(liveReadRunOptions(json, ['Fetch', 'Page'])).toEqual({
			readOnceNodeNames: ['Fetch', 'Page'],
			endAtLimitRegionNames: ['Walk', 'Pages'],
		});
	});

	it('keeps a loop without a live read, and a loop that already ends at its limit', () => {
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

		expect(liveReadRunOptions(json, ['Fetch', 'Read'])).toEqual({
			readOnceNodeNames: ['Fetch', 'Read'],
		});
	});

	it('gives no options without live reads, and only the reads without a workflow', () => {
		expect(liveReadRunOptions(undefined, [])).toEqual({});
		expect(liveReadRunOptions(undefined, ['Fetch'])).toEqual({
			readOnceNodeNames: ['Fetch'],
		});
	});
});
