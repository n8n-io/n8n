//#region src/ui/branching.ts
function getBranchSequence(history) {
	const nodeIds = /* @__PURE__ */ new Set();
	const childrenMap = {};
	if (history.length <= 1) return {
		rootSequence: {
			type: "sequence",
			items: history.map((value) => ({
				type: "node",
				value,
				path: []
			}))
		},
		paths: []
	};
	history.forEach((state) => {
		const checkpointId = state.parent_checkpoint?.checkpoint_id ?? "$";
		childrenMap[checkpointId] ??= [];
		childrenMap[checkpointId].push(state);
		if (state.checkpoint?.checkpoint_id != null) nodeIds.add(state.checkpoint.checkpoint_id);
	});
	const maxId = (...ids) => ids.filter((i) => i != null).sort((a, b) => a.localeCompare(b)).at(-1);
	const lastOrphanedNode = childrenMap.$ == null ? Object.keys(childrenMap).filter((parentId) => !nodeIds.has(parentId)).map((parentId) => {
		const queue$1 = [parentId];
		const seen = /* @__PURE__ */ new Set();
		let lastId = parentId;
		while (queue$1.length > 0) {
			const current = queue$1.shift();
			if (seen.has(current)) continue;
			seen.add(current);
			const children = (childrenMap[current] ?? []).flatMap((i) => i.checkpoint?.checkpoint_id ?? []);
			lastId = maxId(lastId, ...children);
			queue$1.push(...children);
		}
		return {
			parentId,
			lastId
		};
	}).sort((a, b) => a.lastId.localeCompare(b.lastId)).at(-1)?.parentId : void 0;
	if (lastOrphanedNode != null) childrenMap.$ = childrenMap[lastOrphanedNode];
	const rootSequence = {
		type: "sequence",
		items: []
	};
	const queue = [{
		id: "$",
		sequence: rootSequence,
		path: []
	}];
	const paths = [];
	const visited = /* @__PURE__ */ new Set();
	while (queue.length > 0) {
		const task = queue.shift();
		if (visited.has(task.id)) continue;
		visited.add(task.id);
		const children = childrenMap[task.id];
		if (children == null || children.length === 0) continue;
		let fork;
		if (children.length > 1) {
			fork = {
				type: "fork",
				items: []
			};
			task.sequence.items.push(fork);
		}
		for (const value of children) {
			const id = value.checkpoint?.checkpoint_id;
			if (id == null) continue;
			let { sequence } = task;
			let { path } = task;
			if (fork != null) {
				sequence = {
					type: "sequence",
					items: []
				};
				fork.items.unshift(sequence);
				path = path.slice();
				path.push(id);
				paths.push(path);
			}
			sequence.items.push({
				type: "node",
				value,
				path
			});
			queue.push({
				id,
				sequence,
				path
			});
		}
	}
	return {
		rootSequence,
		paths
	};
}
const PATH_SEP = ">";
const ROOT_ID = "$";
function getBranchView(sequence, paths, branch) {
	const path = branch.split(PATH_SEP);
	const pathMap = {};
	for (const path$1 of paths) {
		const parent = path$1.at(-2) ?? ROOT_ID;
		pathMap[parent] ??= [];
		pathMap[parent].unshift(path$1);
	}
	const history = [];
	const branchByCheckpoint = {};
	const forkStack = path.slice();
	const queue = [...sequence.items];
	while (queue.length > 0) {
		const item = queue.shift();
		if (item.type === "node") {
			history.push(item.value);
			const checkpointId = item.value.checkpoint?.checkpoint_id;
			if (checkpointId == null) continue;
			branchByCheckpoint[checkpointId] = {
				branch: item.path.join(PATH_SEP),
				branchOptions: (item.path.length > 0 ? pathMap[item.path.at(-2) ?? ROOT_ID] ?? [] : []).map((p) => p.join(PATH_SEP))
			};
		}
		if (item.type === "fork") {
			const forkId = forkStack.shift();
			const index = forkId != null ? item.items.findIndex((value) => {
				const firstItem = value.items.at(0);
				if (!firstItem || firstItem.type !== "node") return false;
				return firstItem.value.checkpoint?.checkpoint_id === forkId;
			}) : -1;
			const nextItems = item.items.at(index)?.items ?? [];
			queue.push(...nextItems);
		}
	}
	return {
		history,
		branchByCheckpoint
	};
}
function getBranchContext(branch, history) {
	const { rootSequence: branchTree, paths } = getBranchSequence(history ?? []);
	const { history: flatHistory, branchByCheckpoint } = getBranchView(branchTree, paths, branch);
	return {
		branchTree,
		flatHistory,
		branchByCheckpoint,
		threadHead: flatHistory.at(-1)
	};
}

//#endregion
export { getBranchContext };
//# sourceMappingURL=branching.js.map