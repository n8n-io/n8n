"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class GetterById extends commandBase_js_1.CommandBase {
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
        this.withTenant = (tenant) => {
            this.tenant = tenant;
            return this;
        };
        this.extendAdditional = (prop) => {
            this.additional = [...this.additional, prop];
            return this;
        };
        this.withAdditional = (additionalFlag) => this.extendAdditional(additionalFlag);
        this.withVector = () => this.extendAdditional('vector');
        this.withConsistencyLevel = (cl) => {
            this.consistencyLevel = cl;
            return this;
        };
        this.withNodeName = (nodeName) => {
            this.nodeName = nodeName;
            return this;
        };
        this.validateId = () => {
            if (this.id == undefined || this.id == null || this.id.length == 0) {
                this.addError('id must be set - initialize with getterById(id)');
            }
        };
        this.validate = () => {
            this.validateId();
        };
        this.buildPath = () => {
            return this.objectsPath.buildGetOne(this.id, this.className, this.additional, this.consistencyLevel, this.nodeName, this.tenant);
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            return this.buildPath().then((path) => {
                return this.client.get(path);
            });
        };
        this.objectsPath = objectsPath;
        this.additional = [];
    }
}
exports.default = GetterById;
