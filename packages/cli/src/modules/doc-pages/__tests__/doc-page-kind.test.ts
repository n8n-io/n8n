import { detectKind } from '../doc-page-kind';

const node = (type: string, disabled = false) => ({ type, disabled });

describe('detectKind', () => {
	it.each([
		['api', [node('n8n-nodes-base.webhook')]],
		['api', [node('n8n-nodes-base.formTrigger')]],
		['agent', [node('@n8n/n8n-nodes-langchain.chatTrigger')]],
		['schedule', [node('n8n-nodes-base.scheduleTrigger')]],
		['schedule', [node('n8n-nodes-base.cron')]],
		['event', [node('n8n-nodes-base.slackTrigger')]],
	])('returns %s', (kind, nodes) => {
		expect(detectKind([...nodes, node('n8n-nodes-base.set')])).toBe(kind);
	});

	it('uses the priority order: api, agent, schedule, event', () => {
		expect(
			detectKind([
				node('n8n-nodes-base.slackTrigger'),
				node('n8n-nodes-base.scheduleTrigger'),
				node('@n8n/n8n-nodes-langchain.chatTrigger'),
			]),
		).toBe('agent');
		expect(
			detectKind([node('@n8n/n8n-nodes-langchain.chatTrigger'), node('n8n-nodes-base.webhook')]),
		).toBe('api');
	});

	it('returns null without an outside entry point', () => {
		expect(
			detectKind([
				node('n8n-nodes-base.manualTrigger'),
				node('n8n-nodes-base.executeWorkflowTrigger'),
				node('n8n-nodes-base.webhook', true),
				node('n8n-nodes-base.httpRequest'),
			]),
		).toBeNull();
	});
});
