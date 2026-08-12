import type { InterruptibleToolContext } from '@n8n/agents';
import { Container } from '@n8n/di';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { BrowserLocalMcpServer } from '@/modules/instance-ai/browser/browser-local-mcp-server';
import { InstanceAiBrowserSessionService } from '@/modules/instance-ai/browser/instance-ai-browser-session.service';
import { UrlService } from '@/services/url.service';

import { AgentBrowserSetupTokenService } from '../../browser-use/agent-browser-setup-token.service';
import { createBrowserUseTools } from '../browser-use-tools';

const AGENT_ID = 'agent-1';
const PERSISTENCE = { threadId: 'thread-1', resourceId: 'integration:slack:U123' };

function mockSessions(overrides: Partial<InstanceAiBrowserSessionService> = {}) {
	const sessions = mock<InstanceAiBrowserSessionService>({
		isConnected: vi.fn().mockReturnValue(false),
		findMcpServer: vi.fn().mockReturnValue(undefined),
		...overrides,
	});
	Container.set(InstanceAiBrowserSessionService, sessions);
	return sessions;
}

/** Invokes `browser_navigate` with a context shaped like the runtime's. */
async function callNavigate(
	ctx: Partial<InterruptibleToolContext> & { suspend: InterruptibleToolContext['suspend'] },
) {
	const tools = await createBrowserUseTools({ agentId: AGENT_ID });
	const navigate = tools.find((tool) => tool.name === 'browser_navigate');
	if (!navigate?.handler) throw new Error('browser_navigate was not built');

	return await navigate.handler({ url: 'https://example.com' }, {
		resumeData: undefined,
		...ctx,
	} as InterruptibleToolContext);
}

/** The card payload the tool suspends with, as the mapper would receive it. */
function suspendedCard(suspend: Mock) {
	return suspend.mock.calls[0][0] as {
		title: string;
		message: string;
		components: Array<Record<string, unknown>>;
	};
}

beforeEach(() => {
	Container.set(
		UrlService,
		mock<UrlService>({ getInstanceBaseUrl: () => 'http://localhost:5678' }),
	);
	Container.set(AgentBrowserSetupTokenService, new AgentBrowserSetupTokenService());
});

afterEach(() => {
	Container.reset();
	vi.restoreAllMocks();
});

describe('createBrowserUseTools', () => {
	it('exposes the browsing tools but not session lifecycle or credential capture', async () => {
		const { createBrowserTools } = await import('@n8n/mcp-browser');
		const allNames = createBrowserTools({ mode: 'remote' }).tools.map((tool) => tool.name);
		const excluded = [
			'browser_connect',
			'browser_disconnect',
			'browser_capture_secret',
			'browser_create_credential',
		];
		// Guards the exclusion list against a rename upstream, which would
		// otherwise turn the assertions below into no-ops.
		expect(allNames).toEqual(expect.arrayContaining(excluded));

		const names = (await createBrowserUseTools({ agentId: AGENT_ID })).map((tool) => tool.name);

		expect(names).toEqual(allNames.filter((name) => !excluded.includes(name)));
		expect(names).toEqual(
			expect.arrayContaining(['browser_navigate', 'browser_tab_open', 'browser_click']),
		);
	});

	it('suspends with a setup link when no browser is connected', async () => {
		mockSessions();
		const suspend = vi.fn();

		await callNavigate({ persistence: PERSISTENCE, suspend });

		expect(suspend).toHaveBeenCalledTimes(1);
		const card = suspendedCard(suspend);
		expect(card.title).toBe('Connect Browser Use');
		expect(card.message).toContain('http://localhost:5678/browser-use/connect?token=bus_');
		expect(card.components).toContainEqual(
			expect.objectContaining({ type: 'button', value: 'continue' }),
		);
	});

	it('reuses the same setup link across repeated calls', async () => {
		mockSessions();
		const suspend = vi.fn();

		await callNavigate({ persistence: PERSISTENCE, suspend });
		await callNavigate({ persistence: PERSISTENCE, suspend });

		const [first, second] = suspend.mock.calls.map((call) => call[0].message as string);
		expect(first).toBe(second);
	});

	it('forwards to the browser session once connected', async () => {
		const mcpServer = mock<BrowserLocalMcpServer>({
			callTool: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
		});
		mockSessions({
			isConnected: vi.fn().mockReturnValue(true),
			findMcpServer: vi.fn().mockReturnValue(mcpServer),
		});
		const suspend = vi.fn();

		const result = await callNavigate({ persistence: PERSISTENCE, suspend });

		expect(suspend).not.toHaveBeenCalled();
		expect(mcpServer.callTool).toHaveBeenCalledWith({
			name: 'browser_navigate',
			arguments: { url: 'https://example.com' },
		});
		expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }] });
	});

	it('errors instead of suspending again when the user came back still disconnected', async () => {
		mockSessions();
		const suspend = vi.fn();

		const result = await callNavigate({
			persistence: PERSISTENCE,
			suspend,
			resumeData: { type: 'button', value: 'continue' },
		});

		expect(suspend).not.toHaveBeenCalled();
		expect(result).toEqual(
			expect.objectContaining({
				isError: true,
				content: [expect.objectContaining({ text: expect.stringContaining('No browser') })],
			}),
		);
	});

	it('errors when the run has no end user to prompt', async () => {
		mockSessions();
		const suspend = vi.fn();

		const result = await callNavigate({ suspend });

		expect(suspend).not.toHaveBeenCalled();
		expect(result).toEqual(expect.objectContaining({ isError: true }));
	});
});
