// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../resource.mjs";
import { isRequestOptions } from "../../core.mjs";
import * as DownloadsAPI from "./downloads.mjs";
import { Downloads } from "./downloads.mjs";
import * as LogsAPI from "./logs.mjs";
import { Logs } from "./logs.mjs";
import * as RecordingAPI from "./recording.mjs";
import { Recording } from "./recording.mjs";
import * as UploadsAPI from "./uploads.mjs";
import { Uploads } from "./uploads.mjs";
export class Sessions extends APIResource {
    constructor() {
        super(...arguments);
        this.downloads = new DownloadsAPI.Downloads(this._client);
        this.logs = new LogsAPI.Logs(this._client);
        this.recording = new RecordingAPI.Recording(this._client);
        this.uploads = new UploadsAPI.Uploads(this._client);
    }
    /**
     * Create a Session
     */
    create(body, options) {
        return this._client.post('/v1/sessions', { body, ...options });
    }
    /**
     * Session
     */
    retrieve(id, options) {
        return this._client.get(`/v1/sessions/${id}`, options);
    }
    /**
     * Update Session
     */
    update(id, body, options) {
        return this._client.post(`/v1/sessions/${id}`, { body, ...options });
    }
    list(query = {}, options) {
        if (isRequestOptions(query)) {
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
Sessions.Downloads = Downloads;
Sessions.Logs = Logs;
Sessions.Recording = Recording;
Sessions.Uploads = Uploads;
//# sourceMappingURL=sessions.mjs.map