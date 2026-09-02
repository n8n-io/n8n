import { Service } from '@n8n/di';
import type { StepSlots, TriggerOutputs } from '@n8n/engine';
import type {
	INode,
	INodeExecutionData,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { classifyTriggerIdentity, isTriggerNodeType, UserError } from 'n8n-workflow';

import { createExecutionIdV2 } from '@/executions/execution-id';
import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import type { ResumableExecution } from '@/interfaces';
import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';

type ToStepOutputs = (outputs: INodeExecutionData[][]) => StepSlots;

/** The trigger that fired and the payload it produced. */
type FiredTrigger = {
	/** Absent when no trigger is named; the converter then takes the sole one. */
	name?: string;
	outputs: INodeExecutionData[][];
};

/** Execution modes the v2 path serves today. */
const ROUTED_MODES = new Set<WorkflowExecuteMode>(['manual', 'webhook']);

/** v1's payload for a manual run with no trigger data: one slot, one empty item. */
const DEFAULT_MAIN_OUTPUT: INodeExecutionData[][] = [[{ json: {} }]];

/**
 * v1 uses `null` for a slot it has no data for; an empty slot says the same
 * thing to the engine, which `toStepOutputs` collapses back to a dead edge.
 */
const withoutNullSlots = (main: Array<INodeExecutionData[] | null>): INodeExecutionData[][] =>
	main.map((slot) => slot ?? []);

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
 * truth for the run. Only the execution id is minted here, so the push session
 * can be recorded before dispatch.
 */
@Service()
export class EngineV2Dispatcher {
	constructor(
		private readonly proxy: EngineDataPlaneProxyService,
		private readonly credentialsPermissionChecker: CredentialsPermissionChecker,
		private readonly pushRegistry: EngineV2PushRegistry,
	) {}

	/**
	 * Manual and webhook runs for now; the trigger entry path (CAT-2921) reuses
	 * this seam later. A resume must not start a fresh data-plane execution,
	 * hence the `existingExecution` check.
	 */
	routesToEngineV2(
		data: IWorkflowExecutionDataProcess,
		existingExecution?: ResumableExecution,
	): boolean {
		return (
			this.handlesWorkflow(data.workflowData, data.executionMode) && existingExecution === undefined
		);
	}

	/**
	 * Whether a run of this workflow in this mode belongs on the data plane.
	 *
	 * Split out of {@link routesToEngineV2} for the webhook path, which must know
	 * before the webhook node runs — and so before it can build the run data.
	 */
	handlesWorkflow(workflowData: IWorkflowBase, executionMode: WorkflowExecuteMode): boolean {
		return workflowData.settings?.engineType === 'v2' && ROUTED_MODES.has(executionMode);
	}

	/** Returns the execution id this dispatch minted. */
	async start(data: IWorkflowExecutionDataProcess): Promise<string> {
		const trigger = this.resolveFiredTrigger(data);

		this.assertSupported(data, trigger);

		const { workflowData } = data;

		await this.credentialsPermissionChecker.check(workflowData.id, workflowData.nodes);

		// Lazily imported: a top-level import would pull the v1 step executor and
		// its dependencies into every n8n process, including ones with the module off.
		const { V1WorkflowConverter, toStepOutputs } = await import('@n8n/node-engine-compatibility');

		const graph = new V1WorkflowConverter().convert(workflowData, trigger.name);

		const executionId = createExecutionIdV2();
		// At the session cap this can evict another run's session, uncaught below. Rare; not worth fixing.
		this.registerPushSession(executionId, data, trigger);

		try {
			await this.proxy.startExecution({
				executionId,
				workflowId: workflowData.id,
				graph,
				triggerOutputs: this.toTriggerOutputs(trigger.outputs, toStepOutputs),
				// Only manual and webhook route here, so anything else is a production run.
				mode: data.executionMode === 'manual' ? 'manual' : 'production',
			});
		} catch (error) {
			// Assumes rejection: a dropped success response also releases a still-live session.
			this.pushRegistry.release(executionId);
			throw error;
		}

		return executionId;
	}

	/**
	 * Lifecycle events carry no session id, so the push ref is recorded here,
	 * keyed by execution id.
	 */
	private registerPushSession(
		executionId: string,
		data: IWorkflowExecutionDataProcess,
		trigger: FiredTrigger,
	): void {
		const { pushRef, workflowData } = data;
		// No push ref means nothing is watching this run.
		if (!pushRef) return;

		this.pushRegistry.register(executionId, {
			pushRef,
			workflowId: workflowData.id,
			// The engine never announces the trigger, so save its outputs for the relay.
			trigger:
				trigger.name === undefined
					? undefined
					: { nodeName: trigger.name, outputs: trigger.outputs },
		});
	}

	/**
	 * Rejects what the v2 path cannot do yet, in the order the user should hear
	 * about it: the module being off comes first, so a workflow that would also
	 * fail conversion does not report the conversion problem and hide the real
	 * cause.
	 */
	private assertSupported(data: IWorkflowExecutionDataProcess, trigger: FiredTrigger): void {
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

		// `WorkflowRunner.run` returns through the v2 branch before it establishes the
		// execution context, so the hooks that mask a secret in the trigger item and
		// carry its credential context never run. Starting the run anyway would send
		// the raw secret to the data plane, which stores it.
		// TODO(CAT-2880): run the context hooks on this path and drop this.
		const firedNode = this.firedTriggerNode(data, trigger.name);
		if (
			firedNode !== undefined &&
			classifyTriggerIdentity(firedNode.type, firedNode.parameters).providesExternalIdentity
		) {
			throw new UserError(
				`Engine 2.0 cannot run the "${firedNode.name}" trigger yet, because it takes credentials from the request.`,
			);
		}

		// The trigger's own pinned data is the payload, so only the other nodes count.
		const pinnedNode = Object.keys(data.pinData ?? {}).find((name) => name !== trigger.name);
		if (pinnedNode !== undefined) {
			throw new UserError(
				`Engine 2.0 does not support pinned data on "${pinnedNode}" yet. Unpin it to run this workflow.`,
			);
		}
	}

	/** The node the converter roots the graph at, mirroring its own resolution. */
	private firedTriggerNode(data: IWorkflowExecutionDataProcess, name?: string): INode | undefined {
		const liveNodes = data.workflowData.nodes.filter((node) => node.disabled !== true);

		return name === undefined
			? liveNodes.find((node) => isTriggerNodeType(node.type))
			: liveNodes.find((node) => node.name === name);
	}

	/**
	 * Resolves the trigger that fired and the payload it produced.
	 *
	 * A manual run names it in `triggerToStartFrom`. A webhook run does not: the
	 * webhook node already ran control-plane-side, and `prepareExecutionData`
	 * seeded its output as the first entry of the node execution stack.
	 */
	private resolveFiredTrigger(data: IWorkflowExecutionDataProcess): FiredTrigger {
		const seeded = data.triggerToStartFrom
			? undefined
			: data.executionData?.executionData?.nodeExecutionStack[0];

		// A seeded node that is not a trigger is a v1 partial run, not a fired trigger.
		if (seeded !== undefined && isTriggerNodeType(seeded.node.type)) {
			return { name: seeded.node.name, outputs: withoutNullSlots(seeded.data.main) };
		}

		return { name: data.triggerToStartFrom?.name, outputs: this.triggerMainOutputs(data) };
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

		return withoutNullSlots(main);
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
