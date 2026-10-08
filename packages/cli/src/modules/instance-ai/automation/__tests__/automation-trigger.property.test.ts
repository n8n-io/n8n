import fc from 'fast-check';

import {
	type AutomationNode,
	canStartAutomation,
	classifyAutomationTrigger,
} from '../automation-trigger';

// The pools come from the spec and are kept apart from the implementation on purpose.
const ACTIVATING_TYPES = [
	'n8n-nodes-base.scheduleTrigger',
	'n8n-nodes-base.cron',
	'n8n-nodes-base.interval',
	'n8n-nodes-base.webhook',
	'@n8n/n8n-nodes-langchain.mcpTrigger',
	'n8n-nodes-base.formTrigger',
	'@n8n/n8n-nodes-langchain.chatTrigger',
	'n8n-nodes-base.slackTrigger',
	'n8n-nodes-base.githubTrigger',
	'n8n-nodes-base.emailReadImap',
];
const MANUAL_TYPES = [
	'n8n-nodes-base.manualTrigger',
	'@n8n/n8n-nodes-langchain.manualChatTrigger',
	'n8n-nodes-base.start',
];
const NON_STARTING_TYPES = [
	'n8n-nodes-base.executeWorkflowTrigger',
	'n8n-nodes-base.errorTrigger',
	'n8n-nodes-base.evaluationTrigger',
	'n8n-nodes-base.stickyNote',
	'n8n-nodes-base.noOp',
	'n8n-nodes-base.httpRequest',
	'constructor',
	'__proto__',
	'toString',
];
const KNOWN_TYPES = [...ACTIVATING_TYPES, ...MANUAL_TYPES, ...NON_STARTING_TYPES];

// Free text that cannot name a trigger: n8n treats any type that contains "trigger" as one.
const plainType = fc
	.string({ maxLength: 20 })
	.filter((type) => !type.toLowerCase().includes('trigger') && !KNOWN_TYPES.includes(type));

const nodeArb: fc.Arbitrary<AutomationNode> = fc.record(
	{
		name: fc.string({ maxLength: 10 }),
		type: fc.oneof(fc.constantFrom(...KNOWN_TYPES), plainType),
		disabled: fc.boolean(),
	},
	{ requiredKeys: ['name', 'type'] },
);

const isEnabled = (node: AutomationNode) => node.disabled !== true;
const nodeRef = (node?: AutomationNode) => node && { name: node.name, type: node.type };

describe('classifyAutomationTrigger (property)', () => {
	it('can turn a workflow on only when an enabled trigger is not manual', () => {
		fc.assert(
			fc.property(fc.array(nodeArb, { maxLength: 12 }), (nodes) => {
				const expected = nodes.some(
					(node) => isEnabled(node) && ACTIVATING_TYPES.includes(node.type),
				);

				expect(classifyAutomationTrigger(nodes).canActivate).toBe(expected);
			}),
			{ numRuns: 500 },
		);
	});

	it('reports the first enabled trigger that can start the workflow', () => {
		fc.assert(
			fc.property(fc.array(nodeArb, { maxLength: 12 }), (nodes) => {
				const trigger = classifyAutomationTrigger(nodes);
				const activating = nodes.find(
					(node) => isEnabled(node) && ACTIVATING_TYPES.includes(node.type),
				);
				const manual = nodes.find((node) => isEnabled(node) && MANUAL_TYPES.includes(node.type));

				if (activating) {
					expect(trigger.kind).not.toBe('manual');
					expect(trigger.node).toEqual(nodeRef(activating));
				} else {
					expect(trigger.kind).toBe('manual');
					expect(trigger.node).toEqual(nodeRef(manual));
				}
			}),
			{ numRuns: 500 },
		);
	});

	it('does not depend on disabled nodes', () => {
		fc.assert(
			fc.property(fc.array(nodeArb, { maxLength: 12 }), (nodes) => {
				expect(classifyAutomationTrigger(nodes)).toEqual(
					classifyAutomationTrigger(nodes.filter(isEnabled)),
				);
			}),
			{ numRuns: 300 },
		);
	});
});

describe('canStartAutomation (property)', () => {
	it('is true exactly for the types that can turn a workflow on', () => {
		fc.assert(
			fc.property(fc.oneof(fc.constantFrom(...KNOWN_TYPES), plainType), (type) => {
				expect(canStartAutomation(type)).toBe(ACTIVATING_TYPES.includes(type));
			}),
			{ numRuns: 300 },
		);
	});
});
