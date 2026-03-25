import { BaseChain } from "../../../chains/base.js";
import { JsonOutputFunctionsParser } from "../../../output_parsers/openai_functions.js";
import { PREDICTION_VIOLATIONS_FUNCTION, PREDICT_NEXT_USER_MESSAGE_FUNCTION } from "./types.js";
import { GENERATE_FACTS_PROMPT, GENERATE_REVISED_PREDICTION_PROMPT, PREDICTION_VIOLATIONS_PROMPT, PREDICT_NEXT_USER_MESSAGE_PROMPT } from "./violation_of_expectations_prompt.js";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { HumanMessage, isBaseMessage } from "@langchain/core/messages";

//#region src/experimental/chains/violation_of_expectations/violation_of_expectations_chain.ts
/**
* Chain that generates key insights/facts of a user based on a
* a chat conversation with an AI.
*/
var ViolationOfExpectationsChain = class extends BaseChain {
	static lc_name() {
		return "ViolationOfExpectationsChain";
	}
	_chainType() {
		return "violation_of_expectation_chain";
	}
	chatHistoryKey = "chat_history";
	thoughtsKey = "thoughts";
	get inputKeys() {
		return [this.chatHistoryKey];
	}
	get outputKeys() {
		return [this.thoughtsKey];
	}
	retriever;
	llm;
	jsonOutputParser;
	stringOutputParser;
	constructor(fields) {
		super(fields);
		this.retriever = fields.retriever;
		this.llm = fields.llm;
		this.jsonOutputParser = new JsonOutputFunctionsParser();
		this.stringOutputParser = new StringOutputParser();
	}
	getChatHistoryString(chatHistory) {
		return chatHistory.map((chatMessage) => {
			if (chatMessage._getType() === "human") return `Human: ${chatMessage.content}`;
			else if (chatMessage._getType() === "ai") return `AI: ${chatMessage.content}`;
			else return `${chatMessage.content}`;
		}).join("\n");
	}
	removeDuplicateStrings(strings) {
		return [...new Set(strings)];
	}
	/**
	* This method breaks down the chat history into chunks of messages.
	* Each chunk consists of a sequence of messages ending with an AI message and the subsequent user response, if any.
	*
	* @param {BaseMessage[]} chatHistory - The chat history to be chunked.
	*
	* @returns {MessageChunkResult[]} An array of message chunks. Each chunk includes a sequence of messages and the subsequent user response.
	*
	* @description
	* The method iterates over the chat history and pushes each message into a temporary array.
	* When it encounters an AI message, it checks for a subsequent user message.
	* If a user message is found, it is considered as the user response to the AI message.
	* If no user message is found after the AI message, the user response is undefined.
	* The method then pushes the chunk (sequence of messages and user response) into the result array.
	* This process continues until all messages in the chat history have been processed.
	*/
	chunkMessagesByAIResponse(chatHistory) {
		const newArray = [];
		const tempArray = [];
		chatHistory.forEach((item, index) => {
			tempArray.push(item);
			if (item._getType() === "ai") {
				let userResponse = chatHistory[index + 1];
				if (!userResponse || userResponse._getType() !== "human") userResponse = void 0;
				newArray.push({
					chunkedMessages: tempArray,
					userResponse: userResponse ? new HumanMessage(userResponse) : void 0
				});
			}
		});
		return newArray;
	}
	/**
	* This method processes a chat history to generate insights about the user.
	*
	* @param {ChainValues} values - The input values for the chain. It should contain a key for chat history.
	* @param {CallbackManagerForChainRun} [runManager] - Optional callback manager for the chain run.
	*
	* @returns {Promise<ChainValues>} A promise that resolves to a list of insights about the user.
	*
	* @throws {Error} If the chat history key is not found in the input values or if the chat history is not an array of BaseMessages.
	*
	* @description
	* The method performs the following steps:
	* 1. Checks if the chat history key is present in the input values and if the chat history is an array of BaseMessages.
	* 2. Breaks the chat history into chunks of messages.
	* 3. For each chunk, it generates an initial prediction for the user's next message.
	* 4. For each prediction, it generates insights and prediction violations, and regenerates the prediction based on the violations.
	* 5. For each set of messages, it generates a fact/insight about the user.
	* The method returns a list of these insights.
	*/
	async _call(values, runManager) {
		if (!(this.chatHistoryKey in values)) throw new Error(`Chat history key ${this.chatHistoryKey} not found`);
		const chatHistory = values[this.chatHistoryKey];
		const isEveryMessageBaseMessage = chatHistory.every((message) => isBaseMessage(message));
		if (!isEveryMessageBaseMessage) throw new Error("Chat history must be an array of BaseMessages");
		const messageChunks = this.chunkMessagesByAIResponse(chatHistory);
		const userPredictions = await Promise.all(messageChunks.map(async (chatHistoryChunk) => ({
			userPredictions: await this.predictNextUserMessage(chatHistoryChunk.chunkedMessages),
			userResponse: chatHistoryChunk.userResponse,
			runManager
		})));
		const predictionViolations = await Promise.all(userPredictions.map((prediction) => this.getPredictionViolations({
			userPredictions: prediction.userPredictions,
			userResponse: prediction.userResponse,
			runManager
		})));
		const insights = await Promise.all(predictionViolations.map((violation) => this.generateFacts({
			userResponse: violation.userResponse,
			predictions: {
				revisedPrediction: violation.revisedPrediction,
				explainedPredictionErrors: violation.explainedPredictionErrors
			}
		})));
		return { insights };
	}
	/**
	* This method predicts the next user message based on the chat history.
	*
	* @param {BaseMessage[]} chatHistory - The chat history based on which the next user message is predicted.
	* @param {CallbackManagerForChainRun} [runManager] - Optional callback manager for the chain run.
	*
	* @returns {Promise<PredictNextUserMessageResponse>} A promise that resolves to the predicted next user message, the user state, and any insights.
	*
	* @throws {Error} If the response from the language model does not contain the expected keys: 'userState', 'predictedUserMessage', and 'insights'.
	*/
	async predictNextUserMessage(chatHistory, runManager) {
		const messageString = this.getChatHistoryString(chatHistory);
		const llmWithFunctions = this.llm.bindTools([PREDICT_NEXT_USER_MESSAGE_FUNCTION]).withConfig({ function_call: { name: PREDICT_NEXT_USER_MESSAGE_FUNCTION.name } });
		const chain = PREDICT_NEXT_USER_MESSAGE_PROMPT.pipe(llmWithFunctions).pipe(this.jsonOutputParser);
		const res = await chain.invoke({ chat_history: messageString }, runManager?.getChild("prediction"));
		if (!("userState" in res && "predictedUserMessage" in res && "insights" in res)) throw new Error(`Invalid response from LLM: ${JSON.stringify(res)}`);
		const predictionResponse = res;
		const retrievedDocs = await this.retrieveRelevantInsights(predictionResponse.insights);
		const relevantDocs = this.removeDuplicateStrings([...predictionResponse.insights, ...retrievedDocs]);
		return {
			...predictionResponse,
			insights: relevantDocs
		};
	}
	/**
	* Retrieves relevant insights based on the provided insights.
	*
	* @param {Array<string>} insights - An array of insights to be used for retrieving relevant documents.
	*
	* @returns {Promise<Array<string>>} A promise that resolves to an array of relevant insights content.
	*/
	async retrieveRelevantInsights(insights) {
		const relevantInsightsDocuments = await Promise.all(insights.map(async (insight) => {
			const relevantInsight = await this.retriever.invoke(insight);
			return relevantInsight[0];
		}));
		const relevantInsightsContent = relevantInsightsDocuments.map((document) => document.pageContent);
		return relevantInsightsContent;
	}
	/**
	* This method generates prediction violations based on the predicted and actual user responses.
	* It also generates a revised prediction based on the identified violations.
	*
	* @param {Object} params - The parameters for the method.
	* @param {PredictNextUserMessageResponse} params.userPredictions - The predicted user message, user state, and insights.
	* @param {BaseMessage} [params.userResponse] - The actual user response.
	* @param {CallbackManagerForChainRun} [params.runManager] - Optional callback manager for the chain run.
	*
	* @returns {Promise<{ userResponse: BaseMessage | undefined; revisedPrediction: string; explainedPredictionErrors: Array<string>; }>} A promise that resolves to an object containing the actual user response, the revised prediction, and the explained prediction errors.
	*
	* @throws {Error} If the response from the language model does not contain the expected keys: 'violationExplanation', 'explainedPredictionErrors', and 'accuratePrediction'.
	*/
	async getPredictionViolations({ userPredictions, userResponse, runManager }) {
		const llmWithFunctions = this.llm.bindTools([PREDICTION_VIOLATIONS_FUNCTION]).withConfig({ function_call: { name: PREDICTION_VIOLATIONS_FUNCTION.name } });
		const chain = PREDICTION_VIOLATIONS_PROMPT.pipe(llmWithFunctions).pipe(this.jsonOutputParser);
		if (typeof userResponse?.content !== "string") throw new Error("This chain does not support non-string model output.");
		const res = await chain.invoke({
			predicted_output: userPredictions.predictedUserMessage,
			actual_output: userResponse?.content ?? "",
			user_insights: userPredictions.insights.join("\n")
		}, runManager?.getChild("prediction_violations"));
		const revisedPrediction = await this.generateRevisedPrediction({
			originalPrediction: userPredictions.predictedUserMessage,
			explainedPredictionErrors: res.explainedPredictionErrors,
			userInsights: userPredictions.insights,
			runManager
		});
		return {
			userResponse,
			revisedPrediction,
			explainedPredictionErrors: res.explainedPredictionErrors
		};
	}
	/**
	* This method generates a revised prediction based on the original prediction, explained prediction errors, and user insights.
	*
	* @param {Object} params - The parameters for the method.
	* @param {string} params.originalPrediction - The original prediction made by the model.
	* @param {Array<string>} params.explainedPredictionErrors - An array of explained prediction errors.
	* @param {Array<string>} params.userInsights - An array of insights about the user.
	* @param {CallbackManagerForChainRun} [params.runManager] - Optional callback manager for the chain run.
	*
	* @returns {Promise<string>} A promise that resolves to a revised prediction.
	*/
	async generateRevisedPrediction({ originalPrediction, explainedPredictionErrors, userInsights, runManager }) {
		const revisedPredictionChain = GENERATE_REVISED_PREDICTION_PROMPT.pipe(this.llm).pipe(this.stringOutputParser);
		const revisedPredictionRes = await revisedPredictionChain.invoke({
			prediction: originalPrediction,
			explained_prediction_errors: explainedPredictionErrors.join("\n"),
			user_insights: userInsights.join("\n")
		}, runManager?.getChild("prediction_revision"));
		return revisedPredictionRes;
	}
	/**
	* This method generates facts or insights about the user based on the revised prediction, explained prediction errors, and the user's response.
	*
	* @param {Object} params - The parameters for the method.
	* @param {BaseMessage} [params.userResponse] - The actual user response.
	* @param {Object} params.predictions - The revised prediction and explained prediction errors.
	* @param {string} params.predictions.revisedPrediction - The revised prediction made by the model.
	* @param {Array<string>} params.predictions.explainedPredictionErrors - An array of explained prediction errors.
	* @param {CallbackManagerForChainRun} [params.runManager] - Optional callback manager for the chain run.
	*
	* @returns {Promise<string>} A promise that resolves to a string containing the generated facts or insights about the user.
	*/
	async generateFacts({ userResponse, predictions, runManager }) {
		const chain = GENERATE_FACTS_PROMPT.pipe(this.llm).pipe(this.stringOutputParser);
		if (typeof userResponse?.content !== "string") throw new Error("This chain does not support non-string model output.");
		const res = await chain.invoke({
			prediction_violations: predictions.explainedPredictionErrors.join("\n"),
			prediction: predictions.revisedPrediction,
			user_message: userResponse?.content ?? ""
		}, runManager?.getChild("generate_facts"));
		return res;
	}
	/**
	* Static method that creates a ViolationOfExpectationsChain instance from a
	* ChatOpenAI and retriever. It also accepts optional options
	* to customize the chain.
	*
	* @param llm The ChatOpenAI instance.
	* @param retriever The retriever used for similarity search.
	* @param options Optional options to customize the chain.
	*
	* @returns A new instance of ViolationOfExpectationsChain.
	*/
	static fromLLM(llm, retriever, options) {
		return new this({
			retriever,
			llm,
			...options
		});
	}
};

//#endregion
export { ViolationOfExpectationsChain };
//# sourceMappingURL=violation_of_expectations_chain.js.map