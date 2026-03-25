"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
const path_js_1 = require("./path.js");
class ObjectsBatcher extends commandBase_js_1.CommandBase {
    constructor(client) {
        super(client);
        this.withConsistencyLevel = (cl) => {
            this.consistencyLevel = cl;
            return this;
        };
        this.payload = () => ({
            objects: this.objects,
        });
        this.validateObjectCount = () => {
            if (this.objects.length == 0) {
                this.addError('need at least one object to send a request, add one with .withObject(obj)');
            }
        };
        this.validate = () => {
            this.validateObjectCount();
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            const params = new URLSearchParams();
            if (this.consistencyLevel) {
                params.set('consistency_level', this.consistencyLevel);
            }
            const path = (0, path_js_1.buildObjectsPath)(params);
            return this.client.postReturn(path, this.payload());
        };
        this.objects = [];
    }
    /**
     * can be called as:
     *  - withObjects(...[obj1, obj2, obj3])
     *  - withObjects(obj1, obj2, obj3)
     *  - withObjects(obj1)
     * @param  {...WeaviateObject[]} objects
     */
    withObjects(...objects) {
        let objs = objects;
        if (objects.length && Array.isArray(objects[0])) {
            objs = objects[0];
        }
        this.objects = [...this.objects, ...objs];
        return this;
    }
    withObject(object) {
        return this.withObjects(object);
    }
}
exports.default = ObjectsBatcher;
