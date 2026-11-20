import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { LiveCredentialResolver } from '../live-credential-resolver';
import { LiveIndexService } from '../live-index.service';
import { LiveRetrievalService, type LiveKnowledgeScope } from '../live-retrieval.service';
import { formatLiveRef } from '../live-retrieval-schemas';
import { LiveSourceRefError, LiveSourceScopeError } from '../live-source.errors';
import type {
	KnowledgeLiveSourceProvider,
	LiveEntry,
	LiveSourceConfig,
} from '../live-source-provider';
import type { LiveSourceProviderRegistry } from '../live-source-provider-registry';
import { IndexRetrievalStrategy } from '../strategies/index.strategy';
import { NativeRetrievalStrategy } from '../strategies/native.strategy';

const PICKED_PAGE: LiveEntry = {
	id: 'picked-page',
	kind: 'item',
	containerType: 'page',
	title: 'Refund policy',
	url: 'https://example.com/picked-page',
};
const PICKED_CONTAINER: LiveEntry = {
	id: 'picked-container',
	kind: 'container',
	containerType: 'page',
	title: 'Onboarding guide',
	url: 'https://example.com/picked-container',
};
const CHILD_OF_CONTAINER: LiveEntry = {
	id: 'child-page',
	kind: 'item',
	containerType: 'page',
	title: 'Day one checklist',
	url: 'https://example.com/child-page',
	parentId: PICKED_CONTAINER.id,
};
const UNPICKED_ID = 'not-picked-page';

const SOURCE: LiveSourceConfig = {
	id: 'notes',
	provider: 'fake',
	name: 'Notes',
	credential: 'cred-1',
	items: [PICKED_PAGE, PICKED_CONTAINER],
};

const SCOPE: LiveKnowledgeScope = {
	projectId: 'project-1',
	agentId: 'agent-1',
	principal: { kind: 'project' },
};

function makeService() {
	const provider = mock<KnowledgeLiveSourceProvider>({
		id: 'fake',
		credentialTypes: ['fakeApi'],
		capabilities: {
			nestedContainers: true,
			nativeContainerSearch: false,
			persistableContent: true,
		},
		defaultRetrieval: 'native',
	});
	provider.list.mockResolvedValue({ entries: [CHILD_OF_CONTAINER] });
	provider.read.mockImplementation(async (_ctx, entry) => ({
		id: entry.id,
		title: entry.title,
		url: entry.url,
		text: `Text of ${entry.title}`,
	}));

	const registry = mock<LiveSourceProviderRegistry>();
	registry.get.mockReturnValue(provider);

	const credentialResolver = mock<LiveCredentialResolver>();
	credentialResolver.resolve.mockResolvedValue({ id: 'cred-1', type: 'fakeApi' });

	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const nativeStrategy = new NativeRetrievalStrategy();
	const indexService = new LiveIndexService(logger);
	const service = new LiveRetrievalService(
		logger,
		registry,
		credentialResolver,
		indexService,
		nativeStrategy,
		new IndexRetrievalStrategy(indexService, nativeStrategy),
	);
	return { service, provider, credentialResolver };
}

describe('LiveRetrievalService', () => {
	describe('the allow-set', () => {
		it('refuses to read an item that the agent did not pick, without a provider call', async () => {
			const { service, provider, credentialResolver } = makeService();

			await expect(
				service.read(
					SCOPE,
					[SOURCE],
					{ runId: 'run-1' },
					{ ref: formatLiveRef('notes', UNPICKED_ID) },
				),
			).rejects.toThrow(LiveSourceScopeError);

			expect(provider.read).not.toHaveBeenCalled();
			expect(credentialResolver.resolve).not.toHaveBeenCalled();
		});

		it('reads a picked item and cites its url', async () => {
			const { service, provider } = makeService();

			const result = await service.read(
				SCOPE,
				[SOURCE],
				{ runId: 'run-1' },
				{ ref: formatLiveRef('notes', PICKED_PAGE.id) },
			);

			expect(provider.read).toHaveBeenCalledTimes(1);
			expect(result.text).toBe('Text of Refund policy');
			expect(result.url).toBe(PICKED_PAGE.url);
			expect(result.citation).toBe(`Refund policy (${PICKED_PAGE.url})`);
		});

		it('extends the allow-set with the children that a picked container lists, in that run only', async () => {
			const { service } = makeService();
			const childRef = formatLiveRef('notes', CHILD_OF_CONTAINER.id);

			await expect(
				service.read(SCOPE, [SOURCE], { runId: 'run-1' }, { ref: childRef }),
			).rejects.toThrow(LiveSourceScopeError);

			const listed = await service.list(
				SCOPE,
				[SOURCE],
				{ runId: 'run-1' },
				{ scope: formatLiveRef('notes', PICKED_CONTAINER.id) },
			);
			expect(listed.kind).toBe('list');
			if (listed.kind !== 'list') return;
			expect(listed.entries.map((entry) => entry.ref)).toEqual([childRef]);

			const read = await service.read(SCOPE, [SOURCE], { runId: 'run-1' }, { ref: childRef });
			expect(read.title).toBe(CHILD_OF_CONTAINER.title);

			await expect(
				service.read(SCOPE, [SOURCE], { runId: 'run-2' }, { ref: childRef }),
			).rejects.toThrow(LiveSourceScopeError);
		});

		it('lets the run read the children that reading a picked container returned', async () => {
			const { service, provider } = makeService();
			provider.read.mockImplementation(async (_ctx, entry) => ({
				id: entry.id,
				title: entry.title,
				url: entry.url,
				text: `Text of ${entry.title}`,
				children: entry.id === PICKED_CONTAINER.id ? [CHILD_OF_CONTAINER] : [],
			}));
			const childRef = formatLiveRef('notes', CHILD_OF_CONTAINER.id);

			await service.read(
				SCOPE,
				[SOURCE],
				{ runId: 'run-1' },
				{ ref: formatLiveRef('notes', PICKED_CONTAINER.id) },
			);
			const read = await service.read(SCOPE, [SOURCE], { runId: 'run-1' }, { ref: childRef });

			expect(read.title).toBe(CHILD_OF_CONTAINER.title);
			expect(provider.list).not.toHaveBeenCalled();
		});

		it('accepts every form of an item id that the provider normalizes', async () => {
			const { service, provider } = makeService();
			provider.normalizeItemId = (id: string) => id.replace(/-/g, '').toLowerCase();
			const dashed: LiveEntry = { ...PICKED_PAGE, id: '41d813fa-c0d3-81b0-bba5-cddf72eb03dc' };
			const source: LiveSourceConfig = { ...SOURCE, items: [dashed] };

			const read = await service.read(
				SCOPE,
				[source],
				{ runId: 'run-1' },
				{ ref: formatLiveRef('notes', '41D813FAC0D381B0BBA5CDDF72EB03DC') },
			);

			expect(read.ref).toBe(formatLiveRef('notes', '41d813fac0d381b0bba5cddf72eb03dc'));
			expect(provider.read).toHaveBeenCalledWith(expect.anything(), dashed);
		});

		it('forgets the discovered children when the run ends', async () => {
			const { service } = makeService();
			const childRef = formatLiveRef('notes', CHILD_OF_CONTAINER.id);
			await service.list(
				SCOPE,
				[SOURCE],
				{ runId: 'run-1' },
				{ scope: formatLiveRef('notes', PICKED_CONTAINER.id) },
			);

			service.endRun('run-1');

			await expect(
				service.read(SCOPE, [SOURCE], { runId: 'run-1' }, { ref: childRef }),
			).rejects.toThrow(LiveSourceScopeError);
		});
	});

	describe('refs', () => {
		it('rejects a ref of another agent source or of a wrong shape', async () => {
			const { service } = makeService();

			await expect(
				service.read(SCOPE, [SOURCE], { runId: 'run-1' }, { ref: formatLiveRef('other', 'x') }),
			).rejects.toThrow(LiveSourceRefError);
			await expect(
				service.read(SCOPE, [SOURCE], { runId: 'run-1' }, { ref: 'https://example.com/page' }),
			).rejects.toThrow(LiveSourceRefError);
		});
	});

	describe('search', () => {
		it('reports a failing source as unavailable instead of as no match', async () => {
			const { service, credentialResolver } = makeService();
			credentialResolver.resolve.mockRejectedValue(new Error('token expired sk-secret-1234567890'));

			const result = await service.search(SCOPE, [SOURCE], { runId: 'run-1' }, { query: 'refund' });

			expect(result.hits).toEqual([]);
			expect(result.searched).toEqual([
				expect.objectContaining({ sourceId: 'notes', status: 'unavailable' }),
			]);
			expect(result.searched[0].error).not.toContain('sk-secret-1234567890');
		});

		it('alternates the sources in a tie, so one source cannot fill the capped result', async () => {
			const { service, provider } = makeService();
			provider.capabilities.nativeContainerSearch = true;
			provider.search.mockImplementation(async (ctx) =>
				Array.from({ length: 5 }, (_, index) => ({
					entry: {
						id: `${ctx.sourceId}-${index}`,
						kind: 'item' as const,
						title: `${ctx.sourceId} match ${index}`,
					},
					snippet: `${ctx.sourceId} match ${index}`,
				})),
			);
			const containerOnly = (id: string): LiveSourceConfig => ({
				...SOURCE,
				id,
				name: id,
				items: [PICKED_CONTAINER],
			});

			const result = await service.search(
				SCOPE,
				[containerOnly('first'), containerOnly('second')],
				{ runId: 'run-1' },
				{ query: 'match', limit: 4 },
			);

			expect(result.hits.map((hit) => hit.sourceId)).toEqual([
				'first',
				'second',
				'first',
				'second',
			]);
		});

		it('finds the matching line of a picked item and ranks it', async () => {
			const { service } = makeService();

			const result = await service.search(
				SCOPE,
				[SOURCE],
				{ runId: 'run-1' },
				{ query: 'refund policy' },
			);

			expect(result.searched).toEqual([{ sourceId: 'notes', retrieval: 'native', status: 'ok' }]);
			expect(result.hits).toHaveLength(1);
			expect(result.hits[0]).toMatchObject({
				ref: formatLiveRef('notes', PICKED_PAGE.id),
				url: PICKED_PAGE.url,
				lineRange: { start: 1, end: 1 },
				retrieval: 'native',
			});
		});
	});

	describe('resolveLink', () => {
		const PASTED = { id: 'notion', provider: 'fake', credential: 'cred-1' };

		it('resolves a pasted link with the credential and returns the item in config shape', async () => {
			const { service, provider, credentialResolver } = makeService();
			provider.resolveLink.mockResolvedValue({
				...PICKED_CONTAINER,
				hasChildren: true,
				icon: '📘',
				updatedAt: '2026-11-20T10:00:00.000Z',
			});

			const item = await service.resolveLink(SCOPE, PASTED, PICKED_CONTAINER.url!);

			expect(credentialResolver.resolve).toHaveBeenCalledWith(
				SCOPE.projectId,
				SCOPE.principal,
				'notion',
				'cred-1',
				expect.anything(),
			);
			expect(provider.resolveLink).toHaveBeenCalledWith(
				expect.objectContaining({ credential: { id: 'cred-1', type: 'fakeApi' } }),
				PICKED_CONTAINER.url,
			);
			expect(item).toEqual({
				id: PICKED_CONTAINER.id,
				kind: 'container',
				containerType: 'page',
				title: PICKED_CONTAINER.title,
				url: PICKED_CONTAINER.url,
				parentId: undefined,
			});
		});

		it('returns null when the provider does not know the link', async () => {
			const { service, provider } = makeService();
			provider.resolveLink.mockResolvedValue(null);

			await expect(service.resolveLink(SCOPE, PASTED, 'https://example.com/x')).resolves.toBeNull();
		});
	});
});
