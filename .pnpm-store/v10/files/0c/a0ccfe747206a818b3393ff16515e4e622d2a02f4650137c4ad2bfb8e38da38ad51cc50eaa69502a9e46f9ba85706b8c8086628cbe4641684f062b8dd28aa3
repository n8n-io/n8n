"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Beta = void 0;
const resource_1 = require("../../resource.js");
const AssistantsAPI = __importStar(require("./assistants.js"));
const ChatAPI = __importStar(require("./chat/chat.js"));
const assistants_1 = require("./assistants.js");
const RealtimeAPI = __importStar(require("./realtime/realtime.js"));
const realtime_1 = require("./realtime/realtime.js");
const ThreadsAPI = __importStar(require("./threads/threads.js"));
const threads_1 = require("./threads/threads.js");
const chat_1 = require("./chat/chat.js");
class Beta extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.realtime = new RealtimeAPI.Realtime(this._client);
        this.chat = new ChatAPI.Chat(this._client);
        this.assistants = new AssistantsAPI.Assistants(this._client);
        this.threads = new ThreadsAPI.Threads(this._client);
    }
}
exports.Beta = Beta;
Beta.Realtime = realtime_1.Realtime;
Beta.Assistants = assistants_1.Assistants;
Beta.AssistantsPage = assistants_1.AssistantsPage;
Beta.Threads = threads_1.Threads;
//# sourceMappingURL=beta.js.map