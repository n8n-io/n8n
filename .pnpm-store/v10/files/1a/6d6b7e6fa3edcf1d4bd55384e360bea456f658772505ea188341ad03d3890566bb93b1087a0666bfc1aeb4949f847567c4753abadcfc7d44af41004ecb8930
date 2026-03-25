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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_1 = require("../index");
(0, globals_1.describe)("v1 back compat", () => {
    globals_1.test.each([
        "https://api.cohere.com/",
        "https://api.cohere.com/v1",
        "https://api.cohere.com/v1/",
        "https://api.cohere.com/v1//",
        "https://api.cohere.com/v2",
    ])("%s", (environment) => __awaiter(void 0, void 0, void 0, function* () {
        let url = "";
        const cohere = new index_1.CohereClient({
            token: "token",
            environment,
            fetcher: ((opts) => __awaiter(void 0, void 0, void 0, function* () {
                url = opts.url;
                throw "we're done";
            }))
        });
        try {
            yield cohere.chat({ message: "hello" });
        }
        catch (_a) { }
        expect(url).toMatchSnapshot();
    }));
});
