//#region src/smith/config.ts
function isOffTheShelfEvaluator(evaluator) {
	return typeof evaluator === "string" || "evaluatorType" in evaluator;
}
function isCustomEvaluator(evaluator) {
	return !isOffTheShelfEvaluator(evaluator);
}
const isStringifiableValue = (value) => typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint";
const getSingleStringifiedValue = (value) => {
	if (isStringifiableValue(value)) return `${value}`;
	if (typeof value === "object" && value != null && !Array.isArray(value)) {
		const entries = Object.entries(value);
		if (entries.length === 1 && isStringifiableValue(entries[0][1])) return `${entries[0][1]}`;
	}
	console.warn("Non-stringifiable value found when coercing", value);
	return `${value}`;
};
function Criteria(criteria, config) {
	const formatEvaluatorInputs = config?.formatEvaluatorInputs ?? ((payload) => ({
		prediction: getSingleStringifiedValue(payload.rawPrediction),
		input: getSingleStringifiedValue(payload.rawInput)
	}));
	if (typeof criteria !== "string" && Object.keys(criteria).length !== 1) throw new Error("Only one criteria key is allowed when specifying custom criteria.");
	const criteriaKey = typeof criteria === "string" ? criteria : Object.keys(criteria)[0];
	return {
		evaluatorType: "criteria",
		criteria,
		feedbackKey: config?.feedbackKey ?? criteriaKey,
		llm: config?.llm,
		formatEvaluatorInputs
	};
}
function LabeledCriteria(criteria, config) {
	const formatEvaluatorInputs = config?.formatEvaluatorInputs ?? ((payload) => ({
		prediction: getSingleStringifiedValue(payload.rawPrediction),
		input: getSingleStringifiedValue(payload.rawInput),
		reference: getSingleStringifiedValue(payload.rawReferenceOutput)
	}));
	if (typeof criteria !== "string" && Object.keys(criteria).length !== 1) throw new Error("Only one labeled criteria key is allowed when specifying custom criteria.");
	const criteriaKey = typeof criteria === "string" ? criteria : Object.keys(criteria)[0];
	return {
		evaluatorType: "labeled_criteria",
		criteria,
		feedbackKey: config?.feedbackKey ?? criteriaKey,
		llm: config?.llm,
		formatEvaluatorInputs
	};
}
function EmbeddingDistance(distanceMetric, config) {
	const formatEvaluatorInputs = config?.formatEvaluatorInputs ?? ((payload) => ({
		prediction: getSingleStringifiedValue(payload.rawPrediction),
		reference: getSingleStringifiedValue(payload.rawReferenceOutput)
	}));
	return {
		evaluatorType: "embedding_distance",
		embedding: config?.embedding,
		distanceMetric,
		feedbackKey: config?.feedbackKey ?? "embedding_distance",
		formatEvaluatorInputs
	};
}

//#endregion
export { Criteria, EmbeddingDistance, LabeledCriteria, isCustomEvaluator, isOffTheShelfEvaluator };
//# sourceMappingURL=config.js.map