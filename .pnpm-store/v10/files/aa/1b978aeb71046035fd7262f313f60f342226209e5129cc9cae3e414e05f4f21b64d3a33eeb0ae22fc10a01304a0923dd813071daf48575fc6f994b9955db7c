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
const commandBase_js_1 = require("../validation/commandBase.js");
const string_js_1 = require("../validation/string.js");
const classGetter_js_1 = __importDefault(require("./classGetter.js"));
class VectorAdder extends commandBase_js_1.CommandBase {
    constructor(client) {
        super(client);
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.withVectors = (vectors) => {
            this.vectors = vectors;
            return this;
        };
        this.validateClassName = () => {
            if (!(0, string_js_1.isValidStringProperty)(this.className)) {
                this.addError('className must be set - set with .withClassName(className)');
            }
        };
        this.validate = () => {
            this.validateClassName();
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            return new classGetter_js_1.default(this.client)
                .withClassName(this.className)
                .do()
                .then((schema) => __awaiter(this, void 0, void 0, function* () {
                if (schema.vectorConfig === undefined) {
                    schema.vectorConfig = {};
                }
                for (const [key, value] of Object.entries(this.vectors)) {
                    if (schema.vectorConfig[key] !== undefined) {
                        continue;
                    }
                    schema.vectorConfig[key] = Object.assign({}, value);
                }
                const path = `/schema/${this.className}`;
                yield this.client.put(path, schema);
            }));
        };
    }
}
exports.default = VectorAdder;
