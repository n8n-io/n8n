import { Service } from '@n8n/di';
import type { StepSlots, TriggerOutputs } from '@n8n/engine';
import type {
	INodeExecutionData,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { getChildNodes, NodeConnectionTypes, UserError } from 'n8n-workflow';

import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import type { ResumableExecution } from '@/interfaces';
import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';

type ToStepOutputs = (outputs: INodeExecutionData[][]) => StepSlots;

/** v1's payload for a manual run with no trigger data: one slot, one empty item. */
const DEFAULT_MAIN_OUTPUT: INodeExecutionData[][] = [[{ json: {} }]];

/**
 * Routes a run to the engine 2.0 data plane and starts it there.
 *
 * The single dispatch point for the v2 path: {@link routesToEngineV2} decides,
 * {@link start} runs. A workflow that opts into engine 2.0 never falls back to
 * v1 — anything the v2 path cannot do fails with a user-facing reason instead,
 * because a silent fallback would run the workflow on an engine the user did
 * not pick.
 *
 * No control-plane execution row is created: the data plane is the source of
 * truth, and the returned execution id is its UUID.
 */
@Service()
export class EngineV2Dispatcher {
	constructor(
		private readonly proxy: EngineDataPlaneProxyService,
		private readonly credentialsPermissionChecker: CredentialsPermissionChecker,
		private readonly pushRegistry: EngineV2PushRegistry,
	) {}

	/**
	 * Manual runs only for now: webhook (CAT-2920) and trigger (CAT-2921) entry
	 * paths reuse this seam later. A resume must not start a fresh data-plane
	 * execution, hence the `existingExecution` check.
	 */
	routesToEngineV2(
		data: IWorkflowExecutionDataProcess,
		existingExecution?: ResumableExecution,
	): boolean {
		return (
			data.workflowData.settings?.engineType === 'v2' &&
			data.executionMode === 'manual' &&
			existingExecution === undefined
		);
	}

	/** Returns the data plane's execution id. */
	async start(data: IWorkflowExecutionDataProcess): Promise<string> {
		this.assertSupported(data);

		const { workflowData } = data;

		await this.credentialsPermissionChecker.check(workflowData.id, workflowData.nodes);

		// Lazily imported: a top-level import would pull the v1 step executor and
		// its dependencies into every n8n process, including ones with the module off.
		const { V1WorkflowConverter, toStepOutputs } = await import('@n8n/node-engine-compatibility');

		const graph = new V1WorkflowConverter().convert(this.selectTriggerSubgraph(data));
		const triggerMain = this.triggerMainOutputs(data);

		const { executionId } = await this.proxy.startExecution({
			workflowId: workflowData.id,
			graph,
			triggerOutputs: this.toTriggerOutputs(triggerMain, toStepOutputs),
			mode: 'manual',
		});

		// TODO(CAT-4255): the engine can publish lifecycle events before this line
		// runs, and the relay drops them because no session exists yet. Let the
		// control plane mint the execution id so this can register before dispatch.
		this.registerPushSession(executionId, data, triggerMain);

		return executionId;
	}

	/**
	 * Lifecycle events carry no session id, so the push ref is recorded here,
	 * keyed by execution id, before any events can arrive.
	 */
	private registerPushSession(
		executionId: string,
		data: IWorkflowExecutionDataProcess,
		triggerMain: INodeExecutionData[][],
	): void {
		const { pushRef, workflowData, triggerToStartFrom } = data;
		// No push ref means nothing is watching this run.
		if (!pushRef) return;

		this.pushRegistry.register(executionId, {
			pushRef,
			workflowId: workflowData.id,
			// The engine never announces the trigger, so save its outputs for the relay.
			trigger: triggerToStartFrom && {
				nodeName: triggerToStartFrom.name,
				outputs: triggerMain,
			},
		});
	}

	/** Keep only the branch that starts at the trigger selected for this manual run. */
	private selectTriggerSubgraph(data: IWorkflowExecutionDataProcess): IWorkflowBase {
		const { triggerToStartFrom, workflowData } = data;
		if (triggerToStartFrom === undefined) return workflowData;

		const includedNodeNames = new Set([
			triggerToStartFrom.name,
			...getChildNodes(
				workflowData.connections,
				triggerToStartFrom.name,
				NodeConnectionTypes.Main,
				-1,
			),
		]);

		return {
			...workflowData,
			nodes: workflowData.nodes.filter((node) => includedNodeNames.has(node.name)),
			connections: Object.fromEntries(
				Object.entries(workflowData.connections).filter(([sourceNodeName]) =>
					includedNodeNames.has(sourceNodeName),
				),
			),
		};
	}

	/**
	 * Rejects what the v2 path cannot do yet, in the order the user should hear
	 * about it: the module being off comes first, so a workflow that would also
	 * fail conversion does not report the conversion problem and hide the real
	 * cause.
	 */
	private assertSupported(data: IWorkflowExecutionDataProcess): void {
		if (!this.proxy.isAvailable()) {
			throw new UserError(
				'Engine 2.0 is not available. Enable the `engine-v2` module with N8N_ENABLED_MODULES.',
			);
		}

		if (data.runData !== undefined) {
			throw new UserError(
				'Engine 2.0 cannot run a workflow from existing data yet. Run the whole workflow instead.',
			);
		}

		// The engine cannot stop at a node, so ignoring this would run nodes the
		// user did not ask for, with their side effects.
		if (data.destinationNode !== undefined) {
			throw new UserError(
				'Engine 2.0 cannot run a workflow up to a single node yet. Run the whole workflow instead.',
			);
		}

		if (data.startNodes?.length) {
			throw new UserError(
				'Engine 2.0 cannot start from selected nodes yet. Run the whole workflow instead.',
			);
		}

		if (data.agentRequest !== undefined) {
			throw new UserError('Engine 2.0 cannot run a workflow as an AI tool yet.');
		}

		const triggerName = data.triggerToStartFrom?.name;
		const pinnedNode = Object.keys(data.pinData ?? {}).find((name) => name !== triggerName);
		if (pinnedNode !== undefined) {
			throw new UserError(
				`Engine 2.0 does not support pinned data on "${pinnedNode}" yet. Unpin it to run this workflow.`,
			);
		}
	}

	/**
	 * A manual run always carries a payload. Sending none would make the engine
	 * record the trigger with no slots, so every successor edge reads as dead and
	 * the execution completes having run nothing.
	 */
	private triggerMainOutputs(data: IWorkflowExecutionDataProcess): INodeExecutionData[][] {
		const triggerName = data.triggerToStartFrom?.name;
		// `IPinData` values are a flat item array; the Manual Trigger has one output.
		const pinned = triggerName ? data.pinData?.[triggerName] : undefined;
		const main =
			data.triggerToStartFrom?.data?.data?.main ??
			(pinned ? [pinned] : undefined) ??
			DEFAULT_MAIN_OUTPUT;

		// v1 uses `null` for a slot it has no data for; an empty slot says the same
		// thing to the engine, which `toStepOutputs` collapses back to a dead edge.
		return main.map((slot) => slot ?? []);
	}

	private toTriggerOutputs(
		main: INodeExecutionData[][],
		toStepOutputs: ToStepOutputs,
	): TriggerOutputs | null {
		const slots = toStepOutputs(main);

		// The wire schema rejects an empty array; `null` is how "no slots" is sent.
		return slots.length === 0 ? null : slots;
	}
}
