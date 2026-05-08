import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt', () => {
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

	describe('manual eval setup flow', () => {
		it('routes user-requested eval setup through select-metrics, propose, and eval-setup agent', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('**Add-evals flow**');
			expect(prompt).toContain('evals(action="select-metrics"');
			expect(prompt).toContain('evals(action="propose"');
			expect(prompt).toMatch(/[Cc]all `eval-setup-with-agent`/);
			expect(prompt).toContain('Do NOT call `build-workflow-with-agent` for this case');
		});
	});

	describe('fresh-build eval suite offer', () => {
		it('inserts the chain as Post-build flow step 4 with offer → select-metrics → propose → eval-setup → offer-data-population → eval-data', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain(
				'**Fresh-build eval suite chain (REQUIRED before ending the post-build flow).**',
			);
			expect(prompt).toContain('did NOT pass an existing `workflowId`');
			expect(prompt).toContain('evals(action="offer", workflowId, projectId)');
			expect(prompt).toContain('evals(action="select-metrics", workflowId)');
			expect(prompt).toContain('chosenMetricIds');
			expect(prompt).toContain(
				'evals(action="propose", workflowId, projectId, metrics: chosenMetricIds)',
			);
			expect(prompt).toContain('evals(action="offer-data-population", workflowId)');
			expect(prompt).toContain('eval-setup-with-agent');
			expect(prompt).toContain('eligible: false');
			expect(prompt).toContain('approved: false');
			expect(prompt).toContain('approved: true');
			expect(prompt).toContain('aiNodeNames');
		});

		it('renumbers the test/publish steps to 5 and 6', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/5\. Ask the user if they want to test the workflow/);
			expect(prompt).toMatch(
				/6\. Only call `workflows\(action="publish"\)` when the user explicitly asks to publish/,
			);
		});

		it('declares the chain flow non-fatal on every failure', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('Failures within step 4 are non-fatal');
			expect(prompt).toContain('continue silently');
			expect(prompt).toContain("Couldn't add eval suite");
		});

		it('treats every `eligible: false` reason as silent skip', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/skip silently/);
		});

		it('respects prior user intent to skip evals', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain(
				"the user previously said in this conversation that they don't want evals",
			);
		});

		it('extends the synthesize follow-up with the same chain for the first eligible workflow', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/evals\(action="offer", workflowId, projectId\)/);
			expect(prompt).toContain('strict approve/deny widget');
			expect(prompt).toContain('run the chain for the first one only');
		});

		it('promotes the synthesize eval chain to its own REQUIRED block with strong directive language', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain(
				'**Synthesize fresh-build eval chain (REQUIRED before ending the turn — including across resumes):**',
			);
			expect(prompt).toContain('This is not optional');
			expect(prompt).toContain('most common failure mode');
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

	describe('system prompt — eval chain (new design)', () => {
		const prompt = getSystemPrompt({});

		it('mentions select-metrics in the post-build flow', () => {
			expect(prompt).toMatch(/evals\(action="select-metrics"/);
		});

		it('mentions offer-data-population in the post-build flow', () => {
			expect(prompt).toMatch(/evals\(action="offer-data-population"/);
		});

		it('does NOT instruct to call eval-data right after propose anymore', () => {
			expect(prompt).not.toMatch(/Do NOT call `eval-data` separately/);
			expect(prompt).not.toMatch(/propose has already populated the DataTable/);
		});

		it('describes the new add-evals flow starting at select-metrics', () => {
			expect(prompt).toMatch(/Add-evals flow[\s\S]*select-metrics/);
		});

		it('does not describe propose as creating a populated DataTable inline', () => {
			expect(prompt).not.toMatch(/populated DataTable inline/);
			expect(prompt).not.toMatch(/propose creates a populated DataTable/);
		});

		it('does not say "default `datasetChoice="generate"`"', () => {
			expect(prompt).not.toMatch(/datasetChoice="generate"/);
		});

		it('mentions chosenMetricIds in the chain', () => {
			expect(prompt).toMatch(/chosenMetricIds/);
		});
	});
});
