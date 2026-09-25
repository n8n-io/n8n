import { MAX_RESULT_CARDS_PER_MESSAGE, type ResultCard } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { buildCandidateSet, type CandidateSet } from '@n8n/chat-hub';
import { ChatHubConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { IRun, IWorkflowBase } from 'n8n-workflow';

import type { NonStreamingResponseMode } from '../chat-hub.types';
import { ResultCardChooser } from './chooser';
import { nodeRunKey, ResultCardFactsExtractor } from './facts-extractor';

export { nodeRunKey } from './facts-extractor';

export interface ResultCardsForRun {
	cards: ResultCard[];
	/** `${nodeName}#${runIndex}` of every node run considered, carded or not */
	cardedNodeRuns: string[];
}

export interface BuildForRunOptions {
	/**
	 * How the chat reply is produced. In `responseNodes` mode the last node executed is the
	 * Chat node, whose output is not the reply, so no generic card is built from it.
	 */
	responseMode?: NonStreamingResponseMode;
}

/**
 * Builds the result cards for one segment of a chat reply: extracts the node
 * run facts, maps each to a candidate set and lets the chooser pick the card.
 */
@Service()
export class ResultCardsService {
	constructor(
		private readonly logger: Logger,
		private readonly config: ChatHubConfig,
		private readonly factsExtractor: ResultCardFactsExtractor,
		private readonly chooser: ResultCardChooser,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	/**
	 * Cards for everything this run produced that was not carded in an earlier
	 * message segment (`alreadyCarded`). At most `MAX_RESULT_CARDS_PER_MESSAGE`
	 * node runs are considered per call; their chooser calls run concurrently so
	 * the reply is delayed by one Jev round trip, not one per card. Never throws —
	 * a failure here must not break the reply.
	 */
	async buildForRun(
		workflow: IWorkflowBase,
		run: IRun,
		alreadyCarded: string[] = [],
		options?: BuildForRunOptions,
	): Promise<ResultCardsForRun> {
		const empty: ResultCardsForRun = { cards: [], cardedNodeRuns: [] };
		if (!this.config.resultCards.enabled) return empty;

		try {
			const facts = (
				await this.factsExtractor.extract(workflow, run, {
					alreadyCarded,
					allowGenericCandidate: options?.responseMode !== 'responseNodes',
				})
			).filter((fact) => !alreadyCarded.includes(nodeRunKey(fact.nodeName, fact.runIndex)));

			const includeSamples = this.config.resultCards.jevSendSamples;
			const candidates: CandidateSet[] = [];
			const cardedNodeRuns: string[] = [];
			for (const fact of facts) {
				if (cardedNodeRuns.length >= MAX_RESULT_CARDS_PER_MESSAGE) break;
				cardedNodeRuns.push(nodeRunKey(fact.nodeName, fact.runIndex));
				const candidate = buildCandidateSet(fact, { includeSamples });
				if (candidate) candidates.push(candidate);
			}

			const chosen = await Promise.all(
				candidates.map(async (candidate) => await this.chooser.choose(candidate)),
			);
			const cards = chosen.filter((card): card is ResultCard => card !== null);
			return { cards, cardedNodeRuns };
		} catch (error) {
			this.logger.warn('Result cards could not be built for this run', { error });
			return empty;
		}
	}
}
