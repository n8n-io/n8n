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
const commandBase_js_1 = require("../validation/commandBase.js");
const string_js_1 = require("../validation/string.js");
const shardUpdater_js_1 = require("./shardUpdater.js");
const shardsGetter_js_1 = require("./shardsGetter.js");
class ShardsUpdater extends commandBase_js_1.CommandBase {
    constructor(client) {
        super(client);
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.validateClassName = () => {
            if (!(0, string_js_1.isValidStringProperty)(this.className)) {
                this.addError('className must be set - set with .withClassName(className)');
            }
        };
        this.withStatus = (status) => {
            this.status = status;
            return this;
        };
        this.validateStatus = () => {
            if (!(0, string_js_1.isValidStringProperty)(this.status)) {
                this.addError('status must be set - set with .withStatus(status)');
            }
        };
        this.validate = () => {
            this.validateClassName();
            this.validateStatus();
        };
        this.updateShards = () => __awaiter(this, void 0, void 0, function* () {
            const payload = yield Promise.all(Array.from({ length: this.shards.length }, (_, i) => (0, shardUpdater_js_1.updateShard)(this.client, this.className, this.shards[i].name || '', this.status)
                .then((res) => {
                return { name: this.shards[i].name, status: res.status };
            })
                .catch((err) => this.addError(err.toString()))));
            if (this.errors.length > 0) {
                return Promise.reject(new Error(`failed to update shards: ${this.errors.join(', ')}`));
            }
            return Promise.resolve(payload);
        });
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error(`invalid usage: ${this.errors.join(', ')}`));
            }
            return (0, shardsGetter_js_1.getShards)(this.client, this.className)
                .then((shards) => (this.shards = shards))
                .then(() => {
                return this.updateShards();
            })
                .then((payload) => {
                return payload;
            })
                .catch((err) => {
                return Promise.reject(err);
            });
        };
        this.shards = [];
    }
}
exports.default = ShardsUpdater;
