import type { Logger } from '@n8n/backend-common';
import type { CandidateSet, JevAnswers } from '@n8n/chat-hub';
import type { ChatHubConfig } from '@n8n/config';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { tmpdir } from 'os';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';

import { AnswerCache, ResultCardChooser } from '@/modules/chat-hub/result-cards/chooser';
import type { JevClient, JevClientFactory } from '@/modules/chat-hub/result-cards/jev-client';

const noulQuestion = { include: { type: 'noul', instructions: 'x' } };
const CHOOSER_FAILED = 'Result card chooser failed, using the default card';

type Stubbed = CandidateSet & {
	apply: ReturnType<typeof vi.fn>;
	buildState: ReturnType<typeof vi.fn>;
};

function candidate(questions: Record<string, unknown>, hash = 'abcd1234'): Stubbed {
	const apply = vi.fn(
		(answers?: JevAnswers) =>
			({
				type: 'keyValue',
				title: answers ? 'chosen' : 'default',
				pairs: [{ key: 'k', value: 'v' }],
			}) as never,
	);
	const buildState = vi.fn((_options?: { includeSamples?: boolean }) => ({
		workflow: { name: 'w' },
		node: { type: 't', name: 'n' },
		itemCount: 1,
		fields: [],
	}));
	return {
		facts: {} as never,
		schemaHash: hash,
		archetypes: ['keyValue'],
		defaultCard: { type: 'keyValue', title: 'default', pairs: [{ key: 'k', value: 'v' }] },
		questions: questions as never,
		buildState,
		apply,
	};
}

const tempDirs: string[] = [];
function fixtureDir(): string {
	const dir = mkdtempSync(join(tmpdir(), 'jev-fixtures-'));
	tempDirs.push(dir);
	return dir;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('ResultCardChooser', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const config = mock<ChatHubConfig>();
	const client = mock<JevClient>();
	const factory = mock<JevClientFactory>();
	factory.create.mockReturnValue(client);
	const answers: JevAnswers = { include: { noul: 0.9 } };

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		factory.create.mockReturnValue(client);
		config.resultCards = {
			enabled: true,
			jevApiKey: 'key',
			jevProvider: 'typesafe',
			jevBaseUrl: '',
			jevModel: '',
			jevSendSamples: true,
			jevFixtures: '',
		} as ChatHubConfig['resultCards'];
	});

	it('applies defaults without calling Jev when there are no questions', async () => {
		const chooser = new ResultCardChooser(logger, config, factory);
		const set = candidate({});
		expect(await chooser.choose(set)).toMatchObject({ title: 'default' });
		expect(set.apply).toHaveBeenCalledWith(undefined);
		expect(client.decide).not.toHaveBeenCalled();
	});

	it('calls Jev once per schema hash and caches the answers', async () => {
		client.decide.mockResolvedValue({ answers, latencyMs: 120 });
		const chooser = new ResultCardChooser(logger, config, factory);
		expect(await chooser.choose(candidate(noulQuestion))).toMatchObject({ title: 'chosen' });
		expect(await chooser.choose(candidate(noulQuestion))).toMatchObject({ title: 'chosen' });
		expect(client.decide).toHaveBeenCalledTimes(1);
		expect(client.decide.mock.calls[0][0]).toMatchObject({ node: { name: 'n' } });
	});

	it('passes the sample setting to buildState and the config to the client factory', async () => {
		config.resultCards.jevSendSamples = false;
		client.decide.mockResolvedValue({ answers, latencyMs: 10 });
		const set = candidate(noulQuestion, 'cccc3333');

		await new ResultCardChooser(logger, config, factory).choose(set);

		expect(set.buildState).toHaveBeenCalledTimes(1);
		expect(set.buildState).toHaveBeenCalledWith({ includeSamples: false });
		expect(factory.create).toHaveBeenCalledTimes(1);
		expect(factory.create.mock.calls[0][0]).toStrictEqual({
			provider: 'typesafe',
			apiKey: 'key',
			baseUrl: undefined,
			model: undefined,
		});
		expect(factory.create.mock.calls[0][1]).toBe(logger);
	});

	it('uses the default card and does not reject when buildState throws', async () => {
		const set = candidate(noulQuestion, 'dddd4444');
		set.buildState.mockImplementation(() => {
			throw new Error('bad state');
		});

		await expect(new ResultCardChooser(logger, config, factory).choose(set)).resolves.toMatchObject(
			{ title: 'default' },
		);

		expect(set.apply).toHaveBeenCalledWith(undefined);
		expect(client.decide).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(CHOOSER_FAILED, { error: expect.any(Error) });
	});

	it('returns defaultCard and does not reject when apply throws', async () => {
		client.decide.mockResolvedValue({ answers, latencyMs: 10 });
		const set = candidate(noulQuestion, 'eeee5555');
		set.apply.mockImplementation(() => {
			throw new Error('bad apply');
		});

		await expect(new ResultCardChooser(logger, config, factory).choose(set)).resolves.toBe(
			set.defaultCard,
		);
		expect(logger.warn).toHaveBeenCalledWith(CHOOSER_FAILED, { error: expect.any(Error) });
	});

	it('uses defaults when no key is configured or Jev fails', async () => {
		config.resultCards.jevApiKey = '';
		const chooser = new ResultCardChooser(logger, config, factory);
		expect(await chooser.choose(candidate(noulQuestion))).toMatchObject({ title: 'default' });
		expect(factory.create).not.toHaveBeenCalled();

		config.resultCards.jevApiKey = 'key';
		client.decide.mockResolvedValue(undefined);
		expect(
			await new ResultCardChooser(logger, config, factory).choose(
				candidate(noulQuestion, 'ffff0000'),
			),
		).toMatchObject({ title: 'default' });
	});

	it('reads recorded fixtures before calling Jev and records new answers', async () => {
		const dir = fixtureDir();
		config.resultCards.jevFixtures = dir;
		writeFileSync(join(dir, 'aaaa1111.json'), JSON.stringify(answers));
		client.decide.mockResolvedValue({ answers, latencyMs: 50 });
		const chooser = new ResultCardChooser(logger, config, factory);

		expect(await chooser.choose(candidate(noulQuestion, 'aaaa1111'))).toMatchObject({
			title: 'chosen',
		});
		expect(client.decide).not.toHaveBeenCalled();

		await chooser.choose(candidate(noulQuestion, 'bbbb2222'));
		expect(client.decide).toHaveBeenCalledTimes(1);
		expect(jsonParse(readFileSync(join(dir, 'bbbb2222.json'), 'utf8'))).toEqual(answers);
	});

	it('ignores fixtures that are not a plain object of Jev answers and calls Jev instead', async () => {
		const dir = fixtureDir();
		config.resultCards.jevFixtures = dir;
		writeFileSync(join(dir, 'a1a1a1a1.json'), JSON.stringify([1]));
		writeFileSync(join(dir, 'b2b2b2b2.json'), JSON.stringify({ include: { weird: 1 } }));
		writeFileSync(join(dir, 'c3c3c3c3.json'), JSON.stringify(null));
		client.decide.mockResolvedValue({ answers, latencyMs: 5 });
		const chooser = new ResultCardChooser(logger, config, factory);

		expect(await chooser.choose(candidate(noulQuestion, 'a1a1a1a1'))).toMatchObject({
			title: 'chosen',
		});
		expect(await chooser.choose(candidate(noulQuestion, 'b2b2b2b2'))).toMatchObject({
			title: 'chosen',
		});
		expect(await chooser.choose(candidate(noulQuestion, 'c3c3c3c3'))).toMatchObject({
			title: 'chosen',
		});
		expect(client.decide).toHaveBeenCalledTimes(3);
	});
});

describe('AnswerCache', () => {
	const a: JevAnswers = { include: { noul: 0.1 } };
	const b: JevAnswers = { include: { noul: 0.2 } };
	const c: JevAnswers = { include: { noul: 0.3 } };

	it('evicts the least recently used entry, not the oldest inserted', () => {
		const cache = new AnswerCache(2, 60_000);
		cache.set('a', a);
		cache.set('b', b);
		expect(cache.get('a')).toBe(a);

		cache.set('c', c);

		expect(cache.get('b')).toBeUndefined();
		expect(cache.get('a')).toBe(a);
		expect(cache.get('c')).toBe(c);
	});

	it('re-setting an existing key moves it to the most recent position without growing', () => {
		const cache = new AnswerCache(2, 60_000);
		cache.set('a', a);
		cache.set('b', b);
		cache.set('a', c);

		cache.set('d', b);

		expect(cache.get('b')).toBeUndefined();
		expect(cache.get('a')).toBe(c);
		expect(cache.get('d')).toBe(b);
	});

	it('does not return expired entries', () => {
		const cache = new AnswerCache(2, 0);
		cache.set('a', a);
		expect(cache.get('a')).toBeUndefined();
	});
});
