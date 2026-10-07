import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { z } from 'zod';

import type { LinkedInstance } from './database/entities/linked-instance.entity';
import { LinkedInstanceRepository } from './database/repositories/linked-instance.repository';
import type { LinkedInstanceStatus, LinkedInstanceSummary } from './linked-instances.types';

export type NewLinkedInstanceInput = {
	userId: string;
	name: string;
	origin: string;
	token: string;
	status: LinkedInstanceStatus;
	verifiedAt: Date;
};

export type LinkedInstanceCredentials = { origin: string; token: string };

const idSchema = z.string().uuid();

// A Postgres uuid column rejects other strings, so an id in another format matches no row.
function isLinkedInstanceId(id: string): boolean {
	return idSchema.safeParse(id).success;
}

function toSummary(row: LinkedInstance): LinkedInstanceSummary {
	return {
		id: row.id,
		name: row.name,
		baseUrl: row.baseUrl,
		status: row.status,
		lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
	};
}

/**
 * Keeps linked instances and their encrypted access tokens.
 * The token goes in only as ciphertext, and comes out in clear only through `readCredentials`.
 */
@Service()
export class LinkedInstanceStore {
	constructor(
		private readonly repository: LinkedInstanceRepository,
		private readonly cipher: Cipher,
	) {}

	async listForUser(userId: string): Promise<LinkedInstanceSummary[]> {
		const rows = await this.repository.listForUser(userId);
		return rows.map(toSummary);
	}

	async existsForUser(userId: string, origin: string): Promise<boolean> {
		return await this.repository.existsForUser(userId, origin);
	}

	/** Returns `null` when the user already linked this origin. */
	async create(input: NewLinkedInstanceInput): Promise<LinkedInstanceSummary | null> {
		const row = await this.repository.createForUser({
			userId: input.userId,
			name: input.name,
			baseUrl: input.origin,
			tokenEncrypted: await this.cipher.encryptV2(input.token),
			status: input.status,
			lastVerifiedAt: input.verifiedAt,
		});
		return row ? toSummary(row) : null;
	}

	/** Returns `false` when the user has no link with this id. */
	async deleteForUser(userId: string, id: string): Promise<boolean> {
		if (!isLinkedInstanceId(id)) return false;
		return await this.repository.deleteForUser(userId, id);
	}

	/** Decrypts the token for one request. Returns `null` when the user has no link with this id. */
	async readCredentials(userId: string, id: string): Promise<LinkedInstanceCredentials | null> {
		if (!isLinkedInstanceId(id)) return null;
		const row = await this.repository.findForUser(userId, id);
		if (!row) return null;
		return { origin: row.baseUrl, token: await this.cipher.decryptV2(row.tokenEncrypted) };
	}
}
