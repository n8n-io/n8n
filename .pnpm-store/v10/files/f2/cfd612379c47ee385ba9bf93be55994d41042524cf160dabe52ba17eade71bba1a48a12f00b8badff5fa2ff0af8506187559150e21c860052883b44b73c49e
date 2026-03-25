"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WireMockRestClient = void 0;
const loglevel_1 = __importDefault(require("loglevel"));
const url_1 = require("url");
const mapping_service_1 = require("../service/mapping.service");
const global_service_1 = require("../service/global.service");
const scenario_service_1 = require("../service/scenario.service");
const request_service_1 = require("../service/request.service");
const recording_service_1 = require("../service/recording.service");
const log_util_1 = require("../util/log.util");
const util_1 = require("../util");
class WireMockRestClient {
    constructor(baseUri, options = {}) {
        this.baseUri = url_1.resolve(baseUri, '__admin/');
        util_1.HttpUtil.proxy = process.env.WRC_HTTP_PROXY || options.proxy;
        util_1.HttpUtil.headers = process.env.WRC_HEADERS || options.headers || {};
        log_util_1.LogUtil.continueOnFailure = process.env.WRC_CONTINUE_ON_FAILURE === 'true' || options.continueOnFailure || false;
        log_util_1.LogUtil.logger().setLevel(process.env.WRC_LOG_LEVEL || options.logLevel || loglevel_1.default.levels.INFO);
    }
    get mappings() {
        return new mapping_service_1.MappingService(this.baseUri);
    }
    get requests() {
        return new request_service_1.RequestService(this.baseUri);
    }
    get recordings() {
        return new recording_service_1.RecordingService(this.baseUri);
    }
    get scenarios() {
        return new scenario_service_1.ScenarioService(this.baseUri);
    }
    get global() {
        return new global_service_1.GlobalService(this.baseUri);
    }
}
exports.WireMockRestClient = WireMockRestClient;
