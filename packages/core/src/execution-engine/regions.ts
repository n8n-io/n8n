import type {
	IConnection,
	INodeExecutionData,
	IRunExecutionData,
	ISourceData,
	Region,
	RegionInstance,
	Workflow,
} from 'n8n-workflow';
import {
	classifyRegionEdge,
	regionsAround,
	regionTreeOf,
	UnexpectedError,
	UserError,
} from 'n8n-workflow';

/** Adds the node of `connection` to the stack, as `WorkflowExecute.addNodeToBeExecuted` does. */
export type RouteToNode = (
	connection: IConnection,
	outputIndex: number,
	parentNodeName: string,
	nodeSuccessData: INodeExecutionData[][],
	runIndex: number,
) => void;

const outputOf = (runExecutionData: IRunExecutionData, source: ISourceData) =>
	runExecutionData.resultData.runData[source.previousNode]?.[source.previousNodeRun ?? 0]?.data
		?.main[source.previousNodeOutput ?? 0] ?? [];

/**
 * Runs the regions of a workflow (node groups with `repeat`) on the v1 engine. A region holds
 * the items that leave a pass, starts the next pass when no member runs or waits, and emits all
 * items once after the last pass. Each pass is a run under the region name in the run data:
 * output 1 holds the pass input, and output 0 of the last run holds the emitted items. The state
 * is in `executionData.regions`, so a wait or a queue worker keeps it.
 */
export class RegionScheduler {
	private constructor(
		private readonly workflow: Workflow,
		private readonly regions: readonly Region[],
		private readonly runExecutionData: IRunExecutionData,
		private readonly routeToNode: RouteToNode,
		private readonly nextExecutionIndex: () => number,
	) {}

	/** The scheduler of the regions of `workflow`, or `undefined` when it has none. */
	static of(
		workflow: Workflow,
		runExecutionData: IRunExecutionData,
		routeToNode: RouteToNode,
		nextExecutionIndex: () => number,
	): RegionScheduler | undefined {
		const { regions, problems } = regionTreeOf({
			nodes: Object.values(workflow.nodes),
			connections: workflow.connectionsBySourceNode,
			nodeGroups: workflow.nodeGroups,
			executionOrder: workflow.settings.executionOrder ?? 'v0',
		});
		const [first] = problems;
		if (first) {
			throw new UserError(`The workflow cannot run: ${first.message}`, {
				description: problems.map(({ message }) => message).join('\n'),
			});
		}
		return regions.length > 0
			? new RegionScheduler(workflow, regions, runExecutionData, routeToNode, nextExecutionIndex)
			: undefined;
	}

	/**
	 * Route the items of one output edge of `nodeName`. An edge into a region starts the region.
	 * An edge out of a running region does nothing: `holdExits` keeps its items for the emit.
	 */
	routeEdge(
		nodeName: string,
		connection: IConnection,
		outputIndex: number,
		nodeSuccessData: INodeExecutionData[][],
		runIndex: number,
	): void {
		const { exits, enters } = classifyRegionEdge(this.regions, nodeName, connection.node);
		// A region that does not run, e.g. in a partial run that starts in its body, lets items pass.
		if (exits.some((region) => this.instanceOf(region) !== undefined)) return;
		const [outer] = enters;
		if (outer) {
			this.enter(outer, {
				previousNode: nodeName,
				previousNodeOutput: outputIndex,
				previousNodeRun: runIndex,
			});
			return;
		}
		this.routeToNode(connection, outputIndex, nodeName, nodeSuccessData, runIndex);
	}

	/** Keep each output of the node run that is an exit of a running region. */
	holdExits(nodeName: string, runIndex: number, nodeSuccessData: INodeExecutionData[][]): void {
		nodeSuccessData.forEach((items, output) => {
			if (items.length === 0) return;
			const [holder] = regionsAround(this.regions, nodeName).filter(
				(region) =>
					this.instanceOf(region) !== undefined &&
					region.exits.some((exit) => exit.node === nodeName && exit.output === output),
			);
			this.instanceOf(holder)?.exits.push({
				previousNode: nodeName,
				previousNodeOutput: output,
				previousNodeRun: runIndex,
			});
		});
	}

	/** Start the next pass, or emit, for each region whose pass is over. Innermost first. */
	settle(): void {
		const [next] = this.regions
			.filter((region) => this.instanceOf(region) !== undefined && !this.isBusy(region))
			.sort((a, b) => b.depth - a.depth);
		if (!next) return;
		this.dropWaiting(next);
		this.advance(next);
		this.settle();
	}

	private get executionData() {
		const { executionData } = this.runExecutionData;
		if (!executionData) throw new UnexpectedError('Regions run without execution data');
		return executionData;
	}

	private get instances(): Record<string, RegionInstance> {
		this.executionData.regions ??= {};
		return this.executionData.regions;
	}

	private instanceOf(region: Region | undefined): RegionInstance | undefined {
		return region ? this.instances[region.name] : undefined;
	}

	/**
	 * A pass is over when no member is on the stack. A member that waits for more inputs keeps
	 * the pass open until the stack is empty, because only then the engine runs waiting nodes.
	 */
	private isBusy(region: Region): boolean {
		const { nodeExecutionStack, waitingExecution } = this.executionData;
		if (nodeExecutionStack.some(({ node }) => region.members.has(node.name))) return true;
		return (
			nodeExecutionStack.length > 0 &&
			Object.keys(waitingExecution).some((name) => region.members.has(name))
		);
	}

	/** Inputs of the pass that never completed belong to that pass only. */
	private dropWaiting(region: Region): void {
		const { waitingExecution, waitingExecutionSource } = this.executionData;
		for (const name of Object.keys(waitingExecution).filter((each) => region.members.has(each))) {
			delete waitingExecution[name];
			delete waitingExecutionSource?.[name];
		}
	}

	private enter(region: Region, input: ISourceData): void {
		if (outputOf(this.runExecutionData, input).length === 0) return;
		const running = this.instanceOf(region);
		if (running) {
			running.queued.push(input);
			return;
		}
		this.instances[region.name] = { input, cursor: 0, exits: [], queued: [] };
		this.advance(region);
	}

	private advance(region: Region): void {
		const instance = this.instanceOf(region);
		if (!instance) return;
		const items = outputOf(this.runExecutionData, instance.input);
		if (instance.cursor < items.length) {
			this.startPass(region, instance, items);
		} else {
			this.emit(region, instance);
		}
	}

	private startPass(region: Region, instance: RegionInstance, items: INodeExecutionData[]): void {
		const { cursor } = instance;
		const batch = items
			.slice(cursor, cursor + region.repeat.batchSize)
			.map((item, index) => ({ ...item, pairedItem: { item: cursor + index } }));
		instance.cursor = cursor + batch.length;
		const { runData } = this.runExecutionData.resultData;
		const runs = (runData[region.name] ??= []);
		runs.push({
			startTime: Date.now(),
			executionIndex: this.nextExecutionIndex(),
			executionTime: 0,
			executionStatus: 'success',
			source: [instance.input],
			data: { main: [[], batch] },
		});
		const pass: ISourceData = {
			previousNode: region.name,
			previousNodeOutput: 1,
			previousNodeRun: runs.length - 1,
		};
		const inner = this.regions.find(
			(other) => other.parent === region.name && other.entry === region.entry,
		);
		if (inner) {
			this.enter(inner, pass);
			return;
		}
		const entry = this.workflow.getNode(region.entry);
		if (!entry) throw new UnexpectedError(`Region "${region.name}" has no entry node`);
		this.executionData.nodeExecutionStack.unshift({
			node: entry,
			data: { main: [batch] },
			source: { main: [pass] },
		});
	}

	private emit(region: Region, instance: RegionInstance): void {
		delete this.instances[region.name];
		const runs = this.runExecutionData.resultData.runData[region.name] ?? [];
		const lastRun = runs.length - 1;
		const last = runs[lastRun];
		if (!last) throw new UnexpectedError(`Region "${region.name}" emits without a pass`);
		const done = instance.exits.flatMap((exit) =>
			outputOf(this.runExecutionData, exit).map((item, index) => ({
				...item,
				pairedItem: { item: index, sourceOverwrite: exit },
			})),
		);
		const data = [done, last.data?.main[1] ?? []];
		runs[lastRun] = { ...last, data: { main: data } };
		if (done.length > 0) this.forward(region, lastRun, data);

		const [queued, ...rest] = instance.queued;
		if (queued) {
			this.instances[region.name] = { input: queued, cursor: 0, exits: [], queued: rest };
			this.advance(region);
		}
	}

	/**
	 * Send the emitted items on the exits of `region`. A running region around it that shares an
	 * exit holds them for its own emit, and only its members on those edges run now.
	 */
	private forward(region: Region, lastRun: number, data: INodeExecutionData[][]): void {
		const emitted: ISourceData = {
			previousNode: region.name,
			previousNodeOutput: 0,
			previousNodeRun: lastRun,
		};
		const [holder] = this.regions
			.filter(
				(outer) =>
					this.instanceOf(outer) !== undefined &&
					outer.members.has(region.entry) &&
					outer.exits.some((exit) =>
						region.exits.some(({ node, output }) => exit.node === node && exit.output === output),
					),
			)
			.sort((a, b) => b.depth - a.depth);
		const held = this.instanceOf(holder);
		held?.exits.push(emitted);
		// Validation makes all exits connect to the same nodes, so each node gets the items once.
		const targets = new Map(
			region.exits.flatMap(({ node, output }) =>
				(this.workflow.connectionsBySourceNode[node]?.main?.[output] ?? [])
					.filter((connection) => !region.members.has(connection.node))
					.map((connection) => [
						`${connection.node}\u0000${connection.index}`,
						{ node, connection },
					]),
			),
		);
		for (const { node, connection } of targets.values()) {
			// The holder emits the items to its own exit targets later.
			if (held && !holder?.members.has(connection.node)) continue;
			const { exits, enters } = classifyRegionEdge(this.regions, node, connection.node);
			if (exits.some((outer) => this.instanceOf(outer) !== undefined)) continue;
			const [outer] = enters;
			if (outer) this.enter(outer, emitted);
			else this.routeToNode(connection, 0, region.name, data, lastRun);
		}
	}
}
