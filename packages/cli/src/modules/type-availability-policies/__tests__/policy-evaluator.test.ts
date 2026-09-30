import {
	evaluateComposedType,
	evaluateType,
	partitionTypesByAction,
	type PolicedType,
	type ScopePolicy,
} from '../policy-evaluator';
import type { PolicyAttachment, PolicyRule } from '../policy-rule.types';

const type = (name: string, baseName = name): PolicedType => ({ name, baseName });

const attachment = (overrides: Partial<PolicyAttachment>): PolicyAttachment => ({
	policyId: 'policy-1',
	rules: [],
	priority: 0,
	isFloor: false,
	...overrides,
});

const scopePolicy = (overrides: Partial<ScopePolicy> = {}): ScopePolicy => ({
	attachments: [],
	defaultAction: 'allow',
	...overrides,
});

describe('evaluateType', () => {
	it('lets an earlier deny rule take precedence over a later package allow', () => {
		const attachments = [
			attachment({
				rules: [
					{
						id: 'deny-execute-command',
						action: 'deny',
						selector: { kind: 'name', value: 'n8n-nodes-base.executeCommand' },
					},
					{
						id: 'deny-code',
						action: 'deny',
						selector: { kind: 'name', value: 'n8n-nodes-base.code' },
					},
					{
						id: 'allow-package',
						action: 'allow',
						selector: { kind: 'package', value: 'n8n-nodes-base' },
					},
				],
			}),
		];

		expect(evaluateType(attachments, 'deny', type('n8n-nodes-base.code'))).toEqual({
			action: 'deny',
			matchedRuleId: 'deny-code',
		});
		expect(evaluateType(attachments, 'deny', type('n8n-nodes-base.slack'))).toEqual({
			action: 'allow',
			matchedRuleId: 'allow-package',
		});
	});

	it.each(['allow', 'deny', 'delegate'] as const)(
		'falls back to the default action with a null matchedRuleId when nothing matches (%s)',
		(defaultAction) => {
			const attachments = [
				attachment({
					rules: [
						{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'n8n-nodes-base.slack' } },
					],
				}),
			];

			expect(evaluateType(attachments, defaultAction, type('n8n-nodes-base.gmail'))).toEqual({
				action: defaultAction,
				matchedRuleId: null,
			});
		},
	);

	it('distinguishes an explicit rule from a default action producing the same verdict', () => {
		const explicitAllow = evaluateType(
			[
				attachment({
					rules: [
						{
							id: 'r1',
							action: 'allow',
							selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
						},
					],
				}),
			],
			'allow',
			type('n8n-nodes-base.slack'),
		);
		const defaultAllow = evaluateType([], 'allow', type('n8n-nodes-base.slack'));

		expect(explicitAllow).toEqual({ action: 'allow', matchedRuleId: 'r1' });
		expect(defaultAllow).toEqual({ action: 'allow', matchedRuleId: null });
	});

	it('returns the default action with no attachments at all', () => {
		expect(evaluateType([], 'deny', type('n8n-nodes-base.slack'))).toEqual({
			action: 'deny',
			matchedRuleId: null,
		});
	});

	it('gives floor attachments precedence over normal attachments regardless of priority number', () => {
		const attachments = [
			attachment({
				isFloor: false,
				priority: 0,
				rules: [
					{
						id: 'normal-rule',
						action: 'allow',
						selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
					},
				],
			}),
			attachment({
				isFloor: true,
				priority: 5,
				rules: [
					{
						id: 'floor-rule',
						action: 'deny',
						selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
					},
				],
			}),
		];

		expect(evaluateType(attachments, 'allow', type('n8n-nodes-base.slack'))).toEqual({
			action: 'deny',
			matchedRuleId: 'floor-rule',
		});
	});

	it('orders attachments within the same partition by priority ascending', () => {
		const attachments = [
			attachment({
				priority: 2,
				rules: [
					{
						id: 'later',
						action: 'allow',
						selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
					},
				],
			}),
			attachment({
				priority: 1,
				rules: [
					{
						id: 'earlier',
						action: 'deny',
						selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
					},
				],
			}),
		];

		expect(evaluateType(attachments, 'allow', type('n8n-nodes-base.slack'))).toEqual({
			action: 'deny',
			matchedRuleId: 'earlier',
		});
	});

	it('falls through to the next attachment when the first has no matching rule', () => {
		const attachments = [
			attachment({
				priority: 1,
				rules: [
					{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'n8n-nodes-base.gmail' } },
				],
			}),
			attachment({
				priority: 2,
				rules: [
					{ id: 'r2', action: 'allow', selector: { kind: 'name', value: 'n8n-nodes-base.slack' } },
				],
			}),
		];

		expect(evaluateType(attachments, 'deny', type('n8n-nodes-base.slack'))).toEqual({
			action: 'allow',
			matchedRuleId: 'r2',
		});
	});

	describe('name selector', () => {
		it('requires an exact match, not a prefix', () => {
			const attachments = [
				attachment({
					rules: [
						{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'n8n-nodes-base.slack' } },
					],
				}),
			];

			expect(evaluateType(attachments, 'allow', type('n8n-nodes-base.slackTrigger'))).toEqual({
				action: 'allow',
				matchedRuleId: null,
			});
		});

		describe('tool variants', () => {
			const GMAIL = 'n8n-nodes-base.gmail';
			const GMAIL_TOOL = 'n8n-nodes-base.gmailTool';
			const denyGmail: PolicyRule = {
				id: 'deny-gmail',
				action: 'deny',
				selector: { kind: 'name', value: GMAIL },
			};
			const allowGmailTool: PolicyRule = {
				id: 'allow-gmail-tool',
				action: 'allow',
				selector: { kind: 'name', value: GMAIL_TOOL },
			};

			it('lets a rule for the base node match its synthetic tool variant', () => {
				const attachments = [attachment({ rules: [denyGmail] })];

				expect(evaluateType(attachments, 'allow', type(GMAIL_TOOL, GMAIL))).toEqual({
					action: 'deny',
					matchedRuleId: 'deny-gmail',
				});
			});

			it('does not let a rule for the variant reach the base node', () => {
				const attachments = [attachment({ rules: [allowGmailTool] })];

				expect(evaluateType(attachments, 'deny', type(GMAIL))).toEqual({
					action: 'deny',
					matchedRuleId: null,
				});
			});

			it('lets rule order decide between a base-node rule and a variant rule', () => {
				const baseFirst = [attachment({ rules: [denyGmail, allowGmailTool] })];
				const variantFirst = [attachment({ rules: [allowGmailTool, denyGmail] })];

				expect(evaluateType(baseFirst, 'allow', type(GMAIL_TOOL, GMAIL))).toEqual({
					action: 'deny',
					matchedRuleId: 'deny-gmail',
				});
				expect(evaluateType(variantFirst, 'allow', type(GMAIL_TOOL, GMAIL))).toEqual({
					action: 'allow',
					matchedRuleId: 'allow-gmail-tool',
				});
			});
		});
	});
});

describe('evaluateComposedType', () => {
	const TYPE = 'n8n-nodes-base.slack';
	const allowRule = (id: string) =>
		attachment({ rules: [{ id, action: 'allow', selector: { kind: 'name', value: TYPE } }] });
	const denyRule = (id: string) =>
		attachment({ rules: [{ id, action: 'deny', selector: { kind: 'name', value: TYPE } }] });

	it('an instance deny is final: a project allow never overrides it', () => {
		const instance = scopePolicy({ attachments: [denyRule('instance-deny')] });
		const project = scopePolicy({ attachments: [allowRule('project-allow')] });

		expect(evaluateComposedType(instance, project, type(TYPE))).toEqual({
			action: 'deny',
			scope: 'instance',
			matchedRuleId: 'instance-deny',
			optInAvailable: false,
		});
	});

	it('an instance delegate is satisfied by an explicit project allow rule', () => {
		const instance = scopePolicy({ defaultAction: 'delegate' });
		const project = scopePolicy({ attachments: [allowRule('project-allow')] });

		expect(evaluateComposedType(instance, project, type(TYPE))).toEqual({
			action: 'allow',
			scope: 'project',
			matchedRuleId: 'project-allow',
			optInAvailable: false,
		});
	});

	it('an instance delegate stays denied when the project has no policy row at all', () => {
		const instance = scopePolicy({ defaultAction: 'delegate' });
		const project = scopePolicy();

		expect(evaluateComposedType(instance, project, type(TYPE))).toEqual({
			action: 'deny',
			scope: 'instance',
			matchedRuleId: null,
			optInAvailable: true,
		});
	});

	it('an instance delegate is not satisfied by a bare project defaultAction of allow', () => {
		const instance = scopePolicy({ defaultAction: 'delegate' });
		const project = scopePolicy({ defaultAction: 'allow' });

		expect(evaluateComposedType(instance, project, type(TYPE))).toEqual({
			action: 'deny',
			scope: 'instance',
			matchedRuleId: null,
			optInAvailable: true,
		});
	});

	it('an instance delegate with an explicit project deny rule is attributed to the project', () => {
		const instance = scopePolicy({ defaultAction: 'delegate' });
		const project = scopePolicy({ attachments: [denyRule('project-deny')] });

		expect(evaluateComposedType(instance, project, type(TYPE))).toEqual({
			action: 'deny',
			scope: 'project',
			matchedRuleId: 'project-deny',
			optInAvailable: true,
		});
	});

	it('an instance delegate with a project defaultAction of deny is attributed to the project', () => {
		const instance = scopePolicy({ defaultAction: 'delegate' });
		const project = scopePolicy({ defaultAction: 'deny' });

		expect(evaluateComposedType(instance, project, type(TYPE))).toEqual({
			action: 'deny',
			scope: 'project',
			matchedRuleId: null,
			optInAvailable: true,
		});
	});

	it('an instance allow lets a project deny rule restrict further', () => {
		const instance = scopePolicy({ attachments: [allowRule('instance-allow')] });
		const project = scopePolicy({ attachments: [denyRule('project-deny')] });

		expect(evaluateComposedType(instance, project, type(TYPE))).toEqual({
			action: 'deny',
			scope: 'project',
			matchedRuleId: 'project-deny',
			optInAvailable: false,
		});
	});

	it('allows and attributes to the instance when neither scope is configured', () => {
		expect(evaluateComposedType(scopePolicy(), scopePolicy(), type(TYPE))).toEqual({
			action: 'allow',
			scope: 'instance',
			matchedRuleId: null,
			optInAvailable: false,
		});
	});

	it('allows and attributes to the project when the project explicitly allows on top of an instance allow', () => {
		const instance = scopePolicy();
		const project = scopePolicy({ attachments: [allowRule('project-allow')] });

		expect(evaluateComposedType(instance, project, type(TYPE))).toEqual({
			action: 'allow',
			scope: 'project',
			matchedRuleId: 'project-allow',
			optInAvailable: false,
		});
	});
});

describe('partitionTypesByAction', () => {
	const rule = (id: string, action: PolicyRule['action'], selector: PolicyRule['selector']) => ({
		id,
		action,
		selector,
	});

	const TYPES = [
		'n8n-nodes-base.code',
		'n8n-nodes-base.executeCommand',
		'@acme/n8n-nodes-acme.thing',
	];
	const POLICED_TYPES = TYPES.map((name) => type(name));

	it('falls every type back to the default action when no rule matches', () => {
		expect(partitionTypesByAction([], 'deny', POLICED_TYPES)).toEqual({
			allow: [],
			deny: TYPES,
			delegate: [],
		});
	});

	it('expands a package selector across every type in that package', () => {
		const rules = [rule('r1', 'deny', { kind: 'package', value: 'n8n-nodes-base' })];

		expect(partitionTypesByAction(rules, 'allow', POLICED_TYPES)).toEqual({
			allow: ['@acme/n8n-nodes-acme.thing'],
			deny: ['n8n-nodes-base.code', 'n8n-nodes-base.executeCommand'],
			delegate: [],
		});
	});

	it('keeps first-match order, so an earlier name rule survives a later package rule', () => {
		const rules = [
			rule('r1', 'allow', { kind: 'name', value: 'n8n-nodes-base.code' }),
			rule('r2', 'deny', { kind: 'package', value: 'n8n-nodes-base' }),
		];

		expect(partitionTypesByAction(rules, 'allow', POLICED_TYPES)).toEqual({
			allow: ['n8n-nodes-base.code', '@acme/n8n-nodes-acme.thing'],
			deny: ['n8n-nodes-base.executeCommand'],
			delegate: [],
		});
	});

	it('separates delegated types from allowed and denied ones', () => {
		const rules = [rule('r1', 'delegate', { kind: 'name', value: 'n8n-nodes-base.code' })];

		expect(partitionTypesByAction(rules, 'allow', POLICED_TYPES)).toEqual({
			allow: ['n8n-nodes-base.executeCommand', '@acme/n8n-nodes-acme.thing'],
			deny: [],
			delegate: ['n8n-nodes-base.code'],
		});
	});

	it('buckets a tool variant under its own name when a base-node rule decides it', () => {
		const rules = [rule('r1', 'deny', { kind: 'name', value: 'n8n-nodes-base.code' })];
		const types = [
			type('n8n-nodes-base.code'),
			type('n8n-nodes-base.codeTool', 'n8n-nodes-base.code'),
			type('n8n-nodes-base.executeCommand'),
		];

		expect(partitionTypesByAction(rules, 'allow', types)).toEqual({
			allow: ['n8n-nodes-base.executeCommand'],
			deny: ['n8n-nodes-base.code', 'n8n-nodes-base.codeTool'],
			delegate: [],
		});
	});

	it('returns empty buckets when the instance knows no types', () => {
		expect(partitionTypesByAction([], 'deny', [])).toEqual({
			allow: [],
			deny: [],
			delegate: [],
		});
	});
});
