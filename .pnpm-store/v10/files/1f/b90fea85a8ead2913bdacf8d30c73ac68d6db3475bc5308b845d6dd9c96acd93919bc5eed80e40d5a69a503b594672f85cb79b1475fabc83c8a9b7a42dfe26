import { ValidationError } from './ValidationError';
import { ValidationTypes } from './ValidationTypes';
import { ValidationUtils } from './ValidationUtils';
import { isPromise, convertToArray } from '../utils';
import { getMetadataStorage } from '../metadata/MetadataStorage';
/**
 * Executes validation over given object.
 */
export class ValidationExecutor {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(validator, validatorOptions) {
        this.validator = validator;
        this.validatorOptions = validatorOptions;
        // -------------------------------------------------------------------------
        // Properties
        // -------------------------------------------------------------------------
        this.awaitingPromises = [];
        this.ignoreAsyncValidations = false;
        // -------------------------------------------------------------------------
        // Private Properties
        // -------------------------------------------------------------------------
        this.metadataStorage = getMetadataStorage();
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    execute(object, targetSchema, validationErrors) {
        var _a, _b;
        /**
         * If there is no metadata registered it means possibly the dependencies are not flatterned and
         * more than one instance is used.
         *
         * TODO: This needs proper handling, forcing to use the same container or some other proper solution.
         */
        if (!this.metadataStorage.hasValidationMetaData && ((_a = this.validatorOptions) === null || _a === void 0 ? void 0 : _a.enableDebugMessages) === true) {
            console.warn(`No validation metadata found. No validation will be  performed. There are multiple possible reasons:\n` +
                `  - There may be multiple class-validator versions installed. You will need to flatten your dependencies to fix the issue.\n` +
                `  - This validation runs before any file with validation decorator was parsed by NodeJS.`);
        }
        const groups = this.validatorOptions ? this.validatorOptions.groups : undefined;
        const strictGroups = (this.validatorOptions && this.validatorOptions.strictGroups) || false;
        const always = (this.validatorOptions && this.validatorOptions.always) || false;
        /** Forbid unknown values are turned on by default and any other value than false will enable it. */
        const forbidUnknownValues = ((_b = this.validatorOptions) === null || _b === void 0 ? void 0 : _b.forbidUnknownValues) === undefined || this.validatorOptions.forbidUnknownValues !== false;
        const targetMetadatas = this.metadataStorage.getTargetValidationMetadatas(object.constructor, targetSchema, always, strictGroups, groups);
        const groupedMetadatas = this.metadataStorage.groupByPropertyName(targetMetadatas);
        if (this.validatorOptions && forbidUnknownValues && !targetMetadatas.length) {
            const validationError = new ValidationError();
            if (!this.validatorOptions ||
                !this.validatorOptions.validationError ||
                this.validatorOptions.validationError.target === undefined ||
                this.validatorOptions.validationError.target === true)
                validationError.target = object;
            validationError.value = undefined;
            validationError.property = undefined;
            validationError.children = [];
            validationError.constraints = { unknownValue: 'an unknown value was passed to the validate function' };
            validationErrors.push(validationError);
            return;
        }
        if (this.validatorOptions && this.validatorOptions.whitelist)
            this.whitelist(object, groupedMetadatas, validationErrors);
        // General validation
        Object.keys(groupedMetadatas).forEach(propertyName => {
            const value = object[propertyName];
            const definedMetadatas = groupedMetadatas[propertyName].filter(metadata => metadata.type === ValidationTypes.IS_DEFINED);
            const metadatas = groupedMetadatas[propertyName].filter(metadata => metadata.type !== ValidationTypes.IS_DEFINED && metadata.type !== ValidationTypes.WHITELIST);
            if (value instanceof Promise &&
                metadatas.find(metadata => metadata.type === ValidationTypes.PROMISE_VALIDATION)) {
                this.awaitingPromises.push(value.then(resolvedValue => {
                    this.performValidations(object, resolvedValue, propertyName, definedMetadatas, metadatas, validationErrors);
                }));
            }
            else {
                this.performValidations(object, value, propertyName, definedMetadatas, metadatas, validationErrors);
            }
        });
    }
    whitelist(object, groupedMetadatas, validationErrors) {
        const notAllowedProperties = [];
        Object.keys(object).forEach(propertyName => {
            // does this property have no metadata?
            if (!groupedMetadatas[propertyName] || groupedMetadatas[propertyName].length === 0)
                notAllowedProperties.push(propertyName);
        });
        if (notAllowedProperties.length > 0) {
            if (this.validatorOptions && this.validatorOptions.forbidNonWhitelisted) {
                // throw errors
                notAllowedProperties.forEach(property => {
                    const validationError = this.generateValidationError(object, object[property], property);
                    validationError.constraints = { [ValidationTypes.WHITELIST]: `property ${property} should not exist` };
                    validationError.children = undefined;
                    validationErrors.push(validationError);
                });
            }
            else {
                // strip non allowed properties
                notAllowedProperties.forEach(property => delete object[property]);
            }
        }
    }
    stripEmptyErrors(errors) {
        return errors.filter(error => {
            if (error.children) {
                error.children = this.stripEmptyErrors(error.children);
            }
            if (Object.keys(error.constraints).length === 0) {
                if (error.children.length === 0) {
                    return false;
                }
                else {
                    delete error.constraints;
                }
            }
            return true;
        });
    }
    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------
    performValidations(object, value, propertyName, definedMetadatas, metadatas, validationErrors) {
        const customValidationMetadatas = metadatas.filter(metadata => metadata.type === ValidationTypes.CUSTOM_VALIDATION);
        const nestedValidationMetadatas = metadatas.filter(metadata => metadata.type === ValidationTypes.NESTED_VALIDATION);
        const conditionalValidationMetadatas = metadatas.filter(metadata => metadata.type === ValidationTypes.CONDITIONAL_VALIDATION);
        const validationError = this.generateValidationError(object, value, propertyName);
        validationErrors.push(validationError);
        const canValidate = this.conditionalValidations(object, value, conditionalValidationMetadatas);
        if (!canValidate) {
            return;
        }
        // handle IS_DEFINED validation type the special way - it should work no matter skipUndefinedProperties/skipMissingProperties is set or not
        this.customValidations(object, value, definedMetadatas, validationError);
        this.mapContexts(object, value, definedMetadatas, validationError);
        if (value === undefined && this.validatorOptions && this.validatorOptions.skipUndefinedProperties === true) {
            return;
        }
        if (value === null && this.validatorOptions && this.validatorOptions.skipNullProperties === true) {
            return;
        }
        if ((value === null || value === undefined) &&
            this.validatorOptions &&
            this.validatorOptions.skipMissingProperties === true) {
            return;
        }
        this.customValidations(object, value, customValidationMetadatas, validationError);
        this.nestedValidations(value, nestedValidationMetadatas, validationError);
        this.mapContexts(object, value, metadatas, validationError);
        this.mapContexts(object, value, customValidationMetadatas, validationError);
    }
    generateValidationError(object, value, propertyName) {
        const validationError = new ValidationError();
        if (!this.validatorOptions ||
            !this.validatorOptions.validationError ||
            this.validatorOptions.validationError.target === undefined ||
            this.validatorOptions.validationError.target === true)
            validationError.target = object;
        if (!this.validatorOptions ||
            !this.validatorOptions.validationError ||
            this.validatorOptions.validationError.value === undefined ||
            this.validatorOptions.validationError.value === true)
            validationError.value = value;
        validationError.property = propertyName;
        validationError.children = [];
        validationError.constraints = {};
        return validationError;
    }
    conditionalValidations(object, value, metadatas) {
        return metadatas
            .map(metadata => metadata.constraints[0](object, value))
            .reduce((resultA, resultB) => resultA && resultB, true);
    }
    customValidations(object, value, metadatas, error) {
        metadatas.forEach(metadata => {
            this.metadataStorage.getTargetValidatorConstraints(metadata.constraintCls).forEach(customConstraintMetadata => {
                if (customConstraintMetadata.async && this.ignoreAsyncValidations)
                    return;
                if (this.validatorOptions &&
                    this.validatorOptions.stopAtFirstError &&
                    Object.keys(error.constraints || {}).length > 0)
                    return;
                const validationArguments = {
                    targetName: object.constructor ? object.constructor.name : undefined,
                    property: metadata.propertyName,
                    object: object,
                    value: value,
                    constraints: metadata.constraints,
                };
                if (!metadata.each || !(Array.isArray(value) || value instanceof Set || value instanceof Map)) {
                    const validatedValue = customConstraintMetadata.instance.validate(value, validationArguments);
                    if (isPromise(validatedValue)) {
                        const promise = validatedValue.then(isValid => {
                            if (!isValid) {
                                const [type, message] = this.createValidationError(object, value, metadata, customConstraintMetadata);
                                error.constraints[type] = message;
                                if (metadata.context) {
                                    if (!error.contexts) {
                                        error.contexts = {};
                                    }
                                    error.contexts[type] = Object.assign(error.contexts[type] || {}, metadata.context);
                                }
                            }
                        });
                        this.awaitingPromises.push(promise);
                    }
                    else {
                        if (!validatedValue) {
                            const [type, message] = this.createValidationError(object, value, metadata, customConstraintMetadata);
                            error.constraints[type] = message;
                        }
                    }
                    return;
                }
                // convert set and map into array
                const arrayValue = convertToArray(value);
                // Validation needs to be applied to each array item
                const validatedSubValues = arrayValue.map((subValue) => customConstraintMetadata.instance.validate(subValue, validationArguments));
                const validationIsAsync = validatedSubValues.some((validatedSubValue) => isPromise(validatedSubValue));
                if (validationIsAsync) {
                    // Wrap plain values (if any) in promises, so that all are async
                    const asyncValidatedSubValues = validatedSubValues.map((validatedSubValue) => isPromise(validatedSubValue) ? validatedSubValue : Promise.resolve(validatedSubValue));
                    const asyncValidationIsFinishedPromise = Promise.all(asyncValidatedSubValues).then((flatValidatedValues) => {
                        const validationResult = flatValidatedValues.every((isValid) => isValid);
                        if (!validationResult) {
                            const [type, message] = this.createValidationError(object, value, metadata, customConstraintMetadata);
                            error.constraints[type] = message;
                            if (metadata.context) {
                                if (!error.contexts) {
                                    error.contexts = {};
                                }
                                error.contexts[type] = Object.assign(error.contexts[type] || {}, metadata.context);
                            }
                        }
                    });
                    this.awaitingPromises.push(asyncValidationIsFinishedPromise);
                    return;
                }
                const validationResult = validatedSubValues.every((isValid) => isValid);
                if (!validationResult) {
                    const [type, message] = this.createValidationError(object, value, metadata, customConstraintMetadata);
                    error.constraints[type] = message;
                }
            });
        });
    }
    nestedValidations(value, metadatas, error) {
        if (value === void 0) {
            return;
        }
        metadatas.forEach(metadata => {
            if (metadata.type !== ValidationTypes.NESTED_VALIDATION && metadata.type !== ValidationTypes.PROMISE_VALIDATION) {
                return;
            }
            else if (this.validatorOptions &&
                this.validatorOptions.stopAtFirstError &&
                Object.keys(error.constraints || {}).length > 0) {
                return;
            }
            if (Array.isArray(value) || value instanceof Set || value instanceof Map) {
                // Treats Set as an array - as index of Set value is value itself and it is common case to have Object as value
                const arrayLikeValue = value instanceof Set ? Array.from(value) : value;
                arrayLikeValue.forEach((subValue, index) => {
                    this.performValidations(value, subValue, index.toString(), [], metadatas, error.children);
                });
            }
            else if (value instanceof Object) {
                const targetSchema = typeof metadata.target === 'string' ? metadata.target : metadata.target.name;
                this.execute(value, targetSchema, error.children);
            }
            else {
                const [type, message] = this.createValidationError(metadata.target, value, metadata);
                error.constraints[type] = message;
            }
        });
    }
    mapContexts(object, value, metadatas, error) {
        return metadatas.forEach(metadata => {
            if (metadata.context) {
                let customConstraint;
                if (metadata.type === ValidationTypes.CUSTOM_VALIDATION) {
                    const customConstraints = this.metadataStorage.getTargetValidatorConstraints(metadata.constraintCls);
                    customConstraint = customConstraints[0];
                }
                const type = this.getConstraintType(metadata, customConstraint);
                if (error.constraints[type]) {
                    if (!error.contexts) {
                        error.contexts = {};
                    }
                    error.contexts[type] = Object.assign(error.contexts[type] || {}, metadata.context);
                }
            }
        });
    }
    createValidationError(object, value, metadata, customValidatorMetadata) {
        const targetName = object.constructor ? object.constructor.name : undefined;
        const type = this.getConstraintType(metadata, customValidatorMetadata);
        const validationArguments = {
            targetName: targetName,
            property: metadata.propertyName,
            object: object,
            value: value,
            constraints: metadata.constraints,
        };
        let message = metadata.message || '';
        if (!metadata.message &&
            (!this.validatorOptions || (this.validatorOptions && !this.validatorOptions.dismissDefaultMessages))) {
            if (customValidatorMetadata && customValidatorMetadata.instance.defaultMessage instanceof Function) {
                message = customValidatorMetadata.instance.defaultMessage(validationArguments);
            }
        }
        const messageString = ValidationUtils.replaceMessageSpecialTokens(message, validationArguments);
        return [type, messageString];
    }
    getConstraintType(metadata, customValidatorMetadata) {
        const type = customValidatorMetadata && customValidatorMetadata.name ? customValidatorMetadata.name : metadata.type;
        return type;
    }
}
//# sourceMappingURL=ValidationExecutor.js.map