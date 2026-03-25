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
const __1 = require("../");
let cohere;
const config = {
    awsRegion: "us-east-1",
    awsAccessKey: "...",
    awsSecretKey: "...",
    awsSessionToken: "...",
};
const models = {
    bedrock: {
        generate: "cohere.command-text-v14",
        embed: "cohere.embed-multilingual-v3",
        chat: "cohere.command-r-plus-v1:0",
    },
    sagemaker: {
        generate: "cohere-command-light",
        embed: "cohere-embed-multilingual-v3",
        chat: "cohere-command-plus",
    },
};
// skip until we have the right auth in ci
globals_1.describe.each(["bedrock"])("test sdk", (platform) => {
    cohere = {
        "bedrock": new __1.BedrockClient(config),
        "sagemaker": new __1.SagemakerClient(config)
    }[platform];
    globals_1.test.skip("generate works", () => __awaiter(void 0, void 0, void 0, function* () {
        const generate = yield cohere.generate({
            prompt: "Please explain to me how LLMs work",
            temperature: 0,
            model: models[platform].generate,
        });
        (0, globals_1.expect)(generate.generations[0].text).toBeDefined();
    }));
    globals_1.test.skip("generate stream works", () => __awaiter(void 0, void 0, void 0, function* () {
        var e_1, _a;
        const generate = yield cohere.generateStream({
            prompt: "Please explain to me how LLMs work",
            temperature: 0,
            model: models[platform].generate,
        });
        const chunks = [];
        try {
            for (var generate_1 = __asyncValues(generate), generate_1_1; generate_1_1 = yield generate_1.next(), !generate_1_1.done;) {
                const chunk = generate_1_1.value;
                chunks.push(chunk);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (generate_1_1 && !generate_1_1.done && (_a = generate_1.return)) yield _a.call(generate_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        (0, globals_1.expect)(chunks[0].eventType).toMatchInlineSnapshot(`"stream-start"`);
        (0, globals_1.expect)(chunks[1].eventType).toMatchInlineSnapshot(`"text-generation"`);
        (0, globals_1.expect)(chunks[chunks.length - 1].eventType).toMatchInlineSnapshot(`"stream-end"`);
    }));
    globals_1.test.skip("embed works", () => __awaiter(void 0, void 0, void 0, function* () {
        var _b, _c;
        const embed = yield cohere.embed({
            texts: ["hello", "goodbye"],
            model: models[platform].embed,
            inputType: "search_document",
        });
        if (embed.responseType === "embeddings_by_type") {
            (0, globals_1.expect)((_c = (_b = embed.embeddings) === null || _b === void 0 ? void 0 : _b.float) === null || _c === void 0 ? void 0 : _c[0]).toBeDefined();
        }
    }));
    globals_1.test.skip("chat works", () => __awaiter(void 0, void 0, void 0, function* () {
        const chat = yield cohere.chat({
            model: models[platform].chat,
            message: "send me a short message",
            temperature: 0,
        });
    }));
    globals_1.test.skip("chat stream works", () => __awaiter(void 0, void 0, void 0, function* () {
        var e_2, _d;
        const chat = yield cohere.chatStream({
            model: models[platform].chat,
            message: "send me a short message",
            temperature: 0,
        });
        const chunks = [];
        try {
            for (var chat_1 = __asyncValues(chat), chat_1_1; chat_1_1 = yield chat_1.next(), !chat_1_1.done;) {
                const chunk = chat_1_1.value;
                chunks.push(chunk);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (chat_1_1 && !chat_1_1.done && (_d = chat_1.return)) yield _d.call(chat_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        (0, globals_1.expect)(chunks[0].eventType).toMatchInlineSnapshot(`"text-generation"`);
        (0, globals_1.expect)(chunks[chunks.length - 1].eventType).toMatchInlineSnapshot(`"stream-end"`);
    }));
}, 5000);
