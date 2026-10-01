import type { Logger } from '@n8n/backend-common';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { BrowserLocalMcpServer } from '../browser/browser-local-mcp-server';
import { BrowserRouterService } from '../browser/browser-router.service';
import type { CloudBrowserService } from '../browser/cloud-browser.service';

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

describe('BrowserRouterService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const cloudBrowserService = mock<CloudBrowserService>();
	let service: BrowserRouterService;

	beforeEach(() => {
		createBrowserTools.mockReturnValue({
			tools: [toolDefinition('browser_connect'), toolDefinition('browser_navigate')],
			connection: {},
		});
		service = new BrowserRouterService(logger, cloudBrowserService);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('creates a router that lists the browser tools', async () => {
		const router = await service.createForRun({ userId: 'user-1', runId: 'run-1' });

		expect(router.getAvailableTools().map((tool) => tool.name)).toEqual([
			'browser_start_session',
			'browser_end_session',
			'browser_navigate',
		]);
	});

	it('builds the browser tool list only once', async () => {
		await service.createForRun({ userId: 'user-1', runId: 'run-1' });
		await service.createForRun({ userId: 'user-2', runId: 'run-2' });

		expect(createBrowserTools).toHaveBeenCalledTimes(1);
	});

	it('starts and ends cloud sessions for the run', async () => {
		cloudBrowserService.startSession.mockResolvedValue(mock<BrowserLocalMcpServer>());
		const router = await service.createForRun({ userId: 'user-1', runId: 'run-1' });

		await router.callTool({ name: 'browser_start_session', arguments: {} });
		await router.callTool({ name: 'browser_end_session', arguments: {} });

		expect(cloudBrowserService.startSession).toHaveBeenCalledWith('user-1', 'run-1');
		expect(cloudBrowserService.endSession).toHaveBeenCalledWith('run-1');
	});
});
