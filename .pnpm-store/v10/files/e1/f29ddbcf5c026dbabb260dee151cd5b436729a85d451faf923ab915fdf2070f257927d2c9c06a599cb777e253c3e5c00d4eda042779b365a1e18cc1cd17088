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
const index_1 = require("../index");
const cohere = new index_1.CohereClient({
    token: process.env.COHERE_API_KEY,
    clientName: "typescript-e2e",
});
(0, globals_1.describe)("test sdk", () => {
    globals_1.test.concurrent("generate works", () => __awaiter(void 0, void 0, void 0, function* () {
        const generate = yield cohere.generate({
            prompt: "Please explain to me how LLMs work",
            temperature: 0,
        });
    }));
    globals_1.test.concurrent("generate stream works", () => __awaiter(void 0, void 0, void 0, function* () {
        var e_1, _a;
        const generate = yield cohere.generateStream({
            prompt: "Please explain to me how LLMs work",
            temperature: 0,
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
        (0, globals_1.expect)(chunks[0].eventType).toMatchInlineSnapshot(`"text-generation"`);
        (0, globals_1.expect)(chunks[1].eventType).toMatchInlineSnapshot(`"text-generation"`);
        (0, globals_1.expect)(chunks[chunks.length - 1].eventType).toMatchInlineSnapshot(`"stream-end"`);
    }));
    globals_1.test.concurrent("embed works", () => __awaiter(void 0, void 0, void 0, function* () {
        const embed = yield cohere.embed({
            texts: ["hello", "goodbye"],
            model: "small",
        });
    }));
    globals_1.test.concurrent("chat works", () => __awaiter(void 0, void 0, void 0, function* () {
        const chat = yield cohere.chat({
            chatHistory: [
                { role: "USER", message: "Who discovered gravity?" },
                {
                    role: "CHATBOT",
                    message: "The man who is widely credited with discovering gravity is Sir Isaac Newton",
                },
            ],
            message: "What year was he born?",
            connectors: [{ id: "web-search" }],
            temperature: 0,
        });
    }));
    globals_1.test.concurrent("chat stream works", () => __awaiter(void 0, void 0, void 0, function* () {
        var e_2, _b;
        const chat = yield cohere.chatStream({
            chatHistory: [
                { role: "USER", message: "Who discovered gravity?" },
                {
                    role: "CHATBOT",
                    message: "The man who is widely credited with discovering gravity is Sir Isaac Newton",
                },
            ],
            message: "What year was he born?",
            connectors: [{ id: "web-search" }],
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
                if (chat_1_1 && !chat_1_1.done && (_b = chat_1.return)) yield _b.call(chat_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        (0, globals_1.expect)(chunks[0].eventType).toMatchInlineSnapshot(`"stream-start"`);
        (0, globals_1.expect)(chunks[1].eventType).toMatchInlineSnapshot(`"search-queries-generation"`);
        (0, globals_1.expect)(chunks[chunks.length - 1].eventType).toMatchInlineSnapshot(`"stream-end"`);
    }));
    // this test hasn't yet been fixed
    globals_1.test.skip("check that no emojis get chopped up", () => __awaiter(void 0, void 0, void 0, function* () {
        var e_3, _c;
        const chat = yield cohere.chatStream({
            model: "command-r",
            message: "generate 2000 emojis"
        });
        let finalChunk;
        try {
            for (var chat_2 = __asyncValues(chat), chat_2_1; chat_2_1 = yield chat_2.next(), !chat_2_1.done;) {
                const chunk = chat_2_1.value;
                finalChunk = chunk;
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (chat_2_1 && !chat_2_1.done && (_c = chat_2.return)) yield _c.call(chat_2);
            }
            finally { if (e_3) throw e_3.error; }
        }
        (0, globals_1.expect)(finalChunk.eventType).toMatchInlineSnapshot(`"stream-end"`);
        if (finalChunk.eventType === "stream-end") {
            (0, globals_1.expect)(finalChunk.response.text).not.toContain("�");
        }
    }));
    globals_1.test.concurrent("classify works", () => __awaiter(void 0, void 0, void 0, function* () {
        const classify = yield cohere.classify({
            examples: [
                { text: "Dermatologists don't like her!", label: "Spam" },
                { text: "'Hello, open to this?'", label: "Spam" },
                { text: "I need help please wire me $1000 right now", label: "Spam" },
                { text: "Nice to know you ;)", label: "Spam" },
                { text: "Please help me?", label: "Spam" },
                { text: "Your parcel will be delivered today", label: "Not spam" },
                { text: "Review changes to our Terms and Conditions", label: "Not spam" },
                { text: "Weekly sync notes", label: "Not spam" },
                { text: "'Re: Follow up from today's meeting'", label: "Not spam" },
                { text: "Pre-read for tomorrow", label: "Not spam" },
            ],
            inputs: ["Confirm your email address", "hey i need u to send some $"],
        });
    }));
    globals_1.test.concurrent("tokenize works", () => __awaiter(void 0, void 0, void 0, function* () {
        const tokenize = yield cohere.tokenize({
            text: "tokenize me! :D",
            model: "command",
        });
    }));
    globals_1.test.concurrent("detokenize works", () => __awaiter(void 0, void 0, void 0, function* () {
        const detokenize = yield cohere.detokenize({
            tokens: [10104, 12221, 1315, 34, 1420, 69],
            model: "command",
        });
    }));
    globals_1.test.concurrent("summarize works", () => __awaiter(void 0, void 0, void 0, function* () {
        const summarize = yield cohere.summarize({
            text: "Ice cream is a sweetened frozen food typically eaten as a snack or dessert. " +
                "It may be made from milk or cream and is flavoured with a sweetener, " +
                "either sugar or an alternative, and a spice, such as cocoa or vanilla, " +
                "or with fruit such as strawberries or peaches. " +
                "It can also be made by whisking a flavored cream base and liquid nitrogen together. " +
                "Food coloring is sometimes added, in addition to stabilizers. " +
                "The mixture is cooled below the freezing point of water and stirred to incorporate air spaces " +
                "and to prevent detectable ice crystals from forming. The result is a smooth, " +
                "semi-solid foam that is solid at very low temperatures (below 2 °C or 35 °F). " +
                "It becomes more malleable as its temperature increases.\n\n" +
                'The meaning of the name "ice cream" varies from one country to another. ' +
                'In some countries, such as the United States, "ice cream" applies only to a specific variety, ' +
                "and most governments regulate the commercial use of the various terms according to the " +
                "relative quantities of the main ingredients, notably the amount of cream. " +
                "Products that do not meet the criteria to be called ice cream are sometimes labelled " +
                '"frozen dairy dessert" instead. In other countries, such as Italy and Argentina, ' +
                "one word is used fo\r all variants. Analogues made from dairy alternatives, " +
                "such as goat's or sheep's milk, or milk substitutes " +
                "(e.g., soy, cashew, coconut, almond milk or tofu), are available for those who are " +
                "lactose intolerant, allergic to dairy protein or vegan.",
        });
    }));
    globals_1.test.concurrent("rerank works", () => __awaiter(void 0, void 0, void 0, function* () {
        const rerank = yield cohere.rerank({
            documents: [
                { text: "Carson City is the capital city of the American state of Nevada." },
                {
                    text: "The Commonwealth of the Northern Mariana Islands is a group of islands in the Pacific Ocean. Its capital is Saipan.",
                },
                {
                    text: "Washington, D.C. (also known as simply Washington or D.C., and officially as the District of Columbia) is the capital of the United States. It is a federal district.",
                },
                {
                    text: "Capital punishment (the death penalty) has existed in the United States since beforethe United States was a country. As of 2017, capital punishment is legal in 30 of the 50 states.",
                },
            ],
            query: "What is the capital of the United States?",
            topN: 3,
        });
    }));
    globals_1.test.concurrent("tool use works", () => __awaiter(void 0, void 0, void 0, function* () {
        var _d, _e, _f;
        const tools = [
            {
                name: "sales_database",
                description: "Connects to a database about sales volumes",
                parameterDefinitions: {
                    day: {
                        description: "Retrieves sales data from this day, formatted as YYYY-MM-DD.",
                        type: "str",
                        required: true,
                    },
                },
            },
        ];
        const toolsResponse = yield cohere.chat({
            message: "How good were the sales on September 29?",
            tools,
            preamble: `
              ## Task Description
              You help people answer their questions and other requests interactively. You will be asked a very wide array of requests on all kinds of topics. You will be equipped with a wide range of search engines or similar tools to help you, which you use to research your answer. You should focus on serving the user's needs as best you can, which will be wide-ranging.
              
              ## Style Guide
              Unless the user asks for a different style of answer, you should answer in full sentences, using proper grammar and spelling.
            `,
        });
        (0, globals_1.expect)((_d = toolsResponse.toolCalls) === null || _d === void 0 ? void 0 : _d[0].name).toMatchInlineSnapshot(`"sales_database"`);
        (0, globals_1.expect)((_e = toolsResponse.toolCalls) === null || _e === void 0 ? void 0 : _e[0].parameters).toMatchInlineSnapshot(`
            {
              "day": "2023-09-29",
            }
        `);
        const localTools = {
            sales_database: (day) => ({
                numberOfSales: 120,
                totalRevenue: 48500,
                averageSaleValue: 404.17,
                date: "2023-09-29",
            }),
        };
        const toolResults = (_f = toolsResponse.toolCalls) === null || _f === void 0 ? void 0 : _f.map((toolCall) => {
            return {
                call: toolCall,
                outputs: [localTools[toolCall.name](toolCall.parameters.day)],
            };
        });
        const citedResponse = yield cohere.chat({
            message: "How good were the sales on September 29?",
            tools,
            toolResults: toolResults,
            model: "command-nightly",
            forceSingleStep: true
        });
        (0, globals_1.expect)(citedResponse.documents).toMatchInlineSnapshot(`
            [
              {
                "averageSaleValue": "404.17",
                "date": "2023-09-29",
                "id": "sales_database:0:0",
                "numberOfSales": "120",
                "tool_name": "sales_database",
                "totalRevenue": "48500",
              },
            ]
        `);
    }));
});
