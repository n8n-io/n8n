import type { Logger } from '@n8n/backend-common';
import type { NodeRunFacts } from '@n8n/chat-hub';
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
		config.resultCards = { enabled: true } as ChatHubConfig['resultCards'];
		chooser.choose.mockImplementation(async (candidate) => candidate.defaultCard);
	});

	it('returns mapped cards and the node runs it looked at', async () => {
		extractor.extract.mockResolvedValue([gmailFacts]);
		const service = new ResultCardsService(logger, config, extractor, chooser);

		const { cards, cardedNodeRuns } = await service.buildForRun(workflow, run);

		expect(extractor.extract).toHaveBeenCalledWith(workflow, run);
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

		expect(cards).toHaveLength(3);
		expect(cardedNodeRuns).toEqual(['Gmail#1', 'Gmail#2', 'Gmail#3']);
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
