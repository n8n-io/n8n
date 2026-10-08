import { randomBytes, randomUUID } from 'node:crypto';

import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { Cipher } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { LinkedInstance } from '../database/entities/linked-instance.entity';
import type { LinkedInstanceRepository } from '../database/repositories/linked-instance.repository';
import { LinkedInstanceStore } from '../linked-instance.store';
import { LinkedInstancesService } from '../linked-instances.service';
import type {
	RemoteInstanceClient,
	RemoteInstanceClientFactory,
} from '../remote/remote-instance.client';

export const CLOUD = 'https://acme.app.n8n.cloud';
export const CREATED_AT = '2026-10-07T12:00:00.000Z';

/** A new fake token for each call, so no test holds a fixed secret-like string. */
export const fakeToken = () => `n8n_test_${randomBytes(16).toString('hex')}`;

/** Reversible, and the ciphertext never contains the clear text. */
export const fakeCipher = () => {
	const cipher = mock<Cipher>();
	cipher.encryptV2.mockImplementation(
		async (data) =>
			`enc:${Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)).toString('base64')}`,
	);
	cipher.decryptV2.mockImplementation(async (data) =>
		Buffer.from(data.slice(4), 'base64').toString(),
	);
	return cipher;
};

/** An in-memory repository with the same ownership rules as the real one. */
export function fakeRepository() {
	const rows: LinkedInstance[] = [];
	const repository = mock<LinkedInstanceRepository>();
	const owned = (userId: string, id: string) => (row: LinkedInstance) =>
		row.userId === userId && row.id === id;
	const change = (userId: string, id: string, values: Partial<LinkedInstance>) => {
		const row = rows.find(owned(userId, id));
		if (!row) return false;
		Object.assign(row, values, { updatedAt: new Date() });
		return true;
	};

	repository.listForUser.mockImplementation(async (userId) =>
		rows.filter((row) => row.userId === userId),
	);
	repository.findForUser.mockImplementation(
		async (userId, id) => rows.find(owned(userId, id)) ?? null,
	);
	repository.existsForUser.mockImplementation(async (userId, baseUrl) =>
		rows.some((row) => row.userId === userId && row.baseUrl === baseUrl),
	);
	repository.createForUser.mockImplementation(async (input) => {
		if (rows.some((row) => row.userId === input.userId && row.baseUrl === input.baseUrl)) {
			return null;
		}
		const now = new Date(CREATED_AT);
		const row = { id: randomUUID(), ...input, createdAt: now, updatedAt: now } as LinkedInstance;
		rows.push(row);
		return row;
	});
	repository.updateForUser.mockImplementation(async (userId, id, update) =>
		change(userId, id, update),
	);
	repository.updateStatus.mockImplementation(async (userId, id, status, lastVerifiedAt) =>
		change(userId, id, { status, lastVerifiedAt }),
	);
	repository.deleteForUser.mockImplementation(async (userId, id) => {
		const index = rows.findIndex(owned(userId, id));
		if (index === -1) return false;
		rows.splice(index, 1);
		return true;
	});
	return { repository, rows };
}

export function setup() {
	const { repository, rows } = fakeRepository();
	const cipher = fakeCipher();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const client = mock<RemoteInstanceClient>();
	client.probe.mockResolvedValue({ ok: true, toolNames: ['search_workflows'] });
	const clientFactory = mock<RemoteInstanceClientFactory>();
	clientFactory.create.mockReturnValue(client);
	const service = new LinkedInstancesService(
		logger,
		new LinkedInstanceStore(repository, cipher),
		clientFactory,
	);
	return { service, repository, rows, cipher, logger, client, clientFactory };
}

export const user = (id = randomUUID()) => mock<User>({ id });

/** Checks the class and the exact message of a rejection. */
export async function expectRejection(
	promise: Promise<unknown>,
	errorClass: new (message: string) => Error,
	message: string,
) {
	const error = await promise.then(
		() => undefined,
		(e: unknown) => e,
	);
	expect(error).toBeInstanceOf(errorClass);
	expect(error).toHaveProperty('message', message);
}

type RemoteProjectOutput = { id: string; name: string; type: string };

// Projects as `search_projects` lists them. The ids have the format of n8n project ids.
export const OPS: RemoteProjectOutput = { id: 'Xk3pQ9aZ1bC2dE4f', name: 'Ops', type: 'team' };
export const SALES: RemoteProjectOutput = { id: 'Sa1eS0pQ9aZ1bC2d', name: 'Sales', type: 'team' };
export const PERSONAL: RemoteProjectOutput = {
	id: 'Pm0rT8sU7vW6xY5z',
	name: 'Ada Lovelace <ada@acme.test>',
	type: 'personal',
};

/** The structured output of `search_projects` on an n8n instance: team projects first. */
export const searchProjectsOutput = (data: RemoteProjectOutput[], teamProjectsEnabled = true) => ({
	data,
	count: data.length,
	teamProjectsEnabled,
});
