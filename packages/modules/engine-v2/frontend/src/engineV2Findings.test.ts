import { mockEngineV2Compatibility } from './__tests__/mocks';
import type { EngineCompatibilityReason } from './engineV2Check';
import { findEngineV2Issues, groupEngineV2Reasons, hasBlockingGroup } from './engineV2Findings';

function reason(
	code: EngineCompatibilityReason['code'],
	overrides: Partial<EngineCompatibilityReason> = {},
): EngineCompatibilityReason {
	return { code, kind: 'temporary', severity: 'blocking', message: `${code}.`, ...overrides };
}

describe('groupEngineV2Reasons', () => {
	it('puts two reasons on one node in one group', () => {
		const groups = groupEngineV2Reasons([
			reason('RETRY_ON_FAIL', { nodeId: 'n1', nodeName: 'HTTP' }),
			reason('EXECUTE_ONCE', { nodeId: 'n1', nodeName: 'HTTP' }),
		]);

		expect(groups).toHaveLength(1);
		expect(groups[0]).toMatchObject({ nodeId: 'n1', nodeName: 'HTTP' });
		expect(groups[0].reasons.map((r) => r.code)).toEqual(['RETRY_ON_FAIL', 'EXECUTE_ONCE']);
	});

	it('gives each reason with no node a group of its own', () => {
		const groups = groupEngineV2Reasons([reason('ERROR_WORKFLOW'), reason('END_USER_CREDENTIALS')]);

		expect(groups).toHaveLength(2);
		expect(new Set(groups.map((group) => group.id)).size).toBe(2);
		expect(groups.every((group) => group.nodeId === undefined)).toBe(true);
	});

	it('groups by node name when a reason has no node id', () => {
		const groups = groupEngineV2Reasons([
			reason('NESTED_LOOP', { nodeName: 'Loop' }),
			reason('LOOP_EXITS_MID_BODY', { nodeName: 'Loop' }),
		]);

		expect(groups).toHaveLength(1);
	});

	it('takes the worst severity of a node, and lists its blocking reason first', () => {
		const [group] = groupEngineV2Reasons([
			reason('INPUT_SLOT_CONVERGENCE', { nodeId: 'n1', severity: 'warning' }),
			reason('RETRY_ON_FAIL', { nodeId: 'n1' }),
		]);

		expect(group.severity).toBe('blocking');
		expect(group.reasons.map((r) => r.code)).toEqual(['RETRY_ON_FAIL', 'INPUT_SLOT_CONVERGENCE']);
	});

	it('puts blocking groups first, each part in the order of the check', () => {
		const groups = groupEngineV2Reasons([
			reason('REDACTION_POLICY', { severity: 'warning' }),
			reason('RETRY_ON_FAIL', { nodeId: 'a' }),
			reason('INPUT_SLOT_CONVERGENCE', { nodeId: 'b', severity: 'warning' }),
			reason('ERROR_WORKFLOW'),
		]);

		expect(groups.map((group) => group.reasons[0].code)).toEqual([
			'RETRY_ON_FAIL',
			'ERROR_WORKFLOW',
			'REDACTION_POLICY',
			'INPUT_SLOT_CONVERGENCE',
		]);
		expect(hasBlockingGroup(groups)).toBe(true);
	});

	it('reports no blocking group when every reason is a warning', () => {
		expect(
			hasBlockingGroup(groupEngineV2Reasons([reason('REDACTION_POLICY', { severity: 'warning' })])),
		).toBe(false);
	});
});

describe('findEngineV2Issues', () => {
	it('runs the check whatever the engine, and groups the result', () => {
		const { checkWorkflow } = mockEngineV2Compatibility({
			reasons: [reason('RETRY_ON_FAIL', { nodeId: 'a' }), reason('EXECUTE_ONCE', { nodeId: 'a' })],
		});
		const workflow = { nodes: [], connections: {}, settings: { engineType: 'v1' as const } };

		expect(findEngineV2Issues(workflow)).toHaveLength(1);
		expect(checkWorkflow).toHaveBeenCalledWith(workflow);
	});
});
