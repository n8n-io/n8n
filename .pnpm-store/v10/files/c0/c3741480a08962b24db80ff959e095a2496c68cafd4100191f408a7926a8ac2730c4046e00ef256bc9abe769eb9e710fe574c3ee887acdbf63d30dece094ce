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
exports.RecordingService = void 0;
const url_1 = require("url");
const http_util_1 = require("../util/http.util");
class RecordingService {
    constructor(baseUri) {
        this.baseUri = url_1.resolve(baseUri, 'recordings');
    }
    /**
     * Start recording stub mappings
     * @param recordSpec Record specification
     */
    startRecording(recordSpec) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'start'), {
                method: 'POST',
                body: JSON.stringify(recordSpec)
            });
        });
    }
    /**
     * Stop recording stub mappings
     * @param recordSpec Record specification
     */
    stopRecording() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'stop'), { method: 'POST' });
        });
    }
    /**
     * Get recording status
     */
    getRecordingStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'status'), { method: 'GET' });
        });
    }
    /**
     * Take a snapshot recording
     * @param recordSpec Record specification
     */
    takeSnapshotRecording(snapshotSpec) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'snapshot'), {
                method: 'POST',
                body: JSON.stringify(snapshotSpec)
            });
        });
    }
}
exports.RecordingService = RecordingService;
