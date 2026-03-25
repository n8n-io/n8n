import { isValidStringProperty } from '../validation/string.js';
export function validateIncludeClassNames(classNames) {
    if (Array.isArray(classNames)) {
        const errors = [];
        classNames.forEach((className) => {
            if (!isValidStringProperty(className)) {
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
export function validateExcludeClassNames(classNames) {
    if (Array.isArray(classNames)) {
        const errors = [];
        classNames.forEach((className) => {
            if (!isValidStringProperty(className)) {
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
export function validateBackend(backend) {
    if (!isValidStringProperty(backend)) {
        return ['string backend must set - set with .withBackend(backend)'];
    }
    return [];
}
export function validateBackupId(backupId) {
    if (!isValidStringProperty(backupId)) {
        return ['string backupId must be set - set with .withBackupId(backupId)'];
    }
    return [];
}
