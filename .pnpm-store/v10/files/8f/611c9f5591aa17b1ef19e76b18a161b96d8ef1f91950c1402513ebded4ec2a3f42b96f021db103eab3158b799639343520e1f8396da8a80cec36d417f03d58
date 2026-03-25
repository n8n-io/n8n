"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class Deleter extends commandBase_js_1.CommandBase {
    constructor(client, objectsPath) {
        super(client);
        this.withId = (id) => {
            this.id = id;
            return this;
        };
        this.withClassName = (className) => {
            this.className = className;
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
        this.validateIsSet = (prop, name, setter) => {
            if (prop == undefined || prop == null || prop.length == 0) {
                this.addError(`${name} must be set - set with ${setter}`);
            }
        };
        this.validateId = () => {
            this.validateIsSet(this.id, 'id', '.withId(id)');
        };
        this.validate = () => {
            this.validateId();
        };
        this.do = () => {
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            this.validate();
            return this.objectsPath
                .buildDelete(this.id, this.className, this.consistencyLevel, this.tenant)
                .then((path) => {
                return this.client.delete(path, undefined, false);
            });
        };
        this.objectsPath = objectsPath;
    }
}
exports.default = Deleter;
