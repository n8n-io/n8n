import type { ResultCard } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { CandidateSet, JevAnswers } from '@n8n/chat-hub';
import { ChatHubConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import { JevClientFactory, normalizeAnswers, type JevClient } from './jev-client';

const CACHE_MAX = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CHOOSER_FAILED = 'Result card chooser failed, using the default card';

/**
 * Bounded LRU cache of Jev answers keyed by schema hash. Reads move a key to the
 * most-recent position; when full, the least recently used key is evicted.
 * Entries expire after `ttlMs` and are dropped lazily on read.
 */
export class AnswerCache {
	private readonly entries = new Map<string, { answers: JevAnswers; expiresAt: number }>();

	constructor(
		private readonly maxEntries: number,
		private readonly ttlMs: number,
	) {}

	get(key: string): JevAnswers | undefined {
		const entry = this.entries.get(key);
		if (!entry) return undefined;
		// `Map` keeps insertion order, so delete + set moves the key to the tail
		this.entries.delete(key);
		if (entry.expiresAt <= Date.now()) return undefined;
		this.entries.set(key, entry);
		return entry.answers;
	}

	set(key: string, answers: JevAnswers): void {
		this.entries.delete(key);
		if (this.entries.size >= this.maxEntries) {
			const leastRecent = this.entries.keys().next().value;
			if (leastRecent !== undefined) this.entries.delete(leastRecent);
		}
		this.entries.set(key, { answers, expiresAt: Date.now() + this.ttlMs });
	}
}

/**
 * Picks the result card for a candidate set. Answers come, in order, from an
 * in-memory cache keyed by `schemaHash`, from recorded fixture files, and only
 * then from a live Jev call. Without an API key nothing leaves the process and
 * the mapper's deterministic defaults are applied.
 *
 * `choose()` never throws: any failure while gathering answers falls back to
 * `apply(undefined)`, and a failure inside `apply` itself falls back to the
 * candidate's `defaultCard`.
 */
@Service()
export class ResultCardChooser {
	private readonly cache = new AnswerCache(CACHE_MAX, CACHE_TTL_MS);

	constructor(
		private readonly logger: Logger,
		private readonly config: ChatHubConfig,
		private readonly clientFactory: JevClientFactory,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	async choose(candidate: CandidateSet): Promise<ResultCard | null> {
		let answers: JevAnswers | undefined;
		try {
			if (Object.keys(candidate.questions).length > 0) {
				answers = await this.answersFor(candidate);
			}
		} catch (error) {
			this.logger.warn(CHOOSER_FAILED, { error });
			answers = undefined;
		}

		try {
			return candidate.apply(answers);
		} catch (error) {
			this.logger.warn(CHOOSER_FAILED, { error });
			return candidate.defaultCard;
		}
	}

	private async answersFor(candidate: CandidateSet): Promise<JevAnswers | undefined> {
		const key = candidate.schemaHash;
		const cached = this.cache.get(key);
		if (cached) return cached;

		const fixture = await this.readFixture(key);
		if (fixture) {
			this.cache.set(key, fixture);
			return fixture;
		}

		const client = this.createClient();
		if (!client) return undefined;

		const decision = await client.decide(
			candidate.buildState({ includeSamples: this.config.resultCards.jevSendSamples }),
			candidate.questions,
		);
		if (!decision) return undefined;

		this.cache.set(key, decision.answers);
		await this.writeFixture(key, decision.answers);
		return decision.answers;
	}

	private createClient(): JevClient | null {
		const { jevApiKey, jevProvider, jevBaseUrl, jevModel } = this.config.resultCards;
		if (!jevApiKey) return null;
		return this.clientFactory.create(
			{
				provider: jevProvider,
				apiKey: jevApiKey,
				baseUrl: jevBaseUrl || undefined,
				model: jevModel || undefined,
			},
			this.logger,
		);
	}

	private fixturePath(key: string): string | null {
		const dir = this.config.resultCards.jevFixtures;
		return dir ? join(dir, `${key}.json`) : null;
	}

	/**
	 * Recorded answers are user-editable files, so they go through the same
	 * normalization as a live response. Anything that is not a plain object of
	 * recognizable answers is ignored and Jev is asked instead.
	 */
	private async readFixture(key: string): Promise<JevAnswers | undefined> {
		const path = this.fixturePath(key);
		if (!path) return undefined;
		try {
			const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
			if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
			const answers = normalizeAnswers(parsed as Record<string, unknown>);
			return Object.keys(answers).length > 0 ? answers : undefined;
		} catch {
			return undefined;
		}
	}

	private async writeFixture(key: string, answers: JevAnswers): Promise<void> {
		const path = this.fixturePath(key);
		if (!path) return;
		try {
			await mkdir(this.config.resultCards.jevFixtures, { recursive: true });
			await writeFile(path, JSON.stringify(answers, null, 2), 'utf8');
		} catch (error) {
			this.logger.debug('Could not record Jev fixture', { error });
		}
	}
}
