import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt', () => {
	describe('first visible turn guidance', () => {
		it('instructs the agent to send a concise sentence before the first tool call', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('before your first tool call');
			expect(prompt).toContain('write one short sentence');
			expect(prompt).toContain("Keep it tied to the user's goal, not the tool name");
			expect(prompt).toContain('keep visible narration sparse');
			expect(prompt).toContain('Let the activity/status UI show routine progress');
			expect(prompt).toContain('Do not narrate transient validation, build, verification');
			expect(prompt).toContain('Do not call any more tools after planning');
			expect(prompt).toContain('applies to normal turns and system-generated follow-up turns');
			expect(prompt).toContain('Never let an empty assistant message');
			expect(prompt).toContain('[Calling tools: ...]');
		});

		it('instructs the agent to surface generated documents as artifacts instead of sandbox paths', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('Do not show sandbox or workspace file paths');
			expect(prompt).toContain('/home/daytona/workspace');
			expect(prompt).toContain('<command:artifact-create>');
		});

		it('instructs the agent not to retry denied tool actions', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('When any tool returns `denied: true`');
			expect(prompt).toContain('do not retry or re-issue the same mutating tool');
			expect(prompt).toContain('no changes were made');
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

	describe('replan branch — must take action', () => {
		it('requires the orchestrator to take action rather than just acknowledge', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/You MUST take action in this same turn/);
			expect(prompt).toContain('awaiting_replan');
			expect(prompt).toMatch(/Do NOT reply with an acknowledgement or status update alone/);
			expect(prompt).toContain('the thread will silently stall');
		});

		it('lists both single-task (direct tool) and multi-task (create-tasks) routes', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/handle a single simple task directly/);
			expect(prompt).toMatch(/call `create-tasks` for multiple dependent tasks/);
		});
	});

	describe('When to Plan — what-am-I-touching axis', () => {
		it('routes new and multi-workflow work through plan', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('## When to Plan');
			expect(prompt).toMatch(/New workflow \(no `workflowId`\) or multi-workflow build/);
			expect(prompt).toContain('Do not load `workflow-builder` first');
			expect(prompt).toContain(
				'creation is only available inside the approved `build-workflow` follow-up',
			);
			expect(prompt).toContain('workflow tasks include any data table names');
		});

		it('routes standalone data-table work through direct tools and the skill', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/Standalone data-table work/);
			expect(prompt).toContain('`data-table-manager` skill');
			expect(prompt).toContain('Natural requests like "what data tables do I have?"');
			expect(prompt).toContain('Do not call `plan`, `create-tasks`, or `delegate`');
		});

		it('loads the data-table skill before planning workflows that use tables', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain(
				'If the workflow will create, read, update, seed, import, or store records in n8n Data Tables, load the `data-table-manager` skill before `plan`',
			);
		});

		it('routes existing-workflow edits through the workflow-builder skill and workflows update', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/Any edit to an existing workflow that runs the builder/);
			expect(prompt).toContain('load the `workflow-builder` skill');
			expect(prompt).toContain('call `workflows(action="update")` directly');
			expect(prompt).toContain('existing `workflowId`');
			expect(prompt).toContain(
				'Existing-workflow edits and approved planned build follow-ups are direct main-agent skill flows',
			);
			expect(prompt).toContain('Load its linked references on demand');
		});

		it('routes non-build ops through direct tools', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/Non-build ops on an existing workflow/);
			expect(prompt).toContain('The builder does not run.');
		});

		it('routes replan follow-ups as routing, not re-planning', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/Replan follow-up/);
			expect(prompt).toMatch(/route, don't re-plan/);
		});
	});

	describe('post-build verify for planned builds', () => {
		it('keeps lifecycle detail in the workflow-builder skill', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('workflow-builder` skill owns node discovery');
			expect(prompt).toContain('Use the `nodes` tool for node type IDs');
			expect(prompt).toContain('do not use web research to discover node IDs');
			expect(prompt).toContain('follow its build lifecycle reference');
			expect(prompt).toContain('outcome.verificationReadiness');
			expect(prompt).toContain('outcome.setupRequirement');
			expect(prompt).not.toContain('Workflow lifecycle ownership');
			expect(prompt).not.toContain('outcome.verificationReadiness.status === "ready"');
			expect(prompt).not.toContain('### Per-trigger `inputData` shape');
			expect(prompt).not.toContain('outcome.usesWorkflowPinDataForVerification');
			expect(prompt).not.toContain('outcome.verificationPinData');
		});

		it('grounds workflow setup in the inline assistant card', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('inline setup card in the AI Assistant panel');
			expect(prompt).toContain('Never describe workflow setup as something the user starts');
			expect(prompt).toContain(
				'do not tell the user to open the workflow editor to configure setup',
			);
			expect(prompt).not.toMatch(/setup wizard/i);
		});

		it('delegates detailed credential selection to the workflow-builder skill', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('credential/resource selection');
			expect(prompt).toContain("use the skill's placeholder/setup path");
			expect(prompt).not.toContain('Ask once when a service has multiple credentials');
		});

		it('reads workflowId/workItemId from planned task outcomes', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('outcome.workflowId');
			expect(prompt).toContain('outcome.workItemId');
			expect(prompt).toContain('outcome.verificationReadiness');
			expect(prompt).toContain('outcome.setupRequirement');
			expect(prompt).toContain('<planned-task-follow-up type="checkpoint">');
		});

		it('keeps workItemId distinct from workflowId during planned build follow-ups', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('If `buildTask.workflowId` is absent');
			expect(prompt).toContain('`workItemId` is tracking metadata');
			expect(prompt).toContain('must never be used as a workflow ID');
			expect(prompt).toContain('with that exact workflow ID');
		});

		it('keeps planned follow-up progress sparse without final completion text', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('Use little or no chat narration during internal validation');
			expect(prompt).toContain(
				'Planned follow-up turns should usually avoid chat text during internal repair loops',
			);
			expect(prompt).toContain('do not write a final completion message');
			expect(prompt).toContain('checkpoint card is the reporting boundary');
		});

		it('reuses deterministic already-verified readiness instead of re-running verify', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('outcome.verificationReadiness');
			expect(prompt).not.toContain('outcome.verificationReadiness.status === "already_verified"');
			expect(prompt).not.toContain('do **not** call `verify-built-workflow` again');
		});

		it('leaves publish policy to the workflow-builder skill', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('publish policy');
			expect(prompt).not.toContain('Never publish automatically');
			expect(prompt).not.toContain('outcome.supportingWorkflowIds');
		});
	});

	describe('checkpoint branch — in-turn patch rule + retry carve-out', () => {
		it('routes checkpoint verification through the workflow-builder lifecycle', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('Load `workflow-builder`');
			expect(prompt).toContain('follow its build lifecycle reference');
			expect(prompt).not.toContain('Always run your own verification');
		});

		it('keeps setup after successful mock verification', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('workflows(action="setup")');
			expect(prompt).toContain('outcome.setupRequirement');
			expect(prompt).toContain('build lifecycle reference');
			expect(prompt).toContain('verify/test with available mock or real data');
			expect(prompt).toContain('setup is deferred after verification passes');
			expect(prompt).toContain('verifiedWithMocks: true');
			expect(prompt).toContain('setupDeferred: true');
		});

		it('does not treat internal verification as an explicit user-requested run', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain(
				'Internal verification is not a substitute for an explicit user request to run or execute the workflow',
			);
			expect(prompt).toContain('executions(action="run", requireApproval=true)');
			expect(prompt).toContain('so normal run approval applies');
			expect(prompt).toContain('requireApproval=false');
		});

		it('tells the orchestrator it may patch directly during a checkpoint', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('patch and re-verify fixable errors');
			expect(prompt).toContain('remediation guard stops edits');
			expect(prompt).toContain('complete-checkpoint');
		});

		it('keeps checkpoint patch attempts bounded', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('verification remains blocked');
			expect(prompt).not.toMatch(/within two rounds/);
		});
	});

	describe('multi-credential disambiguation guidance', () => {
		it('keeps detailed disambiguation rules in the workflow-builder skill', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('credential/resource selection');
			expect(prompt).not.toContain('more than one entry of the type');
			expect(prompt).not.toContain('With a single candidate, auto-apply and do not ask');
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
			// Regression: agent was sharing the public webhook URL for private chat
			// triggers, then offering to flip `public: true` for testing instead of
			// pointing the user at the workflow's built-in Open chat button.
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
