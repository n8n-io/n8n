import { type AutomationRecommendationReason, automationProposalCardSchema } from '@n8n/api-types';
import fc from 'fast-check';
import { UnexpectedError } from 'n8n-workflow';

import {
	type AutomationCardInput,
	automationSteps,
	buildAutomationCard,
	isSavedVersionLive,
	ownerProjectOf,
	type ProposalWorkflow,
	recommendationNodeTypes,
	runningNodes,
	sharedProjectsOf,
} from '../automation-card';
import type { AutomationNode, AutomationTrigger } from '../automation-trigger';

const SCHEDULE = 'n8n-nodes-base.scheduleTrigger';
const STICKY = 'n8n-nodes-base.stickyNote';
const SLACK = 'n8n-nodes-base.slack';

const scheduleTrigger: AutomationTrigger = {
	kind: 'schedule',
	node: { name: 'Every weekday', type: SCHEDULE },
	canActivate: true,
};
const manualTrigger: AutomationTrigger = { kind: 'manual', canActivate: false };

const teamProject = { id: 'project-ops', name: 'Ops', type: 'team' as const };

const workflow = (overrides: Partial<ProposalWorkflow> = {}): ProposalWorkflow => ({
	id: 'wf-1',
	nodes: [
		{ name: 'Every weekday', type: SCHEDULE },
		{ name: 'Note', type: STICKY },
		{ name: 'Send digest', type: SLACK },
	],
	versionId: 'v-2',
	activeVersionId: null,
	isArchived: false,
	shared: [{ role: 'workflow:owner', project: teamProject }],
	...overrides,
});

const project = (id: string, type: 'personal' | 'team' = 'team') => ({
	id,
	name: `Project ${id}`,
	type,
});

const cardInput = (overrides: Partial<AutomationCardInput> = {}): AutomationCardInput => ({
	workflow: workflow(),
	request: { title: 'Morning digest', why: ['You asked for it every weekday'] },
	trigger: scheduleTrigger,
	schedule: { cron: '0 8 * * 1-5', timezone: 'Europe/London' },
	recommendation: {
		targetId: 'local',
		kind: 'local',
		reasons: ['always-on-trigger', 'no-cloud-linked'],
	},
	canActivate: true,
	...overrides,
});

describe('runningNodes', () => {
	it('drops sticky notes and disabled nodes and keeps the order', () => {
		const nodes: AutomationNode[] = [
			{ name: 'B', type: SLACK },
			{ name: 'Note', type: STICKY },
			{ name: 'Off', type: SLACK, disabled: true },
			{ name: 'A', type: SCHEDULE, disabled: false },
		];

		expect(runningNodes(nodes).map((node) => node.name)).toEqual(['B', 'A']);
	});
});

describe('recommendationNodeTypes', () => {
	const MANUAL = 'n8n-nodes-base.manualTrigger';
	const MANUAL_CHAT = '@n8n/n8n-nodes-langchain.manualChatTrigger';
	const EVALUATION = 'n8n-nodes-base.evaluationTrigger';
	const SUB_WORKFLOW = 'n8n-nodes-base.executeWorkflowTrigger';
	const ERROR_TRIGGER = 'n8n-nodes-base.errorTrigger';
	const LEGACY_START = 'n8n-nodes-base.start';
	const READ_FILE = 'n8n-nodes-base.readWriteFile';
	const LOCAL_FILE_TRIGGER = 'n8n-nodes-base.localFileTrigger';
	const IMAP = 'n8n-nodes-base.emailReadImap';

	it('keeps the triggers that start the workflow on their own and every other node', () => {
		const nodes = [
			{ name: 'Daily', type: SCHEDULE },
			{ name: 'Watch', type: LOCAL_FILE_TRIGGER },
			{ name: 'Mail', type: IMAP },
			{ name: 'Read', type: READ_FILE },
			{ name: 'Send', type: SLACK },
		];

		expect(recommendationNodeTypes(nodes)).toEqual([
			SCHEDULE,
			LOCAL_FILE_TRIGGER,
			IMAP,
			READ_FILE,
			SLACK,
		]);
	});

	it.each([MANUAL, MANUAL_CHAT, EVALUATION, SUB_WORKFLOW, ERROR_TRIGGER, LEGACY_START])(
		'leaves out %s, which cannot start the workflow on its own',
		(type) => {
			expect(
				recommendationNodeTypes([
					{ name: 'Start', type },
					{ name: 'Send', type: SLACK },
				]),
			).toEqual([SLACK]);
		},
	);

	it('leaves out sticky notes and disabled nodes', () => {
		const nodes = [
			{ name: 'Note', type: STICKY },
			{ name: 'Off', type: SCHEDULE, disabled: true },
			{ name: 'Send', type: SLACK },
		];

		expect(recommendationNodeTypes(nodes)).toEqual([SLACK]);
	});
});

describe('automationSteps', () => {
	it('lists the name and type of each running node', () => {
		const steps = automationSteps([
			{ name: 'Start', type: SCHEDULE, disabled: false },
			{ name: 'Note', type: STICKY },
			{ name: 'Send', type: SLACK },
		]);

		expect(steps).toStrictEqual([
			{ name: 'Start', type: SCHEDULE },
			{ name: 'Send', type: SLACK },
		]);
	});

	it('keeps the first 12 steps', () => {
		const nodes = Array.from({ length: 13 }, (_, i) => ({ name: `Step ${i}`, type: SLACK }));

		const steps = automationSteps(nodes);

		expect(steps).toHaveLength(12);
		expect(steps.at(-1)?.name).toBe('Step 11');
	});

	it('counts the limit after it drops notes', () => {
		const nodes = [
			{ name: 'Note', type: STICKY },
			...Array.from({ length: 12 }, (_, i) => ({ name: `Step ${i}`, type: SLACK })),
		];

		expect(automationSteps(nodes).map((step) => step.name)).toContain('Step 11');
	});

	it('drops a node without a type, which no icon can show', () => {
		expect(automationSteps([{ name: 'Broken', type: '' }])).toEqual([]);
	});
});

describe('ownerProjectOf', () => {
	it('takes the project that owns the workflow, not a project it is shared with', () => {
		const shared = [
			{ role: 'workflow:editor', project: { id: 'p-other', name: 'Other', type: 'team' as const } },
			{
				role: 'workflow:owner',
				project: { id: 'p-me', name: 'Ada <ada@example.com>', type: 'personal' as const },
			},
		];

		expect(ownerProjectOf({ id: 'wf-1', shared })).toStrictEqual({
			projectId: 'p-me',
			projectName: 'Ada <ada@example.com>',
			projectType: 'personal',
		});
	});

	it('fails for a workflow without an owner project', () => {
		const shared = [{ role: 'workflow:editor', project: teamProject }];

		const read = () => ownerProjectOf({ id: 'wf-9', shared });

		expect(read).toThrow(UnexpectedError);
		expect(read).toThrow('Workflow "wf-9" has no owner project');
	});
});

describe('sharedProjectsOf', () => {
	it('lists the projects that the workflow is shared with, without the owner', () => {
		const shared = [
			{ role: 'workflow:editor', project: project('p-1') },
			{ role: 'workflow:owner', project: project('p-owner', 'personal') },
			{ role: 'workflow:viewer', project: project('p-2', 'personal') },
		];

		expect(sharedProjectsOf({ shared })).toStrictEqual({
			projects: [
				{ projectId: 'p-1', projectName: 'Project p-1', projectType: 'team' },
				{ projectId: 'p-2', projectName: 'Project p-2', projectType: 'personal' },
			],
			total: 2,
		});
	});

	it('is empty for a workflow that only its owner project has', () => {
		const shared = [{ role: 'workflow:owner', project: teamProject }];

		expect(sharedProjectsOf({ shared })).toStrictEqual({ projects: [], total: 0 });
	});

	it('keeps the first 10 projects and counts all of them', () => {
		const shared = Array.from({ length: 12 }, (_, i) => ({
			role: 'workflow:editor',
			project: project(`p-${i}`),
		}));

		const { projects, total } = sharedProjectsOf({ shared });

		expect(projects).toHaveLength(10);
		expect(projects.at(-1)?.projectId).toBe('p-9');
		expect(total).toBe(12);
	});
});

describe('isSavedVersionLive', () => {
	it.each([
		[null, 'v-1', false],
		['v-1', 'v-1', true],
		['v-1', 'v-2', false],
	])('active version %s and saved version %s → %s', (activeVersionId, versionId, expected) => {
		expect(isSavedVersionLive({ activeVersionId, versionId })).toBe(expected);
	});
});

describe('buildAutomationCard', () => {
	it('builds a valid card for a schedule workflow that can be turned on', () => {
		const card = buildAutomationCard(cardInput());

		expect(card).toStrictEqual({
			workflowId: 'wf-1',
			versionId: 'v-2',
			title: 'Morning digest',
			why: ['You asked for it every weekday'],
			trigger: { kind: 'schedule', cron: '0 8 * * 1-5', timezone: 'Europe/London' },
			steps: [
				{ name: 'Every weekday', type: SCHEDULE },
				{ name: 'Send digest', type: SLACK },
			],
			stepCount: 2,
			recommended: {
				targetId: 'local',
				kind: 'local',
				reasons: ['always-on-trigger', 'no-cloud-linked'],
			},
			targets: [{ id: 'local', kind: 'local', status: 'online' }],
			visibleTo: { projectId: 'project-ops', projectName: 'Ops', projectType: 'team' },
			sharedWith: { projects: [], total: 0 },
			archived: false,
			active: false,
			hasUnpublishedChanges: false,
			canActivate: true,
			offered: { target: ['local'], activate: [true, false] },
		});
		expect(automationProposalCardSchema.parse(card)).toEqual(card);
	});

	it('offers only saving when the workflow cannot be turned on', () => {
		const card = buildAutomationCard(
			cardInput({ trigger: manualTrigger, schedule: undefined, canActivate: false }),
		);

		expect(card.trigger).toStrictEqual({ kind: 'manual' });
		expect(card.canActivate).toBe(false);
		expect(card.offered).toEqual({ target: ['local'], activate: [false] });
	});

	it.each([
		['no version is live', null, false, false],
		['the saved version is live', 'v-2', true, false],
		['an older version is live', 'v-1', true, true],
	])(
		'says whether a version is live and has unpublished changes when %s',
		(_label, activeVersionId, active, hasUnpublishedChanges) => {
			const card = buildAutomationCard(cardInput({ workflow: workflow({ activeVersionId }) }));

			expect(card.active).toBe(active);
			expect(card.hasUnpublishedChanges).toBe(hasUnpublishedChanges);
		},
	);

	it('says that keeping an archived workflow restores it', () => {
		const card = buildAutomationCard(cardInput({ workflow: workflow({ isArchived: true }) }));

		expect(card.archived).toBe(true);
	});

	it('counts all steps when the card shows only the first ones', () => {
		const nodes = [
			{ name: 'Note', type: STICKY },
			{ name: 'Off', type: SLACK, disabled: true },
			...Array.from({ length: 15 }, (_, i) => ({ name: `Step ${i}`, type: SLACK })),
			{ name: 'Broken', type: '' },
		];

		const card = buildAutomationCard(cardInput({ workflow: workflow({ nodes }) }));

		expect(card.steps).toHaveLength(12);
		expect(card.stepCount).toBe(15);
	});

	it('names the projects that the workflow is shared with', () => {
		const shared = [
			{ role: 'workflow:owner', project: teamProject },
			{ role: 'workflow:editor', project: project('p-sales') },
		];

		const card = buildAutomationCard(cardInput({ workflow: workflow({ shared }) }));

		expect(card.visibleTo.projectId).toBe('project-ops');
		expect(card.sharedWith).toEqual({
			projects: [{ projectId: 'p-sales', projectName: 'Project p-sales', projectType: 'team' }],
			total: 1,
		});
	});

	const reasonArb = fc.constantFrom<AutomationRecommendationReason>(
		'needs-local-files',
		'needs-local-commands',
		'needs-local-trigger',
		'always-on-trigger',
		'cloud-offline',
		'no-cloud-linked',
		'manual-only',
	);
	const nodeArb = fc.record({
		name: fc.string({ maxLength: 20 }),
		type: fc.constantFrom(SCHEDULE, SLACK, STICKY, 'n8n-nodes-base.webhook', ''),
		disabled: fc.boolean(),
	});

	const sharingArb = fc.record({
		role: fc.constantFrom('workflow:editor', 'workflow:viewer'),
		project: fc.record({
			id: fc.string({ minLength: 1, maxLength: 8 }),
			name: fc.string({ maxLength: 20 }),
			type: fc.constantFrom<'personal' | 'team'>('personal', 'team'),
		}),
	});

	it('always builds a card that the frontend schema accepts (property)', () => {
		fc.assert(
			fc.property(
				fc.record({
					nodes: fc.array(nodeArb, { maxLength: 30 }),
					canActivate: fc.boolean(),
					schedule: fc.option(
						fc.record({
							cron: fc.constantFrom('0 8 * * 1-5', '*/5 * * * *'),
							timezone: fc.constantFrom('UTC', 'Europe/London', 'Asia/Kolkata'),
						}),
						{ nil: undefined },
					),
					reasons: fc.array(reasonArb, { minLength: 1, maxLength: 3 }),
					sharings: fc.array(sharingArb, { maxLength: 15 }),
				}),
				({ nodes, canActivate, schedule, reasons, sharings }) => {
					const shared = [{ role: 'workflow:owner', project: teamProject }, ...sharings];
					const card = buildAutomationCard(
						cardInput({
							workflow: workflow({ nodes, shared }),
							schedule,
							canActivate,
							recommendation: { targetId: 'local', kind: 'local', reasons },
						}),
					);

					expect(automationProposalCardSchema.safeParse(card).success).toBe(true);
					expect(card.offered.activate.includes(true)).toBe(canActivate);
					expect(card.offered.activate).toContain(false);
					expect(card.stepCount).toBeGreaterThanOrEqual(card.steps.length);
					expect(card.sharedWith.total).toBe(sharings.length);
				},
			),
			{ numRuns: 300 },
		);
	});
});
