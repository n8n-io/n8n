import { looksLikeAgentChangeRequest } from '../agent-change-request';

describe('looksLikeAgentChangeRequest', () => {
	test.each([
		// Bare requests, with no reference to the agent owning the thing.
		'add a tool',
		'Can you add a tool that fetches the weather?',
		'add a Slack channel',
		'connect a slack channel please',
		'change the model to opus',
		'install an MCP server for github',
		'give me a schedule that runs every morning',
		'set up a trigger',
		'remove the second skill',
		'add knowledge about our refund policy',
		// Possessive phrasings.
		'Can you change your name to Ada?',
		'Please update your instructions to always answer in German',
		"Rename the agent's description",
		'your instructions need an update',
	])('matches %s', (text) => {
		expect(looksLikeAgentChangeRequest(text)).toBe(true);
	});

	test.each([
		'What is the weather in Berlin?',
		'Add these two numbers',
		'Tell me about your name', // no change verb
		'What tools do you have?', // no change verb
		// A change verb far from the aspect is not a change request.
		'Can you give me a summary of your knowledge base?',
		'What can your tools do? I need to change my plans',
		// Everyday words only count when tied to the agent, and never when they
		// belong to the user — these are ordinary tasks for the agent to do.
		'Give me a name for my new dog',
		'Set the temperature to 20 degrees in the thermostat',
		'update the config file in my repo',
		'Please add a name column to this CSV',
		'Can you use the search tools to find the price?',
		'I need to improve my sales skills',
		'remove the icons from this design',
		'', // empty draft
	])('does not match %s', (text) => {
		expect(looksLikeAgentChangeRequest(text)).toBe(false);
	});
});
