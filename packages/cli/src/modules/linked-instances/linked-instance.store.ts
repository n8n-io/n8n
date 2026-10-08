import type {
	LinkedInstanceRemoteProject,
	LinkedInstanceStatus,
	LinkedInstanceSummary,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { z } from 'zod';

import type { LinkedInstance } from './database/entities/linked-instance.entity';
import {
	LinkedInstanceRepository,
	type LinkedInstanceUpdate,
} from './database/repositories/linked-instance.repository';

export type NewLinkedInstanceInput = {
	userId: string;
	name: string;
	origin: string;
	token: string;
	status: LinkedInstanceStatus;
	verifiedAt: Date;
	defaultRemoteProject: LinkedInstanceRemoteProject | null;
};

/** The fields that a change sets. A field that is left out keeps its value. */
export type LinkedInstanceChanges = {
	name?: string;
	token?: string;
	status?: LinkedInstanceStatus;
	verifiedAt?: Date;
	defaultRemoteProject?: LinkedInstanceRemoteProject | null;
};

export type LinkedInstanceCredentials = { origin: string; token: string };

const idSchema = z.string().uuid();

// A Postgres uuid column rejects other strings, so an id in another format matches no row.
function isLinkedInstanceId(id: string): boolean {
	return idSchema.safeParse(id).success;
}

function toSummary(row: LinkedInstance): LinkedInstanceSummary {
	const { defaultRemoteProjectId: projectId, defaultRemoteProjectName: projectName } = row;
	return {
		id: row.id,
		name: row.name,
		baseUrl: row.baseUrl,
		status: row.status,
		lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
		defaultRemoteProject: projectId && projectName ? { id: projectId, name: projectName } : null,
	};
}

function toProjectColumns(project: LinkedInstanceRemoteProject | null) {
	return {
		defaultRemoteProjectId: project?.id ?? null,
		defaultRemoteProjectName: project?.name ?? null,
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

	/** Returns `null` when the user has no link with this id. */
	async getForUser(userId: string, id: string): Promise<LinkedInstanceSummary | null> {
		if (!isLinkedInstanceId(id)) return null;
		const row = await this.repository.findForUser(userId, id);
		return row ? toSummary(row) : null;
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
			...toProjectColumns(input.defaultRemoteProject),
		});
		return row ? toSummary(row) : null;
	}

	/** Records the result of a check. Returns `null` when the user has no link with this id. */
	async updateStatus(
		userId: string,
		id: string,
		status: LinkedInstanceStatus,
		verifiedAt: Date,
	): Promise<LinkedInstanceSummary | null> {
		if (!isLinkedInstanceId(id)) return null;
		if (!(await this.repository.updateStatus(userId, id, status, verifiedAt))) return null;
		return await this.getForUser(userId, id);
	}

	/**
	 * Sets the given fields in one statement. Encrypts a new token.
	 * Returns `null` when the user has no link with this id.
	 */
	async updateForUser(
		userId: string,
		id: string,
		changes: LinkedInstanceChanges,
	): Promise<LinkedInstanceSummary | null> {
		if (!isLinkedInstanceId(id)) return null;
		const update = await this.toUpdate(changes);
		if (!(await this.repository.updateForUser(userId, id, update))) return null;
		return await this.getForUser(userId, id);
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

	private async toUpdate(changes: LinkedInstanceChanges): Promise<LinkedInstanceUpdate> {
		const { name, token, status, verifiedAt, defaultRemoteProject } = changes;
		return {
			...(name === undefined ? {} : { name }),
			...(token === undefined ? {} : { tokenEncrypted: await this.cipher.encryptV2(token) }),
			...(status === undefined ? {} : { status }),
			...(verifiedAt === undefined ? {} : { lastVerifiedAt: verifiedAt }),
			...(defaultRemoteProject === undefined ? {} : toProjectColumns(defaultRemoteProject)),
		};
	}
}
