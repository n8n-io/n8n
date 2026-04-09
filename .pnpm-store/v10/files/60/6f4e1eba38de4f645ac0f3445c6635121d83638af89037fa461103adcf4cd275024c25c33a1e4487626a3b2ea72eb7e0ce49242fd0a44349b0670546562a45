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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Images = void 0;
const resource_1 = require("../resource.js");
const Core = __importStar(require("../core.js"));
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
        return this._client.post('/images/variations', Core.multipartFormRequestOptions({ body, ...options }));
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
        return this._client.post('/images/edits', Core.multipartFormRequestOptions({ body, ...options }));
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