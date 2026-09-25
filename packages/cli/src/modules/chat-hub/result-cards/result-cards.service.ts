import { MAX_RESULT_CARDS_PER_MESSAGE, type ResultCard } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { buildCandidateSet } from '@n8n/chat-hub';
import { ChatHubConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { IRun, IWorkflowBase } from 'n8n-workflow';

import { ResultCardChooser } from './chooser';
import { ResultCardFactsExtractor } from './facts-extractor';

export interface ResultCardsForRun {
	cards: ResultCard[];
	/** `${nodeName}#${runIndex}` of every node run considered, carded or not */
	cardedNodeRuns: string[];
}

/** Identity of one node run within an execution, stable across resumes. */
export const nodeRunKey = (nodeName: string, runIndex: number) => `${nodeName}#${runIndex}`;

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
	 * node runs are considered per call. Never throws — a failure here must not
	 * break the reply.
	 */
	async buildForRun(
		workflow: IWorkflowBase,
		run: IRun,
		alreadyCarded: string[] = [],
	): Promise<ResultCardsForRun> {
		const empty: ResultCardsForRun = { cards: [], cardedNodeRuns: [] };
		if (!this.config.resultCards.enabled) return empty;

		try {
			const facts = (await this.factsExtractor.extract(workflow, run)).filter(
				(fact) => !alreadyCarded.includes(nodeRunKey(fact.nodeName, fact.runIndex)),
			);

			const cards: ResultCard[] = [];
			const cardedNodeRuns: string[] = [];
			for (const fact of facts) {
				if (cards.length >= MAX_RESULT_CARDS_PER_MESSAGE) break;
				cardedNodeRuns.push(nodeRunKey(fact.nodeName, fact.runIndex));
				const candidate = buildCandidateSet(fact);
				if (!candidate) continue;
				const card = await this.chooser.choose(candidate);
				if (card) cards.push(card);
			}
			return { cards, cardedNodeRuns };
		} catch (error) {
			this.logger.warn('Result cards could not be built for this run', { error });
			return empty;
		}
	}
}
