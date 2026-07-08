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
			expect(prompt).toContain('search "credential" for the credentials tool');
			expect(prompt).toContain('search "file" for filesystem tools');
			expect(prompt).toContain('search "workflow" for workflow management');
			expect(prompt).toContain('load_tools');
			expect(prompt).toContain('recommended tools automatically on `load_skill`');
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
			expect(prompt).toContain('search "credential" for the credentials tool');
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

	describe('minimal orchestrator shell', () => {
		it('routes via the skill catalog instead of an inline routing index', () => {
			const prompt = getSystemPrompt({});

			// Routing guidance lives in the skill catalog protocol block, which the
			// SDK appends after these instructions at agent build time.
			expect(prompt).not.toContain('Route by matching skill descriptions');
			expect(prompt).not.toContain('**Single workflow build or edit**');
			expect(prompt).not.toContain('**Multi-workflow or coordinated architecture**');
			expect(prompt).not.toContain('Standalone data-table work');
			expect(prompt).not.toContain('## Capability Honesty');
			expect(prompt).not.toContain('## Setup Accuracy');
			expect(prompt).not.toContain('## Tool conventions');
			expect(prompt).not.toContain('do not call `agent_builder` at all');
			expect(prompt).not.toContain('Never call `data-tables` or `parse-file`');
		});

		it('keeps system follow-up tag routing in the system prompt', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('## System follow-ups');
			expect(prompt).toContain('`post-build-flow`');
			expect(prompt).toContain('`planned-task-runtime`');
			expect(prompt).toContain('<planned-task-follow-up type="replan">');
			expect(prompt).toContain('you MUST take action in this turn');
			expect(prompt).toContain('the thread will silently stall');
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

	describe('instance info', () => {
		const webhookBaseUrl = 'http://localhost:5678/webhook';
		const formBaseUrl = 'http://localhost:5678/form';

		it('includes webhook and form base URLs when provided', () => {
			const prompt = getSystemPrompt({ webhookBaseUrl, formBaseUrl });

			expect(prompt).toContain('## Instance Info');
			expect(prompt).toContain(`Webhook base URL: ${webhookBaseUrl}`);
			expect(prompt).toContain(`Form base URL: ${formBaseUrl}`);
		});

		it('omits trigger URL pattern guidance from the system prompt', () => {
			const prompt = getSystemPrompt({ webhookBaseUrl, formBaseUrl });

			expect(prompt).not.toContain('**Webhook Trigger**:');
			expect(prompt).not.toContain('**Form Trigger**:');
			expect(prompt).not.toContain('**Open chat** button on the workflow canvas');
		});

		it('omits the Instance Info section when base URLs are not provided', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).not.toContain('## Instance Info');
		});
	});
});
