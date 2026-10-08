import { sharedCardRule, type InstanceAiConfirmRequest, type SharedCard } from '@n8n/api-types';
import fc from 'fast-check';

/**
 * Properties of the card rules in `@n8n/api-types`, which decide what a teammate can answer
 * in a shared Assistant thread. They live here because fast-check is a dev dependency of cli.
 */

const LISTED_TOOLS = [
	'propose_automation',
	'workflows',
	'executions',
	'credentials',
	'data-tables',
	'workspace',
];
const ACTIONS = [
	'delete',
	'unarchive',
	'publish',
	'unpublish',
	'restore-version',
	'update-version',
	'setup',
	'run',
	'run-step',
	'stop',
	'create',
	'add-column',
	'insert-rows',
	'create-folder',
	'delete-folder',
	'tag-workflow',
];
const PLAIN_CARD_FIELDS = ['requestId', 'message', 'severity', 'resourceName', 'approvalDetails'];

const id = fc.oneof(fc.constantFrom('wf-1', 'c-1', 't-1', 'project-1', ''), fc.string());
const projectId = fc.constantFrom('project-1', 'project-2');
const input = fc.record(
	{
		action: fc.oneof(fc.constantFrom(...ACTIONS), fc.string()),
		workflowId: id,
		credentialId: id,
		dataTableId: id,
		projectId: fc.oneof(projectId, fc.string()),
	},
	{ requiredKeys: [] },
);
const plainCard = fc.record(
	{
		requestId: fc.string(),
		message: fc.string(),
		severity: fc.constantFrom('info', 'warning', 'destructive'),
		resourceName: fc.string(),
		approvalDetails: fc.dictionary(fc.string(), fc.jsonValue()),
	},
	{ requiredKeys: [] },
);
const capabilityCard = fc.record({
	offered: fc.dictionary(fc.string(), fc.array(fc.oneof(fc.boolean(), fc.string()))),
	automationProposal: fc.option(fc.record({ archived: fc.boolean() }), { nil: undefined }),
});
const payload = fc.oneof(plainCard, capabilityCard, fc.jsonValue());
const values = fc.option(
	fc.dictionary(fc.constantFrom('activate', 'other'), fc.oneof(fc.boolean(), fc.string())),
	{ nil: undefined },
);
const approval = fc.record(
	{
		kind: fc.constant('approval' as const),
		approved: fc.boolean(),
		scope: fc.constantFrom('once' as const, 'session' as const),
		userInput: fc.string(),
	},
	{ requiredKeys: ['kind', 'approved'] },
);
const decision = fc.record(
	{ kind: fc.constant('capabilityDecision' as const), approved: fc.boolean(), values },
	{ requiredKeys: ['kind', 'approved'] },
);
const otherAnswer = fc.constantFrom<InstanceAiConfirmRequest>(
	{ kind: 'planDeny' },
	{ kind: 'domainAccessDeny' },
	{ kind: 'domainAccessApprove', domainAccessAction: 'allow_once' },
	{ kind: 'questions', answers: [] },
	{ kind: 'credentialSelection', credentials: {} },
	{ kind: 'setupWorkflowApply' },
	{ kind: 'mcpConnect', approved: true },
	{ kind: 'resourceDecision', resourceDecision: 'allowOnce' },
);
const answer = fc.oneof(approval, decision, otherAnswer);

const card = (toolName: fc.Arbitrary<string>) =>
	fc.record<SharedCard>({
		toolName,
		input: fc.oneof(input, fc.jsonValue()),
		suspendPayload: payload,
	});
const listedCard = card(fc.constantFrom(...LISTED_TOOLS));

describe('shared card rule properties', () => {
	it('never lets a teammate answer with text', () => {
		const withText = approval.filter((value) => (value.userInput ?? '').trim().length > 0);
		fc.assert(
			fc.property(listedCard, withText, projectId, (pending, value, project) => {
				expect(sharedCardRule(pending, value, project)).toBeUndefined();
			}),
		);
	});

	it('never lets a teammate give an answer that is not an approval or a capability decision', () => {
		fc.assert(
			fc.property(listedCard, otherAnswer, projectId, (pending, value, project) => {
				expect(sharedCardRule(pending, value, project)).toBeUndefined();
			}),
		);
	});

	it('never lets a teammate answer a card of a tool that has no rule', () => {
		const unlisted = fc.string().filter((name) => !LISTED_TOOLS.includes(name));
		fc.assert(
			fc.property(card(unlisted), answer, projectId, (pending, value, project) => {
				expect(sharedCardRule(pending, value, project)).toBeUndefined();
			}),
		);
	});

	it('never lets a teammate approve a card with a field that a yes-or-no card has not', () => {
		const extraField = fc.string().filter((field) => !PLAIN_CARD_FIELDS.includes(field));
		const richCard = fc
			.tuple(plainCard, extraField, fc.jsonValue())
			.map(([plain, field, value]) => ({ ...plain, [field]: value }));
		fc.assert(
			fc.property(
				listedCard,
				richCard,
				approval,
				projectId,
				(pending, cardPayload, value, project) => {
					const rule = sharedCardRule({ ...pending, suspendPayload: cardPayload }, value, project);
					expect(rule).toBeUndefined();
				},
			),
		);
	});

	it('names a target from the input or the thread project, and at least one scope', () => {
		fc.assert(
			fc.property(listedCard, answer, projectId, (pending, value, project) => {
				const rule = sharedCardRule(pending, value, project);
				if (!rule) return;
				expect(rule.scopes.length).toBeGreaterThan(0);
				expect(rule.target.id.length).toBeGreaterThan(0);
				const fields = pending.input as Record<string, unknown>;
				const named = [fields.workflowId, fields.credentialId, fields.dataTableId, project];
				expect(named).toContain(rule.target.id);
			}),
		);
	});

	it('keeps folder cards of another project for the owner', () => {
		const folderInput = fc.record({
			action: fc.constantFrom('create-folder', 'delete-folder'),
			projectId: fc.string(),
		});
		fc.assert(
			fc.property(
				folderInput,
				plainCard,
				approval,
				projectId,
				(fields, cardPayload, value, project) => {
					fc.pre(fields.projectId !== project);
					const pending = { toolName: 'workspace', input: fields, suspendPayload: cardPayload };
					expect(sharedCardRule(pending, value, project)).toBeUndefined();
				},
			),
		);
	});

	it('always asks for workflow update on a proposal, and for publish only to turn it on', () => {
		fc.assert(
			fc.property(capabilityCard, decision, projectId, (cardPayload, value, project) => {
				const pending = {
					toolName: 'propose_automation',
					input: { workflowId: 'wf-1' },
					suspendPayload: cardPayload,
				};
				const rule = sharedCardRule(pending, value, project);
				expect(rule?.scopes).toContain('workflow:update');
				const turnsOn = value.approved && value.values?.activate === true;
				expect(rule?.scopes.includes('workflow:publish')).toBe(turnsOn);
			}),
		);
	});
});
