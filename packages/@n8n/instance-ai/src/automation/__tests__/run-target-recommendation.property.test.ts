import fc from 'fast-check';

import type { RunTargetOption } from '../run-target-recommendation';
import { isAlwaysOnTrigger, recommendRunTarget } from '../run-target-recommendation';

const MANUAL = 'n8n-nodes-base.manualTrigger';

// The local-only types from the spec, kept apart from the implementation on purpose.
const SPEC_LOCAL_ONLY = [
	'n8n-nodes-base.readWriteFile',
	'n8n-nodes-base.readBinaryFile',
	'n8n-nodes-base.readBinaryFiles',
	'n8n-nodes-base.writeBinaryFile',
	'n8n-nodes-base.executeCommand',
	'n8n-nodes-base.localFileTrigger',
];
const LOCAL_REASONS = ['needs-local-files', 'needs-local-commands', 'needs-local-trigger'];

// A pool that hits every rule often, plus names that exist on every plain object.
const KNOWN_TYPES = [
	...SPEC_LOCAL_ONLY,
	MANUAL,
	'n8n-nodes-base.scheduleTrigger',
	'n8n-nodes-base.cron',
	'n8n-nodes-base.interval',
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'@n8n/n8n-nodes-langchain.chatTrigger',
	'n8n-nodes-base.slackTrigger',
	'n8n-nodes-base.executeWorkflowTrigger',
	'n8n-nodes-base.errorTrigger',
	'n8n-nodes-base.slack',
	'n8n-nodes-base.set',
	'constructor',
	'__proto__',
	'toString',
	'Trigger',
	'',
];

const nodeTypeArb = fc.oneof(
	{ weight: 4, arbitrary: fc.constantFrom(...KNOWN_TYPES) },
	{ weight: 1, arbitrary: fc.string({ maxLength: 20 }) },
);
const nodeTypesArb = fc.array(nodeTypeArb, { maxLength: 12 });

const targetArb: fc.Arbitrary<RunTargetOption> = fc.record({
	id: fc.oneof(fc.constantFrom('local', 'laptop', 'eu', 'us'), fc.string({ maxLength: 6 })),
	kind: fc.constantFrom('local', 'linked'),
	label: fc.string({ maxLength: 10 }),
	status: fc.constantFrom('online', 'offline', 'unauthorised', 'unknown'),
});
const targetsArb = fc.array(targetArb, { maxLength: 5 });

const isLocalOnly = (nodeType: string) => SPEC_LOCAL_ONLY.includes(nodeType);

describe('recommendRunTarget properties', () => {
	it('never throws and always gives at least one reason, without duplicates', () => {
		fc.assert(
			fc.property(nodeTypesArb, targetsArb, (nodeTypes, targets) => {
				const { reasons } = recommendRunTarget({ nodeTypes, targets });

				expect(reasons.length).toBeGreaterThan(0);
				expect(new Set(reasons).size).toBe(reasons.length);
			}),
		);
	});

	it('picks one of the given target ids, or "local" when there are no targets', () => {
		fc.assert(
			fc.property(nodeTypesArb, targetsArb, (nodeTypes, targets) => {
				const { targetId } = recommendRunTarget({ nodeTypes, targets });
				const allowed = targets.length === 0 ? ['local'] : targets.map((target) => target.id);

				expect(allowed).toContain(targetId);
			}),
		);
	});

	it('keeps the workflow local, with only local reasons, when any local-only node is present', () => {
		fc.assert(
			fc.property(
				nodeTypesArb,
				fc.constantFrom(...SPEC_LOCAL_ONLY),
				fc.nat(),
				targetsArb.filter((targets) => targets.length > 0),
				(nodeTypes, localOnly, position, targets) => {
					const withLocal = nodeTypes.toSpliced(position % (nodeTypes.length + 1), 0, localOnly);
					const result = recommendRunTarget({ nodeTypes: withLocal, targets });

					expect(result.kind).toBe('local');
					for (const reason of result.reasons) expect(LOCAL_REASONS).toContain(reason);
				},
			),
		);
	});

	it('never picks a linked target when no always-on trigger is present', () => {
		const withoutAlwaysOn = nodeTypesArb.map((types) =>
			types.filter((nodeType) => !isAlwaysOnTrigger(nodeType)),
		);
		fc.assert(
			fc.property(withoutAlwaysOn, targetsArb, (nodeTypes, targets) => {
				expect(recommendRunTarget({ nodeTypes, targets }).kind).toBe('local');
			}),
		);
	});

	it('picks a linked target only when it is the first online linked target', () => {
		fc.assert(
			fc.property(nodeTypesArb, targetsArb, (nodeTypes, targets) => {
				const result = recommendRunTarget({ nodeTypes, targets });
				fc.pre(result.kind === 'linked');
				const firstOnline = targets.find(
					(target) => target.kind === 'linked' && target.status === 'online',
				);

				expect(result.targetId).toBe(firstOnline?.id);
				expect(result.reasons).toEqual(['always-on-trigger']);
				expect(nodeTypes.some(isLocalOnly)).toBe(false);
			}),
		);
	});

	it('gives the same result when a manual trigger is added anywhere', () => {
		fc.assert(
			fc.property(nodeTypesArb, targetsArb, fc.nat(), (nodeTypes, targets, position) => {
				const withManual = nodeTypes.toSpliced(position % (nodeTypes.length + 1), 0, MANUAL);

				expect(recommendRunTarget({ nodeTypes: withManual, targets })).toStrictEqual(
					recommendRunTarget({ nodeTypes, targets }),
				);
			}),
		);
	});

	it('gives the same target and kind for any order of the nodes', () => {
		const shuffledArb = nodeTypesArb.chain((nodeTypes) =>
			fc
				.shuffledSubarray(nodeTypes, { minLength: nodeTypes.length, maxLength: nodeTypes.length })
				.map((shuffled) => ({ nodeTypes, shuffled })),
		);
		fc.assert(
			fc.property(shuffledArb, targetsArb, ({ nodeTypes, shuffled }, targets) => {
				const before = recommendRunTarget({ nodeTypes, targets });
				const after = recommendRunTarget({ nodeTypes: shuffled, targets });

				expect(after.targetId).toBe(before.targetId);
				expect(after.kind).toBe(before.kind);
				expect(after.reasons.toSorted()).toEqual(before.reasons.toSorted());
			}),
		);
	});
});
