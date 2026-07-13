import { getDateTimeSection, getSystemPrompt } from '../system-prompt';

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
			expect(prompt).toContain('additional tools available beyond the ones listed above');
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

	describe('routing index', () => {
		it('allows multiple skill loads per turn instead of a single best-match load', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).not.toMatch(/load_skill.*once/i);
			expect(prompt).toContain('more than one skill');
		});

		it('routes workflow builds through the workflow-builder skill', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain("Match the user's request against skill descriptions");
			expect(prompt).toContain('**Single workflow build or edit**');
			expect(prompt).toContain('`workflow-builder`');
			expect(prompt).toContain('`build-workflow`');
			expect(prompt).toContain('**Multi-workflow or coordinated architecture**');
			expect(prompt).toContain('`planning`');
			expect(prompt).toContain('load `create-tasks` via `load_tool`');
			expect(prompt).toContain('planningContext.source: "planning-skill"');
			expect(prompt).toContain('multiple durable artifacts');
			expect(prompt).toContain('shared data-table schema/migration');
			expect(prompt).not.toContain('build-workflow-with-agent');
		});

		it('forbids the agent_builder tool during workflow building', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('do not call `agent_builder` at all');
			expect(prompt).toContain(
				'do not route around that by creating a custom tool through `agent_builder`',
			);
		});

		it('routes standalone data-table work through the data-table-manager skill', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/Standalone data-table work/);
			expect(prompt).toContain('`data-table-manager`');
			expect(prompt).toContain('what data tables do I have?');
			expect(prompt).toContain(
				'Never call `data-tables` or `parse-file` without loading `data-table-manager` first',
			);
			expect(prompt).toContain(
				'never call `create-tasks` without loading it via `load_tool` first',
			);
			expect(prompt).toContain('never call `n8n-docs` without loading it via `load_tool` first');
			expect(prompt).toContain('Do not call `create-tasks`');
		});

		it('loads data-table-manager before workflow-builder when tables are involved', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('workflows that create or write to Data Tables');
			expect(prompt).toContain(
				'`data-table-manager` when tables are involved, then `workflow-builder`',
			);
		});

		it('loads data-table-manager before planning when shared tables are involved', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain(
				'`data-table-manager` first when shared tables are involved → `planning`',
			);
		});

		it('does not plan just for verification', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('Do not create a plan just for verification');
		});

		it('describes error workflows as per-workflow and publish-before-assign', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('n8n has no global/instance-wide error workflow setting');
			expect(prompt).toContain('settings.errorWorkflow');
			expect(prompt).toContain('only after that referenced error workflow is published');
			expect(prompt).toContain(
				'mention the missing global/instance-wide setting to the user only when they explicitly ask',
			);
			expect(prompt).not.toContain('global error workflow for this instance');
		});

		it('points post-build and follow-up work at dedicated skills', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('`post-build-flow`');
			expect(prompt).toContain('postBuildFlow.required: true');
			expect(prompt).toContain('before verification, setup, error-workflow follow-up');
			expect(prompt).toContain('`planned-task-runtime`');
			expect(prompt).toContain('`debugging-executions`');
		});

		it('routes n8n docs and credential setup help through the docs skill', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('**n8n docs/product guidance**');
			expect(prompt).toContain('credential setup');
			expect(prompt).toContain('`n8n-docs-assistant`');
			expect(prompt).toContain('load `n8n-docs` via `load_tool`');
			expect(prompt).toContain('`n8n-docs`');
		});

		it('keeps replan stall prevention in the core follow-up triggers', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('<planned-task-follow-up type="replan">');
			expect(prompt).toContain('you MUST take action in this turn');
			expect(prompt).toContain('the thread will silently stall');
		});

		it('routes browser credential setup through the Computer Use skill', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('needsBrowserSetup=true');
			expect(prompt).toContain('credential-setup-with-computer-use');
			expect(prompt).toMatch(/use Computer Use `browser_\*` tools directly/);
		});
	});

	describe('sandbox workspace', () => {
		it('omits sandbox workspace guidance when no runtime workspace is attached', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).not.toContain('## Sandbox workspace');
			expect(prompt).not.toContain('workspace_read_file');
			expect(prompt).not.toContain('Consult the knowledge base before planning or building');
		});

		it('includes sandbox workspace and knowledge-base guidance when workspaceRoot is provided', () => {
			const prompt = getSystemPrompt({
				workspaceRoot: '/home/daytona/workspace',
			});

			expect(prompt).toContain('## Sandbox workspace');
			expect(prompt).toContain('knowledge-base/index.json');
			expect(prompt).toContain('knowledge-base/best-practices/index.json');
			expect(prompt).toContain('knowledge-base/templates/');
			expect(prompt).toContain('never load `templates/index.json` wholesale');
			expect(prompt).toContain('knowledge-base/reference/index.json');
			expect(prompt).not.toContain('knowledge-base/templates/index.txt');
			expect(prompt).toContain('workspace_execute_command');
			expect(prompt).not.toContain('workspace_list_files');
			expect(prompt).toContain('mkdir -p');
			expect(prompt).toContain('Consult the knowledge base before planning or building');
			expect(prompt).not.toContain('knowledge-base/best-practices/*.md');
		});

		it('includes the resolved workspace root when workspaceRoot is provided', () => {
			const prompt = getSystemPrompt({
				workspaceRoot: '/home/daytona/workspace',
			});

			expect(prompt).toContain('Workspace root: `/home/daytona/workspace`');
			expect(prompt).toContain('/home/daytona/workspace/knowledge-base/index.json');
			expect(prompt).not.toContain('<workspace_root>');
		});
	});

	describe('trigger URL patterns', () => {
		const webhookBaseUrl = 'http://localhost:5678/webhook';
		const formBaseUrl = 'http://localhost:5678/form';

		it('serves Form Trigger URLs under the /form base, not /webhook', () => {
			const prompt = getSystemPrompt({ webhookBaseUrl, formBaseUrl });

			expect(prompt).toContain('**Form Trigger**: http://localhost:5678/form/{path}');
			expect(prompt).toContain('http://localhost:5678/form/{webhookId}');
			expect(prompt).not.toContain('**Form Trigger**: http://localhost:5678/webhook/');
		});

		it('keeps Webhook Trigger and Chat Trigger on the webhook base URL', () => {
			const prompt = getSystemPrompt({ webhookBaseUrl, formBaseUrl });

			expect(prompt).toContain('**Webhook Trigger**: http://localhost:5678/webhook/{path}');
			expect(prompt).toContain('http://localhost:5678/webhook/{webhookId}/chat');
		});

		it('directs the agent to the Open chat button when Chat Trigger is private', () => {
			const prompt = getSystemPrompt({ webhookBaseUrl, formBaseUrl });

			expect(prompt).toContain('**Open chat** button on the workflow canvas');
			expect(prompt).toMatch(/public: false[^]*Do NOT share a webhook URL/);
			expect(prompt).toMatch(/do NOT suggest flipping `public: true` just to enable testing/);
		});

		it('explicitly warns that /form and /webhook are distinct prefixes', () => {
			const prompt = getSystemPrompt({ webhookBaseUrl, formBaseUrl });

			expect(prompt).toMatch(/Form Trigger lives under \/form\/, NOT \/webhook\//);
			expect(prompt).toContain('Do NOT use the Webhook base URL for Form Triggers');
		});

		it('omits the Instance Info section when base URLs are not provided', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).not.toContain('## Instance Info');
		});
	});
});
