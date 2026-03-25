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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBase64FromMedia = exports.downloadImageFromURLAsBase64 = void 0;
const fs_1 = __importDefault(require("fs"));
const http_js_1 = require("../connection/http.js");
const isFilePromise = (file) => new Promise((resolve, reject) => {
    if (file instanceof Buffer) {
        resolve(false);
    }
    fs_1.default.stat(file, (err, stats) => {
        if (err) {
            if (err.code == 'ENAMETOOLONG') {
                resolve(false);
                return;
            }
            reject(err);
            return;
        }
        if (stats === undefined) {
            resolve(false);
            return;
        }
        resolve(stats.isFile());
    });
});
const isUrl = (file) => {
    if (typeof file !== 'string')
        return false;
    try {
        const url = new URL(file);
        return !!url;
    }
    catch (_a) {
        return false;
    }
};
const downloadImageFromURLAsBase64 = (url) => __awaiter(void 0, void 0, void 0, function* () {
    if (!isUrl(url)) {
        throw new Error('Invalid URL');
    }
    try {
        const client = (0, http_js_1.httpClient)({
            headers: { 'Content-Type': 'image/*' },
            host: '',
        });
        const response = yield client.externalGet(url);
        if (!Buffer.isBuffer(response)) {
            throw new Error('Response is not a buffer');
        }
        return response.toString('base64');
    }
    catch (error) {
        throw new Error(`Failed to download image from URL: ${url}`);
    }
});
exports.downloadImageFromURLAsBase64 = downloadImageFromURLAsBase64;
const isBuffer = (file) => file instanceof Buffer;
const fileToBase64 = (file) => isFilePromise(file).then((isFile) => isFile
    ? new Promise((resolve, reject) => {
        fs_1.default.readFile(file, (err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data.toString('base64'));
        });
    })
    : isBuffer(file)
        ? Promise.resolve(file.toString('base64'))
        : isUrl(file)
            ? (0, exports.downloadImageFromURLAsBase64)(file)
            : Promise.resolve(file));
/**
 * This function converts a file buffer into a base64 string so that it can be
 * sent to Weaviate and stored as a media field.
 *
 * @param {string | Buffer} file The media to convert either as a base64 string, a file path string, an url, or as a buffer. If you passed a base64 string, the function does nothing and returns the string as is.
 * @returns {string} The base64 string
 */
const toBase64FromMedia = (media) => fileToBase64(media);
exports.toBase64FromMedia = toBase64FromMedia;
