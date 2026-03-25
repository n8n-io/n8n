"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Cache {
    constructor() {
        this.getLatestRegistryId = (subject) => this.registryIdBySubject[subject];
        this.setLatestRegistryId = (subject, id) => {
            this.registryIdBySubject[subject] = id;
            return this.registryIdBySubject[subject];
        };
        this.getSchema = (registryId) => this.schemasByRegistryId[registryId];
        this.setSchema = (registryId, type, schema) => {
            this.schemasByRegistryId[registryId] = { type, schema };
            return this.schemasByRegistryId[registryId];
        };
        this.clear = () => {
            this.registryIdBySubject = {};
            this.schemasByRegistryId = {};
        };
        this.registryIdBySubject = {};
        this.schemasByRegistryId = {};
    }
}
exports.default = Cache;
//# sourceMappingURL=cache.js.map