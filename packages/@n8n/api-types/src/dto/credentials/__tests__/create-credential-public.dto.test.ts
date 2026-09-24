import { CreateCredentialPublicDto } from '../credential-public.dto';

const input = { name: 'Source credential', type: 'githubApi', data: { accessToken: 'secret' } };

describe('CreateCredentialPublicDto', () => {
	test.each([undefined, 'source123', '12345', 'x'.repeat(16), 'source-ID_123'])(
		'preserves the supplied ID %j',
		(id) => {
			const result = CreateCredentialPublicDto.parse({ ...input, id, unknown: true });
			expect(result.id).toBe(id);
			expect(result).not.toHaveProperty('unknown');
		},
	);

	test.each([
		'',
		'x'.repeat(17),
		'c9cc7ffd-2c38-44a1-a9a6-03eb9da46c70',
		'team/github',
		'team?github',
		'team#github',
		'team%2Fgithub',
		'team\\github',
		'.',
		'..',
		' source ',
		'source\n',
		null,
		42,
		[],
		{},
	])('rejects invalid ID %j', (id) => {
		expect(CreateCredentialPublicDto.safeParse({ ...input, id }).success).toBe(false);
	});

	test.each(['createdAt', 'updatedAt'])('keeps %s read-only', (field) => {
		expect(
			CreateCredentialPublicDto.safeParse({ ...input, [field]: new Date().toISOString() }).success,
		).toBe(false);
	});

	test('requires credential data', () => {
		expect(
			CreateCredentialPublicDto.safeParse({ id: 'source', name: input.name, type: input.type })
				.success,
		).toBe(false);
	});
});
