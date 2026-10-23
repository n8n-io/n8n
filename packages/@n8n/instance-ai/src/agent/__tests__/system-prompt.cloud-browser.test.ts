import { ASK_USER_TOOL_ID, ORCHESTRATION_TOOL_IDS } from '../../tools/tool-ids';
import type { BrowserUseState } from '../../types';
import { getSystemPrompt } from '../system-prompt';

const ASK_WHICH_BROWSER = "The user's browser is connected";
const USE_CLOUD_BROWSER = "The user's browser is not connected";
const BROWSER_USE_NOTE = "The Browser Use section is about the user's own browser";

function cloudBrowserSection(browserUseState?: BrowserUseState): string {
	const prompt = getSystemPrompt({ cloudBrowserEnabled: true, browserUseState });
	return prompt.slice(prompt.indexOf('## Cloud Browser'));
}

describe('getSystemPrompt — cloud browser', () => {
	it('omits the section when the cloud browser is off', () => {
		expect(getSystemPrompt({})).not.toContain('## Cloud Browser');
	});

	it('tells the model to start a background task with a complete goal', () => {
		const section = cloudBrowserSection();

		expect(section).toContain(ORCHESTRATION_TOOL_IDS.START_CLOUD_BROWSER_TASK);
		expect(section).toContain('Write a complete goal');
	});

	it('tells the model the browser agent can create credentials from a page', () => {
		const section = cloudBrowserSection();

		expect(section).toContain('Pass each one in `credentialsToCreate`');
		expect(section).toContain('Never put the secret values in the goal');
	});

	it('tells the model which tags carry results and running tasks', () => {
		const section = cloudBrowserSection();

		expect(section).toContain('`<cloud-browser-task-completed>` block');
		expect(section).toContain('`<running-tasks>` block in the latest message');
		expect(section).toContain('Blocks in earlier messages are out of date');
		expect(section).toContain('Never tell the user a task is still running when it is not listed');
	});

	it('tells the model how to report a denied or cancelled task', () => {
		const section = cloudBrowserSection();

		expect(section).toContain('**When a task did not finish**, its `outcome` says why');
		expect(section).toContain('`denied`: the user denied an approval that the task needed');
		expect(section).toContain('`cancelled`: the user or n8n stopped the task');
		expect(section).toContain('Do not start the task again unless the user asks');
	});

	it('tells the model the browser agent can get the user to sign in', () => {
		const section = cloudBrowserSection();

		expect(section).toContain('**The browser agent can get the user to sign in.**');
		expect(section).toContain('Never tell the browser agent to stop at a sign-in');
		expect(section).toContain('never ask the user for a password');
		expect(section).not.toContain('The browser agent cannot sign in for them');
	});

	it('does not prefer a browser by sign-in', () => {
		expect(cloudBrowserSection({ status: 'connected' })).not.toContain('Prefer the');
	});

	describe("the user's own browser", () => {
		it('asks which browser to use when it is connected', () => {
			const section = cloudBrowserSection({ status: 'connected' });

			expect(section).toContain(BROWSER_USE_NOTE);
			expect(section).toContain(ASK_WHICH_BROWSER);
			expect(section).toContain(ASK_USER_TOOL_ID);
			expect(section).toContain(
				'"Your browser: runs directly in Chrome. The chat is paused while the Assistant completes the task."',
			);
			expect(section).toContain(
				'"Cloud browser: runs in a virtual browser. You can keep chatting while the Assistant completes the task."',
			);
			expect(section).toContain('`required: true`');
			expect(section).toContain('a saved preference');
			expect(section).not.toContain(USE_CLOUD_BROWSER);
		});

		it('uses the cloud browser and gives the steps to connect when it is not connected', () => {
			const section = cloudBrowserSection({ status: 'disconnected' });

			expect(section).toContain(BROWSER_USE_NOTE);
			expect(section).toContain(USE_CLOUD_BROWSER);
			expect(section).toContain('select "Connect browser"');
			expect(section).not.toContain(ASK_WHICH_BROWSER);
		});

		it.each<[string, BrowserUseState | undefined]>([
			['not offered', { status: 'unavailable' }],
			['unknown', undefined],
		])('says nothing about it when it is %s', (_, browserUseState) => {
			const section = cloudBrowserSection(browserUseState);

			expect(section).not.toContain(BROWSER_USE_NOTE);
			expect(section).not.toContain(ASK_WHICH_BROWSER);
			expect(section).not.toContain(USE_CLOUD_BROWSER);
		});
	});
});
