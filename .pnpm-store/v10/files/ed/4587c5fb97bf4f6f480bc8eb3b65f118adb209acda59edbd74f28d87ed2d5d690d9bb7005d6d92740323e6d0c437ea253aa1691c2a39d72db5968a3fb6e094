
//#region src/pregel/utils/subgraph.ts
function isRunnableSequence(x) {
	return "steps" in x && Array.isArray(x.steps);
}
function isPregelLike(x) {
	return "lg_is_pregel" in x && x.lg_is_pregel === true;
}
function findSubgraphPregel(candidate) {
	const candidates = [candidate];
	for (const candidate of candidates) if (isPregelLike(candidate)) return candidate;
	else if (isRunnableSequence(candidate)) candidates.push(...candidate.steps);
}

//#endregion
exports.findSubgraphPregel = findSubgraphPregel;
exports.isPregelLike = isPregelLike;
//# sourceMappingURL=subgraph.cjs.map