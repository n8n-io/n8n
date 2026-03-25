"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
class Resource {
    constructor(resource) {
        this.resource = resource;
        this.resource = resource;
        this.timestamp = utils_1.now();
        this.deferred = utils_1.defer();
    }
    get promise() {
        return this.deferred.promise;
    }
    resolve() {
        this.deferred.resolve(undefined);
        return new Resource(this.resource);
    }
}
exports.Resource = Resource;
