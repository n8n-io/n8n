"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBackupId = exports.validateBackend = exports.validateExcludeClassNames = exports.validateIncludeClassNames = void 0;
const string_js_1 = require("../validation/string.js");
function validateIncludeClassNames(classNames) {
    if (Array.isArray(classNames)) {
        const errors = [];
        classNames.forEach((className) => {
            if (!(0, string_js_1.isValidStringProperty)(className)) {
                errors.push('string className invalid - set with .withIncludeClassNames(...classNames)');
            }
        });
        return errors;
    }
    if (classNames !== null && classNames !== undefined) {
        return ['strings classNames invalid - set with .withIncludeClassNames(...classNames)'];
    }
    return [];
}
exports.validateIncludeClassNames = validateIncludeClassNames;
function validateExcludeClassNames(classNames) {
    if (Array.isArray(classNames)) {
        const errors = [];
        classNames.forEach((className) => {
            if (!(0, string_js_1.isValidStringProperty)(className)) {
                errors.push('string className invalid - set with .withExcludeClassNames(...classNames)');
            }
        });
        return errors;
    }
    if (classNames !== null && classNames !== undefined) {
        return ['strings classNames invalid - set with .withExcludeClassNames(...classNames)'];
    }
    return [];
}
exports.validateExcludeClassNames = validateExcludeClassNames;
function validateBackend(backend) {
    if (!(0, string_js_1.isValidStringProperty)(backend)) {
        return ['string backend must set - set with .withBackend(backend)'];
    }
    return [];
}
exports.validateBackend = validateBackend;
function validateBackupId(backupId) {
    if (!(0, string_js_1.isValidStringProperty)(backupId)) {
        return ['string backupId must be set - set with .withBackupId(backupId)'];
    }
    return [];
}
exports.validateBackupId = validateBackupId;
