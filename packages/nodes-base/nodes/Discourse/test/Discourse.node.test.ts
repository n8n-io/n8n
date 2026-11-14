import { mock, mockDeep } from 'vitest-mock-extended';
import { NodeApiError } from 'n8n-workflow';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';

import { Discourse } from '../Discourse.node';

describe('Discourse Node', () => {
	const createContext = (parameters: IDataObject, typeVersion = 1.1) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => parameters[name] as never);
		context.getCredentials.mockResolvedValue({ url: 'https://forum.example.com' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		return context;
	};

	const requestedUri = (context: ReturnType<typeof createContext>) =>
		String(context.helpers.requestWithAuthentication.mock.calls[0][1].uri);

	it('should encode a group ID as one path segment', async () => {
		const context = createContext({
			resource: 'userGroup',
			operation: 'add',
			groupId: '41/admin',
			usernames: 'nathan',
		});

		await new Discourse().execute.call(context);

		expect(requestedUri(context)).toBe('https://forum.example.com/groups/41%2Fadmin/members.json');
	});

	it.each([
		{
			input: { resource: 'category', operation: 'update', categoryId: '12/admin', name: 'News' },
			path: '/categories/12%2Fadmin.json',
		},
		{
			input: { resource: 'post', operation: 'get', postId: '305/admin' },
			path: '/posts/305%2Fadmin',
		},
		{
			input: { resource: 'post', operation: 'update', postId: '305/admin', content: 'text' },
			path: '/posts/305%2Fadmin.json',
		},
		{
			input: { resource: 'group', operation: 'get', name: 'a/admin' },
			path: '/groups/a%2Fadmin',
		},
		{
			input: { resource: 'group', operation: 'update', groupId: '41/admin', name: 'staff' },
			path: '/groups/41%2Fadmin.json',
		},
	])(
		'should encode $input.resource $input.operation values as one path segment',
		async ({ input, path }) => {
			const context = createContext(input);

			await new Discourse().execute.call(context);

			expect(requestedUri(context)).toBe(`https://forum.example.com${path}`);
		},
	);

	it('should encode a username as one path segment', async () => {
		const context = createContext({
			resource: 'user',
			operation: 'get',
			by: 'username',
			username: 'admin/users',
		});

		await new Discourse().execute.call(context);

		expect(requestedUri(context)).toBe('https://forum.example.com/users/admin%2Fusers');
	});

	it('should reject a group ID with a dot segment', async () => {
		const context = createContext({
			resource: 'userGroup',
			operation: 'add',
			groupId: '41/../admin',
			usernames: 'nathan',
		});

		await expect(new Discourse().execute.call(context)).rejects.toThrow('Invalid identifier');
		expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});

	describe.each([
		{
			parameter: 'username',
			input: { resource: 'user', operation: 'get', by: 'username', username: 'caf%C3%A9%2Fa' },
			path: '/users/',
		},
		{
			parameter: 'external ID',
			input: { resource: 'user', operation: 'get', by: 'externalId', externalId: 'a%2Fb' },
			path: '/u/by-external/',
		},
		{
			parameter: 'group name',
			input: { resource: 'group', operation: 'get', name: 'a%2Fb' },
			path: '/groups/',
		},
	])('$parameter', ({ input, path }) => {
		const value = String(Object.values(input).at(-1));

		it('should decode the value once in version 1', async () => {
			const context = createContext(input, 1);

			await new Discourse().execute.call(context);

			expect(requestedUri(context)).toContain(
				`${path}${encodeURIComponent(decodeURIComponent(value))}`,
			);
		});

		it('should encode the value as entered in version 1.1', async () => {
			const context = createContext(input, 1.1);

			await new Discourse().execute.call(context);

			expect(requestedUri(context)).toContain(`${path}${value.replaceAll('%', '%25')}`);
		});
	});

	it('should reject a group ID that is a dot segment', async () => {
		const context = createContext({
			resource: 'group',
			operation: 'update',
			groupId: '..',
			name: 'staff-team',
		});

		await expect(new Discourse().execute.call(context)).rejects.toThrow('Invalid identifier');
		expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});

	it('should throw a NodeApiError for a base URL without a scheme', async () => {
		const context = createContext({ resource: 'post', operation: 'get', postId: '305' });
		context.getCredentials.mockResolvedValue({ url: 'forum.example.com' });

		await expect(new Discourse().execute.call(context)).rejects.toThrow(NodeApiError);
		expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});
});
