import { randomBytes } from 'node:crypto';

import { LINKED_INSTANCE_INPUT_MESSAGES } from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';

import {
	ADDRESS_ERROR_MESSAGES,
	LINK_INPUT_MESSAGES,
	parseLinkName,
	parseLinkToken,
	parseLinkUpdate,
} from '../link-input';

const fakeToken = () => `tok_${randomBytes(12).toString('hex')}`;

function expectBadRequest(run: () => unknown, message: string) {
	let error: unknown;
	try {
		run();
	} catch (e) {
		error = e;
	}
	expect(error).toBeInstanceOf(BadRequestError);
	expect(error).toHaveProperty('message', message);
}

describe('link input messages', () => {
	it('shares the messages that the request DTOs give', () => {
		expect(LINK_INPUT_MESSAGES.name).toBe(LINKED_INSTANCE_INPUT_MESSAGES.name);
		expect(LINK_INPUT_MESSAGES.token).toBe(LINKED_INSTANCE_INPUT_MESSAGES.token);
		expect(LINK_INPUT_MESSAGES.defaultRemoteProjectId).toBe(
			LINKED_INSTANCE_INPUT_MESSAGES.defaultRemoteProjectId,
		);
		expect(ADDRESS_ERROR_MESSAGES.invalid).toBe(LINKED_INSTANCE_INPUT_MESSAGES.url);
	});

	it('names each problem in en-GB', () => {
		expect(LINK_INPUT_MESSAGES).toEqual({
			name: 'Enter a name of 1 to 64 characters. Use only letters, digits, spaces and these characters: - _ . ( )',
			token:
				'Enter an access token of 1 to 4096 characters. Use only the letters A to Z, digits and symbols, without spaces or accented characters.',
			defaultRemoteProjectId: 'Choose a project that this access token can see in that instance.',
			noChange: 'Change the name, the access token or the default project.',
		});
		expect(ADDRESS_ERROR_MESSAGES).toEqual({
			empty: 'Enter the address of the n8n instance.',
			invalid: 'That address is not valid. Check it and try again.',
			'unsupported-protocol': 'Enter an address that starts with https://',
			'insecure-http':
				'Use https:// for this address. Plain http:// works only for an instance on this computer.',
			'has-credentials': 'Remove the user name and password from the address.',
		});
	});
});

describe('parseLinkName', () => {
	it('trims a valid name', () => {
		expect(parseLinkName('  Cloud (prod) ')).toBe('Cloud (prod)');
	});

	it.each(['', '<b>Cloud</b>', 'a'.repeat(65), 42, undefined])('rejects %j', (name) => {
		expectBadRequest(() => parseLinkName(name), LINK_INPUT_MESSAGES.name);
	});
});

describe('parseLinkToken', () => {
	it('trims a valid token', () => {
		const token = fakeToken();

		expect(parseLinkToken(`\n${token} `)).toBe(token);
	});

	it.each(['', 'a b', 'tokén', 'a'.repeat(4097), 42, undefined])('rejects %j', (token) => {
		expectBadRequest(() => parseLinkToken(token), LINK_INPUT_MESSAGES.token);
	});
});

describe('parseLinkUpdate', () => {
	it('keeps only the fields that the user sent, cleaned', () => {
		const token = fakeToken();

		expect(parseLinkUpdate({ name: ' Laptop ' })).toEqual({ name: 'Laptop' });
		expect(parseLinkUpdate({ token: ` ${token}` })).toEqual({ token });
		expect(parseLinkUpdate({ defaultRemoteProjectId: 'Xk3pQ9aZ' })).toEqual({
			defaultRemoteProjectId: 'Xk3pQ9aZ',
		});
		expect(parseLinkUpdate({ name: 'Laptop', token, defaultRemoteProjectId: 'Xk3pQ9aZ' })).toEqual({
			name: 'Laptop',
			token,
			defaultRemoteProjectId: 'Xk3pQ9aZ',
		});
	});

	it('rejects a change that changes nothing', () => {
		expectBadRequest(() => parseLinkUpdate({}), LINK_INPUT_MESSAGES.noChange);
		expectBadRequest(
			() => parseLinkUpdate({ name: undefined, token: undefined }),
			LINK_INPUT_MESSAGES.noChange,
		);
	});

	it('rejects a name, a token or a project id that is not valid', () => {
		expectBadRequest(() => parseLinkUpdate({ name: 'a\nb' }), LINK_INPUT_MESSAGES.name);
		expectBadRequest(() => parseLinkUpdate({ token: 'a b' }), LINK_INPUT_MESSAGES.token);
		expectBadRequest(
			() => parseLinkUpdate({ defaultRemoteProjectId: '../x' }),
			LINK_INPUT_MESSAGES.defaultRemoteProjectId,
		);
		expectBadRequest(
			() => parseLinkUpdate({ defaultRemoteProjectId: '' }),
			LINK_INPUT_MESSAGES.defaultRemoteProjectId,
		);
	});

	it('checks every sent field, also when another field is valid', () => {
		expectBadRequest(
			() => parseLinkUpdate({ name: 'Laptop', token: 'a b' }),
			LINK_INPUT_MESSAGES.token,
		);
		expectBadRequest(
			() => parseLinkUpdate({ token: fakeToken(), defaultRemoteProjectId: 'a/b' }),
			LINK_INPUT_MESSAGES.defaultRemoteProjectId,
		);
	});
});
