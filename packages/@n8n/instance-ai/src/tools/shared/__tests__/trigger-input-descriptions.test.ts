import {
	TRIGGER_INPUT_DATA_DESCRIPTION,
	TRIGGER_NODE_NAME_DESCRIPTION,
} from '../trigger-input-descriptions';

describe('trigger input field descriptions', () => {
	it('points to the reference for per-trigger shapes instead of listing them', () => {
		expect(TRIGGER_INPUT_DATA_DESCRIPTION).toContain('`trigger-input-data-shapes`');
		expect(TRIGGER_INPUT_DATA_DESCRIPTION).not.toMatch(/Form Trigger|Chat Trigger|Webhook/);
		expect(TRIGGER_INPUT_DATA_DESCRIPTION.length).toBeLessThan(160);
	});

	it('states the trigger name contract without the multi-trigger procedure', () => {
		expect(TRIGGER_NODE_NAME_DESCRIPTION).toContain('triggerNodes');
		expect(TRIGGER_NODE_NAME_DESCRIPTION).toContain('more than one trigger');
		expect(TRIGGER_NODE_NAME_DESCRIPTION).not.toMatch(/Never disable|get-as-code/);
		expect(TRIGGER_NODE_NAME_DESCRIPTION.length).toBeLessThan(160);
	});
});
