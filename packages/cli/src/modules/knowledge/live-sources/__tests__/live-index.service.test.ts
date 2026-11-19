import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { LiveIndexService } from '../live-index.service';
import type {
	KnowledgeLiveSourceProvider,
	LiveEntry,
	LiveRunContext,
	LiveSourceConfig,
} from '../live-source-provider';
import { IndexRetrievalStrategy, liveIndexKey } from '../strategies/index.strategy';
import { NativeRetrievalStrategy } from '../strategies/native.strategy';
import { tokenizeQuery } from '../strategies/text-search';

const ctx: LiveRunContext = {
	projectId: 'project-1',
	principal: { kind: 'project' },
	sourceId: 'kb',
	credential: { id: 'cred-1', type: 'notionApi' },
	runId: 'index-build',
};

const DATA_SOURCE: LiveEntry = {
	id: 'ds-1',
	kind: 'container',
	containerType: 'dataSource',
	title: 'Support KB',
};

type Row = LiveEntry & { text: string };

const ROWS: Row[] = [
	{ id: 'row-1', kind: 'item', title: 'Export limits', text: 'CSV exports stop at 50000 rows.' },
	{
		id: 'row-2',
		kind: 'item',
		title: 'Note',
		text: 'Webhook deliveries are retried 5 times with backoff before they are dropped.',
	},
	{
		id: 'row-3',
		kind: 'item',
		title: 'Password reset',
		text: 'The reset link expires after 24 hours.',
	},
	{
		id: 'row-4',
		kind: 'item',
		title: 'Webhook setup',
		text: 'How to configure a webhook URL in the settings.',
	},
];

const SOURCE: LiveSourceConfig = {
	id: 'kb',
	provider: 'fake',
	name: 'KB',
	credential: 'cred-1',
	retrieval: 'index',
	items: [DATA_SOURCE],
};

function makeProvider() {
	const provider = mock<KnowledgeLiveSourceProvider>({
		id: 'fake',
		credentialTypes: ['notionApi'],
		capabilities: { nestedContainers: true, nativeContainerSearch: true, persistableContent: true },
		defaultRetrieval: 'index',
	});
	provider.list.mockResolvedValue({
		entries: ROWS.map(({ text: _text, ...entry }) => ({ ...entry, parentId: DATA_SOURCE.id })),
	});
	provider.read.mockImplementation(async (_ctx, entry) => {
		const row = ROWS.find((candidate) => candidate.id === entry.id);
		if (!row) throw new Error(`unknown row ${entry.id}`);
		return { id: row.id, title: row.title, text: row.text };
	});
	return provider;
}

function makeIndexService() {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	return new LiveIndexService(logger);
}

describe('LiveIndexService', () => {
	it('builds one card per entry below the picked containers and ranks a poorly titled row by its text', async () => {
		const indexService = makeIndexService();
		const provider = makeProvider();
		const key = liveIndexKey('agent-1', SOURCE.id);

		const status = await indexService.rebuild({ key, ctx, source: SOURCE, provider });

		expect(status).toMatchObject({ indexed: 4, total: 4, building: false });
		expect(provider.read).toHaveBeenCalledTimes(4);

		const matches = indexService.search(
			key,
			tokenizeQuery('how many times are webhooks retried'),
			3,
		);
		expect(matches[0].entry.id).toBe('row-2');
		expect(matches[0].lineRange).toEqual({ start: 1, end: 1 });
		expect(matches.map((match) => match.entry.id)).not.toContain('row-3');
	});

	it('keeps the old cards while a rebuild runs and reports a build that stopped failing reads', async () => {
		const indexService = makeIndexService();
		const provider = makeProvider();
		const key = liveIndexKey('agent-1', SOURCE.id);
		await indexService.rebuild({ key, ctx, source: SOURCE, provider });
		provider.read.mockRejectedValue(new Error('token expired'));

		const status = await indexService.rebuild({ key, ctx, source: SOURCE, provider });

		expect(status).toMatchObject({ building: false, indexed: 4, total: 4 });
		expect(status.error).toContain('could be read');
		expect(indexService.isReady(key)).toBe(true);
		expect(indexService.search(key, ['webhook'], 5).map((match) => match.entry.id)).toEqual([
			'row-4',
			'row-2',
		]);
	});
});

describe('IndexRetrievalStrategy', () => {
	it('falls back to native and starts the build on the first search, then answers from the index', async () => {
		const indexService = makeIndexService();
		const provider = makeProvider();
		provider.search.mockResolvedValue([]);
		const strategy = new IndexRetrievalStrategy(indexService, new NativeRetrievalStrategy());
		const context = {
			ctx,
			agentId: 'agent-1',
			source: SOURCE,
			provider,
			scope: [DATA_SOURCE],
			pickedItems: [],
			readDocument: async (entry: LiveEntry) => await provider.read(ctx, entry),
		};

		const first = await strategy.search(context, 'webhook retried', 5);
		expect(first).toEqual([]);
		expect(provider.search).toHaveBeenCalledTimes(1);

		// The build that the first search started finishes.
		await indexService.rebuild({
			key: liveIndexKey('agent-1', SOURCE.id),
			ctx,
			source: SOURCE,
			provider,
		});
		const second = await strategy.search(context, 'webhook retried', 5);
		expect(second[0].entry.id).toBe('row-2');
		expect(second[0].score).toBe(4);
		expect(provider.search).toHaveBeenCalledTimes(1);
	});

	it('narrows the index to the requested scope', async () => {
		const indexService = makeIndexService();
		const provider = makeProvider();
		const strategy = new IndexRetrievalStrategy(indexService, new NativeRetrievalStrategy());
		await indexService.rebuild({
			key: liveIndexKey('agent-1', SOURCE.id),
			ctx,
			source: SOURCE,
			provider,
		});
		const row4: LiveEntry = { id: 'row-4', kind: 'item', title: 'Webhook setup', parentId: 'ds-1' };

		const matches = await strategy.search(
			{
				ctx,
				agentId: 'agent-1',
				source: SOURCE,
				provider,
				scope: [row4],
				pickedItems: [],
				readDocument: async (entry: LiveEntry) => await provider.read(ctx, entry),
			},
			'webhook',
			5,
		);

		expect(matches.map((match) => match.entry.id)).toEqual(['row-4']);
	});
});
