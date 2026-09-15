/**
 * Setup panel v2 changes what `workflows(action="setup")` does. The prompt has
 * to describe the variant that is live, or the agent narrates a card that never
 * opens (or waits on one that does).
 */

import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — setup panel', () => {
	it('describes the suspending setup card while the panel is off', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toContain('opens the inline setup card');
		expect(prompt).not.toContain('<workflow-setup-state>');
	});

	it('describes the announce-and-return setup flow while the panel is on', () => {
		const prompt = getSystemPrompt({ setupPanelEnabled: true });

		expect(prompt).not.toContain('opens the inline setup card');
		expect(prompt).toContain('setup panel next to the chat');
		expect(prompt).toContain('<workflow-setup-state>');
		expect(prompt).toContain('end your turn');
		expect(prompt).toContain('When the result has `announced: true`');
		expect(prompt).toContain('wait for requested destination approvals');
		expect(prompt).toContain('Do not treat a resumed card as a panel announcement');
	});
});
