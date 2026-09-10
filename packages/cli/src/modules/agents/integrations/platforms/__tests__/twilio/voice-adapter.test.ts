import { LockService } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { createHmac } from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { CacheService } from '@/services/cache/cache.service';

import {
	SentenceAccumulator,
	splitSentences,
	TwilioVoiceAdapter,
	VoiceTurnStore,
} from '../../twilio-voice-adapter';

const ACCOUNT_SID = 'AC123';
const AUTH_TOKEN = 'token-secret';
const PHONE_NUMBER = '+14155550123';
const CALLER = '+14155550999';
const CALL_SID = 'CA456';
const WEBHOOK_URL = 'https://n8n.test/rest/projects/p1/agents/v2/a1/webhooks/twilioVoice';

const chatSdk = {
	Message: class {
		constructor(props: Record<string, unknown>) {
			Object.assign(this, props);
		}
	},
	markdownToPlainText: (value: string) => value,
	parseMarkdown: (value: string) => ({ type: 'root', children: [], value }),
	stringifyMarkdown: (value: unknown) => String(value),
} as unknown as TwilioVoiceAdapterChatSdk;

type TwilioVoiceAdapterChatSdk = ConstructorParameters<typeof TwilioVoiceAdapter>[0]['chatSdk'];

async function createTurnStore(scope = 'agent-1:twilioVoice:cred-1'): Promise<VoiceTurnStore> {
	const globalConfig = mock<GlobalConfig>({
		cache: {
			backend: 'memory',
			memory: { maxSize: 10 * 1024 * 1024, ttl: 60_000 },
			redis: { prefix: 'cache', ttl: 60_000 },
		},
		executions: { mode: 'regular' },
		redis: { prefix: 'n8n' },
	} as GlobalConfig);
	const cache = new CacheService(globalConfig);
	await cache.init();
	return new VoiceTurnStore(cache, Container.get(LockService), scope);
}

function signedRequest(url: string, fields: Record<string, string>): Request {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) form.append(key, value);

	const payload = Object.entries(fields)
		.sort(([leftKey, leftValue], [rightKey, rightValue]) =>
			leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
		)
		.reduce((value, [key, item]) => `${value}${key}${item}`, url);
	const signature = createHmac('sha1', AUTH_TOKEN).update(payload).digest('base64');

	return new Request(url, {
		method: 'POST',
		headers: { 'x-twilio-signature': signature },
		body: form,
	});
}

function callFields(extra: Record<string, string> = {}): Record<string, string> {
	return {
		AccountSid: ACCOUNT_SID,
		CallSid: CALL_SID,
		From: CALLER,
		To: PHONE_NUMBER,
		...extra,
	};
}

/** Build an adapter plus a handle to the agent turn it starts. */
function createAdapter(turns: VoiceTurnStore) {
	let finishAgent!: () => void;
	const agentDone = new Promise<void>((resolve) => {
		finishAgent = resolve;
	});
	// Resolves when the bridge starts the turn. Only then can the agent post,
	// so tests that stream text wait for it exactly as production does.
	let markStarted!: () => void;
	const agentStarted = new Promise<void>((resolve) => {
		markStarted = resolve;
	});
	const processMessage = vi.fn().mockImplementation(async () => {
		markStarted();
		await agentDone;
	});

	const adapter = new TwilioVoiceAdapter({
		accountSid: ACCOUNT_SID,
		authToken: AUTH_TOKEN,
		phoneNumber: PHONE_NUMBER,
		allowedCallers: [CALLER],
		webhookUrl: WEBHOOK_URL,
		turns,
		logger: mock(),
		chatSdk,
	});

	return { adapter, processMessage, finishAgent, agentDone, agentStarted };
}

async function initialized() {
	const context = createAdapter(await createTurnStore());
	await context.adapter.initialize({
		processMessage: context.processMessage,
	} as unknown as Parameters<TwilioVoiceAdapter['initialize']>[0]);
	return context;
}

const threadId = `twilioVoice:${CALL_SID}`;
const speechUrl = `${WEBHOOK_URL}?turn=t1`;
const streamUrl = `${WEBHOOK_URL}?stream=1`;

describe('splitSentences', () => {
	it('returns only sentences a terminator plus whitespace has closed', () => {
		expect(splitSentences('One. Two! Three')).toEqual({
			complete: ['One.', 'Two!'],
			rest: 'Three',
		});
	});

	it('does not split inside a decimal number', () => {
		expect(splitSentences('It costs 3.50 today')).toEqual({
			complete: [],
			rest: 'It costs 3.50 today',
		});
	});

	it('keeps a run of terminators with its sentence', () => {
		expect(splitSentences('Wow!!! Next')).toEqual({ complete: ['Wow!!!'], rest: 'Next' });
	});

	it('treats a newline as a boundary', () => {
		expect(splitSentences('First line\nsecond')).toEqual({
			complete: ['First line'],
			rest: 'second',
		});
	});
});

describe('SentenceAccumulator', () => {
	it('returns each sentence once as the accumulated text grows', () => {
		const accumulator = new SentenceAccumulator();
		expect(accumulator.push('Hello there. ')).toEqual(['Hello there.']);
		expect(accumulator.push('Hello there. How can I help? ')).toEqual(['How can I help?']);
	});

	it('ignores the streaming placeholder', () => {
		expect(new SentenceAccumulator().push('...')).toEqual([]);
	});

	it('returns the unterminated tail when the turn ends', () => {
		const accumulator = new SentenceAccumulator();
		expect(accumulator.push('Done. And a tail')).toEqual(['Done.']);
		expect(accumulator.end()).toEqual(['And a tail']);
		expect(accumulator.end()).toEqual([]);
	});

	it('speaks a separate message in full after the tail of the previous one', () => {
		const accumulator = new SentenceAccumulator();
		expect(accumulator.push('Checking now. And a tail')).toEqual(['Checking now.']);
		expect(accumulator.beginMessage('A new message. With more')).toEqual([
			'And a tail',
			'A new message.',
		]);
		expect(accumulator.end()).toEqual(['With more']);
	});
});

describe('VoiceTurnStore', () => {
	it('lets another main drain what this one queued', async () => {
		const store = await createTurnStore();
		expect(await store.create('CA1')).toBe(true);
		await store.append('CA1', ['First.'], false);

		const drained = await store.drainWhenReady('CA1', 0);
		expect(drained?.pending).toEqual(['First.']);
		expect(drained?.finished).toBe(false);

		// Draining is destructive, so the next hop does not repeat it.
		expect((await store.drainWhenReady('CA1', 0))?.pending).toEqual([]);
	});

	it('picks up a sentence another main appends after the wait began', async () => {
		const store = await createTurnStore();
		await store.create('CA1');

		const waiting = store.drainWhenReady('CA1', 5_000);
		const appended = new Promise<void>((resolve) => {
			setTimeout(() => {
				store.append('CA1', ['Late arrival.'], false).then(resolve, resolve);
			}, 300);
		});

		expect((await waiting)?.pending).toEqual(['Late arrival.']);
		await appended;
	});

	it('refuses a second queue for a call already in flight', async () => {
		const store = await createTurnStore();
		expect(await store.create('CA1')).toBe(true);
		expect(await store.create('CA1')).toBe(false);
	});

	it('scopes queues per agent connection', async () => {
		const mine = await createTurnStore('agent-1:twilioVoice:cred-1');
		const theirs = await createTurnStore('agent-2:twilioVoice:cred-1');
		await mine.create('CA1');
		expect(await theirs.drainWhenReady('CA1', 0)).toBeUndefined();
	});

	it('reports the queue as gone once deleted', async () => {
		const store = await createTurnStore();
		await store.create('CA1');
		await store.delete('CA1');
		expect(await store.drainWhenReady('CA1', 0)).toBeUndefined();
	});
});

describe('TwilioVoiceAdapter.handleWebhook', () => {
	const twimlOf = async (response: Response) => await response.text();

	it('rejects a request with a bad signature', async () => {
		const { adapter } = await initialized();
		const response = await adapter.handleWebhook(
			new Request(speechUrl, {
				method: 'POST',
				headers: { 'x-twilio-signature': 'nope' },
				body: new FormData(),
			}),
		);
		expect(response.status).toBe(401);
	});

	it('turns away a caller outside the allow list', async () => {
		const { adapter } = await initialized();
		const url = `${WEBHOOK_URL}?turn=t1`;
		const response = await adapter.handleWebhook(
			signedRequest(url, callFields({ From: '+14155550000', SpeechResult: 'hi' })),
		);
		expect(await twimlOf(response)).toContain('not allowed');
	});

	it('greets the caller and gathers speech on the first request', async () => {
		const { adapter } = await initialized();
		const response = await adapter.handleWebhook(signedRequest(WEBHOOK_URL, callFields()));
		const body = await twimlOf(response);
		expect(body).toContain('<Say>Hello. How can I help you?</Say>');
		expect(body).toContain('<Gather input="speech"');
	});

	it('speaks each sentence as it streams instead of waiting for the whole answer', async () => {
		const { adapter, processMessage, finishAgent, agentDone, agentStarted } = await initialized();

		// The caller speaks. The agent has produced one sentence by the time the
		// first TwiML document has to go back.
		const firstHop = adapter.handleWebhook(
			signedRequest(speechUrl, callFields({ SpeechResult: 'what is the status?' })),
		);
		await agentStarted;
		await adapter.postMessage(threadId, { markdown: 'The order shipped. ' });
		const firstBody = await twimlOf(await firstHop);

		expect(processMessage).toHaveBeenCalledTimes(1);
		expect(firstBody).toContain('<Say>The order shipped.</Say>');
		expect(firstBody).toContain('stream=1');
		// The answer is still being written, so the call must not be handed back yet.
		expect(firstBody).not.toContain('<Gather');

		// Second sentence arrives while the caller is hearing the first.
		await adapter.editMessage(threadId, 'm1', {
			markdown: 'The order shipped. It arrives on Tuesday. ',
		});
		const secondBody = await twimlOf(
			await adapter.handleWebhook(signedRequest(streamUrl, callFields())),
		);
		expect(secondBody).toContain('<Say>It arrives on Tuesday.</Say>');
		expect(secondBody).not.toContain('<Say>The order shipped.</Say>');

		// The agent finishes, so the last hop returns the turn to the caller.
		finishAgent();
		await agentDone;
		await Promise.resolve();
		const finalBody = await twimlOf(
			await adapter.handleWebhook(signedRequest(streamUrl, callFields())),
		);
		expect(finalBody).toContain('<Gather input="speech"');
		expect(finalBody).not.toContain('<Redirect');
	});

	it('joins the run already in flight when Twilio retries the same turn', async () => {
		const { adapter, processMessage, agentStarted } = await initialized();

		const firstHop = adapter.handleWebhook(
			signedRequest(speechUrl, callFields({ SpeechResult: 'hello' })),
		);
		await agentStarted;
		await adapter.postMessage(threadId, { markdown: 'Working on it. ' });
		await firstHop;

		await adapter.editMessage(threadId, 'm1', { markdown: 'Working on it. Nearly there. ' });
		await adapter.handleWebhook(signedRequest(speechUrl, callFields({ SpeechResult: 'hello' })));

		expect(processMessage).toHaveBeenCalledTimes(1);
	});

	it('hangs up after speaking a message that ends the call', async () => {
		const { adapter, finishAgent, agentDone, agentStarted } = await initialized();

		const firstHop = adapter.handleWebhook(
			signedRequest(speechUrl, callFields({ SpeechResult: 'approve it' })),
		);
		await agentStarted;
		await adapter.postMessage(threadId, { markdown: 'Let me check. ' });
		await firstHop;

		await adapter.postMessage(threadId, { card: {} } as never);
		finishAgent();
		await agentDone;
		await Promise.resolve();

		const body = await twimlOf(await adapter.handleWebhook(signedRequest(streamUrl, callFields())));
		expect(body).toContain('needs approval');
		expect(body).toContain('<Hangup/>');
		expect(body).not.toContain('<Gather');
	});

	it('holds the line quietly while the agent is still thinking', async () => {
		vi.useFakeTimers();
		try {
			const { adapter } = await initialized();
			const firstHop = adapter.handleWebhook(
				signedRequest(speechUrl, callFields({ SpeechResult: 'think hard' })),
			);
			await vi.advanceTimersByTimeAsync(5_000);
			const body = await twimlOf(await firstHop);

			expect(body).toContain('<Say>One moment.</Say>');
			expect(body).toContain('silent=1');
		} finally {
			vi.useRealTimers();
		}
	});

	it('gives up after too many silent hops', async () => {
		vi.useFakeTimers();
		try {
			const { adapter } = await initialized();
			const firstHop = adapter.handleWebhook(
				signedRequest(speechUrl, callFields({ SpeechResult: 'think hard' })),
			);
			await vi.advanceTimersByTimeAsync(5_000);
			await firstHop;

			const lastHop = adapter.handleWebhook(
				signedRequest(`${WEBHOOK_URL}?stream=1&silent=999`, callFields()),
			);
			await vi.advanceTimersByTimeAsync(5_000);
			const body = await twimlOf(await lastHop);

			expect(body).toContain('taking too long');
			expect(body).toContain('<Hangup/>');
		} finally {
			vi.useRealTimers();
		}
	});
});
