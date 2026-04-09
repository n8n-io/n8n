"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Images = void 0;
const resource_1 = require("../core/resource.js");
const uploads_1 = require("../internal/uploads.js");
class Images extends resource_1.APIResource {
    /**
     * Creates a variation of a given image. This endpoint only supports `dall-e-2`.
     *
     * @example
     * ```ts
     * const imagesResponse = await client.images.createVariation({
     *   image: fs.createReadStream('otter.png'),
     * });
     * ```
     */
    createVariation(body, options) {
        return this._client.post('/images/variations', (0, uploads_1.multipartFormRequestOptions)({ body, ...options }, this._client));
    }
    /**
     * Creates an edited or extended image given one or more source images and a
     * prompt. This endpoint only supports `gpt-image-1` and `dall-e-2`.
     *
     * @example
     * ```ts
     * const imagesResponse = await client.images.edit({
     *   image: fs.createReadStream('path/to/file'),
     *   prompt: 'A cute baby sea otter wearing a beret',
     * });
     * ```
     */
    edit(body, options) {
        return this._client.post('/images/edits', (0, uploads_1.multipartFormRequestOptions)({ body, ...options }, this._client));
    }
    /**
     * Creates an image given a prompt.
     * [Learn more](https://platform.openai.com/docs/guides/images).
     *
     * @example
     * ```ts
     * const imagesResponse = await client.images.generate({
     *   prompt: 'A cute baby sea otter',
     * });
     * ```
     */
    generate(body, options) {
        return this._client.post('/images/generations', { body, ...options });
    }
}
exports.Images = Images;
//# sourceMappingURL=images.js.map