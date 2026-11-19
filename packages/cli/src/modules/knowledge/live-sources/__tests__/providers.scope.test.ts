import type { IDataObject } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { LiveEntry, LiveRunContext } from '../live-source-provider';
import type { NodeOperation, NodeOperationAdapter } from '../node-operation-adapter';
import { NotionLiveSourceProvider } from '../providers/notion.provider';
import { SlackLiveSourceProvider } from '../providers/slack.provider';

const ctx: LiveRunContext = {
	projectId: 'project-1',
	principal: { kind: 'project' },
	sourceId: 'source-1',
	credential: { id: 'cred-1', type: 'notionApi' },
	runId: 'run-1',
};

function makeAdapter(respond: (parameters: IDataObject) => IDataObject[]) {
	const adapter = mock<NodeOperationAdapter>();
	adapter.execute.mockImplementation(async (_ctx, operation: NodeOperation) =>
		respond(operation.parameters),
	);
	return adapter;
}

describe('NotionLiveSourceProvider.search', () => {
	const pickedPage: LiveEntry = { id: 'picked-page', kind: 'item', title: 'Refund policy' };
	const pickedContainer: LiveEntry = {
		id: 'picked-container',
		kind: 'container',
		containerType: 'page',
		title: 'Onboarding',
	};
	const pickedDataSource: LiveEntry = {
		id: 'picked-ds',
		kind: 'container',
		containerType: 'dataSource',
		title: 'Support KB',
	};

	it('keeps only the pages in the scope or directly below a picked container', async () => {
		const calls: IDataObject[] = [];
		const adapter = makeAdapter((parameters) => {
			calls.push(parameters);
			if (parameters.operation === 'search') {
				return [
					{ id: 'picked-page', url: 'https://n/1', parent: { type: 'workspace' }, properties: {} },
					{
						id: 'child',
						url: 'https://n/2',
						parent: { type: 'page_id', page_id: 'picked-container' },
						properties: { title: { type: 'title', title: [{ plain_text: 'Day one' }] } },
					},
					{ id: 'stranger', url: 'https://n/3', parent: { type: 'page_id', page_id: 'other' } },
					{ id: 'not-picked', url: 'https://n/4', parent: { type: 'workspace' } },
				];
			}
			if (parameters.operation === 'getAll') {
				return [{ id: 'row-1', url: 'https://n/5', parent: { type: 'data_source_id' } }];
			}
			return [];
		});
		const provider = new NotionLiveSourceProvider(adapter);

		const matches = await provider.search(
			ctx,
			[pickedPage, pickedContainer, pickedDataSource],
			'refund policy',
			10,
		);

		expect(matches.map((match) => match.entry.id)).toEqual(['picked-page', 'child', 'row-1']);
		expect(matches[1].entry).toMatchObject({ title: 'Day one', parentId: 'picked-container' });
		expect(matches[2].entry.parentId).toBe('picked-ds');
		const query = calls.find((call) => call.operation === 'getAll');
		expect(query?.filterType).toBe('json');
		const filterJson = typeof query?.filterJson === 'string' ? query.filterJson : '{}';
		expect(JSON.parse(filterJson)).toEqual({
			or: [
				{ property: 'title', title: { contains: 'refund' } },
				{ property: 'title', title: { contains: 'policy' } },
			],
		});
	});
});

describe('SlackLiveSourceProvider.search', () => {
	const pickedChannel: LiveEntry = {
		id: 'C-PICKED',
		kind: 'container',
		containerType: 'channel',
		title: '#seed-support',
	};

	it('searches each picked channel by name and keeps only its hits', async () => {
		const calls: IDataObject[] = [];
		const adapter = makeAdapter((parameters) => {
			calls.push(parameters);
			if (parameters.operation === 'get') return [{ id: 'C-PICKED', name: 'seed-support' }];
			if (parameters.operation === 'search') {
				return [
					{
						channel_id: 'C-PICKED',
						message_ts: '1700000000.000100',
						content: 'Refunds take 5 business days.',
						permalink: 'https://acme.slack.com/archives/C-PICKED/p1700000000000100',
					},
					{
						channel_id: 'C-OTHER',
						message_ts: '1700000000.000200',
						content: 'Refund in the other channel',
						permalink: 'https://acme.slack.com/archives/C-OTHER/p1700000000000200',
					},
				];
			}
			return [];
		});
		const provider = new SlackLiveSourceProvider(adapter);

		const matches = await provider.search(ctx, [pickedChannel], 'refunds', 10);

		expect(matches).toHaveLength(1);
		expect(matches[0].entry).toMatchObject({
			id: '1700000000.000100',
			containerType: 'thread',
			parentId: 'C-PICKED',
			url: 'https://acme.slack.com/archives/C-PICKED/p1700000000000100',
		});
		expect(matches[0].snippet).toBe('Refunds take 5 business days.');
		const search = calls.find((call) => call.operation === 'search');
		expect(search?.options).toEqual({ searchChannel: ['seed-support'] });
	});

	it('reads a reply as its whole thread and builds the permalink from the first one', async () => {
		const calls: IDataObject[] = [];
		const adapter = makeAdapter((parameters) => {
			calls.push(parameters);
			if (parameters.operation === 'replies' && parameters.ts === '1700000000.000300') {
				return [
					{ ts: '1700000000.000300', thread_ts: '1700000000.000100', text: 'A reply', user: 'U2' },
				];
			}
			if (parameters.operation === 'replies') {
				return [
					{
						ts: '1700000000.000100',
						thread_ts: '1700000000.000100',
						text: 'Who owns refunds?',
						user: 'U1',
						latest_reply: '1700000000.000300',
					},
					{ ts: '1700000000.000300', thread_ts: '1700000000.000100', text: 'A reply', user: 'U2' },
				];
			}
			if (parameters.operation === 'getPermalink') {
				return [
					{ ok: true, permalink: 'https://acme.slack.com/archives/C-PICKED/p1700000000000100' },
				];
			}
			return [];
		});
		const provider = new SlackLiveSourceProvider(adapter);

		const document = await provider.read(ctx, {
			id: '1700000000.000300',
			kind: 'item',
			containerType: 'thread',
			title: 'A reply',
			parentId: 'C-PICKED',
		});

		expect(document.title).toBe('Who owns refunds?');
		expect(document.text).toContain('U1: Who owns refunds?');
		expect(document.text).toContain('U2: A reply');
		expect(document.url).toBe('https://acme.slack.com/archives/C-PICKED/p1700000000000100');
		expect(calls.filter((call) => call.operation === 'replies')).toHaveLength(2);
	});
});
