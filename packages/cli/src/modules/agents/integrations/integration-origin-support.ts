import type { AgentMessageIntegrationOrigin } from '@n8n/api-types';
import type { Message, Thread } from 'chat';

import type { IntegrationMessageSubject } from './integration-tool-types';

/** A slow name lookup must not delay the message. */
const CHANNEL_NAME_TIMEOUT_MS = 500;

export interface OriginInput {
	thread: Thread<unknown, unknown>;
	message: Message<unknown>;
	subject?: IntegrationMessageSubject;
}

/** The decoded adapter thread ID. Each integration reads its own fields. */
export type DecodedThread = Record<string, unknown>;

export type OriginDraft = Record<string, unknown> & {
	type: AgentMessageIntegrationOrigin['type'];
};

export function text(value: unknown): string | undefined {
	if (typeof value === 'string' && value !== '') return value;
	return typeof value === 'number' ? String(value) : undefined;
}

/** The name is an optional snapshot. Any failure leaves it out. */
export async function fetchChannelName(
	thread: Thread<unknown, unknown>,
): Promise<string | undefined> {
	try {
		const info = await withTimeout(thread.channel.fetchMetadata(), CHANNEL_NAME_TIMEOUT_MS);
		return text(info.name);
	} catch {
		return undefined;
	}
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error('Timed out')), ms);
	});
	try {
		return await Promise.race([promise, timeout]);
	} finally {
		clearTimeout(timer);
	}
}
