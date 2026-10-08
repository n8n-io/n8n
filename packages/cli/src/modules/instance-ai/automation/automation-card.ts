import {
	AUTOMATION_LOCAL_TARGET_ID,
	AUTOMATION_PROPOSAL_LIMITS,
	type AutomationProposalCard,
	type AutomationRecommendationReason,
	type AutomationRunTarget,
} from '@n8n/api-types';
import { STICKY_NODE_TYPE, UnexpectedError } from 'n8n-workflow';

import type { AutomationNode, AutomationTrigger } from './automation-trigger';

/** What the model asked the card to say. */
export type ProposalRequest = { title: string; why: string[]; cron?: string };

type SharingProject = { id: string; name: string; type: 'personal' | 'team' };

type Sharing = { role: string; project: SharingProject };

type CardProject = AutomationProposalCard['visibleTo'];

const OWNER_ROLE = 'workflow:owner';

/** The fields of a stored workflow that the card reads. */
export type ProposalWorkflow = {
	id: string;
	nodes: readonly AutomationNode[];
	versionId: string;
	activeVersionId: string | null;
	isArchived: boolean;
	shared: readonly Sharing[];
};

export type ProposalRecommendation = {
	targetId: string;
	kind: 'local' | 'linked';
	reasons: AutomationRecommendationReason[];
};

/** This n8n instance. The frontend names it, so the card sends no label. */
export const LOCAL_CARD_TARGET: AutomationRunTarget = {
	id: AUTOMATION_LOCAL_TARGET_ID,
	kind: 'local',
	status: 'online',
};

/** The nodes that run, in their order. Sticky notes and disabled nodes do nothing. */
export function runningNodes(nodes: readonly AutomationNode[]): AutomationNode[] {
	return nodes.filter((node) => node.type !== STICKY_NODE_TYPE && node.disabled !== true);
}

/** The running nodes that the card can show as steps. A node without a type has no icon. */
function stepNodes(nodes: readonly AutomationNode[]): AutomationNode[] {
	return runningNodes(nodes).filter((node) => node.type.length > 0);
}

/** The steps that the card shows as node icons: the first ones, up to the limit. */
export function automationSteps(nodes: readonly AutomationNode[]): AutomationProposalCard['steps'] {
	return stepNodes(nodes)
		.slice(0, AUTOMATION_PROPOSAL_LIMITS.steps)
		.map(({ name, type }) => ({ name, type }));
}

function toCardProject(project: SharingProject): CardProject {
	return { projectId: project.id, projectName: project.name, projectType: project.type };
}

/** The project that owns the workflow. Its members can see the automation. */
export function ownerProjectOf(workflow: Pick<ProposalWorkflow, 'id' | 'shared'>): CardProject {
	const owner = workflow.shared.find((sharing) => sharing.role === OWNER_ROLE)?.project;
	if (!owner) throw new UnexpectedError(`Workflow "${workflow.id}" has no owner project`);
	return toCardProject(owner);
}

/** The other projects that the workflow is shared with. Their members can also see it. */
export function sharedProjectsOf(
	workflow: Pick<ProposalWorkflow, 'shared'>,
): AutomationProposalCard['sharedWith'] {
	const projects = workflow.shared
		.filter((sharing) => sharing.role !== OWNER_ROLE)
		.map((sharing) => toCardProject(sharing.project));
	return {
		projects: projects.slice(0, AUTOMATION_PROPOSAL_LIMITS.sharedWith),
		total: projects.length,
	};
}

/** True when the saved version of the workflow is the live one, so turning it on changes nothing. */
export function isSavedVersionLive(
	workflow: Pick<ProposalWorkflow, 'versionId' | 'activeVersionId'>,
): boolean {
	// The saved version id is never null, so this also means that a version is live.
	return workflow.activeVersionId === workflow.versionId;
}

export type AutomationCardInput = {
	workflow: ProposalWorkflow;
	request: ProposalRequest;
	trigger: AutomationTrigger;
	/** The cron that `chooseCron` kept. */
	cron?: string;
	recommendation: ProposalRecommendation;
	/** False when the trigger, the scopes of the user or an admin do not allow turning it on. */
	canActivate: boolean;
};

/** The `automationProposal` field of the card. `offered` lists the only answers it accepts. */
export function buildAutomationCard(input: AutomationCardInput): AutomationProposalCard {
	const { workflow, request, trigger, cron, recommendation, canActivate } = input;
	const active = workflow.activeVersionId !== null;
	return {
		workflowId: workflow.id,
		versionId: workflow.versionId,
		title: request.title,
		why: request.why,
		trigger: cron === undefined ? { kind: trigger.kind } : { kind: trigger.kind, cron },
		steps: automationSteps(workflow.nodes),
		stepCount: stepNodes(workflow.nodes).length,
		recommended: {
			targetId: recommendation.targetId,
			kind: recommendation.kind,
			reasons: recommendation.reasons,
		},
		targets: [{ ...LOCAL_CARD_TARGET }],
		visibleTo: ownerProjectOf(workflow),
		sharedWith: sharedProjectsOf(workflow),
		archived: workflow.isArchived,
		active,
		hasUnpublishedChanges: active && !isSavedVersionLive(workflow),
		canActivate,
		offered: {
			target: [AUTOMATION_LOCAL_TARGET_ID],
			activate: canActivate ? [true, false] : [false],
		},
	};
}
