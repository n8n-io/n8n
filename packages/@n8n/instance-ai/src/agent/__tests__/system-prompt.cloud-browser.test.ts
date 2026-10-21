import type { ComputerUseState } from '../../types';
import { getSystemPrompt } from '../system-prompt';

const ASK_WHICH_BROWSER = 'Ask which browser to use';
const CONNECT_HINT = 'connect their own browser from the + menu';

const connected = (...toolCategories: string[]) => ({
	status: 'connected' as const,
	toolCategories,
});

function cloudBrowserSection(computerUseState?: ComputerUseState): string {
	const prompt = getSystemPrompt({ cloudBrowserEnabled: true, computerUseState });
	return prompt.slice(prompt.indexOf('## Cloud Browser'));
}

describe('getSystemPrompt — cloud browser', () => {
	it('omits the section when the cloud browser is off', () => {
		expect(getSystemPrompt({})).not.toContain('## Cloud Browser');
	});

	it('tells the model the browser agent can create credentials from a page', () => {
		const section = cloudBrowserSection();

		expect(section).toContain('Pass each one in `credentialsToCreate`');
		expect(section).toContain('Never put the secret values in the goal');
	});

	it('does not prefer a browser by sign-in', () => {
		expect(cloudBrowserSection()).not.toContain('Prefer the');
	});

	describe("the user's own browser", () => {
		it.each<[string, ComputerUseState]>([
			[
				'connected through the extension',
				{ browser: connected('browser'), localComputer: { status: 'unavailable' } },
			],
			[
				'connected through the local computer',
				{ browser: { status: 'disconnected' }, localComputer: connected('filesystem', 'browser') },
			],
		])('asks which browser to use when it is %s', (_, computerUseState) => {
			const section = cloudBrowserSection(computerUseState);

			expect(section).toContain(ASK_WHICH_BROWSER);
			expect(section).toContain('workflow_builder_ask_user');
			expect(section).toContain('"Your browser: runs in your Chrome, so you can watch it"');
			expect(section).toContain('"Cloud browser: runs in the background while you keep chatting"');
			expect(section).toContain('`required: true`');
			expect(section).toContain('a saved preference');
			expect(section).not.toContain(CONNECT_HINT);
		});

		it('mentions once that it can be connected when it is offered but not connected', () => {
			const section = cloudBrowserSection({
				browser: { status: 'disconnected' },
				localComputer: { status: 'unavailable' },
			});

			expect(section).toContain(CONNECT_HINT);
			expect(section).not.toContain(ASK_WHICH_BROWSER);
		});

		it.each<[string, ComputerUseState]>([
			[
				'not offered',
				{ browser: { status: 'unavailable' }, localComputer: connected('filesystem') },
			],
			[
				'served only by a local computer without the browser capability',
				{ browser: { status: 'unavailable' }, localComputer: connected('filesystem', 'shell') },
			],
			[
				'switched off by the user',
				{ browser: { status: 'disabledByUser' }, localComputer: { status: 'unavailable' } },
			],
		])('neither asks nor mentions it when it is %s', (_, computerUseState) => {
			const section = cloudBrowserSection(computerUseState);

			expect(section).not.toContain(ASK_WHICH_BROWSER);
			expect(section).not.toContain(CONNECT_HINT);
		});
	});
});
