// TODO(IAM-497 follow-up): replace the stub bodies below with real
// `makeRestApiRequest` calls once `EncryptionKeyResponseDto` in
// `@n8n/api-types` is extended with `archivedAt` and `createdBy`.
// Only the function bodies need to change — signatures are final.
import type { IRestApiContext } from '@n8n/rest-api-client';

import type { EncryptionKey } from './encryption-keys.types';

const STUB_LATENCY_MS = 250;

const STUB_USERS = [
	{ id: 'user-1', firstName: 'Sindhuja', lastName: 'Jeyabal', email: 'sindhuja.jeyabal@n8n.io' },
	{ id: 'user-2', firstName: 'Jonathan', lastName: 'Clift', email: 'jonathan.clift@n8n.io' },
	{ id: 'user-3', firstName: 'Niklas', lastName: 'Hatje', email: 'niklas@n8n.io' },
] as const;

const STUB_KEYS: EncryptionKey[] = [
	{
		id: '4d51a27b8f03a6d20863',
		type: 'data_encryption',
		algorithm: 'aes-256-gcm',
		status: 'active',
		activatedAt: '2026-04-21T10:00:00.000Z',
		archivedAt: null,
		createdBy: STUB_USERS[0],
	},
	{
		id: '74f6c1e9b4d8a2f51234',
		type: 'data_encryption',
		algorithm: 'aes-256-gcm',
		status: 'inactive',
		activatedAt: '2026-03-15T10:00:00.000Z',
		archivedAt: '2026-04-21T10:00:00.000Z',
		createdBy: STUB_USERS[1],
	},
	{
		id: 'bcf13a5d6f2c8e9b3456',
		type: 'data_encryption',
		algorithm: 'aes-256-gcm',
		status: 'inactive',
		activatedAt: '2025-12-01T10:00:00.000Z',
		archivedAt: '2026-03-15T10:00:00.000Z',
		createdBy: STUB_USERS[2],
	},
	{
		id: '7a9c2e4f8b1d6a3c1357',
		type: 'data_encryption',
		algorithm: 'aes-256-gcm',
		status: 'inactive',
		activatedAt: '2025-08-20T10:00:00.000Z',
		archivedAt: '2025-12-01T10:00:00.000Z',
		createdBy: STUB_USERS[2],
	},
	{
		id: 'c9d35b7e1a6f4d289753',
		type: 'data_encryption',
		algorithm: 'aes-256-gcm',
		status: 'inactive',
		activatedAt: '2025-05-06T10:00:00.000Z',
		archivedAt: '2025-08-20T10:00:00.000Z',
		createdBy: STUB_USERS[0],
	},
];

let stubState: EncryptionKey[] = STUB_KEYS.map((key) => ({ ...key }));

const wait = async (ms: number) => await new Promise<void>((resolve) => setTimeout(resolve, ms));

const randomHexId = (length = 20) => {
	const chars = '0123456789abcdef';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
};

export const getEncryptionKeys = async (_context: IRestApiContext): Promise<EncryptionKey[]> => {
	await wait(STUB_LATENCY_MS);
	return stubState.map((key) => ({ ...key }));
};

export const rotateEncryptionKey = async (_context: IRestApiContext): Promise<EncryptionKey> => {
	await wait(STUB_LATENCY_MS * 2);
	const now = new Date().toISOString();
	stubState = stubState.map((key) =>
		key.status === 'active' ? { ...key, status: 'inactive', archivedAt: now } : key,
	);
	const creator = stubState[0]?.createdBy ?? STUB_USERS[0];
	const next: EncryptionKey = {
		id: randomHexId(),
		type: 'data_encryption',
		algorithm: 'aes-256-gcm',
		status: 'active',
		activatedAt: now,
		archivedAt: null,
		createdBy: creator,
	};
	stubState = [next, ...stubState];
	return { ...next };
};
