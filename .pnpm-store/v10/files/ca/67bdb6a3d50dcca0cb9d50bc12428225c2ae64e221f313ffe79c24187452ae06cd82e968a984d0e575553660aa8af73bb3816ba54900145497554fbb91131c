"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sessions = void 0;
const resource_1 = require("../../resource.js");
const core_1 = require("../../core.js");
const DownloadsAPI = __importStar(require("./downloads.js"));
const downloads_1 = require("./downloads.js");
const LogsAPI = __importStar(require("./logs.js"));
const logs_1 = require("./logs.js");
const RecordingAPI = __importStar(require("./recording.js"));
const recording_1 = require("./recording.js");
const UploadsAPI = __importStar(require("./uploads.js"));
const uploads_1 = require("./uploads.js");
class Sessions extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.downloads = new DownloadsAPI.Downloads(this._client);
        this.logs = new LogsAPI.Logs(this._client);
        this.recording = new RecordingAPI.Recording(this._client);
        this.uploads = new UploadsAPI.Uploads(this._client);
    }
    create(body = {}, options) {
        if ((0, core_1.isRequestOptions)(body)) {
            return this.create({}, body);
        }
        return this._client.post('/v1/sessions', { body, ...options });
    }
    /**
     * Get a Session
     */
    retrieve(id, options) {
        return this._client.get(`/v1/sessions/${id}`, options);
    }
    /**
     * Update a Session
     */
    update(id, body, options) {
        return this._client.post(`/v1/sessions/${id}`, { body, ...options });
    }
    list(query = {}, options) {
        if ((0, core_1.isRequestOptions)(query)) {
            return this.list({}, query);
        }
        return this._client.get('/v1/sessions', { query, ...options });
    }
    /**
     * Session Live URLs
     */
    debug(id, options) {
        return this._client.get(`/v1/sessions/${id}/debug`, options);
    }
}
exports.Sessions = Sessions;
Sessions.Downloads = downloads_1.Downloads;
Sessions.Logs = logs_1.Logs;
Sessions.Recording = recording_1.Recording;
Sessions.Uploads = uploads_1.Uploads;
//# sourceMappingURL=sessions.js.map