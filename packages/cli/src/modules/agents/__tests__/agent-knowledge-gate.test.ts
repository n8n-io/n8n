import { isAgentKnowledgeBaseEnabled } from '../agent-knowledge-gate';

describe('isAgentKnowledgeBaseEnabled', () => {
	it('is enabled when direct Daytona sandbox config is complete, even without proxy', () => {
		expect(
			isAgentKnowledgeBaseEnabled({ sandboxEnabled: true, sandboxProvider: 'daytona' }, false),
		).toBe(true);
	});

	it('is enabled when the AI Assistant proxy is available, even without sandbox env vars', () => {
		expect(isAgentKnowledgeBaseEnabled({ sandboxEnabled: false, sandboxProvider: '' }, true)).toBe(
			true,
		);
	});

	it('is enabled when the proxy is available even if the sandbox provider is not daytona', () => {
		expect(
			isAgentKnowledgeBaseEnabled({ sandboxEnabled: true, sandboxProvider: 'n8n-sandbox' }, true),
		).toBe(true);
	});

	it('is disabled when neither the sandbox config nor the proxy is available', () => {
		expect(isAgentKnowledgeBaseEnabled({ sandboxEnabled: false, sandboxProvider: '' }, false)).toBe(
			false,
		);
	});

	it('is disabled when sandboxEnabled is true but the provider is not daytona and the proxy is unavailable', () => {
		expect(
			isAgentKnowledgeBaseEnabled({ sandboxEnabled: true, sandboxProvider: 'n8n-sandbox' }, false),
		).toBe(false);
	});
});
