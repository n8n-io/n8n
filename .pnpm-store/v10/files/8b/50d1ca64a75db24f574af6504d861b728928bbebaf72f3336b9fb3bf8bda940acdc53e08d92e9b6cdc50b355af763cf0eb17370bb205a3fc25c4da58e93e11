//#region src/pregel/utils/subgraph.ts
function isRunnableSequence(x) {
	return "steps" in x && Array.isArray(x.steps);
}
function isPregelLike(x) {
	return "lg_is_pregel" in x && x.lg_is_pregel === true;
}
function findSubgraphPregel(candidate) {
	const candidates = [candidate];
	for (const candidate$1 of candidates) if (isPregelLike(candidate$1)) return candidate$1;
	else if (isRunnableSequence(candidate$1)) candidates.push(...candidate$1.steps);
	return void 0;
}

//#endregion
export { findSubgraphPregel, isPregelLike };
//# sourceMappingURL=subgraph.js.map