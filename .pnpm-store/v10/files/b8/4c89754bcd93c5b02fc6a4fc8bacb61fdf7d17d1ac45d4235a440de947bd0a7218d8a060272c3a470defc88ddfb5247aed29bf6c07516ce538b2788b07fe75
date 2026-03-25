"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Videos = void 0;
const resource_1 = require("../core/resource.js");
const pagination_1 = require("../core/pagination.js");
const headers_1 = require("../internal/headers.js");
const uploads_1 = require("../internal/uploads.js");
const path_1 = require("../internal/utils/path.js");
class Videos extends resource_1.APIResource {
    /**
     * Create a video
     */
    create(body, options) {
        return this._client.post('/videos', (0, uploads_1.maybeMultipartFormRequestOptions)({ body, ...options }, this._client));
    }
    /**
     * Retrieve a video
     */
    retrieve(videoID, options) {
        return this._client.get((0, path_1.path) `/videos/${videoID}`, options);
    }
    /**
     * List videos
     */
    list(query = {}, options) {
        return this._client.getAPIList('/videos', (pagination_1.ConversationCursorPage), { query, ...options });
    }
    /**
     * Delete a video
     */
    delete(videoID, options) {
        return this._client.delete((0, path_1.path) `/videos/${videoID}`, options);
    }
    /**
     * Download video content
     */
    downloadContent(videoID, query = {}, options) {
        return this._client.get((0, path_1.path) `/videos/${videoID}/content`, {
            query,
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: 'application/binary' }, options?.headers]),
            __binaryResponse: true,
        });
    }
    /**
     * Create a video remix
     */
    remix(videoID, body, options) {
        return this._client.post((0, path_1.path) `/videos/${videoID}/remix`, (0, uploads_1.maybeMultipartFormRequestOptions)({ body, ...options }, this._client));
    }
}
exports.Videos = Videos;
//# sourceMappingURL=videos.js.map