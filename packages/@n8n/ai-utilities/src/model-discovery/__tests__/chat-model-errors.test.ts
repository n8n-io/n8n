import { classifyChatModelFailure } from '../chat-model-errors';

describe('classifyChatModelFailure', () => {
	describe('invalid_model', () => {
		it.each([
			['{"error":{"code":"model_not_found"}}'],
			['The model "gpt-6" was not found'],
			["The model 'gpt-4o-unknown' does not exist or you do not have access to it."],
			['The model `claude-x` is not available'],
			['Resource "models/gemini-2.5-flash" was not found'],
			[
				'models/gemini-2.5-flash is not found for API version v1beta, or is not supported for generateContent',
			],
			['[404 Not Found] models/gemini-3.6-flash is not found for API version v1beta'],
			['deployment "my-dep" does not exist'],
			['engine not found'],
			['model: not found'],
			["The model 'x' is invalid"],
		])('classifies %j', (message) => {
			expect(classifyChatModelFailure(message)).toBe('invalid_model');
		});
	});

	describe('other model failure kinds', () => {
		it.each([
			['Unsupported parameter: temperature is not supported with this model'],
			['temperature cannot be set when reasoning_effort is enabled'],
			['Model does not support top_p'],
		])('classifies %j as unsupported_parameter', (message) => {
			expect(classifyChatModelFailure(message)).toBe('unsupported_parameter');
		});

		it.each([
			['The selected model is not a chat model'],
			['Model does not support tools or function calling'],
		])('classifies %j as capability_mismatch', (message) => {
			expect(classifyChatModelFailure(message)).toBe('capability_mismatch');
		});
	});

	describe('failures that are not about the model', () => {
		it.each([
			['User was not found in Slack channel'],
			['Table "customers" does not exist'],
			['Resource not found: /api/v1/tickets/123'],
		])('does not classify %j', (message) => {
			expect(classifyChatModelFailure(message)).toBeUndefined();
		});

		// A model mentioned somewhere before an unrelated not-found detail must not
		// be blamed. n8n node errors hit this constantly, because chat-model nodes
		// are named "... Chat Model" — callers act on `invalid_model` by telling the
		// user to replace the model, which would send them after the wrong thing.
		it.each([
			['Error in Chat Model node: Slack channel not found'],
			['The model returned a tool call to get_user, but the user was not found'],
			['Model gemini-3.7-flash ran, but workflow tool "Lookup" failed: record does not exist'],
			['AI Agent with chat model connected: Airtable base not found'],
			["Problem in node 'Google Gemini Chat Model': the Notion page does not exist"],
			['model responded; downstream HTTP Request node: endpoint not available'],
			['The model produced an invalid tool call for the Slack node'],
		])('does not blame the model for %j', (message) => {
			expect(classifyChatModelFailure(message)).toBeUndefined();
		});
	});

	it('returns undefined for an empty message', () => {
		expect(classifyChatModelFailure(undefined)).toBeUndefined();
		expect(classifyChatModelFailure('')).toBeUndefined();
	});
});
