/**
 * Simulation Plan Reconciliation
 *
 * A build outcome freezes the execute-vs-simulate plan at build time. A node
 * that was simulated only because its credentials were mocked goes stale the
 * moment a real credential is assigned — via the setup flow, the
 * apply-workflow-credentials tool, or a manual selection in the editor — since
 * none of those paths rebuild the workflow. This module re-derives the plan
 * for exactly those nodes from the live workflow so verification stops
 * replaying the build-time mock.
 */

import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { classifyNodesForSimulation } from './classify-node-destructiveness.service';
import { isAiGatewayManagedCredential } from './credential-utils';
import type { CredentialMap } from './resolve-credentials';
import type { WorkflowBuildOutcome } from '../../workflow-loop/workflow-loop-state';

export type SimulationPlanPatch = Pick<
	WorkflowBuildOutcome,
	| 'mockedNodeNames'
	| 'mockedCredentialTypes'
	| 'mockedCredentialsByNode'
	| 'nodeSimulationPlan'
	| 'simulationFixtures'
	| 'setupRequirement'
>;

function isConfiguredCredential(
	value: unknown,
	credentialType: string,
	availableCredentials: CredentialMap,
): boolean {
	if (isAiGatewayManagedCredential(value)) return true;
	if (typeof value !== 'object' || value === null || !('id' in value)) return false;
	const { id } = value;
	if (typeof id !== 'string' || id.trim() === '') return false;
	return (
		availableCredentials.get(credentialType)?.some((credential) => credential.id === id) ?? false
	);
}

function nodeCredentials(
	workflow: WorkflowJSON,
	nodeName: string,
): Record<string, unknown> | undefined {
	const node = (workflow.nodes ?? []).find((candidate) => candidate.name === nodeName);
	return node?.credentials ? (node.credentials as Record<string, unknown>) : undefined;
}

/**
 * Compare the outcome's mocked-credential bookkeeping with the live workflow
 * and return a build-outcome patch when any mocked node now has real
 * credentials, or `undefined` when nothing changed.
 *
 * Satisfied nodes are re-classified with the same policy as a rebuild
 * (deterministic floor, LLM middle, fail-destructive fallback), so a node that
 * is destructive stays simulated with an honest reason while safe nodes run
 * for real. Verdicts of untouched nodes — including build-time LLM decisions
 * and declared-output overrides — are preserved as-is.
 */
export async function reconcileSimulationPlan(args: {
	buildOutcome: WorkflowBuildOutcome;
	workflow: WorkflowJSON;
	availableCredentials: CredentialMap;
}): Promise<SimulationPlanPatch | undefined> {
	const { buildOutcome, workflow, availableCredentials } = args;

	const mockedEntries = Object.entries(buildOutcome.mockedCredentialsByNode ?? {});
	if (mockedEntries.length === 0) return undefined;

	const satisfiedNames = new Set(
		mockedEntries
			.filter(([nodeName, mockedTypes]) => {
				const credentials = nodeCredentials(workflow, nodeName);
				if (!credentials) return false;
				const types = mockedTypes.length > 0 ? mockedTypes : Object.keys(credentials);
				return (
					types.length > 0 &&
					types.every((type) =>
						isConfiguredCredential(credentials[type], type, availableCredentials),
					)
				);
			})
			.map(([nodeName]) => nodeName),
	);
	if (satisfiedNames.size === 0) return undefined;

	const remainingEntries = mockedEntries.filter(([nodeName]) => !satisfiedNames.has(nodeName));
	const remainingMockedNames = (
		buildOutcome.mockedNodeNames ?? mockedEntries.map(([nodeName]) => nodeName)
	).filter((nodeName) => !satisfiedNames.has(nodeName));

	// Scope classification to the satisfied nodes so the ambiguous-node LLM
	// pass never re-judges the rest of the workflow.
	const scopedWorkflow: WorkflowJSON = {
		...workflow,
		nodes: (workflow.nodes ?? []).filter(
			(node) => typeof node.name === 'string' && satisfiedNames.has(node.name),
		),
	};
	const freshVerdicts = await classifyNodesForSimulation({
		workflow: scopedWorkflow,
		mockedNodeNames: remainingMockedNames,
	});
	const freshVerdictByName = new Map(freshVerdicts.map((verdict) => [verdict.nodeName, verdict]));

	// A satisfied node without a fresh verdict (e.g. no longer on the main
	// flow) keeps its stored verdict — losing coverage is worse than an extra
	// simulation.
	const nodeSimulationPlan = buildOutcome.nodeSimulationPlan?.map((verdict) =>
		satisfiedNames.has(verdict.nodeName)
			? (freshVerdictByName.get(verdict.nodeName) ?? verdict)
			: verdict,
	);

	const retainedFixtureEntries = Object.entries(buildOutcome.simulationFixtures ?? {}).filter(
		([nodeName]) => freshVerdictByName.get(nodeName)?.verdict !== 'execute',
	);

	const hasRemainingMocks = remainingEntries.length > 0;
	const patch: SimulationPlanPatch = {
		mockedNodeNames: hasRemainingMocks ? remainingMockedNames : undefined,
		mockedCredentialTypes: hasRemainingMocks
			? [...new Set(remainingEntries.flatMap(([, types]) => types))]
			: undefined,
		mockedCredentialsByNode: hasRemainingMocks ? Object.fromEntries(remainingEntries) : undefined,
		nodeSimulationPlan,
		simulationFixtures:
			retainedFixtureEntries.length > 0 ? Object.fromEntries(retainedFixtureEntries) : undefined,
	};

	// The mocked-credentials requirement is settled; complete-checkpoint
	// re-analyzes the live workflow, so any other pending setup still blocks.
	if (
		!hasRemainingMocks &&
		!buildOutcome.hasUnresolvedPlaceholders &&
		buildOutcome.setupRequirement?.status === 'required' &&
		buildOutcome.setupRequirement.reason === 'mocked-credentials'
	) {
		patch.setupRequirement = { status: 'not_required' };
	}

	return patch;
}
