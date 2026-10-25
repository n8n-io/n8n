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

	it('names the start tool when the cloud browser is on', () => {
		expect(cloudBrowserSection()).toContain(ORCHESTRATION_TOOL_IDS.START_CLOUD_BROWSER_TASK);
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
