import { CHAT_TRIGGER_NODE_TYPE, FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { authAllowlistedNodes } from '../constants';

describe('authAllowlistedNodes', () => {
	it('includes the Chat Trigger', () => {
		expect(authAllowlistedNodes.has(CHAT_TRIGGER_NODE_TYPE)).toBe(true);
	});

	it('includes the Form Trigger so cookies survive sanitization for n8nUserAuth', () => {
		expect(authAllowlistedNodes.has(FORM_TRIGGER_NODE_TYPE)).toBe(true);
	});

	it('includes the Form (page/completion) node so multi-step pages can read cookies', () => {
		expect(authAllowlistedNodes.has(FORM_NODE_TYPE)).toBe(true);
	});

	it('does not allowlist other arbitrary node types', () => {
		expect(authAllowlistedNodes.has('n8n-nodes-base.webhook')).toBe(false);
		expect(authAllowlistedNodes.has('n8n-nodes-base.set')).toBe(false);
	});
});
