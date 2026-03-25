"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohereClientV2 = void 0;
const Client_1 = require("./api/resources/v2/client/Client");
const Client_2 = require("./Client");
// this class will require manual updates over time
class CohereClientV2 {
    constructor(_options) {
        this._options = _options;
        this.client = new Client_2.CohereClient(this._options);
        this.clientV2 = new Client_1.V2(this._options);
        this.chat = this.clientV2.chat.bind(this.clientV2);
        this.chatStream = this.clientV2.chatStream.bind(this.clientV2);
        this.embed = this.clientV2.embed.bind(this.clientV2);
        this.rerank = this.clientV2.rerank.bind(this.clientV2);
        this.generateStream = this.client.generateStream.bind(this.clientV2);
        this.generate = this.client.generate.bind(this.clientV2);
        this.classify = this.client.classify.bind(this.clientV2);
        this.summarize = this.client.summarize.bind(this.clientV2);
        this.tokenize = this.client.tokenize.bind(this.clientV2);
        this.detokenize = this.client.detokenize.bind(this.clientV2);
        this.checkApiKey = this.client.checkApiKey.bind(this.clientV2);
        this.embedJobs = this.client.embedJobs;
        this.datasets = this.client.datasets;
        this.connectors = this.client.connectors;
        this.models = this.client.models;
        this.finetuning = this.client.finetuning;
    }
}
exports.CohereClientV2 = CohereClientV2;
