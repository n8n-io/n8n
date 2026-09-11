import { describeCallAgentFailure } from '../call-agent-failure';

describe('describeCallAgentFailure', () => {
	it('codes a provider rejection of the model as invalid_model', () => {
		const result = describeCallAgentFailure(
			'[404 Not Found] models/gemini-3.6-flash is not found for API version v1beta',
		);

		expect(result.code).toBe('invalid_model');
		expect(result.message).toContain('models/gemini-3.6-flash');
		expect(result.message).toContain('resolve_llm');
	});

	it('tells the agent not to touch the credential on a known model rejection', () => {
		const result = describeCallAgentFailure('{"error":{"code":"model_not_found"}}');

		expect(result.code).toBe('invalid_model');
		expect(result.message).toMatch(/regenerate their API key/i);
	});

	// The reported thread only ever saw a bare `404 Not Found`, which cannot be
	// attributed to the model with confidence — but it is still the first thing
	// to rule out, before the user is sent to their API key.
	it('points a bare 404 at the model before the credential', () => {
		const result = describeCallAgentFailure('404 Not Found');

		expect(result.code).toBe('execution_failed');
		expect(result.message).toContain('404 Not Found');
		expect(result.message).toContain('resolve_llm');
		expect(result.message).toMatch(/before suggesting anything about the credential/i);
	});

	it('leaves an unrelated failure untouched', () => {
		const result = describeCallAgentFailure('Workflow tool timed out after 30s');

		expect(result).toEqual({
			code: 'execution_failed',
			message: 'Workflow tool timed out after 30s',
		});
	});

	it('does not claim the model is wrong for a tool resource 404', () => {
		const result = describeCallAgentFailure('Slack channel not found');

		expect(result.code).toBe('execution_failed');
		expect(result.message).toMatch(/if this came from the model provider/i);
	});

	// `call_agent` runs the agent's tools too, so a tool's 404 often arrives in a
	// message that also names the chat model. Blaming the model there would send
	// the user after a model that works.
	it.each([
		["Problem in node 'Google Gemini Chat Model': the Notion page does not exist"],
		['Model gemini-3.7-flash ran, but workflow tool "Lookup" failed: record does not exist'],
		['The model returned a tool call to get_user, but the user was not found'],
	])('does not code %j as invalid_model', (message) => {
		expect(describeCallAgentFailure(message).code).toBe('execution_failed');
	});
});
