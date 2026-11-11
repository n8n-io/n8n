import {
	TRIGGER_INPUT_DATA_DESCRIPTION,
	TRIGGER_NODE_NAME_DESCRIPTION,
} from '../trigger-input-descriptions';

// These descriptions go into every model call, because both tools that use them
// are always loaded. Keep them to the field contract. Do not raise these limits
// to add usage rules: put per-trigger guidance in the `trigger-input-data-shapes`
// skill reference, the procedure in a skill, checks in the SDK, and situational
// hints on the tool result (for example `nextStep`).
const MAX_DESCRIPTION_LENGTH = 160;

describe('trigger input field descriptions', () => {
	it.each([
		['inputData', TRIGGER_INPUT_DATA_DESCRIPTION],
		['triggerNodeName', TRIGGER_NODE_NAME_DESCRIPTION],
	])('keeps the %s description short', (_field, description) => {
		expect(description.length).toBeLessThan(MAX_DESCRIPTION_LENGTH);
	});
});
