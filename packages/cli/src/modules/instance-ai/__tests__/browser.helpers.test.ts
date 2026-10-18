import type { User, UserRepository } from '@n8n/db';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import type { ToolDefinition } from '@n8n/mcp-browser';
import { z } from 'zod';

import {
	createBrowserCredential,
	createBrowserWorkDir,
	createInMemorySecretsBuffer,
	executeBrowserTool,
	toBrowserMcpTool,
} from '../browser/browser.helpers';

vi.mock('node:fs/promises', () => ({ mkdir: vi.fn().mockResolvedValue(undefined) }));

describe('createInMemorySecretsBuffer', () => {
	it('keeps the fields captured for each credential apart', () => {
		const buffer = createInMemorySecretsBuffer();

		buffer.capture('acme', 'apiKey', 'key-1');
		buffer.capture('acme', 'apiSecret', 'secret-1');
		buffer.capture('other', 'apiKey', 'key-2');

		expect(buffer.getFields('acme')).toEqual(
			new Map([
				['apiKey', 'key-1'],
				['apiSecret', 'secret-1'],
			]),
		);
		expect(buffer.getFields('other')).toEqual(new Map([['apiKey', 'key-2']]));
	});

	it('forgets a credential once it is cleared', () => {
		const buffer = createInMemorySecretsBuffer();
		buffer.capture('acme', 'apiKey', 'key-1');

		buffer.clear('acme');

		expect(buffer.getFields('acme')).toBeUndefined();
	});
});

describe('createBrowserCredential', () => {
	const payload = { name: 'Acme API', type: 'httpHeaderAuth', data: { value: 'secret' } };
	const userRepository = mock<UserRepository>();
	const credentialsService = mock<CredentialsService>();

	beforeEach(() => vi.clearAllMocks());

	it('creates the credential as the user', async () => {
		const user = mock<User>({ id: 'user-1' });
		userRepository.findOne.mockResolvedValue(user);
		credentialsService.createUnmanagedCredential.mockResolvedValue({ id: 'cred-1' } as never);

		const result = await createBrowserCredential(
			userRepository,
			credentialsService,
			'user-1',
			payload,
		);

		expect(result).toEqual({ credentialId: 'cred-1' });
		expect(userRepository.findOne).toHaveBeenCalledWith({
			where: { id: 'user-1' },
			relations: ['role'],
		});
		expect(credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(payload, user);
	});

	it('creates nothing when the user does not exist', async () => {
		userRepository.findOne.mockResolvedValue(null);

		await expect(
			createBrowserCredential(userRepository, credentialsService, 'user-1', payload),
		).rejects.toThrow('User for browser session not found');
		expect(credentialsService.createUnmanagedCredential).not.toHaveBeenCalled();
	});
});

describe('executeBrowserTool', () => {
	const toolContext = { dir: '/tmp' };

	function fakeTool(execute: ToolDefinition['execute']) {
		return {
			name: 'browser_click',
			inputSchema: z.object({ ref: z.string() }),
			execute: vi.fn(execute),
		} as unknown as ToolDefinition & { execute: ReturnType<typeof vi.fn> };
	}

	it.each([
		['an error', true, { isError: true }],
		['a success', undefined, {}],
	])(
		'returns %s whose content is not in the MCP shape as JSON text',
		async (_case, isError, expected) => {
			const content = [{ type: 'unsupported', data: 1 }];
			const tool = fakeTool(async () => ({ content, isError }) as never);

			const result = await executeBrowserTool(tool, { ref: 'e1' }, toolContext);

			expect(result).toEqual({
				content: [{ type: 'text', text: JSON.stringify(content) }],
				...expected,
			});
		},
	);

	it('runs the tool with the parsed arguments', async () => {
		const tool = fakeTool(async () => ({ content: [{ type: 'text', text: 'clicked' }] }));

		const result = await executeBrowserTool(tool, { ref: 'e1' }, toolContext);

		expect(result).toEqual({ content: [{ type: 'text', text: 'clicked' }] });
		expect(tool.execute).toHaveBeenCalledWith({ ref: 'e1' }, toolContext);
	});

	it('returns the access result without running the tool', async () => {
		const tool = fakeTool(async () => ({ content: [] }));
		const denied = { content: [{ type: 'text' as const, text: 'denied' }], isError: true };
		const checkAccess = vi.fn().mockResolvedValue(denied);

		const result = await executeBrowserTool(tool, { ref: 'e1' }, toolContext, checkAccess);

		expect(result).toBe(denied);
		expect(checkAccess).toHaveBeenCalledWith({ ref: 'e1' });
		expect(tool.execute).not.toHaveBeenCalled();
	});

	it('returns an error for arguments that do not parse, without checking access', async () => {
		const tool = fakeTool(async () => ({ content: [] }));
		const checkAccess = vi.fn();

		const result = await executeBrowserTool(tool, { ref: 1 }, toolContext, checkAccess);

		expect(result.isError).toBe(true);
		expect(checkAccess).not.toHaveBeenCalled();
	});

	it('keeps the text of a thrown value that is not an Error', async () => {
		const tool = fakeTool(async () => {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw 'browser went away';
		});

		const result = await executeBrowserTool(tool, { ref: 'e1' }, toolContext);

		expect(result).toEqual({
			content: [{ type: 'text', text: 'browser went away' }],
			isError: true,
		});
	});
});

describe('createBrowserWorkDir', () => {
	it('creates a folder for the user under the given folder name', async () => {
		const workDir = await createBrowserWorkDir('n8n-instance-ai-cloud-browser', 'user-1');

		const expected = join(tmpdir(), 'n8n-instance-ai-cloud-browser', 'user-1');
		expect(workDir).toBe(expected);
		expect(mkdir).toHaveBeenCalledWith(expected, { recursive: true });
	});
});

describe('toBrowserMcpTool', () => {
	it('converts a tool with an object input schema', () => {
		const tool = {
			name: 'browser_click',
			description: 'Click',
			inputSchema: z.object({ ref: z.string() }),
		} as unknown as ToolDefinition;

		expect(toBrowserMcpTool(tool)).toEqual(
			expect.objectContaining({ name: 'browser_click', annotations: { category: 'browser' } }),
		);
	});

	it('gives nothing for an input schema that has no MCP form', () => {
		const tool = {
			name: 'browser_odd',
			description: 'Odd',
			inputSchema: z.string(),
		} as unknown as ToolDefinition;

		expect(toBrowserMcpTool(tool)).toBeUndefined();
	});
});
