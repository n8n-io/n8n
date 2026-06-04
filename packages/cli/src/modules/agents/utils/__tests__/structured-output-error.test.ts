import { describeStructuredOutputError } from '../structured-output-error';

describe('describeStructuredOutputError', () => {
	it.each([
		'No output generated. Check the stream for errors.',
		'No object generated: response did not match schema',
		'No object generated: could not parse the response',
		'Invalid schema for response_format',
		"output_config.format.schema: 'additionalProperties' must be explicitly set to false",
		'This model does not support structured output',
	])('returns an actionable message for structured-output error: %s', (rawError) => {
		const result = describeStructuredOutputError(rawError);

		expect(result).not.toBeNull();
		expect(result).toContain('could not return structured output');
		// The original provider error is preserved for debugging.
		expect(result).toContain(rawError);
	});

	it('matches case-insensitively', () => {
		expect(describeStructuredOutputError('JSON_SCHEMA is invalid')).not.toBeNull();
	});

	it('returns null for errors unrelated to structured output', () => {
		expect(describeStructuredOutputError('Model credential is invalid')).toBeNull();
		expect(describeStructuredOutputError('Request timed out')).toBeNull();
		expect(describeStructuredOutputError('Rate limit exceeded')).toBeNull();
	});
});
