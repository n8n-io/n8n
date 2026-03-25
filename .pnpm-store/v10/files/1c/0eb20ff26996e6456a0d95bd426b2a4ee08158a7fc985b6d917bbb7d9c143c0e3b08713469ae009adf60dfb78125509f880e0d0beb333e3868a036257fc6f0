import { CommandBase } from '../validation/commandBase.js';
import { buildObjectsPath } from './path.js';
export default class ObjectsBatcher extends CommandBase {
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
            const path = buildObjectsPath(params);
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
