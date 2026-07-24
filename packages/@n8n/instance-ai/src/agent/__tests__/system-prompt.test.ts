import { getDateTimeSection, getSystemPrompt } from '../system-prompt';

const ORIGINAL_ENABLED_MODULES = process.env.N8N_ENABLED_MODULES;

async function getSystemPromptWithEnabledModules(
	enabledModules: string | undefined,
): Promise<string> {
	vi.resetModules();
	if (enabledModules === undefined) {
		delete process.env.N8N_ENABLED_MODULES;
	} else {
		process.env.N8N_ENABLED_MODULES = enabledModules;
	}

	const { getSystemPrompt: getSystemPromptFresh } = await import('../system-prompt.js');
	return getSystemPromptFresh({});
}

afterEach(() => {
	if (ORIGINAL_ENABLED_MODULES === undefined) {
		delete process.env.N8N_ENABLED_MODULES;
	} else {
		process.env.N8N_ENABLED_MODULES = ORIGINAL_ENABLED_MODULES;
	}
});

describe('getDateTimeSection', () => {
	afterEach(() => vi.useRealTimers());

	it('renders the current time at minute precision (no seconds/milliseconds)', () => {
		vi.useFakeTimers().setSystemTime(new Date('2026-06-16T14:59:11.396Z'));

		const section = getDateTimeSection('UTC');

		expect(section).toContain('2026-06-16T14:59');
		// The sub-minute portion must be dropped so the cached prefix stays stable.
		expect(section).not.toContain('14:59:11');
		expect(section).not.toContain('.396');
	});

	it('is byte-stable across sub-minute calls', () => {
		vi.useFakeTimers().setSystemTime(new Date('2026-06-16T14:59:01.000Z'));
		const first = getDateTimeSection('UTC');

		vi.setSystemTime(new Date('2026-06-16T14:59:58.999Z'));
		const second = getDateTimeSection('UTC');

		expect(second).toBe(first);
	});
});

describe('getSystemPrompt', () => {
	it('keeps the cached prefix free of the current date/time so it stays cacheable', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).not.toContain('## Current Date and Time');
	});

	describe('first visible turn guidance', () => {
		it('instructs the agent to send a concise sentence before the first tool call', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('before your first tool call');
			expect(prompt).toContain('write one short sentence');
			expect(prompt).toContain("Keep it tied to the user's goal, not the tool name");
			expect(prompt).toContain('Never let an empty assistant message');
			expect(prompt).toContain('[Calling tools: ...]');
		});
	});

	describe('reply language', () => {
		it('keeps every user-visible message in the user language, tool-call narration included', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain("Reply in the user's language");
			expect(prompt).toContain('narration between tool calls');
			expect(prompt).toContain('do not let them pull your replies into English');
		});
	});

	describe('clarifying questions', () => {
		it('routes clarifying questions through ask-user instead of plain text', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('need clarification');
			expect(prompt).toContain('use the `ask-user` tool instead of asking in plain text');
		});

		it('does not route missing workflow setup values through ask-user before build', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('use `ask-user` only for choices that change the workflow intent');
			expect(prompt).toContain('Do not use `ask-user` before the first build');
			expect(prompt).toContain('leave them for post-build workflow setup');
		});
	});

	describe('tool discovery', () => {
		it('includes generic Tool Discovery guidance when deferred tool search is enabled', () => {
			const prompt = getSystemPrompt({ toolSearchEnabled: true });

			expect(prompt).toContain('## Tool Discovery');
			expect(prompt).toContain('you have access to more tools');
			expect(prompt).toContain('search "file" for filesystem tools');
			expect(prompt).toContain('search "n8n docs" for `n8n-docs`');
			expect(prompt).toContain('search "create tasks" for `create-tasks`');
			expect(prompt).toContain('search "eval" for `evals`');
			expect(prompt).not.toContain('connected service or MCP integration');
			expect(prompt).not.toContain('connected MCP integrations');
		});

		it('prompts the agent to search connected MCP integrations before declaring them unavailable', () => {
			const prompt = getSystemPrompt({
				toolSearchEnabled: true,
				mcpToolSearchEnabled: true,
			});

			expect(prompt).toContain('connected MCP integrations');
			expect(prompt).toContain('connected service or MCP integration');
			expect(prompt).toContain('call `search_tools` with the service name and task keywords');
			expect(prompt).toContain('before saying the integration is unavailable');
			expect(prompt).toContain('asking the user to connect it');
		});

		it('anchors examples to connected MCP tool searches', () => {
			const prompt = getSystemPrompt({
				toolSearchEnabled: true,
				mcpToolSearchEnabled: true,
			});

			expect(prompt).toContain(
				'search "notion page" or "linear issue" for the corresponding MCP tool',
			);
			expect(prompt).toContain('search "n8n docs" for `n8n-docs`');
		});

		it('omits Tool Discovery guidance when deferred tool search is disabled even if MCP tools exist', () => {
			const prompt = getSystemPrompt({ mcpToolSearchEnabled: true });

			expect(prompt).not.toContain('## Tool Discovery');
			expect(prompt).not.toContain('connected service or MCP integration');
		});
	});

	describe('license hints', () => {
		it('includes License Limitations section when hints are provided', () => {
			const prompt = getSystemPrompt({
				licenseHints: ['**Feature A** — requires Pro plan.'],
			});

			expect(prompt).toContain('## License Limitations');
			expect(prompt).toContain('**Feature A** — requires Pro plan.');
			expect(prompt).toContain('require a license upgrade');
		});

		it('renders multiple hints as a list', () => {
			const prompt = getSystemPrompt({
				licenseHints: [
					'**Feature A** — requires Pro plan.',
					'**Feature B** — requires Enterprise plan.',
				],
			});

			expect(prompt).toContain('- **Feature A** — requires Pro plan.');
			expect(prompt).toContain('- **Feature B** — requires Enterprise plan.');
		});

		it('omits License Limitations section when hints array is empty', () => {
			const prompt = getSystemPrompt({ licenseHints: [] });

			expect(prompt).not.toContain('License Limitations');
		});

		it('omits License Limitations section when hints are not provided', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).not.toContain('License Limitations');
		});
	});

	describe('read-only instance', () => {
		it('includes Read-Only Instance section when branchReadOnly is true', () => {
			const prompt = getSystemPrompt({ branchReadOnly: true });

			expect(prompt).toContain('## Read-Only Instance');
			expect(prompt).toContain('read-only mode');
			expect(prompt).toContain('Publishing/unpublishing');
			expect(prompt).toContain('credentials');
		});

		it('omits Read-Only Instance section when branchReadOnly is false', () => {
			const prompt = getSystemPrompt({ branchReadOnly: false });

			expect(prompt).not.toContain('Read-Only Instance');
		});

		it('omits Read-Only Instance section when branchReadOnly is not provided', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).not.toContain('Read-Only Instance');
		});
	});

	describe('secret handling guidance', () => {
		it('instructs the agent not to ask for plaintext secrets in chat', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('Never ask the user to paste passwords, API keys');
			expect(prompt).toContain(
				'credential setup, Computer Use browser credential capture, or existing credential selection',
			);
		});
	});

	describe('skill and follow-up routing', () => {
		it('allows multiple skill loads per turn instead of a single best-match load', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).not.toMatch(/load_skill.*once/i);
			expect(prompt).toContain('more than one skill');
		});

		it('requires loading gated skills before their tools', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain("Match the user's request against skill descriptions");
			expect(prompt).toContain(
				'Never call `data-tables` or `parse-file` without loading `data-table-manager` first',
			);
			expect(prompt).toContain(
				'never call `build-workflow` without loading `workflow-builder` first',
			);
			expect(prompt).toContain(
				'never call `create-tasks` without loading it via `load_tool` first',
			);
			expect(prompt).toContain('never call `n8n-docs` without loading it via `load_tool` first');
			expect(prompt).not.toContain('build-workflow-with-agent');
			expect(prompt).not.toContain('do not call `build-agent` at all');
		});

		it('omits build-agent and intent-gate prompt text regardless of agents module', async () => {
			const withAgents = await getSystemPromptWithEnabledModules('agents,instance-ai');
			const withoutAgents = await getSystemPromptWithEnabledModules(undefined);

			expect(withAgents).not.toContain('build-agent');
			expect(withAgents).not.toContain('Intent gate');
			expect(withoutAgents).not.toContain('build-agent');
			expect(withoutAgents).not.toContain('Intent gate');
		});

		it('describes error workflows as per-workflow and defers build steps to skills', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('n8n has no global/instance-wide error workflow setting');
			expect(prompt).toContain('Mention that only when the user explicitly asks');
			expect(prompt).toContain('`workflow-builder` and `post-build-flow`');
			expect(prompt).not.toContain('settings.errorWorkflow');
			expect(prompt).not.toContain('global error workflow for this instance');
		});

		it('points follow-up work at dedicated skills', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('`post-build-flow`');
			expect(prompt).toContain('`planned-task-runtime`');
			expect(prompt).not.toContain('postBuildFlow.required: true');
		});

		it('keeps replan stall prevention in the core follow-up triggers', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('<planned-task-follow-up type="replan">');
			expect(prompt).toContain('you MUST take action in this turn');
			expect(prompt).toContain('the thread will silently stall');
		});
	});

	describe('sandbox workspace', () => {
		it('omits sandbox workspace guidance when no runtime workspace is attached', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).not.toContain('## Sandbox workspace');
			expect(prompt).not.toContain('workspace_* tools');
			expect(prompt).not.toContain('Consult the knowledge base before planning or building');
		});

		it('includes sandbox workspace mechanics and defers catalog guidance to skills', () => {
			const prompt = getSystemPrompt({
				workspaceRoot: '/home/daytona/workspace',
			});

			expect(prompt).toContain('## Sandbox workspace');
			expect(prompt).toContain('Workspace root: `/home/daytona/workspace`');
			expect(prompt).toContain('workspace_* tools');
			expect(prompt).toContain('knowledge-base/');
			expect(prompt).not.toContain('workspace_list_files');
			expect(prompt).not.toContain('Consult the knowledge base before planning or building');
			expect(prompt).not.toContain('never load `templates/index.json` wholesale');
			expect(prompt).not.toContain('knowledge-base/best-practices/*.md');
		});

		it('includes the resolved workspace root when workspaceRoot is provided', () => {
			const prompt = getSystemPrompt({
				workspaceRoot: '/home/daytona/workspace',
			});

			expect(prompt).toContain('Workspace root: `/home/daytona/workspace`');
			expect(prompt).not.toContain('<workspace_root>');
		});
	});

	describe('trigger URL patterns', () => {
		const webhookBaseUrl = 'http://localhost:5678/webhook';
		const formBaseUrl = 'http://localhost:5678/form';

		it('keeps only instance base URLs in the prompt', () => {
			const prompt = getSystemPrompt({ webhookBaseUrl, formBaseUrl });

			expect(prompt).toContain('## Instance Info');
			expect(prompt).toContain('Webhook base URL: http://localhost:5678/webhook');
			expect(prompt).toContain('Form base URL: http://localhost:5678/form');
			expect(prompt).not.toContain('**Open chat**');
			expect(prompt).not.toContain('**Webhook Trigger**:');
			expect(prompt).not.toContain('**Form Trigger**:');
			expect(prompt).not.toContain('{webhookId}/chat');
			expect(prompt).not.toContain('Do NOT hardcode them into workflow code');
		});

		it('omits the Instance Info section when base URLs are not provided', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).not.toContain('## Instance Info');
		});
	});
});
