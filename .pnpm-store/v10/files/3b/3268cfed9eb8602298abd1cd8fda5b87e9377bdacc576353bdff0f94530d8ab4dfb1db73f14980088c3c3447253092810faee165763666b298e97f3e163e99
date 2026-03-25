"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ClientV2_1 = require("../ClientV2");
const cohere = new ClientV2_1.CohereClientV2({
    token: process.env.COHERE_API_KEY,
    clientName: "typescript-e2e",
});
(0, globals_1.describe)("test sdk", () => {
    it("chat", () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield cohere.chat({
            model: "command-r-plus",
            messages: [
                {
                    role: "user",
                    content: "hello world!",
                },
            ],
        });
        console.log(response.message);
    }));
    it("chatStream", () => __awaiter(void 0, void 0, void 0, function* () {
        var e_1, _a;
        var _b;
        const stream = yield cohere.chatStream({
            model: "command-r-plus",
            messages: [
                {
                    role: "user",
                    content: "hello world!",
                },
            ],
        });
        const events = new Set();
        try {
            for (var stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield stream_1.next(), !stream_1_1.done;) {
                const chatEvent = stream_1_1.value;
                if (chatEvent) {
                    events.add(chatEvent.type);
                    if (chatEvent.type === "content-delta") {
                        console.log((_b = chatEvent.delta) === null || _b === void 0 ? void 0 : _b.message);
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (stream_1_1 && !stream_1_1.done && (_a = stream_1.return)) yield _a.call(stream_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        expect(events.has("message-start")).toBeTruthy();
        expect(events.has("content-start")).toBeTruthy();
        expect(events.has("content-delta")).toBeTruthy();
        expect(events.has("content-end")).toBeTruthy();
        expect(events.has("message-end")).toBeTruthy();
    }));
});
