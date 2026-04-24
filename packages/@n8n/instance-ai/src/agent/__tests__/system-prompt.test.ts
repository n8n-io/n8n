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

	describe('replan branch — must call create-tasks', () => {
		it('requires the orchestrator to call create-tasks (or plan) in the replan turn', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/You MUST call `create-tasks` \(or `plan`/);
			expect(prompt).toContain('awaiting_replan');
			expect(prompt).toMatch(/Do not reply with acknowledgements or status updates alone/);
		});
	});

	describe('checkpoint branch — in-turn patch rule', () => {
		it('tells the orchestrator it may patch during a checkpoint and will re-enter the same checkpoint', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('patch in place');
			expect(prompt).toMatch(
				/you will receive another `<planned-task-follow-up type="checkpoint">` for the SAME checkpoint/,
			);
			expect(prompt).toContain('re-verify');
			expect(prompt).toContain('complete-checkpoint');
		});

		it('still warns not to end a checkpoint turn with an unsettled in-turn patch', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(
				/Do NOT end a checkpoint turn that had an in-turn patch spawned without a plan to call `complete-checkpoint`/,
			);
		});
	});
});
