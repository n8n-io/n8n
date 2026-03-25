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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const classDeleter_js_1 = __importDefault(require("./classDeleter.js"));
const getter_js_1 = __importDefault(require("./getter.js"));
exports.default = (client) => __awaiter(void 0, void 0, void 0, function* () {
    const getter = new getter_js_1.default(client);
    const schema = yield getter.do();
    yield Promise.all(schema.classes
        ? schema.classes.map((c) => {
            const deleter = new classDeleter_js_1.default(client);
            return deleter.withClassName(c.class).do();
        })
        : []);
});
