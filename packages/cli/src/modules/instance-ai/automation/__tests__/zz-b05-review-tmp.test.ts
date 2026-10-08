vi.mock('@/workflows/workflow-finder.service', () => ({ WorkflowFinderService: class {} }));
vi.mock('@/workflows/workflow.service', () => ({ WorkflowService: class {} }));
vi.mock('@/collaboration/collaboration.service', () => ({ CollaborationService: class {} }));
vi.mock('../../provenance/workflow-provenance.service', () => ({
	WorkflowProvenanceService: class {},
}));

import type { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';

import { AutomationProposalService } from '../automation-proposal.service';
import { createAutomationWorld, makeUser, storedWorkflow } from './propose-automation.test-helpers';

const user = makeUser('u');
const context = { user, surface: 'assistant' as const };

describe('review probes', () => {
	const world = createAutomationWorld();
	beforeEach(() => world.reset());

	it.each([
		['@n8n/n8n-nodes-langchain.manualChatTrigger'],
		['n8n-nodes-base.evaluationTrigger'],
		['n8n-nodes-base.emailReadImap'],
		['n8n-nodes-base.telegramBot'],
	])('card for %s', async (type) => {
		world.grant(
			storedWorkflow({
				nodes: [
					{ name: 'Start', type },
					{ name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
				] as WorkflowEntity['nodes'],
			}),
		);
		const { card } = await Container.get(AutomationProposalService).propose(
			{ workflowId: 'wf-1', title: 'T', why: [] },
			context,
		);
		console.log(type, JSON.stringify({ trigger: card.trigger, canActivate: card.canActivate, reasons: card.recommended.reasons }));
	});

	it('shows the model cron for a schedule trigger with an hourly rule', async () => {
		world.grant(
			storedWorkflow({
				nodes: [
					{
						name: 'Hourly',
						type: 'n8n-nodes-base.scheduleTrigger',
						parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
					},
				] as unknown as WorkflowEntity['nodes'],
			}),
		);
		const { card } = await Container.get(AutomationProposalService).propose(
			{ workflowId: 'wf-1', title: 'T', why: [], cron: '0 8 * * 1-5' },
			context,
		);
		console.log('hourly rule card trigger', JSON.stringify(card.trigger));
		const result = await Container.get(AutomationProposalService).apply(
			{ workflowId: 'wf-1', title: 'T', why: [], cron: '0 8 * * 1-5' },
			context,
		);
		console.log('hourly rule apply result', JSON.stringify(result));
	});
});
