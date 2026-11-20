import type { AgentJsonLiveSourceConfig, AgentJsonLiveSourceItem } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import {
	addResolvedLiveSourceItem,
	effectiveLiveSourceRetrieval,
	nextLiveSourceId,
	removeLiveSource,
	removeLiveSourceItem,
	setLiveSourceRetrieval,
} from '../live-sources';

const page: AgentJsonLiveSourceItem = {
	id: 'page-1',
	kind: 'item',
	containerType: 'page',
	title: 'Refund policy',
	url: 'https://notion.so/page-1',
};
const database: AgentJsonLiveSourceItem = {
	id: 'db-1',
	kind: 'container',
	containerType: 'database',
	title: 'Support KB',
	url: 'https://notion.so/db-1',
};
const notion: AgentJsonLiveSourceConfig = {
	id: 'notion',
	provider: 'notion',
	name: 'Team workspace',
	credential: 'cred-notion',
	items: [page],
};

describe('live-sources helpers', () => {
	describe('nextLiveSourceId', () => {
		it('uses the provider id first, then numbers the next sources', () => {
			expect(nextLiveSourceId('notion', [])).toBe('notion');
			expect(nextLiveSourceId('notion', [notion])).toBe('notion-2');
			expect(nextLiveSourceId('notion', [notion, { ...notion, id: 'notion-2' }])).toBe('notion-3');
		});
	});

	describe('addResolvedLiveSourceItem', () => {
		it('creates a source named after the credential for a new provider and credential', () => {
			const next = addResolvedLiveSourceItem([], {
				provider: 'notion',
				credential: 'cred-notion',
				credentialName: 'Team workspace',
				item: page,
			});

			expect(next).toEqual([notion]);
		});

		it('falls back to the provider id as the name', () => {
			const [source] = addResolvedLiveSourceItem([], {
				provider: 'slack',
				credential: 'cred-slack',
				item: page,
			})!;

			expect(source.name).toBe('slack');
		});

		it('appends to the source of the same provider and credential', () => {
			const next = addResolvedLiveSourceItem([notion], {
				provider: 'notion',
				credential: 'cred-notion',
				item: database,
			});

			expect(next).toEqual([{ ...notion, items: [page, database] }]);
		});

		it('creates a second source for another credential of the same provider', () => {
			const next = addResolvedLiveSourceItem([notion], {
				provider: 'notion',
				credential: 'cred-other',
				credentialName: 'Other workspace',
				item: database,
			});

			expect(next?.map((source) => source.id)).toEqual(['notion', 'notion-2']);
			expect(next?.[1]).toMatchObject({ credential: 'cred-other', items: [database] });
		});

		it('returns null when the source already holds the item', () => {
			expect(
				addResolvedLiveSourceItem([notion], {
					provider: 'notion',
					credential: 'cred-notion',
					item: page,
				}),
			).toBeNull();
		});
	});

	describe('removeLiveSourceItem', () => {
		it('removes the item and keeps the source while it has items', () => {
			const source = { ...notion, items: [page, database] };

			expect(removeLiveSourceItem([source], 'notion', 'db-1')).toEqual([notion]);
		});

		it('drops a source that loses its last item', () => {
			expect(removeLiveSourceItem([notion], 'notion', 'page-1')).toEqual([]);
		});
	});

	it('removeLiveSource removes the whole source', () => {
		expect(removeLiveSource([notion, { ...notion, id: 'notion-2' }], 'notion')).toEqual([
			{ ...notion, id: 'notion-2' },
		]);
	});

	describe('effectiveLiveSourceRetrieval', () => {
		it('is the configured strategy, else the provider default, else native', () => {
			expect(effectiveLiveSourceRetrieval({ provider: 'notion', retrieval: 'index' })).toBe(
				'index',
			);
			expect(effectiveLiveSourceRetrieval({ provider: 'notion' })).toBe('native');
			expect(effectiveLiveSourceRetrieval({ provider: 'unknown' })).toBe('native');
		});
	});

	describe('setLiveSourceRetrieval', () => {
		it('writes a strategy that differs from the provider default', () => {
			const withIndex = setLiveSourceRetrieval([notion], 'notion', 'index');

			expect(withIndex[0].retrieval).toBe('index');
		});

		it('leaves the key out for the provider default, so the backend decides', () => {
			const withIndex = setLiveSourceRetrieval([notion], 'notion', 'index');

			const reset = setLiveSourceRetrieval(withIndex, 'notion', 'native');

			expect('retrieval' in reset[0]).toBe(false);
		});

		it('writes the strategy as it is for a provider it does not know', () => {
			const other = { ...notion, id: 'other', provider: 'confluence' };

			const next = setLiveSourceRetrieval([other], 'other', 'native');

			expect(next[0].retrieval).toBe('native');
		});
	});
});
