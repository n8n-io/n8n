import { CommandBase } from '../validation/commandBase.js';
import { isValidStringProperty } from '../validation/string.js';
export default class Updater extends CommandBase {
    constructor(client, objectsPath) {
        super(client);
        this.withVector = (vector) => {
            this.vector = vector;
            return this;
        };
        this.withVectors = (vectors) => {
            this.vectors = vectors;
            return this;
        };
        this.withProperties = (properties) => {
            this.properties = properties;
            return this;
        };
        this.withId = (id) => {
            this.id = id;
            return this;
        };
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.withTenant = (tenant) => {
            this.tenant = tenant;
            return this;
        };
        this.validateClassName = () => {
            if (!isValidStringProperty(this.className)) {
                this.addError('className must be set - use withClassName(className)');
            }
        };
        this.validateId = () => {
            if (this.id == undefined || this.id == null || this.id.length == 0) {
                this.addError('id must be set - initialize with updater(id)');
            }
        };
        this.withConsistencyLevel = (cl) => {
            this.consistencyLevel = cl;
            return this;
        };
        // as Record<string, any> required below because server uses swagger object as interface{} in Go to perform type switching
        // actual types are []number and [][]number but unions don't work in go-swagger
        this.payload = () => ({
            tenant: this.tenant,
            properties: this.properties,
            class: this.className,
            id: this.id,
            vector: this.vector,
            vectors: this.vectors,
        });
        this.validate = () => {
            this.validateClassName();
            this.validateId();
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            return this.objectsPath
                .buildUpdate(this.id, this.className, this.consistencyLevel)
                .then((path) => this.client.put(path, this.payload()));
        };
        this.objectsPath = objectsPath;
    }
}
