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
exports.getResponseBody = void 0;
const chooseStreamWrapper_1 = require("./stream-wrappers/chooseStreamWrapper");
function getResponseBody(response, responseType) {
    return __awaiter(this, void 0, void 0, function* () {
        if (response.body != null && responseType === "blob") {
            return yield response.blob();
        }
        else if (response.body != null && responseType === "sse") {
            return response.body;
        }
        else if (response.body != null && responseType === "streaming") {
            return (0, chooseStreamWrapper_1.chooseStreamWrapper)(response.body);
        }
        else if (response.body != null && responseType === "text") {
            return yield response.text();
        }
        else {
            const text = yield response.text();
            if (text.length > 0) {
                try {
                    let responseBody = JSON.parse(text);
                    return responseBody;
                }
                catch (err) {
                    return {
                        ok: false,
                        error: {
                            reason: "non-json",
                            statusCode: response.status,
                            rawBody: text,
                        },
                    };
                }
            }
            else {
                return undefined;
            }
        }
    });
}
exports.getResponseBody = getResponseBody;
