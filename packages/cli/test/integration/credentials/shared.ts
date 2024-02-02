import type { ListQuery } from '@/requests';

import { randomName, randomString } from '../shared/random';

export const INVALID_PAYLOADS = [
	{
		type: randomName(),
		nodesAccess: [{ nodeType: randomName() }],
		data: { accessToken: randomString(6, 16) },
	},
	{
		name: randomName(),
		nodesAccess: [{ nodeType: randomName() }],
		data: { accessToken: randomString(6, 16) },
	},
	{
		name: randomName(),
		type: randomName(),
		data: { accessToken: randomString(6, 16) },
	},
	{
		name: randomName(),
		type: randomName(),
		nodesAccess: [{ nodeType: randomName() }],
	},
	{},
	undefined,
];

export function validateMainCredentialData(
	credential: ListQuery.Credentials.WithOwnedByAndSharedWith,
) {
	const { name, type, nodesAccess, sharedWith, ownedBy } = credential;

	expect(typeof name).toBe('string');
	expect(typeof type).toBe('string');
	expect(typeof nodesAccess?.[0].nodeType).toBe('string');

	if (sharedWith) {
		expect(Array.isArray(sharedWith)).toBe(true);
	}

	if (ownedBy) {
		const { id, email, firstName, lastName } = ownedBy;

		expect(typeof id).toBe('string');
		expect(typeof email).toBe('string');
		expect(typeof firstName).toBe('string');
		expect(typeof lastName).toBe('string');
	}
}
