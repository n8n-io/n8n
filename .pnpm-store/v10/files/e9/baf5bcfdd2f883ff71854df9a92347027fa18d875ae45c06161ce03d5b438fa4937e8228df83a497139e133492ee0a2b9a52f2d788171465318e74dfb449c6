"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_js_1 = require("../errors.js");
const commandBase_js_1 = require("../validation/commandBase.js");
const validation_js_1 = require("./validation.js");
class BackupCreateStatusGetter extends commandBase_js_1.CommandBase {
    constructor(client) {
        super(client);
        this.validate = () => {
            this.addErrors([...(0, validation_js_1.validateBackend)(this.backend), ...(0, validation_js_1.validateBackupId)(this.backupId)]);
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new errors_js_1.WeaviateInvalidInputError('invalid usage: ' + this.errors.join(', ')));
            }
            return this.client.get(this._path());
        };
        this._path = () => {
            return `/backups/${this.backend}/${this.backupId}`;
        };
    }
    withBackend(backend) {
        this.backend = backend;
        return this;
    }
    withBackupId(backupId) {
        this.backupId = backupId;
        return this;
    }
}
exports.default = BackupCreateStatusGetter;
