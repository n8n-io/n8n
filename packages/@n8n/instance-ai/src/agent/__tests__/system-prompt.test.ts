import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt', () => {
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
				'credential setup, browser credential setup, or existing credential selection',
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
		it('routes new/multi-workflow/data-table work through plan', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('## When to Plan');
			expect(prompt).toMatch(/New workflow \(no `workflowId`\), multi-workflow build/);
			expect(prompt).toMatch(/data tables created or schemas changed/);
		});

		it('routes existing-workflow edits through bypassPlan', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/Any edit to an existing workflow that runs the builder/);
			expect(prompt).toContain('`bypassPlan: true`');
			expect(prompt).toContain('existing `workflowId`');
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

	describe('post-build verify for bypassPlan', () => {
		it('uses verificationReadiness as the post-build routing signal', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('Post-build flow');
			expect(prompt).toContain('verify-built-workflow');
			expect(prompt).toContain('outcome.verificationReadiness');
			expect(prompt).toContain('outcome.setupRequirement');
			expect(prompt).toContain('outcome.verificationReadiness.status === "ready"');
			expect(prompt).toContain('outcome.verificationReadiness.status === "needs_setup"');
			expect(prompt).toContain('outcome.verificationReadiness.status === "not_verifiable"');
			expect(prompt).toContain('outcome.setupRequirement.status === "required"');
			expect(prompt).toContain('outcome.triggerNodes');
			expect(prompt).not.toContain('outcome.usesWorkflowPinDataForVerification');
			expect(prompt).not.toContain('outcome.verificationPinData');
		});

		it('reads workflowId/workItemId from the outcome field, not result', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('outcome.workflowId');
			expect(prompt).toContain('outcome.workItemId');
			expect(prompt).toContain('outcome.verificationReadiness');
			expect(prompt).toContain('outcome.setupRequirement');
			expect(prompt).toMatch(/result.*only a short text summary/);
		});

		it('reuses deterministic already-verified readiness instead of re-running verify', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('outcome.verificationReadiness.status === "already_verified"');
			expect(prompt).toContain('do **not** call `verify-built-workflow` again');
		});

		it('leaves publish dependency ordering to the workflows tool', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain(
				'Only call `workflows(action="publish")` when the user explicitly asks',
			);
			expect(prompt).not.toContain('outcome.supportingWorkflowIds');
		});
	});

	describe('checkpoint branch — in-turn patch rule + retry carve-out', () => {
		it('allows checkpoints to reuse successful structured verification evidence', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('Always require structured verification evidence');
			expect(prompt).toContain('never trust builder prose');
			expect(prompt).toContain('without re-running verification');
			expect(prompt).not.toContain('Always run your own verification');
		});

		it('routes verified checkpoint workflows with setup needs through workflow setup before completion', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('workflows(action="setup")');
			expect(prompt).toContain('outcome.setupRequirement.status === "required"');
			expect(prompt).toContain('before `complete-checkpoint`');
			expect(prompt).toContain('deferred: true');
			expect(prompt).toContain(
				'Do not call `credentials(action="setup")` or `apply-workflow-credentials`',
			);
		});

		it('tells the orchestrator it may patch during a checkpoint and will re-enter the same checkpoint', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('patch in place');
			expect(prompt).toMatch(
				/you will receive another `<planned-task-follow-up type="checkpoint">` for the SAME checkpoint/,
			);
			expect(prompt).toContain('re-verify');
			expect(prompt).toContain('complete-checkpoint');
		});

		it('allows one more in-checkpoint patch if the first surfaced a new narrow bug', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/call `complete-checkpoint`.*OR spawn one more in-checkpoint patch/);
			expect(prompt).toMatch(/Keep the patch count small/);
			expect(prompt).toMatch(/within two rounds/);
		});

		it('still warns not to end a checkpoint turn with an unsettled in-turn patch', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(
				/Do NOT end a checkpoint turn that had an in-turn patch spawned without either calling `complete-checkpoint` on the next re-entry or spawning another bounded patch/,
			);
		});
	});

	describe('multi-credential disambiguation guidance', () => {
		it('instructs the orchestrator to ask once when a service has more than one credential of the same type', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('Ask once when a service has multiple credentials of the same type');
			expect(prompt).toContain('more than one entry of the type');
			expect(prompt).toContain('single-select');
			expect(prompt).toContain('With a single candidate, auto-apply and do not ask');
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
			expect(prompt).toContain('**Chat Trigger**: http://localhost:5678/webhook/{webhookId}/chat');
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
