import { isTriggerNodeType } from '../workflow-json-utils';

describe('isTriggerNodeType', () => {
	it.each([
		'n8n-nodes-base.webhook',
		'n8n-nodes-base.formTrigger',
		'n8n-nodes-base.scheduleTrigger',
		'@n8n/n8n-nodes-langchain.chatTrigger',
	])('recognises known-mockable type %s', (type) => {
		expect(isTriggerNodeType(type)).toBe(true);
	});

	it.each([
		'n8n-nodes-base.emailReadImapTrigger',
		'@n8n/n8n-nodes-langchain.mcpTrigger',
		'n8n-nodes-base.manualTrigger',
		'customNamespace.someCustomtrigger',
	])('recognises suffix-matched trigger type %s', (type) => {
		expect(isTriggerNodeType(type)).toBe(true);
	});

	it.each(['n8n-nodes-base.slack', 'n8n-nodes-base.code', 'n8n-nodes-base.set', undefined, ''])(
		'returns false for non-trigger %s',
		(type) => {
			expect(isTriggerNodeType(type)).toBe(false);
		},
	);
});
