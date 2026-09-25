import type { ResultCard } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { profileItems, type CandidateSet, type NodeRunFacts } from '@n8n/chat-hub';
import type { ChatHubConfig } from '@n8n/config';
import type { IRun, IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ResultCardChooser } from '@/modules/chat-hub/result-cards/chooser';
import type { ResultCardFactsExtractor } from '@/modules/chat-hub/result-cards/facts-extractor';
import { ResultCardsService } from '@/modules/chat-hub/result-cards/result-cards.service';

const gmailFacts: NodeRunFacts = {
	nodeName: 'Gmail',
	nodeType: 'n8n-nodes-base.gmail',
	typeVersion: 2.1,
	resource: 'message',
	operation: 'send',
	runIndex: 0,
	itemCount: 1,
	items: [{ id: '1' }],
	binaryNames: [],
	params: { sendTo: 'a@x.com', subject: 'Hi', message: 'Body' },
	fields: [{ path: 'id', type: 'string', sample: '1', presence: 1, distinct: 1 }],
	isFinalOutput: false,
	workflow: { name: 'w' },
};

// A generic final output whose Jev questions quote sample values by default.
const summaryItems = [{ total: 12, bySource: { LinkedIn: 7, Referral: 3 }, topSource: 'LinkedIn' }];
const summaryFacts: NodeRunFacts = {
	nodeName: 'Weekly summary',
	nodeType: 'n8n-nodes-base.code',
	typeVersion: 2,
	runIndex: 0,
	itemCount: 1,
	items: summaryItems,
	binaryNames: [],
	params: {},
	fields: profileItems(summaryItems),
	isFinalOutput: true,
	workflow: { name: 'Leads log' },
};

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

describe('ResultCardsService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const config = mock<ChatHubConfig>();
	const extractor = mock<ResultCardFactsExtractor>();
	const chooser = mock<ResultCardChooser>();
	const workflow = mock<IWorkflowBase>();
	const run = mock<IRun>();

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		config.resultCards = { enabled: true, jevSendSamples: true } as ChatHubConfig['resultCards'];
		chooser.choose.mockImplementation(async (candidate) => candidate.defaultCard);
	});

	it('returns mapped cards and the node runs it looked at', async () => {
		extractor.extract.mockResolvedValue([gmailFacts]);
		const service = new ResultCardsService(logger, config, extractor, chooser);

		const { cards, cardedNodeRuns } = await service.buildForRun(workflow, run);

		expect(extractor.extract).toHaveBeenCalledWith(workflow, run, {
			alreadyCarded: [],
			allowGenericCandidate: true,
		});
		expect(cards).toHaveLength(1);
		expect(cards[0]).toMatchObject({ type: 'email', to: ['a@x.com'] });
		expect(cardedNodeRuns).toEqual(['Gmail#0']);
	});

	it('skips node runs that were already carded and caps at three cards', async () => {
		extractor.extract.mockResolvedValue([
			gmailFacts,
			{ ...gmailFacts, runIndex: 1 },
			{ ...gmailFacts, runIndex: 2 },
			{ ...gmailFacts, runIndex: 3 },
			{ ...gmailFacts, runIndex: 4 },
		]);
		const service = new ResultCardsService(logger, config, extractor, chooser);

		const { cards, cardedNodeRuns } = await service.buildForRun(workflow, run, ['Gmail#0']);

		expect(extractor.extract).toHaveBeenCalledWith(
			workflow,
			run,
			expect.objectContaining({ alreadyCarded: ['Gmail#0'] }),
		);
		expect(cards).toHaveLength(3);
		expect(cardedNodeRuns).toEqual(['Gmail#1', 'Gmail#2', 'Gmail#3']);
	});

	it('disallows generic candidates in responseNodes mode and allows them otherwise', async () => {
		extractor.extract.mockResolvedValue([]);
		const service = new ResultCardsService(logger, config, extractor, chooser);

		await service.buildForRun(workflow, run, [], { responseMode: 'responseNodes' });
		expect(extractor.extract).toHaveBeenLastCalledWith(
			workflow,
			run,
			expect.objectContaining({ allowGenericCandidate: false }),
		);

		await service.buildForRun(workflow, run, [], { responseMode: 'lastNode' });
		expect(extractor.extract).toHaveBeenLastCalledWith(
			workflow,
			run,
			expect.objectContaining({ allowGenericCandidate: true }),
		);
	});

	it('asks the chooser for all candidates concurrently and keeps their order', async () => {
		extractor.extract.mockResolvedValue([
			gmailFacts,
			{ ...gmailFacts, runIndex: 1, params: { ...gmailFacts.params, sendTo: 'b@x.com' } },
			{ ...gmailFacts, runIndex: 2, params: { ...gmailFacts.params, sendTo: 'c@x.com' } },
		]);
		const pending = [
			deferred<ResultCard | null>(),
			deferred<ResultCard | null>(),
			deferred<ResultCard | null>(),
		];
		const candidates: CandidateSet[] = [];
		chooser.choose.mockImplementation(async (candidate) => {
			candidates.push(candidate);
			return await pending[candidates.length - 1].promise;
		});
		const service = new ResultCardsService(logger, config, extractor, chooser);

		const result = service.buildForRun(workflow, run);
		await vi.waitFor(() => expect(chooser.choose).toHaveBeenCalledTimes(3));

		// All three were requested before any of them resolved; resolve them out of order.
		pending[2].resolve(candidates[2].defaultCard);
		pending[0].resolve(candidates[0].defaultCard);
		pending[1].resolve(null);

		const { cards, cardedNodeRuns } = await result;
		expect(cards.map((card) => (card as { to: string[] }).to)).toEqual([['a@x.com'], ['c@x.com']]);
		expect(cardedNodeRuns).toEqual(['Gmail#0', 'Gmail#1', 'Gmail#2']);
	});

	it('keeps sample values out of the Jev questions when jevSendSamples is off', async () => {
		config.resultCards.jevSendSamples = false;
		extractor.extract.mockResolvedValue([summaryFacts]);
		const service = new ResultCardsService(logger, config, extractor, chooser);

		await service.buildForRun(workflow, run);

		expect(chooser.choose).toHaveBeenCalledTimes(1);
		const candidate = chooser.choose.mock.calls[0][0];
		expect(JSON.stringify(candidate.questions)).not.toContain('LinkedIn');
		expect(candidate.questions.title).toMatchObject({
			criteria: expect.objectContaining({ 'field:topSource': 'field:topSource' }),
		});
	});

	it('quotes sample values in the Jev questions when jevSendSamples is on', async () => {
		extractor.extract.mockResolvedValue([summaryFacts]);
		const service = new ResultCardsService(logger, config, extractor, chooser);

		await service.buildForRun(workflow, run);

		const candidate = chooser.choose.mock.calls[0][0];
		expect(JSON.stringify(candidate.questions)).toContain('LinkedIn');
	});

	it('still records a node run when the chooser declines the card', async () => {
		extractor.extract.mockResolvedValue([gmailFacts]);
		chooser.choose.mockResolvedValue(null);
		const service = new ResultCardsService(logger, config, extractor, chooser);

		const { cards, cardedNodeRuns } = await service.buildForRun(workflow, run);

		expect(cards).toEqual([]);
		expect(cardedNodeRuns).toEqual(['Gmail#0']);
	});

	it('is a no-op when disabled', async () => {
		config.resultCards.enabled = false;
		extractor.extract.mockResolvedValue([gmailFacts]);
		const service = new ResultCardsService(logger, config, extractor, chooser);

		expect(await service.buildForRun(workflow, run)).toEqual({ cards: [], cardedNodeRuns: [] });
		expect(extractor.extract).not.toHaveBeenCalled();
	});

	it('swallows errors and leaves the reply untouched', async () => {
		extractor.extract.mockRejectedValue(new Error('boom'));
		const service = new ResultCardsService(logger, config, extractor, chooser);

		expect(await service.buildForRun(workflow, run)).toEqual({ cards: [], cardedNodeRuns: [] });
		expect(logger.warn).toHaveBeenCalledWith(
			'Result cards could not be built for this run',
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});
});
