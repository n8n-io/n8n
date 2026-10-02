import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { BrowserLocalMcpServer } from '../browser/browser-local-mcp-server';
import { BrowserRouterLocalMcpServer } from '../browser/browser-router-local-mcp-server';
import { BrowserRouterService } from '../browser/browser-router.service';
import type { CloudBrowserService } from '../browser/cloud-browser.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';

import * as mcpBrowser from '@n8n/mcp-browser';

vi.mock('@n8n/mcp-browser', () => ({
	createBrowserTools: vi.fn(),
}));

const createBrowserTools = mcpBrowser.createBrowserTools as unknown as Mock;

function toolDefinition(name: string) {
	return {
		name,
		description: name,
		inputSchema: z.object({}),
		execute: vi.fn(),
		getAffectedResources: vi.fn(),
	};
}

const user = mock<User>({ id: 'user-1' });
const START = { name: 'browser_start_session', arguments: {} };

describe('BrowserRouterService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const cloudBrowserService = mock<CloudBrowserService>();
	const settingsService = mock<InstanceAiSettingsService>();
	const extensionServer = mock<BrowserLocalMcpServer>();
	let service: BrowserRouterService;

	const resolve = async (
		overrides: Partial<Parameters<BrowserRouterService['resolveForRun']>[0]> = {},
	) =>
		await service.resolveForRun({
			user,
			threadId: 'thread-1',
			runId: 'run-1',
			extensionServer: undefined,
			cloudBrowserEnabled: true,
			...overrides,
		});

	beforeEach(() => {
		vi.clearAllMocks();
		createBrowserTools.mockReturnValue({
			tools: [toolDefinition('browser_connect'), toolDefinition('browser_navigate')],
			connection: {},
		});
		cloudBrowserService.getSessionServer.mockReturnValue(undefined);
		cloudBrowserService.startSession.mockResolvedValue(mock<BrowserLocalMcpServer>());
		settingsService.getBrowserUsePreference.mockReturnValue(undefined);
		service = new BrowserRouterService(logger, cloudBrowserService, settingsService);
	});

	it('gives the extension server when the cloud browser is off', async () => {
		expect(await resolve({ cloudBrowserEnabled: false, extensionServer })).toBe(extensionServer);
		expect(await resolve({ cloudBrowserEnabled: false })).toBeUndefined();
	});

	it('gives a cloud router that lists the browser tools when only the cloud browser is on', async () => {
		const router = await resolve();

		expect(router).toBeInstanceOf(BrowserRouterLocalMcpServer);
		expect(router?.getAvailableTools().map((tool) => tool.name)).toEqual([
			'browser_start_session',
			'browser_end_session',
			'browser_navigate',
		]);

		await router?.callTool(START);
		await router?.callTool({ name: 'browser_end_session', arguments: {} });
		expect(cloudBrowserService.startSession).toHaveBeenCalledWith('user-1', 'run-1');
		expect(cloudBrowserService.endSession).toHaveBeenCalledWith('run-1');
	});

	it('builds the browser tool list only once', async () => {
		await resolve();
		await resolve({ runId: 'run-2' });

		expect(createBrowserTools).toHaveBeenCalledTimes(1);
	});

	it("hands the run's open cloud session to a new router, even with the extension connected", async () => {
		const sessionServer = mock<BrowserLocalMcpServer>();
		sessionServer.callTool.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
		cloudBrowserService.getSessionServer.mockReturnValue(sessionServer);

		const router = await resolve({ extensionServer });
		await router?.callTool({ name: 'browser_navigate', arguments: {} });

		expect(sessionServer.callTool).toHaveBeenCalled();
		expect(cloudBrowserService.startSession).not.toHaveBeenCalled();
	});

	describe('with the extension connected too', () => {
		it('follows a saved "local" preference', async () => {
			settingsService.getBrowserUsePreference.mockReturnValue('local');

			expect(await resolve({ extensionServer })).toBe(extensionServer);
		});

		it('follows a saved "cloud" preference without asking', async () => {
			settingsService.getBrowserUsePreference.mockReturnValue('cloud');

			const router = await resolve({ extensionServer });
			const result = await router?.callTool(START);

			expect(result?.isError).toBeUndefined();
			expect(cloudBrowserService.startSession).toHaveBeenCalled();
		});

		it('asks, then saves an "always" choice to the user preferences', async () => {
			const router = await resolve({ extensionServer });

			const asked = await router?.callTool(START);
			await router?.callTool({ ...START, arguments: { _confirmation: 'useCloudBrowserAlways' } });

			expect(asked?.isError).toBe(true);
			expect(settingsService.updateUserPreferences).toHaveBeenCalledWith(user, {
				browserUsePreference: 'cloud',
			});
		});

		it('remembers a "this chat" choice for later runs of the same chat only', async () => {
			const router = await resolve({ extensionServer });
			await router?.callTool({ ...START, arguments: { _confirmation: 'useLocalBrowserForChat' } });

			expect(await resolve({ extensionServer, runId: 'run-2' })).toBe(extensionServer);
			expect(await resolve({ extensionServer, threadId: 'thread-2' })).toBeInstanceOf(
				BrowserRouterLocalMcpServer,
			);
			expect(settingsService.updateUserPreferences).not.toHaveBeenCalled();
		});
	});
});
