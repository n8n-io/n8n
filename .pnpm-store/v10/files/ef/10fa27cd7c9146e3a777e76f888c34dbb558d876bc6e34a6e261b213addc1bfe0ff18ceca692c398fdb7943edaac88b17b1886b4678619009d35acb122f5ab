//#region src/experimental/chains/violation_of_expectations/types.ts
const PREDICT_NEXT_USER_MESSAGE_FUNCTION = {
	name: "predictNextUserMessage",
	description: "Predicts the next user message, along with insights.",
	parameters: {
		type: "object",
		properties: {
			userState: {
				type: "string",
				description: "Concise reasoning about the users internal mental state."
			},
			predictedUserMessage: {
				type: "string",
				description: "Your prediction on how they will respond to the AI's most recent message."
			},
			insights: {
				type: "array",
				items: { type: "string" },
				description: "A concise list of any additional insights that would be useful to improve prediction."
			}
		},
		required: [
			"userState",
			"predictedUserMessage",
			"insights"
		]
	}
};
const PREDICTION_VIOLATIONS_FUNCTION = {
	name: "predictionViolations",
	description: "Generates violations, errors and differences between the predicted user response, and the actual response.",
	parameters: {
		type: "object",
		properties: {
			violationExplanation: {
				type: "string",
				description: "How was the predication violated?"
			},
			explainedPredictionErrors: {
				type: "array",
				items: { type: "string" },
				description: "Explanations of how the prediction was violated and why"
			}
		},
		required: ["violationExplanation", "explainedPredictionErrors"]
	}
};

//#endregion
export { PREDICTION_VIOLATIONS_FUNCTION, PREDICT_NEXT_USER_MESSAGE_FUNCTION };
//# sourceMappingURL=types.js.map