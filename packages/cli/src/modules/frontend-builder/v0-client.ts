import { Service } from '@n8n/di';

import type { IV0Client, V0ChatResult } from './v0-client.interface';

/**
 * Real implementation wrapping the v0-sdk.
 *
 * Slice 1 (this file) is a stub — the module always overrides this
 * registration with `FakeV0Client` so the walking skeleton works
 * without any v0 credentials. Slice 2 replaces the method bodies with
 * actual `v0-sdk` calls and makes the module conditionally skip the
 * override when `V0_API_KEY` is configured.
 */
@Service()
export class V0Client implements IV0Client {
	async create(_input: { message: string }): Promise<V0ChatResult> {
		throw new Error('V0Client not configured (expected an override via Container.set)');
	}

	async sendMessage(_input: { chatId: string; message: string }): Promise<V0ChatResult> {
		throw new Error('V0Client not configured (expected an override via Container.set)');
	}

	async getChat(_chatId: string): Promise<V0ChatResult> {
		throw new Error('V0Client not configured (expected an override via Container.set)');
	}
}
