const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_util_time = require('../../util/time.cjs');
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const __langchain_core_utils_types = require_rolldown_runtime.__toESM(require("@langchain/core/utils/types"));
const __langchain_core_utils_json_schema = require_rolldown_runtime.__toESM(require("@langchain/core/utils/json_schema"));
const __langchain_openai = require_rolldown_runtime.__toESM(require("@langchain/openai"));

//#region src/experimental/openai_assistant/index.ts
var openai_assistant_exports = {};
require_rolldown_runtime.__export(openai_assistant_exports, {
	OpenAIAssistantRunnable: () => OpenAIAssistantRunnable,
	formatToOpenAIAssistantTool: () => formatToOpenAIAssistantTool
});
var OpenAIAssistantRunnable = class extends __langchain_core_runnables.Runnable {
	lc_namespace = [
		"langchain",
		"experimental",
		"openai_assistant"
	];
	client;
	assistantId;
	pollIntervalMs = 1e3;
	asAgent;
	constructor(fields) {
		super(fields);
		this.client = fields.client ?? new __langchain_openai.OpenAIClient(fields?.clientOptions);
		this.assistantId = fields.assistantId;
		this.asAgent = fields.asAgent ?? this.asAgent;
	}
	static async createAssistant({ model, name, instructions, tools, client, clientOptions, asAgent, pollIntervalMs, fileIds }) {
		const formattedTools = tools?.map((tool) => {
			if (tool instanceof __langchain_core_tools.StructuredTool) return formatToOpenAIAssistantTool(tool);
			return tool;
		}) ?? [];
		const oaiClient = client ?? new __langchain_openai.OpenAIClient(clientOptions);
		const assistant = await oaiClient.beta.assistants.create({
			name,
			instructions,
			tools: formattedTools,
			model,
			file_ids: fileIds
		});
		return new this({
			client: oaiClient,
			assistantId: assistant.id,
			asAgent,
			pollIntervalMs
		});
	}
	async invoke(input, _options) {
		let run;
		if (this.asAgent && input.steps && input.steps.length > 0) {
			const parsedStepsInput = await this._parseStepsInput(input);
			run = await this.client.beta.threads.runs.submitToolOutputs(parsedStepsInput.runId, {
				thread_id: parsedStepsInput.threadId,
				tool_outputs: parsedStepsInput.toolOutputs
			});
		} else if (!("threadId" in input)) {
			const thread = {
				messages: [{
					role: "user",
					content: input.content,
					attachments: input.attachments,
					metadata: input.messagesMetadata
				}],
				metadata: input.threadMetadata
			};
			run = await this._createThreadAndRun({
				...input,
				thread
			});
		} else if (!("runId" in input)) {
			await this.client.beta.threads.messages.create(input.threadId, {
				content: input.content,
				role: "user",
				attachments: input.attachments,
				metadata: input.messagesMetadata
			});
			run = await this._createRun(input);
		} else run = await this.client.beta.threads.runs.submitToolOutputs(input.runId, {
			thread_id: input.threadId,
			tool_outputs: input.toolOutputs
		});
		return this._getResponse(run.id, run.thread_id);
	}
	/**
	* Delete an assistant.
	*
	* @link {https://platform.openai.com/docs/api-reference/assistants/deleteAssistant}
	* @returns {Promise<AssistantDeleted>}
	*/
	async deleteAssistant() {
		return await this.client.beta.assistants.delete(this.assistantId);
	}
	/**
	* Retrieves an assistant.
	*
	* @link {https://platform.openai.com/docs/api-reference/assistants/getAssistant}
	* @returns {Promise<OpenAIClient.Beta.Assistants.Assistant>}
	*/
	async getAssistant() {
		return await this.client.beta.assistants.retrieve(this.assistantId);
	}
	/**
	* Modifies an assistant.
	*
	* @link {https://platform.openai.com/docs/api-reference/assistants/modifyAssistant}
	* @returns {Promise<OpenAIClient.Beta.Assistants.Assistant>}
	*/
	async modifyAssistant({ model, name, instructions, fileIds }) {
		return await this.client.beta.assistants.update(this.assistantId, {
			name,
			instructions,
			model,
			file_ids: fileIds
		});
	}
	async _parseStepsInput(input) {
		const { action: { runId, threadId } } = input.steps[input.steps.length - 1];
		const run = await this._waitForRun(runId, threadId);
		const toolCalls = run.required_action?.submit_tool_outputs.tool_calls;
		if (!toolCalls) return input;
		const toolOutputs = toolCalls.flatMap((toolCall) => {
			const matchedAction = input.steps.find((step) => step.action.toolCallId === toolCall.id);
			return matchedAction ? [{
				output: matchedAction.observation,
				tool_call_id: matchedAction.action.toolCallId
			}] : [];
		});
		return {
			toolOutputs,
			runId,
			threadId
		};
	}
	async _createRun({ instructions, model, tools, metadata, threadId }) {
		const run = this.client.beta.threads.runs.create(threadId, {
			assistant_id: this.assistantId,
			instructions,
			model,
			tools,
			metadata
		});
		return run;
	}
	async _createThreadAndRun(input) {
		const params = [
			"instructions",
			"model",
			"tools",
			"run_metadata"
		].filter((key) => key in input).reduce((obj, key) => {
			const newObj = obj;
			newObj[key] = input[key];
			return newObj;
		}, {});
		const run = this.client.beta.threads.createAndRun({
			...params,
			thread: input.thread,
			assistant_id: this.assistantId
		});
		return run;
	}
	async _waitForRun(runId, threadId) {
		let inProgress = true;
		let run = {};
		while (inProgress) {
			run = await this.client.beta.threads.runs.retrieve(runId, { thread_id: threadId });
			inProgress = ["in_progress", "queued"].includes(run.status);
			if (inProgress) await require_util_time.sleep(this.pollIntervalMs);
		}
		return run;
	}
	async _getResponse(runId, threadId) {
		const run = await this._waitForRun(runId, threadId);
		if (run.status === "completed") {
			const messages = await this.client.beta.threads.messages.list(threadId, { order: "desc" });
			const newMessages = messages.data.filter((msg) => msg.run_id === runId);
			if (!this.asAgent) return newMessages;
			const answer = newMessages.flatMap((msg) => msg.content);
			if (answer.every((item) => item.type === "text")) {
				const answerString = answer.map((item) => item.type === "text" && item.text.value).join("\n");
				return {
					returnValues: {
						output: answerString,
						runId,
						threadId
					},
					log: "",
					runId,
					threadId
				};
			}
		} else if (run.status === "requires_action") {
			if (!this.asAgent) return run.required_action?.submit_tool_outputs.tool_calls ?? [];
			const actions = [];
			run.required_action?.submit_tool_outputs.tool_calls.forEach((item) => {
				const functionCall = item.function;
				const args = JSON.parse(functionCall.arguments);
				actions.push({
					tool: functionCall.name,
					toolInput: args,
					toolCallId: item.id,
					log: "",
					runId,
					threadId
				});
			});
			return actions;
		}
		const runInfo = JSON.stringify(run, null, 2);
		throw new Error(`Unexpected run status ${run.status}.\nFull run info:\n\n${runInfo}`);
	}
};
function formatToOpenAIAssistantTool(tool) {
	return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: (0, __langchain_core_utils_types.isInteropZodSchema)(tool.schema) ? (0, __langchain_core_utils_json_schema.toJsonSchema)(tool.schema) : tool.schema
		}
	};
}

//#endregion
exports.OpenAIAssistantRunnable = OpenAIAssistantRunnable;
exports.formatToOpenAIAssistantTool = formatToOpenAIAssistantTool;
Object.defineProperty(exports, 'openai_assistant_exports', {
  enumerable: true,
  get: function () {
    return openai_assistant_exports;
  }
});
//# sourceMappingURL=index.cjs.map