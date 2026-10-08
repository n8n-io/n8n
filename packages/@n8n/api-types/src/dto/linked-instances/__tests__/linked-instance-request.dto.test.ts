import { randomBytes } from 'node:crypto';

import { LinkInstanceRequestDto } from '../link-instance-request.dto';
import { LINKED_INSTANCE_INPUT_MESSAGES as MESSAGES } from '../linked-instance.schema';
import { UpdateLinkedInstanceRequestDto } from '../update-linked-instance-request.dto';

const fakeToken = () => `tok_${randomBytes(12).toString('hex')}`;

const firstIssue = (result: { success: boolean; error?: { issues: unknown[] } }) =>
	result.error?.issues[0];

describe('LinkInstanceRequestDto', () => {
	const valid = (overrides: Record<string, unknown> = {}) => ({
		name: 'Cloud',
		url: 'acme.app.n8n.cloud',
		token: fakeToken(),
		...overrides,
	});

	it('accepts a link request and trims the name and the token', () => {
		const token = fakeToken();

		const result = LinkInstanceRequestDto.safeParse(
			valid({ name: '  Cloud (prod)  ', token: ` ${token}\n` }),
		);

		expect(result.data).toEqual({ name: 'Cloud (prod)', url: 'acme.app.n8n.cloud', token });
	});

	// The server normalises the address, so the DTO must not reject what users type.
	it.each(['acme.app.n8n.cloud', 'localhost:5678', 'http://127.0.0.1:5680/', ''])(
		'leaves the address %j to the server',
		(url) => {
			expect(LinkInstanceRequestDto.safeParse(valid({ url })).success).toBe(true);
		},
	);

	it('accepts an address of 2048 characters and rejects a longer one', () => {
		const at = (length: number) => `https://a.example/${'a'.repeat(length - 18)}`;

		expect(LinkInstanceRequestDto.safeParse(valid({ url: at(2048) })).success).toBe(true);
		const result = LinkInstanceRequestDto.safeParse(valid({ url: at(2049) }));
		expect(firstIssue(result)).toMatchObject({ path: ['url'], message: MESSAGES.url });
	});

	it.each([
		['an empty name', ''],
		['a name of only spaces', '   '],
		['a name over 64 characters', 'a'.repeat(65)],
		['markup', '<b>Cloud</b>'],
		['a line break', 'Cloud\nprod'],
		['a quote', 'Cloud "prod"'],
	])('rejects %s with the en-GB name message', (_, name) => {
		const result = LinkInstanceRequestDto.safeParse(valid({ name }));

		expect(firstIssue(result)).toMatchObject({ path: ['name'], message: MESSAGES.name });
	});

	it.each(['Café Cloud', 'prod-eu_2 (v1.0)', 'a'.repeat(64)])('accepts the name %j', (name) => {
		expect(LinkInstanceRequestDto.safeParse(valid({ name })).data?.name).toBe(name);
	});

	it.each([
		['an empty token', ''],
		['a token over 4096 characters', 'a'.repeat(4097)],
		['a token with a space inside', 'abc def'],
		['a token with an accented letter', 'tokén'],
		['a token with a zero-width space inside', 'abc​def'],
	])('rejects %s with the en-GB token message', (_, token) => {
		const result = LinkInstanceRequestDto.safeParse(valid({ token }));

		expect(firstIssue(result)).toMatchObject({ path: ['token'], message: MESSAGES.token });
	});

	it('accepts a token of 4096 characters', () => {
		const token = 'a'.repeat(4096);

		expect(LinkInstanceRequestDto.safeParse(valid({ token })).data?.token).toBe(token);
	});

	it('never repeats the token in a validation issue', () => {
		const token = `${fakeToken()} ${fakeToken()}`;

		const result = LinkInstanceRequestDto.safeParse(valid({ token }));

		expect(result.success).toBe(false);
		expect(JSON.stringify(result.error)).not.toContain(token.split(' ')[0]);
	});

	it.each(['name', 'url', 'token'])('requires %s', (field) => {
		const body: Record<string, unknown> = valid();
		delete body[field];

		expect(firstIssue(LinkInstanceRequestDto.safeParse(body))).toMatchObject({ path: [field] });
	});

	it('drops fields that only the server sets', () => {
		const result = LinkInstanceRequestDto.safeParse(
			valid({ status: 'online', tokenEncrypted: 'x', defaultRemoteProjectId: 'p1' }),
		);

		expect(Object.keys(result.data ?? {}).sort()).toEqual(['name', 'token', 'url']);
	});
});

describe('UpdateLinkedInstanceRequestDto', () => {
	it('accepts each change alone, and no change at all', () => {
		const token = fakeToken();

		expect(UpdateLinkedInstanceRequestDto.safeParse({ name: ' Laptop ' }).data).toEqual({
			name: 'Laptop',
		});
		expect(UpdateLinkedInstanceRequestDto.safeParse({ token }).data).toEqual({ token });
		expect(
			UpdateLinkedInstanceRequestDto.safeParse({ defaultRemoteProjectId: 'Ab3_x-9' }).data,
		).toEqual({ defaultRemoteProjectId: 'Ab3_x-9' });
		expect(UpdateLinkedInstanceRequestDto.safeParse({}).data).toEqual({});
	});

	it('applies the link rules to the name and the token', () => {
		expect(firstIssue(UpdateLinkedInstanceRequestDto.safeParse({ name: '' }))).toMatchObject({
			message: MESSAGES.name,
		});
		expect(firstIssue(UpdateLinkedInstanceRequestDto.safeParse({ token: 'a b' }))).toMatchObject({
			message: MESSAGES.token,
		});
	});

	it.each([
		['an empty id', ''],
		['an id over 36 characters', 'a'.repeat(37)],
		['an id with a slash', '../projects'],
		['an id with a space', 'a b'],
		['null', null],
	])('rejects %s as the default project', (_, defaultRemoteProjectId) => {
		const result = UpdateLinkedInstanceRequestDto.safeParse({ defaultRemoteProjectId });

		expect(firstIssue(result)).toMatchObject({ path: ['defaultRemoteProjectId'] });
	});

	it.each(['a', 'a'.repeat(36), '6bd0d6a4-8f43-4a8e-a5b6-1c2d3e4f5a6b'])(
		'accepts the project id %j',
		(defaultRemoteProjectId) => {
			expect(UpdateLinkedInstanceRequestDto.safeParse({ defaultRemoteProjectId }).success).toBe(
				true,
			);
		},
	);
});
