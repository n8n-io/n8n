import type { VerifyBuiltWorkflowOutput, VerifyToolInput } from './types';
import { createRemediation } from '../../../workflow-loop/remediation';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';

export interface PreparedVerificationRun {
	verificationPinData: Record<string, unknown[]> | undefined;
	simulatedNodes: Array<{ nodeName: string; reason: string }>;
	/** Wait-gate nodes pinned with zero items — verification halts at these. */
	haltedGateNames: string[];
}

function getInvalidFixtureOverrideNodeNames(
	buildOutcome: WorkflowBuildOutcome,
	fixtureOverrides: VerifyToolInput['fixtureOverrides'],
): string[] {
	if (!fixtureOverrides) return [];

	const simulatedNodeNames = new Set(
		(buildOutcome.nodeSimulationPlan ?? [])
			.filter((verdict) => verdict.verdict === 'simulate')
			.map((verdict) => verdict.nodeName),
	);

	return Object.keys(fixtureOverrides).filter((nodeName) => !simulatedNodeNames.has(nodeName));
}

/**
 * Per-execution pin data for the verification run, assembled from the build
 * outcome sidecar. Fixture items take precedence over the legacy
 * `{_mockedCredential}` markers (still read for build outcomes stored before
 * the marker channel was retired). A `simulate`-verdict node without a fixture
 * is still pinned with an empty item, because preventing a destructive call is
 * more important than preserving realistic output.
 */
function buildVerificationPinData(
	buildOutcome: WorkflowBuildOutcome,
	fixtureOverrides: VerifyToolInput['fixtureOverrides'],
): PreparedVerificationRun {
	const merged: Record<string, unknown[]> = { ...(buildOutcome.verificationPinData ?? {}) };
	const fixtures = buildOutcome.simulationFixtures ?? {};
	const simulatedNodes: Array<{ nodeName: string; reason: string }> = [];
	const haltedGateNames: string[] = [];

	for (const verdict of buildOutcome.nodeSimulationPlan ?? []) {
		if (verdict.verdict !== 'simulate') continue;
		simulatedNodes.push({ nodeName: verdict.nodeName, reason: verdict.reason });
		if (verdict.haltBranch) {
			// Zero items halt the branch at the gate; a fixture would loop forever.
			haltedGateNames.push(verdict.nodeName);
			merged[verdict.nodeName] = [];
			continue;
		}
		const items = fixtures[verdict.nodeName];
		merged[verdict.nodeName] = items?.length ? items : [{}];
	}

	if (fixtureOverrides) {
		for (const [nodeName, items] of Object.entries(fixtureOverrides)) {
			if (haltedGateNames.includes(nodeName)) continue;
			merged[nodeName] = items;
		}
	}

	return {
		verificationPinData: Object.keys(merged).length > 0 ? merged : undefined,
		simulatedNodes,
		haltedGateNames,
	};
}

export function prepareVerificationRun(
	buildOutcome: WorkflowBuildOutcome,
	fixtureOverrides: VerifyToolInput['fixtureOverrides'],
):
	| { kind: 'ready'; prepared: PreparedVerificationRun }
	| { kind: 'blocked'; result: VerifyBuiltWorkflowOutput } {
	const haltedOverrideNodeNames = Object.keys(fixtureOverrides ?? {}).filter((nodeName) =>
		(buildOutcome.nodeSimulationPlan ?? []).some(
			(verdict) =>
				verdict.nodeName === nodeName && verdict.verdict === 'simulate' && verdict.haltBranch,
		),
	);
	if (haltedOverrideNodeNames.length > 0) {
		const guidance =
			`Node(s) ${haltedOverrideNodeNames.join(', ')} pause the workflow for a human decision and sit on a loop — ` +
			'verification always halts there and their output cannot be overridden: a canned response would ' +
			're-run the loop with the same answer forever. Treat reaching the gate as verified and tell the ' +
			'user the approval loop needs a manual end-to-end test.';
		const remediation = createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'halted_wait_gate_override',
			guidance,
		});
		return {
			kind: 'blocked',
			result: {
				success: false,
				error: guidance,
				remediation,
				guidance,
			},
		};
	}

	const invalidFixtureOverrideNodeNames = getInvalidFixtureOverrideNodeNames(
		buildOutcome,
		fixtureOverrides,
	);
	if (invalidFixtureOverrideNodeNames.length > 0) {
		const guidance =
			'Fixture overrides can only target nodes already classified as simulated in the build outcome. ' +
			`Invalid override node(s): ${invalidFixtureOverrideNodeNames.join(', ')}. ` +
			'Do not run the workflow live; rebuild with declared output fixtures or override a simulated node.';
		const remediation = createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'invalid_fixture_override',
			guidance,
		});
		return {
			kind: 'blocked',
			result: {
				success: false,
				error: guidance,
				remediation,
				guidance,
			},
		};
	}

	return { kind: 'ready', prepared: buildVerificationPinData(buildOutcome, fixtureOverrides) };
}
