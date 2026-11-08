import type { VerifyBuiltWorkflowOutput, VerifyToolInput } from './types';
import { itemsForNode } from '../../../utils/node-keyed-items';
import { createRemediation } from '../../../workflow-loop/remediation';
import type {
	WaitGateScript,
	WorkflowBuildOutcome,
} from '../../../workflow-loop/workflow-loop-state';

export interface PreparedVerificationRun {
	verificationPinData: Record<string, unknown[]> | undefined;
	simulatedNodes: Array<{ nodeName: string; reason: string }>;
	/** Wait-gate nodes pinned with zero items — verification halts at these. */
	haltedGateNames: string[];
	/** When set, verify runs one scripted pass per decision instead of halting. */
	gateScript?: WaitGateScript;
	/** Overrides on halted gates that the run ignored, with a note for the agent. */
	ignoredGateOverrideNote?: string;
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
 * still gets an empty item, because preventing a destructive call is more
 * important than preserving realistic output. Planning gives every simulated
 * node a schema-shaped item, so this floor only catches outcomes stored before
 * that existed.
 */
function buildVerificationPinData(
	buildOutcome: WorkflowBuildOutcome,
	fixtureOverrides: VerifyToolInput['fixtureOverrides'],
): PreparedVerificationRun {
	// Keyed by Map, not by object literal: node names are free-form, and a few
	// of them do not survive being assigned as a plain object key — the entry
	// is dropped and the node it belongs to goes into the run unpinned.
	// oxlint-disable-next-line typescript/no-deprecated
	const merged = new Map<string, unknown[]>(Object.entries(buildOutcome.verificationPinData ?? {}));
	const fixtures = buildOutcome.simulationFixtures ?? {};
	const simulatedNodes: Array<{ nodeName: string; reason: string }> = [];
	const haltedGateNames: string[] = [];

	for (const verdict of buildOutcome.nodeSimulationPlan ?? []) {
		if (verdict.verdict !== 'simulate') continue;
		simulatedNodes.push({ nodeName: verdict.nodeName, reason: verdict.reason });
		if (verdict.haltBranch) {
			// Zero items halt the branch at the gate; a fixture would loop forever.
			haltedGateNames.push(verdict.nodeName);
			merged.set(verdict.nodeName, []);
			continue;
		}
		const items = itemsForNode(fixtures, verdict.nodeName);
		merged.set(verdict.nodeName, items?.length ? items : [{}]);
	}

	if (fixtureOverrides) {
		for (const [nodeName, items] of Object.entries(fixtureOverrides)) {
			if (haltedGateNames.includes(nodeName)) continue;
			merged.set(nodeName, items);
		}
	}

	const gateScript = (buildOutcome.waitGateScripts ?? []).find((script) =>
		haltedGateNames.includes(script.nodeName),
	);

	return {
		verificationPinData: merged.size > 0 ? Object.fromEntries(merged) : undefined,
		simulatedNodes,
		haltedGateNames,
		...(gateScript ? { gateScript } : {}),
	};
}

function blocked(
	reason: string,
	guidance: string,
): {
	kind: 'blocked';
	result: VerifyBuiltWorkflowOutput;
} {
	const remediation = createRemediation({
		category: 'blocked',
		shouldEdit: false,
		reason,
		guidance,
	});
	return { kind: 'blocked', result: { success: false, error: guidance, remediation, guidance } };
}

export function prepareVerificationRun(
	buildOutcome: WorkflowBuildOutcome,
	input: Pick<VerifyToolInput, 'fixtureOverrides' | 'allowZeroItemFixtures'>,
):
	| { kind: 'ready'; prepared: PreparedVerificationRun }
	| { kind: 'blocked'; result: VerifyBuiltWorkflowOutput } {
	const { fixtureOverrides } = input;
	const allowedZeroItemNodes = new Set(input.allowZeroItemFixtures ?? []);
	const haltedOverrideNodeNames = Object.keys(fixtureOverrides ?? {}).filter((nodeName) =>
		(buildOutcome.nodeSimulationPlan ?? []).some(
			(verdict) =>
				verdict.nodeName === nodeName && verdict.verdict === 'simulate' && verdict.haltBranch,
		),
	);
	// Rejecting these cost a whole extra verify call to drop them, so the run
	// ignores them (buildVerificationPinData already skips halted gates) and says so.
	const ignoredGateOverrideNote =
		haltedOverrideNodeNames.length > 0
			? `Ignored fixture override(s) for ${haltedOverrideNodeNames.join(', ')}: these nodes pause for a human ` +
				'decision inside a loop, so a fixed answer would repeat the loop forever. Verification drove them ' +
				'with scripted decisions or halted at them. This result is final for that gate: do not verify again ' +
				'to reach it, and tell the user the approval loop needs a manual end-to-end test.'
			: undefined;

	const invalidFixtureOverrideNodeNames = getInvalidFixtureOverrideNodeNames(
		buildOutcome,
		fixtureOverrides,
	);
	if (invalidFixtureOverrideNodeNames.length > 0) {
		const guidance =
			'Fixture overrides can only target nodes already classified as simulated in the build outcome. ' +
			`Invalid override node(s): ${invalidFixtureOverrideNodeNames.join(', ')}. ` +
			'Do not run the workflow live; rebuild with declared output fixtures or override a simulated node.';
		return blocked('invalid_fixture_override', guidance);
	}

	// A zero-item override silences every node below the target, so the run can
	// report success having exercised nothing. It stays available for a genuine
	// empty-branch test, but the caller has to name the node to get it.
	const zeroItemOverrideNodeNames = Object.entries(fixtureOverrides ?? {})
		.filter(
			([nodeName, items]) =>
				items.length === 0 &&
				!allowedZeroItemNodes.has(nodeName) &&
				// Halted-gate overrides are discarded above, so they cannot silence anything.
				!haltedOverrideNodeNames.includes(nodeName),
		)
		.map(([nodeName]) => nodeName);
	if (zeroItemOverrideNodeNames.length > 0) {
		const guidance =
			`Fixture override(s) for ${zeroItemOverrideNodeNames.join(', ')} pin zero items. ` +
			'An empty item list stops every downstream node, so verification would pass without running ' +
			'the branch you are checking. Give each node at least one plausible item instead. ' +
			'If the empty result IS the case under test, repeat the call with the node listed in ' +
			'`allowZeroItemFixtures` and report that the downstream branch stayed unverified.';
		return blocked('zero_item_fixture_override', guidance);
	}

	const prepared = buildVerificationPinData(buildOutcome, fixtureOverrides);
	return {
		kind: 'ready',
		prepared: ignoredGateOverrideNote ? { ...prepared, ignoredGateOverrideNote } : prepared,
	};
}
