import type {
	IConnection,
	IDataObject,
	IExecuteData,
	INodeExecutionData,
	IRunExecutionData,
	ISourceData,
	IWorkflowDataProxyAdditionalKeys,
	Region,
	RegionInstance,
	RegionKept,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	classifyRegionEdge,
	deepCopy,
	ExecutionBaseError,
	passLimitOf,
	regionsAround,
	regionTreeOf,
	UnexpectedError,
	UserError,
	WorkflowOperationError,
} from 'n8n-workflow';

/** Adds the node of `connection` to the stack, as `WorkflowExecute.addNodeToBeExecuted` does. */
export type RouteToNode = (
	connection: IConnection,
	outputIndex: number,
	parentNodeName: string,
	nodeSuccessData: INodeExecutionData[][],
	runIndex: number,
) => void;

/** What the scheduler needs from the engine that runs it. */
export interface RegionEngine {
	readonly routeToNode: RouteToNode;
	readonly nextExecutionIndex: () => number;
	/** The mode and keys of the expressions `until` and `next`, as for a node. */
	readonly mode: WorkflowExecuteMode;
	readonly additionalKeys: () => IWorkflowDataProxyAdditionalKeys;
}

const outputOf = (runExecutionData: IRunExecutionData, source: ISourceData) =>
	runExecutionData.resultData.runData[source.previousNode]?.[source.previousNodeRun ?? 0]?.data
		?.main[source.previousNodeOutput ?? 0] ?? [];

const isDataObject = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** One item that left a pass, and the member output it left on. */
interface ExitItem {
	readonly source: ISourceData;
	readonly items: INodeExecutionData[];
	readonly index: number;
}

/** What a pass does with one exit item: emit it, and give the item of the next pass. */
interface Decision {
	readonly leaves: boolean;
	readonly next?: IDataObject;
}

/**
 * Runs the regions of a workflow (node groups with `repeat`) on the v1 engine. A region holds
 * the items that leave a pass, starts the next pass when no member runs or waits, and emits the
 * items once after the last pass (or after each pass with `emit: 'each'`). Each pass is a run
 * under the region name in the run data: output 1 holds the pass input, and output 0 holds the
 * emitted items. The pass count and the limit are engine state, not item fields. The state is in
 * `executionData.regions`, so a wait or a queue worker keeps it.
 */
export class RegionScheduler {
	private constructor(
		private readonly workflow: Workflow,
		private readonly regions: readonly Region[],
		private readonly runExecutionData: IRunExecutionData,
		private readonly engine: RegionEngine,
	) {}

	/** The scheduler of the regions of `workflow`, or `undefined` when it has none. */
	static of(
		workflow: Workflow,
		runExecutionData: IRunExecutionData,
		engine: RegionEngine,
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
			? new RegionScheduler(workflow, regions, runExecutionData, engine)
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
		this.engine.routeToNode(connection, outputIndex, nodeName, nodeSuccessData, runIndex);
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

	/**
	 * Start the next pass, or emit, for each region whose pass is over. Innermost first. Gives
	 * the error that ends the run: a region at its pass limit, or an `until` or `next` that fails.
	 */
	settle(): ExecutionBaseError | undefined {
		const [next] = this.regions
			.filter((region) => this.instanceOf(region) !== undefined && !this.isBusy(region))
			.sort((a, b) => b.depth - a.depth);
		if (!next) return undefined;
		this.dropWaiting(next);
		return this.finishPass(next) ?? this.settle();
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

	private runsOf(region: Region) {
		const { runData } = this.runExecutionData.resultData;
		return (runData[region.name] ??= []);
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
		this.start(region, input, []);
	}

	private start(region: Region, input: ISourceData, queued: ISourceData[]): void {
		const instance: RegionInstance = { input, cursor: 0, passes: 0, exits: [], kept: [], queued };
		this.instances[region.name] = instance;
		const items = outputOf(this.runExecutionData, input);
		if (region.repeat.kind === 'forEach') {
			this.startBatch(region, instance, items);
			return;
		}
		this.startPass(
			region,
			instance,
			items.map((item, index) => ({ ...item, pairedItem: { item: index } })),
			[input],
		);
	}

	private startBatch(region: Region, instance: RegionInstance, items: INodeExecutionData[]): void {
		if (region.repeat.kind !== 'forEach') return;
		const { cursor } = instance;
		const batch = items
			.slice(cursor, cursor + region.repeat.batchSize)
			.map((item, index) => ({ ...item, pairedItem: { item: cursor + index } }));
		instance.cursor = cursor + batch.length;
		this.startPass(region, instance, batch, [instance.input]);
	}

	/** Write the region run of the next pass, and start its members on `batch`. */
	private startPass(
		region: Region,
		instance: RegionInstance,
		batch: INodeExecutionData[],
		sources: ISourceData[],
	): void {
		const runs = this.runsOf(region);
		runs.push({
			startTime: Date.now(),
			executionIndex: this.engine.nextExecutionIndex(),
			executionTime: 0,
			executionStatus: 'success',
			source: sources,
			data: { main: [[], batch] },
		});
		instance.passes += 1;
		const pass: ISourceData = {
			previousNode: region.name,
			previousNodeOutput: 1,
			previousNodeRun: runs.length - 1,
		};
		// After an emit, the emitted items run on first, so the passes continue in pass order.
		const afterEmit =
			'emit' in region.repeat && region.repeat.emit === 'each' && instance.passes > 1;
		for (const name of this.passStarts(region, instance)) {
			const inner = this.regions.find(
				(other) => other.parent === region.name && other.entry === name,
			);
			if (inner) {
				this.enter(inner, pass);
				continue;
			}
			const node = this.workflow.getNode(name);
			if (!node) throw new UnexpectedError(`Region "${region.name}" has no node "${name}"`);
			const start = { node, data: { main: [batch] }, source: { main: [pass] } };
			if (afterEmit) this.executionData.nodeExecutionStack.push(start);
			else this.executionData.nodeExecutionStack.unshift(start);
		}
	}

	/** The entry of `pollUntil` runs between attempts, so the first attempt starts after it. */
	private passStarts(region: Region, instance: RegionInstance): string[] {
		if (region.repeat.kind !== 'pollUntil' || instance.passes > 1) return [region.entry];
		return (this.workflow.connectionsBySourceNode[region.entry]?.main?.[0] ?? []).map(
			(connection) => connection.node,
		);
	}

	private finishPass(region: Region): ExecutionBaseError | undefined {
		const instance = this.instanceOf(region);
		if (!instance) return undefined;
		const exits = instance.exits;
		instance.exits = [];
		if (region.repeat.kind !== 'forEach') return this.finishUntilPass(region, instance, exits);
		instance.kept.push(
			...exits.map((source) => ({
				source,
				items: outputOf(this.runExecutionData, source).map((_item, index) => index),
			})),
		);
		const items = outputOf(this.runExecutionData, instance.input);
		if (instance.cursor < items.length) this.startBatch(region, instance, items);
		else this.emit(region, instance);
		return undefined;
	}

	/** Decide each exit item of the pass: emit it, run it again, or fail at the pass limit. */
	private finishUntilPass(
		region: Region,
		instance: RegionInstance,
		exits: ISourceData[],
	): ExecutionBaseError | undefined {
		const runs = this.runsOf(region);
		const runIndex = runs.length - 1;
		const exitItems = exits.flatMap((source) => {
			const items = outputOf(this.runExecutionData, source);
			return items.map((_item, index): ExitItem => ({ source, items, index }));
		});
		const decided = this.decideAll(region, exitItems);
		if (decided instanceof ExecutionBaseError) return this.fail(region, decided);

		const again = decided.filter(({ decision }) => decision.next !== undefined);
		const limit = passLimitOf(region.repeat) ?? Infinity;
		const atLimit = again.length > 0 && instance.passes >= limit;
		const continues = 'onLimit' in region.repeat && region.repeat.onLimit === 'continue';
		if (atLimit && !continues) {
			return this.fail(
				region,
				new WorkflowOperationError(
					`${region.name} stopped after ${limit} passes without meeting its exit condition`,
				),
			);
		}
		// With `emit: 'each'` the output of each pass continues, also the items that run again.
		const emitsEach = 'emit' in region.repeat && region.repeat.emit === 'each';
		const kept = keptOf(
			decided.filter(
				({ decision }) => emitsEach || decision.leaves || (atLimit && decision.next !== undefined),
			),
		);
		if (emitsEach) this.emitItems(region, runIndex, kept);
		else instance.kept.push(...kept);

		if (atLimit || again.length === 0) {
			this.emit(region, instance);
			return undefined;
		}
		const sources = [...new Set(again.map(({ exit }) => exit.source))];
		const batch = again.map(({ exit, decision }) => ({
			json: decision.next ?? {},
			pairedItem: { item: exit.index, input: sources.indexOf(exit.source) },
		}));
		this.startPass(region, instance, batch, sources);
		return undefined;
	}

	private decideAll(
		region: Region,
		exitItems: ExitItem[],
	): Array<{ exit: ExitItem; decision: Decision }> | ExecutionBaseError {
		try {
			return exitItems.map((exit) => ({ exit, decision: this.decide(region, exit) }));
		} catch (error) {
			if (error instanceof ExecutionBaseError) return error;
			const message = error instanceof Error ? error.message : String(error);
			return new WorkflowOperationError(`${region.name}: ${message}`);
		}
	}

	private decide(region: Region, exit: ExitItem): Decision {
		const { repeat } = region;
		const item = exit.items[exit.index];
		switch (repeat.kind) {
			case 'forEach':
				return { leaves: true };
			case 'loop': {
				if (this.evaluate(repeat.until, exit) === true) return { leaves: true };
				const next = repeat.next === undefined ? item?.json : this.evaluate(repeat.next, exit);
				return { leaves: false, next: this.nextItem(region, next) };
			}
			case 'paginate': {
				const next = this.evaluate(repeat.next, exit);
				return {
					leaves: true,
					...(next === null || next === undefined ? {} : { next: this.nextItem(region, next) }),
				};
			}
			case 'pollUntil': {
				if (this.evaluate(repeat.until, exit) === true) return { leaves: true };
				// The next attempt takes the attempt input that the exit item comes from.
				const input = this.evaluate(`={{ $(${JSON.stringify(region.name)}).item.json }}`, exit);
				return { leaves: false, next: this.nextItem(region, input) };
			}
		}
	}

	private nextItem(region: Region, value: unknown): IDataObject {
		if (!isDataObject(value)) {
			throw new WorkflowOperationError(
				`${region.name} needs an object as the item of the next pass, not ${Array.isArray(value) ? 'an array' : typeof value}`,
			);
		}
		return deepCopy(value);
	}

	/**
	 * An expression for one exit item, as a node right after the exit would resolve it: `$json`
	 * is the exit item, and `$('X')` follows the paired items back from the exit.
	 */
	private evaluate(expression: string, { source, items, index }: ExitItem): unknown {
		const node = this.workflow.getNode(source.previousNode);
		if (!node) throw new UnexpectedError(`Region exit "${source.previousNode}" is not a node`);
		const connectionInputData = items.map((item, itemIndex) => ({
			...item,
			pairedItem: { item: itemIndex },
		}));
		const executeData: IExecuteData = {
			node,
			data: { main: [connectionInputData] },
			source: { main: [source] },
		};
		return this.workflow.expression.getParameterValue(
			expression,
			this.runExecutionData,
			source.previousNodeRun ?? 0,
			index,
			node.name,
			connectionInputData,
			this.engine.mode,
			this.engine.additionalKeys(),
			executeData,
		);
	}

	private fail(region: Region, error: ExecutionBaseError): ExecutionBaseError {
		delete this.instances[region.name];
		const runs = this.runsOf(region);
		const last = runs.at(-1);
		if (last) runs[runs.length - 1] = { ...last, executionStatus: 'error', error };
		return error;
	}

	/** End the region: emit the kept items of all passes, then start a queued input. */
	private emit(region: Region, instance: RegionInstance): void {
		delete this.instances[region.name];
		const lastRun = this.runsOf(region).length - 1;
		if (lastRun < 0) throw new UnexpectedError(`Region "${region.name}" emits without a pass`);
		this.emitItems(region, lastRun, instance.kept);
		const [queued, ...rest] = instance.queued;
		if (queued) this.start(region, queued, rest);
	}

	/** Write `kept` as output 0 of region run `runIndex`, and send it on the exits. */
	private emitItems(region: Region, runIndex: number, kept: readonly RegionKept[]): void {
		const runs = this.runsOf(region);
		const run = runs[runIndex];
		if (!run) throw new UnexpectedError(`Region "${region.name}" has no run ${runIndex}`);
		const done = kept.flatMap(({ source, items }) => {
			const output = outputOf(this.runExecutionData, source);
			return items.flatMap((index) => {
				const item = output[index];
				return item ? [{ ...item, pairedItem: { item: index, sourceOverwrite: source } }] : [];
			});
		});
		if (done.length === 0) return;
		const data = [done, run.data?.main[1] ?? []];
		runs[runIndex] = { ...run, data: { main: data } };
		this.forward(region, runIndex, data);
	}

	/**
	 * Send the emitted items on the exits of `region`. A running region around it that shares an
	 * exit holds them for its own emit, and only its members on those edges run now.
	 */
	private forward(region: Region, runIndex: number, data: INodeExecutionData[][]): void {
		const emitted: ISourceData = {
			previousNode: region.name,
			previousNodeOutput: 0,
			previousNodeRun: runIndex,
		};
		const [holder] = this.regions
			.filter(
				(outer) =>
					outer !== region &&
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
			// With `emit: 'each'` the region still runs while it emits.
			const heldOuter = exits.some(
				(outer) => outer !== region && this.instanceOf(outer) !== undefined,
			);
			if (heldOuter) continue;
			const [outer] = enters;
			if (outer) this.enter(outer, emitted);
			else this.engine.routeToNode(connection, 0, region.name, data, runIndex);
		}
	}
}

/** The exit items by member output, in pass order. */
function keptOf(decided: ReadonlyArray<{ exit: ExitItem }>): RegionKept[] {
	const bySource = decided.reduce((groups, { exit }) => {
		groups.set(exit.source, [...(groups.get(exit.source) ?? []), exit.index]);
		return groups;
	}, new Map<ISourceData, number[]>());
	return [...bySource].map(([source, items]) => ({ source, items }));
}
