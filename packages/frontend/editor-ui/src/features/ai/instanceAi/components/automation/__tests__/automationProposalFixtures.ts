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

export const CLOUD_LINK_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';
export const LAB_LINK_ID = '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d';

/**
 * A weekday schedule with this computer, an online cloud and an offline lab instance. The card
 * offers this computer and the cloud, and recommends the cloud.
 */
export function makeLinkedProposal(
	overrides: Partial<AutomationProposalCard> = {},
): AutomationProposalCard {
	return makeProposal({
		recommended: { targetId: CLOUD_LINK_ID, kind: 'linked', reasons: ['always-on-trigger'] },
		targets: [
			{ id: AUTOMATION_LOCAL_TARGET_ID, kind: 'local', status: 'online' },
			{
				id: CLOUD_LINK_ID,
				kind: 'linked',
				label: 'Team cloud',
				status: 'online',
				baseUrl: 'https://cloud.example.test',
			},
			{
				id: LAB_LINK_ID,
				kind: 'linked',
				label: 'Lab',
				status: 'offline',
				baseUrl: 'https://lab.example.test',
			},
		],
		offered: { target: [AUTOMATION_LOCAL_TARGET_ID, CLOUD_LINK_ID], activate: [true, false] },
		...overrides,
	});
}
