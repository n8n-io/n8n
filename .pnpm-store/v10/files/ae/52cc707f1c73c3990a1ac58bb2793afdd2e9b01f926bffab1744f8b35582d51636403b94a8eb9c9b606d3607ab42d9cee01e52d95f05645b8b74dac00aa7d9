"use strict";
/* eslint import/no-extraneous-dependencies: 0 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZepMemory = void 0;
const memory_1 = require("@langchain/core/memory");
const memory_2 = require("langchain/memory");
const __1 = require("../");
const api_1 = require("../api");
const utils_1 = require("./utils");
/**
 * Class used to manage the memory of a chat session, including loading
 * and saving the chat history, and clearing the memory when needed. It
 * uses the ZepClient to interact with the Zep service for managing the
 * chat session's memory.
 * @example
 * ```typescript
 * const sessionId = randomUUID();
 *
 * // Initialize ZepMemory with session ID, base URL, and API key
 * const memory = new ZepMemory({
 *   sessionId,
 *   apiKey: "change_this_key",
 * });
 *
 * // Create a ChatOpenAI model instance with specific parameters
 * const model = new ChatOpenAI({
 *   modelName: "gpt-3.5-turbo",
 *   temperature: 0,
 * });
 *
 * // Create a ConversationChain with the model and memory
 * const chain = new ConversationChain({ llm: model, memory });
 *
 * // Example of calling the chain with an input
 * const res1 = await chain.call({ input: "Hi! I'm Jim." });
 * console.log({ res1 });
 *
 * // Follow-up call to the chain to demonstrate memory usage
 * const res2 = await chain.call({ input: "What did I just say my name was?" });
 * console.log({ res2 });
 *
 * // Output the session ID and the current state of memory
 * console.log("Session ID: ", sessionId);
 * console.log("Memory: ", await memory.loadMemoryVariables({}));
 *
 * ```
 */
class ZepMemory extends memory_2.BaseChatMemory {
    constructor(fields) {
        var _a, _b, _c, _d;
        super({
            returnMessages: (_a = fields === null || fields === void 0 ? void 0 : fields.returnMessages) !== null && _a !== void 0 ? _a : false,
            inputKey: fields === null || fields === void 0 ? void 0 : fields.inputKey,
            outputKey: fields === null || fields === void 0 ? void 0 : fields.outputKey,
        });
        this.humanPrefix = "Human";
        this.aiPrefix = "AI";
        this.memoryKey = "history";
        this.humanPrefix = (_b = fields.humanPrefix) !== null && _b !== void 0 ? _b : this.humanPrefix;
        this.aiPrefix = (_c = fields.aiPrefix) !== null && _c !== void 0 ? _c : this.aiPrefix;
        this.memoryKey = (_d = fields.memoryKey) !== null && _d !== void 0 ? _d : this.memoryKey;
        this.apiKey = fields.apiKey;
        this.sessionId = fields.sessionId;
        this.zepClient = new __1.ZepClient({
            environment: fields.baseURL,
            apiKey: this.apiKey,
        });
    }
    get memoryKeys() {
        return [this.memoryKey];
    }
    /**
     * Method that retrieves the chat history from the Zep service and formats
     * it into a list of messages.
     * @param values Input values for the method.
     * @returns Promise that resolves with the chat history formatted into a list of messages.
     */
    loadMemoryVariables(values) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // use either lastN provided by developer or undefined to use the
            // server preset.
            const memoryType = (_a = values.memoryType) !== null && _a !== void 0 ? _a : "perpetual";
            let memory = null;
            try {
                memory = yield this.zepClient.memory.get(this.sessionId, {
                    memoryType: memoryType,
                });
            }
            catch (error) {
                if (error instanceof api_1.NotFoundError) {
                    return this.returnMessages ? { [this.memoryKey]: [] } : { [this.memoryKey]: "" };
                }
                throw error;
            }
            if (this.returnMessages) {
                return {
                    [this.memoryKey]: [(0, utils_1.condenseZepMemoryIntoHumanMessage)(memory)],
                };
            }
            return {
                [this.memoryKey]: (0, utils_1.condenseZepMemoryIntoHumanMessage)(memory).content,
            };
        });
    }
    /**
     * Method that saves the input and output messages to the Zep service.
     * @param inputValues Input messages to be saved.
     * @param outputValues Output messages to be saved.
     * @returns Promise that resolves when the messages have been saved.
     */
    saveContext(inputValues, outputValues) {
        const _super = Object.create(null, {
            saveContext: { get: () => super.saveContext }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const input = (0, memory_1.getInputValue)(inputValues, this.inputKey);
            const output = (0, memory_1.getOutputValue)(outputValues, this.outputKey);
            // Add the new memory to the session using the ZepClient
            if (this.sessionId) {
                try {
                    yield this.zepClient.memory.add(this.sessionId, {
                        messages: [
                            {
                                role: this.humanPrefix,
                                roleType: "user",
                                content: `${input}`,
                            },
                            {
                                role: this.aiPrefix,
                                roleType: "assistant",
                                content: `${output}`,
                            },
                        ],
                    });
                }
                catch (error) {
                    console.error("Error adding memory: ", error);
                }
            }
            // Call the superclass's saveContext method
            yield _super.saveContext.call(this, inputValues, outputValues);
        });
    }
    /**
     * Method that deletes the chat history from the Zep service.
     * @returns Promise that resolves when the chat history has been deleted.
     */
    clear() {
        const _super = Object.create(null, {
            clear: { get: () => super.clear }
        });
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.zepClient.memory.delete(this.sessionId);
            }
            catch (error) {
                console.error("Error deleting session: ", error);
            }
            // Clear the superclass's chat history
            yield _super.clear.call(this);
        });
    }
}
exports.ZepMemory = ZepMemory;
