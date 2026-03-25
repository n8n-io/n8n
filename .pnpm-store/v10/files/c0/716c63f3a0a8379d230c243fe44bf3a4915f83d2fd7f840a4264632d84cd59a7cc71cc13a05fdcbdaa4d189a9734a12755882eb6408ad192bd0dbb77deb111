"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
const string_js_1 = require("../validation/string.js");
const path_js_1 = require("./path.js");
class ObjectsBatchDeleter extends commandBase_js_1.CommandBase {
    constructor(client) {
        super(client);
        this.withConsistencyLevel = (cl) => {
            this.consistencyLevel = cl;
            return this;
        };
        this.payload = () => {
            return {
                match: {
                    class: this.className,
                    where: this.whereFilter,
                },
                output: this.output,
                dryRun: this.dryRun,
            };
        };
        this.validateClassName = () => {
            if (!(0, string_js_1.isValidStringProperty)(this.className)) {
                this.addError('string className must be set - set with .withClassName(className)');
            }
        };
        this.validateWhereFilter = () => {
            if (typeof this.whereFilter != 'object') {
                this.addError('object where must be set - set with .withWhere(whereFilter)');
            }
        };
        this.validate = () => {
            this.validateClassName();
            this.validateWhereFilter();
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
            if (this.tenant) {
                params.set('tenant', this.tenant);
            }
            const path = (0, path_js_1.buildObjectsPath)(params);
            return this.client.delete(path, this.payload(), true);
        };
    }
    withClassName(className) {
        this.className = className;
        return this;
    }
    withWhere(whereFilter) {
        this.whereFilter = whereFilter;
        return this;
    }
    withOutput(output) {
        this.output = output;
        return this;
    }
    withDryRun(dryRun) {
        this.dryRun = dryRun;
        return this;
    }
    withTenant(tenant) {
        this.tenant = tenant;
        return this;
    }
}
exports.default = ObjectsBatchDeleter;
