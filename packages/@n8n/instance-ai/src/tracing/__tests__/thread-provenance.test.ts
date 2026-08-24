import { describe, expect, it } from 'vitest';

import { threadProvenanceMetadata } from '../thread-provenance';

describe('threadProvenanceMetadata', () => {
	it('surfaces the entry point a thread was opened from', () => {
		expect(threadProvenanceMetadata({ source: 'evals', origin: 'internal' })).toEqual({
			thread_source: 'evals',
		});
	});

	it('flattens sourceContext so each entry is filterable on its own', () => {
		// `eq(metadata_key, …)` matches a key, not a path into a JSON value, so
		// flat entries are the whole point: they are what lets every build of one
		// eval case be selected.
		expect(
			threadProvenanceMetadata({
				source: 'evals',
				sourceContext: { evalCase: 'gmail-inbox-triage', evalIteration: 2, prebuilt: false },
			}),
		).toEqual({
			thread_source: 'evals',
			'source_context.evalCase': 'gmail-inbox-triage',
			'source_context.evalIteration': 2,
			'source_context.prebuilt': false,
		});
	});

	it('cannot overwrite the trace fields n8n sets itself', () => {
		// buildBaseMetadata spreads caller metadata LAST, so an unprefixed
		// `user_id` in a caller's bag would replace the real one. The prefix is
		// what makes an arbitrary caller bag safe to merge at all.
		const out = threadProvenanceMetadata({
			source: 'evals',
			sourceContext: { user_id: 'spoofed', thread_id: 'spoofed' },
		});

		expect(out.user_id).toBeUndefined();
		expect(out.thread_id).toBeUndefined();
		expect(out['source_context.user_id']).toBe('spoofed');
	});

	it('returns nothing for a thread with no recorded provenance', () => {
		expect(threadProvenanceMetadata(undefined)).toEqual({});
		expect(threadProvenanceMetadata({})).toEqual({});
		expect(threadProvenanceMetadata('not-an-object')).toEqual({});
	});
});
