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
exports.ZepChatMessageHistory = void 0;
const messages_1 = require("@langchain/core/messages");
const chat_history_1 = require("@langchain/core/chat_history");
const api_1 = require("../api");
const utils_1 = require("./utils");
/**
 * Class used to manage the memory of a chat session, including loading
 * and saving the chat history, and clearing the memory when needed. It
 * uses the ZepClient to interact with the Zep service for managing the
 * chat session's memory.
 *
 */
class ZepChatMessageHistory extends chat_history_1.BaseChatMessageHistory {
    constructor(fields) {
        super();
        this.lc_namespace = [];
        this.humanPrefix = "human";
        this.aiPrefix = "ai";
        this.sessionId = fields.sessionId;
        this.memoryType = fields.memoryType;
        this.client = fields.client;
        if (fields.humanPrefix) {
            this.humanPrefix = fields.humanPrefix;
        }
        if (fields.aiPrefix) {
            this.aiPrefix = fields.aiPrefix;
        }
    }
    getMemory() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return this.client.memory.get(this.sessionId, { memoryType: this.memoryType });
            }
            catch (error) {
                if (error instanceof api_1.NotFoundError) {
                    console.warn(`Session ${this.sessionId} not found in Zep. Returning None`);
                }
                else {
                    console.error("Error getting memory: ", error);
                }
                return null;
            }
        });
    }
    getMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            const memory = yield this.getMemory();
            if (!memory) {
                return [];
            }
            return [(0, utils_1.condenseZepMemoryIntoHumanMessage)(memory)];
        });
    }
    addAIChatMessage(message, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.addMessage(new messages_1.AIMessage({ content: message }), metadata);
        });
    }
    addMessage(message, metadata) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const messageToSave = message;
            if (message._getType() === "ai") {
                messageToSave.name = this.aiPrefix;
            }
            else if (message._getType() === "human") {
                messageToSave.name = this.humanPrefix;
            }
            if (message.content === null) {
                throw new Error("Message content cannot be null");
            }
            if (Array.isArray(message.content)) {
                throw new Error("Message content cannot be a list");
            }
            yield this.client.memory.add(this.sessionId, {
                messages: [
                    {
                        content: message.content,
                        role: (_a = message.name) !== null && _a !== void 0 ? _a : message._getType(),
                        roleType: (0, utils_1.getZepMessageRoleType)(message._getType()),
                        metadata,
                    },
                ],
            });
        });
    }
    addUserMessage(message, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.addMessage(new messages_1.HumanMessage({ content: message }, metadata));
        });
    }
    clear() {
        console.warn("Clearing memory", this.sessionId);
        return Promise.resolve(undefined);
    }
}
exports.ZepChatMessageHistory = ZepChatMessageHistory;
