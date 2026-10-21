import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — cloud browser', () => {
	it('omits the section when the cloud browser is off', () => {
		expect(getSystemPrompt({})).not.toContain('## Cloud Browser');
	});

	it('tells the model the browser agent can create credentials from a page', () => {
		const prompt = getSystemPrompt({ cloudBrowserEnabled: true });
		const section = prompt.slice(prompt.indexOf('## Cloud Browser'));

		expect(section).toContain('Pass each one in `credentialsToCreate`');
		expect(section).toContain('Never put the secret values in the goal');
	});
});
