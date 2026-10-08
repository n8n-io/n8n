import {
	AUTOMATION_LOCAL_TARGET_ID,
	automationProposalCardSchema,
	type AutomationProposalCard,
} from '@n8n/api-types';

/** A valid card for a weekday schedule. The schema parse keeps fixtures in step with the server. */
export function makeProposal(
	overrides: Partial<AutomationProposalCard> = {},
): AutomationProposalCard {
	return automationProposalCardSchema.parse({
		workflowId: 'wf-1',
		versionId: 'v-1',
		title: 'Morning digest',
		why: ['You asked for this every weekday'],
		trigger: { kind: 'schedule', cron: '0 8 * * 1-5', timezone: 'Europe/London' },
		steps: [
			{ name: 'Every weekday', type: 'n8n-nodes-base.scheduleTrigger' },
			{ name: 'Send digest', type: 'n8n-nodes-base.slack' },
		],
		stepCount: 2,
		recommended: {
			targetId: AUTOMATION_LOCAL_TARGET_ID,
			kind: 'local',
			reasons: ['always-on-trigger', 'no-cloud-linked'],
		},
		targets: [{ id: AUTOMATION_LOCAL_TARGET_ID, kind: 'local', status: 'online' }],
		visibleTo: { projectId: 'project-1', projectName: 'Ops', projectType: 'team' },
		sharedWith: { projects: [], total: 0 },
		archived: false,
		active: false,
		hasUnpublishedChanges: false,
		canActivate: true,
		offered: { target: [AUTOMATION_LOCAL_TARGET_ID], activate: [true, false] },
		...overrides,
	});
}

/** A workflow without a trigger that starts it: the card offers only to keep it. */
export function makeManualProposal(
	overrides: Partial<AutomationProposalCard> = {},
): AutomationProposalCard {
	return makeProposal({
		trigger: { kind: 'manual' },
		recommended: { targetId: AUTOMATION_LOCAL_TARGET_ID, kind: 'local', reasons: ['manual-only'] },
		canActivate: false,
		offered: { target: [AUTOMATION_LOCAL_TARGET_ID], activate: [false] },
		...overrides,
	});
}
