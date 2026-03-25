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
exports.ScenarioService = void 0;
const url_1 = require("url");
const http_util_1 = require("../util/http.util");
class ScenarioService {
    constructor(baseUri) {
        this.baseUri = url_1.resolve(baseUri, 'scenarios');
    }
    /**
     * Get all scenarios
     */
    getAllScenarios() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(this.baseUri, { method: 'GET' });
        });
    }
    /**
     * Reset the state of all scenarios
     */
    resetAllScenarios() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'reset'), { method: 'POST' });
        });
    }
    /**
     * Reset the state of a single scenario
     */
    resetScenario(scenarioId) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/${scenarioId}/`, 'state'), {
                method: 'PUT'
            });
        });
    }
    /**
     * Set the state of a single scenario
     */
    setScenarioState(scenarioId, state) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/${scenarioId}/`, 'state'), {
                method: 'PUT',
                body: JSON.stringify({ state }),
            });
        });
    }
}
exports.ScenarioService = ScenarioService;
