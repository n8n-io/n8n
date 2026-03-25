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
exports.MappingService = void 0;
const url_1 = require("url");
const json5_1 = require("json5");
const http_util_1 = require("../util/http.util");
const file_util_1 = require("../util/file.util");
class MappingService {
    constructor(baseUri) {
        this.baseUri = url_1.resolve(baseUri, 'mappings');
    }
    /**
     * Get all stub mappings
     */
    getAllMappings() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(this.baseUri, { method: 'GET' });
        });
    }
    /**
     * Create a new stub mapping
     * @param stubMapping Stub mapping definition
     */
    createMapping(stubMapping) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(this.baseUri, {
                method: 'POST',
                body: JSON.stringify(stubMapping)
            });
        });
    }
    /**
     * Create a new stub mapping by file
     * @param fileName File containing a stub mapping
     */
    createMappingFromFile(fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            const requestBody = json5_1.parse(file_util_1.FileUtil.getFileContent(fileName));
            return this.createMapping(requestBody);
        });
    }
    /**
     * Create new stub mappings by directory
     * @param directoryName Directory to read files (containing stub mappings) recursively from
     */
    createMappingsFromDir(directoryName) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileNames = file_util_1.FileUtil.getFilesFromDir(directoryName);
            return fileNames.map((fileName) => this.createMappingFromFile(fileName));
        });
    }
    /**
     * Delete all stub mappings
     */
    deleteAllMappings() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(this.baseUri, { method: 'DELETE' });
        });
    }
    /**
     * Reset stub mappings (restore to defaults defined back the backing store)
     */
    resetAllMappings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'reset'), { method: 'POST' });
        });
    }
    /**
     * Get single stub mapping
     * @param uuid The UUID of stub mapping
     */
    getMapping(uuid) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, uuid), { method: 'GET' });
        });
    }
    /**
     * Update an existing stub mapping
     * @param uuid The UUID of stub mapping
     * @param stubMapping Stub mapping definition
     */
    updateMapping(uuid, stubMapping) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, uuid), {
                method: 'PUT',
                body: JSON.stringify(stubMapping)
            });
        });
    }
    /**
     * Delete a stub mapping
     * @param uuid The UUID of stub mapping
     */
    deleteMapping(uuid) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, uuid), { method: 'DELETE' });
        });
    }
    /**
     * Save all persistent stub mappings to the backing store
     */
    saveAllMappings() {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'save'), { method: 'POST' });
        });
    }
    /**
     * Find stubs by matching on their metadata
     */
    findByMetaData(contentPattern) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'find-by-metadata'), {
                method: 'POST',
                body: JSON.stringify(contentPattern)
            });
        });
    }
    /**
     * Remove stubs by matching on their metadata
     */
    removeByMetaData(contentPattern) {
        return __awaiter(this, void 0, void 0, function* () {
            return http_util_1.HttpUtil.fetch(url_1.resolve(`${this.baseUri}/`, 'remove-by-metadata'), {
                method: 'POST',
                body: JSON.stringify(contentPattern)
            });
        });
    }
}
exports.MappingService = MappingService;
