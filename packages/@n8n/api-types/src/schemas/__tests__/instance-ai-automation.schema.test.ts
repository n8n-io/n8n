import {
	AUTOMATION_LOCAL_TARGET_ID,
	type AutomationProposalCard,
	automationProposalCardSchema,
	automationProposalResultSchema,
	automationRecommendationReasonSchema,
} from '../instance-ai-automation.schema';
import {
	confirmationRequestPayloadSchema,
	type InstanceAiConfirmationRequestPayload,
	isDisplayableConfirmationRequest,
} from '../instance-ai.schema';

function makeCard(overrides: Partial<AutomationProposalCard> = {}): AutomationProposalCard {
	return {
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
	};
}

function makeConfirmation(
	overrides: Partial<InstanceAiConfirmationRequestPayload> = {},
): InstanceAiConfirmationRequestPayload {
	return {
		requestId: 'req-1',
		toolCallId: 'tc-1',
		toolName: 'propose_automation',
		args: {},
		severity: 'info',
		message: 'Want "Morning digest" to run automatically?',
		...overrides,
	};
}

describe('automationProposalCardSchema', () => {
	it('accepts a complete card unchanged', () => {
		const card = makeCard();

		expect(automationProposalCardSchema.parse(card)).toEqual(card);
	});

	it('accepts a manual workflow without cron, reasons for it and only "save" offered', () => {
		const card = makeCard({
			trigger: { kind: 'manual' },
			why: [],
			recommended: { targetId: 'local', kind: 'local', reasons: ['manual-only'] },
			canActivate: false,
			offered: { target: ['local'], activate: [false] },
		});

		expect(automationProposalCardSchema.parse(card)).toEqual(card);
	});

	it('accepts a shared, archived workflow with unpublished changes and left-out steps', () => {
		const card = makeCard({
			stepCount: 40,
			sharedWith: {
				projects: [{ projectId: 'project-2', projectName: 'Sales', projectType: 'team' }],
				total: 3,
			},
			archived: true,
			active: true,
			hasUnpublishedChanges: true,
		});

		expect(automationProposalCardSchema.parse(card)).toEqual(card);
	});

	it.each(['UTC', 'America/Argentina/Buenos_Aires', 'Etc/GMT+5'])(
		'accepts the time zone %s of a schedule',
		(timezone) => {
			const card = makeCard({ trigger: { kind: 'schedule', cron: '0 8 * * *', timezone } });

			expect(automationProposalCardSchema.parse(card)).toEqual(card);
		},
	);

	it('accepts a linked target with a label for later slices', () => {
		const card = makeCard({
			targets: [
				{ id: 'local', kind: 'local', status: 'online' },
				{ id: 'instance-7', kind: 'linked', label: 'Team cloud', status: 'offline' },
			],
		});

		expect(automationProposalCardSchema.safeParse(card).success).toBe(true);
	});

	it.each([
		['an empty title', { title: '' }],
		['a title over 120 characters', { title: 'x'.repeat(121) }],
		['six reasons why', { why: ['a', 'b', 'c', 'd', 'e', 'f'] }],
		['a reason why over 200 characters', { why: ['x'.repeat(201)] }],
		['an empty reason why', { why: [''] }],
		[
			'thirteen steps',
			{ steps: Array.from({ length: 13 }, (_, i) => ({ name: `Step ${i}`, type: 'a.b' })) },
		],
		['a step without a type', { steps: [{ name: 'Step', type: '' }] }],
		['an unknown trigger kind', { trigger: { kind: 'email' } }],
		['an empty cron', { trigger: { kind: 'schedule', cron: '' } }],
		['a cron over 100 characters', { trigger: { kind: 'schedule', cron: '0'.repeat(101) } }],
		[
			'a time zone that does not exist',
			{ trigger: { kind: 'schedule', cron: '0 8 * * *', timezone: 'Mars/Olympus_Mons' } },
		],
		['an empty time zone', { trigger: { kind: 'schedule', cron: '0 8 * * *', timezone: '' } }],
		[
			'a time zone that is not a name',
			{ trigger: { kind: 'schedule', cron: '0 8 * * *', timezone: 'Europe/London; x' } },
		],
		[
			'a recommendation without reasons',
			{ recommended: { targetId: 'local', kind: 'local', reasons: [] } },
		],
		[
			'an unknown recommendation reason',
			{ recommended: { targetId: 'local', kind: 'local', reasons: ['cheapest'] } },
		],
		['no targets', { targets: [] }],
		[
			'a target with an unknown status',
			{ targets: [{ id: 'local', kind: 'local', status: 'up' }] },
		],
		[
			'an unknown project type',
			{ visibleTo: { projectId: 'p', projectName: 'P', projectType: 'public' } },
		],
		['an empty version id', { versionId: '' }],
		['no version id', { versionId: undefined }],
		['a negative step count', { stepCount: -1 }],
		['a step count that is not a whole number', { stepCount: 1.5 }],
		[
			'eleven projects it is shared with',
			{
				sharedWith: {
					projects: Array.from({ length: 11 }, (_, i) => ({
						projectId: `p-${i}`,
						projectName: `P ${i}`,
						projectType: 'team',
					})),
					total: 11,
				},
			},
		],
		[
			'a shared project without an id',
			{
				sharedWith: {
					projects: [{ projectId: '', projectName: 'P', projectType: 'team' }],
					total: 1,
				},
			},
		],
		['a negative number of shared projects', { sharedWith: { projects: [], total: -1 } }],
		['no archived flag', { archived: undefined }],
		['no flag for unpublished changes', { hasUnpublishedChanges: undefined }],
		['no offered activation', { offered: { target: ['local'], activate: [] } }],
		['no offered target', { offered: { target: [], activate: [false] } }],
		[
			'an offered activation that is not a boolean',
			{ offered: { target: ['local'], activate: ['yes'] } },
		],
	])('rejects %s', (_label, overrides) => {
		const card = { ...makeCard(), ...overrides };

		expect(automationProposalCardSchema.safeParse(card).success).toBe(false);
	});

	it('accepts the limits exactly', () => {
		const card = makeCard({
			title: 'x'.repeat(120),
			why: Array.from({ length: 5 }, () => 'y'.repeat(200)),
			steps: Array.from({ length: 12 }, (_, i) => ({ name: `Step ${i}`, type: 'a.b' })),
			sharedWith: {
				projects: Array.from({ length: 10 }, (_, i) => ({
					projectId: `p-${i}`,
					projectName: `P ${i}`,
					projectType: 'team' as const,
				})),
				total: 10,
			},
		});

		expect(automationProposalCardSchema.safeParse(card).success).toBe(true);
	});

	it('lists the reasons of the run-target recommendation', () => {
		expect(automationRecommendationReasonSchema.options).toEqual([
			'needs-local-files',
			'needs-local-commands',
			'needs-local-trigger',
			'always-on-trigger',
			'cloud-offline',
			'no-cloud-linked',
			'manual-only',
		]);
	});
});

describe('confirmationRequestPayloadSchema with an automation proposal', () => {
	it('keeps the automation proposal of the card', () => {
		const payload = makeConfirmation({ automationProposal: makeCard() });

		expect(confirmationRequestPayloadSchema.parse(payload)).toEqual(payload);
	});

	it('rejects a payload whose automation proposal is not valid', () => {
		const payload = makeConfirmation({ automationProposal: makeCard({ title: '' }) });

		expect(confirmationRequestPayloadSchema.safeParse(payload).success).toBe(false);
	});

	it('shows the card to the user', () => {
		expect(
			isDisplayableConfirmationRequest(makeConfirmation({ automationProposal: makeCard() })),
		).toBe(true);
	});
});

describe('automationProposalResultSchema', () => {
	it('accepts a kept workflow that is on', () => {
		const result = {
			workflowId: 'wf-1',
			url: 'http://localhost/workflow/wf-1',
			active: true,
			kept: true,
		};

		expect(automationProposalResultSchema.parse(result)).toEqual(result);
	});

	it('accepts warnings and the error of a failed activation', () => {
		const result = {
			workflowId: 'wf-1',
			url: 'http://localhost/workflow/wf-1',
			active: false,
			kept: true,
			warnings: ['The cron expression is not valid'],
			error: 'Could not turn it on',
		};

		expect(automationProposalResultSchema.parse(result)).toEqual(result);
	});

	it('rejects a result that did not keep the workflow', () => {
		const result = { workflowId: 'wf-1', url: 'u', active: false, kept: false };

		expect(automationProposalResultSchema.safeParse(result).success).toBe(false);
	});
});
