// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../core/resource.mjs";
import { ConversationCursorPage } from "../core/pagination.mjs";
import { buildHeaders } from "../internal/headers.mjs";
import { maybeMultipartFormRequestOptions } from "../internal/uploads.mjs";
import { path } from "../internal/utils/path.mjs";
export class Videos extends APIResource {
    /**
     * Create a video
     */
    create(body, options) {
        return this._client.post('/videos', maybeMultipartFormRequestOptions({ body, ...options }, this._client));
    }
    /**
     * Retrieve a video
     */
    retrieve(videoID, options) {
        return this._client.get(path `/videos/${videoID}`, options);
    }
    /**
     * List videos
     */
    list(query = {}, options) {
        return this._client.getAPIList('/videos', (ConversationCursorPage), { query, ...options });
    }
    /**
     * Delete a video
     */
    delete(videoID, options) {
        return this._client.delete(path `/videos/${videoID}`, options);
    }
    /**
     * Download video content
     */
    downloadContent(videoID, query = {}, options) {
        return this._client.get(path `/videos/${videoID}/content`, {
            query,
            ...options,
            headers: buildHeaders([{ Accept: 'application/binary' }, options?.headers]),
            __binaryResponse: true,
        });
    }
    /**
     * Create a video remix
     */
    remix(videoID, body, options) {
        return this._client.post(path `/videos/${videoID}/remix`, maybeMultipartFormRequestOptions({ body, ...options }, this._client));
    }
}
//# sourceMappingURL=videos.mjs.map