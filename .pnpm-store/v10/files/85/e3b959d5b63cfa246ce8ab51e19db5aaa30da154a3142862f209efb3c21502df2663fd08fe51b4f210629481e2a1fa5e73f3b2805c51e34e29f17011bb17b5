import { CommandBase } from '../validation/commandBase.js';
import { isValidStringProperty } from '../validation/string.js';
export default class Creator extends CommandBase {
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
        this.withClassName = (className) => {
            this.className = className;
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
        this.withConsistencyLevel = (cl) => {
            this.consistencyLevel = cl;
            return this;
        };
        this.withTenant = (tenant) => {
            this.tenant = tenant;
            return this;
        };
        this.validateClassName = () => {
            if (!isValidStringProperty(this.className)) {
                this.addError('className must be set - set with .withClassName(className)');
            }
        };
        // as Record<string, any> required below because server uses swagger object as interface{} in Go to perform type switching
        // actual types are []number and [][]number but unions don't work in go-swagger
        this.payload = () => ({
            tenant: this.tenant,
            vector: this.vector,
            properties: this.properties,
            class: this.className,
            id: this.id,
            vectors: this.vectors,
        });
        this.validate = () => {
            this.validateClassName();
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            return this.objectsPath
                .buildCreate(this.consistencyLevel)
                .then((path) => this.client.postReturn(path, this.payload()));
        };
        this.objectsPath = objectsPath;
    }
}
