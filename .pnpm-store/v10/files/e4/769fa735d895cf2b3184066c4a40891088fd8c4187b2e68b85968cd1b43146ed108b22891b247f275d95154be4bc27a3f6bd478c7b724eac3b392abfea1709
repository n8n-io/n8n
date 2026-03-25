(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ClassValidator = {}));
})(this, (function (exports) { 'use strict';

    /**
     * This metadata contains validation rules.
     */
    var ValidationMetadata = /** @class */ (function () {
        // -------------------------------------------------------------------------
        // Constructor
        // -------------------------------------------------------------------------
        function ValidationMetadata(args) {
            /**
             * Validation groups used for this validation.
             */
            this.groups = [];
            /**
             * Specifies if validated value is an array and each of its item must be validated.
             */
            this.each = false;
            /*
             * A transient set of data passed through to the validation result for response mapping
             */
            this.context = undefined;
            this.type = args.type;
            this.name = args.name;
            this.target = args.target;
            this.propertyName = args.propertyName;
            this.constraints = args === null || args === void 0 ? void 0 : args.constraints;
            this.constraintCls = args.constraintCls;
            this.validationTypeOptions = args.validationTypeOptions;
            if (args.validationOptions) {
                this.message = args.validationOptions.message;
                this.groups = args.validationOptions.groups;
                this.always = args.validationOptions.always;
                this.each = args.validationOptions.each;
                this.context = args.validationOptions.context;
            }
        }
        return ValidationMetadata;
    }());

    /**
     * Used to transform validation schemas to validation metadatas.
     */
    var ValidationSchemaToMetadataTransformer = /** @class */ (function () {
        function ValidationSchemaToMetadataTransformer() {
        }
        ValidationSchemaToMetadataTransformer.prototype.transform = function (schema) {
            var metadatas = [];
            Object.keys(schema.properties).forEach(function (property) {
                schema.properties[property].forEach(function (validation) {
                    var validationOptions = {
                        message: validation.message,
                        groups: validation.groups,
                        always: validation.always,
                        each: validation.each,
                    };
                    var args = {
                        type: validation.type,
                        name: validation.name,
                        target: schema.name,
                        propertyName: property,
                        constraints: validation.constraints,
                        validationTypeOptions: validation.options,
                        validationOptions: validationOptions,
                    };
                    metadatas.push(new ValidationMetadata(args));
                });
            });
            return metadatas;
        };
        return ValidationSchemaToMetadataTransformer;
    }());

    /**
     * Convert Map, Set to Array
     */
    function convertToArray(val) {
        if (val instanceof Map) {
            return Array.from(val.values());
        }
        return Array.isArray(val) ? val : Array.from(val);
    }

    /**
     * This function returns the global object across Node and browsers.
     *
     * Note: `globalThis` is the standardized approach however it has been added to
     * Node.js in version 12. We need to include this snippet until Node 12 EOL.
     */
    function getGlobal() {
        if (typeof globalThis !== 'undefined') {
            return globalThis;
        }
        if (typeof global !== 'undefined') {
            return global;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Cannot find name 'window'.
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore: Cannot find name 'window'.
            return window;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Cannot find name 'self'.
        if (typeof self !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore: Cannot find name 'self'.
            return self;
        }
    }

    // https://github.com/TylorS/typed-is-promise/blob/abf1514e1b6961adfc75765476b0debb96b2c3ae/src/index.ts
    function isPromise(p) {
        return p !== null && typeof p === 'object' && typeof p.then === 'function';
    }

    var __values = (undefined && undefined.__values) || function(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    };
    var __read$2 = (undefined && undefined.__read) || function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };
    var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    };
    /**
     * Storage all metadatas.
     */
    var MetadataStorage = /** @class */ (function () {
        function MetadataStorage() {
            // -------------------------------------------------------------------------
            // Private properties
            // -------------------------------------------------------------------------
            this.validationMetadatas = new Map();
            this.constraintMetadatas = new Map();
        }
        Object.defineProperty(MetadataStorage.prototype, "hasValidationMetaData", {
            get: function () {
                return !!this.validationMetadatas.size;
            },
            enumerable: false,
            configurable: true
        });
        // -------------------------------------------------------------------------
        // Public Methods
        // -------------------------------------------------------------------------
        /**
         * Adds a new validation metadata.
         */
        MetadataStorage.prototype.addValidationSchema = function (schema) {
            var _this = this;
            var validationMetadatas = new ValidationSchemaToMetadataTransformer().transform(schema);
            validationMetadatas.forEach(function (validationMetadata) { return _this.addValidationMetadata(validationMetadata); });
        };
        /**
         * Adds a new validation metadata.
         */
        MetadataStorage.prototype.addValidationMetadata = function (metadata) {
            var existingMetadata = this.validationMetadatas.get(metadata.target);
            if (existingMetadata) {
                existingMetadata.push(metadata);
            }
            else {
                this.validationMetadatas.set(metadata.target, [metadata]);
            }
        };
        /**
         * Adds a new constraint metadata.
         */
        MetadataStorage.prototype.addConstraintMetadata = function (metadata) {
            var existingMetadata = this.constraintMetadatas.get(metadata.target);
            if (existingMetadata) {
                existingMetadata.push(metadata);
            }
            else {
                this.constraintMetadatas.set(metadata.target, [metadata]);
            }
        };
        /**
         * Groups metadata by their property names.
         */
        MetadataStorage.prototype.groupByPropertyName = function (metadata) {
            var grouped = {};
            metadata.forEach(function (metadata) {
                if (!grouped[metadata.propertyName])
                    grouped[metadata.propertyName] = [];
                grouped[metadata.propertyName].push(metadata);
            });
            return grouped;
        };
        /**
         * Gets all validation metadatas for the given object with the given groups.
         */
        MetadataStorage.prototype.getTargetValidationMetadatas = function (targetConstructor, targetSchema, always, strictGroups, groups) {
            var e_1, _a;
            var includeMetadataBecauseOfAlwaysOption = function (metadata) {
                // `metadata.always` overrides global default.
                if (typeof metadata.always !== 'undefined')
                    return metadata.always;
                // `metadata.groups` overrides global default.
                if (metadata.groups && metadata.groups.length)
                    return false;
                // Use global default.
                return always;
            };
            var excludeMetadataBecauseOfStrictGroupsOption = function (metadata) {
                if (strictGroups) {
                    // Validation is not using groups.
                    if (!groups || !groups.length) {
                        // `metadata.groups` has at least one group.
                        if (metadata.groups && metadata.groups.length)
                            return true;
                    }
                }
                return false;
            };
            // get directly related to a target metadatas
            var filteredForOriginalMetadatasSearch = this.validationMetadatas.get(targetConstructor) || [];
            var originalMetadatas = filteredForOriginalMetadatasSearch.filter(function (metadata) {
                if (metadata.target !== targetConstructor && metadata.target !== targetSchema)
                    return false;
                if (includeMetadataBecauseOfAlwaysOption(metadata))
                    return true;
                if (excludeMetadataBecauseOfStrictGroupsOption(metadata))
                    return false;
                if (groups && groups.length > 0)
                    return metadata.groups && !!metadata.groups.find(function (group) { return groups.indexOf(group) !== -1; });
                return true;
            });
            // get metadatas for inherited classes
            var filteredForInheritedMetadatasSearch = [];
            try {
                for (var _b = __values(this.validationMetadatas.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read$2(_c.value, 2), key = _d[0], value = _d[1];
                    if (targetConstructor.prototype instanceof key) {
                        filteredForInheritedMetadatasSearch.push.apply(filteredForInheritedMetadatasSearch, __spreadArray([], __read$2(value), false));
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var inheritedMetadatas = filteredForInheritedMetadatasSearch.filter(function (metadata) {
                // if target is a string it's means we validate against a schema, and there is no inheritance support for schemas
                if (typeof metadata.target === 'string')
                    return false;
                if (metadata.target === targetConstructor)
                    return false;
                if (metadata.target instanceof Function && !(targetConstructor.prototype instanceof metadata.target))
                    return false;
                if (includeMetadataBecauseOfAlwaysOption(metadata))
                    return true;
                if (excludeMetadataBecauseOfStrictGroupsOption(metadata))
                    return false;
                if (groups && groups.length > 0)
                    return metadata.groups && !!metadata.groups.find(function (group) { return groups.indexOf(group) !== -1; });
                return true;
            });
            // filter out duplicate metadatas, prefer original metadatas instead of inherited metadatas
            var uniqueInheritedMetadatas = inheritedMetadatas.filter(function (inheritedMetadata) {
                return !originalMetadatas.find(function (originalMetadata) {
                    return (originalMetadata.propertyName === inheritedMetadata.propertyName &&
                        originalMetadata.type === inheritedMetadata.type);
                });
            });
            return originalMetadatas.concat(uniqueInheritedMetadatas);
        };
        /**
         * Gets all validator constraints for the given object.
         */
        MetadataStorage.prototype.getTargetValidatorConstraints = function (target) {
            return this.constraintMetadatas.get(target) || [];
        };
        return MetadataStorage;
    }());
    /**
     * Gets metadata storage.
     * Metadata storage follows the best practices and stores metadata in a global variable.
     */
    function getMetadataStorage() {
        var global = getGlobal();
        if (!global.classValidatorMetadataStorage) {
            global.classValidatorMetadataStorage = new MetadataStorage();
        }
        return global.classValidatorMetadataStorage;
    }

    /**
     * Validation error description.
     */
    var ValidationError = /** @class */ (function () {
        function ValidationError() {
        }
        /**
         *
         * @param shouldDecorate decorate the message with ANSI formatter escape codes for better readability
         * @param hasParent true when the error is a child of an another one
         * @param parentPath path as string to the parent of this property
         * @param showConstraintMessages show constraint messages instead of constraint names
         */
        ValidationError.prototype.toString = function (shouldDecorate, hasParent, parentPath, showConstraintMessages) {
            var _this = this;
            if (shouldDecorate === void 0) { shouldDecorate = false; }
            if (hasParent === void 0) { hasParent = false; }
            if (parentPath === void 0) { parentPath = ""; }
            if (showConstraintMessages === void 0) { showConstraintMessages = false; }
            var boldStart = shouldDecorate ? "\u001B[1m" : "";
            var boldEnd = shouldDecorate ? "\u001B[22m" : "";
            var constraintsToString = function () { var _a; return (showConstraintMessages ? Object.values : Object.keys)((_a = _this.constraints) !== null && _a !== void 0 ? _a : {}).join(", "); };
            var propConstraintFailed = function (propertyName) {
                return " - property ".concat(boldStart).concat(parentPath).concat(propertyName).concat(boldEnd, " has failed the following constraints: ").concat(boldStart).concat(constraintsToString()).concat(boldEnd, " \n");
            };
            if (!hasParent) {
                return ("An instance of ".concat(boldStart).concat(this.target ? this.target.constructor.name : 'an object').concat(boldEnd, " has failed the validation:\n") +
                    (this.constraints ? propConstraintFailed(this.property) : "") +
                    (this.children
                        ? this.children
                            .map(function (childError) { return childError.toString(shouldDecorate, true, _this.property, showConstraintMessages); })
                            .join("")
                        : ""));
            }
            else {
                // we format numbers as array indexes for better readability.
                var formattedProperty_1 = Number.isInteger(+this.property)
                    ? "[".concat(this.property, "]")
                    : "".concat(parentPath ? "." : "").concat(this.property);
                if (this.constraints) {
                    return propConstraintFailed(formattedProperty_1);
                }
                else {
                    return this.children
                        ? this.children
                            .map(function (childError) {
                            return childError.toString(shouldDecorate, true, "".concat(parentPath).concat(formattedProperty_1), showConstraintMessages);
                        })
                            .join("")
                        : "";
                }
            }
        };
        return ValidationError;
    }());

    /**
     * Validation types.
     */
    var ValidationTypes = /** @class */ (function () {
        function ValidationTypes() {
        }
        /**
         * Checks if validation type is valid.
         */
        ValidationTypes.isValid = function (type) {
            var _this = this;
            return (type !== 'isValid' &&
                type !== 'getMessage' &&
                Object.keys(this)
                    .map(function (key) { return _this[key]; })
                    .indexOf(type) !== -1);
        };
        /* system */
        ValidationTypes.CUSTOM_VALIDATION = 'customValidation'; // done
        ValidationTypes.NESTED_VALIDATION = 'nestedValidation'; // done
        ValidationTypes.PROMISE_VALIDATION = 'promiseValidation'; // done
        ValidationTypes.CONDITIONAL_VALIDATION = 'conditionalValidation'; // done
        ValidationTypes.WHITELIST = 'whitelistValidation'; // done
        ValidationTypes.IS_DEFINED = 'isDefined'; // done
        return ValidationTypes;
    }());

    /**
     * Convert the constraint to a string to be shown in an error
     */
    function constraintToString(constraint) {
        if (Array.isArray(constraint)) {
            return constraint.join(', ');
        }
        if (typeof constraint === 'symbol') {
            constraint = constraint.description;
        }
        return "".concat(constraint);
    }
    var ValidationUtils = /** @class */ (function () {
        function ValidationUtils() {
        }
        ValidationUtils.replaceMessageSpecialTokens = function (message, validationArguments) {
            var messageString;
            if (message instanceof Function) {
                messageString = message(validationArguments);
            }
            else if (typeof message === 'string') {
                messageString = message;
            }
            if (messageString && Array.isArray(validationArguments.constraints)) {
                validationArguments.constraints.forEach(function (constraint, index) {
                    messageString = messageString.replace(new RegExp("\\$constraint".concat(index + 1), 'g'), constraintToString(constraint));
                });
            }
            if (messageString &&
                validationArguments.value !== undefined &&
                validationArguments.value !== null &&
                typeof validationArguments.value === 'string')
                messageString = messageString.replace(/\$value/g, validationArguments.value);
            if (messageString)
                messageString = messageString.replace(/\$property/g, validationArguments.property);
            if (messageString)
                messageString = messageString.replace(/\$target/g, validationArguments.targetName);
            return messageString;
        };
        return ValidationUtils;
    }());

    var __read$1 = (undefined && undefined.__read) || function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };
    /**
     * Executes validation over given object.
     */
    var ValidationExecutor = /** @class */ (function () {
        // -------------------------------------------------------------------------
        // Constructor
        // -------------------------------------------------------------------------
        function ValidationExecutor(validator, validatorOptions) {
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
        ValidationExecutor.prototype.execute = function (object, targetSchema, validationErrors) {
            var _this = this;
            var _a, _b;
            /**
             * If there is no metadata registered it means possibly the dependencies are not flatterned and
             * more than one instance is used.
             *
             * TODO: This needs proper handling, forcing to use the same container or some other proper solution.
             */
            if (!this.metadataStorage.hasValidationMetaData && ((_a = this.validatorOptions) === null || _a === void 0 ? void 0 : _a.enableDebugMessages) === true) {
                console.warn("No validation metadata found. No validation will be  performed. There are multiple possible reasons:\n" +
                    "  - There may be multiple class-validator versions installed. You will need to flatten your dependencies to fix the issue.\n" +
                    "  - This validation runs before any file with validation decorator was parsed by NodeJS.");
            }
            var groups = this.validatorOptions ? this.validatorOptions.groups : undefined;
            var strictGroups = (this.validatorOptions && this.validatorOptions.strictGroups) || false;
            var always = (this.validatorOptions && this.validatorOptions.always) || false;
            /** Forbid unknown values are turned on by default and any other value than false will enable it. */
            var forbidUnknownValues = ((_b = this.validatorOptions) === null || _b === void 0 ? void 0 : _b.forbidUnknownValues) === undefined || this.validatorOptions.forbidUnknownValues !== false;
            var targetMetadatas = this.metadataStorage.getTargetValidationMetadatas(object.constructor, targetSchema, always, strictGroups, groups);
            var groupedMetadatas = this.metadataStorage.groupByPropertyName(targetMetadatas);
            if (this.validatorOptions && forbidUnknownValues && !targetMetadatas.length) {
                var validationError = new ValidationError();
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
            Object.keys(groupedMetadatas).forEach(function (propertyName) {
                var value = object[propertyName];
                var definedMetadatas = groupedMetadatas[propertyName].filter(function (metadata) { return metadata.type === ValidationTypes.IS_DEFINED; });
                var metadatas = groupedMetadatas[propertyName].filter(function (metadata) { return metadata.type !== ValidationTypes.IS_DEFINED && metadata.type !== ValidationTypes.WHITELIST; });
                if (value instanceof Promise &&
                    metadatas.find(function (metadata) { return metadata.type === ValidationTypes.PROMISE_VALIDATION; })) {
                    _this.awaitingPromises.push(value.then(function (resolvedValue) {
                        _this.performValidations(object, resolvedValue, propertyName, definedMetadatas, metadatas, validationErrors);
                    }));
                }
                else {
                    _this.performValidations(object, value, propertyName, definedMetadatas, metadatas, validationErrors);
                }
            });
        };
        ValidationExecutor.prototype.whitelist = function (object, groupedMetadatas, validationErrors) {
            var _this = this;
            var notAllowedProperties = [];
            Object.keys(object).forEach(function (propertyName) {
                // does this property have no metadata?
                if (!groupedMetadatas[propertyName] || groupedMetadatas[propertyName].length === 0)
                    notAllowedProperties.push(propertyName);
            });
            if (notAllowedProperties.length > 0) {
                if (this.validatorOptions && this.validatorOptions.forbidNonWhitelisted) {
                    // throw errors
                    notAllowedProperties.forEach(function (property) {
                        var _a;
                        var validationError = _this.generateValidationError(object, object[property], property);
                        validationError.constraints = (_a = {}, _a[ValidationTypes.WHITELIST] = "property ".concat(property, " should not exist"), _a);
                        validationError.children = undefined;
                        validationErrors.push(validationError);
                    });
                }
                else {
                    // strip non allowed properties
                    notAllowedProperties.forEach(function (property) { return delete object[property]; });
                }
            }
        };
        ValidationExecutor.prototype.stripEmptyErrors = function (errors) {
            var _this = this;
            return errors.filter(function (error) {
                if (error.children) {
                    error.children = _this.stripEmptyErrors(error.children);
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
        };
        // -------------------------------------------------------------------------
        // Private Methods
        // -------------------------------------------------------------------------
        ValidationExecutor.prototype.performValidations = function (object, value, propertyName, definedMetadatas, metadatas, validationErrors) {
            var customValidationMetadatas = metadatas.filter(function (metadata) { return metadata.type === ValidationTypes.CUSTOM_VALIDATION; });
            var nestedValidationMetadatas = metadatas.filter(function (metadata) { return metadata.type === ValidationTypes.NESTED_VALIDATION; });
            var conditionalValidationMetadatas = metadatas.filter(function (metadata) { return metadata.type === ValidationTypes.CONDITIONAL_VALIDATION; });
            var validationError = this.generateValidationError(object, value, propertyName);
            validationErrors.push(validationError);
            var canValidate = this.conditionalValidations(object, value, conditionalValidationMetadatas);
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
        };
        ValidationExecutor.prototype.generateValidationError = function (object, value, propertyName) {
            var validationError = new ValidationError();
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
        };
        ValidationExecutor.prototype.conditionalValidations = function (object, value, metadatas) {
            return metadatas
                .map(function (metadata) { return metadata.constraints[0](object, value); })
                .reduce(function (resultA, resultB) { return resultA && resultB; }, true);
        };
        ValidationExecutor.prototype.customValidations = function (object, value, metadatas, error) {
            var _this = this;
            metadatas.forEach(function (metadata) {
                _this.metadataStorage.getTargetValidatorConstraints(metadata.constraintCls).forEach(function (customConstraintMetadata) {
                    if (customConstraintMetadata.async && _this.ignoreAsyncValidations)
                        return;
                    if (_this.validatorOptions &&
                        _this.validatorOptions.stopAtFirstError &&
                        Object.keys(error.constraints || {}).length > 0)
                        return;
                    var validationArguments = {
                        targetName: object.constructor ? object.constructor.name : undefined,
                        property: metadata.propertyName,
                        object: object,
                        value: value,
                        constraints: metadata.constraints,
                    };
                    if (!metadata.each || !(Array.isArray(value) || value instanceof Set || value instanceof Map)) {
                        var validatedValue = customConstraintMetadata.instance.validate(value, validationArguments);
                        if (isPromise(validatedValue)) {
                            var promise = validatedValue.then(function (isValid) {
                                if (!isValid) {
                                    var _a = __read$1(_this.createValidationError(object, value, metadata, customConstraintMetadata), 2), type = _a[0], message = _a[1];
                                    error.constraints[type] = message;
                                    if (metadata.context) {
                                        if (!error.contexts) {
                                            error.contexts = {};
                                        }
                                        error.contexts[type] = Object.assign(error.contexts[type] || {}, metadata.context);
                                    }
                                }
                            });
                            _this.awaitingPromises.push(promise);
                        }
                        else {
                            if (!validatedValue) {
                                var _a = __read$1(_this.createValidationError(object, value, metadata, customConstraintMetadata), 2), type = _a[0], message = _a[1];
                                error.constraints[type] = message;
                            }
                        }
                        return;
                    }
                    // convert set and map into array
                    var arrayValue = convertToArray(value);
                    // Validation needs to be applied to each array item
                    var validatedSubValues = arrayValue.map(function (subValue) {
                        return customConstraintMetadata.instance.validate(subValue, validationArguments);
                    });
                    var validationIsAsync = validatedSubValues.some(function (validatedSubValue) {
                        return isPromise(validatedSubValue);
                    });
                    if (validationIsAsync) {
                        // Wrap plain values (if any) in promises, so that all are async
                        var asyncValidatedSubValues = validatedSubValues.map(function (validatedSubValue) {
                            return isPromise(validatedSubValue) ? validatedSubValue : Promise.resolve(validatedSubValue);
                        });
                        var asyncValidationIsFinishedPromise = Promise.all(asyncValidatedSubValues).then(function (flatValidatedValues) {
                            var validationResult = flatValidatedValues.every(function (isValid) { return isValid; });
                            if (!validationResult) {
                                var _a = __read$1(_this.createValidationError(object, value, metadata, customConstraintMetadata), 2), type = _a[0], message = _a[1];
                                error.constraints[type] = message;
                                if (metadata.context) {
                                    if (!error.contexts) {
                                        error.contexts = {};
                                    }
                                    error.contexts[type] = Object.assign(error.contexts[type] || {}, metadata.context);
                                }
                            }
                        });
                        _this.awaitingPromises.push(asyncValidationIsFinishedPromise);
                        return;
                    }
                    var validationResult = validatedSubValues.every(function (isValid) { return isValid; });
                    if (!validationResult) {
                        var _b = __read$1(_this.createValidationError(object, value, metadata, customConstraintMetadata), 2), type = _b[0], message = _b[1];
                        error.constraints[type] = message;
                    }
                });
            });
        };
        ValidationExecutor.prototype.nestedValidations = function (value, metadatas, error) {
            var _this = this;
            if (value === void 0) {
                return;
            }
            metadatas.forEach(function (metadata) {
                if (metadata.type !== ValidationTypes.NESTED_VALIDATION && metadata.type !== ValidationTypes.PROMISE_VALIDATION) {
                    return;
                }
                else if (_this.validatorOptions &&
                    _this.validatorOptions.stopAtFirstError &&
                    Object.keys(error.constraints || {}).length > 0) {
                    return;
                }
                if (Array.isArray(value) || value instanceof Set || value instanceof Map) {
                    // Treats Set as an array - as index of Set value is value itself and it is common case to have Object as value
                    var arrayLikeValue = value instanceof Set ? Array.from(value) : value;
                    arrayLikeValue.forEach(function (subValue, index) {
                        _this.performValidations(value, subValue, index.toString(), [], metadatas, error.children);
                    });
                }
                else if (value instanceof Object) {
                    var targetSchema = typeof metadata.target === 'string' ? metadata.target : metadata.target.name;
                    _this.execute(value, targetSchema, error.children);
                }
                else {
                    var _a = __read$1(_this.createValidationError(metadata.target, value, metadata), 2), type = _a[0], message = _a[1];
                    error.constraints[type] = message;
                }
            });
        };
        ValidationExecutor.prototype.mapContexts = function (object, value, metadatas, error) {
            var _this = this;
            return metadatas.forEach(function (metadata) {
                if (metadata.context) {
                    var customConstraint = void 0;
                    if (metadata.type === ValidationTypes.CUSTOM_VALIDATION) {
                        var customConstraints = _this.metadataStorage.getTargetValidatorConstraints(metadata.constraintCls);
                        customConstraint = customConstraints[0];
                    }
                    var type = _this.getConstraintType(metadata, customConstraint);
                    if (error.constraints[type]) {
                        if (!error.contexts) {
                            error.contexts = {};
                        }
                        error.contexts[type] = Object.assign(error.contexts[type] || {}, metadata.context);
                    }
                }
            });
        };
        ValidationExecutor.prototype.createValidationError = function (object, value, metadata, customValidatorMetadata) {
            var targetName = object.constructor ? object.constructor.name : undefined;
            var type = this.getConstraintType(metadata, customValidatorMetadata);
            var validationArguments = {
                targetName: targetName,
                property: metadata.propertyName,
                object: object,
                value: value,
                constraints: metadata.constraints,
            };
            var message = metadata.message || '';
            if (!metadata.message &&
                (!this.validatorOptions || (this.validatorOptions && !this.validatorOptions.dismissDefaultMessages))) {
                if (customValidatorMetadata && customValidatorMetadata.instance.defaultMessage instanceof Function) {
                    message = customValidatorMetadata.instance.defaultMessage(validationArguments);
                }
            }
            var messageString = ValidationUtils.replaceMessageSpecialTokens(message, validationArguments);
            return [type, messageString];
        };
        ValidationExecutor.prototype.getConstraintType = function (metadata, customValidatorMetadata) {
            var type = customValidatorMetadata && customValidatorMetadata.name ? customValidatorMetadata.name : metadata.type;
            return type;
        };
        return ValidationExecutor;
    }());

    var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (g && (g = 0, op[0] && (_ = 0)), _) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
    /**
     * Validator performs validation of the given object based on its metadata.
     */
    var Validator = /** @class */ (function () {
        function Validator() {
        }
        /**
         * Performs validation of the given object based on decorators or validation schema.
         */
        Validator.prototype.validate = function (objectOrSchemaName, objectOrValidationOptions, maybeValidatorOptions) {
            return this.coreValidate(objectOrSchemaName, objectOrValidationOptions, maybeValidatorOptions);
        };
        /**
         * Performs validation of the given object based on decorators or validation schema and reject on error.
         */
        Validator.prototype.validateOrReject = function (objectOrSchemaName, objectOrValidationOptions, maybeValidatorOptions) {
            return __awaiter(this, void 0, void 0, function () {
                var errors;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.coreValidate(objectOrSchemaName, objectOrValidationOptions, maybeValidatorOptions)];
                        case 1:
                            errors = _a.sent();
                            if (errors.length)
                                return [2 /*return*/, Promise.reject(errors)];
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Performs validation of the given object based on decorators or validation schema.
         */
        Validator.prototype.validateSync = function (objectOrSchemaName, objectOrValidationOptions, maybeValidatorOptions) {
            var object = typeof objectOrSchemaName === 'string' ? objectOrValidationOptions : objectOrSchemaName;
            var options = typeof objectOrSchemaName === 'string' ? maybeValidatorOptions : objectOrValidationOptions;
            var schema = typeof objectOrSchemaName === 'string' ? objectOrSchemaName : undefined;
            var executor = new ValidationExecutor(this, options);
            executor.ignoreAsyncValidations = true;
            var validationErrors = [];
            executor.execute(object, schema, validationErrors);
            return executor.stripEmptyErrors(validationErrors);
        };
        // -------------------------------------------------------------------------
        // Private Properties
        // -------------------------------------------------------------------------
        /**
         * Performs validation of the given object based on decorators or validation schema.
         * Common method for `validateOrReject` and `validate` methods.
         */
        Validator.prototype.coreValidate = function (objectOrSchemaName, objectOrValidationOptions, maybeValidatorOptions) {
            var object = typeof objectOrSchemaName === 'string' ? objectOrValidationOptions : objectOrSchemaName;
            var options = typeof objectOrSchemaName === 'string' ? maybeValidatorOptions : objectOrValidationOptions;
            var schema = typeof objectOrSchemaName === 'string' ? objectOrSchemaName : undefined;
            var executor = new ValidationExecutor(this, options);
            var validationErrors = [];
            executor.execute(object, schema, validationErrors);
            return Promise.all(executor.awaitingPromises).then(function () {
                return executor.stripEmptyErrors(validationErrors);
            });
        };
        return Validator;
    }());

    /**
     * Container to be used by this library for inversion control. If container was not implicitly set then by default
     * container simply creates a new instance of the given class.
     */
    var defaultContainer = new (/** @class */ (function () {
        function class_1() {
            this.instances = [];
        }
        class_1.prototype.get = function (someClass) {
            var instance = this.instances.find(function (instance) { return instance.type === someClass; });
            if (!instance) {
                instance = { type: someClass, object: new someClass() };
                this.instances.push(instance);
            }
            return instance.object;
        };
        return class_1;
    }()))();
    var userContainer;
    var userContainerOptions;
    /**
     * Sets container to be used by this library.
     */
    function useContainer(iocContainer, options) {
        userContainer = iocContainer;
        userContainerOptions = options;
    }
    /**
     * Gets the IOC container used by this library.
     */
    function getFromContainer(someClass) {
        if (userContainer) {
            try {
                var instance = userContainer.get(someClass);
                if (instance)
                    return instance;
                if (!userContainerOptions || !userContainerOptions.fallback)
                    return instance;
            }
            catch (error) {
                if (!userContainerOptions || !userContainerOptions.fallbackOnErrors)
                    throw error;
            }
        }
        return defaultContainer.get(someClass);
    }

    /**
     * If object has both allowed and not allowed properties a validation error will be thrown.
     */
    function Allow(validationOptions) {
        return function (object, propertyName) {
            var args = {
                type: ValidationTypes.WHITELIST,
                target: object.constructor,
                propertyName: propertyName,
                validationOptions: validationOptions,
            };
            getMetadataStorage().addValidationMetadata(new ValidationMetadata(args));
        };
    }

    /**
     * This metadata interface contains information for custom validators.
     */
    var ConstraintMetadata = /** @class */ (function () {
        // -------------------------------------------------------------------------
        // Constructor
        // -------------------------------------------------------------------------
        function ConstraintMetadata(target, name, async) {
            if (async === void 0) { async = false; }
            this.target = target;
            this.name = name;
            this.async = async;
        }
        Object.defineProperty(ConstraintMetadata.prototype, "instance", {
            // -------------------------------------------------------------------------
            // Accessors
            // -------------------------------------------------------------------------
            /**
             * Instance of the target custom validation class which performs validation.
             */
            get: function () {
                return getFromContainer(this.target);
            },
            enumerable: false,
            configurable: true
        });
        return ConstraintMetadata;
    }());

    /**
     * Registers a custom validation decorator.
     */
    function registerDecorator(options) {
        var constraintCls;
        if (options.validator instanceof Function) {
            constraintCls = options.validator;
            var constraintClasses = getFromContainer(MetadataStorage).getTargetValidatorConstraints(options.validator);
            if (constraintClasses.length > 1) {
                throw "More than one implementation of ValidatorConstraintInterface found for validator on: ".concat(options.target.name, ":").concat(options.propertyName);
            }
        }
        else {
            var validator_1 = options.validator;
            constraintCls = /** @class */ (function () {
                function CustomConstraint() {
                }
                CustomConstraint.prototype.validate = function (value, validationArguments) {
                    return validator_1.validate(value, validationArguments);
                };
                CustomConstraint.prototype.defaultMessage = function (validationArguments) {
                    if (validator_1.defaultMessage) {
                        return validator_1.defaultMessage(validationArguments);
                    }
                    return '';
                };
                return CustomConstraint;
            }());
            getMetadataStorage().addConstraintMetadata(new ConstraintMetadata(constraintCls, options.name, options.async));
        }
        var validationMetadataArgs = {
            type: options.name && ValidationTypes.isValid(options.name) ? options.name : ValidationTypes.CUSTOM_VALIDATION,
            name: options.name,
            target: options.target,
            propertyName: options.propertyName,
            validationOptions: options.options,
            constraintCls: constraintCls,
            constraints: options.constraints,
        };
        getMetadataStorage().addValidationMetadata(new ValidationMetadata(validationMetadataArgs));
    }

    function buildMessage(impl, validationOptions) {
        return function (validationArguments) {
            var eachPrefix = validationOptions && validationOptions.each ? 'each value in ' : '';
            return impl(eachPrefix, validationArguments);
        };
    }
    function ValidateBy(options, validationOptions) {
        return function (object, propertyName) {
            registerDecorator({
                name: options.name,
                target: object.constructor,
                propertyName: propertyName,
                options: validationOptions,
                constraints: options.constraints,
                validator: options.validator,
            });
        };
    }

    // isDefined is (yet) a special case
    var IS_DEFINED = ValidationTypes.IS_DEFINED;
    /**
     * Checks if value is defined (!== undefined, !== null).
     */
    function isDefined(value) {
        return value !== undefined && value !== null;
    }
    /**
     * Checks if value is defined (!== undefined, !== null).
     */
    function IsDefined(validationOptions) {
        return ValidateBy({
            name: IS_DEFINED,
            validator: {
                validate: function (value) { return isDefined(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property should not be null or undefined'; }, validationOptions),
            },
        }, validationOptions);
    }

    /**
     * Checks if value is missing and if so, ignores all validators.
     */
    function IsOptional(validationOptions) {
        return function (object, propertyName) {
            var args = {
                type: ValidationTypes.CONDITIONAL_VALIDATION,
                target: object.constructor,
                propertyName: propertyName,
                constraints: [
                    function (object, value) {
                        return object[propertyName] !== null && object[propertyName] !== undefined;
                    },
                ],
                validationOptions: validationOptions,
            };
            getMetadataStorage().addValidationMetadata(new ValidationMetadata(args));
        };
    }

    /**
     * Registers custom validator class.
     */
    function ValidatorConstraint(options) {
        return function (target) {
            var isAsync = options && options.async;
            var name = options && options.name ? options.name : '';
            if (!name) {
                name = target.name;
                if (!name)
                    // generate name if it was not given
                    name = name.replace(/\.?([A-Z]+)/g, function (x, y) { return '_' + y.toLowerCase(); }).replace(/^_/, '');
            }
            var metadata = new ConstraintMetadata(target, name, isAsync);
            getMetadataStorage().addConstraintMetadata(metadata);
        };
    }
    function Validate(constraintClass, constraintsOrValidationOptions, maybeValidationOptions) {
        return function (object, propertyName) {
            var args = {
                type: ValidationTypes.CUSTOM_VALIDATION,
                target: object.constructor,
                propertyName: propertyName,
                constraintCls: constraintClass,
                constraints: Array.isArray(constraintsOrValidationOptions) ? constraintsOrValidationOptions : undefined,
                validationOptions: !Array.isArray(constraintsOrValidationOptions)
                    ? constraintsOrValidationOptions
                    : maybeValidationOptions,
            };
            getMetadataStorage().addValidationMetadata(new ValidationMetadata(args));
        };
    }

    /**
     * Ignores the other validators on a property when the provided condition function returns false.
     */
    function ValidateIf(condition, validationOptions) {
        return function (object, propertyName) {
            var args = {
                type: ValidationTypes.CONDITIONAL_VALIDATION,
                target: object.constructor,
                propertyName: propertyName,
                constraints: [condition],
                validationOptions: validationOptions,
            };
            getMetadataStorage().addValidationMetadata(new ValidationMetadata(args));
        };
    }

    var __assign = (undefined && undefined.__assign) || function () {
        __assign = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };
    /**
     * Objects / object arrays marked with this decorator will also be validated.
     */
    function ValidateNested(validationOptions) {
        var opts = __assign({}, validationOptions);
        var eachPrefix = opts.each ? 'each value in ' : '';
        opts.message = opts.message || eachPrefix + 'nested property $property must be either object or array';
        return function (object, propertyName) {
            var args = {
                type: ValidationTypes.NESTED_VALIDATION,
                target: object.constructor,
                propertyName: propertyName,
                validationOptions: opts,
            };
            getMetadataStorage().addValidationMetadata(new ValidationMetadata(args));
        };
    }

    /**
     * Resolve promise before validation
     */
    function ValidatePromise(validationOptions) {
        return function (object, propertyName) {
            var args = {
                type: ValidationTypes.PROMISE_VALIDATION,
                target: object.constructor,
                propertyName: propertyName,
                validationOptions: validationOptions,
            };
            getMetadataStorage().addValidationMetadata(new ValidationMetadata(args));
        };
    }

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    var isLatLong$1 = {exports: {}};

    var assertString = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = assertString;

    	function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    	function assertString(input) {
    	  var isString = typeof input === 'string' || input instanceof String;

    	  if (!isString) {
    	    var invalidType = _typeof(input);

    	    if (input === null) invalidType = 'null';else if (invalidType === 'object') invalidType = input.constructor.name;
    	    throw new TypeError("Expected a string but received a ".concat(invalidType));
    	  }
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (assertString, assertString.exports));

    var merge = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = merge;

    	function merge() {
    	  var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    	  var defaults = arguments.length > 1 ? arguments[1] : undefined;

    	  for (var key in defaults) {
    	    if (typeof obj[key] === 'undefined') {
    	      obj[key] = defaults[key];
    	    }
    	  }

    	  return obj;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (merge, merge.exports));

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isLatLong;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _merge = _interopRequireDefault(merge.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var lat = /^\(?[+-]?(90(\.0+)?|[1-8]?\d(\.\d+)?)$/;
    	var long = /^\s?[+-]?(180(\.0+)?|1[0-7]\d(\.\d+)?|\d{1,2}(\.\d+)?)\)?$/;
    	var latDMS = /^(([1-8]?\d)\D+([1-5]?\d|60)\D+([1-5]?\d|60)(\.\d+)?|90\D+0\D+0)\D+[NSns]?$/i;
    	var longDMS = /^\s*([1-7]?\d{1,2}\D+([1-5]?\d|60)\D+([1-5]?\d|60)(\.\d+)?|180\D+0\D+0)\D+[EWew]?$/i;
    	var defaultLatLongOptions = {
    	  checkDMS: false
    	};

    	function isLatLong(str, options) {
    	  (0, _assertString.default)(str);
    	  options = (0, _merge.default)(options, defaultLatLongOptions);
    	  if (!str.includes(',')) return false;
    	  var pair = str.split(',');
    	  if (pair[0].startsWith('(') && !pair[1].endsWith(')') || pair[1].endsWith(')') && !pair[0].startsWith('(')) return false;

    	  if (options.checkDMS) {
    	    return latDMS.test(pair[0]) && longDMS.test(pair[1]);
    	  }

    	  return lat.test(pair[0]) && long.test(pair[1]);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isLatLong$1, isLatLong$1.exports));

    var isLatLongValidator = /*@__PURE__*/getDefaultExportFromCjs(isLatLong$1.exports);

    var IS_LATLONG = 'isLatLong';
    /**
     * Checks if a value is string in format a "latitude,longitude".
     */
    function isLatLong(value) {
        return typeof value === 'string' && isLatLongValidator(value);
    }
    /**
     * Checks if a value is string in format a "latitude,longitude".
     */
    function IsLatLong(validationOptions) {
        return ValidateBy({
            name: IS_LATLONG,
            validator: {
                validate: function (value, args) { return isLatLong(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a latitude,longitude string'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_LATITUDE = 'isLatitude';
    /**
     * Checks if a given value is a latitude.
     */
    function isLatitude(value) {
        return (typeof value === 'number' || typeof value === 'string') && isLatLong("".concat(value, ",0"));
    }
    /**
     * Checks if a given value is a latitude.
     */
    function IsLatitude(validationOptions) {
        return ValidateBy({
            name: IS_LATITUDE,
            validator: {
                validate: function (value, args) { return isLatitude(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a latitude string or number'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_LONGITUDE = 'isLongitude';
    /**
     * Checks if a given value is a longitude.
     */
    function isLongitude(value) {
        return (typeof value === 'number' || typeof value === 'string') && isLatLong("0,".concat(value));
    }
    /**
     * Checks if a given value is a longitude.
     */
    function IsLongitude(validationOptions) {
        return ValidateBy({
            name: IS_LONGITUDE,
            validator: {
                validate: function (value, args) { return isLongitude(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a longitude string or number'; }, validationOptions),
            },
        }, validationOptions);
    }

    var EQUALS = 'equals';
    /**
     * Checks if value matches ("===") the comparison.
     */
    function equals$1(value, comparison) {
        return value === comparison;
    }
    /**
     * Checks if value matches ("===") the comparison.
     */
    function Equals(comparison, validationOptions) {
        return ValidateBy({
            name: EQUALS,
            constraints: [comparison],
            validator: {
                validate: function (value, args) { return equals$1(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be equal to $constraint1'; }, validationOptions),
            },
        }, validationOptions);
    }

    var NOT_EQUALS = 'notEquals';
    /**
     * Checks if value does not match ("!==") the comparison.
     */
    function notEquals(value, comparison) {
        return value !== comparison;
    }
    /**
     * Checks if value does not match ("!==") the comparison.
     */
    function NotEquals(comparison, validationOptions) {
        return ValidateBy({
            name: NOT_EQUALS,
            constraints: [comparison],
            validator: {
                validate: function (value, args) { return notEquals(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property should not be equal to $constraint1'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_EMPTY = 'isEmpty';
    /**
     * Checks if given value is empty (=== '', === null, === undefined).
     */
    function isEmpty$1(value) {
        return value === '' || value === null || value === undefined;
    }
    /**
     * Checks if given value is empty (=== '', === null, === undefined).
     */
    function IsEmpty(validationOptions) {
        return ValidateBy({
            name: IS_EMPTY,
            validator: {
                validate: function (value, args) { return isEmpty$1(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be empty'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_NOT_EMPTY = 'isNotEmpty';
    /**
     * Checks if given value is not empty (!== '', !== null, !== undefined).
     */
    function isNotEmpty(value) {
        return value !== '' && value !== null && value !== undefined;
    }
    /**
     * Checks if given value is not empty (!== '', !== null, !== undefined).
     */
    function IsNotEmpty(validationOptions) {
        return ValidateBy({
            name: IS_NOT_EMPTY,
            validator: {
                validate: function (value, args) { return isNotEmpty(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property should not be empty'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_IN = 'isIn';
    /**
     * Checks if given value is in a array of allowed values.
     */
    function isIn$1(value, possibleValues) {
        return !Array.isArray(possibleValues) || possibleValues.some(function (possibleValue) { return possibleValue === value; });
    }
    /**
     * Checks if given value is in a array of allowed values.
     */
    function IsIn(values, validationOptions) {
        return ValidateBy({
            name: IS_IN,
            constraints: [values],
            validator: {
                validate: function (value, args) { return isIn$1(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be one of the following values: $constraint1'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_NOT_IN = 'isNotIn';
    /**
     * Checks if given value not in a array of allowed values.
     */
    function isNotIn(value, possibleValues) {
        return !Array.isArray(possibleValues) || !possibleValues.some(function (possibleValue) { return possibleValue === value; });
    }
    /**
     * Checks if given value not in a array of allowed values.
     */
    function IsNotIn(values, validationOptions) {
        return ValidateBy({
            name: IS_NOT_IN,
            constraints: [values],
            validator: {
                validate: function (value, args) { return isNotIn(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property should not be one of the following values: $constraint1'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isDivisibleBy$1 = {exports: {}};

    var toFloat = {exports: {}};

    var isFloat$1 = {};

    var alpha$1 = {};

    Object.defineProperty(alpha$1, "__esModule", {
      value: true
    });
    alpha$1.commaDecimal = alpha$1.dotDecimal = alpha$1.farsiLocales = alpha$1.arabicLocales = alpha$1.englishLocales = alpha$1.decimal = alpha$1.alphanumeric = alpha$1.alpha = void 0;
    var alpha = {
      'en-US': /^[A-Z]+$/i,
      'az-AZ': /^[A-VXYZÇƏĞİıÖŞÜ]+$/i,
      'bg-BG': /^[А-Я]+$/i,
      'cs-CZ': /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]+$/i,
      'da-DK': /^[A-ZÆØÅ]+$/i,
      'de-DE': /^[A-ZÄÖÜß]+$/i,
      'el-GR': /^[Α-ώ]+$/i,
      'es-ES': /^[A-ZÁÉÍÑÓÚÜ]+$/i,
      'fa-IR': /^[ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]+$/i,
      'fi-FI': /^[A-ZÅÄÖ]+$/i,
      'fr-FR': /^[A-ZÀÂÆÇÉÈÊËÏÎÔŒÙÛÜŸ]+$/i,
      'it-IT': /^[A-ZÀÉÈÌÎÓÒÙ]+$/i,
      'nb-NO': /^[A-ZÆØÅ]+$/i,
      'nl-NL': /^[A-ZÁÉËÏÓÖÜÚ]+$/i,
      'nn-NO': /^[A-ZÆØÅ]+$/i,
      'hu-HU': /^[A-ZÁÉÍÓÖŐÚÜŰ]+$/i,
      'pl-PL': /^[A-ZĄĆĘŚŁŃÓŻŹ]+$/i,
      'pt-PT': /^[A-ZÃÁÀÂÄÇÉÊËÍÏÕÓÔÖÚÜ]+$/i,
      'ru-RU': /^[А-ЯЁ]+$/i,
      'sl-SI': /^[A-ZČĆĐŠŽ]+$/i,
      'sk-SK': /^[A-ZÁČĎÉÍŇÓŠŤÚÝŽĹŔĽÄÔ]+$/i,
      'sr-RS@latin': /^[A-ZČĆŽŠĐ]+$/i,
      'sr-RS': /^[А-ЯЂЈЉЊЋЏ]+$/i,
      'sv-SE': /^[A-ZÅÄÖ]+$/i,
      'th-TH': /^[ก-๐\s]+$/i,
      'tr-TR': /^[A-ZÇĞİıÖŞÜ]+$/i,
      'uk-UA': /^[А-ЩЬЮЯЄIЇҐі]+$/i,
      'vi-VN': /^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴĐÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸ]+$/i,
      'ku-IQ': /^[ئابپتجچحخدرڕزژسشعغفڤقکگلڵمنوۆھەیێيطؤثآإأكضصةظذ]+$/i,
      ar: /^[ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيًٌٍَُِّْٰ]+$/,
      he: /^[א-ת]+$/,
      fa: /^['آاءأؤئبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهةی']+$/i,
      'hi-IN': /^[\u0900-\u0961]+[\u0972-\u097F]*$/i
    };
    alpha$1.alpha = alpha;
    var alphanumeric = {
      'en-US': /^[0-9A-Z]+$/i,
      'az-AZ': /^[0-9A-VXYZÇƏĞİıÖŞÜ]+$/i,
      'bg-BG': /^[0-9А-Я]+$/i,
      'cs-CZ': /^[0-9A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]+$/i,
      'da-DK': /^[0-9A-ZÆØÅ]+$/i,
      'de-DE': /^[0-9A-ZÄÖÜß]+$/i,
      'el-GR': /^[0-9Α-ω]+$/i,
      'es-ES': /^[0-9A-ZÁÉÍÑÓÚÜ]+$/i,
      'fi-FI': /^[0-9A-ZÅÄÖ]+$/i,
      'fr-FR': /^[0-9A-ZÀÂÆÇÉÈÊËÏÎÔŒÙÛÜŸ]+$/i,
      'it-IT': /^[0-9A-ZÀÉÈÌÎÓÒÙ]+$/i,
      'hu-HU': /^[0-9A-ZÁÉÍÓÖŐÚÜŰ]+$/i,
      'nb-NO': /^[0-9A-ZÆØÅ]+$/i,
      'nl-NL': /^[0-9A-ZÁÉËÏÓÖÜÚ]+$/i,
      'nn-NO': /^[0-9A-ZÆØÅ]+$/i,
      'pl-PL': /^[0-9A-ZĄĆĘŚŁŃÓŻŹ]+$/i,
      'pt-PT': /^[0-9A-ZÃÁÀÂÄÇÉÊËÍÏÕÓÔÖÚÜ]+$/i,
      'ru-RU': /^[0-9А-ЯЁ]+$/i,
      'sl-SI': /^[0-9A-ZČĆĐŠŽ]+$/i,
      'sk-SK': /^[0-9A-ZÁČĎÉÍŇÓŠŤÚÝŽĹŔĽÄÔ]+$/i,
      'sr-RS@latin': /^[0-9A-ZČĆŽŠĐ]+$/i,
      'sr-RS': /^[0-9А-ЯЂЈЉЊЋЏ]+$/i,
      'sv-SE': /^[0-9A-ZÅÄÖ]+$/i,
      'th-TH': /^[ก-๙\s]+$/i,
      'tr-TR': /^[0-9A-ZÇĞİıÖŞÜ]+$/i,
      'uk-UA': /^[0-9А-ЩЬЮЯЄIЇҐі]+$/i,
      'ku-IQ': /^[٠١٢٣٤٥٦٧٨٩0-9ئابپتجچحخدرڕزژسشعغفڤقکگلڵمنوۆھەیێيطؤثآإأكضصةظذ]+$/i,
      'vi-VN': /^[0-9A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴĐÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸ]+$/i,
      ar: /^[٠١٢٣٤٥٦٧٨٩0-9ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيًٌٍَُِّْٰ]+$/,
      he: /^[0-9א-ת]+$/,
      fa: /^['0-9آاءأؤئبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهةی۱۲۳۴۵۶۷۸۹۰']+$/i,
      'hi-IN': /^[\u0900-\u0963]+[\u0966-\u097F]*$/i
    };
    alpha$1.alphanumeric = alphanumeric;
    var decimal = {
      'en-US': '.',
      ar: '٫'
    };
    alpha$1.decimal = decimal;
    var englishLocales = ['AU', 'GB', 'HK', 'IN', 'NZ', 'ZA', 'ZM'];
    alpha$1.englishLocales = englishLocales;

    for (var locale, i = 0; i < englishLocales.length; i++) {
      locale = "en-".concat(englishLocales[i]);
      alpha[locale] = alpha['en-US'];
      alphanumeric[locale] = alphanumeric['en-US'];
      decimal[locale] = decimal['en-US'];
    } // Source: http://www.localeplanet.com/java/


    var arabicLocales = ['AE', 'BH', 'DZ', 'EG', 'IQ', 'JO', 'KW', 'LB', 'LY', 'MA', 'QM', 'QA', 'SA', 'SD', 'SY', 'TN', 'YE'];
    alpha$1.arabicLocales = arabicLocales;

    for (var _locale, _i = 0; _i < arabicLocales.length; _i++) {
      _locale = "ar-".concat(arabicLocales[_i]);
      alpha[_locale] = alpha.ar;
      alphanumeric[_locale] = alphanumeric.ar;
      decimal[_locale] = decimal.ar;
    }

    var farsiLocales = ['IR', 'AF'];
    alpha$1.farsiLocales = farsiLocales;

    for (var _locale2, _i2 = 0; _i2 < farsiLocales.length; _i2++) {
      _locale2 = "fa-".concat(farsiLocales[_i2]);
      alphanumeric[_locale2] = alphanumeric.fa;
      decimal[_locale2] = decimal.ar;
    } // Source: https://en.wikipedia.org/wiki/Decimal_mark


    var dotDecimal = ['ar-EG', 'ar-LB', 'ar-LY'];
    alpha$1.dotDecimal = dotDecimal;
    var commaDecimal = ['bg-BG', 'cs-CZ', 'da-DK', 'de-DE', 'el-GR', 'en-ZM', 'es-ES', 'fr-CA', 'fr-FR', 'id-ID', 'it-IT', 'ku-IQ', 'hi-IN', 'hu-HU', 'nb-NO', 'nn-NO', 'nl-NL', 'pl-PL', 'pt-PT', 'ru-RU', 'sl-SI', 'sr-RS@latin', 'sr-RS', 'sv-SE', 'tr-TR', 'uk-UA', 'vi-VN'];
    alpha$1.commaDecimal = commaDecimal;

    for (var _i3 = 0; _i3 < dotDecimal.length; _i3++) {
      decimal[dotDecimal[_i3]] = decimal['en-US'];
    }

    for (var _i4 = 0; _i4 < commaDecimal.length; _i4++) {
      decimal[commaDecimal[_i4]] = ',';
    }

    alpha['fr-CA'] = alpha['fr-FR'];
    alphanumeric['fr-CA'] = alphanumeric['fr-FR'];
    alpha['pt-BR'] = alpha['pt-PT'];
    alphanumeric['pt-BR'] = alphanumeric['pt-PT'];
    decimal['pt-BR'] = decimal['pt-PT']; // see #862

    alpha['pl-Pl'] = alpha['pl-PL'];
    alphanumeric['pl-Pl'] = alphanumeric['pl-PL'];
    decimal['pl-Pl'] = decimal['pl-PL']; // see #1455

    alpha['fa-AF'] = alpha.fa;

    Object.defineProperty(isFloat$1, "__esModule", {
      value: true
    });
    isFloat$1.default = isFloat;
    isFloat$1.locales = void 0;

    var _assertString$a = _interopRequireDefault$a(assertString.exports);

    var _alpha$2 = alpha$1;

    function _interopRequireDefault$a(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isFloat(str, options) {
      (0, _assertString$a.default)(str);
      options = options || {};
      var float = new RegExp("^(?:[-+])?(?:[0-9]+)?(?:\\".concat(options.locale ? _alpha$2.decimal[options.locale] : '.', "[0-9]*)?(?:[eE][\\+\\-]?(?:[0-9]+))?$"));

      if (str === '' || str === '.' || str === '-' || str === '+') {
        return false;
      }

      var value = parseFloat(str.replace(',', '.'));
      return float.test(str) && (!options.hasOwnProperty('min') || value >= options.min) && (!options.hasOwnProperty('max') || value <= options.max) && (!options.hasOwnProperty('lt') || value < options.lt) && (!options.hasOwnProperty('gt') || value > options.gt);
    }

    var locales$5 = Object.keys(_alpha$2.decimal);
    isFloat$1.locales = locales$5;

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = toFloat;

    	var _isFloat = _interopRequireDefault(isFloat$1);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function toFloat(str) {
    	  if (!(0, _isFloat.default)(str)) return NaN;
    	  return parseFloat(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (toFloat, toFloat.exports));

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isDivisibleBy;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _toFloat = _interopRequireDefault(toFloat.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function isDivisibleBy(str, num) {
    	  (0, _assertString.default)(str);
    	  return (0, _toFloat.default)(str) % parseInt(num, 10) === 0;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isDivisibleBy$1, isDivisibleBy$1.exports));

    var isDivisibleByValidator = /*@__PURE__*/getDefaultExportFromCjs(isDivisibleBy$1.exports);

    var IS_DIVISIBLE_BY = 'isDivisibleBy';
    /**
     * Checks if value is a number that's divisible by another.
     */
    function isDivisibleBy(value, num) {
        return typeof value === 'number' && typeof num === 'number' && isDivisibleByValidator(String(value), num);
    }
    /**
     * Checks if value is a number that's divisible by another.
     */
    function IsDivisibleBy(num, validationOptions) {
        return ValidateBy({
            name: IS_DIVISIBLE_BY,
            constraints: [num],
            validator: {
                validate: function (value, args) { return isDivisibleBy(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be divisible by $constraint1'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_POSITIVE = 'isPositive';
    /**
     * Checks if the value is a positive number greater than zero.
     */
    function isPositive(value) {
        return typeof value === 'number' && value > 0;
    }
    /**
     * Checks if the value is a positive number greater than zero.
     */
    function IsPositive(validationOptions) {
        return ValidateBy({
            name: IS_POSITIVE,
            validator: {
                validate: function (value, args) { return isPositive(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a positive number'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_NEGATIVE = 'isNegative';
    /**
     * Checks if the value is a negative number smaller than zero.
     */
    function isNegative(value) {
        return typeof value === 'number' && value < 0;
    }
    /**
     * Checks if the value is a negative number smaller than zero.
     */
    function IsNegative(validationOptions) {
        return ValidateBy({
            name: IS_NEGATIVE,
            validator: {
                validate: function (value, args) { return isNegative(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a negative number'; }, validationOptions),
            },
        }, validationOptions);
    }

    var MAX = 'max';
    /**
     * Checks if the first number is less than or equal to the second.
     */
    function max(num, max) {
        return typeof num === 'number' && typeof max === 'number' && num <= max;
    }
    /**
     * Checks if the value is less than or equal to the allowed maximum value.
     */
    function Max(maxValue, validationOptions) {
        return ValidateBy({
            name: MAX,
            constraints: [maxValue],
            validator: {
                validate: function (value, args) { return max(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must not be greater than $constraint1'; }, validationOptions),
            },
        }, validationOptions);
    }

    var MIN = 'min';
    /**
     * Checks if the first number is greater than or equal to the second.
     */
    function min(num, min) {
        return typeof num === 'number' && typeof min === 'number' && num >= min;
    }
    /**
     * Checks if the value is greater than or equal to the allowed minimum value.
     */
    function Min(minValue, validationOptions) {
        return ValidateBy({
            name: MIN,
            constraints: [minValue],
            validator: {
                validate: function (value, args) { return min(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must not be less than $constraint1'; }, validationOptions),
            },
        }, validationOptions);
    }

    var MIN_DATE = 'minDate';
    /**
     * Checks if the value is a date that's after the specified date.
     */
    function minDate(date, minDate) {
        return date instanceof Date && date.getTime() >= (minDate instanceof Date ? minDate : minDate()).getTime();
    }
    /**
     * Checks if the value is a date that's after the specified date.
     */
    function MinDate(date, validationOptions) {
        return ValidateBy({
            name: MIN_DATE,
            constraints: [date],
            validator: {
                validate: function (value, args) { return minDate(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return 'minimal allowed date for ' + eachPrefix + '$property is $constraint1'; }, validationOptions),
            },
        }, validationOptions);
    }

    var MAX_DATE = 'maxDate';
    /**
     * Checks if the value is a date that's before the specified date.
     */
    function maxDate(date, maxDate) {
        return date instanceof Date && date.getTime() <= (maxDate instanceof Date ? maxDate : maxDate()).getTime();
    }
    /**
     * Checks if the value is a date that's after the specified date.
     */
    function MaxDate(date, validationOptions) {
        return ValidateBy({
            name: MAX_DATE,
            constraints: [date],
            validator: {
                validate: function (value, args) { return maxDate(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return 'maximal allowed date for ' + eachPrefix + '$property is $constraint1'; }, validationOptions),
            },
        }, validationOptions);
    }

    var contains$1 = {exports: {}};

    var toString$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = toString;

    	function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    	function toString(input) {
    	  if (_typeof(input) === 'object' && input !== null) {
    	    if (typeof input.toString === 'function') {
    	      input = input.toString();
    	    } else {
    	      input = '[object Object]';
    	    }
    	  } else if (input === null || typeof input === 'undefined' || isNaN(input) && !input.length) {
    	    input = '';
    	  }

    	  return String(input);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (toString$1, toString$1.exports));

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = contains;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _toString = _interopRequireDefault(toString$1.exports);

    	var _merge = _interopRequireDefault(merge.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var defaulContainsOptions = {
    	  ignoreCase: false,
    	  minOccurrences: 1
    	};

    	function contains(str, elem, options) {
    	  (0, _assertString.default)(str);
    	  options = (0, _merge.default)(options, defaulContainsOptions);

    	  if (options.ignoreCase) {
    	    return str.toLowerCase().split((0, _toString.default)(elem).toLowerCase()).length > options.minOccurrences;
    	  }

    	  return str.split((0, _toString.default)(elem)).length > options.minOccurrences;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (contains$1, contains$1.exports));

    var containsValidator = /*@__PURE__*/getDefaultExportFromCjs(contains$1.exports);

    var CONTAINS = 'contains';
    /**
     * Checks if the string contains the seed.
     * If given value is not a string, then it returns false.
     */
    function contains(value, seed) {
        return typeof value === 'string' && containsValidator(value, seed);
    }
    /**
     * Checks if the string contains the seed.
     * If given value is not a string, then it returns false.
     */
    function Contains(seed, validationOptions) {
        return ValidateBy({
            name: CONTAINS,
            constraints: [seed],
            validator: {
                validate: function (value, args) { return contains(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain a $constraint1 string'; }, validationOptions),
            },
        }, validationOptions);
    }

    var NOT_CONTAINS = 'notContains';
    /**
     * Checks if the string does not contain the seed.
     * If given value is not a string, then it returns false.
     */
    function notContains(value, seed) {
        return typeof value === 'string' && !containsValidator(value, seed);
    }
    /**
     * Checks if the string does not contain the seed.
     * If given value is not a string, then it returns false.
     */
    function NotContains(seed, validationOptions) {
        return ValidateBy({
            name: NOT_CONTAINS,
            constraints: [seed],
            validator: {
                validate: function (value, args) { return notContains(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property should not contain a $constraint1 string'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isAlpha$2 = {};

    Object.defineProperty(isAlpha$2, "__esModule", {
      value: true
    });
    var _default$8 = isAlpha$2.default = isAlpha$1;
    isAlpha$2.locales = void 0;

    var _assertString$9 = _interopRequireDefault$9(assertString.exports);

    var _alpha$1 = alpha$1;

    function _interopRequireDefault$9(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isAlpha$1(_str) {
      var locale = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'en-US';
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      (0, _assertString$9.default)(_str);
      var str = _str;
      var ignore = options.ignore;

      if (ignore) {
        if (ignore instanceof RegExp) {
          str = str.replace(ignore, '');
        } else if (typeof ignore === 'string') {
          str = str.replace(new RegExp("[".concat(ignore.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&'), "]"), 'g'), ''); // escape regex for ignore
        } else {
          throw new Error('ignore should be instance of a String or RegExp');
        }
      }

      if (locale in _alpha$1.alpha) {
        return _alpha$1.alpha[locale].test(str);
      }

      throw new Error("Invalid locale '".concat(locale, "'"));
    }

    var locales$4 = Object.keys(_alpha$1.alpha);
    isAlpha$2.locales = locales$4;

    var IS_ALPHA = 'isAlpha';
    /**
     * Checks if the string contains only letters (a-zA-Z).
     * If given value is not a string, then it returns false.
     */
    function isAlpha(value, locale) {
        return typeof value === 'string' && _default$8(value, locale);
    }
    /**
     * Checks if the string contains only letters (a-zA-Z).
     * If given value is not a string, then it returns false.
     */
    function IsAlpha(locale, validationOptions) {
        return ValidateBy({
            name: IS_ALPHA,
            constraints: [locale],
            validator: {
                validate: function (value, args) { return isAlpha(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain only letters (a-zA-Z)'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isAlphanumeric$2 = {};

    Object.defineProperty(isAlphanumeric$2, "__esModule", {
      value: true
    });
    var _default$7 = isAlphanumeric$2.default = isAlphanumeric$1;
    isAlphanumeric$2.locales = void 0;

    var _assertString$8 = _interopRequireDefault$8(assertString.exports);

    var _alpha = alpha$1;

    function _interopRequireDefault$8(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isAlphanumeric$1(_str) {
      var locale = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'en-US';
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      (0, _assertString$8.default)(_str);
      var str = _str;
      var ignore = options.ignore;

      if (ignore) {
        if (ignore instanceof RegExp) {
          str = str.replace(ignore, '');
        } else if (typeof ignore === 'string') {
          str = str.replace(new RegExp("[".concat(ignore.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&'), "]"), 'g'), ''); // escape regex for ignore
        } else {
          throw new Error('ignore should be instance of a String or RegExp');
        }
      }

      if (locale in _alpha.alphanumeric) {
        return _alpha.alphanumeric[locale].test(str);
      }

      throw new Error("Invalid locale '".concat(locale, "'"));
    }

    var locales$3 = Object.keys(_alpha.alphanumeric);
    isAlphanumeric$2.locales = locales$3;

    var IS_ALPHANUMERIC = 'isAlphanumeric';
    /**
     * Checks if the string contains only letters and numbers.
     * If given value is not a string, then it returns false.
     */
    function isAlphanumeric(value, locale) {
        return typeof value === 'string' && _default$7(value, locale);
    }
    /**
     * Checks if the string contains only letters and numbers.
     * If given value is not a string, then it returns false.
     */
    function IsAlphanumeric(locale, validationOptions) {
        return ValidateBy({
            name: IS_ALPHANUMERIC,
            constraints: [locale],
            validator: {
                validate: function (value, args) { return isAlphanumeric(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain only letters and numbers'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isDecimal$1 = {exports: {}};

    var includes = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = void 0;

    	var includes = function includes(arr, val) {
    	  return arr.some(function (arrVal) {
    	    return val === arrVal;
    	  });
    	};

    	var _default = includes;
    	exports.default = _default;
    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (includes, includes.exports));

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isDecimal;

    	var _merge = _interopRequireDefault(merge.exports);

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _includes = _interopRequireDefault(includes.exports);

    	var _alpha = alpha$1;

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function decimalRegExp(options) {
    	  var regExp = new RegExp("^[-+]?([0-9]+)?(\\".concat(_alpha.decimal[options.locale], "[0-9]{").concat(options.decimal_digits, "})").concat(options.force_decimal ? '' : '?', "$"));
    	  return regExp;
    	}

    	var default_decimal_options = {
    	  force_decimal: false,
    	  decimal_digits: '1,',
    	  locale: 'en-US'
    	};
    	var blacklist = ['', '-', '+'];

    	function isDecimal(str, options) {
    	  (0, _assertString.default)(str);
    	  options = (0, _merge.default)(options, default_decimal_options);

    	  if (options.locale in _alpha.decimal) {
    	    return !(0, _includes.default)(blacklist, str.replace(/ /g, '')) && decimalRegExp(options).test(str);
    	  }

    	  throw new Error("Invalid locale '".concat(options.locale, "'"));
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isDecimal$1, isDecimal$1.exports));

    var isDecimalValidator = /*@__PURE__*/getDefaultExportFromCjs(isDecimal$1.exports);

    var IS_DECIMAL = 'isDecimal';
    /**
     * Checks if the string is a valid decimal.
     * If given value is not a string, then it returns false.
     */
    function isDecimal(value, options) {
        return typeof value === 'string' && isDecimalValidator(value, options);
    }
    /**
     * Checks if the string is a valid decimal.
     * If given value is not a string, then it returns false.
     */
    function IsDecimal(options, validationOptions) {
        return ValidateBy({
            name: IS_DECIMAL,
            constraints: [options],
            validator: {
                validate: function (value, args) { return isDecimal(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property is not a valid decimal number.'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isAscii$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isAscii;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	/* eslint-disable no-control-regex */
    	var ascii = /^[\x00-\x7F]+$/;
    	/* eslint-enable no-control-regex */

    	function isAscii(str) {
    	  (0, _assertString.default)(str);
    	  return ascii.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isAscii$1, isAscii$1.exports));

    var isAsciiValidator = /*@__PURE__*/getDefaultExportFromCjs(isAscii$1.exports);

    var IS_ASCII = 'isAscii';
    /**
     * Checks if the string contains ASCII chars only.
     * If given value is not a string, then it returns false.
     */
    function isAscii(value) {
        return typeof value === 'string' && isAsciiValidator(value);
    }
    /**
     * Checks if the string contains ASCII chars only.
     * If given value is not a string, then it returns false.
     */
    function IsAscii(validationOptions) {
        return ValidateBy({
            name: IS_ASCII,
            validator: {
                validate: function (value, args) { return isAscii(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain only ASCII characters'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isBase64$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isBase64;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _merge = _interopRequireDefault(merge.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var notBase64 = /[^A-Z0-9+\/=]/i;
    	var urlSafeBase64 = /^[A-Z0-9_\-]*$/i;
    	var defaultBase64Options = {
    	  urlSafe: false
    	};

    	function isBase64(str, options) {
    	  (0, _assertString.default)(str);
    	  options = (0, _merge.default)(options, defaultBase64Options);
    	  var len = str.length;

    	  if (options.urlSafe) {
    	    return urlSafeBase64.test(str);
    	  }

    	  if (len % 4 !== 0 || notBase64.test(str)) {
    	    return false;
    	  }

    	  var firstPaddingChar = str.indexOf('=');
    	  return firstPaddingChar === -1 || firstPaddingChar === len - 1 || firstPaddingChar === len - 2 && str[len - 1] === '=';
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isBase64$1, isBase64$1.exports));

    var isBase64Validator = /*@__PURE__*/getDefaultExportFromCjs(isBase64$1.exports);

    var IS_BASE64 = 'isBase64';
    /**
     * Checks if a string is base64 encoded.
     * If given value is not a string, then it returns false.
     */
    function isBase64(value) {
        return typeof value === 'string' && isBase64Validator(value);
    }
    /**
     * Checks if a string is base64 encoded.
     * If given value is not a string, then it returns false.
     */
    function IsBase64(validationOptions) {
        return ValidateBy({
            name: IS_BASE64,
            validator: {
                validate: function (value, args) { return isBase64(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be base64 encoded'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isByteLength$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isByteLength;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    	/* eslint-disable prefer-rest-params */
    	function isByteLength(str, options) {
    	  (0, _assertString.default)(str);
    	  var min;
    	  var max;

    	  if (_typeof(options) === 'object') {
    	    min = options.min || 0;
    	    max = options.max;
    	  } else {
    	    // backwards compatibility: isByteLength(str, min [, max])
    	    min = arguments[1];
    	    max = arguments[2];
    	  }

    	  var len = encodeURI(str).split(/%..|./).length - 1;
    	  return len >= min && (typeof max === 'undefined' || len <= max);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isByteLength$1, isByteLength$1.exports));

    var isByteLengthValidator = /*@__PURE__*/getDefaultExportFromCjs(isByteLength$1.exports);

    var IS_BYTE_LENGTH = 'isByteLength';
    /**
     * Checks if the string's length (in bytes) falls in a range.
     * If given value is not a string, then it returns false.
     */
    function isByteLength(value, min, max) {
        return typeof value === 'string' && isByteLengthValidator(value, { min: min, max: max });
    }
    /**
     * Checks if the string's length (in bytes) falls in a range.
     * If given value is not a string, then it returns false.
     */
    function IsByteLength(min, max, validationOptions) {
        return ValidateBy({
            name: IS_BYTE_LENGTH,
            constraints: [min, max],
            validator: {
                validate: function (value, args) { return isByteLength(value, args === null || args === void 0 ? void 0 : args.constraints[0], args === null || args === void 0 ? void 0 : args.constraints[1]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + "$property's byte length must fall into ($constraint1, $constraint2) range"; }, validationOptions),
            },
        }, validationOptions);
    }

    var isCreditCard$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isCreditCard;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	/* eslint-disable max-len */
    	var creditCard = /^(?:4[0-9]{12}(?:[0-9]{3,6})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12,15}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11}|6[27][0-9]{14}|^(81[0-9]{14,17}))$/;
    	/* eslint-enable max-len */

    	function isCreditCard(str) {
    	  (0, _assertString.default)(str);
    	  var sanitized = str.replace(/[- ]+/g, '');

    	  if (!creditCard.test(sanitized)) {
    	    return false;
    	  }

    	  var sum = 0;
    	  var digit;
    	  var tmpNum;
    	  var shouldDouble;

    	  for (var i = sanitized.length - 1; i >= 0; i--) {
    	    digit = sanitized.substring(i, i + 1);
    	    tmpNum = parseInt(digit, 10);

    	    if (shouldDouble) {
    	      tmpNum *= 2;

    	      if (tmpNum >= 10) {
    	        sum += tmpNum % 10 + 1;
    	      } else {
    	        sum += tmpNum;
    	      }
    	    } else {
    	      sum += tmpNum;
    	    }

    	    shouldDouble = !shouldDouble;
    	  }

    	  return !!(sum % 10 === 0 ? sanitized : false);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isCreditCard$1, isCreditCard$1.exports));

    var isCreditCardValidator = /*@__PURE__*/getDefaultExportFromCjs(isCreditCard$1.exports);

    var IS_CREDIT_CARD = 'isCreditCard';
    /**
     * Checks if the string is a credit card.
     * If given value is not a string, then it returns false.
     */
    function isCreditCard(value) {
        return typeof value === 'string' && isCreditCardValidator(value);
    }
    /**
     * Checks if the string is a credit card.
     * If given value is not a string, then it returns false.
     */
    function IsCreditCard(validationOptions) {
        return ValidateBy({
            name: IS_CREDIT_CARD,
            validator: {
                validate: function (value, args) { return isCreditCard(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a credit card'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isCurrency$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isCurrency;

    	var _merge = _interopRequireDefault(merge.exports);

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function currencyRegex(options) {
    	  var decimal_digits = "\\d{".concat(options.digits_after_decimal[0], "}");
    	  options.digits_after_decimal.forEach(function (digit, index) {
    	    if (index !== 0) decimal_digits = "".concat(decimal_digits, "|\\d{").concat(digit, "}");
    	  });
    	  var symbol = "(".concat(options.symbol.replace(/\W/, function (m) {
    	    return "\\".concat(m);
    	  }), ")").concat(options.require_symbol ? '' : '?'),
    	      negative = '-?',
    	      whole_dollar_amount_without_sep = '[1-9]\\d*',
    	      whole_dollar_amount_with_sep = "[1-9]\\d{0,2}(\\".concat(options.thousands_separator, "\\d{3})*"),
    	      valid_whole_dollar_amounts = ['0', whole_dollar_amount_without_sep, whole_dollar_amount_with_sep],
    	      whole_dollar_amount = "(".concat(valid_whole_dollar_amounts.join('|'), ")?"),
    	      decimal_amount = "(\\".concat(options.decimal_separator, "(").concat(decimal_digits, "))").concat(options.require_decimal ? '' : '?');
    	  var pattern = whole_dollar_amount + (options.allow_decimal || options.require_decimal ? decimal_amount : ''); // default is negative sign before symbol, but there are two other options (besides parens)

    	  if (options.allow_negatives && !options.parens_for_negatives) {
    	    if (options.negative_sign_after_digits) {
    	      pattern += negative;
    	    } else if (options.negative_sign_before_digits) {
    	      pattern = negative + pattern;
    	    }
    	  } // South African Rand, for example, uses R 123 (space) and R-123 (no space)


    	  if (options.allow_negative_sign_placeholder) {
    	    pattern = "( (?!\\-))?".concat(pattern);
    	  } else if (options.allow_space_after_symbol) {
    	    pattern = " ?".concat(pattern);
    	  } else if (options.allow_space_after_digits) {
    	    pattern += '( (?!$))?';
    	  }

    	  if (options.symbol_after_digits) {
    	    pattern += symbol;
    	  } else {
    	    pattern = symbol + pattern;
    	  }

    	  if (options.allow_negatives) {
    	    if (options.parens_for_negatives) {
    	      pattern = "(\\(".concat(pattern, "\\)|").concat(pattern, ")");
    	    } else if (!(options.negative_sign_before_digits || options.negative_sign_after_digits)) {
    	      pattern = negative + pattern;
    	    }
    	  } // ensure there's a dollar and/or decimal amount, and that
    	  // it doesn't start with a space or a negative sign followed by a space


    	  return new RegExp("^(?!-? )(?=.*\\d)".concat(pattern, "$"));
    	}

    	var default_currency_options = {
    	  symbol: '$',
    	  require_symbol: false,
    	  allow_space_after_symbol: false,
    	  symbol_after_digits: false,
    	  allow_negatives: true,
    	  parens_for_negatives: false,
    	  negative_sign_before_digits: false,
    	  negative_sign_after_digits: false,
    	  allow_negative_sign_placeholder: false,
    	  thousands_separator: ',',
    	  decimal_separator: '.',
    	  allow_decimal: true,
    	  require_decimal: false,
    	  digits_after_decimal: [2],
    	  allow_space_after_digits: false
    	};

    	function isCurrency(str, options) {
    	  (0, _assertString.default)(str);
    	  options = (0, _merge.default)(options, default_currency_options);
    	  return currencyRegex(options).test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isCurrency$1, isCurrency$1.exports));

    var isCurrencyValidator = /*@__PURE__*/getDefaultExportFromCjs(isCurrency$1.exports);

    var IS_CURRENCY = 'isCurrency';
    /**
     * Checks if the string is a valid currency amount.
     * If given value is not a string, then it returns false.
     */
    function isCurrency(value, options) {
        return typeof value === 'string' && isCurrencyValidator(value, options);
    }
    /**
     * Checks if the string is a valid currency amount.
     * If given value is not a string, then it returns false.
     */
    function IsCurrency(options, validationOptions) {
        return ValidateBy({
            name: IS_CURRENCY,
            constraints: [options],
            validator: {
                validate: function (value, args) { return isCurrency(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a currency'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isEmail$1 = {exports: {}};

    var isFQDN$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isFQDN;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _merge = _interopRequireDefault(merge.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var default_fqdn_options = {
    	  require_tld: true,
    	  allow_underscores: false,
    	  allow_trailing_dot: false,
    	  allow_numeric_tld: false,
    	  allow_wildcard: false
    	};

    	function isFQDN(str, options) {
    	  (0, _assertString.default)(str);
    	  options = (0, _merge.default)(options, default_fqdn_options);
    	  /* Remove the optional trailing dot before checking validity */

    	  if (options.allow_trailing_dot && str[str.length - 1] === '.') {
    	    str = str.substring(0, str.length - 1);
    	  }
    	  /* Remove the optional wildcard before checking validity */


    	  if (options.allow_wildcard === true && str.indexOf('*.') === 0) {
    	    str = str.substring(2);
    	  }

    	  var parts = str.split('.');
    	  var tld = parts[parts.length - 1];

    	  if (options.require_tld) {
    	    // disallow fqdns without tld
    	    if (parts.length < 2) {
    	      return false;
    	    }

    	    if (!/^([a-z\u00A1-\u00A8\u00AA-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]{2,}|xn[a-z0-9-]{2,})$/i.test(tld)) {
    	      return false;
    	    } // disallow spaces


    	    if (/\s/.test(tld)) {
    	      return false;
    	    }
    	  } // reject numeric TLDs


    	  if (!options.allow_numeric_tld && /^\d+$/.test(tld)) {
    	    return false;
    	  }

    	  return parts.every(function (part) {
    	    if (part.length > 63) {
    	      return false;
    	    }

    	    if (!/^[a-z_\u00a1-\uffff0-9-]+$/i.test(part)) {
    	      return false;
    	    } // disallow full-width chars


    	    if (/[\uff01-\uff5e]/.test(part)) {
    	      return false;
    	    } // disallow parts starting or ending with hyphen


    	    if (/^-|-$/.test(part)) {
    	      return false;
    	    }

    	    if (!options.allow_underscores && /_/.test(part)) {
    	      return false;
    	    }

    	    return true;
    	  });
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isFQDN$1, isFQDN$1.exports));

    var isFqdnValidator = /*@__PURE__*/getDefaultExportFromCjs(isFQDN$1.exports);

    var isIP$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isIP;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	/**
    	11.3.  Examples

    	   The following addresses

    	             fe80::1234 (on the 1st link of the node)
    	             ff02::5678 (on the 5th link of the node)
    	             ff08::9abc (on the 10th organization of the node)

    	   would be represented as follows:

    	             fe80::1234%1
    	             ff02::5678%5
    	             ff08::9abc%10

    	   (Here we assume a natural translation from a zone index to the
    	   <zone_id> part, where the Nth zone of any scope is translated into
    	   "N".)

    	   If we use interface names as <zone_id>, those addresses could also be
    	   represented as follows:

    	            fe80::1234%ne0
    	            ff02::5678%pvc1.3
    	            ff08::9abc%interface10

    	   where the interface "ne0" belongs to the 1st link, "pvc1.3" belongs
    	   to the 5th link, and "interface10" belongs to the 10th organization.
    	 * * */
    	var IPv4SegmentFormat = '(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])';
    	var IPv4AddressFormat = "(".concat(IPv4SegmentFormat, "[.]){3}").concat(IPv4SegmentFormat);
    	var IPv4AddressRegExp = new RegExp("^".concat(IPv4AddressFormat, "$"));
    	var IPv6SegmentFormat = '(?:[0-9a-fA-F]{1,4})';
    	var IPv6AddressRegExp = new RegExp('^(' + "(?:".concat(IPv6SegmentFormat, ":){7}(?:").concat(IPv6SegmentFormat, "|:)|") + "(?:".concat(IPv6SegmentFormat, ":){6}(?:").concat(IPv4AddressFormat, "|:").concat(IPv6SegmentFormat, "|:)|") + "(?:".concat(IPv6SegmentFormat, ":){5}(?::").concat(IPv4AddressFormat, "|(:").concat(IPv6SegmentFormat, "){1,2}|:)|") + "(?:".concat(IPv6SegmentFormat, ":){4}(?:(:").concat(IPv6SegmentFormat, "){0,1}:").concat(IPv4AddressFormat, "|(:").concat(IPv6SegmentFormat, "){1,3}|:)|") + "(?:".concat(IPv6SegmentFormat, ":){3}(?:(:").concat(IPv6SegmentFormat, "){0,2}:").concat(IPv4AddressFormat, "|(:").concat(IPv6SegmentFormat, "){1,4}|:)|") + "(?:".concat(IPv6SegmentFormat, ":){2}(?:(:").concat(IPv6SegmentFormat, "){0,3}:").concat(IPv4AddressFormat, "|(:").concat(IPv6SegmentFormat, "){1,5}|:)|") + "(?:".concat(IPv6SegmentFormat, ":){1}(?:(:").concat(IPv6SegmentFormat, "){0,4}:").concat(IPv4AddressFormat, "|(:").concat(IPv6SegmentFormat, "){1,6}|:)|") + "(?::((?::".concat(IPv6SegmentFormat, "){0,5}:").concat(IPv4AddressFormat, "|(?::").concat(IPv6SegmentFormat, "){1,7}|:))") + ')(%[0-9a-zA-Z-.:]{1,})?$');

    	function isIP(str) {
    	  var version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    	  (0, _assertString.default)(str);
    	  version = String(version);

    	  if (!version) {
    	    return isIP(str, 4) || isIP(str, 6);
    	  }

    	  if (version === '4') {
    	    if (!IPv4AddressRegExp.test(str)) {
    	      return false;
    	    }

    	    var parts = str.split('.').sort(function (a, b) {
    	      return a - b;
    	    });
    	    return parts[3] <= 255;
    	  }

    	  if (version === '6') {
    	    return !!IPv6AddressRegExp.test(str);
    	  }

    	  return false;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isIP$1, isIP$1.exports));

    var isIPValidator = /*@__PURE__*/getDefaultExportFromCjs(isIP$1.exports);

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isEmail;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _merge = _interopRequireDefault(merge.exports);

    	var _isByteLength = _interopRequireDefault(isByteLength$1.exports);

    	var _isFQDN = _interopRequireDefault(isFQDN$1.exports);

    	var _isIP = _interopRequireDefault(isIP$1.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var default_email_options = {
    	  allow_display_name: false,
    	  require_display_name: false,
    	  allow_utf8_local_part: true,
    	  require_tld: true,
    	  blacklisted_chars: '',
    	  ignore_max_length: false,
    	  host_blacklist: []
    	};
    	/* eslint-disable max-len */

    	/* eslint-disable no-control-regex */

    	var splitNameAddress = /^([^\x00-\x1F\x7F-\x9F\cX]+)</i;
    	var emailUserPart = /^[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~]+$/i;
    	var gmailUserPart = /^[a-z\d]+$/;
    	var quotedEmailUser = /^([\s\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e]|(\\[\x01-\x09\x0b\x0c\x0d-\x7f]))*$/i;
    	var emailUserUtf8Part = /^[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+$/i;
    	var quotedEmailUserUtf8 = /^([\s\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|(\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*$/i;
    	var defaultMaxEmailLength = 254;
    	/* eslint-enable max-len */

    	/* eslint-enable no-control-regex */

    	/**
    	 * Validate display name according to the RFC2822: https://tools.ietf.org/html/rfc2822#appendix-A.1.2
    	 * @param {String} display_name
    	 */

    	function validateDisplayName(display_name) {
    	  var display_name_without_quotes = display_name.replace(/^"(.+)"$/, '$1'); // display name with only spaces is not valid

    	  if (!display_name_without_quotes.trim()) {
    	    return false;
    	  } // check whether display name contains illegal character


    	  var contains_illegal = /[\.";<>]/.test(display_name_without_quotes);

    	  if (contains_illegal) {
    	    // if contains illegal characters,
    	    // must to be enclosed in double-quotes, otherwise it's not a valid display name
    	    if (display_name_without_quotes === display_name) {
    	      return false;
    	    } // the quotes in display name must start with character symbol \


    	    var all_start_with_back_slash = display_name_without_quotes.split('"').length === display_name_without_quotes.split('\\"').length;

    	    if (!all_start_with_back_slash) {
    	      return false;
    	    }
    	  }

    	  return true;
    	}

    	function isEmail(str, options) {
    	  (0, _assertString.default)(str);
    	  options = (0, _merge.default)(options, default_email_options);

    	  if (options.require_display_name || options.allow_display_name) {
    	    var display_email = str.match(splitNameAddress);

    	    if (display_email) {
    	      var display_name = display_email[1]; // Remove display name and angle brackets to get email address
    	      // Can be done in the regex but will introduce a ReDOS (See  #1597 for more info)

    	      str = str.replace(display_name, '').replace(/(^<|>$)/g, ''); // sometimes need to trim the last space to get the display name
    	      // because there may be a space between display name and email address
    	      // eg. myname <address@gmail.com>
    	      // the display name is `myname` instead of `myname `, so need to trim the last space

    	      if (display_name.endsWith(' ')) {
    	        display_name = display_name.substr(0, display_name.length - 1);
    	      }

    	      if (!validateDisplayName(display_name)) {
    	        return false;
    	      }
    	    } else if (options.require_display_name) {
    	      return false;
    	    }
    	  }

    	  if (!options.ignore_max_length && str.length > defaultMaxEmailLength) {
    	    return false;
    	  }

    	  var parts = str.split('@');
    	  var domain = parts.pop();
    	  var lower_domain = domain.toLowerCase();

    	  if (options.host_blacklist.includes(lower_domain)) {
    	    return false;
    	  }

    	  var user = parts.join('@');

    	  if (options.domain_specific_validation && (lower_domain === 'gmail.com' || lower_domain === 'googlemail.com')) {
    	    /*
    	      Previously we removed dots for gmail addresses before validating.
    	      This was removed because it allows `multiple..dots@gmail.com`
    	      to be reported as valid, but it is not.
    	      Gmail only normalizes single dots, removing them from here is pointless,
    	      should be done in normalizeEmail
    	    */
    	    user = user.toLowerCase(); // Removing sub-address from username before gmail validation

    	    var username = user.split('+')[0]; // Dots are not included in gmail length restriction

    	    if (!(0, _isByteLength.default)(username.replace(/\./g, ''), {
    	      min: 6,
    	      max: 30
    	    })) {
    	      return false;
    	    }

    	    var _user_parts = username.split('.');

    	    for (var i = 0; i < _user_parts.length; i++) {
    	      if (!gmailUserPart.test(_user_parts[i])) {
    	        return false;
    	      }
    	    }
    	  }

    	  if (options.ignore_max_length === false && (!(0, _isByteLength.default)(user, {
    	    max: 64
    	  }) || !(0, _isByteLength.default)(domain, {
    	    max: 254
    	  }))) {
    	    return false;
    	  }

    	  if (!(0, _isFQDN.default)(domain, {
    	    require_tld: options.require_tld
    	  })) {
    	    if (!options.allow_ip_domain) {
    	      return false;
    	    }

    	    if (!(0, _isIP.default)(domain)) {
    	      if (!domain.startsWith('[') || !domain.endsWith(']')) {
    	        return false;
    	      }

    	      var noBracketdomain = domain.substr(1, domain.length - 2);

    	      if (noBracketdomain.length === 0 || !(0, _isIP.default)(noBracketdomain)) {
    	        return false;
    	      }
    	    }
    	  }

    	  if (user[0] === '"') {
    	    user = user.slice(1, user.length - 1);
    	    return options.allow_utf8_local_part ? quotedEmailUserUtf8.test(user) : quotedEmailUser.test(user);
    	  }

    	  var pattern = options.allow_utf8_local_part ? emailUserUtf8Part : emailUserPart;
    	  var user_parts = user.split('.');

    	  for (var _i = 0; _i < user_parts.length; _i++) {
    	    if (!pattern.test(user_parts[_i])) {
    	      return false;
    	    }
    	  }

    	  if (options.blacklisted_chars) {
    	    if (user.search(new RegExp("[".concat(options.blacklisted_chars, "]+"), 'g')) !== -1) return false;
    	  }

    	  return true;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isEmail$1, isEmail$1.exports));

    var isEmailValidator = /*@__PURE__*/getDefaultExportFromCjs(isEmail$1.exports);

    var IS_EMAIL = 'isEmail';
    /**
     * Checks if the string is an email.
     * If given value is not a string, then it returns false.
     */
    function isEmail(value, options) {
        return typeof value === 'string' && isEmailValidator(value, options);
    }
    /**
     * Checks if the string is an email.
     * If given value is not a string, then it returns false.
     */
    function IsEmail(options, validationOptions) {
        return ValidateBy({
            name: IS_EMAIL,
            constraints: [options],
            validator: {
                validate: function (value, args) { return isEmail(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an email'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_FQDN = 'isFqdn';
    /**
     * Checks if the string is a fully qualified domain name (e.g. domain.com).
     * If given value is not a string, then it returns false.
     */
    function isFQDN(value, options) {
        return typeof value === 'string' && isFqdnValidator(value, options);
    }
    /**
     * Checks if the string is a fully qualified domain name (e.g. domain.com).
     * If given value is not a string, then it returns false.
     */
    function IsFQDN(options, validationOptions) {
        return ValidateBy({
            name: IS_FQDN,
            constraints: [options],
            validator: {
                validate: function (value, args) { return isFQDN(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid domain name'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isFullWidth$2 = {};

    Object.defineProperty(isFullWidth$2, "__esModule", {
      value: true
    });
    var _default$6 = isFullWidth$2.default = isFullWidth$1;
    isFullWidth$2.fullWidth = void 0;

    var _assertString$7 = _interopRequireDefault$7(assertString.exports);

    function _interopRequireDefault$7(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var fullWidth = /[^\u0020-\u007E\uFF61-\uFF9F\uFFA0-\uFFDC\uFFE8-\uFFEE0-9a-zA-Z]/;
    isFullWidth$2.fullWidth = fullWidth;

    function isFullWidth$1(str) {
      (0, _assertString$7.default)(str);
      return fullWidth.test(str);
    }

    var IS_FULL_WIDTH = 'isFullWidth';
    /**
     * Checks if the string contains any full-width chars.
     * If given value is not a string, then it returns false.
     */
    function isFullWidth(value) {
        return typeof value === 'string' && _default$6(value);
    }
    /**
     * Checks if the string contains any full-width chars.
     * If given value is not a string, then it returns false.
     */
    function IsFullWidth(validationOptions) {
        return ValidateBy({
            name: IS_FULL_WIDTH,
            validator: {
                validate: function (value, args) { return isFullWidth(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain a full-width characters'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isHalfWidth$2 = {};

    Object.defineProperty(isHalfWidth$2, "__esModule", {
      value: true
    });
    var _default$5 = isHalfWidth$2.default = isHalfWidth$1;
    isHalfWidth$2.halfWidth = void 0;

    var _assertString$6 = _interopRequireDefault$6(assertString.exports);

    function _interopRequireDefault$6(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var halfWidth = /[\u0020-\u007E\uFF61-\uFF9F\uFFA0-\uFFDC\uFFE8-\uFFEE0-9a-zA-Z]/;
    isHalfWidth$2.halfWidth = halfWidth;

    function isHalfWidth$1(str) {
      (0, _assertString$6.default)(str);
      return halfWidth.test(str);
    }

    var IS_HALF_WIDTH = 'isHalfWidth';
    /**
     * Checks if the string contains any half-width chars.
     * If given value is not a string, then it returns false.
     */
    function isHalfWidth(value) {
        return typeof value === 'string' && _default$5(value);
    }
    /**
     * Checks if the string contains any half-width chars.
     * If given value is not a string, then it returns false.
     */
    function IsHalfWidth(validationOptions) {
        return ValidateBy({
            name: IS_HALF_WIDTH,
            validator: {
                validate: function (value, args) { return isHalfWidth(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain a half-width characters'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isVariableWidth$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isVariableWidth;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _isFullWidth = isFullWidth$2;

    	var _isHalfWidth = isHalfWidth$2;

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function isVariableWidth(str) {
    	  (0, _assertString.default)(str);
    	  return _isFullWidth.fullWidth.test(str) && _isHalfWidth.halfWidth.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isVariableWidth$1, isVariableWidth$1.exports));

    var isVariableWidthValidator = /*@__PURE__*/getDefaultExportFromCjs(isVariableWidth$1.exports);

    var IS_VARIABLE_WIDTH = 'isVariableWidth';
    /**
     * Checks if the string contains variable-width chars.
     * If given value is not a string, then it returns false.
     */
    function isVariableWidth(value) {
        return typeof value === 'string' && isVariableWidthValidator(value);
    }
    /**
     * Checks if the string contains variable-width chars.
     * If given value is not a string, then it returns false.
     */
    function IsVariableWidth(validationOptions) {
        return ValidateBy({
            name: IS_VARIABLE_WIDTH,
            validator: {
                validate: function (value, args) { return isVariableWidth(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain a full-width and half-width characters'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isHexColor$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isHexColor;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var hexcolor = /^#?([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/i;

    	function isHexColor(str) {
    	  (0, _assertString.default)(str);
    	  return hexcolor.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isHexColor$1, isHexColor$1.exports));

    var isHexColorValidator = /*@__PURE__*/getDefaultExportFromCjs(isHexColor$1.exports);

    var IS_HEX_COLOR = 'isHexColor';
    /**
     * Checks if the string is a hexadecimal color.
     * If given value is not a string, then it returns false.
     */
    function isHexColor(value) {
        return typeof value === 'string' && isHexColorValidator(value);
    }
    /**
     * Checks if the string is a hexadecimal color.
     * If given value is not a string, then it returns false.
     */
    function IsHexColor(validationOptions) {
        return ValidateBy({
            name: IS_HEX_COLOR,
            validator: {
                validate: function (value, args) { return isHexColor(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a hexadecimal color'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isHexadecimal$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isHexadecimal;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var hexadecimal = /^(0x|0h)?[0-9A-F]+$/i;

    	function isHexadecimal(str) {
    	  (0, _assertString.default)(str);
    	  return hexadecimal.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isHexadecimal$1, isHexadecimal$1.exports));

    var isHexadecimalValidator = /*@__PURE__*/getDefaultExportFromCjs(isHexadecimal$1.exports);

    var IS_HEXADECIMAL = 'isHexadecimal';
    /**
     * Checks if the string is a hexadecimal number.
     * If given value is not a string, then it returns false.
     */
    function isHexadecimal(value) {
        return typeof value === 'string' && isHexadecimalValidator(value);
    }
    /**
     * Checks if the string is a hexadecimal number.
     * If given value is not a string, then it returns false.
     */
    function IsHexadecimal(validationOptions) {
        return ValidateBy({
            name: IS_HEXADECIMAL,
            validator: {
                validate: function (value, args) { return isHexadecimal(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a hexadecimal number'; }, validationOptions),
            },
        }, validationOptions);
    }

    function isValidationOptions(val) {
        if (!val) {
            return false;
        }
        return 'each' in val || 'message' in val || 'groups' in val || 'always' in val || 'context' in val;
    }

    var isMACAddress$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isMACAddress;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var macAddress = /^(?:[0-9a-fA-F]{2}([-:\s]))([0-9a-fA-F]{2}\1){4}([0-9a-fA-F]{2})$/;
    	var macAddressNoSeparators = /^([0-9a-fA-F]){12}$/;
    	var macAddressWithDots = /^([0-9a-fA-F]{4}\.){2}([0-9a-fA-F]{4})$/;

    	function isMACAddress(str, options) {
    	  (0, _assertString.default)(str);
    	  /**
    	   * @deprecated `no_colons` TODO: remove it in the next major
    	  */

    	  if (options && (options.no_colons || options.no_separators)) {
    	    return macAddressNoSeparators.test(str);
    	  }

    	  return macAddress.test(str) || macAddressWithDots.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isMACAddress$1, isMACAddress$1.exports));

    var isMacAddressValidator = /*@__PURE__*/getDefaultExportFromCjs(isMACAddress$1.exports);

    var IS_MAC_ADDRESS = 'isMacAddress';
    /**
     * Check if the string is a MAC address.
     * If given value is not a string, then it returns false.
     */
    function isMACAddress(value, options) {
        return typeof value === 'string' && isMacAddressValidator(value, options);
    }
    function IsMACAddress(optionsOrValidationOptionsArg, validationOptionsArg) {
        var options = !isValidationOptions(optionsOrValidationOptionsArg) ? optionsOrValidationOptionsArg : undefined;
        var validationOptions = isValidationOptions(optionsOrValidationOptionsArg)
            ? optionsOrValidationOptionsArg
            : validationOptionsArg;
        return ValidateBy({
            name: IS_MAC_ADDRESS,
            constraints: [options],
            validator: {
                validate: function (value, args) { return isMACAddress(value, options); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a MAC Address'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_IP = 'isIp';
    /**
     * Checks if the string is an IP (version 4 or 6).
     * If given value is not a string, then it returns false.
     */
    function isIP(value, version) {
        /* eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion */
        var versionStr = version ? "".concat(version) : undefined;
        return typeof value === 'string' && isIPValidator(value, versionStr);
    }
    /**
     * Checks if the string is an IP (version 4 or 6).
     * If given value is not a string, then it returns false.
     */
    function IsIP(version, validationOptions) {
        return ValidateBy({
            name: IS_IP,
            constraints: [version],
            validator: {
                validate: function (value, args) { return isIP(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an ip address'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isPort$1 = {exports: {}};

    var isInt$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isInt;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var int = /^(?:[-+]?(?:0|[1-9][0-9]*))$/;
    	var intLeadingZeroes = /^[-+]?[0-9]+$/;

    	function isInt(str, options) {
    	  (0, _assertString.default)(str);
    	  options = options || {}; // Get the regex to use for testing, based on whether
    	  // leading zeroes are allowed or not.

    	  var regex = options.hasOwnProperty('allow_leading_zeroes') && !options.allow_leading_zeroes ? int : intLeadingZeroes; // Check min/max/lt/gt

    	  var minCheckPassed = !options.hasOwnProperty('min') || str >= options.min;
    	  var maxCheckPassed = !options.hasOwnProperty('max') || str <= options.max;
    	  var ltCheckPassed = !options.hasOwnProperty('lt') || str < options.lt;
    	  var gtCheckPassed = !options.hasOwnProperty('gt') || str > options.gt;
    	  return regex.test(str) && minCheckPassed && maxCheckPassed && ltCheckPassed && gtCheckPassed;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isInt$1, isInt$1.exports));

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isPort;

    	var _isInt = _interopRequireDefault(isInt$1.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function isPort(str) {
    	  return (0, _isInt.default)(str, {
    	    min: 0,
    	    max: 65535
    	  });
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isPort$1, isPort$1.exports));

    var isPortValidator = /*@__PURE__*/getDefaultExportFromCjs(isPort$1.exports);

    var IS_PORT = 'isPort';
    /**
     * Check if the string is a valid port number.
     */
    function isPort(value) {
        return typeof value === 'string' && isPortValidator(value);
    }
    /**
     * Check if the string is a valid port number.
     */
    function IsPort(validationOptions) {
        return ValidateBy({
            name: IS_PORT,
            validator: {
                validate: function (value, args) { return isPort(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a port'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isISBN$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isISBN;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var isbn10Maybe = /^(?:[0-9]{9}X|[0-9]{10})$/;
    	var isbn13Maybe = /^(?:[0-9]{13})$/;
    	var factor = [1, 3];

    	function isISBN(str) {
    	  var version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    	  (0, _assertString.default)(str);
    	  version = String(version);

    	  if (!version) {
    	    return isISBN(str, 10) || isISBN(str, 13);
    	  }

    	  var sanitized = str.replace(/[\s-]+/g, '');
    	  var checksum = 0;
    	  var i;

    	  if (version === '10') {
    	    if (!isbn10Maybe.test(sanitized)) {
    	      return false;
    	    }

    	    for (i = 0; i < 9; i++) {
    	      checksum += (i + 1) * sanitized.charAt(i);
    	    }

    	    if (sanitized.charAt(9) === 'X') {
    	      checksum += 10 * 10;
    	    } else {
    	      checksum += 10 * sanitized.charAt(9);
    	    }

    	    if (checksum % 11 === 0) {
    	      return !!sanitized;
    	    }
    	  } else if (version === '13') {
    	    if (!isbn13Maybe.test(sanitized)) {
    	      return false;
    	    }

    	    for (i = 0; i < 12; i++) {
    	      checksum += factor[i % 2] * sanitized.charAt(i);
    	    }

    	    if (sanitized.charAt(12) - (10 - checksum % 10) % 10 === 0) {
    	      return !!sanitized;
    	    }
    	  }

    	  return false;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isISBN$1, isISBN$1.exports));

    var isIsbnValidator = /*@__PURE__*/getDefaultExportFromCjs(isISBN$1.exports);

    var IS_ISBN = 'isIsbn';
    /**
     * Checks if the string is an ISBN (version 10 or 13).
     * If given value is not a string, then it returns false.
     */
    function isISBN(value, version) {
        /* eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion */
        var versionStr = version ? "".concat(version) : undefined;
        return typeof value === 'string' && isIsbnValidator(value, versionStr);
    }
    /**
     * Checks if the string is an ISBN (version 10 or 13).
     * If given value is not a string, then it returns false.
     */
    function IsISBN(version, validationOptions) {
        return ValidateBy({
            name: IS_ISBN,
            constraints: [version],
            validator: {
                validate: function (value, args) { return isISBN(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an ISBN'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isISIN$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isISIN;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var isin = /^[A-Z]{2}[0-9A-Z]{9}[0-9]$/; // this link details how the check digit is calculated:
    	// https://www.isin.org/isin-format/. it is a little bit
    	// odd in that it works with digits, not numbers. in order
    	// to make only one pass through the ISIN characters, the
    	// each alpha character is handled as 2 characters within
    	// the loop.

    	function isISIN(str) {
    	  (0, _assertString.default)(str);

    	  if (!isin.test(str)) {
    	    return false;
    	  }

    	  var double = true;
    	  var sum = 0; // convert values

    	  for (var i = str.length - 2; i >= 0; i--) {
    	    if (str[i] >= 'A' && str[i] <= 'Z') {
    	      var value = str[i].charCodeAt(0) - 55;
    	      var lo = value % 10;
    	      var hi = Math.trunc(value / 10); // letters have two digits, so handle the low order
    	      // and high order digits separately.

    	      for (var _i = 0, _arr = [lo, hi]; _i < _arr.length; _i++) {
    	        var digit = _arr[_i];

    	        if (double) {
    	          if (digit >= 5) {
    	            sum += 1 + (digit - 5) * 2;
    	          } else {
    	            sum += digit * 2;
    	          }
    	        } else {
    	          sum += digit;
    	        }

    	        double = !double;
    	      }
    	    } else {
    	      var _digit = str[i].charCodeAt(0) - '0'.charCodeAt(0);

    	      if (double) {
    	        if (_digit >= 5) {
    	          sum += 1 + (_digit - 5) * 2;
    	        } else {
    	          sum += _digit * 2;
    	        }
    	      } else {
    	        sum += _digit;
    	      }

    	      double = !double;
    	    }
    	  }

    	  var check = Math.trunc((sum + 9) / 10) * 10 - sum;
    	  return +str[str.length - 1] === check;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isISIN$1, isISIN$1.exports));

    var isIsinValidator = /*@__PURE__*/getDefaultExportFromCjs(isISIN$1.exports);

    var IS_ISIN = 'isIsin';
    /**
     * Checks if the string is an ISIN (stock/security identifier).
     * If given value is not a string, then it returns false.
     */
    function isISIN(value) {
        return typeof value === 'string' && isIsinValidator(value);
    }
    /**
     * Checks if the string is an ISIN (stock/security identifier).
     * If given value is not a string, then it returns false.
     */
    function IsISIN(validationOptions) {
        return ValidateBy({
            name: IS_ISIN,
            validator: {
                validate: function (value, args) { return isISIN(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an ISIN (stock/security identifier)'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isISO8601$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isISO8601;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	/* eslint-disable max-len */
    	// from http://goo.gl/0ejHHW
    	var iso8601 = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/; // same as above, except with a strict 'T' separator between date and time

    	var iso8601StrictSeparator = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;
    	/* eslint-enable max-len */

    	var isValidDate = function isValidDate(str) {
    	  // str must have passed the ISO8601 check
    	  // this check is meant to catch invalid dates
    	  // like 2009-02-31
    	  // first check for ordinal dates
    	  var ordinalMatch = str.match(/^(\d{4})-?(\d{3})([ T]{1}\.*|$)/);

    	  if (ordinalMatch) {
    	    var oYear = Number(ordinalMatch[1]);
    	    var oDay = Number(ordinalMatch[2]); // if is leap year

    	    if (oYear % 4 === 0 && oYear % 100 !== 0 || oYear % 400 === 0) return oDay <= 366;
    	    return oDay <= 365;
    	  }

    	  var match = str.match(/(\d{4})-?(\d{0,2})-?(\d*)/).map(Number);
    	  var year = match[1];
    	  var month = match[2];
    	  var day = match[3];
    	  var monthString = month ? "0".concat(month).slice(-2) : month;
    	  var dayString = day ? "0".concat(day).slice(-2) : day; // create a date object and compare

    	  var d = new Date("".concat(year, "-").concat(monthString || '01', "-").concat(dayString || '01'));

    	  if (month && day) {
    	    return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === day;
    	  }

    	  return true;
    	};

    	function isISO8601(str) {
    	  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    	  (0, _assertString.default)(str);
    	  var check = options.strictSeparator ? iso8601StrictSeparator.test(str) : iso8601.test(str);
    	  if (check && options.strict) return isValidDate(str);
    	  return check;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isISO8601$1, isISO8601$1.exports));

    var isIso8601Validator = /*@__PURE__*/getDefaultExportFromCjs(isISO8601$1.exports);

    var IS_ISO8601 = 'isIso8601';
    /**
     * Checks if the string is a valid ISO 8601 date.
     * If given value is not a string, then it returns false.
     * Use the option strict = true for additional checks for a valid date, e.g. invalidates dates like 2019-02-29.
     */
    function isISO8601(value, options) {
        return typeof value === 'string' && isIso8601Validator(value, options);
    }
    /**
     * Checks if the string is a valid ISO 8601 date.
     * If given value is not a string, then it returns false.
     * Use the option strict = true for additional checks for a valid date, e.g. invalidates dates like 2019-02-29.
     */
    function IsISO8601(options, validationOptions) {
        return ValidateBy({
            name: IS_ISO8601,
            constraints: [options],
            validator: {
                validate: function (value, args) { return isISO8601(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid ISO 8601 date string'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isJSON$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isJSON;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _merge = _interopRequireDefault(merge.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    	var default_json_options = {
    	  allow_primitives: false
    	};

    	function isJSON(str, options) {
    	  (0, _assertString.default)(str);

    	  try {
    	    options = (0, _merge.default)(options, default_json_options);
    	    var primitives = [];

    	    if (options.allow_primitives) {
    	      primitives = [null, false, true];
    	    }

    	    var obj = JSON.parse(str);
    	    return primitives.includes(obj) || !!obj && _typeof(obj) === 'object';
    	  } catch (e) {
    	    /* ignore */
    	  }

    	  return false;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isJSON$1, isJSON$1.exports));

    var isJSONValidator = /*@__PURE__*/getDefaultExportFromCjs(isJSON$1.exports);

    var IS_JSON = 'isJson';
    /**
     * Checks if the string is valid JSON (note: uses JSON.parse).
     * If given value is not a string, then it returns false.
     */
    function isJSON(value) {
        return typeof value === 'string' && isJSONValidator(value);
    }
    /**
     * Checks if the string is valid JSON (note: uses JSON.parse).
     * If given value is not a string, then it returns false.
     */
    function IsJSON(validationOptions) {
        return ValidateBy({
            name: IS_JSON,
            validator: {
                validate: function (value, args) { return isJSON(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a json string'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isJWT$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isJWT;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _isBase = _interopRequireDefault(isBase64$1.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function isJWT(str) {
    	  (0, _assertString.default)(str);
    	  var dotSplit = str.split('.');
    	  var len = dotSplit.length;

    	  if (len > 3 || len < 2) {
    	    return false;
    	  }

    	  return dotSplit.reduce(function (acc, currElem) {
    	    return acc && (0, _isBase.default)(currElem, {
    	      urlSafe: true
    	    });
    	  }, true);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isJWT$1, isJWT$1.exports));

    var isJwtValidator = /*@__PURE__*/getDefaultExportFromCjs(isJWT$1.exports);

    var IS_JWT = 'isJwt';
    /**
     * Checks if the string is valid JWT token.
     * If given value is not a string, then it returns false.
     */
    function isJWT(value) {
        return typeof value === 'string' && isJwtValidator(value);
    }
    /**
     * Checks if the string is valid JWT token.
     * If given value is not a string, then it returns false.
     */
    function IsJWT(validationOptions) {
        return ValidateBy({
            name: IS_JWT,
            validator: {
                validate: function (value, args) { return isJWT(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a jwt string'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isLowercase$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isLowercase;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function isLowercase(str) {
    	  (0, _assertString.default)(str);
    	  return str === str.toLowerCase();
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isLowercase$1, isLowercase$1.exports));

    var isLowercaseValidator = /*@__PURE__*/getDefaultExportFromCjs(isLowercase$1.exports);

    var IS_LOWERCASE = 'isLowercase';
    /**
     * Checks if the string is lowercase.
     * If given value is not a string, then it returns false.
     */
    function isLowercase(value) {
        return typeof value === 'string' && isLowercaseValidator(value);
    }
    /**
     * Checks if the string is lowercase.
     * If given value is not a string, then it returns false.
     */
    function IsLowercase(validationOptions) {
        return ValidateBy({
            name: IS_LOWERCASE,
            validator: {
                validate: function (value, args) { return isLowercase(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a lowercase string'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isMobilePhone$2 = {};

    Object.defineProperty(isMobilePhone$2, "__esModule", {
      value: true
    });
    var _default$4 = isMobilePhone$2.default = isMobilePhone$1;
    isMobilePhone$2.locales = void 0;

    var _assertString$5 = _interopRequireDefault$5(assertString.exports);

    function _interopRequireDefault$5(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /* eslint-disable max-len */
    var phones = {
      'am-AM': /^(\+?374|0)((10|[9|7][0-9])\d{6}$|[2-4]\d{7}$)/,
      'ar-AE': /^((\+?971)|0)?5[024568]\d{7}$/,
      'ar-BH': /^(\+?973)?(3|6)\d{7}$/,
      'ar-DZ': /^(\+?213|0)(5|6|7)\d{8}$/,
      'ar-LB': /^(\+?961)?((3|81)\d{6}|7\d{7})$/,
      'ar-EG': /^((\+?20)|0)?1[0125]\d{8}$/,
      'ar-IQ': /^(\+?964|0)?7[0-9]\d{8}$/,
      'ar-JO': /^(\+?962|0)?7[789]\d{7}$/,
      'ar-KW': /^(\+?965)[569]\d{7}$/,
      'ar-LY': /^((\+?218)|0)?(9[1-6]\d{7}|[1-8]\d{7,9})$/,
      'ar-MA': /^(?:(?:\+|00)212|0)[5-7]\d{8}$/,
      'ar-OM': /^((\+|00)968)?(9[1-9])\d{6}$/,
      'ar-PS': /^(\+?970|0)5[6|9](\d{7})$/,
      'ar-SA': /^(!?(\+?966)|0)?5\d{8}$/,
      'ar-SY': /^(!?(\+?963)|0)?9\d{8}$/,
      'ar-TN': /^(\+?216)?[2459]\d{7}$/,
      'az-AZ': /^(\+994|0)(5[015]|7[07]|99)\d{7}$/,
      'bs-BA': /^((((\+|00)3876)|06))((([0-3]|[5-6])\d{6})|(4\d{7}))$/,
      'be-BY': /^(\+?375)?(24|25|29|33|44)\d{7}$/,
      'bg-BG': /^(\+?359|0)?8[789]\d{7}$/,
      'bn-BD': /^(\+?880|0)1[13456789][0-9]{8}$/,
      'ca-AD': /^(\+376)?[346]\d{5}$/,
      'cs-CZ': /^(\+?420)? ?[1-9][0-9]{2} ?[0-9]{3} ?[0-9]{3}$/,
      'da-DK': /^(\+?45)?\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$/,
      'de-DE': /^((\+49|0)[1|3])([0|5][0-45-9]\d|6([23]|0\d?)|7([0-57-9]|6\d))\d{7,9}$/,
      'de-AT': /^(\+43|0)\d{1,4}\d{3,12}$/,
      'de-CH': /^(\+41|0)([1-9])\d{1,9}$/,
      'de-LU': /^(\+352)?((6\d1)\d{6})$/,
      'dv-MV': /^(\+?960)?(7[2-9]|91|9[3-9])\d{7}$/,
      'el-GR': /^(\+?30|0)?(69\d{8})$/,
      'en-AU': /^(\+?61|0)4\d{8}$/,
      'en-BM': /^(\+?1)?441(((3|7)\d{6}$)|(5[0-3][0-9]\d{4}$)|(59\d{5}))/,
      'en-GB': /^(\+?44|0)7\d{9}$/,
      'en-GG': /^(\+?44|0)1481\d{6}$/,
      'en-GH': /^(\+233|0)(20|50|24|54|27|57|26|56|23|28|55|59)\d{7}$/,
      'en-GY': /^(\+592|0)6\d{6}$/,
      'en-HK': /^(\+?852[-\s]?)?[456789]\d{3}[-\s]?\d{4}$/,
      'en-MO': /^(\+?853[-\s]?)?[6]\d{3}[-\s]?\d{4}$/,
      'en-IE': /^(\+?353|0)8[356789]\d{7}$/,
      'en-IN': /^(\+?91|0)?[6789]\d{9}$/,
      'en-KE': /^(\+?254|0)(7|1)\d{8}$/,
      'en-KI': /^((\+686|686)?)?( )?((6|7)(2|3|8)[0-9]{6})$/,
      'en-MT': /^(\+?356|0)?(99|79|77|21|27|22|25)[0-9]{6}$/,
      'en-MU': /^(\+?230|0)?\d{8}$/,
      'en-NA': /^(\+?264|0)(6|8)\d{7}$/,
      'en-NG': /^(\+?234|0)?[789]\d{9}$/,
      'en-NZ': /^(\+?64|0)[28]\d{7,9}$/,
      'en-PK': /^((00|\+)?92|0)3[0-6]\d{8}$/,
      'en-PH': /^(09|\+639)\d{9}$/,
      'en-RW': /^(\+?250|0)?[7]\d{8}$/,
      'en-SG': /^(\+65)?[3689]\d{7}$/,
      'en-SL': /^(\+?232|0)\d{8}$/,
      'en-TZ': /^(\+?255|0)?[67]\d{8}$/,
      'en-UG': /^(\+?256|0)?[7]\d{8}$/,
      'en-US': /^((\+1|1)?( |-)?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})( |-)?([2-9][0-9]{2}( |-)?[0-9]{4})$/,
      'en-ZA': /^(\+?27|0)\d{9}$/,
      'en-ZM': /^(\+?26)?09[567]\d{7}$/,
      'en-ZW': /^(\+263)[0-9]{9}$/,
      'en-BW': /^(\+?267)?(7[1-8]{1})\d{6}$/,
      'es-AR': /^\+?549(11|[2368]\d)\d{8}$/,
      'es-BO': /^(\+?591)?(6|7)\d{7}$/,
      'es-CO': /^(\+?57)?3(0(0|1|2|4|5)|1\d|2[0-4]|5(0|1))\d{7}$/,
      'es-CL': /^(\+?56|0)[2-9]\d{1}\d{7}$/,
      'es-CR': /^(\+506)?[2-8]\d{7}$/,
      'es-CU': /^(\+53|0053)?5\d{7}/,
      'es-DO': /^(\+?1)?8[024]9\d{7}$/,
      'es-HN': /^(\+?504)?[9|8]\d{7}$/,
      'es-EC': /^(\+?593|0)([2-7]|9[2-9])\d{7}$/,
      'es-ES': /^(\+?34)?[6|7]\d{8}$/,
      'es-PE': /^(\+?51)?9\d{8}$/,
      'es-MX': /^(\+?52)?(1|01)?\d{10,11}$/,
      'es-PA': /^(\+?507)\d{7,8}$/,
      'es-PY': /^(\+?595|0)9[9876]\d{7}$/,
      'es-SV': /^(\+?503)?[67]\d{7}$/,
      'es-UY': /^(\+598|0)9[1-9][\d]{6}$/,
      'es-VE': /^(\+?58)?(2|4)\d{9}$/,
      'et-EE': /^(\+?372)?\s?(5|8[1-4])\s?([0-9]\s?){6,7}$/,
      'fa-IR': /^(\+?98[\-\s]?|0)9[0-39]\d[\-\s]?\d{3}[\-\s]?\d{4}$/,
      'fi-FI': /^(\+?358|0)\s?(4(0|1|2|4|5|6)?|50)\s?(\d\s?){4,8}\d$/,
      'fj-FJ': /^(\+?679)?\s?\d{3}\s?\d{4}$/,
      'fo-FO': /^(\+?298)?\s?\d{2}\s?\d{2}\s?\d{2}$/,
      'fr-BF': /^(\+226|0)[67]\d{7}$/,
      'fr-CM': /^(\+?237)6[0-9]{8}$/,
      'fr-FR': /^(\+?33|0)[67]\d{8}$/,
      'fr-GF': /^(\+?594|0|00594)[67]\d{8}$/,
      'fr-GP': /^(\+?590|0|00590)[67]\d{8}$/,
      'fr-MQ': /^(\+?596|0|00596)[67]\d{8}$/,
      'fr-PF': /^(\+?689)?8[789]\d{6}$/,
      'fr-RE': /^(\+?262|0|00262)[67]\d{8}$/,
      'he-IL': /^(\+972|0)([23489]|5[012345689]|77)[1-9]\d{6}$/,
      'hu-HU': /^(\+?36|06)(20|30|31|50|70)\d{7}$/,
      'id-ID': /^(\+?62|0)8(1[123456789]|2[1238]|3[1238]|5[12356789]|7[78]|9[56789]|8[123456789])([\s?|\d]{5,11})$/,
      'it-IT': /^(\+?39)?\s?3\d{2} ?\d{6,7}$/,
      'it-SM': /^((\+378)|(0549)|(\+390549)|(\+3780549))?6\d{5,9}$/,
      'ja-JP': /^(\+81[ \-]?(\(0\))?|0)[6789]0[ \-]?\d{4}[ \-]?\d{4}$/,
      'ka-GE': /^(\+?995)?(5|79)\d{7}$/,
      'kk-KZ': /^(\+?7|8)?7\d{9}$/,
      'kl-GL': /^(\+?299)?\s?\d{2}\s?\d{2}\s?\d{2}$/,
      'ko-KR': /^((\+?82)[ \-]?)?0?1([0|1|6|7|8|9]{1})[ \-]?\d{3,4}[ \-]?\d{4}$/,
      'lt-LT': /^(\+370|8)\d{8}$/,
      'lv-LV': /^(\+?371)2\d{7}$/,
      'ms-MY': /^(\+?6?01){1}(([0145]{1}(\-|\s)?\d{7,8})|([236789]{1}(\s|\-)?\d{7}))$/,
      'mz-MZ': /^(\+?258)?8[234567]\d{7}$/,
      'nb-NO': /^(\+?47)?[49]\d{7}$/,
      'ne-NP': /^(\+?977)?9[78]\d{8}$/,
      'nl-BE': /^(\+?32|0)4\d{8}$/,
      'nl-NL': /^(((\+|00)?31\(0\))|((\+|00)?31)|0)6{1}\d{8}$/,
      'nn-NO': /^(\+?47)?[49]\d{7}$/,
      'pl-PL': /^(\+?48)? ?[5-8]\d ?\d{3} ?\d{2} ?\d{2}$/,
      'pt-BR': /^((\+?55\ ?[1-9]{2}\ ?)|(\+?55\ ?\([1-9]{2}\)\ ?)|(0[1-9]{2}\ ?)|(\([1-9]{2}\)\ ?)|([1-9]{2}\ ?))((\d{4}\-?\d{4})|(9[2-9]{1}\d{3}\-?\d{4}))$/,
      'pt-PT': /^(\+?351)?9[1236]\d{7}$/,
      'pt-AO': /^(\+244)\d{9}$/,
      'ro-RO': /^(\+?4?0)\s?7\d{2}(\/|\s|\.|\-)?\d{3}(\s|\.|\-)?\d{3}$/,
      'ru-RU': /^(\+?7|8)?9\d{9}$/,
      'si-LK': /^(?:0|94|\+94)?(7(0|1|2|4|5|6|7|8)( |-)?)\d{7}$/,
      'sl-SI': /^(\+386\s?|0)(\d{1}\s?\d{3}\s?\d{2}\s?\d{2}|\d{2}\s?\d{3}\s?\d{3})$/,
      'sk-SK': /^(\+?421)? ?[1-9][0-9]{2} ?[0-9]{3} ?[0-9]{3}$/,
      'sq-AL': /^(\+355|0)6[789]\d{6}$/,
      'sr-RS': /^(\+3816|06)[- \d]{5,9}$/,
      'sv-SE': /^(\+?46|0)[\s\-]?7[\s\-]?[02369]([\s\-]?\d){7}$/,
      'tg-TJ': /^(\+?992)?[5][5]\d{7}$/,
      'th-TH': /^(\+66|66|0)\d{9}$/,
      'tr-TR': /^(\+?90|0)?5\d{9}$/,
      'tk-TM': /^(\+993|993|8)\d{8}$/,
      'uk-UA': /^(\+?38|8)?0\d{9}$/,
      'uz-UZ': /^(\+?998)?(6[125-79]|7[1-69]|88|9\d)\d{7}$/,
      'vi-VN': /^((\+?84)|0)((3([2-9]))|(5([25689]))|(7([0|6-9]))|(8([1-9]))|(9([0-9])))([0-9]{7})$/,
      'zh-CN': /^((\+|00)86)?(1[3-9]|9[28])\d{9}$/,
      'zh-TW': /^(\+?886\-?|0)?9\d{8}$/,
      'dz-BT': /^(\+?975|0)?(17|16|77|02)\d{6}$/
    };
    /* eslint-enable max-len */
    // aliases

    phones['en-CA'] = phones['en-US'];
    phones['fr-CA'] = phones['en-CA'];
    phones['fr-BE'] = phones['nl-BE'];
    phones['zh-HK'] = phones['en-HK'];
    phones['zh-MO'] = phones['en-MO'];
    phones['ga-IE'] = phones['en-IE'];
    phones['fr-CH'] = phones['de-CH'];
    phones['it-CH'] = phones['fr-CH'];

    function isMobilePhone$1(str, locale, options) {
      (0, _assertString$5.default)(str);

      if (options && options.strictMode && !str.startsWith('+')) {
        return false;
      }

      if (Array.isArray(locale)) {
        return locale.some(function (key) {
          // https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md#ignoring-code-for-coverage-purposes
          // istanbul ignore else
          if (phones.hasOwnProperty(key)) {
            var phone = phones[key];

            if (phone.test(str)) {
              return true;
            }
          }

          return false;
        });
      } else if (locale in phones) {
        return phones[locale].test(str); // alias falsey locale as 'any'
      } else if (!locale || locale === 'any') {
        for (var key in phones) {
          // istanbul ignore else
          if (phones.hasOwnProperty(key)) {
            var phone = phones[key];

            if (phone.test(str)) {
              return true;
            }
          }
        }

        return false;
      }

      throw new Error("Invalid locale '".concat(locale, "'"));
    }

    var locales$2 = Object.keys(phones);
    isMobilePhone$2.locales = locales$2;

    var IS_MOBILE_PHONE = 'isMobilePhone';
    /**
     * Checks if the string is a mobile phone number (locale is either an array of locales (e.g ['sk-SK', 'sr-RS'])
     * OR one of ['am-Am', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG', 'ar-IQ', ar-JO', 'ar-KW', 'ar-SA', 'ar-SY', 'ar-TN', 'be-BY',
     * 'bg-BG', 'bn-BD', 'cs-CZ', 'da-DK', 'de-DE', 'de-AT', 'el-GR', 'en-AU', 'en-CA', 'en-GB', 'en-GG', 'en-GH', 'en-HK',
     * 'en-MO', 'en-IE', 'en-IN', 'en-KE', 'en-MT', 'en-MU', 'en-NG', 'en-NZ', 'en-PK', 'en-RW', 'en-SG', 'en-SL', 'en-UG',
     * 'en-US', 'en-TZ', 'en-ZA', 'en-ZM', 'es-CL', 'es-CR', 'es-EC', 'es-ES', 'es-MX', 'es-PA', 'es-PY', 'es-UY', 'et-EE',
     * 'fa-IR', 'fi-FI', 'fj-FJ', 'fo-FO', 'fr-BE', 'fr-FR', 'fr-GF', 'fr-GP', 'fr-MQ', 'fr-RE', 'he-IL', 'hu-HU', 'id-ID',
     * 'it-IT', 'ja-JP', 'kk-KZ', 'kl-GL', 'ko-KR', 'lt-LT', 'ms-MY', 'nb-NO', 'ne-NP', 'nl-BE', 'nl-NL', 'nn-NO', 'pl-PL',
     * 'pt-BR', 'pt-PT', 'ro-RO', 'ru-RU', 'sl-SI', 'sk-SK', 'sr-RS', 'sv-SE', 'th-TH', 'tr-TR', 'uk-UA', 'vi-VN', 'zh-CN',
     * 'zh-HK', 'zh-MO', 'zh-TW']
     * If given value is not a string, then it returns false.
     */
    function isMobilePhone(value, locale, options) {
        return typeof value === 'string' && _default$4(value, locale, options);
    }
    /**
     * Checks if the string is a mobile phone number (locale is either an array of locales (e.g ['sk-SK', 'sr-RS'])
     * OR one of ['am-Am', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG', 'ar-IQ', ar-JO', 'ar-KW', 'ar-SA', 'ar-SY', 'ar-TN', 'be-BY',
     * 'bg-BG', 'bn-BD', 'cs-CZ', 'da-DK', 'de-DE', 'de-AT', 'el-GR', 'en-AU', 'en-CA', 'en-GB', 'en-GG', 'en-GH', 'en-HK',
     * 'en-MO', 'en-IE', 'en-IN', 'en-KE', 'en-MT', 'en-MU', 'en-NG', 'en-NZ', 'en-PK', 'en-RW', 'en-SG', 'en-SL', 'en-UG',
     * 'en-US', 'en-TZ', 'en-ZA', 'en-ZM', 'es-CL', 'es-CR', 'es-EC', 'es-ES', 'es-MX', 'es-PA', 'es-PY', 'es-UY', 'et-EE',
     * 'fa-IR', 'fi-FI', 'fj-FJ', 'fo-FO', 'fr-BE', 'fr-FR', 'fr-GF', 'fr-GP', 'fr-MQ', 'fr-RE', 'he-IL', 'hu-HU', 'id-ID',
     * 'it-IT', 'ja-JP', 'kk-KZ', 'kl-GL', 'ko-KR', 'lt-LT', 'ms-MY', 'nb-NO', 'ne-NP', 'nl-BE', 'nl-NL', 'nn-NO', 'pl-PL',
     * 'pt-BR', 'pt-PT', 'ro-RO', 'ru-RU', 'sl-SI', 'sk-SK', 'sr-RS', 'sv-SE', 'th-TH', 'tr-TR', 'uk-UA', 'vi-VN', 'zh-CN',
     * 'zh-HK', 'zh-MO', 'zh-TW']
     * If given value is not a string, then it returns false.
     */
    function IsMobilePhone(locale, options, validationOptions) {
        return ValidateBy({
            name: IS_MOBILE_PHONE,
            constraints: [locale, options],
            validator: {
                validate: function (value, args) { return isMobilePhone(value, args === null || args === void 0 ? void 0 : args.constraints[0], args === null || args === void 0 ? void 0 : args.constraints[1]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a phone number'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isISO31661Alpha2$2 = {};

    Object.defineProperty(isISO31661Alpha2$2, "__esModule", {
      value: true
    });
    var _default$3 = isISO31661Alpha2$2.default = isISO31661Alpha2$1;
    isISO31661Alpha2$2.CountryCodes = void 0;

    var _assertString$4 = _interopRequireDefault$4(assertString.exports);

    function _interopRequireDefault$4(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    // from https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
    var validISO31661Alpha2CountriesCodes = new Set(['AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW']);

    function isISO31661Alpha2$1(str) {
      (0, _assertString$4.default)(str);
      return validISO31661Alpha2CountriesCodes.has(str.toUpperCase());
    }

    var CountryCodes = validISO31661Alpha2CountriesCodes;
    isISO31661Alpha2$2.CountryCodes = CountryCodes;

    var IS_ISO31661_ALPHA_2 = 'isISO31661Alpha2';
    /**
     * Check if the string is a valid [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) officially assigned country code.
     */
    function isISO31661Alpha2(value) {
        return typeof value === 'string' && _default$3(value);
    }
    /**
     * Check if the string is a valid [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) officially assigned country code.
     */
    function IsISO31661Alpha2(validationOptions) {
        return ValidateBy({
            name: IS_ISO31661_ALPHA_2,
            validator: {
                validate: function (value, args) { return isISO31661Alpha2(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid ISO31661 Alpha2 code'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isISO31661Alpha3$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isISO31661Alpha3;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	// from https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3
    	var validISO31661Alpha3CountriesCodes = new Set(['AFG', 'ALA', 'ALB', 'DZA', 'ASM', 'AND', 'AGO', 'AIA', 'ATA', 'ATG', 'ARG', 'ARM', 'ABW', 'AUS', 'AUT', 'AZE', 'BHS', 'BHR', 'BGD', 'BRB', 'BLR', 'BEL', 'BLZ', 'BEN', 'BMU', 'BTN', 'BOL', 'BES', 'BIH', 'BWA', 'BVT', 'BRA', 'IOT', 'BRN', 'BGR', 'BFA', 'BDI', 'KHM', 'CMR', 'CAN', 'CPV', 'CYM', 'CAF', 'TCD', 'CHL', 'CHN', 'CXR', 'CCK', 'COL', 'COM', 'COG', 'COD', 'COK', 'CRI', 'CIV', 'HRV', 'CUB', 'CUW', 'CYP', 'CZE', 'DNK', 'DJI', 'DMA', 'DOM', 'ECU', 'EGY', 'SLV', 'GNQ', 'ERI', 'EST', 'ETH', 'FLK', 'FRO', 'FJI', 'FIN', 'FRA', 'GUF', 'PYF', 'ATF', 'GAB', 'GMB', 'GEO', 'DEU', 'GHA', 'GIB', 'GRC', 'GRL', 'GRD', 'GLP', 'GUM', 'GTM', 'GGY', 'GIN', 'GNB', 'GUY', 'HTI', 'HMD', 'VAT', 'HND', 'HKG', 'HUN', 'ISL', 'IND', 'IDN', 'IRN', 'IRQ', 'IRL', 'IMN', 'ISR', 'ITA', 'JAM', 'JPN', 'JEY', 'JOR', 'KAZ', 'KEN', 'KIR', 'PRK', 'KOR', 'KWT', 'KGZ', 'LAO', 'LVA', 'LBN', 'LSO', 'LBR', 'LBY', 'LIE', 'LTU', 'LUX', 'MAC', 'MKD', 'MDG', 'MWI', 'MYS', 'MDV', 'MLI', 'MLT', 'MHL', 'MTQ', 'MRT', 'MUS', 'MYT', 'MEX', 'FSM', 'MDA', 'MCO', 'MNG', 'MNE', 'MSR', 'MAR', 'MOZ', 'MMR', 'NAM', 'NRU', 'NPL', 'NLD', 'NCL', 'NZL', 'NIC', 'NER', 'NGA', 'NIU', 'NFK', 'MNP', 'NOR', 'OMN', 'PAK', 'PLW', 'PSE', 'PAN', 'PNG', 'PRY', 'PER', 'PHL', 'PCN', 'POL', 'PRT', 'PRI', 'QAT', 'REU', 'ROU', 'RUS', 'RWA', 'BLM', 'SHN', 'KNA', 'LCA', 'MAF', 'SPM', 'VCT', 'WSM', 'SMR', 'STP', 'SAU', 'SEN', 'SRB', 'SYC', 'SLE', 'SGP', 'SXM', 'SVK', 'SVN', 'SLB', 'SOM', 'ZAF', 'SGS', 'SSD', 'ESP', 'LKA', 'SDN', 'SUR', 'SJM', 'SWZ', 'SWE', 'CHE', 'SYR', 'TWN', 'TJK', 'TZA', 'THA', 'TLS', 'TGO', 'TKL', 'TON', 'TTO', 'TUN', 'TUR', 'TKM', 'TCA', 'TUV', 'UGA', 'UKR', 'ARE', 'GBR', 'USA', 'UMI', 'URY', 'UZB', 'VUT', 'VEN', 'VNM', 'VGB', 'VIR', 'WLF', 'ESH', 'YEM', 'ZMB', 'ZWE']);

    	function isISO31661Alpha3(str) {
    	  (0, _assertString.default)(str);
    	  return validISO31661Alpha3CountriesCodes.has(str.toUpperCase());
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isISO31661Alpha3$1, isISO31661Alpha3$1.exports));

    var isISO31661Alpha3Validator = /*@__PURE__*/getDefaultExportFromCjs(isISO31661Alpha3$1.exports);

    var IS_ISO31661_ALPHA_3 = 'isISO31661Alpha3';
    /**
     * Check if the string is a valid [ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3) officially assigned country code.
     */
    function isISO31661Alpha3(value) {
        return typeof value === 'string' && isISO31661Alpha3Validator(value);
    }
    /**
     * Check if the string is a valid [ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3) officially assigned country code.
     */
    function IsISO31661Alpha3(validationOptions) {
        return ValidateBy({
            name: IS_ISO31661_ALPHA_3,
            validator: {
                validate: function (value, args) { return isISO31661Alpha3(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid ISO31661 Alpha3 code'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isMongoId$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isMongoId;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _isHexadecimal = _interopRequireDefault(isHexadecimal$1.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function isMongoId(str) {
    	  (0, _assertString.default)(str);
    	  return (0, _isHexadecimal.default)(str) && str.length === 24;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isMongoId$1, isMongoId$1.exports));

    var isMongoIdValidator = /*@__PURE__*/getDefaultExportFromCjs(isMongoId$1.exports);

    var IS_MONGO_ID = 'isMongoId';
    /**
     * Checks if the string is a valid hex-encoded representation of a MongoDB ObjectId.
     * If given value is not a string, then it returns false.
     */
    function isMongoId(value) {
        return typeof value === 'string' && isMongoIdValidator(value);
    }
    /**
     * Checks if the string is a valid hex-encoded representation of a MongoDB ObjectId.
     * If given value is not a string, then it returns false.
     */
    function IsMongoId(validationOptions) {
        return ValidateBy({
            name: IS_MONGO_ID,
            validator: {
                validate: function (value, args) { return isMongoId(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a mongodb id'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isMultibyte$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isMultibyte;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	/* eslint-disable no-control-regex */
    	var multibyte = /[^\x00-\x7F]/;
    	/* eslint-enable no-control-regex */

    	function isMultibyte(str) {
    	  (0, _assertString.default)(str);
    	  return multibyte.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isMultibyte$1, isMultibyte$1.exports));

    var isMultibyteValidator = /*@__PURE__*/getDefaultExportFromCjs(isMultibyte$1.exports);

    var IS_MULTIBYTE = 'isMultibyte';
    /**
     * Checks if the string contains one or more multibyte chars.
     * If given value is not a string, then it returns false.
     */
    function isMultibyte(value) {
        return typeof value === 'string' && isMultibyteValidator(value);
    }
    /**
     * Checks if the string contains one or more multibyte chars.
     * If given value is not a string, then it returns false.
     */
    function IsMultibyte(validationOptions) {
        return ValidateBy({
            name: IS_MULTIBYTE,
            validator: {
                validate: function (value, args) { return isMultibyte(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain one or more multibyte chars'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isSurrogatePair$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isSurrogatePair;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var surrogatePair = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;

    	function isSurrogatePair(str) {
    	  (0, _assertString.default)(str);
    	  return surrogatePair.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isSurrogatePair$1, isSurrogatePair$1.exports));

    var isSurrogatePairValidator = /*@__PURE__*/getDefaultExportFromCjs(isSurrogatePair$1.exports);

    var IS_SURROGATE_PAIR = 'isSurrogatePair';
    /**
     * Checks if the string contains any surrogate pairs chars.
     * If given value is not a string, then it returns false.
     */
    function isSurrogatePair(value) {
        return typeof value === 'string' && isSurrogatePairValidator(value);
    }
    /**
     * Checks if the string contains any surrogate pairs chars.
     * If given value is not a string, then it returns false.
     */
    function IsSurrogatePair(validationOptions) {
        return ValidateBy({
            name: IS_SURROGATE_PAIR,
            validator: {
                validate: function (value, args) { return isSurrogatePair(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain any surrogate pairs chars'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isURL$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isURL;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _isFQDN = _interopRequireDefault(isFQDN$1.exports);

    	var _isIP = _interopRequireDefault(isIP$1.exports);

    	var _merge = _interopRequireDefault(merge.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

    	function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    	function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

    	function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    	function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

    	function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

    	/*
    	options for isURL method

    	require_protocol - if set as true isURL will return false if protocol is not present in the URL
    	require_valid_protocol - isURL will check if the URL's protocol is present in the protocols option
    	protocols - valid protocols can be modified with this option
    	require_host - if set as false isURL will not check if host is present in the URL
    	require_port - if set as true isURL will check if port is present in the URL
    	allow_protocol_relative_urls - if set as true protocol relative URLs will be allowed
    	validate_length - if set as false isURL will skip string length validation (IE maximum is 2083)

    	*/
    	var default_url_options = {
    	  protocols: ['http', 'https', 'ftp'],
    	  require_tld: true,
    	  require_protocol: false,
    	  require_host: true,
    	  require_port: false,
    	  require_valid_protocol: true,
    	  allow_underscores: false,
    	  allow_trailing_dot: false,
    	  allow_protocol_relative_urls: false,
    	  allow_fragments: true,
    	  allow_query_components: true,
    	  validate_length: true
    	};
    	var wrapped_ipv6 = /^\[([^\]]+)\](?::([0-9]+))?$/;

    	function isRegExp(obj) {
    	  return Object.prototype.toString.call(obj) === '[object RegExp]';
    	}

    	function checkHost(host, matches) {
    	  for (var i = 0; i < matches.length; i++) {
    	    var match = matches[i];

    	    if (host === match || isRegExp(match) && match.test(host)) {
    	      return true;
    	    }
    	  }

    	  return false;
    	}

    	function isURL(url, options) {
    	  (0, _assertString.default)(url);

    	  if (!url || /[\s<>]/.test(url)) {
    	    return false;
    	  }

    	  if (url.indexOf('mailto:') === 0) {
    	    return false;
    	  }

    	  options = (0, _merge.default)(options, default_url_options);

    	  if (options.validate_length && url.length >= 2083) {
    	    return false;
    	  }

    	  if (!options.allow_fragments && url.includes('#')) {
    	    return false;
    	  }

    	  if (!options.allow_query_components && (url.includes('?') || url.includes('&'))) {
    	    return false;
    	  }

    	  var protocol, auth, host, hostname, port, port_str, split, ipv6;
    	  split = url.split('#');
    	  url = split.shift();
    	  split = url.split('?');
    	  url = split.shift();
    	  split = url.split('://');

    	  if (split.length > 1) {
    	    protocol = split.shift().toLowerCase();

    	    if (options.require_valid_protocol && options.protocols.indexOf(protocol) === -1) {
    	      return false;
    	    }
    	  } else if (options.require_protocol) {
    	    return false;
    	  } else if (url.substr(0, 2) === '//') {
    	    if (!options.allow_protocol_relative_urls) {
    	      return false;
    	    }

    	    split[0] = url.substr(2);
    	  }

    	  url = split.join('://');

    	  if (url === '') {
    	    return false;
    	  }

    	  split = url.split('/');
    	  url = split.shift();

    	  if (url === '' && !options.require_host) {
    	    return true;
    	  }

    	  split = url.split('@');

    	  if (split.length > 1) {
    	    if (options.disallow_auth) {
    	      return false;
    	    }

    	    if (split[0] === '') {
    	      return false;
    	    }

    	    auth = split.shift();

    	    if (auth.indexOf(':') >= 0 && auth.split(':').length > 2) {
    	      return false;
    	    }

    	    var _auth$split = auth.split(':'),
    	        _auth$split2 = _slicedToArray(_auth$split, 2),
    	        user = _auth$split2[0],
    	        password = _auth$split2[1];

    	    if (user === '' && password === '') {
    	      return false;
    	    }
    	  }

    	  hostname = split.join('@');
    	  port_str = null;
    	  ipv6 = null;
    	  var ipv6_match = hostname.match(wrapped_ipv6);

    	  if (ipv6_match) {
    	    host = '';
    	    ipv6 = ipv6_match[1];
    	    port_str = ipv6_match[2] || null;
    	  } else {
    	    split = hostname.split(':');
    	    host = split.shift();

    	    if (split.length) {
    	      port_str = split.join(':');
    	    }
    	  }

    	  if (port_str !== null && port_str.length > 0) {
    	    port = parseInt(port_str, 10);

    	    if (!/^[0-9]+$/.test(port_str) || port <= 0 || port > 65535) {
    	      return false;
    	    }
    	  } else if (options.require_port) {
    	    return false;
    	  }

    	  if (options.host_whitelist) {
    	    return checkHost(host, options.host_whitelist);
    	  }

    	  if (!(0, _isIP.default)(host) && !(0, _isFQDN.default)(host, options) && (!ipv6 || !(0, _isIP.default)(ipv6, 6))) {
    	    return false;
    	  }

    	  host = host || ipv6;

    	  if (options.host_blacklist && checkHost(host, options.host_blacklist)) {
    	    return false;
    	  }

    	  return true;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isURL$1, isURL$1.exports));

    var isUrlValidator = /*@__PURE__*/getDefaultExportFromCjs(isURL$1.exports);

    var IS_URL = 'isUrl';
    /**
     * Checks if the string is a url.
     * If given value is not a string, then it returns false.
     */
    function isURL(value, options) {
        return typeof value === 'string' && isUrlValidator(value, options);
    }
    /**
     * Checks if the string is a url.
     * If given value is not a string, then it returns false.
     */
    function IsUrl(options, validationOptions) {
        return ValidateBy({
            name: IS_URL,
            constraints: [options],
            validator: {
                validate: function (value, args) { return isURL(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a URL address'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isUUID$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isUUID;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var uuid = {
    	  1: /^[0-9A-F]{8}-[0-9A-F]{4}-1[0-9A-F]{3}-[0-9A-F]{4}-[0-9A-F]{12}$/i,
    	  2: /^[0-9A-F]{8}-[0-9A-F]{4}-2[0-9A-F]{3}-[0-9A-F]{4}-[0-9A-F]{12}$/i,
    	  3: /^[0-9A-F]{8}-[0-9A-F]{4}-3[0-9A-F]{3}-[0-9A-F]{4}-[0-9A-F]{12}$/i,
    	  4: /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    	  5: /^[0-9A-F]{8}-[0-9A-F]{4}-5[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    	  all: /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
    	};

    	function isUUID(str, version) {
    	  (0, _assertString.default)(str);
    	  var pattern = uuid[![undefined, null].includes(version) ? version : 'all'];
    	  return !!pattern && pattern.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isUUID$1, isUUID$1.exports));

    var isUuidValidator = /*@__PURE__*/getDefaultExportFromCjs(isUUID$1.exports);

    var IS_UUID = 'isUuid';
    /**
     * Checks if the string is a UUID (version 3, 4 or 5).
     * If given value is not a string, then it returns false.
     */
    function isUUID(value, version) {
        return typeof value === 'string' && isUuidValidator(value, version);
    }
    /**
     * Checks if the string is a UUID (version 3, 4 or 5).
     * If given value is not a string, then it returns false.
     */
    function IsUUID(version, validationOptions) {
        return ValidateBy({
            name: IS_UUID,
            constraints: [version],
            validator: {
                validate: function (value, args) { return isUUID(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a UUID'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_FIREBASE_PUSH_ID = 'IsFirebasePushId';
    /**
     * Checks if the string is a Firebase Push Id
     * If given value is not a Firebase Push Id, it returns false
     */
    function isFirebasePushId(value) {
        var webSafeRegex = /^[a-zA-Z0-9_-]*$/;
        return typeof value === 'string' && value.length === 20 && webSafeRegex.test(value);
    }
    /**
     * Checks if the string is a Firebase Push Id
     * If given value is not a Firebase Push Id, it returns false
     */
    function IsFirebasePushId(validationOptions) {
        return ValidateBy({
            name: IS_FIREBASE_PUSH_ID,
            validator: {
                validate: function (value, args) { return isFirebasePushId(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a Firebase Push Id'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isUppercase$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isUppercase;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function isUppercase(str) {
    	  (0, _assertString.default)(str);
    	  return str === str.toUpperCase();
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isUppercase$1, isUppercase$1.exports));

    var isUppercaseValidator = /*@__PURE__*/getDefaultExportFromCjs(isUppercase$1.exports);

    var IS_UPPERCASE = 'isUppercase';
    /**
     * Checks if the string is uppercase.
     * If given value is not a string, then it returns false.
     */
    function isUppercase(value) {
        return typeof value === 'string' && isUppercaseValidator(value);
    }
    /**
     * Checks if the string is uppercase.
     * If given value is not a string, then it returns false.
     */
    function IsUppercase(validationOptions) {
        return ValidateBy({
            name: IS_UPPERCASE,
            validator: {
                validate: function (value, args) { return isUppercase(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be uppercase'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isLength = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isLength;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    	/* eslint-disable prefer-rest-params */
    	function isLength(str, options) {
    	  (0, _assertString.default)(str);
    	  var min;
    	  var max;

    	  if (_typeof(options) === 'object') {
    	    min = options.min || 0;
    	    max = options.max;
    	  } else {
    	    // backwards compatibility: isLength(str, min [, max])
    	    min = arguments[1] || 0;
    	    max = arguments[2];
    	  }

    	  var surrogatePairs = str.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || [];
    	  var len = str.length - surrogatePairs.length;
    	  return len >= min && (typeof max === 'undefined' || len <= max);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isLength, isLength.exports));

    var isLengthValidator = /*@__PURE__*/getDefaultExportFromCjs(isLength.exports);

    var IS_LENGTH = 'isLength';
    /**
     * Checks if the string's length falls in a range. Note: this function takes into account surrogate pairs.
     * If given value is not a string, then it returns false.
     */
    function length(value, min, max) {
        return typeof value === 'string' && isLengthValidator(value, { min: min, max: max });
    }
    /**
     * Checks if the string's length falls in a range. Note: this function takes into account surrogate pairs.
     * If given value is not a string, then it returns false.
     */
    function Length(min, max, validationOptions) {
        return ValidateBy({
            name: IS_LENGTH,
            constraints: [min, max],
            validator: {
                validate: function (value, args) { return length(value, args === null || args === void 0 ? void 0 : args.constraints[0], args === null || args === void 0 ? void 0 : args.constraints[1]); },
                defaultMessage: buildMessage(function (eachPrefix, args) {
                    var isMinLength = (args === null || args === void 0 ? void 0 : args.constraints[0]) !== null && (args === null || args === void 0 ? void 0 : args.constraints[0]) !== undefined;
                    var isMaxLength = (args === null || args === void 0 ? void 0 : args.constraints[1]) !== null && (args === null || args === void 0 ? void 0 : args.constraints[1]) !== undefined;
                    if (isMinLength && (!args.value || args.value.length < (args === null || args === void 0 ? void 0 : args.constraints[0]))) {
                        return eachPrefix + '$property must be longer than or equal to $constraint1 characters';
                    }
                    else if (isMaxLength && args.value.length > (args === null || args === void 0 ? void 0 : args.constraints[1])) {
                        return eachPrefix + '$property must be shorter than or equal to $constraint2 characters';
                    }
                    return (eachPrefix +
                        '$property must be longer than or equal to $constraint1 and shorter than or equal to $constraint2 characters');
                }, validationOptions),
            },
        }, validationOptions);
    }

    var MAX_LENGTH = 'maxLength';
    /**
     * Checks if the string's length is not more than given number. Note: this function takes into account surrogate pairs.
     * If given value is not a string, then it returns false.
     */
    function maxLength(value, max) {
        return typeof value === 'string' && isLengthValidator(value, { min: 0, max: max });
    }
    /**
     * Checks if the string's length is not more than given number. Note: this function takes into account surrogate pairs.
     * If given value is not a string, then it returns false.
     */
    function MaxLength(max, validationOptions) {
        return ValidateBy({
            name: MAX_LENGTH,
            constraints: [max],
            validator: {
                validate: function (value, args) { return maxLength(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be shorter than or equal to $constraint1 characters'; }, validationOptions),
            },
        }, validationOptions);
    }

    var MIN_LENGTH = 'minLength';
    /**
     * Checks if the string's length is not less than given number. Note: this function takes into account surrogate pairs.
     * If given value is not a string, then it returns false.
     */
    function minLength(value, min) {
        return typeof value === 'string' && isLengthValidator(value, { min: min });
    }
    /**
     * Checks if the string's length is not less than given number. Note: this function takes into account surrogate pairs.
     * If given value is not a string, then it returns false.
     */
    function MinLength(min, validationOptions) {
        return ValidateBy({
            name: MIN_LENGTH,
            constraints: [min],
            validator: {
                validate: function (value, args) { return minLength(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be longer than or equal to $constraint1 characters'; }, validationOptions),
            },
        }, validationOptions);
    }

    var matches$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = matches;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function matches(str, pattern, modifiers) {
    	  (0, _assertString.default)(str);

    	  if (Object.prototype.toString.call(pattern) !== '[object RegExp]') {
    	    pattern = new RegExp(pattern, modifiers);
    	  }

    	  return pattern.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (matches$1, matches$1.exports));

    var matchesValidator = /*@__PURE__*/getDefaultExportFromCjs(matches$1.exports);

    var MATCHES = 'matches';
    function matches(value, pattern, modifiers) {
        return typeof value === 'string' && matchesValidator(value, pattern, modifiers);
    }
    function Matches(pattern, modifiersOrAnnotationOptions, validationOptions) {
        var modifiers;
        if (modifiersOrAnnotationOptions && modifiersOrAnnotationOptions instanceof Object && !validationOptions) {
            validationOptions = modifiersOrAnnotationOptions;
        }
        else {
            modifiers = modifiersOrAnnotationOptions;
        }
        return ValidateBy({
            name: MATCHES,
            constraints: [pattern, modifiers],
            validator: {
                validate: function (value, args) { return matches(value, args === null || args === void 0 ? void 0 : args.constraints[0], args === null || args === void 0 ? void 0 : args.constraints[1]); },
                defaultMessage: buildMessage(function (eachPrefix, args) { return eachPrefix + '$property must match $constraint1 regular expression'; }, validationOptions),
            },
        }, validationOptions);
    }

    // This file is a workaround for a bug in web browsers' "native"
    // ES6 importing system which is uncapable of importing "*.json" files.
    // https://github.com/catamphetamine/libphonenumber-js/issues/239
    var metadata = {"version":4,"country_calling_codes":{"1":["US","AG","AI","AS","BB","BM","BS","CA","DM","DO","GD","GU","JM","KN","KY","LC","MP","MS","PR","SX","TC","TT","VC","VG","VI"],"7":["RU","KZ"],"20":["EG"],"27":["ZA"],"30":["GR"],"31":["NL"],"32":["BE"],"33":["FR"],"34":["ES"],"36":["HU"],"39":["IT","VA"],"40":["RO"],"41":["CH"],"43":["AT"],"44":["GB","GG","IM","JE"],"45":["DK"],"46":["SE"],"47":["NO","SJ"],"48":["PL"],"49":["DE"],"51":["PE"],"52":["MX"],"53":["CU"],"54":["AR"],"55":["BR"],"56":["CL"],"57":["CO"],"58":["VE"],"60":["MY"],"61":["AU","CC","CX"],"62":["ID"],"63":["PH"],"64":["NZ"],"65":["SG"],"66":["TH"],"81":["JP"],"82":["KR"],"84":["VN"],"86":["CN"],"90":["TR"],"91":["IN"],"92":["PK"],"93":["AF"],"94":["LK"],"95":["MM"],"98":["IR"],"211":["SS"],"212":["MA","EH"],"213":["DZ"],"216":["TN"],"218":["LY"],"220":["GM"],"221":["SN"],"222":["MR"],"223":["ML"],"224":["GN"],"225":["CI"],"226":["BF"],"227":["NE"],"228":["TG"],"229":["BJ"],"230":["MU"],"231":["LR"],"232":["SL"],"233":["GH"],"234":["NG"],"235":["TD"],"236":["CF"],"237":["CM"],"238":["CV"],"239":["ST"],"240":["GQ"],"241":["GA"],"242":["CG"],"243":["CD"],"244":["AO"],"245":["GW"],"246":["IO"],"247":["AC"],"248":["SC"],"249":["SD"],"250":["RW"],"251":["ET"],"252":["SO"],"253":["DJ"],"254":["KE"],"255":["TZ"],"256":["UG"],"257":["BI"],"258":["MZ"],"260":["ZM"],"261":["MG"],"262":["RE","YT"],"263":["ZW"],"264":["NA"],"265":["MW"],"266":["LS"],"267":["BW"],"268":["SZ"],"269":["KM"],"290":["SH","TA"],"291":["ER"],"297":["AW"],"298":["FO"],"299":["GL"],"350":["GI"],"351":["PT"],"352":["LU"],"353":["IE"],"354":["IS"],"355":["AL"],"356":["MT"],"357":["CY"],"358":["FI","AX"],"359":["BG"],"370":["LT"],"371":["LV"],"372":["EE"],"373":["MD"],"374":["AM"],"375":["BY"],"376":["AD"],"377":["MC"],"378":["SM"],"380":["UA"],"381":["RS"],"382":["ME"],"383":["XK"],"385":["HR"],"386":["SI"],"387":["BA"],"389":["MK"],"420":["CZ"],"421":["SK"],"423":["LI"],"500":["FK"],"501":["BZ"],"502":["GT"],"503":["SV"],"504":["HN"],"505":["NI"],"506":["CR"],"507":["PA"],"508":["PM"],"509":["HT"],"590":["GP","BL","MF"],"591":["BO"],"592":["GY"],"593":["EC"],"594":["GF"],"595":["PY"],"596":["MQ"],"597":["SR"],"598":["UY"],"599":["CW","BQ"],"670":["TL"],"672":["NF"],"673":["BN"],"674":["NR"],"675":["PG"],"676":["TO"],"677":["SB"],"678":["VU"],"679":["FJ"],"680":["PW"],"681":["WF"],"682":["CK"],"683":["NU"],"685":["WS"],"686":["KI"],"687":["NC"],"688":["TV"],"689":["PF"],"690":["TK"],"691":["FM"],"692":["MH"],"850":["KP"],"852":["HK"],"853":["MO"],"855":["KH"],"856":["LA"],"880":["BD"],"886":["TW"],"960":["MV"],"961":["LB"],"962":["JO"],"963":["SY"],"964":["IQ"],"965":["KW"],"966":["SA"],"967":["YE"],"968":["OM"],"970":["PS"],"971":["AE"],"972":["IL"],"973":["BH"],"974":["QA"],"975":["BT"],"976":["MN"],"977":["NP"],"992":["TJ"],"993":["TM"],"994":["AZ"],"995":["GE"],"996":["KG"],"998":["UZ"]},"countries":{"AC":["247","00","(?:[01589]\\d|[46])\\d{4}",[5,6]],"AD":["376","00","(?:1|6\\d)\\d{7}|[135-9]\\d{5}",[6,8,9],[["(\\d{3})(\\d{3})","$1 $2",["[135-9]"]],["(\\d{4})(\\d{4})","$1 $2",["1"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["6"]]]],"AE":["971","00","(?:[4-7]\\d|9[0-689])\\d{7}|800\\d{2,9}|[2-4679]\\d{7}",[5,6,7,8,9,10,11,12],[["(\\d{3})(\\d{2,9})","$1 $2",["60|8"]],["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["[236]|[479][2-8]"],"0$1"],["(\\d{3})(\\d)(\\d{5})","$1 $2 $3",["[479]"]],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["5"],"0$1"]],"0"],"AF":["93","00","[2-7]\\d{8}",[9],[["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[2-7]"],"0$1"]],"0"],"AG":["1","011","(?:268|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([457]\\d{6})$","268$1",0,"268"],"AI":["1","011","(?:264|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2457]\\d{6})$","264$1",0,"264"],"AL":["355","00","(?:700\\d\\d|900)\\d{3}|8\\d{5,7}|(?:[2-5]|6\\d)\\d{7}",[6,7,8,9],[["(\\d{3})(\\d{3,4})","$1 $2",["80|9"],"0$1"],["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["4[2-6]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[2358][2-5]|4"],"0$1"],["(\\d{3})(\\d{5})","$1 $2",["[23578]"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["6"],"0$1"]],"0"],"AM":["374","00","(?:[1-489]\\d|55|60|77)\\d{6}",[8],[["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["[89]0"],"0 $1"],["(\\d{3})(\\d{5})","$1 $2",["2|3[12]"],"(0$1)"],["(\\d{2})(\\d{6})","$1 $2",["1|47"],"(0$1)"],["(\\d{2})(\\d{6})","$1 $2",["[3-9]"],"0$1"]],"0"],"AO":["244","00","[29]\\d{8}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[29]"]]]],"AR":["54","00","(?:11|[89]\\d\\d)\\d{8}|[2368]\\d{9}",[10,11],[["(\\d{4})(\\d{2})(\\d{4})","$1 $2-$3",["2(?:2[024-9]|3[0-59]|47|6[245]|9[02-8])|3(?:3[28]|4[03-9]|5[2-46-8]|7[1-578]|8[2-9])","2(?:[23]02|6(?:[25]|4[6-8])|9(?:[02356]|4[02568]|72|8[23]))|3(?:3[28]|4(?:[04679]|3[5-8]|5[4-68]|8[2379])|5(?:[2467]|3[237]|8[2-5])|7[1-578]|8(?:[2469]|3[2578]|5[4-8]|7[36-8]|8[5-8]))|2(?:2[24-9]|3[1-59]|47)","2(?:[23]02|6(?:[25]|4(?:64|[78]))|9(?:[02356]|4(?:[0268]|5[2-6])|72|8[23]))|3(?:3[28]|4(?:[04679]|3[78]|5(?:4[46]|8)|8[2379])|5(?:[2467]|3[237]|8[23])|7[1-578]|8(?:[2469]|3[278]|5[56][46]|86[3-6]))|2(?:2[24-9]|3[1-59]|47)|38(?:[58][78]|7[378])|3(?:4[35][56]|58[45]|8(?:[38]5|54|76))[4-6]","2(?:[23]02|6(?:[25]|4(?:64|[78]))|9(?:[02356]|4(?:[0268]|5[2-6])|72|8[23]))|3(?:3[28]|4(?:[04679]|3(?:5(?:4[0-25689]|[56])|[78])|58|8[2379])|5(?:[2467]|3[237]|8(?:[23]|4(?:[45]|60)|5(?:4[0-39]|5|64)))|7[1-578]|8(?:[2469]|3[278]|54(?:4|5[13-7]|6[89])|86[3-6]))|2(?:2[24-9]|3[1-59]|47)|38(?:[58][78]|7[378])|3(?:454|85[56])[46]|3(?:4(?:36|5[56])|8(?:[38]5|76))[4-6]"],"0$1",1],["(\\d{2})(\\d{4})(\\d{4})","$1 $2-$3",["1"],"0$1",1],["(\\d{3})(\\d{3})(\\d{4})","$1-$2-$3",["[68]"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2-$3",["[23]"],"0$1",1],["(\\d)(\\d{4})(\\d{2})(\\d{4})","$2 15-$3-$4",["9(?:2[2-469]|3[3-578])","9(?:2(?:2[024-9]|3[0-59]|47|6[245]|9[02-8])|3(?:3[28]|4[03-9]|5[2-46-8]|7[1-578]|8[2-9]))","9(?:2(?:[23]02|6(?:[25]|4[6-8])|9(?:[02356]|4[02568]|72|8[23]))|3(?:3[28]|4(?:[04679]|3[5-8]|5[4-68]|8[2379])|5(?:[2467]|3[237]|8[2-5])|7[1-578]|8(?:[2469]|3[2578]|5[4-8]|7[36-8]|8[5-8])))|92(?:2[24-9]|3[1-59]|47)","9(?:2(?:[23]02|6(?:[25]|4(?:64|[78]))|9(?:[02356]|4(?:[0268]|5[2-6])|72|8[23]))|3(?:3[28]|4(?:[04679]|3[78]|5(?:4[46]|8)|8[2379])|5(?:[2467]|3[237]|8[23])|7[1-578]|8(?:[2469]|3[278]|5(?:[56][46]|[78])|7[378]|8(?:6[3-6]|[78]))))|92(?:2[24-9]|3[1-59]|47)|93(?:4[35][56]|58[45]|8(?:[38]5|54|76))[4-6]","9(?:2(?:[23]02|6(?:[25]|4(?:64|[78]))|9(?:[02356]|4(?:[0268]|5[2-6])|72|8[23]))|3(?:3[28]|4(?:[04679]|3(?:5(?:4[0-25689]|[56])|[78])|5(?:4[46]|8)|8[2379])|5(?:[2467]|3[237]|8(?:[23]|4(?:[45]|60)|5(?:4[0-39]|5|64)))|7[1-578]|8(?:[2469]|3[278]|5(?:4(?:4|5[13-7]|6[89])|[56][46]|[78])|7[378]|8(?:6[3-6]|[78]))))|92(?:2[24-9]|3[1-59]|47)|93(?:4(?:36|5[56])|8(?:[38]5|76))[4-6]"],"0$1",0,"$1 $2 $3-$4"],["(\\d)(\\d{2})(\\d{4})(\\d{4})","$2 15-$3-$4",["91"],"0$1",0,"$1 $2 $3-$4"],["(\\d{3})(\\d{3})(\\d{5})","$1-$2-$3",["8"],"0$1"],["(\\d)(\\d{3})(\\d{3})(\\d{4})","$2 15-$3-$4",["9"],"0$1",0,"$1 $2 $3-$4"]],"0",0,"0?(?:(11|2(?:2(?:02?|[13]|2[13-79]|4[1-6]|5[2457]|6[124-8]|7[1-4]|8[13-6]|9[1267])|3(?:02?|1[467]|2[03-6]|3[13-8]|[49][2-6]|5[2-8]|[67])|4(?:7[3-578]|9)|6(?:[0136]|2[24-6]|4[6-8]?|5[15-8])|80|9(?:0[1-3]|[19]|2\\d|3[1-6]|4[02568]?|5[2-4]|6[2-46]|72?|8[23]?))|3(?:3(?:2[79]|6|8[2578])|4(?:0[0-24-9]|[12]|3[5-8]?|4[24-7]|5[4-68]?|6[02-9]|7[126]|8[2379]?|9[1-36-8])|5(?:1|2[1245]|3[237]?|4[1-46-9]|6[2-4]|7[1-6]|8[2-5]?)|6[24]|7(?:[069]|1[1568]|2[15]|3[145]|4[13]|5[14-8]|7[2-57]|8[126])|8(?:[01]|2[15-7]|3[2578]?|4[13-6]|5[4-8]?|6[1-357-9]|7[36-8]?|8[5-8]?|9[124])))15)?","9$1"],"AS":["1","011","(?:[58]\\d\\d|684|900)\\d{7}",[10],0,"1",0,"1|([267]\\d{6})$","684$1",0,"684"],"AT":["43","00","1\\d{3,12}|2\\d{6,12}|43(?:(?:0\\d|5[02-9])\\d{3,9}|2\\d{4,5}|[3467]\\d{4}|8\\d{4,6}|9\\d{4,7})|5\\d{4,12}|8\\d{7,12}|9\\d{8,12}|(?:[367]\\d|4[0-24-9])\\d{4,11}",[4,5,6,7,8,9,10,11,12,13],[["(\\d)(\\d{3,12})","$1 $2",["1(?:11|[2-9])"],"0$1"],["(\\d{3})(\\d{2})","$1 $2",["517"],"0$1"],["(\\d{2})(\\d{3,5})","$1 $2",["5[079]"],"0$1"],["(\\d{3})(\\d{3,10})","$1 $2",["(?:31|4)6|51|6(?:5[0-3579]|[6-9])|7(?:20|32|8)|[89]"],"0$1"],["(\\d{4})(\\d{3,9})","$1 $2",["[2-467]|5[2-6]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["5"],"0$1"],["(\\d{2})(\\d{4})(\\d{4,7})","$1 $2 $3",["5"],"0$1"]],"0"],"AU":["61","001[14-689]|14(?:1[14]|34|4[17]|[56]6|7[47]|88)0011","1(?:[0-79]\\d{7}(?:\\d(?:\\d{2})?)?|8[0-24-9]\\d{7})|[2-478]\\d{8}|1\\d{4,7}",[5,6,7,8,9,10,12],[["(\\d{2})(\\d{3,4})","$1 $2",["16"],"0$1"],["(\\d{2})(\\d{3})(\\d{2,4})","$1 $2 $3",["16"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["14|4"],"0$1"],["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["[2378]"],"(0$1)"],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["1(?:30|[89])"]]],"0",0,"0|(183[12])",0,0,0,[["(?:(?:2(?:[0-26-9]\\d|3[0-8]|4[02-9]|5[0135-9])|3(?:[0-3589]\\d|4[0-578]|6[1-9]|7[0-35-9])|7(?:[013-57-9]\\d|2[0-8]))\\d{3}|8(?:51(?:0(?:0[03-9]|[12479]\\d|3[2-9]|5[0-8]|6[1-9]|8[0-7])|1(?:[0235689]\\d|1[0-69]|4[0-589]|7[0-47-9])|2(?:0[0-79]|[18][13579]|2[14-9]|3[0-46-9]|[4-6]\\d|7[89]|9[0-4]))|(?:6[0-8]|[78]\\d)\\d{3}|9(?:[02-9]\\d{3}|1(?:(?:[0-58]\\d|6[0135-9])\\d|7(?:0[0-24-9]|[1-9]\\d)|9(?:[0-46-9]\\d|5[0-79])))))\\d{3}",[9]],["4(?:83[0-38]|93[0-6])\\d{5}|4(?:[0-3]\\d|4[047-9]|5[0-25-9]|6[016-9]|7[02-9]|8[0-24-9]|9[0-27-9])\\d{6}",[9]],["180(?:0\\d{3}|2)\\d{3}",[7,10]],["190[0-26]\\d{6}",[10]],0,0,0,["163\\d{2,6}",[5,6,7,8,9]],["14(?:5(?:1[0458]|[23][458])|71\\d)\\d{4}",[9]],["13(?:00\\d{6}(?:\\d{2})?|45[0-4]\\d{3})|13\\d{4}",[6,8,10,12]]],"0011"],"AW":["297","00","(?:[25-79]\\d\\d|800)\\d{4}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[25-9]"]]]],"AX":["358","00|99(?:[01469]|5(?:[14]1|3[23]|5[59]|77|88|9[09]))","2\\d{4,9}|35\\d{4,5}|(?:60\\d\\d|800)\\d{4,6}|7\\d{5,11}|(?:[14]\\d|3[0-46-9]|50)\\d{4,8}",[5,6,7,8,9,10,11,12],0,"0",0,0,0,0,"18",0,"00"],"AZ":["994","00","365\\d{6}|(?:[124579]\\d|60|88)\\d{7}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["90"],"0$1"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["1[28]|2|365|46","1[28]|2|365[45]|46","1[28]|2|365(?:4|5[02])|46"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[13-9]"],"0$1"]],"0"],"BA":["387","00","6\\d{8}|(?:[35689]\\d|49|70)\\d{6}",[8,9],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["6[1-3]|[7-9]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2-$3",["[3-5]|6[56]"],"0$1"],["(\\d{2})(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3 $4",["6"],"0$1"]],"0"],"BB":["1","011","(?:246|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-9]\\d{6})$","246$1",0,"246"],"BD":["880","00","[1-469]\\d{9}|8[0-79]\\d{7,8}|[2-79]\\d{8}|[2-9]\\d{7}|[3-9]\\d{6}|[57-9]\\d{5}",[6,7,8,9,10],[["(\\d{2})(\\d{4,6})","$1-$2",["31[5-8]|[459]1"],"0$1"],["(\\d{3})(\\d{3,7})","$1-$2",["3(?:[67]|8[013-9])|4(?:6[168]|7|[89][18])|5(?:6[128]|9)|6(?:28|4[14]|5)|7[2-589]|8(?:0[014-9]|[12])|9[358]|(?:3[2-5]|4[235]|5[2-578]|6[0389]|76|8[3-7]|9[24])1|(?:44|66)[01346-9]"],"0$1"],["(\\d{4})(\\d{3,6})","$1-$2",["[13-9]|22"],"0$1"],["(\\d)(\\d{7,8})","$1-$2",["2"],"0$1"]],"0"],"BE":["32","00","4\\d{8}|[1-9]\\d{7}",[8,9],[["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["(?:80|9)0"],"0$1"],["(\\d)(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[239]|4[23]"],"0$1"],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[15-8]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["4"],"0$1"]],"0"],"BF":["226","00","[025-7]\\d{7}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[025-7]"]]]],"BG":["359","00","[2-7]\\d{6,7}|[89]\\d{6,8}|2\\d{5}",[6,7,8,9],[["(\\d)(\\d)(\\d{2})(\\d{2})","$1 $2 $3 $4",["2"],"0$1"],["(\\d{3})(\\d{4})","$1 $2",["43[1-6]|70[1-9]"],"0$1"],["(\\d)(\\d{3})(\\d{3,4})","$1 $2 $3",["2"],"0$1"],["(\\d{2})(\\d{3})(\\d{2,3})","$1 $2 $3",["[356]|4[124-7]|7[1-9]|8[1-6]|9[1-7]"],"0$1"],["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["(?:70|8)0"],"0$1"],["(\\d{3})(\\d{3})(\\d{2})","$1 $2 $3",["43[1-7]|7"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[48]|9[08]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["9"],"0$1"]],"0"],"BH":["973","00","[136-9]\\d{7}",[8],[["(\\d{4})(\\d{4})","$1 $2",["[13679]|8[047]"]]]],"BI":["257","00","(?:[267]\\d|31)\\d{6}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2367]"]]]],"BJ":["229","00","(?:[25689]\\d|40)\\d{6}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[24-689]"]]]],"BL":["590","00","(?:590|(?:69|80)\\d|976)\\d{6}",[9],0,"0",0,0,0,0,0,[["590(?:2[7-9]|5[12]|87)\\d{4}"],["69(?:0\\d\\d|1(?:2[2-9]|3[0-5]))\\d{4}"],["80[0-5]\\d{6}"],0,0,0,0,0,["976[01]\\d{5}"]]],"BM":["1","011","(?:441|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-8]\\d{6})$","441$1",0,"441"],"BN":["673","00","[2-578]\\d{6}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[2-578]"]]]],"BO":["591","00(?:1\\d)?","(?:[2-467]\\d\\d|8001)\\d{5}",[8,9],[["(\\d)(\\d{7})","$1 $2",["[23]|4[46]"]],["(\\d{8})","$1",["[67]"]],["(\\d{3})(\\d{2})(\\d{4})","$1 $2 $3",["8"]]],"0",0,"0(1\\d)?"],"BQ":["599","00","(?:[34]1|7\\d)\\d{5}",[7],0,0,0,0,0,0,"[347]"],"BR":["55","00(?:1[245]|2[1-35]|31|4[13]|[56]5|99)","(?:[1-46-9]\\d\\d|5(?:[0-46-9]\\d|5[0-46-9]))\\d{8}|[1-9]\\d{9}|[3589]\\d{8}|[34]\\d{7}",[8,9,10,11],[["(\\d{4})(\\d{4})","$1-$2",["300|4(?:0[02]|37)","4(?:02|37)0|[34]00"]],["(\\d{3})(\\d{2,3})(\\d{4})","$1 $2 $3",["(?:[358]|90)0"],"0$1"],["(\\d{2})(\\d{4})(\\d{4})","$1 $2-$3",["(?:[14689][1-9]|2[12478]|3[1-578]|5[13-5]|7[13-579])[2-57]"],"($1)"],["(\\d{2})(\\d{5})(\\d{4})","$1 $2-$3",["[16][1-9]|[2-57-9]"],"($1)"]],"0",0,"(?:0|90)(?:(1[245]|2[1-35]|31|4[13]|[56]5|99)(\\d{10,11}))?","$2"],"BS":["1","011","(?:242|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([3-8]\\d{6})$","242$1",0,"242"],"BT":["975","00","[17]\\d{7}|[2-8]\\d{6}",[7,8],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["[2-68]|7[246]"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["1[67]|7"]]]],"BW":["267","00","(?:0800|(?:[37]|800)\\d)\\d{6}|(?:[2-6]\\d|90)\\d{5}",[7,8,10],[["(\\d{2})(\\d{5})","$1 $2",["90"]],["(\\d{3})(\\d{4})","$1 $2",["[24-6]|3[15-79]"]],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[37]"]],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["0"]],["(\\d{3})(\\d{4})(\\d{3})","$1 $2 $3",["8"]]]],"BY":["375","810","(?:[12]\\d|33|44|902)\\d{7}|8(?:0[0-79]\\d{5,7}|[1-7]\\d{9})|8(?:1[0-489]|[5-79]\\d)\\d{7}|8[1-79]\\d{6,7}|8[0-79]\\d{5}|8\\d{5}",[6,7,8,9,10,11],[["(\\d{3})(\\d{3})","$1 $2",["800"],"8 $1"],["(\\d{3})(\\d{2})(\\d{2,4})","$1 $2 $3",["800"],"8 $1"],["(\\d{4})(\\d{2})(\\d{3})","$1 $2-$3",["1(?:5[169]|6[3-5]|7[179])|2(?:1[35]|2[34]|3[3-5])","1(?:5[169]|6(?:3[1-3]|4|5[125])|7(?:1[3-9]|7[0-24-6]|9[2-7]))|2(?:1[35]|2[34]|3[3-5])"],"8 0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2-$3-$4",["1(?:[56]|7[467])|2[1-3]"],"8 0$1"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2-$3-$4",["[1-4]"],"8 0$1"],["(\\d{3})(\\d{3,4})(\\d{4})","$1 $2 $3",["[89]"],"8 $1"]],"8",0,"0|80?",0,0,0,0,"8~10"],"BZ":["501","00","(?:0800\\d|[2-8])\\d{6}",[7,11],[["(\\d{3})(\\d{4})","$1-$2",["[2-8]"]],["(\\d)(\\d{3})(\\d{4})(\\d{3})","$1-$2-$3-$4",["0"]]]],"CA":["1","011","(?:[2-8]\\d|90)\\d{8}|3\\d{6}",[7,10],0,"1",0,0,0,0,0,[["(?:2(?:04|[23]6|[48]9|50|63)|3(?:06|43|6[578])|4(?:03|1[68]|3[178]|50|68|74)|5(?:06|1[49]|48|79|8[147])|6(?:04|13|39|47|72)|7(?:0[59]|42|53|78|8[02])|8(?:[06]7|19|25|73)|90[25])[2-9]\\d{6}",[10]],["",[10]],["8(?:00|33|44|55|66|77|88)[2-9]\\d{6}",[10]],["900[2-9]\\d{6}",[10]],["52(?:3(?:[2-46-9][02-9]\\d|5(?:[02-46-9]\\d|5[0-46-9]))|4(?:[2-478][02-9]\\d|5(?:[034]\\d|2[024-9]|5[0-46-9])|6(?:0[1-9]|[2-9]\\d)|9(?:[05-9]\\d|2[0-5]|49)))\\d{4}|52[34][2-9]1[02-9]\\d{4}|(?:5(?:00|2[125-7]|33|44|66|77|88)|622)[2-9]\\d{6}",[10]],0,["310\\d{4}",[7]],0,["600[2-9]\\d{6}",[10]]]],"CC":["61","001[14-689]|14(?:1[14]|34|4[17]|[56]6|7[47]|88)0011","1(?:[0-79]\\d{8}(?:\\d{2})?|8[0-24-9]\\d{7})|[148]\\d{8}|1\\d{5,7}",[6,7,8,9,10,12],0,"0",0,"0|([59]\\d{7})$","8$1",0,0,[["8(?:51(?:0(?:02|31|60|89)|1(?:18|76)|223)|91(?:0(?:1[0-2]|29)|1(?:[28]2|50|79)|2(?:10|64)|3(?:[06]8|22)|4[29]8|62\\d|70[23]|959))\\d{3}",[9]],["4(?:83[0-38]|93[0-6])\\d{5}|4(?:[0-3]\\d|4[047-9]|5[0-25-9]|6[016-9]|7[02-9]|8[0-24-9]|9[0-27-9])\\d{6}",[9]],["180(?:0\\d{3}|2)\\d{3}",[7,10]],["190[0-26]\\d{6}",[10]],0,0,0,0,["14(?:5(?:1[0458]|[23][458])|71\\d)\\d{4}",[9]],["13(?:00\\d{6}(?:\\d{2})?|45[0-4]\\d{3})|13\\d{4}",[6,8,10,12]]],"0011"],"CD":["243","00","[189]\\d{8}|[1-68]\\d{6}",[7,9],[["(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3",["88"],"0$1"],["(\\d{2})(\\d{5})","$1 $2",["[1-6]"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["1"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[89]"],"0$1"]],"0"],"CF":["236","00","(?:[27]\\d{3}|8776)\\d{4}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[278]"]]]],"CG":["242","00","222\\d{6}|(?:0\\d|80)\\d{7}",[9],[["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["8"]],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[02]"]]]],"CH":["41","00","8\\d{11}|[2-9]\\d{8}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["8[047]|90"],"0$1"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2-79]|81"],"0$1"],["(\\d{3})(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4 $5",["8"],"0$1"]],"0"],"CI":["225","00","[02]\\d{9}",[10],[["(\\d{2})(\\d{2})(\\d)(\\d{5})","$1 $2 $3 $4",["2"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{4})","$1 $2 $3 $4",["0"]]]],"CK":["682","00","[2-578]\\d{4}",[5],[["(\\d{2})(\\d{3})","$1 $2",["[2-578]"]]]],"CL":["56","(?:0|1(?:1[0-69]|2[02-5]|5[13-58]|69|7[0167]|8[018]))0","12300\\d{6}|6\\d{9,10}|[2-9]\\d{8}",[9,10,11],[["(\\d{5})(\\d{4})","$1 $2",["219","2196"],"($1)"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["44"]],["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["2[1-36]"],"($1)"],["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["9[2-9]"]],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["3[2-5]|[47]|5[1-3578]|6[13-57]|8(?:0[1-9]|[1-9])"],"($1)"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["60|8"]],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["1"]],["(\\d{3})(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3 $4",["60"]]]],"CM":["237","00","[26]\\d{8}|88\\d{6,7}",[8,9],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["88"]],["(\\d)(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4 $5",["[26]|88"]]]],"CN":["86","00|1(?:[12]\\d|79)\\d\\d00","1[127]\\d{8,9}|2\\d{9}(?:\\d{2})?|[12]\\d{6,7}|86\\d{6}|(?:1[03-689]\\d|6)\\d{7,9}|(?:[3-579]\\d|8[0-57-9])\\d{6,9}",[7,8,9,10,11,12],[["(\\d{2})(\\d{5,6})","$1 $2",["(?:10|2[0-57-9])[19]","(?:10|2[0-57-9])(?:10|9[56])","(?:10|2[0-57-9])(?:100|9[56])"],"0$1"],["(\\d{3})(\\d{5,6})","$1 $2",["3(?:[157]|35|49|9[1-68])|4(?:[17]|2[179]|6[47-9]|8[23])|5(?:[1357]|2[37]|4[36]|6[1-46]|80)|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|[379]|4[13]|5[1-5])|(?:4[35]|59|85)[1-9]","(?:3(?:[157]\\d|35|49|9[1-68])|4(?:[17]\\d|2[179]|[35][1-9]|6[47-9]|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]\\d|5[1-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|[379]\\d|4[13]|5[1-5]))[19]","85[23](?:10|95)|(?:3(?:[157]\\d|35|49|9[1-68])|4(?:[17]\\d|2[179]|[35][1-9]|6[47-9]|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]\\d|5[14-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|[379]\\d|4[13]|5[1-5]))(?:10|9[56])","85[23](?:100|95)|(?:3(?:[157]\\d|35|49|9[1-68])|4(?:[17]\\d|2[179]|[35][1-9]|6[47-9]|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]\\d|5[14-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|[379]\\d|4[13]|5[1-5]))(?:100|9[56])"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["(?:4|80)0"]],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["10|2(?:[02-57-9]|1[1-9])","10|2(?:[02-57-9]|1[1-9])","10[0-79]|2(?:[02-57-9]|1[1-79])|(?:10|21)8(?:0[1-9]|[1-9])"],"0$1",1],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["3(?:[3-59]|7[02-68])|4(?:[26-8]|3[3-9]|5[2-9])|5(?:3[03-9]|[468]|7[028]|9[2-46-9])|6|7(?:[0-247]|3[04-9]|5[0-4689]|6[2368])|8(?:[1-358]|9[1-7])|9(?:[013479]|5[1-5])|(?:[34]1|55|79|87)[02-9]"],"0$1",1],["(\\d{3})(\\d{7,8})","$1 $2",["9"]],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["80"],"0$1",1],["(\\d{3})(\\d{4})(\\d{4})","$1 $2 $3",["[3-578]"],"0$1",1],["(\\d{3})(\\d{4})(\\d{4})","$1 $2 $3",["1[3-9]"]],["(\\d{2})(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3 $4",["[12]"],"0$1",1]],"0",0,"0|(1(?:[12]\\d|79)\\d\\d)",0,0,0,0,"00"],"CO":["57","00(?:4(?:[14]4|56)|[579])","(?:60\\d\\d|9101)\\d{6}|(?:1\\d|3)\\d{9}",[10,11],[["(\\d{3})(\\d{7})","$1 $2",["6"],"($1)"],["(\\d{3})(\\d{7})","$1 $2",["3[0-357]|91"]],["(\\d)(\\d{3})(\\d{7})","$1-$2-$3",["1"],"0$1",0,"$1 $2 $3"]],"0",0,"0(4(?:[14]4|56)|[579])?"],"CR":["506","00","(?:8\\d|90)\\d{8}|(?:[24-8]\\d{3}|3005)\\d{4}",[8,10],[["(\\d{4})(\\d{4})","$1 $2",["[2-7]|8[3-9]"]],["(\\d{3})(\\d{3})(\\d{4})","$1-$2-$3",["[89]"]]],0,0,"(19(?:0[0-2468]|1[09]|20|66|77|99))"],"CU":["53","119","[27]\\d{6,7}|[34]\\d{5,7}|(?:5|8\\d\\d)\\d{7}",[6,7,8,10],[["(\\d{2})(\\d{4,6})","$1 $2",["2[1-4]|[34]"],"(0$1)"],["(\\d)(\\d{6,7})","$1 $2",["7"],"(0$1)"],["(\\d)(\\d{7})","$1 $2",["5"],"0$1"],["(\\d{3})(\\d{7})","$1 $2",["8"],"0$1"]],"0"],"CV":["238","0","(?:[2-59]\\d\\d|800)\\d{4}",[7],[["(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3",["[2-589]"]]]],"CW":["599","00","(?:[34]1|60|(?:7|9\\d)\\d)\\d{5}",[7,8],[["(\\d{3})(\\d{4})","$1 $2",["[3467]"]],["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["9[4-8]"]]],0,0,0,0,0,"[69]"],"CX":["61","001[14-689]|14(?:1[14]|34|4[17]|[56]6|7[47]|88)0011","1(?:[0-79]\\d{8}(?:\\d{2})?|8[0-24-9]\\d{7})|[148]\\d{8}|1\\d{5,7}",[6,7,8,9,10,12],0,"0",0,"0|([59]\\d{7})$","8$1",0,0,[["8(?:51(?:0(?:01|30|59|88)|1(?:17|46|75)|2(?:22|35))|91(?:00[6-9]|1(?:[28]1|49|78)|2(?:09|63)|3(?:12|26|75)|4(?:56|97)|64\\d|7(?:0[01]|1[0-2])|958))\\d{3}",[9]],["4(?:83[0-38]|93[0-6])\\d{5}|4(?:[0-3]\\d|4[047-9]|5[0-25-9]|6[016-9]|7[02-9]|8[0-24-9]|9[0-27-9])\\d{6}",[9]],["180(?:0\\d{3}|2)\\d{3}",[7,10]],["190[0-26]\\d{6}",[10]],0,0,0,0,["14(?:5(?:1[0458]|[23][458])|71\\d)\\d{4}",[9]],["13(?:00\\d{6}(?:\\d{2})?|45[0-4]\\d{3})|13\\d{4}",[6,8,10,12]]],"0011"],"CY":["357","00","(?:[279]\\d|[58]0)\\d{6}",[8],[["(\\d{2})(\\d{6})","$1 $2",["[257-9]"]]]],"CZ":["420","00","(?:[2-578]\\d|60)\\d{7}|9\\d{8,11}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[2-8]|9[015-7]"]],["(\\d{2})(\\d{3})(\\d{3})(\\d{2})","$1 $2 $3 $4",["96"]],["(\\d{2})(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["9"]],["(\\d{3})(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["9"]]]],"DE":["49","00","[2579]\\d{5,14}|49(?:[34]0|69|8\\d)\\d\\d?|49(?:37|49|60|7[089]|9\\d)\\d{1,3}|49(?:2[024-9]|3[2-689]|7[1-7])\\d{1,8}|(?:1|[368]\\d|4[0-8])\\d{3,13}|49(?:[015]\\d|2[13]|31|[46][1-8])\\d{1,9}",[4,5,6,7,8,9,10,11,12,13,14,15],[["(\\d{2})(\\d{3,13})","$1 $2",["3[02]|40|[68]9"],"0$1"],["(\\d{3})(\\d{3,12})","$1 $2",["2(?:0[1-389]|1[124]|2[18]|3[14])|3(?:[35-9][15]|4[015])|906|(?:2[4-9]|4[2-9]|[579][1-9]|[68][1-8])1","2(?:0[1-389]|12[0-8])|3(?:[35-9][15]|4[015])|906|2(?:[13][14]|2[18])|(?:2[4-9]|4[2-9]|[579][1-9]|[68][1-8])1"],"0$1"],["(\\d{4})(\\d{2,11})","$1 $2",["[24-6]|3(?:[3569][02-46-9]|4[2-4679]|7[2-467]|8[2-46-8])|70[2-8]|8(?:0[2-9]|[1-8])|90[7-9]|[79][1-9]","[24-6]|3(?:3(?:0[1-467]|2[127-9]|3[124578]|7[1257-9]|8[1256]|9[145])|4(?:2[135]|4[13578]|9[1346])|5(?:0[14]|2[1-3589]|6[1-4]|7[13468]|8[13568])|6(?:2[1-489]|3[124-6]|6[13]|7[12579]|8[1-356]|9[135])|7(?:2[1-7]|4[145]|6[1-5]|7[1-4])|8(?:21|3[1468]|6|7[1467]|8[136])|9(?:0[12479]|2[1358]|4[134679]|6[1-9]|7[136]|8[147]|9[1468]))|70[2-8]|8(?:0[2-9]|[1-8])|90[7-9]|[79][1-9]|3[68]4[1347]|3(?:47|60)[1356]|3(?:3[46]|46|5[49])[1246]|3[4579]3[1357]"],"0$1"],["(\\d{3})(\\d{4})","$1 $2",["138"],"0$1"],["(\\d{5})(\\d{2,10})","$1 $2",["3"],"0$1"],["(\\d{3})(\\d{5,11})","$1 $2",["181"],"0$1"],["(\\d{3})(\\d)(\\d{4,10})","$1 $2 $3",["1(?:3|80)|9"],"0$1"],["(\\d{3})(\\d{7,8})","$1 $2",["1[67]"],"0$1"],["(\\d{3})(\\d{7,12})","$1 $2",["8"],"0$1"],["(\\d{5})(\\d{6})","$1 $2",["185","1850","18500"],"0$1"],["(\\d{3})(\\d{4})(\\d{4})","$1 $2 $3",["7"],"0$1"],["(\\d{4})(\\d{7})","$1 $2",["18[68]"],"0$1"],["(\\d{5})(\\d{6})","$1 $2",["15[0568]"],"0$1"],["(\\d{4})(\\d{7})","$1 $2",["15[1279]"],"0$1"],["(\\d{3})(\\d{8})","$1 $2",["18"],"0$1"],["(\\d{3})(\\d{2})(\\d{7,8})","$1 $2 $3",["1(?:6[023]|7)"],"0$1"],["(\\d{4})(\\d{2})(\\d{7})","$1 $2 $3",["15[279]"],"0$1"],["(\\d{3})(\\d{2})(\\d{8})","$1 $2 $3",["15"],"0$1"]],"0"],"DJ":["253","00","(?:2\\d|77)\\d{6}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[27]"]]]],"DK":["45","00","[2-9]\\d{7}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2-9]"]]]],"DM":["1","011","(?:[58]\\d\\d|767|900)\\d{7}",[10],0,"1",0,"1|([2-7]\\d{6})$","767$1",0,"767"],"DO":["1","011","(?:[58]\\d\\d|900)\\d{7}",[10],0,"1",0,0,0,0,"8001|8[024]9"],"DZ":["213","00","(?:[1-4]|[5-79]\\d|80)\\d{7}",[8,9],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[1-4]"],"0$1"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["9"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[5-8]"],"0$1"]],"0"],"EC":["593","00","1\\d{9,10}|(?:[2-7]|9\\d)\\d{7}",[8,9,10,11],[["(\\d)(\\d{3})(\\d{4})","$1 $2-$3",["[2-7]"],"(0$1)",0,"$1-$2-$3"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["9"],"0$1"],["(\\d{4})(\\d{3})(\\d{3,4})","$1 $2 $3",["1"]]],"0"],"EE":["372","00","8\\d{9}|[4578]\\d{7}|(?:[3-8]\\d|90)\\d{5}",[7,8,10],[["(\\d{3})(\\d{4})","$1 $2",["[369]|4[3-8]|5(?:[0-2]|5[0-478]|6[45])|7[1-9]|88","[369]|4[3-8]|5(?:[02]|1(?:[0-8]|95)|5[0-478]|6(?:4[0-4]|5[1-589]))|7[1-9]|88"]],["(\\d{4})(\\d{3,4})","$1 $2",["[45]|8(?:00|[1-49])","[45]|8(?:00[1-9]|[1-49])"]],["(\\d{2})(\\d{2})(\\d{4})","$1 $2 $3",["7"]],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["8"]]]],"EG":["20","00","[189]\\d{8,9}|[24-6]\\d{8}|[135]\\d{7}",[8,9,10],[["(\\d)(\\d{7,8})","$1 $2",["[23]"],"0$1"],["(\\d{2})(\\d{6,7})","$1 $2",["1[35]|[4-6]|8[2468]|9[235-7]"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["[189]"],"0$1"]],"0"],"EH":["212","00","[5-8]\\d{8}",[9],0,"0",0,0,0,0,"528[89]"],"ER":["291","00","[178]\\d{6}",[7],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["[178]"],"0$1"]],"0"],"ES":["34","00","[5-9]\\d{8}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[89]00"]],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[5-9]"]]]],"ET":["251","00","(?:11|[2-579]\\d)\\d{7}",[9],[["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[1-579]"],"0$1"]],"0"],"FI":["358","00|99(?:[01469]|5(?:[14]1|3[23]|5[59]|77|88|9[09]))","[1-35689]\\d{4}|7\\d{10,11}|(?:[124-7]\\d|3[0-46-9])\\d{8}|[1-9]\\d{5,8}",[5,6,7,8,9,10,11,12],[["(\\d)(\\d{4,9})","$1 $2",["[2568][1-8]|3(?:0[1-9]|[1-9])|9"],"0$1"],["(\\d{3})(\\d{3,7})","$1 $2",["[12]00|[368]|70[07-9]"],"0$1"],["(\\d{2})(\\d{4,8})","$1 $2",["[1245]|7[135]"],"0$1"],["(\\d{2})(\\d{6,10})","$1 $2",["7"],"0$1"]],"0",0,0,0,0,"1[03-79]|[2-9]",0,"00"],"FJ":["679","0(?:0|52)","45\\d{5}|(?:0800\\d|[235-9])\\d{6}",[7,11],[["(\\d{3})(\\d{4})","$1 $2",["[235-9]|45"]],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["0"]]],0,0,0,0,0,0,0,"00"],"FK":["500","00","[2-7]\\d{4}",[5]],"FM":["691","00","(?:[39]\\d\\d|820)\\d{4}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[389]"]]]],"FO":["298","00","[2-9]\\d{5}",[6],[["(\\d{6})","$1",["[2-9]"]]],0,0,"(10(?:01|[12]0|88))"],"FR":["33","00","[1-9]\\d{8}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"],"0 $1"],["(\\d)(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4 $5",["[1-79]"],"0$1"]],"0"],"GA":["241","00","(?:[067]\\d|11)\\d{6}|[2-7]\\d{6}",[7,8],[["(\\d)(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2-7]"],"0$1"],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["0"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["11|[67]"],"0$1"]],0,0,"0(11\\d{6}|60\\d{6}|61\\d{6}|6[256]\\d{6}|7[467]\\d{6})","$1"],"GB":["44","00","[1-357-9]\\d{9}|[18]\\d{8}|8\\d{6}",[7,9,10],[["(\\d{3})(\\d{4})","$1 $2",["800","8001","80011","800111","8001111"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3",["845","8454","84546","845464"],"0$1"],["(\\d{3})(\\d{6})","$1 $2",["800"],"0$1"],["(\\d{5})(\\d{4,5})","$1 $2",["1(?:38|5[23]|69|76|94)","1(?:(?:38|69)7|5(?:24|39)|768|946)","1(?:3873|5(?:242|39[4-6])|(?:697|768)[347]|9467)"],"0$1"],["(\\d{4})(\\d{5,6})","$1 $2",["1(?:[2-69][02-9]|[78])"],"0$1"],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["[25]|7(?:0|6[02-9])","[25]|7(?:0|6(?:[03-9]|2[356]))"],"0$1"],["(\\d{4})(\\d{6})","$1 $2",["7"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["[1389]"],"0$1"]],"0",0,0,0,0,0,[["(?:1(?:1(?:3(?:[0-58]\\d\\d|73[0235])|4(?:[0-5]\\d\\d|69[7-9]|70[013579])|(?:(?:5[0-26-9]|[78][0-49])\\d|6(?:[0-4]\\d|50))\\d)|2(?:(?:0[024-9]|2[3-9]|3[3-79]|4[1-689]|[58][02-9]|6[0-47-9]|7[013-9]|9\\d)\\d\\d|1(?:[0-7]\\d\\d|8(?:[02]\\d|1[0-246-9])))|(?:3(?:0\\d|1[0-8]|[25][02-9]|3[02-579]|[468][0-46-9]|7[1-35-79]|9[2-578])|4(?:0[03-9]|[137]\\d|[28][02-57-9]|4[02-69]|5[0-8]|[69][0-79])|5(?:0[1-35-9]|[16]\\d|2[024-9]|3[015689]|4[02-9]|5[03-9]|7[0-35-9]|8[0-468]|9[0-57-9])|6(?:0[034689]|1\\d|2[0-35689]|[38][013-9]|4[1-467]|5[0-69]|6[13-9]|7[0-8]|9[0-24578])|7(?:0[0246-9]|2\\d|3[0236-8]|4[03-9]|5[0-46-9]|6[013-9]|7[0-35-9]|8[024-9]|9[02-9])|8(?:0[35-9]|2[1-57-9]|3[02-578]|4[0-578]|5[124-9]|6[2-69]|7\\d|8[02-9]|9[02569])|9(?:0[02-589]|[18]\\d|2[02-689]|3[1-57-9]|4[2-9]|5[0-579]|6[2-47-9]|7[0-24578]|9[2-57]))\\d\\d)|2(?:0[013478]|3[0189]|4[017]|8[0-46-9]|9[0-2])\\d{3})\\d{4}|1(?:2(?:0(?:46[1-4]|87[2-9])|545[1-79]|76(?:2\\d|3[1-8]|6[1-6])|9(?:7(?:2[0-4]|3[2-5])|8(?:2[2-8]|7[0-47-9]|8[3-5])))|3(?:6(?:38[2-5]|47[23])|8(?:47[04-9]|64[0157-9]))|4(?:044[1-7]|20(?:2[23]|8\\d)|6(?:0(?:30|5[2-57]|6[1-8]|7[2-8])|140)|8(?:052|87[1-3]))|5(?:2(?:4(?:3[2-79]|6\\d)|76\\d)|6(?:26[06-9]|686))|6(?:06(?:4\\d|7[4-79])|295[5-7]|35[34]\\d|47(?:24|61)|59(?:5[08]|6[67]|74)|9(?:55[0-4]|77[23]))|7(?:26(?:6[13-9]|7[0-7])|(?:442|688)\\d|50(?:2[0-3]|[3-68]2|76))|8(?:27[56]\\d|37(?:5[2-5]|8[239])|843[2-58])|9(?:0(?:0(?:6[1-8]|85)|52\\d)|3583|4(?:66[1-8]|9(?:2[01]|81))|63(?:23|3[1-4])|9561))\\d{3}",[9,10]],["7(?:457[0-57-9]|700[01]|911[028])\\d{5}|7(?:[1-3]\\d\\d|4(?:[0-46-9]\\d|5[0-689])|5(?:0[0-8]|[13-9]\\d|2[0-35-9])|7(?:0[1-9]|[1-7]\\d|8[02-9]|9[0-689])|8(?:[014-9]\\d|[23][0-8])|9(?:[024-9]\\d|1[02-9]|3[0-689]))\\d{6}",[10]],["80[08]\\d{7}|800\\d{6}|8001111"],["(?:8(?:4[2-5]|7[0-3])|9(?:[01]\\d|8[2-49]))\\d{7}|845464\\d",[7,10]],["70\\d{8}",[10]],0,["(?:3[0347]|55)\\d{8}",[10]],["76(?:464|652)\\d{5}|76(?:0[0-28]|2[356]|34|4[01347]|5[49]|6[0-369]|77|8[14]|9[139])\\d{6}",[10]],["56\\d{8}",[10]]],0," x"],"GD":["1","011","(?:473|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-9]\\d{6})$","473$1",0,"473"],"GE":["995","00","(?:[3-57]\\d\\d|800)\\d{6}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["70"],"0$1"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["32"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[57]"]],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[348]"],"0$1"]],"0"],"GF":["594","00","(?:[56]94|80\\d|976)\\d{6}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[569]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"],"0$1"]],"0"],"GG":["44","00","(?:1481|[357-9]\\d{3})\\d{6}|8\\d{6}(?:\\d{2})?",[7,9,10],0,"0",0,"0|([25-9]\\d{5})$","1481$1",0,0,[["1481[25-9]\\d{5}",[10]],["7(?:(?:781|839)\\d|911[17])\\d{5}",[10]],["80[08]\\d{7}|800\\d{6}|8001111"],["(?:8(?:4[2-5]|7[0-3])|9(?:[01]\\d|8[0-3]))\\d{7}|845464\\d",[7,10]],["70\\d{8}",[10]],0,["(?:3[0347]|55)\\d{8}",[10]],["76(?:464|652)\\d{5}|76(?:0[0-28]|2[356]|34|4[01347]|5[49]|6[0-369]|77|8[14]|9[139])\\d{6}",[10]],["56\\d{8}",[10]]]],"GH":["233","00","(?:[235]\\d{3}|800)\\d{5}",[8,9],[["(\\d{3})(\\d{5})","$1 $2",["8"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[235]"],"0$1"]],"0"],"GI":["350","00","(?:[25]\\d\\d|606)\\d{5}",[8],[["(\\d{3})(\\d{5})","$1 $2",["2"]]]],"GL":["299","00","(?:19|[2-689]\\d|70)\\d{4}",[6],[["(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3",["19|[2-9]"]]]],"GM":["220","00","[2-9]\\d{6}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[2-9]"]]]],"GN":["224","00","722\\d{6}|(?:3|6\\d)\\d{7}",[8,9],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["3"]],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[67]"]]]],"GP":["590","00","(?:590|(?:69|80)\\d|976)\\d{6}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[569]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"],"0$1"]],"0",0,0,0,0,0,[["590(?:0[1-68]|[14][0-24-9]|2[0-68]|3[1289]|5[3-579]|6[0-289]|7[08]|8[0-689]|9\\d)\\d{4}"],["69(?:0\\d\\d|1(?:2[2-9]|3[0-5]))\\d{4}"],["80[0-5]\\d{6}"],0,0,0,0,0,["976[01]\\d{5}"]]],"GQ":["240","00","222\\d{6}|(?:3\\d|55|[89]0)\\d{7}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[235]"]],["(\\d{3})(\\d{6})","$1 $2",["[89]"]]]],"GR":["30","00","5005000\\d{3}|8\\d{9,11}|(?:[269]\\d|70)\\d{8}",[10,11,12],[["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["21|7"]],["(\\d{4})(\\d{6})","$1 $2",["2(?:2|3[2-57-9]|4[2-469]|5[2-59]|6[2-9]|7[2-69]|8[2-49])|5"]],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["[2689]"]],["(\\d{3})(\\d{3,4})(\\d{5})","$1 $2 $3",["8"]]]],"GT":["502","00","(?:1\\d{3}|[2-7])\\d{7}",[8,11],[["(\\d{4})(\\d{4})","$1 $2",["[2-7]"]],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["1"]]]],"GU":["1","011","(?:[58]\\d\\d|671|900)\\d{7}",[10],0,"1",0,"1|([3-9]\\d{6})$","671$1",0,"671"],"GW":["245","00","[49]\\d{8}|4\\d{6}",[7,9],[["(\\d{3})(\\d{4})","$1 $2",["40"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[49]"]]]],"GY":["592","001","9008\\d{3}|(?:[2-467]\\d\\d|862)\\d{4}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[2-46-9]"]]]],"HK":["852","00(?:30|5[09]|[126-9]?)","8[0-46-9]\\d{6,7}|9\\d{4,7}|(?:[2-7]|9\\d{3})\\d{7}",[5,6,7,8,9,11],[["(\\d{3})(\\d{2,5})","$1 $2",["900","9003"]],["(\\d{4})(\\d{4})","$1 $2",["[2-7]|8[1-4]|9(?:0[1-9]|[1-8])"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["8"]],["(\\d{3})(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3 $4",["9"]]],0,0,0,0,0,0,0,"00"],"HN":["504","00","8\\d{10}|[237-9]\\d{7}",[8,11],[["(\\d{4})(\\d{4})","$1-$2",["[237-9]"]]]],"HR":["385","00","(?:[24-69]\\d|3[0-79])\\d{7}|80\\d{5,7}|[1-79]\\d{7}|6\\d{5,6}",[6,7,8,9],[["(\\d{2})(\\d{2})(\\d{2,3})","$1 $2 $3",["6[01]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2,3})","$1 $2 $3",["8"],"0$1"],["(\\d)(\\d{4})(\\d{3})","$1 $2 $3",["1"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[67]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["9"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[2-5]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["8"],"0$1"]],"0"],"HT":["509","00","[2-489]\\d{7}",[8],[["(\\d{2})(\\d{2})(\\d{4})","$1 $2 $3",["[2-489]"]]]],"HU":["36","00","[235-7]\\d{8}|[1-9]\\d{7}",[8,9],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["1"],"(06 $1)"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[27][2-9]|3[2-7]|4[24-9]|5[2-79]|6|8[2-57-9]|9[2-69]"],"(06 $1)"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[2-9]"],"06 $1"]],"06"],"ID":["62","00[89]","(?:(?:00[1-9]|8\\d)\\d{4}|[1-36])\\d{6}|00\\d{10}|[1-9]\\d{8,10}|[2-9]\\d{7}",[7,8,9,10,11,12,13],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["15"]],["(\\d{2})(\\d{5,9})","$1 $2",["2[124]|[36]1"],"(0$1)"],["(\\d{3})(\\d{5,7})","$1 $2",["800"],"0$1"],["(\\d{3})(\\d{5,8})","$1 $2",["[2-79]"],"(0$1)"],["(\\d{3})(\\d{3,4})(\\d{3})","$1-$2-$3",["8[1-35-9]"],"0$1"],["(\\d{3})(\\d{6,8})","$1 $2",["1"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["804"],"0$1"],["(\\d{3})(\\d)(\\d{3})(\\d{3})","$1 $2 $3 $4",["80"],"0$1"],["(\\d{3})(\\d{4})(\\d{4,5})","$1-$2-$3",["8"],"0$1"]],"0"],"IE":["353","00","(?:1\\d|[2569])\\d{6,8}|4\\d{6,9}|7\\d{8}|8\\d{8,9}",[7,8,9,10],[["(\\d{2})(\\d{5})","$1 $2",["2[24-9]|47|58|6[237-9]|9[35-9]"],"(0$1)"],["(\\d{3})(\\d{5})","$1 $2",["[45]0"],"(0$1)"],["(\\d)(\\d{3,4})(\\d{4})","$1 $2 $3",["1"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[2569]|4[1-69]|7[14]"],"(0$1)"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["70"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["81"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[78]"],"0$1"],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["1"]],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["4"],"(0$1)"],["(\\d{2})(\\d)(\\d{3})(\\d{4})","$1 $2 $3 $4",["8"],"0$1"]],"0"],"IL":["972","0(?:0|1[2-9])","1\\d{6}(?:\\d{3,5})?|[57]\\d{8}|[1-489]\\d{7}",[7,8,9,10,11,12],[["(\\d{4})(\\d{3})","$1-$2",["125"]],["(\\d{4})(\\d{2})(\\d{2})","$1-$2-$3",["121"]],["(\\d)(\\d{3})(\\d{4})","$1-$2-$3",["[2-489]"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1-$2-$3",["[57]"],"0$1"],["(\\d{4})(\\d{3})(\\d{3})","$1-$2-$3",["12"]],["(\\d{4})(\\d{6})","$1-$2",["159"]],["(\\d)(\\d{3})(\\d{3})(\\d{3})","$1-$2-$3-$4",["1[7-9]"]],["(\\d{3})(\\d{1,2})(\\d{3})(\\d{4})","$1-$2 $3-$4",["15"]]],"0"],"IM":["44","00","1624\\d{6}|(?:[3578]\\d|90)\\d{8}",[10],0,"0",0,"0|([25-8]\\d{5})$","1624$1",0,"74576|(?:16|7[56])24"],"IN":["91","00","(?:000800|[2-9]\\d\\d)\\d{7}|1\\d{7,12}",[8,9,10,11,12,13],[["(\\d{8})","$1",["5(?:0|2[23]|3[03]|[67]1|88)","5(?:0|2(?:21|3)|3(?:0|3[23])|616|717|888)","5(?:0|2(?:21|3)|3(?:0|3[23])|616|717|8888)"],0,1],["(\\d{4})(\\d{4,5})","$1 $2",["180","1800"],0,1],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["140"],0,1],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["11|2[02]|33|4[04]|79[1-7]|80[2-46]","11|2[02]|33|4[04]|79(?:[1-6]|7[19])|80(?:[2-4]|6[0-589])","11|2[02]|33|4[04]|79(?:[124-6]|3(?:[02-9]|1[0-24-9])|7(?:1|9[1-6]))|80(?:[2-4]|6[0-589])"],"0$1",1],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["1(?:2[0-249]|3[0-25]|4[145]|[68]|7[1257])|2(?:1[257]|3[013]|4[01]|5[0137]|6[0158]|78|8[1568])|3(?:26|4[1-3]|5[34]|6[01489]|7[02-46]|8[159])|4(?:1[36]|2[1-47]|5[12]|6[0-26-9]|7[0-24-9]|8[013-57]|9[014-7])|5(?:1[025]|22|[36][25]|4[28]|5[12]|[78]1)|6(?:12|[2-4]1|5[17]|6[13]|80)|7(?:12|3[134]|4[47]|61|88)|8(?:16|2[014]|3[126]|6[136]|7[078]|8[34]|91)|(?:43|59|75)[15]|(?:1[59]|29|67|72)[14]","1(?:2[0-24]|3[0-25]|4[145]|[59][14]|6[1-9]|7[1257]|8[1-57-9])|2(?:1[257]|3[013]|4[01]|5[0137]|6[058]|78|8[1568]|9[14])|3(?:26|4[1-3]|5[34]|6[01489]|7[02-46]|8[159])|4(?:1[36]|2[1-47]|3[15]|5[12]|6[0-26-9]|7[0-24-9]|8[013-57]|9[014-7])|5(?:1[025]|22|[36][25]|4[28]|[578]1|9[15])|674|7(?:(?:2[14]|3[34]|5[15])[2-6]|61[346]|88[0-8])|8(?:70[2-6]|84[235-7]|91[3-7])|(?:1(?:29|60|8[06])|261|552|6(?:12|[2-47]1|5[17]|6[13]|80)|7(?:12|31|4[47])|8(?:16|2[014]|3[126]|6[136]|7[78]|83))[2-7]","1(?:2[0-24]|3[0-25]|4[145]|[59][14]|6[1-9]|7[1257]|8[1-57-9])|2(?:1[257]|3[013]|4[01]|5[0137]|6[058]|78|8[1568]|9[14])|3(?:26|4[1-3]|5[34]|6[01489]|7[02-46]|8[159])|4(?:1[36]|2[1-47]|3[15]|5[12]|6[0-26-9]|7[0-24-9]|8[013-57]|9[014-7])|5(?:1[025]|22|[36][25]|4[28]|[578]1|9[15])|6(?:12(?:[2-6]|7[0-8])|74[2-7])|7(?:(?:2[14]|5[15])[2-6]|3171|61[346]|88(?:[2-7]|82))|8(?:70[2-6]|84(?:[2356]|7[19])|91(?:[3-6]|7[19]))|73[134][2-6]|(?:74[47]|8(?:16|2[014]|3[126]|6[136]|7[78]|83))(?:[2-6]|7[19])|(?:1(?:29|60|8[06])|261|552|6(?:[2-4]1|5[17]|6[13]|7(?:1|4[0189])|80)|7(?:12|88[01]))[2-7]"],"0$1",1],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["1(?:[2-479]|5[0235-9])|[2-5]|6(?:1[1358]|2[2457-9]|3[2-5]|4[235-7]|5[2-689]|6[24578]|7[235689]|8[1-6])|7(?:1[013-9]|28|3[129]|4[1-35689]|5[29]|6[02-5]|70)|807","1(?:[2-479]|5[0235-9])|[2-5]|6(?:1[1358]|2(?:[2457]|84|95)|3(?:[2-4]|55)|4[235-7]|5[2-689]|6[24578]|7[235689]|8[1-6])|7(?:1(?:[013-8]|9[6-9])|28[6-8]|3(?:17|2[0-49]|9[2-57])|4(?:1[2-4]|[29][0-7]|3[0-8]|[56]|8[0-24-7])|5(?:2[1-3]|9[0-6])|6(?:0[5689]|2[5-9]|3[02-8]|4|5[0-367])|70[13-7])|807[19]","1(?:[2-479]|5(?:[0236-9]|5[013-9]))|[2-5]|6(?:2(?:84|95)|355|83)|73179|807(?:1|9[1-3])|(?:1552|6(?:1[1358]|2[2457]|3[2-4]|4[235-7]|5[2-689]|6[24578]|7[235689]|8[124-6])\\d|7(?:1(?:[013-8]\\d|9[6-9])|28[6-8]|3(?:2[0-49]|9[2-57])|4(?:1[2-4]|[29][0-7]|3[0-8]|[56]\\d|8[0-24-7])|5(?:2[1-3]|9[0-6])|6(?:0[5689]|2[5-9]|3[02-8]|4\\d|5[0-367])|70[13-7]))[2-7]"],"0$1",1],["(\\d{5})(\\d{5})","$1 $2",["[6-9]"],"0$1",1],["(\\d{4})(\\d{2,4})(\\d{4})","$1 $2 $3",["1(?:6|8[06])","1(?:6|8[06]0)"],0,1],["(\\d{4})(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["18"],0,1]],"0"],"IO":["246","00","3\\d{6}",[7],[["(\\d{3})(\\d{4})","$1 $2",["3"]]]],"IQ":["964","00","(?:1|7\\d\\d)\\d{7}|[2-6]\\d{7,8}",[8,9,10],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["1"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[2-6]"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["7"],"0$1"]],"0"],"IR":["98","00","[1-9]\\d{9}|(?:[1-8]\\d\\d|9)\\d{3,4}",[4,5,6,7,10],[["(\\d{4,5})","$1",["96"],"0$1"],["(\\d{2})(\\d{4,5})","$1 $2",["(?:1[137]|2[13-68]|3[1458]|4[145]|5[1468]|6[16]|7[1467]|8[13467])[12689]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["9"],"0$1"],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["[1-8]"],"0$1"]],"0"],"IS":["354","00|1(?:0(?:01|[12]0)|100)","(?:38\\d|[4-9])\\d{6}",[7,9],[["(\\d{3})(\\d{4})","$1 $2",["[4-9]"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["3"]]],0,0,0,0,0,0,0,"00"],"IT":["39","00","0\\d{5,10}|1\\d{8,10}|3(?:[0-8]\\d{7,10}|9\\d{7,8})|(?:55|70)\\d{8}|8\\d{5}(?:\\d{2,4})?",[6,7,8,9,10,11],[["(\\d{2})(\\d{4,6})","$1 $2",["0[26]"]],["(\\d{3})(\\d{3,6})","$1 $2",["0[13-57-9][0159]|8(?:03|4[17]|9[2-5])","0[13-57-9][0159]|8(?:03|4[17]|9(?:2|3[04]|[45][0-4]))"]],["(\\d{4})(\\d{2,6})","$1 $2",["0(?:[13-579][2-46-8]|8[236-8])"]],["(\\d{4})(\\d{4})","$1 $2",["894"]],["(\\d{2})(\\d{3,4})(\\d{4})","$1 $2 $3",["0[26]|5"]],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["1(?:44|[679])|[378]"]],["(\\d{3})(\\d{3,4})(\\d{4})","$1 $2 $3",["0[13-57-9][0159]|14"]],["(\\d{2})(\\d{4})(\\d{5})","$1 $2 $3",["0[26]"]],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["0"]],["(\\d{3})(\\d{4})(\\d{4,5})","$1 $2 $3",["3"]]],0,0,0,0,0,0,[["0669[0-79]\\d{1,6}|0(?:1(?:[0159]\\d|[27][1-5]|31|4[1-4]|6[1356]|8[2-57])|2\\d\\d|3(?:[0159]\\d|2[1-4]|3[12]|[48][1-6]|6[2-59]|7[1-7])|4(?:[0159]\\d|[23][1-9]|4[245]|6[1-5]|7[1-4]|81)|5(?:[0159]\\d|2[1-5]|3[2-6]|4[1-79]|6[4-6]|7[1-578]|8[3-8])|6(?:[0-57-9]\\d|6[0-8])|7(?:[0159]\\d|2[12]|3[1-7]|4[2-46]|6[13569]|7[13-6]|8[1-59])|8(?:[0159]\\d|2[3-578]|3[1-356]|[6-8][1-5])|9(?:[0159]\\d|[238][1-5]|4[12]|6[1-8]|7[1-6]))\\d{2,7}"],["3[1-9]\\d{8}|3[2-9]\\d{7}",[9,10]],["80(?:0\\d{3}|3)\\d{3}",[6,9]],["(?:0878\\d{3}|89(?:2\\d|3[04]|4(?:[0-4]|[5-9]\\d\\d)|5[0-4]))\\d\\d|(?:1(?:44|6[346])|89(?:38|5[5-9]|9))\\d{6}",[6,8,9,10]],["1(?:78\\d|99)\\d{6}",[9,10]],0,0,0,["55\\d{8}",[10]],["84(?:[08]\\d{3}|[17])\\d{3}",[6,9]]]],"JE":["44","00","1534\\d{6}|(?:[3578]\\d|90)\\d{8}",[10],0,"0",0,"0|([0-24-8]\\d{5})$","1534$1",0,0,[["1534[0-24-8]\\d{5}"],["7(?:(?:(?:50|82)9|937)\\d|7(?:00[378]|97[7-9]))\\d{5}"],["80(?:07(?:35|81)|8901)\\d{4}"],["(?:8(?:4(?:4(?:4(?:05|42|69)|703)|5(?:041|800))|7(?:0002|1206))|90(?:066[59]|1810|71(?:07|55)))\\d{4}"],["701511\\d{4}"],0,["(?:3(?:0(?:07(?:35|81)|8901)|3\\d{4}|4(?:4(?:4(?:05|42|69)|703)|5(?:041|800))|7(?:0002|1206))|55\\d{4})\\d{4}"],["76(?:464|652)\\d{5}|76(?:0[0-28]|2[356]|34|4[01347]|5[49]|6[0-369]|77|8[14]|9[139])\\d{6}"],["56\\d{8}"]]],"JM":["1","011","(?:[58]\\d\\d|658|900)\\d{7}",[10],0,"1",0,0,0,0,"658|876"],"JO":["962","00","(?:(?:[2689]|7\\d)\\d|32|53)\\d{6}",[8,9],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["[2356]|87"],"(0$1)"],["(\\d{3})(\\d{5,6})","$1 $2",["[89]"],"0$1"],["(\\d{2})(\\d{7})","$1 $2",["70"],"0$1"],["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["7"],"0$1"]],"0"],"JP":["81","010","00[1-9]\\d{6,14}|[257-9]\\d{9}|(?:00|[1-9]\\d\\d)\\d{6}",[8,9,10,11,12,13,14,15,16,17],[["(\\d{3})(\\d{3})(\\d{3})","$1-$2-$3",["(?:12|57|99)0"],"0$1"],["(\\d{4})(\\d)(\\d{4})","$1-$2-$3",["1(?:26|3[79]|4[56]|5[4-68]|6[3-5])|499|5(?:76|97)|746|8(?:3[89]|47|51|63)|9(?:80|9[16])","1(?:267|3(?:7[247]|9[278])|466|5(?:47|58|64)|6(?:3[245]|48|5[4-68]))|499[2468]|5(?:76|97)9|7468|8(?:3(?:8[7-9]|96)|477|51[2-9]|636)|9(?:802|9(?:1[23]|69))|1(?:45|58)[67]","1(?:267|3(?:7[247]|9[278])|466|5(?:47|58|64)|6(?:3[245]|48|5[4-68]))|499[2468]|5(?:769|979[2-69])|7468|8(?:3(?:8[7-9]|96[2457-9])|477|51[2-9]|636[457-9])|9(?:802|9(?:1[23]|69))|1(?:45|58)[67]"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1-$2-$3",["60"],"0$1"],["(\\d)(\\d{4})(\\d{4})","$1-$2-$3",["[36]|4(?:2[09]|7[01])","[36]|4(?:2(?:0|9[02-69])|7(?:0[019]|1))"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1-$2-$3",["1(?:1|5[45]|77|88|9[69])|2(?:2[1-37]|3[0-269]|4[59]|5|6[24]|7[1-358]|8[1369]|9[0-38])|4(?:[28][1-9]|3[0-57]|[45]|6[248]|7[2-579]|9[29])|5(?:2|3[045]|4[0-369]|5[29]|8[02389]|9[0-389])|7(?:2[02-46-9]|34|[58]|6[0249]|7[57]|9[2-6])|8(?:2[124589]|3[27-9]|49|51|6|7[0-468]|8[68]|9[019])|9(?:[23][1-9]|4[15]|5[138]|6[1-3]|7[156]|8[189]|9[1-489])","1(?:1|5(?:4[018]|5[017])|77|88|9[69])|2(?:2(?:[127]|3[014-9])|3[0-269]|4[59]|5(?:[1-3]|5[0-69]|9[19])|62|7(?:[1-35]|8[0189])|8(?:[16]|3[0134]|9[0-5])|9(?:[028]|17))|4(?:2(?:[13-79]|8[014-6])|3[0-57]|[45]|6[248]|7[2-47]|8[1-9])|5(?:2|3[045]|4[0-369]|8[02389]|9[0-3])|7(?:2[02-46-9]|34|[58]|6[0249]|7[57]|9(?:[23]|4[0-59]|5[01569]|6[0167]))|8(?:2(?:[1258]|4[0-39]|9[0-2469])|49|51|6(?:[0-24]|36|5[0-3589]|72|9[01459])|7[0-468]|8[68])|9(?:[23][1-9]|4[15]|5[138]|6[1-3]|7[156]|8[189]|9(?:[1289]|3[34]|4[0178]))|(?:49|55|83)[29]|(?:264|837)[016-9]|2(?:57|93)[015-9]|(?:25[0468]|422|838)[01]|(?:47[59]|59[89]|8(?:6[68]|9))[019]","1(?:1|5(?:4[018]|5[017])|77|88|9[69])|2(?:2[127]|3[0-269]|4[59]|5(?:[1-3]|5[0-69]|9(?:17|99))|6(?:2|4[016-9])|7(?:[1-35]|8[0189])|8(?:[16]|3[0134]|9[0-5])|9(?:[028]|17))|4(?:2(?:[13-79]|8[014-6])|3[0-57]|[45]|6[248]|7[2-47]|9[29])|5(?:2|3[045]|4[0-369]|5[29]|8[02389]|9[0-3])|7(?:2[02-46-9]|34|[58]|6[0249]|7[57]|9(?:[23]|4[0-59]|5[01569]|6[0167]))|8(?:2(?:[1258]|4[0-39]|9[0169])|3(?:[29]|7(?:[017-9]|6[6-8]))|49|51|6(?:[0-24]|36[23]|5(?:[0-389]|5[23])|6(?:[01]|9[178])|72|9[0145])|7[0-468]|8[68])|9(?:4[15]|5[138]|7[156]|8[189]|9(?:[1289]|3(?:31|4[357])|4[0178]))|(?:8294|96)[1-3]|2(?:57|93)[015-9]|(?:223|8699)[014-9]|(?:25[0468]|422|838)[01]|(?:48|8292|9[23])[1-9]|(?:47[59]|59[89]|8(?:68|9))[019]","1(?:1|5(?:4[018]|5[017])|77|88|9[69])|2(?:2[127]|3[0-269]|4[59]|5(?:[1-3]|5[0-69]|7[015-9]|9(?:17|99))|6(?:2|4[016-9])|7(?:[1-35]|8[0189])|8(?:[16]|3[0134]|9[0-5])|9(?:[028]|17|3[015-9]))|4(?:2(?:[13-79]|8[014-6])|3[0-57]|[45]|6[248]|7[2-47]|9[29])|5(?:2|3[045]|4[0-369]|5[29]|8[02389]|9[0-3])|7(?:2[02-46-9]|34|[58]|6[0249]|7[57]|9(?:[23]|4[0-59]|5[01569]|6[0167]))|8(?:2(?:[1258]|4[0-39]|9(?:[019]|4[1-3]|6(?:[0-47-9]|5[01346-9])))|3(?:[29]|7(?:[017-9]|6[6-8]))|49|51|6(?:[0-24]|36[23]|5(?:[0-389]|5[23])|6(?:[01]|9[178])|72|9[0145])|7[0-468]|8[68])|9(?:4[15]|5[138]|6[1-3]|7[156]|8[189]|9(?:[1289]|3(?:31|4[357])|4[0178]))|(?:223|8699)[014-9]|(?:25[0468]|422|838)[01]|(?:48|829(?:2|66)|9[23])[1-9]|(?:47[59]|59[89]|8(?:68|9))[019]"],"0$1"],["(\\d{3})(\\d{2})(\\d{4})","$1-$2-$3",["[14]|[289][2-9]|5[3-9]|7[2-4679]"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1-$2-$3",["800"],"0$1"],["(\\d{2})(\\d{4})(\\d{4})","$1-$2-$3",["[257-9]"],"0$1"]],"0"],"KE":["254","000","(?:[17]\\d\\d|900)\\d{6}|(?:2|80)0\\d{6,7}|[4-6]\\d{6,8}",[7,8,9,10],[["(\\d{2})(\\d{5,7})","$1 $2",["[24-6]"],"0$1"],["(\\d{3})(\\d{6})","$1 $2",["[17]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["[89]"],"0$1"]],"0"],"KG":["996","00","8\\d{9}|(?:[235-8]\\d|99)\\d{7}",[9,10],[["(\\d{4})(\\d{5})","$1 $2",["3(?:1[346]|[24-79])"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[235-79]|88"],"0$1"],["(\\d{3})(\\d{3})(\\d)(\\d{2,3})","$1 $2 $3 $4",["8"],"0$1"]],"0"],"KH":["855","00[14-9]","1\\d{9}|[1-9]\\d{7,8}",[8,9,10],[["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[1-9]"],"0$1"],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["1"]]],"0"],"KI":["686","00","(?:[37]\\d|6[0-79])\\d{6}|(?:[2-48]\\d|50)\\d{3}",[5,8],0,"0"],"KM":["269","00","[3478]\\d{6}",[7],[["(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3",["[3478]"]]]],"KN":["1","011","(?:[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-7]\\d{6})$","869$1",0,"869"],"KP":["850","00|99","85\\d{6}|(?:19\\d|[2-7])\\d{7}",[8,10],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["8"],"0$1"],["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["[2-7]"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["1"],"0$1"]],"0"],"KR":["82","00(?:[125689]|3(?:[46]5|91)|7(?:00|27|3|55|6[126]))","00[1-9]\\d{8,11}|(?:[12]|5\\d{3})\\d{7}|[13-6]\\d{9}|(?:[1-6]\\d|80)\\d{7}|[3-6]\\d{4,5}|(?:00|7)0\\d{8}",[5,6,8,9,10,11,12,13,14],[["(\\d{2})(\\d{3,4})","$1-$2",["(?:3[1-3]|[46][1-4]|5[1-5])1"],"0$1"],["(\\d{4})(\\d{4})","$1-$2",["1"]],["(\\d)(\\d{3,4})(\\d{4})","$1-$2-$3",["2"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1-$2-$3",["60|8"],"0$1"],["(\\d{2})(\\d{3,4})(\\d{4})","$1-$2-$3",["[1346]|5[1-5]"],"0$1"],["(\\d{2})(\\d{4})(\\d{4})","$1-$2-$3",["[57]"],"0$1"],["(\\d{2})(\\d{5})(\\d{4})","$1-$2-$3",["5"],"0$1"]],"0",0,"0(8(?:[1-46-8]|5\\d\\d))?"],"KW":["965","00","18\\d{5}|(?:[2569]\\d|41)\\d{6}",[7,8],[["(\\d{4})(\\d{3,4})","$1 $2",["[169]|2(?:[235]|4[1-35-9])|52"]],["(\\d{3})(\\d{5})","$1 $2",["[245]"]]]],"KY":["1","011","(?:345|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-9]\\d{6})$","345$1",0,"345"],"KZ":["7","810","(?:33622|8\\d{8})\\d{5}|[78]\\d{9}",[10,14],0,"8",0,0,0,0,"33|7",0,"8~10"],"LA":["856","00","[23]\\d{9}|3\\d{8}|(?:[235-8]\\d|41)\\d{6}",[8,9,10],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["2[13]|3[14]|[4-8]"],"0$1"],["(\\d{2})(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3 $4",["30[013-9]"],"0$1"],["(\\d{2})(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3 $4",["[23]"],"0$1"]],"0"],"LB":["961","00","[27-9]\\d{7}|[13-9]\\d{6}",[7,8],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["[13-69]|7(?:[2-57]|62|8[0-7]|9[04-9])|8[02-9]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[27-9]"]]],"0"],"LC":["1","011","(?:[58]\\d\\d|758|900)\\d{7}",[10],0,"1",0,"1|([2-8]\\d{6})$","758$1",0,"758"],"LI":["423","00","[68]\\d{8}|(?:[2378]\\d|90)\\d{5}",[7,9],[["(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3",["[2379]|8(?:0[09]|7)","[2379]|8(?:0(?:02|9)|7)"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["8"]],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["69"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["6"]]],"0",0,"0|(1001)"],"LK":["94","00","[1-9]\\d{8}",[9],[["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["7"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[1-689]"],"0$1"]],"0"],"LR":["231","00","(?:2|33|5\\d|77|88)\\d{7}|[4-6]\\d{6}",[7,8,9],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["[4-6]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["2"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[3578]"],"0$1"]],"0"],"LS":["266","00","(?:[256]\\d\\d|800)\\d{5}",[8],[["(\\d{4})(\\d{4})","$1 $2",["[2568]"]]]],"LT":["370","00","(?:[3469]\\d|52|[78]0)\\d{6}",[8],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["52[0-7]"],"(8-$1)",1],["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["[7-9]"],"8 $1",1],["(\\d{2})(\\d{6})","$1 $2",["37|4(?:[15]|6[1-8])"],"(8-$1)",1],["(\\d{3})(\\d{5})","$1 $2",["[3-6]"],"(8-$1)",1]],"8",0,"[08]"],"LU":["352","00","35[013-9]\\d{4,8}|6\\d{8}|35\\d{2,4}|(?:[2457-9]\\d|3[0-46-9])\\d{2,9}",[4,5,6,7,8,9,10,11],[["(\\d{2})(\\d{3})","$1 $2",["2(?:0[2-689]|[2-9])|[3-57]|8(?:0[2-9]|[13-9])|9(?:0[89]|[2-579])"]],["(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3",["2(?:0[2-689]|[2-9])|[3-57]|8(?:0[2-9]|[13-9])|9(?:0[89]|[2-579])"]],["(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3",["20[2-689]"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{1,2})","$1 $2 $3 $4",["2(?:[0367]|4[3-8])"]],["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["80[01]|90[015]"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3 $4",["20"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["6"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{1,2})","$1 $2 $3 $4 $5",["2(?:[0367]|4[3-8])"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{1,5})","$1 $2 $3 $4",["[3-57]|8[13-9]|9(?:0[89]|[2-579])|(?:2|80)[2-9]"]]],0,0,"(15(?:0[06]|1[12]|[35]5|4[04]|6[26]|77|88|99)\\d)"],"LV":["371","00","(?:[268]\\d|90)\\d{6}",[8],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[269]|8[01]"]]]],"LY":["218","00","[2-9]\\d{8}",[9],[["(\\d{2})(\\d{7})","$1-$2",["[2-9]"],"0$1"]],"0"],"MA":["212","00","[5-8]\\d{8}",[9],[["(\\d{5})(\\d{4})","$1-$2",["5(?:29|38)","5(?:29[89]|389)","5(?:29[89]|389)0"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["5[45]"],"0$1"],["(\\d{4})(\\d{5})","$1-$2",["5(?:2[2-489]|3[5-9]|9)|892","5(?:2(?:[2-49]|8[235-9])|3[5-9]|9)|892"],"0$1"],["(\\d{2})(\\d{7})","$1-$2",["8"],"0$1"],["(\\d{3})(\\d{6})","$1-$2",["[5-7]"],"0$1"]],"0",0,0,0,0,0,[["5(?:29(?:[189][05]|2[29]|3[01])|389[05])\\d{4}|5(?:2(?:[0-25-7]\\d|3[1-578]|4[02-46-8]|8[0235-7]|90)|3(?:[0-47]\\d|5[02-9]|6[02-8]|8[08]|9[3-9])|(?:4[067]|5[03])\\d)\\d{5}"],["(?:6(?:[0-79]\\d|8[0-247-9])|7(?:[017]\\d|2[0-2]|6[0-8]|8[0-3]))\\d{6}"],["80\\d{7}"],["89\\d{7}"],0,0,0,0,["592(?:4[0-2]|93)\\d{4}"]]],"MC":["377","00","(?:[3489]|6\\d)\\d{7}",[8,9],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["4"],"0$1"],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[389]"]],["(\\d)(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4 $5",["6"],"0$1"]],"0"],"MD":["373","00","(?:[235-7]\\d|[89]0)\\d{6}",[8],[["(\\d{3})(\\d{5})","$1 $2",["[89]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["22|3"],"0$1"],["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["[25-7]"],"0$1"]],"0"],"ME":["382","00","(?:20|[3-79]\\d)\\d{6}|80\\d{6,7}",[8,9],[["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[2-9]"],"0$1"]],"0"],"MF":["590","00","(?:590|(?:69|80)\\d|976)\\d{6}",[9],0,"0",0,0,0,0,0,[["590(?:0[079]|[14]3|[27][79]|30|5[0-268]|87)\\d{4}"],["69(?:0\\d\\d|1(?:2[2-9]|3[0-5]))\\d{4}"],["80[0-5]\\d{6}"],0,0,0,0,0,["976[01]\\d{5}"]]],"MG":["261","00","[23]\\d{8}",[9],[["(\\d{2})(\\d{2})(\\d{3})(\\d{2})","$1 $2 $3 $4",["[23]"],"0$1"]],"0",0,"0|([24-9]\\d{6})$","20$1"],"MH":["692","011","329\\d{4}|(?:[256]\\d|45)\\d{5}",[7],[["(\\d{3})(\\d{4})","$1-$2",["[2-6]"]]],"1"],"MK":["389","00","[2-578]\\d{7}",[8],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["2|34[47]|4(?:[37]7|5[47]|64)"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[347]"],"0$1"],["(\\d{3})(\\d)(\\d{2})(\\d{2})","$1 $2 $3 $4",["[58]"],"0$1"]],"0"],"ML":["223","00","[24-9]\\d{7}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[24-9]"]]]],"MM":["95","00","1\\d{5,7}|95\\d{6}|(?:[4-7]|9[0-46-9])\\d{6,8}|(?:2|8\\d)\\d{5,8}",[6,7,8,9,10],[["(\\d)(\\d{2})(\\d{3})","$1 $2 $3",["16|2"],"0$1"],["(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3",["[45]|6(?:0[23]|[1-689]|7[235-7])|7(?:[0-4]|5[2-7])|8[1-6]"],"0$1"],["(\\d)(\\d{3})(\\d{3,4})","$1 $2 $3",["[12]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[4-7]|8[1-35]"],"0$1"],["(\\d)(\\d{3})(\\d{4,6})","$1 $2 $3",["9(?:2[0-4]|[35-9]|4[137-9])"],"0$1"],["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["2"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["8"],"0$1"],["(\\d)(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["92"],"0$1"],["(\\d)(\\d{5})(\\d{4})","$1 $2 $3",["9"],"0$1"]],"0"],"MN":["976","001","[12]\\d{7,9}|[5-9]\\d{7}",[8,9,10],[["(\\d{2})(\\d{2})(\\d{4})","$1 $2 $3",["[12]1"],"0$1"],["(\\d{4})(\\d{4})","$1 $2",["[5-9]"]],["(\\d{3})(\\d{5,6})","$1 $2",["[12]2[1-3]"],"0$1"],["(\\d{4})(\\d{5,6})","$1 $2",["[12](?:27|3[2-8]|4[2-68]|5[1-4689])","[12](?:27|3[2-8]|4[2-68]|5[1-4689])[0-3]"],"0$1"],["(\\d{5})(\\d{4,5})","$1 $2",["[12]"],"0$1"]],"0"],"MO":["853","00","0800\\d{3}|(?:28|[68]\\d)\\d{6}",[7,8],[["(\\d{4})(\\d{3})","$1 $2",["0"]],["(\\d{4})(\\d{4})","$1 $2",["[268]"]]]],"MP":["1","011","[58]\\d{9}|(?:67|90)0\\d{7}",[10],0,"1",0,"1|([2-9]\\d{6})$","670$1",0,"670"],"MQ":["596","00","(?:69|80)\\d{7}|(?:59|97)6\\d{6}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[569]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"],"0$1"]],"0"],"MR":["222","00","(?:[2-4]\\d\\d|800)\\d{5}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2-48]"]]]],"MS":["1","011","(?:[58]\\d\\d|664|900)\\d{7}",[10],0,"1",0,"1|([34]\\d{6})$","664$1",0,"664"],"MT":["356","00","3550\\d{4}|(?:[2579]\\d\\d|800)\\d{5}",[8],[["(\\d{4})(\\d{4})","$1 $2",["[2357-9]"]]]],"MU":["230","0(?:0|[24-7]0|3[03])","(?:5|8\\d\\d)\\d{7}|[2-468]\\d{6}",[7,8,10],[["(\\d{3})(\\d{4})","$1 $2",["[2-46]|8[013]"]],["(\\d{4})(\\d{4})","$1 $2",["5"]],["(\\d{5})(\\d{5})","$1 $2",["8"]]],0,0,0,0,0,0,0,"020"],"MV":["960","0(?:0|19)","(?:800|9[0-57-9]\\d)\\d{7}|[34679]\\d{6}",[7,10],[["(\\d{3})(\\d{4})","$1-$2",["[3467]|9[13-9]"]],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["[89]"]]],0,0,0,0,0,0,0,"00"],"MW":["265","00","(?:[1289]\\d|31|77)\\d{7}|1\\d{6}",[7,9],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["1[2-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["2"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[137-9]"],"0$1"]],"0"],"MX":["52","0[09]","1(?:(?:44|99)[1-9]|65[0-689])\\d{7}|(?:1(?:[017]\\d|[235][1-9]|4[0-35-9]|6[0-46-9]|8[1-79]|9[1-8])|[2-9]\\d)\\d{8}",[10,11],[["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["33|5[56]|81"],0,1],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["[2-9]"],0,1],["(\\d)(\\d{2})(\\d{4})(\\d{4})","$2 $3 $4",["1(?:33|5[56]|81)"],0,1],["(\\d)(\\d{3})(\\d{3})(\\d{4})","$2 $3 $4",["1"],0,1]],"01",0,"0(?:[12]|4[45])|1",0,0,0,0,"00"],"MY":["60","00","1\\d{8,9}|(?:3\\d|[4-9])\\d{7}",[8,9,10],[["(\\d)(\\d{3})(\\d{4})","$1-$2 $3",["[4-79]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1-$2 $3",["1(?:[02469]|[378][1-9]|53)|8","1(?:[02469]|[37][1-9]|53|8(?:[1-46-9]|5[7-9]))|8"],"0$1"],["(\\d)(\\d{4})(\\d{4})","$1-$2 $3",["3"],"0$1"],["(\\d)(\\d{3})(\\d{2})(\\d{4})","$1-$2-$3-$4",["1(?:[367]|80)"]],["(\\d{3})(\\d{3})(\\d{4})","$1-$2 $3",["15"],"0$1"],["(\\d{2})(\\d{4})(\\d{4})","$1-$2 $3",["1"],"0$1"]],"0"],"MZ":["258","00","(?:2|8\\d)\\d{7}",[8,9],[["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["2|8[2-79]"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["8"]]]],"NA":["264","00","[68]\\d{7,8}",[8,9],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["88"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["6"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["87"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["8"],"0$1"]],"0"],"NC":["687","00","(?:050|[2-57-9]\\d\\d)\\d{3}",[6],[["(\\d{2})(\\d{2})(\\d{2})","$1.$2.$3",["[02-57-9]"]]]],"NE":["227","00","[027-9]\\d{7}",[8],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["08"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[089]|2[013]|7[04]"]]]],"NF":["672","00","[13]\\d{5}",[6],[["(\\d{2})(\\d{4})","$1 $2",["1[0-3]"]],["(\\d)(\\d{5})","$1 $2",["[13]"]]],0,0,"([0-258]\\d{4})$","3$1"],"NG":["234","009","(?:[124-7]|9\\d{3})\\d{6}|[1-9]\\d{7}|[78]\\d{9,13}",[7,8,10,11,12,13,14],[["(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3",["78"],"0$1"],["(\\d)(\\d{3})(\\d{3,4})","$1 $2 $3",["[12]|9(?:0[3-9]|[1-9])"],"0$1"],["(\\d{2})(\\d{3})(\\d{2,3})","$1 $2 $3",["[3-7]|8[2-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["[7-9]"],"0$1"],["(\\d{3})(\\d{4})(\\d{4,5})","$1 $2 $3",["[78]"],"0$1"],["(\\d{3})(\\d{5})(\\d{5,6})","$1 $2 $3",["[78]"],"0$1"]],"0"],"NI":["505","00","(?:1800|[25-8]\\d{3})\\d{4}",[8],[["(\\d{4})(\\d{4})","$1 $2",["[125-8]"]]]],"NL":["31","00","(?:[124-7]\\d\\d|3(?:[02-9]\\d|1[0-8]))\\d{6}|8\\d{6,9}|9\\d{6,10}|1\\d{4,5}",[5,6,7,8,9,10,11],[["(\\d{3})(\\d{4,7})","$1 $2",["[89]0"],"0$1"],["(\\d{2})(\\d{7})","$1 $2",["66"],"0$1"],["(\\d)(\\d{8})","$1 $2",["6"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["1[16-8]|2[259]|3[124]|4[17-9]|5[124679]"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[1-578]|91"],"0$1"],["(\\d{3})(\\d{3})(\\d{5})","$1 $2 $3",["9"],"0$1"]],"0"],"NO":["47","00","(?:0|[2-9]\\d{3})\\d{4}",[5,8],[["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["[489]|59"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[235-7]"]]],0,0,0,0,0,"[02-689]|7[0-8]"],"NP":["977","00","(?:1\\d|9)\\d{9}|[1-9]\\d{7}",[8,10,11],[["(\\d)(\\d{7})","$1-$2",["1[2-6]"],"0$1"],["(\\d{2})(\\d{6})","$1-$2",["1[01]|[2-8]|9(?:[1-59]|[67][2-6])"],"0$1"],["(\\d{3})(\\d{7})","$1-$2",["9"]]],"0"],"NR":["674","00","(?:444|(?:55|8\\d)\\d|666)\\d{4}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[4-68]"]]]],"NU":["683","00","(?:[47]|888\\d)\\d{3}",[4,7],[["(\\d{3})(\\d{4})","$1 $2",["8"]]]],"NZ":["64","0(?:0|161)","[29]\\d{7,9}|50\\d{5}(?:\\d{2,3})?|6[0-35-9]\\d{6}|7\\d{7,8}|8\\d{4,9}|(?:11\\d|[34])\\d{7}",[5,6,7,8,9,10],[["(\\d{2})(\\d{3,8})","$1 $2",["8[1-579]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2,3})","$1 $2 $3",["50[036-8]|[89]0","50(?:[0367]|88)|[89]0"],"0$1"],["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["24|[346]|7[2-57-9]|9[2-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["2(?:10|74)|[59]|80"],"0$1"],["(\\d{2})(\\d{3,4})(\\d{4})","$1 $2 $3",["1|2[028]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,5})","$1 $2 $3",["2(?:[169]|7[0-35-9])|7|86"],"0$1"]],"0",0,0,0,0,0,0,"00"],"OM":["968","00","(?:1505|[279]\\d{3}|500)\\d{4}|800\\d{5,6}",[7,8,9],[["(\\d{3})(\\d{4,6})","$1 $2",["[58]"]],["(\\d{2})(\\d{6})","$1 $2",["2"]],["(\\d{4})(\\d{4})","$1 $2",["[179]"]]]],"PA":["507","00","(?:00800|8\\d{3})\\d{6}|[68]\\d{7}|[1-57-9]\\d{6}",[7,8,10,11],[["(\\d{3})(\\d{4})","$1-$2",["[1-57-9]"]],["(\\d{4})(\\d{4})","$1-$2",["[68]"]],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["8"]]]],"PE":["51","00|19(?:1[124]|77|90)00","(?:[14-8]|9\\d)\\d{7}",[8,9],[["(\\d{3})(\\d{5})","$1 $2",["80"],"(0$1)"],["(\\d)(\\d{7})","$1 $2",["1"],"(0$1)"],["(\\d{2})(\\d{6})","$1 $2",["[4-8]"],"(0$1)"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["9"]]],"0",0,0,0,0,0,0,"00"," Anexo "],"PF":["689","00","4\\d{5}(?:\\d{2})?|8\\d{7,8}",[6,8,9],[["(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3",["44"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["4|8[7-9]"]],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"]]]],"PG":["675","00|140[1-3]","(?:180|[78]\\d{3})\\d{4}|(?:[2-589]\\d|64)\\d{5}",[7,8],[["(\\d{3})(\\d{4})","$1 $2",["18|[2-69]|85"]],["(\\d{4})(\\d{4})","$1 $2",["[78]"]]],0,0,0,0,0,0,0,"00"],"PH":["63","00","(?:[2-7]|9\\d)\\d{8}|2\\d{5}|(?:1800|8)\\d{7,9}",[6,8,9,10,11,12,13],[["(\\d)(\\d{5})","$1 $2",["2"],"(0$1)"],["(\\d{4})(\\d{4,6})","$1 $2",["3(?:23|39|46)|4(?:2[3-6]|[35]9|4[26]|76)|544|88[245]|(?:52|64|86)2","3(?:230|397|461)|4(?:2(?:35|[46]4|51)|396|4(?:22|63)|59[347]|76[15])|5(?:221|446)|642[23]|8(?:622|8(?:[24]2|5[13]))"],"(0$1)"],["(\\d{5})(\\d{4})","$1 $2",["346|4(?:27|9[35])|883","3469|4(?:279|9(?:30|56))|8834"],"(0$1)"],["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["2"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[3-7]|8[2-8]"],"(0$1)"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["[89]"],"0$1"],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["1"]],["(\\d{4})(\\d{1,2})(\\d{3})(\\d{4})","$1 $2 $3 $4",["1"]]],"0"],"PK":["92","00","122\\d{6}|[24-8]\\d{10,11}|9(?:[013-9]\\d{8,10}|2(?:[01]\\d\\d|2(?:[06-8]\\d|1[01]))\\d{7})|(?:[2-8]\\d{3}|92(?:[0-7]\\d|8[1-9]))\\d{6}|[24-9]\\d{8}|[89]\\d{7}",[8,9,10,11,12],[["(\\d{3})(\\d{3})(\\d{2,7})","$1 $2 $3",["[89]0"],"0$1"],["(\\d{4})(\\d{5})","$1 $2",["1"]],["(\\d{3})(\\d{6,7})","$1 $2",["2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:2[2-8]|3[27-9]|4[2-6]|6[3569]|9[25-8])","9(?:2[3-8]|98)|(?:2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:22|3[27-9]|4[2-6]|6[3569]|9[25-7]))[2-9]"],"(0$1)"],["(\\d{2})(\\d{7,8})","$1 $2",["(?:2[125]|4[0-246-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91)[2-9]"],"(0$1)"],["(\\d{5})(\\d{5})","$1 $2",["58"],"(0$1)"],["(\\d{3})(\\d{7})","$1 $2",["3"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["2[125]|4[0-246-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91"],"(0$1)"],["(\\d{3})(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["[24-9]"],"(0$1)"]],"0"],"PL":["48","00","(?:6|8\\d\\d)\\d{7}|[1-9]\\d{6}(?:\\d{2})?|[26]\\d{5}",[6,7,8,9,10],[["(\\d{5})","$1",["19"]],["(\\d{3})(\\d{3})","$1 $2",["11|20|64"]],["(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3",["(?:1[2-8]|2[2-69]|3[2-4]|4[1-468]|5[24-689]|6[1-3578]|7[14-7]|8[1-79]|9[145])1","(?:1[2-8]|2[2-69]|3[2-4]|4[1-468]|5[24-689]|6[1-3578]|7[14-7]|8[1-79]|9[145])19"]],["(\\d{3})(\\d{2})(\\d{2,3})","$1 $2 $3",["64"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["21|39|45|5[0137]|6[0469]|7[02389]|8(?:0[14]|8)"]],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["1[2-8]|[2-7]|8[1-79]|9[145]"]],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["8"]]]],"PM":["508","00","(?:[45]|80\\d\\d)\\d{5}",[6,9],[["(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3",["[45]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"],"0$1"]],"0"],"PR":["1","011","(?:[589]\\d\\d|787)\\d{7}",[10],0,"1",0,0,0,0,"787|939"],"PS":["970","00","[2489]2\\d{6}|(?:1\\d|5)\\d{8}",[8,9,10],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["[2489]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["5"],"0$1"],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["1"]]],"0"],"PT":["351","00","1693\\d{5}|(?:[26-9]\\d|30)\\d{7}",[9],[["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["2[12]"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["16|[236-9]"]]]],"PW":["680","01[12]","(?:[24-8]\\d\\d|345|900)\\d{4}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[2-9]"]]]],"PY":["595","00","59\\d{4,6}|9\\d{5,10}|(?:[2-46-8]\\d|5[0-8])\\d{4,7}",[6,7,8,9,10,11],[["(\\d{3})(\\d{3,6})","$1 $2",["[2-9]0"],"0$1"],["(\\d{2})(\\d{5})","$1 $2",["[26]1|3[289]|4[1246-8]|7[1-3]|8[1-36]"],"(0$1)"],["(\\d{3})(\\d{4,5})","$1 $2",["2[279]|3[13-5]|4[359]|5|6(?:[34]|7[1-46-8])|7[46-8]|85"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["2[14-68]|3[26-9]|4[1246-8]|6(?:1|75)|7[1-35]|8[1-36]"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["87"]],["(\\d{3})(\\d{6})","$1 $2",["9(?:[5-79]|8[1-6])"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[2-8]"],"0$1"],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["9"]]],"0"],"QA":["974","00","[2-7]\\d{7}|800\\d{4}(?:\\d{2})?|2\\d{6}",[7,8,9],[["(\\d{3})(\\d{4})","$1 $2",["2[126]|8"]],["(\\d{4})(\\d{4})","$1 $2",["[2-7]"]]]],"RE":["262","00","976\\d{6}|(?:26|[68]\\d)\\d{7}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2689]"],"0$1"]],"0",0,0,0,0,"26[23]|69|[89]"],"RO":["40","00","(?:[2378]\\d|90)\\d{7}|[23]\\d{5}",[6,9],[["(\\d{3})(\\d{3})","$1 $2",["2[3-6]","2[3-6]\\d9"],"0$1"],["(\\d{2})(\\d{4})","$1 $2",["219|31"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[23]1"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[237-9]"],"0$1"]],"0",0,0,0,0,0,0,0," int "],"RS":["381","00","38[02-9]\\d{6,9}|6\\d{7,9}|90\\d{4,8}|38\\d{5,6}|(?:7\\d\\d|800)\\d{3,9}|(?:[12]\\d|3[0-79])\\d{5,10}",[6,7,8,9,10,11,12],[["(\\d{3})(\\d{3,9})","$1 $2",["(?:2[389]|39)0|[7-9]"],"0$1"],["(\\d{2})(\\d{5,10})","$1 $2",["[1-36]"],"0$1"]],"0"],"RU":["7","810","8\\d{13}|[347-9]\\d{9}",[10,14],[["(\\d{4})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["7(?:1[0-8]|2[1-9])","7(?:1(?:[0-6]2|7|8[27])|2(?:1[23]|[2-9]2))","7(?:1(?:[0-6]2|7|8[27])|2(?:13[03-69]|62[013-9]))|72[1-57-9]2"],"8 ($1)",1],["(\\d{5})(\\d)(\\d{2})(\\d{2})","$1 $2 $3 $4",["7(?:1[0-68]|2[1-9])","7(?:1(?:[06][3-6]|[18]|2[35]|[3-5][3-5])|2(?:[13][3-5]|[24-689]|7[457]))","7(?:1(?:0(?:[356]|4[023])|[18]|2(?:3[013-9]|5)|3[45]|43[013-79]|5(?:3[1-8]|4[1-7]|5)|6(?:3[0-35-9]|[4-6]))|2(?:1(?:3[178]|[45])|[24-689]|3[35]|7[457]))|7(?:14|23)4[0-8]|71(?:33|45)[1-79]"],"8 ($1)",1],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["7"],"8 ($1)",1],["(\\d{3})(\\d{3})(\\d{2})(\\d{2})","$1 $2-$3-$4",["[349]|8(?:[02-7]|1[1-8])"],"8 ($1)",1],["(\\d{4})(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3 $4",["8"],"8 ($1)"]],"8",0,0,0,0,"3[04-689]|[489]",0,"8~10"],"RW":["250","00","(?:06|[27]\\d\\d|[89]00)\\d{6}",[8,9],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["0"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[7-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["2"]]],"0"],"SA":["966","00","92\\d{7}|(?:[15]|8\\d)\\d{8}",[9,10],[["(\\d{4})(\\d{5})","$1 $2",["9"]],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["1"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["5"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["81"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["8"]]],"0"],"SB":["677","0[01]","(?:[1-6]|[7-9]\\d\\d)\\d{4}",[5,7],[["(\\d{2})(\\d{5})","$1 $2",["7|8[4-9]|9(?:[1-8]|9[0-8])"]]]],"SC":["248","010|0[0-2]","800\\d{4}|(?:[249]\\d|64)\\d{5}",[7],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["[246]|9[57]"]]],0,0,0,0,0,0,0,"00"],"SD":["249","00","[19]\\d{8}",[9],[["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[19]"],"0$1"]],"0"],"SE":["46","00","(?:[26]\\d\\d|9)\\d{9}|[1-9]\\d{8}|[1-689]\\d{7}|[1-4689]\\d{6}|2\\d{5}",[6,7,8,9,10],[["(\\d{2})(\\d{2,3})(\\d{2})","$1-$2 $3",["20"],"0$1",0,"$1 $2 $3"],["(\\d{3})(\\d{4})","$1-$2",["9(?:00|39|44|9)"],"0$1",0,"$1 $2"],["(\\d{2})(\\d{3})(\\d{2})","$1-$2 $3",["[12][136]|3[356]|4[0246]|6[03]|90[1-9]"],"0$1",0,"$1 $2 $3"],["(\\d)(\\d{2,3})(\\d{2})(\\d{2})","$1-$2 $3 $4",["8"],"0$1",0,"$1 $2 $3 $4"],["(\\d{3})(\\d{2,3})(\\d{2})","$1-$2 $3",["1[2457]|2(?:[247-9]|5[0138])|3[0247-9]|4[1357-9]|5[0-35-9]|6(?:[125689]|4[02-57]|7[0-2])|9(?:[125-8]|3[02-5]|4[0-3])"],"0$1",0,"$1 $2 $3"],["(\\d{3})(\\d{2,3})(\\d{3})","$1-$2 $3",["9(?:00|39|44)"],"0$1",0,"$1 $2 $3"],["(\\d{2})(\\d{2,3})(\\d{2})(\\d{2})","$1-$2 $3 $4",["1[13689]|2[0136]|3[1356]|4[0246]|54|6[03]|90[1-9]"],"0$1",0,"$1 $2 $3 $4"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1-$2 $3 $4",["10|7"],"0$1",0,"$1 $2 $3 $4"],["(\\d)(\\d{3})(\\d{3})(\\d{2})","$1-$2 $3 $4",["8"],"0$1",0,"$1 $2 $3 $4"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1-$2 $3 $4",["[13-5]|2(?:[247-9]|5[0138])|6(?:[124-689]|7[0-2])|9(?:[125-8]|3[02-5]|4[0-3])"],"0$1",0,"$1 $2 $3 $4"],["(\\d{3})(\\d{2})(\\d{2})(\\d{3})","$1-$2 $3 $4",["9"],"0$1",0,"$1 $2 $3 $4"],["(\\d{3})(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1-$2 $3 $4 $5",["[26]"],"0$1",0,"$1 $2 $3 $4 $5"]],"0"],"SG":["65","0[0-3]\\d","(?:(?:1\\d|8)\\d\\d|7000)\\d{7}|[3689]\\d{7}",[8,10,11],[["(\\d{4})(\\d{4})","$1 $2",["[369]|8(?:0[1-5]|[1-9])"]],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["8"]],["(\\d{4})(\\d{4})(\\d{3})","$1 $2 $3",["7"]],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["1"]]]],"SH":["290","00","(?:[256]\\d|8)\\d{3}",[4,5],0,0,0,0,0,0,"[256]"],"SI":["386","00|10(?:22|66|88|99)","[1-7]\\d{7}|8\\d{4,7}|90\\d{4,6}",[5,6,7,8],[["(\\d{2})(\\d{3,6})","$1 $2",["8[09]|9"],"0$1"],["(\\d{3})(\\d{5})","$1 $2",["59|8"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[37][01]|4[0139]|51|6"],"0$1"],["(\\d)(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[1-57]"],"(0$1)"]],"0",0,0,0,0,0,0,"00"],"SJ":["47","00","0\\d{4}|(?:[489]\\d|[57]9)\\d{6}",[5,8],0,0,0,0,0,0,"79"],"SK":["421","00","[2-689]\\d{8}|[2-59]\\d{6}|[2-5]\\d{5}",[6,7,9],[["(\\d)(\\d{2})(\\d{3,4})","$1 $2 $3",["21"],"0$1"],["(\\d{2})(\\d{2})(\\d{2,3})","$1 $2 $3",["[3-5][1-8]1","[3-5][1-8]1[67]"],"0$1"],["(\\d)(\\d{3})(\\d{3})(\\d{2})","$1/$2 $3 $4",["2"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[689]"],"0$1"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1/$2 $3 $4",["[3-5]"],"0$1"]],"0"],"SL":["232","00","(?:[237-9]\\d|66)\\d{6}",[8],[["(\\d{2})(\\d{6})","$1 $2",["[236-9]"],"(0$1)"]],"0"],"SM":["378","00","(?:0549|[5-7]\\d)\\d{6}",[8,10],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[5-7]"]],["(\\d{4})(\\d{6})","$1 $2",["0"]]],0,0,"([89]\\d{5})$","0549$1"],"SN":["221","00","(?:[378]\\d|93)\\d{7}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"]],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[379]"]]]],"SO":["252","00","[346-9]\\d{8}|[12679]\\d{7}|[1-5]\\d{6}|[1348]\\d{5}",[6,7,8,9],[["(\\d{2})(\\d{4})","$1 $2",["8[125]"]],["(\\d{6})","$1",["[134]"]],["(\\d)(\\d{6})","$1 $2",["[15]|2[0-79]|3[0-46-8]|4[0-7]"]],["(\\d)(\\d{7})","$1 $2",["24|[67]"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[3478]|64|90"]],["(\\d{2})(\\d{5,7})","$1 $2",["1|28|6(?:0[5-7]|[1-35-9])|9[2-9]"]]],"0"],"SR":["597","00","(?:[2-5]|68|[78]\\d)\\d{5}",[6,7],[["(\\d{2})(\\d{2})(\\d{2})","$1-$2-$3",["56"]],["(\\d{3})(\\d{3})","$1-$2",["[2-5]"]],["(\\d{3})(\\d{4})","$1-$2",["[6-8]"]]]],"SS":["211","00","[19]\\d{8}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[19]"],"0$1"]],"0"],"ST":["239","00","(?:22|9\\d)\\d{5}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[29]"]]]],"SV":["503","00","[267]\\d{7}|[89]00\\d{4}(?:\\d{4})?",[7,8,11],[["(\\d{3})(\\d{4})","$1 $2",["[89]"]],["(\\d{4})(\\d{4})","$1 $2",["[267]"]],["(\\d{3})(\\d{4})(\\d{4})","$1 $2 $3",["[89]"]]]],"SX":["1","011","7215\\d{6}|(?:[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|(5\\d{6})$","721$1",0,"721"],"SY":["963","00","[1-39]\\d{8}|[1-5]\\d{7}",[8,9],[["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[1-5]"],"0$1",1],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["9"],"0$1",1]],"0"],"SZ":["268","00","0800\\d{4}|(?:[237]\\d|900)\\d{6}",[8,9],[["(\\d{4})(\\d{4})","$1 $2",["[0237]"]],["(\\d{5})(\\d{4})","$1 $2",["9"]]]],"TA":["290","00","8\\d{3}",[4],0,0,0,0,0,0,"8"],"TC":["1","011","(?:[58]\\d\\d|649|900)\\d{7}",[10],0,"1",0,"1|([2-479]\\d{6})$","649$1",0,"649"],"TD":["235","00|16","(?:22|[69]\\d|77)\\d{6}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2679]"]]],0,0,0,0,0,0,0,"00"],"TG":["228","00","[279]\\d{7}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[279]"]]]],"TH":["66","00[1-9]","(?:001800|[2-57]|[689]\\d)\\d{7}|1\\d{7,9}",[8,9,10,13],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["2"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[13-9]"],"0$1"],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["1"]]],"0"],"TJ":["992","810","(?:00|[1-57-9]\\d)\\d{7}",[9],[["(\\d{6})(\\d)(\\d{2})","$1 $2 $3",["331","3317"]],["(\\d{3})(\\d{2})(\\d{4})","$1 $2 $3",["[34]7|91[78]"]],["(\\d{4})(\\d)(\\d{4})","$1 $2 $3",["3[1-5]"]],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[0-57-9]"]]],0,0,0,0,0,0,0,"8~10"],"TK":["690","00","[2-47]\\d{3,6}",[4,5,6,7]],"TL":["670","00","7\\d{7}|(?:[2-47]\\d|[89]0)\\d{5}",[7,8],[["(\\d{3})(\\d{4})","$1 $2",["[2-489]|70"]],["(\\d{4})(\\d{4})","$1 $2",["7"]]]],"TM":["993","810","[1-6]\\d{7}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2-$3-$4",["12"],"(8 $1)"],["(\\d{3})(\\d)(\\d{2})(\\d{2})","$1 $2-$3-$4",["[1-5]"],"(8 $1)"],["(\\d{2})(\\d{6})","$1 $2",["6"],"8 $1"]],"8",0,0,0,0,0,0,"8~10"],"TN":["216","00","[2-57-9]\\d{7}",[8],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[2-57-9]"]]]],"TO":["676","00","(?:0800|(?:[5-8]\\d\\d|999)\\d)\\d{3}|[2-8]\\d{4}",[5,7],[["(\\d{2})(\\d{3})","$1-$2",["[2-4]|50|6[09]|7[0-24-69]|8[05]"]],["(\\d{4})(\\d{3})","$1 $2",["0"]],["(\\d{3})(\\d{4})","$1 $2",["[5-9]"]]]],"TR":["90","00","4\\d{6}|8\\d{11,12}|(?:[2-58]\\d\\d|900)\\d{7}",[7,10,12,13],[["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["512|8[01589]|90"],"0$1",1],["(\\d{3})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["5(?:[0-59]|61)","5(?:[0-59]|616)","5(?:[0-59]|6161)"],"0$1",1],["(\\d{3})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[24][1-8]|3[1-9]"],"(0$1)",1],["(\\d{3})(\\d{3})(\\d{6,7})","$1 $2 $3",["80"],"0$1",1]],"0"],"TT":["1","011","(?:[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-46-8]\\d{6})$","868$1",0,"868"],"TV":["688","00","(?:2|7\\d\\d|90)\\d{4}",[5,6,7],[["(\\d{2})(\\d{3})","$1 $2",["2"]],["(\\d{2})(\\d{4})","$1 $2",["90"]],["(\\d{2})(\\d{5})","$1 $2",["7"]]]],"TW":["886","0(?:0[25-79]|19)","[2-689]\\d{8}|7\\d{9,10}|[2-8]\\d{7}|2\\d{6}",[7,8,9,10,11],[["(\\d{2})(\\d)(\\d{4})","$1 $2 $3",["202"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[258]0"],"0$1"],["(\\d)(\\d{3,4})(\\d{4})","$1 $2 $3",["[23568]|4(?:0[02-48]|[1-47-9])|7[1-9]","[23568]|4(?:0[2-48]|[1-47-9])|(?:400|7)[1-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[49]"],"0$1"],["(\\d{2})(\\d{4})(\\d{4,5})","$1 $2 $3",["7"],"0$1"]],"0",0,0,0,0,0,0,0,"#"],"TZ":["255","00[056]","(?:[25-8]\\d|41|90)\\d{7}",[9],[["(\\d{3})(\\d{2})(\\d{4})","$1 $2 $3",["[89]"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[24]"],"0$1"],["(\\d{2})(\\d{7})","$1 $2",["5"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[67]"],"0$1"]],"0"],"UA":["380","00","[89]\\d{9}|[3-9]\\d{8}",[9,10],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["6[12][29]|(?:3[1-8]|4[136-8]|5[12457]|6[49])2|(?:56|65)[24]","6[12][29]|(?:35|4[1378]|5[12457]|6[49])2|(?:56|65)[24]|(?:3[1-46-8]|46)2[013-9]"],"0$1"],["(\\d{4})(\\d{5})","$1 $2",["3[1-8]|4(?:[1367]|[45][6-9]|8[4-6])|5(?:[1-5]|6[0135689]|7[4-6])|6(?:[12][3-7]|[459])","3[1-8]|4(?:[1367]|[45][6-9]|8[4-6])|5(?:[1-5]|6(?:[015689]|3[02389])|7[4-6])|6(?:[12][3-7]|[459])"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[3-7]|89|9[1-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["[89]"],"0$1"]],"0",0,0,0,0,0,0,"0~0"],"UG":["256","00[057]","800\\d{6}|(?:[29]0|[347]\\d)\\d{7}",[9],[["(\\d{4})(\\d{5})","$1 $2",["202","2024"],"0$1"],["(\\d{3})(\\d{6})","$1 $2",["[27-9]|4(?:6[45]|[7-9])"],"0$1"],["(\\d{2})(\\d{7})","$1 $2",["[34]"],"0$1"]],"0"],"US":["1","011","[2-9]\\d{9}|3\\d{6}",[10],[["(\\d{3})(\\d{4})","$1-$2",["310"],0,1],["(\\d{3})(\\d{3})(\\d{4})","($1) $2-$3",["[2-9]"],0,1,"$1-$2-$3"]],"1",0,0,0,0,0,[["505(?:[2-57-9]\\d\\d|6(?:[0-35-9]\\d|44))\\d{4}|(?:2(?:0[1-35-9]|1[02-9]|2[03-589]|3[149]|4[08]|5[1-46]|6[0279]|7[0269]|8[13])|3(?:0[1-57-9]|1[02-9]|2[01356]|3[0-24679]|4[167]|5[12]|6[014]|8[056])|4(?:0[124-9]|1[02-579]|2[3-5]|3[0245]|4[023578]|58|6[349]|7[0589]|8[04])|5(?:0[1-47-9]|1[0235-8]|20|3[0149]|4[01]|5[19]|6[1-47]|7[0-5]|8[0256])|6(?:0[1-35-9]|1[024-9]|2[03689]|[34][016]|5[01679]|6[0-279]|78|8[0-29])|7(?:0[1-46-8]|1[2-9]|2[04-7]|3[1247]|4[037]|5[47]|6[02359]|7[0-59]|8[156])|8(?:0[1-68]|1[02-8]|2[068]|3[0-289]|4[03578]|5[046-9]|6[02-5]|7[028])|9(?:0[1346-9]|1[02-9]|2[0589]|3[0146-8]|4[01357-9]|5[12469]|7[0-389]|8[04-69]))[2-9]\\d{6}"],[""],["8(?:00|33|44|55|66|77|88)[2-9]\\d{6}"],["900[2-9]\\d{6}"],["52(?:3(?:[2-46-9][02-9]\\d|5(?:[02-46-9]\\d|5[0-46-9]))|4(?:[2-478][02-9]\\d|5(?:[034]\\d|2[024-9]|5[0-46-9])|6(?:0[1-9]|[2-9]\\d)|9(?:[05-9]\\d|2[0-5]|49)))\\d{4}|52[34][2-9]1[02-9]\\d{4}|5(?:00|2[125-7]|33|44|66|77|88)[2-9]\\d{6}"]]],"UY":["598","0(?:0|1[3-9]\\d)","4\\d{9}|[1249]\\d{7}|(?:[49]\\d|80)\\d{5}",[7,8,10],[["(\\d{3})(\\d{4})","$1 $2",["405|8|90"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["9"],"0$1"],["(\\d{4})(\\d{4})","$1 $2",["[124]"]],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["4"],"0$1"]],"0",0,0,0,0,0,0,"00"," int. "],"UZ":["998","810","(?:33|55|[679]\\d|88)\\d{7}",[9],[["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[35-9]"],"8 $1"]],"8",0,0,0,0,0,0,"8~10"],"VA":["39","00","0\\d{5,10}|3[0-8]\\d{7,10}|55\\d{8}|8\\d{5}(?:\\d{2,4})?|(?:1\\d|39)\\d{7,8}",[6,7,8,9,10,11],0,0,0,0,0,0,"06698"],"VC":["1","011","(?:[58]\\d\\d|784|900)\\d{7}",[10],0,"1",0,"1|([2-7]\\d{6})$","784$1",0,"784"],"VE":["58","00","[68]00\\d{7}|(?:[24]\\d|[59]0)\\d{8}",[10],[["(\\d{3})(\\d{7})","$1-$2",["[24-689]"],"0$1"]],"0"],"VG":["1","011","(?:284|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-578]\\d{6})$","284$1",0,"284"],"VI":["1","011","[58]\\d{9}|(?:34|90)0\\d{7}",[10],0,"1",0,"1|([2-9]\\d{6})$","340$1",0,"340"],"VN":["84","00","[12]\\d{9}|[135-9]\\d{8}|[16]\\d{7}|[16-8]\\d{6}",[7,8,9,10],[["(\\d{2})(\\d{5})","$1 $2",["80"],"0$1",1],["(\\d{4})(\\d{4,6})","$1 $2",["1"],0,1],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[69]"],"0$1",1],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[3578]"],"0$1",1],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["2[48]"],"0$1",1],["(\\d{3})(\\d{4})(\\d{3})","$1 $2 $3",["2"],"0$1",1]],"0"],"VU":["678","00","[57-9]\\d{6}|(?:[238]\\d|48)\\d{3}",[5,7],[["(\\d{3})(\\d{4})","$1 $2",["[57-9]"]]]],"WF":["681","00","(?:40|72)\\d{4}|8\\d{5}(?:\\d{3})?",[6,9],[["(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3",["[478]"]],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"]]]],"WS":["685","0","(?:[2-6]|8\\d{5})\\d{4}|[78]\\d{6}|[68]\\d{5}",[5,6,7,10],[["(\\d{5})","$1",["[2-5]|6[1-9]"]],["(\\d{3})(\\d{3,7})","$1 $2",["[68]"]],["(\\d{2})(\\d{5})","$1 $2",["7"]]]],"XK":["383","00","[23]\\d{7,8}|(?:4\\d\\d|[89]00)\\d{5}",[8,9],[["(\\d{3})(\\d{5})","$1 $2",["[89]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[2-4]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[23]"],"0$1"]],"0"],"YE":["967","00","(?:1|7\\d)\\d{7}|[1-7]\\d{6}",[7,8,9],[["(\\d)(\\d{3})(\\d{3,4})","$1 $2 $3",["[1-6]|7[24-68]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["7"],"0$1"]],"0"],"YT":["262","00","80\\d{7}|(?:26|63)9\\d{6}",[9],0,"0",0,0,0,0,"269|63"],"ZA":["27","00","[1-79]\\d{8}|8\\d{4,9}",[5,6,7,8,9,10],[["(\\d{2})(\\d{3,4})","$1 $2",["8[1-4]"],"0$1"],["(\\d{2})(\\d{3})(\\d{2,3})","$1 $2 $3",["8[1-4]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["860"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[1-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["8"],"0$1"]],"0"],"ZM":["260","00","800\\d{6}|(?:21|63|[79]\\d)\\d{7}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[28]"],"0$1"],["(\\d{2})(\\d{7})","$1 $2",["[79]"],"0$1"]],"0"],"ZW":["263","00","2(?:[0-57-9]\\d{6,8}|6[0-24-9]\\d{6,7})|[38]\\d{9}|[35-8]\\d{8}|[3-6]\\d{7}|[1-689]\\d{6}|[1-3569]\\d{5}|[1356]\\d{4}",[5,6,7,8,9,10],[["(\\d{3})(\\d{3,5})","$1 $2",["2(?:0[45]|2[278]|[49]8)|3(?:[09]8|17)|6(?:[29]8|37|75)|[23][78]|(?:33|5[15]|6[68])[78]"],"0$1"],["(\\d)(\\d{3})(\\d{2,4})","$1 $2 $3",["[49]"],"0$1"],["(\\d{3})(\\d{4})","$1 $2",["80"],"0$1"],["(\\d{2})(\\d{7})","$1 $2",["24|8[13-59]|(?:2[05-79]|39|5[45]|6[15-8])2","2(?:02[014]|4|[56]20|[79]2)|392|5(?:42|525)|6(?:[16-8]21|52[013])|8[13-59]"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["7"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["2(?:1[39]|2[0157]|[378]|[56][14])|3(?:12|29)","2(?:1[39]|2[0157]|[378]|[56][14])|3(?:123|29)"],"0$1"],["(\\d{4})(\\d{6})","$1 $2",["8"],"0$1"],["(\\d{2})(\\d{3,5})","$1 $2",["1|2(?:0[0-36-9]|12|29|[56])|3(?:1[0-689]|[24-6])|5(?:[0236-9]|1[2-4])|6(?:[013-59]|7[0-46-9])|(?:33|55|6[68])[0-69]|(?:29|3[09]|62)[0-79]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["29[013-9]|39|54"],"0$1"],["(\\d{4})(\\d{3,5})","$1 $2",["(?:25|54)8","258|5483"],"0$1"]],"0"]},"nonGeographic":{"800":["800",0,"(?:00|[1-9]\\d)\\d{6}",[8],[["(\\d{4})(\\d{4})","$1 $2",["\\d"]]],0,0,0,0,0,0,[0,0,["(?:00|[1-9]\\d)\\d{6}"]]],"808":["808",0,"[1-9]\\d{7}",[8],[["(\\d{4})(\\d{4})","$1 $2",["[1-9]"]]],0,0,0,0,0,0,[0,0,0,0,0,0,0,0,0,["[1-9]\\d{7}"]]],"870":["870",0,"7\\d{11}|[35-7]\\d{8}",[9,12],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[35-7]"]]],0,0,0,0,0,0,[0,["(?:[356]|774[45])\\d{8}|7[6-8]\\d{7}"]]],"878":["878",0,"10\\d{10}",[12],[["(\\d{2})(\\d{5})(\\d{5})","$1 $2 $3",["1"]]],0,0,0,0,0,0,[0,0,0,0,0,0,0,0,["10\\d{10}"]]],"881":["881",0,"[0-36-9]\\d{8}",[9],[["(\\d)(\\d{3})(\\d{5})","$1 $2 $3",["[0-36-9]"]]],0,0,0,0,0,0,[0,["[0-36-9]\\d{8}"]]],"882":["882",0,"[13]\\d{6}(?:\\d{2,5})?|285\\d{9}|(?:[19]\\d|49)\\d{6}",[7,8,9,10,11,12],[["(\\d{2})(\\d{5})","$1 $2",["16|342"]],["(\\d{2})(\\d{6})","$1 $2",["4"]],["(\\d{2})(\\d{2})(\\d{4})","$1 $2 $3",["[19]"]],["(\\d{2})(\\d{4})(\\d{3})","$1 $2 $3",["3[23]"]],["(\\d{2})(\\d{3,4})(\\d{4})","$1 $2 $3",["1"]],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["34[57]"]],["(\\d{3})(\\d{4})(\\d{4})","$1 $2 $3",["34"]],["(\\d{2})(\\d{4,5})(\\d{5})","$1 $2 $3",["[1-3]"]]],0,0,0,0,0,0,[0,["342\\d{4}|(?:337|49)\\d{6}|3(?:2|47|7\\d{3})\\d{7}",[7,8,9,10,12]],0,0,0,0,0,0,["1(?:3(?:0[0347]|[13][0139]|2[035]|4[013568]|6[0459]|7[06]|8[15-8]|9[0689])\\d{4}|6\\d{5,10})|(?:(?:285\\d\\d|3(?:45|[69]\\d{3}))\\d|9[89])\\d{6}"]]],"883":["883",0,"(?:210|370\\d\\d)\\d{7}|51\\d{7}(?:\\d{3})?",[9,10,12],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["510"]],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["2"]],["(\\d{4})(\\d{4})(\\d{4})","$1 $2 $3",["51[13]"]],["(\\d{3})(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["[35]"]]],0,0,0,0,0,0,[0,0,0,0,0,0,0,0,["(?:210|(?:370[1-9]|51[013]0)\\d)\\d{7}|5100\\d{5}"]]],"888":["888",0,"\\d{11}",[11],[["(\\d{3})(\\d{3})(\\d{5})","$1 $2 $3"]],0,0,0,0,0,0,[0,0,0,0,0,0,["\\d{11}"]]],"979":["979",0,"[1359]\\d{8}",[9],[["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["[1359]"]]],0,0,0,0,0,0,[0,0,0,["[1359]\\d{8}"]]]}};

    // Importing from a ".js" file is a workaround for Node.js "ES Modules"

    function withMetadataArgument(func, _arguments) {
    	var args = Array.prototype.slice.call(_arguments);
    	args.push(metadata);
    	return func.apply(this, args)
    }

    function _typeof$2(obj) { "@babel/helpers - typeof"; return _typeof$2 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof$2(obj); }

    function _defineProperties$2(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$2(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$2(Constructor.prototype, protoProps); if (staticProps) _defineProperties$2(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

    function _classCallCheck$2(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

    function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

    function _possibleConstructorReturn(self, call) { if (call && (_typeof$2(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

    function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

    function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

    function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

    function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

    function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

    function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

    function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

    // https://stackoverflow.com/a/46971044/970769
    // "Breaking changes in Typescript 2.1"
    // "Extending built-ins like Error, Array, and Map may no longer work."
    // "As a recommendation, you can manually adjust the prototype immediately after any super(...) calls."
    // https://github.com/Microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    var ParseError = /*#__PURE__*/function (_Error) {
      _inherits(ParseError, _Error);

      var _super = _createSuper(ParseError);

      function ParseError(code) {
        var _this;

        _classCallCheck$2(this, ParseError);

        _this = _super.call(this, code); // Set the prototype explicitly.
        // Any subclass of FooError will have to manually set the prototype as well.

        Object.setPrototypeOf(_assertThisInitialized(_this), ParseError.prototype);
        _this.name = _this.constructor.name;
        return _this;
      }

      return _createClass$2(ParseError);
    }( /*#__PURE__*/_wrapNativeSuper(Error));

    // The minimum length of the national significant number.
    var MIN_LENGTH_FOR_NSN = 2; // The ITU says the maximum length should be 15,
    // but one can find longer numbers in Germany.

    var MAX_LENGTH_FOR_NSN = 17; // The maximum length of the country calling code.

    var MAX_LENGTH_COUNTRY_CODE = 3; // Digits accepted in phone numbers
    // (ascii, fullwidth, arabic-indic, and eastern arabic digits).

    var VALID_DIGITS = "0-9\uFF10-\uFF19\u0660-\u0669\u06F0-\u06F9"; // `DASHES` will be right after the opening square bracket of the "character class"

    var DASHES = "-\u2010-\u2015\u2212\u30FC\uFF0D";
    var SLASHES = "\uFF0F/";
    var DOTS = "\uFF0E.";
    var WHITESPACE = " \xA0\xAD\u200B\u2060\u3000";
    var BRACKETS = "()\uFF08\uFF09\uFF3B\uFF3D\\[\\]"; // export const OPENING_BRACKETS = '(\uFF08\uFF3B\\\['

    var TILDES = "~\u2053\u223C\uFF5E"; // Regular expression of acceptable punctuation found in phone numbers. This
    // excludes punctuation found as a leading character only. This consists of dash
    // characters, white space characters, full stops, slashes, square brackets,
    // parentheses and tildes. Full-width variants are also present.

    var VALID_PUNCTUATION = "".concat(DASHES).concat(SLASHES).concat(DOTS).concat(WHITESPACE).concat(BRACKETS).concat(TILDES);
    var PLUS_CHARS = "+\uFF0B"; // const LEADING_PLUS_CHARS_PATTERN = new RegExp('^[' + PLUS_CHARS + ']+')

    // Copy-pasted from:
    // https://github.com/substack/semver-compare/blob/master/index.js
    //
    // Inlining this function because some users reported issues with
    // importing from `semver-compare` in a browser with ES6 "native" modules.
    //
    // Fixes `semver-compare` not being able to compare versions with alpha/beta/etc "tags".
    // https://github.com/catamphetamine/libphonenumber-js/issues/381
    function compare (a, b) {
      a = a.split('-');
      b = b.split('-');
      var pa = a[0].split('.');
      var pb = b[0].split('.');

      for (var i = 0; i < 3; i++) {
        var na = Number(pa[i]);
        var nb = Number(pb[i]);
        if (na > nb) return 1;
        if (nb > na) return -1;
        if (!isNaN(na) && isNaN(nb)) return 1;
        if (isNaN(na) && !isNaN(nb)) return -1;
      }

      if (a[1] && b[1]) {
        return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
      }

      return !a[1] && b[1] ? 1 : a[1] && !b[1] ? -1 : 0;
    }

    function _typeof$1(obj) { "@babel/helpers - typeof"; return _typeof$1 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof$1(obj); }

    function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties$1(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$1(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$1(Constructor.prototype, protoProps); if (staticProps) _defineProperties$1(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

    var V3 = '1.2.0'; // Moved `001` country code to "nonGeographic" section of metadata.

    var V4 = '1.7.35';
    var DEFAULT_EXT_PREFIX = ' ext. ';
    var CALLING_CODE_REG_EXP = /^\d+$/;
    /**
     * See: https://gitlab.com/catamphetamine/libphonenumber-js/blob/master/METADATA.md
     */

    var Metadata = /*#__PURE__*/function () {
      function Metadata(metadata) {
        _classCallCheck$1(this, Metadata);

        validateMetadata(metadata);
        this.metadata = metadata;
        setVersion.call(this, metadata);
      }

      _createClass$1(Metadata, [{
        key: "getCountries",
        value: function getCountries() {
          return Object.keys(this.metadata.countries).filter(function (_) {
            return _ !== '001';
          });
        }
      }, {
        key: "getCountryMetadata",
        value: function getCountryMetadata(countryCode) {
          return this.metadata.countries[countryCode];
        }
      }, {
        key: "nonGeographic",
        value: function nonGeographic() {
          if (this.v1 || this.v2 || this.v3) return; // `nonGeographical` was a typo.
          // It's present in metadata generated from `1.7.35` to `1.7.37`.
          // The test case could be found by searching for "nonGeographical".

          return this.metadata.nonGeographic || this.metadata.nonGeographical;
        }
      }, {
        key: "hasCountry",
        value: function hasCountry(country) {
          return this.getCountryMetadata(country) !== undefined;
        }
      }, {
        key: "hasCallingCode",
        value: function hasCallingCode(callingCode) {
          if (this.getCountryCodesForCallingCode(callingCode)) {
            return true;
          }

          if (this.nonGeographic()) {
            if (this.nonGeographic()[callingCode]) {
              return true;
            }
          } else {
            // A hacky workaround for old custom metadata (generated before V4).
            var countryCodes = this.countryCallingCodes()[callingCode];

            if (countryCodes && countryCodes.length === 1 && countryCodes[0] === '001') {
              return true;
            }
          }
        }
      }, {
        key: "isNonGeographicCallingCode",
        value: function isNonGeographicCallingCode(callingCode) {
          if (this.nonGeographic()) {
            return this.nonGeographic()[callingCode] ? true : false;
          } else {
            return this.getCountryCodesForCallingCode(callingCode) ? false : true;
          }
        } // Deprecated.

      }, {
        key: "country",
        value: function country(countryCode) {
          return this.selectNumberingPlan(countryCode);
        }
      }, {
        key: "selectNumberingPlan",
        value: function selectNumberingPlan(countryCode, callingCode) {
          // Supports just passing `callingCode` as the first argument.
          if (countryCode && CALLING_CODE_REG_EXP.test(countryCode)) {
            callingCode = countryCode;
            countryCode = null;
          }

          if (countryCode && countryCode !== '001') {
            if (!this.hasCountry(countryCode)) {
              throw new Error("Unknown country: ".concat(countryCode));
            }

            this.numberingPlan = new NumberingPlan(this.getCountryMetadata(countryCode), this);
          } else if (callingCode) {
            if (!this.hasCallingCode(callingCode)) {
              throw new Error("Unknown calling code: ".concat(callingCode));
            }

            this.numberingPlan = new NumberingPlan(this.getNumberingPlanMetadata(callingCode), this);
          } else {
            this.numberingPlan = undefined;
          }

          return this;
        }
      }, {
        key: "getCountryCodesForCallingCode",
        value: function getCountryCodesForCallingCode(callingCode) {
          var countryCodes = this.countryCallingCodes()[callingCode];

          if (countryCodes) {
            // Metadata before V4 included "non-geographic entity" calling codes
            // inside `country_calling_codes` (for example, `"881":["001"]`).
            // Now the semantics of `country_calling_codes` has changed:
            // it's specifically for "countries" now.
            // Older versions of custom metadata will simply skip parsing
            // "non-geographic entity" phone numbers with new versions
            // of this library: it's not considered a bug,
            // because such numbers are extremely rare,
            // and developers extremely rarely use custom metadata.
            if (countryCodes.length === 1 && countryCodes[0].length === 3) {
              return;
            }

            return countryCodes;
          }
        }
      }, {
        key: "getCountryCodeForCallingCode",
        value: function getCountryCodeForCallingCode(callingCode) {
          var countryCodes = this.getCountryCodesForCallingCode(callingCode);

          if (countryCodes) {
            return countryCodes[0];
          }
        }
      }, {
        key: "getNumberingPlanMetadata",
        value: function getNumberingPlanMetadata(callingCode) {
          var countryCode = this.getCountryCodeForCallingCode(callingCode);

          if (countryCode) {
            return this.getCountryMetadata(countryCode);
          }

          if (this.nonGeographic()) {
            var metadata = this.nonGeographic()[callingCode];

            if (metadata) {
              return metadata;
            }
          } else {
            // A hacky workaround for old custom metadata (generated before V4).
            // In that metadata, there was no concept of "non-geographic" metadata
            // so metadata for `001` country code was stored along with other countries.
            // The test case can be found by searching for:
            // "should work around `nonGeographic` metadata not existing".
            var countryCodes = this.countryCallingCodes()[callingCode];

            if (countryCodes && countryCodes.length === 1 && countryCodes[0] === '001') {
              return this.metadata.countries['001'];
            }
          }
        } // Deprecated.

      }, {
        key: "countryCallingCode",
        value: function countryCallingCode() {
          return this.numberingPlan.callingCode();
        } // Deprecated.

      }, {
        key: "IDDPrefix",
        value: function IDDPrefix() {
          return this.numberingPlan.IDDPrefix();
        } // Deprecated.

      }, {
        key: "defaultIDDPrefix",
        value: function defaultIDDPrefix() {
          return this.numberingPlan.defaultIDDPrefix();
        } // Deprecated.

      }, {
        key: "nationalNumberPattern",
        value: function nationalNumberPattern() {
          return this.numberingPlan.nationalNumberPattern();
        } // Deprecated.

      }, {
        key: "possibleLengths",
        value: function possibleLengths() {
          return this.numberingPlan.possibleLengths();
        } // Deprecated.

      }, {
        key: "formats",
        value: function formats() {
          return this.numberingPlan.formats();
        } // Deprecated.

      }, {
        key: "nationalPrefixForParsing",
        value: function nationalPrefixForParsing() {
          return this.numberingPlan.nationalPrefixForParsing();
        } // Deprecated.

      }, {
        key: "nationalPrefixTransformRule",
        value: function nationalPrefixTransformRule() {
          return this.numberingPlan.nationalPrefixTransformRule();
        } // Deprecated.

      }, {
        key: "leadingDigits",
        value: function leadingDigits() {
          return this.numberingPlan.leadingDigits();
        } // Deprecated.

      }, {
        key: "hasTypes",
        value: function hasTypes() {
          return this.numberingPlan.hasTypes();
        } // Deprecated.

      }, {
        key: "type",
        value: function type(_type) {
          return this.numberingPlan.type(_type);
        } // Deprecated.

      }, {
        key: "ext",
        value: function ext() {
          return this.numberingPlan.ext();
        }
      }, {
        key: "countryCallingCodes",
        value: function countryCallingCodes() {
          if (this.v1) return this.metadata.country_phone_code_to_countries;
          return this.metadata.country_calling_codes;
        } // Deprecated.

      }, {
        key: "chooseCountryByCountryCallingCode",
        value: function chooseCountryByCountryCallingCode(callingCode) {
          return this.selectNumberingPlan(callingCode);
        }
      }, {
        key: "hasSelectedNumberingPlan",
        value: function hasSelectedNumberingPlan() {
          return this.numberingPlan !== undefined;
        }
      }]);

      return Metadata;
    }();

    var NumberingPlan = /*#__PURE__*/function () {
      function NumberingPlan(metadata, globalMetadataObject) {
        _classCallCheck$1(this, NumberingPlan);

        this.globalMetadataObject = globalMetadataObject;
        this.metadata = metadata;
        setVersion.call(this, globalMetadataObject.metadata);
      }

      _createClass$1(NumberingPlan, [{
        key: "callingCode",
        value: function callingCode() {
          return this.metadata[0];
        } // Formatting information for regions which share
        // a country calling code is contained by only one region
        // for performance reasons. For example, for NANPA region
        // ("North American Numbering Plan Administration",
        //  which includes USA, Canada, Cayman Islands, Bahamas, etc)
        // it will be contained in the metadata for `US`.

      }, {
        key: "getDefaultCountryMetadataForRegion",
        value: function getDefaultCountryMetadataForRegion() {
          return this.globalMetadataObject.getNumberingPlanMetadata(this.callingCode());
        } // Is always present.

      }, {
        key: "IDDPrefix",
        value: function IDDPrefix() {
          if (this.v1 || this.v2) return;
          return this.metadata[1];
        } // Is only present when a country supports multiple IDD prefixes.

      }, {
        key: "defaultIDDPrefix",
        value: function defaultIDDPrefix() {
          if (this.v1 || this.v2) return;
          return this.metadata[12];
        }
      }, {
        key: "nationalNumberPattern",
        value: function nationalNumberPattern() {
          if (this.v1 || this.v2) return this.metadata[1];
          return this.metadata[2];
        } // "possible length" data is always present in Google's metadata.

      }, {
        key: "possibleLengths",
        value: function possibleLengths() {
          if (this.v1) return;
          return this.metadata[this.v2 ? 2 : 3];
        }
      }, {
        key: "_getFormats",
        value: function _getFormats(metadata) {
          return metadata[this.v1 ? 2 : this.v2 ? 3 : 4];
        } // For countries of the same region (e.g. NANPA)
        // formats are all stored in the "main" country for that region.
        // E.g. "RU" and "KZ", "US" and "CA".

      }, {
        key: "formats",
        value: function formats() {
          var _this = this;

          var formats = this._getFormats(this.metadata) || this._getFormats(this.getDefaultCountryMetadataForRegion()) || [];
          return formats.map(function (_) {
            return new Format(_, _this);
          });
        }
      }, {
        key: "nationalPrefix",
        value: function nationalPrefix() {
          return this.metadata[this.v1 ? 3 : this.v2 ? 4 : 5];
        }
      }, {
        key: "_getNationalPrefixFormattingRule",
        value: function _getNationalPrefixFormattingRule(metadata) {
          return metadata[this.v1 ? 4 : this.v2 ? 5 : 6];
        } // For countries of the same region (e.g. NANPA)
        // national prefix formatting rule is stored in the "main" country for that region.
        // E.g. "RU" and "KZ", "US" and "CA".

      }, {
        key: "nationalPrefixFormattingRule",
        value: function nationalPrefixFormattingRule() {
          return this._getNationalPrefixFormattingRule(this.metadata) || this._getNationalPrefixFormattingRule(this.getDefaultCountryMetadataForRegion());
        }
      }, {
        key: "_nationalPrefixForParsing",
        value: function _nationalPrefixForParsing() {
          return this.metadata[this.v1 ? 5 : this.v2 ? 6 : 7];
        }
      }, {
        key: "nationalPrefixForParsing",
        value: function nationalPrefixForParsing() {
          // If `national_prefix_for_parsing` is not set explicitly,
          // then infer it from `national_prefix` (if any)
          return this._nationalPrefixForParsing() || this.nationalPrefix();
        }
      }, {
        key: "nationalPrefixTransformRule",
        value: function nationalPrefixTransformRule() {
          return this.metadata[this.v1 ? 6 : this.v2 ? 7 : 8];
        }
      }, {
        key: "_getNationalPrefixIsOptionalWhenFormatting",
        value: function _getNationalPrefixIsOptionalWhenFormatting() {
          return !!this.metadata[this.v1 ? 7 : this.v2 ? 8 : 9];
        } // For countries of the same region (e.g. NANPA)
        // "national prefix is optional when formatting" flag is
        // stored in the "main" country for that region.
        // E.g. "RU" and "KZ", "US" and "CA".

      }, {
        key: "nationalPrefixIsOptionalWhenFormattingInNationalFormat",
        value: function nationalPrefixIsOptionalWhenFormattingInNationalFormat() {
          return this._getNationalPrefixIsOptionalWhenFormatting(this.metadata) || this._getNationalPrefixIsOptionalWhenFormatting(this.getDefaultCountryMetadataForRegion());
        }
      }, {
        key: "leadingDigits",
        value: function leadingDigits() {
          return this.metadata[this.v1 ? 8 : this.v2 ? 9 : 10];
        }
      }, {
        key: "types",
        value: function types() {
          return this.metadata[this.v1 ? 9 : this.v2 ? 10 : 11];
        }
      }, {
        key: "hasTypes",
        value: function hasTypes() {
          // Versions 1.2.0 - 1.2.4: can be `[]`.

          /* istanbul ignore next */
          if (this.types() && this.types().length === 0) {
            return false;
          } // Versions <= 1.2.4: can be `undefined`.
          // Version >= 1.2.5: can be `0`.


          return !!this.types();
        }
      }, {
        key: "type",
        value: function type(_type2) {
          if (this.hasTypes() && getType(this.types(), _type2)) {
            return new Type(getType(this.types(), _type2), this);
          }
        }
      }, {
        key: "ext",
        value: function ext() {
          if (this.v1 || this.v2) return DEFAULT_EXT_PREFIX;
          return this.metadata[13] || DEFAULT_EXT_PREFIX;
        }
      }]);

      return NumberingPlan;
    }();

    var Format = /*#__PURE__*/function () {
      function Format(format, metadata) {
        _classCallCheck$1(this, Format);

        this._format = format;
        this.metadata = metadata;
      }

      _createClass$1(Format, [{
        key: "pattern",
        value: function pattern() {
          return this._format[0];
        }
      }, {
        key: "format",
        value: function format() {
          return this._format[1];
        }
      }, {
        key: "leadingDigitsPatterns",
        value: function leadingDigitsPatterns() {
          return this._format[2] || [];
        }
      }, {
        key: "nationalPrefixFormattingRule",
        value: function nationalPrefixFormattingRule() {
          return this._format[3] || this.metadata.nationalPrefixFormattingRule();
        }
      }, {
        key: "nationalPrefixIsOptionalWhenFormattingInNationalFormat",
        value: function nationalPrefixIsOptionalWhenFormattingInNationalFormat() {
          return !!this._format[4] || this.metadata.nationalPrefixIsOptionalWhenFormattingInNationalFormat();
        }
      }, {
        key: "nationalPrefixIsMandatoryWhenFormattingInNationalFormat",
        value: function nationalPrefixIsMandatoryWhenFormattingInNationalFormat() {
          // National prefix is omitted if there's no national prefix formatting rule
          // set for this country, or when the national prefix formatting rule
          // contains no national prefix itself, or when this rule is set but
          // national prefix is optional for this phone number format
          // (and it is not enforced explicitly)
          return this.usesNationalPrefix() && !this.nationalPrefixIsOptionalWhenFormattingInNationalFormat();
        } // Checks whether national prefix formatting rule contains national prefix.

      }, {
        key: "usesNationalPrefix",
        value: function usesNationalPrefix() {
          return this.nationalPrefixFormattingRule() && // Check that national prefix formatting rule is not a "dummy" one.
          !FIRST_GROUP_ONLY_PREFIX_PATTERN.test(this.nationalPrefixFormattingRule()) // In compressed metadata, `this.nationalPrefixFormattingRule()` is `0`
          // when `national_prefix_formatting_rule` is not present.
          // So, `true` or `false` are returned explicitly here, so that
          // `0` number isn't returned.
          ? true : false;
        }
      }, {
        key: "internationalFormat",
        value: function internationalFormat() {
          return this._format[5] || this.format();
        }
      }]);

      return Format;
    }();
    /**
     * A pattern that is used to determine if the national prefix formatting rule
     * has the first group only, i.e., does not start with the national prefix.
     * Note that the pattern explicitly allows for unbalanced parentheses.
     */


    var FIRST_GROUP_ONLY_PREFIX_PATTERN = /^\(?\$1\)?$/;

    var Type = /*#__PURE__*/function () {
      function Type(type, metadata) {
        _classCallCheck$1(this, Type);

        this.type = type;
        this.metadata = metadata;
      }

      _createClass$1(Type, [{
        key: "pattern",
        value: function pattern() {
          if (this.metadata.v1) return this.type;
          return this.type[0];
        }
      }, {
        key: "possibleLengths",
        value: function possibleLengths() {
          if (this.metadata.v1) return;
          return this.type[1] || this.metadata.possibleLengths();
        }
      }]);

      return Type;
    }();

    function getType(types, type) {
      switch (type) {
        case 'FIXED_LINE':
          return types[0];

        case 'MOBILE':
          return types[1];

        case 'TOLL_FREE':
          return types[2];

        case 'PREMIUM_RATE':
          return types[3];

        case 'PERSONAL_NUMBER':
          return types[4];

        case 'VOICEMAIL':
          return types[5];

        case 'UAN':
          return types[6];

        case 'PAGER':
          return types[7];

        case 'VOIP':
          return types[8];

        case 'SHARED_COST':
          return types[9];
      }
    }

    function validateMetadata(metadata) {
      if (!metadata) {
        throw new Error('[libphonenumber-js] `metadata` argument not passed. Check your arguments.');
      } // `country_phone_code_to_countries` was renamed to
      // `country_calling_codes` in `1.0.18`.


      if (!is_object(metadata) || !is_object(metadata.countries)) {
        throw new Error("[libphonenumber-js] `metadata` argument was passed but it's not a valid metadata. Must be an object having `.countries` child object property. Got ".concat(is_object(metadata) ? 'an object of shape: { ' + Object.keys(metadata).join(', ') + ' }' : 'a ' + type_of(metadata) + ': ' + metadata, "."));
      }
    } // Babel transforms `typeof` into some "branches"
    // so istanbul will show this as "branch not covered".

    /* istanbul ignore next */

    var is_object = function is_object(_) {
      return _typeof$1(_) === 'object';
    }; // Babel transforms `typeof` into some "branches"
    // so istanbul will show this as "branch not covered".

    /* istanbul ignore next */


    var type_of = function type_of(_) {
      return _typeof$1(_);
    };
    /**
     * Returns "country calling code" for a country.
     * Throws an error if the country doesn't exist or isn't supported by this library.
     * @param  {string} country
     * @param  {object} metadata
     * @return {string}
     * @example
     * // Returns "44"
     * getCountryCallingCode("GB")
     */

    function getCountryCallingCode(country, metadata) {
      metadata = new Metadata(metadata);

      if (metadata.hasCountry(country)) {
        return metadata.country(country).countryCallingCode();
      }

      throw new Error("Unknown country: ".concat(country));
    }
    function isSupportedCountry(country, metadata) {
      // metadata = new Metadata(metadata)
      // return metadata.hasCountry(country)
      return metadata.countries[country] !== undefined;
    }

    function setVersion(metadata) {
      var version = metadata.version;

      if (typeof version === 'number') {
        this.v1 = version === 1;
        this.v2 = version === 2;
        this.v3 = version === 3;
        this.v4 = version === 4;
      } else {
        if (!version) {
          this.v1 = true;
        } else if (compare(version, V3) === -1) {
          this.v2 = true;
        } else if (compare(version, V4) === -1) {
          this.v3 = true;
        } else {
          this.v4 = true;
        }
      }
    } // const ISO_COUNTRY_CODE = /^[A-Z]{2}$/
    // function isCountryCode(countryCode) {
    // 	return ISO_COUNTRY_CODE.test(countryCodeOrCountryCallingCode)
    // }

    var RFC3966_EXTN_PREFIX = ';ext=';
    /**
     * Helper method for constructing regular expressions for parsing. Creates
     * an expression that captures up to max_length digits.
     * @return {string} RegEx pattern to capture extension digits.
     */

    var getExtensionDigitsPattern = function getExtensionDigitsPattern(maxLength) {
      return "([".concat(VALID_DIGITS, "]{1,").concat(maxLength, "})");
    };
    /**
     * Helper initialiser method to create the regular-expression pattern to match
     * extensions.
     * Copy-pasted from Google's `libphonenumber`:
     * https://github.com/google/libphonenumber/blob/55b2646ec9393f4d3d6661b9c82ef9e258e8b829/javascript/i18n/phonenumbers/phonenumberutil.js#L759-L766
     * @return {string} RegEx pattern to capture extensions.
     */


    function createExtensionPattern(purpose) {
      // We cap the maximum length of an extension based on the ambiguity of the way
      // the extension is prefixed. As per ITU, the officially allowed length for
      // extensions is actually 40, but we don't support this since we haven't seen real
      // examples and this introduces many false interpretations as the extension labels
      // are not standardized.

      /** @type {string} */
      var extLimitAfterExplicitLabel = '20';
      /** @type {string} */

      var extLimitAfterLikelyLabel = '15';
      /** @type {string} */

      var extLimitAfterAmbiguousChar = '9';
      /** @type {string} */

      var extLimitWhenNotSure = '6';
      /** @type {string} */

      var possibleSeparatorsBetweenNumberAndExtLabel = "[ \xA0\\t,]*"; // Optional full stop (.) or colon, followed by zero or more spaces/tabs/commas.

      /** @type {string} */

      var possibleCharsAfterExtLabel = "[:\\.\uFF0E]?[ \xA0\\t,-]*";
      /** @type {string} */

      var optionalExtnSuffix = "#?"; // Here the extension is called out in more explicit way, i.e mentioning it obvious
      // patterns like "ext.".

      /** @type {string} */

      var explicitExtLabels = "(?:e?xt(?:ensi(?:o\u0301?|\xF3))?n?|\uFF45?\uFF58\uFF54\uFF4E?|\u0434\u043E\u0431|anexo)"; // One-character symbols that can be used to indicate an extension, and less
      // commonly used or more ambiguous extension labels.

      /** @type {string} */

      var ambiguousExtLabels = "(?:[x\uFF58#\uFF03~\uFF5E]|int|\uFF49\uFF4E\uFF54)"; // When extension is not separated clearly.

      /** @type {string} */

      var ambiguousSeparator = "[- ]+"; // This is the same as possibleSeparatorsBetweenNumberAndExtLabel, but not matching
      // comma as extension label may have it.

      /** @type {string} */

      var possibleSeparatorsNumberExtLabelNoComma = "[ \xA0\\t]*"; // ",," is commonly used for auto dialling the extension when connected. First
      // comma is matched through possibleSeparatorsBetweenNumberAndExtLabel, so we do
      // not repeat it here. Semi-colon works in Iphone and Android also to pop up a
      // button with the extension number following.

      /** @type {string} */

      var autoDiallingAndExtLabelsFound = "(?:,{2}|;)";
      /** @type {string} */

      var rfcExtn = RFC3966_EXTN_PREFIX + getExtensionDigitsPattern(extLimitAfterExplicitLabel);
      /** @type {string} */

      var explicitExtn = possibleSeparatorsBetweenNumberAndExtLabel + explicitExtLabels + possibleCharsAfterExtLabel + getExtensionDigitsPattern(extLimitAfterExplicitLabel) + optionalExtnSuffix;
      /** @type {string} */

      var ambiguousExtn = possibleSeparatorsBetweenNumberAndExtLabel + ambiguousExtLabels + possibleCharsAfterExtLabel + getExtensionDigitsPattern(extLimitAfterAmbiguousChar) + optionalExtnSuffix;
      /** @type {string} */

      var americanStyleExtnWithSuffix = ambiguousSeparator + getExtensionDigitsPattern(extLimitWhenNotSure) + "#";
      /** @type {string} */

      var autoDiallingExtn = possibleSeparatorsNumberExtLabelNoComma + autoDiallingAndExtLabelsFound + possibleCharsAfterExtLabel + getExtensionDigitsPattern(extLimitAfterLikelyLabel) + optionalExtnSuffix;
      /** @type {string} */

      var onlyCommasExtn = possibleSeparatorsNumberExtLabelNoComma + "(?:,)+" + possibleCharsAfterExtLabel + getExtensionDigitsPattern(extLimitAfterAmbiguousChar) + optionalExtnSuffix; // The first regular expression covers RFC 3966 format, where the extension is added
      // using ";ext=". The second more generic where extension is mentioned with explicit
      // labels like "ext:". In both the above cases we allow more numbers in extension than
      // any other extension labels. The third one captures when single character extension
      // labels or less commonly used labels are used. In such cases we capture fewer
      // extension digits in order to reduce the chance of falsely interpreting two
      // numbers beside each other as a number + extension. The fourth one covers the
      // special case of American numbers where the extension is written with a hash
      // at the end, such as "- 503#". The fifth one is exclusively for extension
      // autodialling formats which are used when dialling and in this case we accept longer
      // extensions. The last one is more liberal on the number of commas that acts as
      // extension labels, so we have a strict cap on the number of digits in such extensions.

      return rfcExtn + "|" + explicitExtn + "|" + ambiguousExtn + "|" + americanStyleExtnWithSuffix + "|" + autoDiallingExtn + "|" + onlyCommasExtn;
    }

    //  Checks we have at least three leading digits, and only valid punctuation,
    //  alpha characters and digits in the phone number. Does not include extension
    //  data. The symbol 'x' is allowed here as valid punctuation since it is often
    //  used as a placeholder for carrier codes, for example in Brazilian phone
    //  numbers. We also allow multiple '+' characters at the start.
    //
    //  Corresponds to the following:
    //  [digits]{minLengthNsn}|
    //  plus_sign*
    //  (([punctuation]|[star])*[digits]){3,}([punctuation]|[star]|[digits]|[alpha])*
    //
    //  The first reg-ex is to allow short numbers (two digits long) to be parsed if
    //  they are entered as "15" etc, but only if there is no punctuation in them.
    //  The second expression restricts the number of digits to three or more, but
    //  then allows them to be in international form, and to have alpha-characters
    //  and punctuation. We split up the two reg-exes here and combine them when
    //  creating the reg-ex VALID_PHONE_NUMBER_PATTERN itself so we can prefix it
    //  with ^ and append $ to each branch.
    //
    //  "Note VALID_PUNCTUATION starts with a -,
    //   so must be the first in the range" (c) Google devs.
    //  (wtf did they mean by saying that; probably nothing)
    //

    var MIN_LENGTH_PHONE_NUMBER_PATTERN = '[' + VALID_DIGITS + ']{' + MIN_LENGTH_FOR_NSN + '}'; //
    // And this is the second reg-exp:
    // (see MIN_LENGTH_PHONE_NUMBER_PATTERN for a full description of this reg-exp)
    //

    var VALID_PHONE_NUMBER = '[' + PLUS_CHARS + ']{0,1}' + '(?:' + '[' + VALID_PUNCTUATION + ']*' + '[' + VALID_DIGITS + ']' + '){3,}' + '[' + VALID_PUNCTUATION + VALID_DIGITS + ']*'; // This regular expression isn't present in Google's `libphonenumber`
    // and is only used to determine whether the phone number being input
    // is too short for it to even consider it a "valid" number.
    // This is just a way to differentiate between a really invalid phone
    // number like "abcde" and a valid phone number that a user has just
    // started inputting, like "+1" or "1": both these cases would be
    // considered `NOT_A_NUMBER` by Google's `libphonenumber`, but this
    // library can provide a more detailed error message — whether it's
    // really "not a number", or is it just a start of a valid phone number.

    var VALID_PHONE_NUMBER_START_REG_EXP = new RegExp('^' + '[' + PLUS_CHARS + ']{0,1}' + '(?:' + '[' + VALID_PUNCTUATION + ']*' + '[' + VALID_DIGITS + ']' + '){1,2}' + '$', 'i');
    var VALID_PHONE_NUMBER_WITH_EXTENSION = VALID_PHONE_NUMBER + // Phone number extensions
    '(?:' + createExtensionPattern() + ')?'; // The combined regular expression for valid phone numbers:
    //

    var VALID_PHONE_NUMBER_PATTERN = new RegExp( // Either a short two-digit-only phone number
    '^' + MIN_LENGTH_PHONE_NUMBER_PATTERN + '$' + '|' + // Or a longer fully parsed phone number (min 3 characters)
    '^' + VALID_PHONE_NUMBER_WITH_EXTENSION + '$', 'i'); // Checks to see if the string of characters could possibly be a phone number at
    // all. At the moment, checks to see that the string begins with at least 2
    // digits, ignoring any punctuation commonly found in phone numbers. This method
    // does not require the number to be normalized in advance - but does assume
    // that leading non-number symbols have been removed, such as by the method
    // `extract_possible_number`.
    //

    function isViablePhoneNumber(number) {
      return number.length >= MIN_LENGTH_FOR_NSN && VALID_PHONE_NUMBER_PATTERN.test(number);
    } // This is just a way to differentiate between a really invalid phone
    // number like "abcde" and a valid phone number that a user has just
    // started inputting, like "+1" or "1": both these cases would be
    // considered `NOT_A_NUMBER` by Google's `libphonenumber`, but this
    // library can provide a more detailed error message — whether it's
    // really "not a number", or is it just a start of a valid phone number.

    function isViablePhoneNumberStart(number) {
      return VALID_PHONE_NUMBER_START_REG_EXP.test(number);
    }

    // 1 or more valid digits, for use when parsing.

    var EXTN_PATTERN = new RegExp('(?:' + createExtensionPattern() + ')$', 'i'); // Strips any extension (as in, the part of the number dialled after the call is
    // connected, usually indicated with extn, ext, x or similar) from the end of
    // the number, and returns it.

    function extractExtension(number) {
      var start = number.search(EXTN_PATTERN);

      if (start < 0) {
        return {};
      } // If we find a potential extension, and the number preceding this is a viable
      // number, we assume it is an extension.


      var numberWithoutExtension = number.slice(0, start);
      var matches = number.match(EXTN_PATTERN);
      var i = 1;

      while (i < matches.length) {
        if (matches[i]) {
          return {
            number: numberWithoutExtension,
            ext: matches[i]
          };
        }

        i++;
      }
    }

    // These mappings map a character (key) to a specific digit that should
    // replace it for normalization purposes. Non-European digits that
    // may be used in phone numbers are mapped to a European equivalent.
    //
    // E.g. in Iraq they don't write `+442323234` but rather `+٤٤٢٣٢٣٢٣٤`.
    //
    var DIGITS = {
      '0': '0',
      '1': '1',
      '2': '2',
      '3': '3',
      '4': '4',
      '5': '5',
      '6': '6',
      '7': '7',
      '8': '8',
      '9': '9',
      "\uFF10": '0',
      // Fullwidth digit 0
      "\uFF11": '1',
      // Fullwidth digit 1
      "\uFF12": '2',
      // Fullwidth digit 2
      "\uFF13": '3',
      // Fullwidth digit 3
      "\uFF14": '4',
      // Fullwidth digit 4
      "\uFF15": '5',
      // Fullwidth digit 5
      "\uFF16": '6',
      // Fullwidth digit 6
      "\uFF17": '7',
      // Fullwidth digit 7
      "\uFF18": '8',
      // Fullwidth digit 8
      "\uFF19": '9',
      // Fullwidth digit 9
      "\u0660": '0',
      // Arabic-indic digit 0
      "\u0661": '1',
      // Arabic-indic digit 1
      "\u0662": '2',
      // Arabic-indic digit 2
      "\u0663": '3',
      // Arabic-indic digit 3
      "\u0664": '4',
      // Arabic-indic digit 4
      "\u0665": '5',
      // Arabic-indic digit 5
      "\u0666": '6',
      // Arabic-indic digit 6
      "\u0667": '7',
      // Arabic-indic digit 7
      "\u0668": '8',
      // Arabic-indic digit 8
      "\u0669": '9',
      // Arabic-indic digit 9
      "\u06F0": '0',
      // Eastern-Arabic digit 0
      "\u06F1": '1',
      // Eastern-Arabic digit 1
      "\u06F2": '2',
      // Eastern-Arabic digit 2
      "\u06F3": '3',
      // Eastern-Arabic digit 3
      "\u06F4": '4',
      // Eastern-Arabic digit 4
      "\u06F5": '5',
      // Eastern-Arabic digit 5
      "\u06F6": '6',
      // Eastern-Arabic digit 6
      "\u06F7": '7',
      // Eastern-Arabic digit 7
      "\u06F8": '8',
      // Eastern-Arabic digit 8
      "\u06F9": '9' // Eastern-Arabic digit 9

    };
    function parseDigit(character) {
      return DIGITS[character];
    }

    function _createForOfIteratorHelperLoose$5(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$6(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$6(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$6(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$6(o, minLen); }

    function _arrayLikeToArray$6(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
    /**
     * Parses phone number characters from a string.
     * Drops all punctuation leaving only digits and the leading `+` sign (if any).
     * Also converts wide-ascii and arabic-indic numerals to conventional numerals.
     * E.g. in Iraq they don't write `+442323234` but rather `+٤٤٢٣٢٣٢٣٤`.
     * @param  {string} string
     * @return {string}
     * @example
     * ```js
     * // Outputs '8800555'.
     * parseIncompletePhoneNumber('8 (800) 555')
     * // Outputs '+7800555'.
     * parseIncompletePhoneNumber('+7 800 555')
     * ```
     */

    function parseIncompletePhoneNumber(string) {
      var result = ''; // Using `.split('')` here instead of normal `for ... of`
      // because the importing application doesn't neccessarily include an ES6 polyfill.
      // The `.split('')` approach discards "exotic" UTF-8 characters
      // (the ones consisting of four bytes) but digits
      // (including non-European ones) don't fall into that range
      // so such "exotic" characters would be discarded anyway.

      for (var _iterator = _createForOfIteratorHelperLoose$5(string.split('')), _step; !(_step = _iterator()).done;) {
        var character = _step.value;
        result += parsePhoneNumberCharacter(character, result) || '';
      }

      return result;
    }
    /**
     * Parses next character while parsing phone number digits (including a `+`)
     * from text: discards everything except `+` and digits, and `+` is only allowed
     * at the start of a phone number.
     * For example, is used in `react-phone-number-input` where it uses
     * [`input-format`](https://gitlab.com/catamphetamine/input-format).
     * @param  {string} character - Yet another character from raw input string.
     * @param  {string?} prevParsedCharacters - Previous parsed characters.
     * @param  {object} meta - Optional custom use-case-specific metadata.
     * @return {string?} The parsed character.
     */

    function parsePhoneNumberCharacter(character, prevParsedCharacters) {
      // Only allow a leading `+`.
      if (character === '+') {
        // If this `+` is not the first parsed character
        // then discard it.
        if (prevParsedCharacters) {
          return;
        }

        return '+';
      } // Allow digits.


      return parseDigit(character);
    }

    function _createForOfIteratorHelperLoose$4(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$5(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$5(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$5(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$5(o, minLen); }

    function _arrayLikeToArray$5(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    /**
     * Merges two arrays.
     * @param  {*} a
     * @param  {*} b
     * @return {*}
     */
    function mergeArrays(a, b) {
      var merged = a.slice();

      for (var _iterator = _createForOfIteratorHelperLoose$4(b), _step; !(_step = _iterator()).done;) {
        var element = _step.value;

        if (a.indexOf(element) < 0) {
          merged.push(element);
        }
      }

      return merged.sort(function (a, b) {
        return a - b;
      }); // ES6 version, requires Set polyfill.
      // let merged = new Set(a)
      // for (const element of b) {
      // 	merged.add(i)
      // }
      // return Array.from(merged).sort((a, b) => a - b)
    }

    function checkNumberLength(nationalNumber, metadata) {
      return checkNumberLengthForType(nationalNumber, undefined, metadata);
    } // Checks whether a number is possible for the country based on its length.
    // Should only be called for the "new" metadata which has "possible lengths".

    function checkNumberLengthForType(nationalNumber, type, metadata) {
      var type_info = metadata.type(type); // There should always be "<possiblePengths/>" set for every type element.
      // This is declared in the XML schema.
      // For size efficiency, where a sub-description (e.g. fixed-line)
      // has the same "<possiblePengths/>" as the "general description", this is missing,
      // so we fall back to the "general description". Where no numbers of the type
      // exist at all, there is one possible length (-1) which is guaranteed
      // not to match the length of any real phone number.

      var possible_lengths = type_info && type_info.possibleLengths() || metadata.possibleLengths(); // let local_lengths    = type_info && type.possibleLengthsLocal() || metadata.possibleLengthsLocal()
      // Metadata before version `1.0.18` didn't contain `possible_lengths`.

      if (!possible_lengths) {
        return 'IS_POSSIBLE';
      }

      if (type === 'FIXED_LINE_OR_MOBILE') {
        // No such country in metadata.

        /* istanbul ignore next */
        if (!metadata.type('FIXED_LINE')) {
          // The rare case has been encountered where no fixedLine data is available
          // (true for some non-geographic entities), so we just check mobile.
          return checkNumberLengthForType(nationalNumber, 'MOBILE', metadata);
        }

        var mobile_type = metadata.type('MOBILE');

        if (mobile_type) {
          // Merge the mobile data in if there was any. "Concat" creates a new
          // array, it doesn't edit possible_lengths in place, so we don't need a copy.
          // Note that when adding the possible lengths from mobile, we have
          // to again check they aren't empty since if they are this indicates
          // they are the same as the general desc and should be obtained from there.
          possible_lengths = mergeArrays(possible_lengths, mobile_type.possibleLengths()); // The current list is sorted; we need to merge in the new list and
          // re-sort (duplicates are okay). Sorting isn't so expensive because
          // the lists are very small.
          // if (local_lengths) {
          // 	local_lengths = mergeArrays(local_lengths, mobile_type.possibleLengthsLocal())
          // } else {
          // 	local_lengths = mobile_type.possibleLengthsLocal()
          // }
        }
      } // If the type doesn't exist then return 'INVALID_LENGTH'.
      else if (type && !type_info) {
        return 'INVALID_LENGTH';
      }

      var actual_length = nationalNumber.length; // In `libphonenumber-js` all "local-only" formats are dropped for simplicity.
      // // This is safe because there is never an overlap beween the possible lengths
      // // and the local-only lengths; this is checked at build time.
      // if (local_lengths && local_lengths.indexOf(nationalNumber.length) >= 0)
      // {
      // 	return 'IS_POSSIBLE_LOCAL_ONLY'
      // }

      var minimum_length = possible_lengths[0];

      if (minimum_length === actual_length) {
        return 'IS_POSSIBLE';
      }

      if (minimum_length > actual_length) {
        return 'TOO_SHORT';
      }

      if (possible_lengths[possible_lengths.length - 1] < actual_length) {
        return 'TOO_LONG';
      } // We skip the first element since we've already checked it.


      return possible_lengths.indexOf(actual_length, 1) >= 0 ? 'IS_POSSIBLE' : 'INVALID_LENGTH';
    }

    function isPossiblePhoneNumber(input, options, metadata) {
      /* istanbul ignore if */
      if (options === undefined) {
        options = {};
      }

      metadata = new Metadata(metadata);

      if (options.v2) {
        if (!input.countryCallingCode) {
          throw new Error('Invalid phone number object passed');
        }

        metadata.selectNumberingPlan(input.countryCallingCode);
      } else {
        if (!input.phone) {
          return false;
        }

        if (input.country) {
          if (!metadata.hasCountry(input.country)) {
            throw new Error("Unknown country: ".concat(input.country));
          }

          metadata.country(input.country);
        } else {
          if (!input.countryCallingCode) {
            throw new Error('Invalid phone number object passed');
          }

          metadata.selectNumberingPlan(input.countryCallingCode);
        }
      } // Old metadata (< 1.0.18) had no "possible length" data.


      if (metadata.possibleLengths()) {
        return isPossibleNumber(input.phone || input.nationalNumber, metadata);
      } else {
        // There was a bug between `1.7.35` and `1.7.37` where "possible_lengths"
        // were missing for "non-geographical" numbering plans.
        // Just assume the number is possible in such cases:
        // it's unlikely that anyone generated their custom metadata
        // in that short period of time (one day).
        // This code can be removed in some future major version update.
        if (input.countryCallingCode && metadata.isNonGeographicCallingCode(input.countryCallingCode)) {
          // "Non-geographic entities" did't have `possibleLengths`
          // due to a bug in metadata generation process.
          return true;
        } else {
          throw new Error('Missing "possibleLengths" in metadata. Perhaps the metadata has been generated before v1.0.18.');
        }
      }
    }
    function isPossibleNumber(nationalNumber, metadata) {
      //, isInternational) {
      switch (checkNumberLength(nationalNumber, metadata)) {
        case 'IS_POSSIBLE':
          return true;
        // This library ignores "local-only" phone numbers (for simplicity).
        // See the readme for more info on what are "local-only" phone numbers.
        // case 'IS_POSSIBLE_LOCAL_ONLY':
        // 	return !isInternational

        default:
          return false;
      }
    }

    function _slicedToArray$1(arr, i) { return _arrayWithHoles$1(arr) || _iterableToArrayLimit$1(arr, i) || _unsupportedIterableToArray$4(arr, i) || _nonIterableRest$1(); }

    function _nonIterableRest$1() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _iterableToArrayLimit$1(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

    function _arrayWithHoles$1(arr) { if (Array.isArray(arr)) return arr; }

    function _createForOfIteratorHelperLoose$3(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$4(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$4(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$4(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$4(o, minLen); }

    function _arrayLikeToArray$4(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    /**
     * @param  {string} text - Phone URI (RFC 3966).
     * @return {object} `{ ?number, ?ext }`.
     */

    function parseRFC3966(text) {
      var number;
      var ext; // Replace "tel:" with "tel=" for parsing convenience.

      text = text.replace(/^tel:/, 'tel=');

      for (var _iterator = _createForOfIteratorHelperLoose$3(text.split(';')), _step; !(_step = _iterator()).done;) {
        var part = _step.value;

        var _part$split = part.split('='),
            _part$split2 = _slicedToArray$1(_part$split, 2),
            name = _part$split2[0],
            value = _part$split2[1];

        switch (name) {
          case 'tel':
            number = value;
            break;

          case 'ext':
            ext = value;
            break;

          case 'phone-context':
            // Only "country contexts" are supported.
            // "Domain contexts" are ignored.
            if (value[0] === '+') {
              number = value + number;
            }

            break;
        }
      } // If the phone number is not viable, then abort.


      if (!isViablePhoneNumber(number)) {
        return {};
      }

      var result = {
        number: number
      };

      if (ext) {
        result.ext = ext;
      }

      return result;
    }
    /**
     * @param  {object} - `{ ?number, ?extension }`.
     * @return {string} Phone URI (RFC 3966).
     */

    function formatRFC3966(_ref) {
      var number = _ref.number,
          ext = _ref.ext;

      if (!number) {
        return '';
      }

      if (number[0] !== '+') {
        throw new Error("\"formatRFC3966()\" expects \"number\" to be in E.164 format.");
      }

      return "tel:".concat(number).concat(ext ? ';ext=' + ext : '');
    }

    /**
     * Checks whether the entire input sequence can be matched
     * against the regular expression.
     * @return {boolean}
     */
    function matchesEntirely(text, regular_expression) {
      // If assigning the `''` default value is moved to the arguments above,
      // code coverage would decrease for some weird reason.
      text = text || '';
      return new RegExp('^(?:' + regular_expression + ')$').test(text);
    }

    function _createForOfIteratorHelperLoose$2(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$3(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$3(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$3(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$3(o, minLen); }

    function _arrayLikeToArray$3(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
    var NON_FIXED_LINE_PHONE_TYPES = ['MOBILE', 'PREMIUM_RATE', 'TOLL_FREE', 'SHARED_COST', 'VOIP', 'PERSONAL_NUMBER', 'PAGER', 'UAN', 'VOICEMAIL']; // Finds out national phone number type (fixed line, mobile, etc)

    function getNumberType(input, options, metadata) {
      // If assigning the `{}` default value is moved to the arguments above,
      // code coverage would decrease for some weird reason.
      options = options || {}; // When `parse()` returned `{}`
      // meaning that the phone number is not a valid one.

      if (!input.country) {
        return;
      }

      metadata = new Metadata(metadata);
      metadata.selectNumberingPlan(input.country, input.countryCallingCode);
      var nationalNumber = options.v2 ? input.nationalNumber : input.phone; // The following is copy-pasted from the original function:
      // https://github.com/googlei18n/libphonenumber/blob/3ea547d4fbaa2d0b67588904dfa5d3f2557c27ff/javascript/i18n/phonenumbers/phonenumberutil.js#L2835
      // Is this national number even valid for this country

      if (!matchesEntirely(nationalNumber, metadata.nationalNumberPattern())) {
        return;
      } // Is it fixed line number


      if (isNumberTypeEqualTo(nationalNumber, 'FIXED_LINE', metadata)) {
        // Because duplicate regular expressions are removed
        // to reduce metadata size, if "mobile" pattern is ""
        // then it means it was removed due to being a duplicate of the fixed-line pattern.
        //
        if (metadata.type('MOBILE') && metadata.type('MOBILE').pattern() === '') {
          return 'FIXED_LINE_OR_MOBILE';
        } // `MOBILE` type pattern isn't included if it matched `FIXED_LINE` one.
        // For example, for "US" country.
        // Old metadata (< `1.0.18`) had a specific "types" data structure
        // that happened to be `undefined` for `MOBILE` in that case.
        // Newer metadata (>= `1.0.18`) has another data structure that is
        // not `undefined` for `MOBILE` in that case (it's just an empty array).
        // So this `if` is just for backwards compatibility with old metadata.


        if (!metadata.type('MOBILE')) {
          return 'FIXED_LINE_OR_MOBILE';
        } // Check if the number happens to qualify as both fixed line and mobile.
        // (no such country in the minimal metadata set)

        /* istanbul ignore if */


        if (isNumberTypeEqualTo(nationalNumber, 'MOBILE', metadata)) {
          return 'FIXED_LINE_OR_MOBILE';
        }

        return 'FIXED_LINE';
      }

      for (var _iterator = _createForOfIteratorHelperLoose$2(NON_FIXED_LINE_PHONE_TYPES), _step; !(_step = _iterator()).done;) {
        var type = _step.value;

        if (isNumberTypeEqualTo(nationalNumber, type, metadata)) {
          return type;
        }
      }
    }
    function isNumberTypeEqualTo(nationalNumber, type, metadata) {
      type = metadata.type(type);

      if (!type || !type.pattern()) {
        return false;
      } // Check if any possible number lengths are present;
      // if so, we use them to avoid checking
      // the validation pattern if they don't match.
      // If they are absent, this means they match
      // the general description, which we have
      // already checked before a specific number type.


      if (type.possibleLengths() && type.possibleLengths().indexOf(nationalNumber.length) < 0) {
        return false;
      }

      return matchesEntirely(nationalNumber, type.pattern());
    }

    /**
     * Checks if a given phone number is valid.
     *
     * If the `number` is a string, it will be parsed to an object,
     * but only if it contains only valid phone number characters (including punctuation).
     * If the `number` is an object, it is used as is.
     *
     * The optional `defaultCountry` argument is the default country.
     * I.e. it does not restrict to just that country,
     * e.g. in those cases where several countries share
     * the same phone numbering rules (NANPA, Britain, etc).
     * For example, even though the number `07624 369230`
     * belongs to the Isle of Man ("IM" country code)
     * calling `isValidNumber('07624369230', 'GB', metadata)`
     * still returns `true` because the country is not restricted to `GB`,
     * it's just that `GB` is the default one for the phone numbering rules.
     * For restricting the country see `isValidNumberForRegion()`
     * though restricting a country might not be a good idea.
     * https://github.com/googlei18n/libphonenumber/blob/master/FAQ.md#when-should-i-use-isvalidnumberforregion
     *
     * Examples:
     *
     * ```js
     * isValidNumber('+78005553535', metadata)
     * isValidNumber('8005553535', 'RU', metadata)
     * isValidNumber('88005553535', 'RU', metadata)
     * isValidNumber({ phone: '8005553535', country: 'RU' }, metadata)
     * ```
     */

    function isValidNumber(input, options, metadata) {
      // If assigning the `{}` default value is moved to the arguments above,
      // code coverage would decrease for some weird reason.
      options = options || {};
      metadata = new Metadata(metadata); // This is just to support `isValidNumber({})`
      // for cases when `parseNumber()` returns `{}`.

      if (!input.country) {
        return false;
      }

      metadata.selectNumberingPlan(input.country, input.countryCallingCode); // By default, countries only have type regexps when it's required for
      // distinguishing different countries having the same `countryCallingCode`.

      if (metadata.hasTypes()) {
        return getNumberType(input, options, metadata.metadata) !== undefined;
      } // If there are no type regexps for this country in metadata then use
      // `nationalNumberPattern` as a "better than nothing" replacement.


      var national_number = options.v2 ? input.nationalNumber : input.phone;
      return matchesEntirely(national_number, metadata.nationalNumberPattern());
    }

    //
    // E.g. "(999) 111-22-33" -> "999 111 22 33"
    //
    // For some reason Google's metadata contains `<intlFormat/>`s with brackets and dashes.
    // Meanwhile, there's no single opinion about using punctuation in international phone numbers.
    //
    // For example, Google's `<intlFormat/>` for USA is `+1 213-373-4253`.
    // And here's a quote from WikiPedia's "North American Numbering Plan" page:
    // https://en.wikipedia.org/wiki/North_American_Numbering_Plan
    //
    // "The country calling code for all countries participating in the NANP is 1.
    // In international format, an NANP number should be listed as +1 301 555 01 00,
    // where 301 is an area code (Maryland)."
    //
    // I personally prefer the international format without any punctuation.
    // For example, brackets are remnants of the old age, meaning that the
    // phone number part in brackets (so called "area code") can be omitted
    // if dialing within the same "area".
    // And hyphens were clearly introduced for splitting local numbers into memorizable groups.
    // For example, remembering "5553535" is difficult but "555-35-35" is much simpler.
    // Imagine a man taking a bus from home to work and seeing an ad with a phone number.
    // He has a couple of seconds to memorize that number until it passes by.
    // If it were spaces instead of hyphens the man wouldn't necessarily get it,
    // but with hyphens instead of spaces the grouping is more explicit.
    // I personally think that hyphens introduce visual clutter,
    // so I prefer replacing them with spaces in international numbers.
    // In the modern age all output is done on displays where spaces are clearly distinguishable
    // so hyphens can be safely replaced with spaces without losing any legibility.
    //

    function applyInternationalSeparatorStyle(formattedNumber) {
      return formattedNumber.replace(new RegExp("[".concat(VALID_PUNCTUATION, "]+"), 'g'), ' ').trim();
    }

    // first group is not used in the national pattern (e.g. Argentina) so the $1
    // group does not match correctly. Therefore, we use `\d`, so that the first
    // group actually used in the pattern will be matched.

    var FIRST_GROUP_PATTERN = /(\$\d)/;
    function formatNationalNumberUsingFormat(number, format, _ref) {
      var useInternationalFormat = _ref.useInternationalFormat,
          withNationalPrefix = _ref.withNationalPrefix;
          _ref.carrierCode;
          _ref.metadata;
      var formattedNumber = number.replace(new RegExp(format.pattern()), useInternationalFormat ? format.internationalFormat() : // This library doesn't use `domestic_carrier_code_formatting_rule`,
      // because that one is only used when formatting phone numbers
      // for dialing from a mobile phone, and this is not a dialing library.
      // carrierCode && format.domesticCarrierCodeFormattingRule()
      // 	// First, replace the $CC in the formatting rule with the desired carrier code.
      // 	// Then, replace the $FG in the formatting rule with the first group
      // 	// and the carrier code combined in the appropriate way.
      // 	? format.format().replace(FIRST_GROUP_PATTERN, format.domesticCarrierCodeFormattingRule().replace('$CC', carrierCode))
      // 	: (
      // 		withNationalPrefix && format.nationalPrefixFormattingRule()
      // 			? format.format().replace(FIRST_GROUP_PATTERN, format.nationalPrefixFormattingRule())
      // 			: format.format()
      // 	)
      withNationalPrefix && format.nationalPrefixFormattingRule() ? format.format().replace(FIRST_GROUP_PATTERN, format.nationalPrefixFormattingRule()) : format.format());

      if (useInternationalFormat) {
        return applyInternationalSeparatorStyle(formattedNumber);
      }

      return formattedNumber;
    }

    /**
     * Pattern that makes it easy to distinguish whether a region has a single
     * international dialing prefix or not. If a region has a single international
     * prefix (e.g. 011 in USA), it will be represented as a string that contains
     * a sequence of ASCII digits, and possibly a tilde, which signals waiting for
     * the tone. If there are multiple available international prefixes in a
     * region, they will be represented as a regex string that always contains one
     * or more characters that are not ASCII digits or a tilde.
     */

    var SINGLE_IDD_PREFIX_REG_EXP = /^[\d]+(?:[~\u2053\u223C\uFF5E][\d]+)?$/; // For regions that have multiple IDD prefixes
    // a preferred IDD prefix is returned.

    function getIddPrefix(country, callingCode, metadata) {
      var countryMetadata = new Metadata(metadata);
      countryMetadata.selectNumberingPlan(country, callingCode);

      if (countryMetadata.defaultIDDPrefix()) {
        return countryMetadata.defaultIDDPrefix();
      }

      if (SINGLE_IDD_PREFIX_REG_EXP.test(countryMetadata.IDDPrefix())) {
        return countryMetadata.IDDPrefix();
      }
    }

    function _createForOfIteratorHelperLoose$1(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$2(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$2(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$2(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$2(o, minLen); }

    function _arrayLikeToArray$2(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    function ownKeys$4(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread$4(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$4(Object(source), !0).forEach(function (key) { _defineProperty$4(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$4(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty$4(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
    var DEFAULT_OPTIONS = {
      formatExtension: function formatExtension(formattedNumber, extension, metadata) {
        return "".concat(formattedNumber).concat(metadata.ext()).concat(extension);
      }
    }; // Formats a phone number
    //
    // Example use cases:
    //
    // ```js
    // formatNumber('8005553535', 'RU', 'INTERNATIONAL')
    // formatNumber('8005553535', 'RU', 'INTERNATIONAL', metadata)
    // formatNumber({ phone: '8005553535', country: 'RU' }, 'INTERNATIONAL')
    // formatNumber({ phone: '8005553535', country: 'RU' }, 'INTERNATIONAL', metadata)
    // formatNumber('+78005553535', 'NATIONAL')
    // formatNumber('+78005553535', 'NATIONAL', metadata)
    // ```
    //

    function formatNumber(input, format, options, metadata) {
      // Apply default options.
      if (options) {
        options = _objectSpread$4(_objectSpread$4({}, DEFAULT_OPTIONS), options);
      } else {
        options = DEFAULT_OPTIONS;
      }

      metadata = new Metadata(metadata);

      if (input.country && input.country !== '001') {
        // Validate `input.country`.
        if (!metadata.hasCountry(input.country)) {
          throw new Error("Unknown country: ".concat(input.country));
        }

        metadata.country(input.country);
      } else if (input.countryCallingCode) {
        metadata.selectNumberingPlan(input.countryCallingCode);
      } else return input.phone || '';

      var countryCallingCode = metadata.countryCallingCode();
      var nationalNumber = options.v2 ? input.nationalNumber : input.phone; // This variable should have been declared inside `case`s
      // but Babel has a bug and it says "duplicate variable declaration".

      var number;

      switch (format) {
        case 'NATIONAL':
          // Legacy argument support.
          // (`{ country: ..., phone: '' }`)
          if (!nationalNumber) {
            return '';
          }

          number = formatNationalNumber(nationalNumber, input.carrierCode, 'NATIONAL', metadata, options);
          return addExtension(number, input.ext, metadata, options.formatExtension);

        case 'INTERNATIONAL':
          // Legacy argument support.
          // (`{ country: ..., phone: '' }`)
          if (!nationalNumber) {
            return "+".concat(countryCallingCode);
          }

          number = formatNationalNumber(nationalNumber, null, 'INTERNATIONAL', metadata, options);
          number = "+".concat(countryCallingCode, " ").concat(number);
          return addExtension(number, input.ext, metadata, options.formatExtension);

        case 'E.164':
          // `E.164` doesn't define "phone number extensions".
          return "+".concat(countryCallingCode).concat(nationalNumber);

        case 'RFC3966':
          return formatRFC3966({
            number: "+".concat(countryCallingCode).concat(nationalNumber),
            ext: input.ext
          });
        // For reference, here's Google's IDD formatter:
        // https://github.com/google/libphonenumber/blob/32719cf74e68796788d1ca45abc85dcdc63ba5b9/java/libphonenumber/src/com/google/i18n/phonenumbers/PhoneNumberUtil.java#L1546
        // Not saying that this IDD formatter replicates it 1:1, but it seems to work.
        // Who would even need to format phone numbers in IDD format anyway?

        case 'IDD':
          if (!options.fromCountry) {
            return; // throw new Error('`fromCountry` option not passed for IDD-prefixed formatting.')
          }

          var formattedNumber = formatIDD(nationalNumber, input.carrierCode, countryCallingCode, options.fromCountry, metadata);
          return addExtension(formattedNumber, input.ext, metadata, options.formatExtension);

        default:
          throw new Error("Unknown \"format\" argument passed to \"formatNumber()\": \"".concat(format, "\""));
      }
    }

    function formatNationalNumber(number, carrierCode, formatAs, metadata, options) {
      var format = chooseFormatForNumber(metadata.formats(), number);

      if (!format) {
        return number;
      }

      return formatNationalNumberUsingFormat(number, format, {
        useInternationalFormat: formatAs === 'INTERNATIONAL',
        withNationalPrefix: format.nationalPrefixIsOptionalWhenFormattingInNationalFormat() && options && options.nationalPrefix === false ? false : true,
        carrierCode: carrierCode,
        metadata: metadata
      });
    }

    function chooseFormatForNumber(availableFormats, nationalNnumber) {
      for (var _iterator = _createForOfIteratorHelperLoose$1(availableFormats), _step; !(_step = _iterator()).done;) {
        var format = _step.value;

        // Validate leading digits.
        // The test case for "else path" could be found by searching for
        // "format.leadingDigitsPatterns().length === 0".
        if (format.leadingDigitsPatterns().length > 0) {
          // The last leading_digits_pattern is used here, as it is the most detailed
          var lastLeadingDigitsPattern = format.leadingDigitsPatterns()[format.leadingDigitsPatterns().length - 1]; // If leading digits don't match then move on to the next phone number format

          if (nationalNnumber.search(lastLeadingDigitsPattern) !== 0) {
            continue;
          }
        } // Check that the national number matches the phone number format regular expression


        if (matchesEntirely(nationalNnumber, format.pattern())) {
          return format;
        }
      }
    }

    function addExtension(formattedNumber, ext, metadata, formatExtension) {
      return ext ? formatExtension(formattedNumber, ext, metadata) : formattedNumber;
    }

    function formatIDD(nationalNumber, carrierCode, countryCallingCode, fromCountry, metadata) {
      var fromCountryCallingCode = getCountryCallingCode(fromCountry, metadata.metadata); // When calling within the same country calling code.

      if (fromCountryCallingCode === countryCallingCode) {
        var formattedNumber = formatNationalNumber(nationalNumber, carrierCode, 'NATIONAL', metadata); // For NANPA regions, return the national format for these regions
        // but prefix it with the country calling code.

        if (countryCallingCode === '1') {
          return countryCallingCode + ' ' + formattedNumber;
        } // If regions share a country calling code, the country calling code need
        // not be dialled. This also applies when dialling within a region, so this
        // if clause covers both these cases. Technically this is the case for
        // dialling from La Reunion to other overseas departments of France (French
        // Guiana, Martinique, Guadeloupe), but not vice versa - so we don't cover
        // this edge case for now and for those cases return the version including
        // country calling code. Details here:
        // http://www.petitfute.com/voyage/225-info-pratiques-reunion
        //


        return formattedNumber;
      }

      var iddPrefix = getIddPrefix(fromCountry, undefined, metadata.metadata);

      if (iddPrefix) {
        return "".concat(iddPrefix, " ").concat(countryCallingCode, " ").concat(formatNationalNumber(nationalNumber, null, 'INTERNATIONAL', metadata));
      }
    }

    function ownKeys$3(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread$3(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$3(Object(source), !0).forEach(function (key) { _defineProperty$3(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$3(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty$3(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

    var PhoneNumber = /*#__PURE__*/function () {
      function PhoneNumber(countryCallingCode, nationalNumber, metadata) {
        _classCallCheck(this, PhoneNumber);

        if (!countryCallingCode) {
          throw new TypeError('`country` or `countryCallingCode` not passed');
        }

        if (!nationalNumber) {
          throw new TypeError('`nationalNumber` not passed');
        }

        if (!metadata) {
          throw new TypeError('`metadata` not passed');
        }

        var _metadata = new Metadata(metadata); // If country code is passed then derive `countryCallingCode` from it.
        // Also store the country code as `.country`.


        if (isCountryCode(countryCallingCode)) {
          this.country = countryCallingCode;

          _metadata.country(countryCallingCode);

          countryCallingCode = _metadata.countryCallingCode();
        }

        this.countryCallingCode = countryCallingCode;
        this.nationalNumber = nationalNumber;
        this.number = '+' + this.countryCallingCode + this.nationalNumber;
        this.metadata = metadata;
      }

      _createClass(PhoneNumber, [{
        key: "setExt",
        value: function setExt(ext) {
          this.ext = ext;
        }
      }, {
        key: "isPossible",
        value: function isPossible() {
          return isPossiblePhoneNumber(this, {
            v2: true
          }, this.metadata);
        }
      }, {
        key: "isValid",
        value: function isValid() {
          return isValidNumber(this, {
            v2: true
          }, this.metadata);
        }
      }, {
        key: "isNonGeographic",
        value: function isNonGeographic() {
          var metadata = new Metadata(this.metadata);
          return metadata.isNonGeographicCallingCode(this.countryCallingCode);
        }
      }, {
        key: "isEqual",
        value: function isEqual(phoneNumber) {
          return this.number === phoneNumber.number && this.ext === phoneNumber.ext;
        } // // Is just an alias for `this.isValid() && this.country === country`.
        // // https://github.com/googlei18n/libphonenumber/blob/master/FAQ.md#when-should-i-use-isvalidnumberforregion
        // isValidForRegion(country) {
        // 	return isValidNumberForRegion(this, country, { v2: true }, this.metadata)
        // }

      }, {
        key: "getType",
        value: function getType() {
          return getNumberType(this, {
            v2: true
          }, this.metadata);
        }
      }, {
        key: "format",
        value: function format(_format, options) {
          return formatNumber(this, _format, options ? _objectSpread$3(_objectSpread$3({}, options), {}, {
            v2: true
          }) : {
            v2: true
          }, this.metadata);
        }
      }, {
        key: "formatNational",
        value: function formatNational(options) {
          return this.format('NATIONAL', options);
        }
      }, {
        key: "formatInternational",
        value: function formatInternational(options) {
          return this.format('INTERNATIONAL', options);
        }
      }, {
        key: "getURI",
        value: function getURI(options) {
          return this.format('RFC3966', options);
        }
      }]);

      return PhoneNumber;
    }();

    var isCountryCode = function isCountryCode(value) {
      return /^[A-Z]{2}$/.test(value);
    };

    var CAPTURING_DIGIT_PATTERN = new RegExp('([' + VALID_DIGITS + '])');
    function stripIddPrefix(number, country, callingCode, metadata) {
      if (!country) {
        return;
      } // Check if the number is IDD-prefixed.


      var countryMetadata = new Metadata(metadata);
      countryMetadata.selectNumberingPlan(country, callingCode);
      var IDDPrefixPattern = new RegExp(countryMetadata.IDDPrefix());

      if (number.search(IDDPrefixPattern) !== 0) {
        return;
      } // Strip IDD prefix.


      number = number.slice(number.match(IDDPrefixPattern)[0].length); // If there're any digits after an IDD prefix,
      // then those digits are a country calling code.
      // Since no country code starts with a `0`,
      // the code below validates that the next digit (if present) is not `0`.

      var matchedGroups = number.match(CAPTURING_DIGIT_PATTERN);

      if (matchedGroups && matchedGroups[1] != null && matchedGroups[1].length > 0) {
        if (matchedGroups[1] === '0') {
          return;
        }
      }

      return number;
    }

    /**
     * Strips any national prefix (such as 0, 1) present in a
     * (possibly incomplete) number provided.
     * "Carrier codes" are only used  in Colombia and Brazil,
     * and only when dialing within those countries from a mobile phone to a fixed line number.
     * Sometimes it won't actually strip national prefix
     * and will instead prepend some digits to the `number`:
     * for example, when number `2345678` is passed with `VI` country selected,
     * it will return `{ number: "3402345678" }`, because `340` area code is prepended.
     * @param {string} number — National number digits.
     * @param {object} metadata — Metadata with country selected.
     * @return {object} `{ nationalNumber: string, nationalPrefix: string? carrierCode: string? }`. Even if a national prefix was extracted, it's not necessarily present in the returned object, so don't rely on its presence in the returned object in order to find out whether a national prefix has been extracted or not.
     */
    function extractNationalNumberFromPossiblyIncompleteNumber(number, metadata) {
      if (number && metadata.numberingPlan.nationalPrefixForParsing()) {
        // See METADATA.md for the description of
        // `national_prefix_for_parsing` and `national_prefix_transform_rule`.
        // Attempt to parse the first digits as a national prefix.
        var prefixPattern = new RegExp('^(?:' + metadata.numberingPlan.nationalPrefixForParsing() + ')');
        var prefixMatch = prefixPattern.exec(number);

        if (prefixMatch) {
          var nationalNumber;
          var carrierCode; // https://gitlab.com/catamphetamine/libphonenumber-js/-/blob/master/METADATA.md#national_prefix_for_parsing--national_prefix_transform_rule
          // If a `national_prefix_for_parsing` has any "capturing groups"
          // then it means that the national (significant) number is equal to
          // those "capturing groups" transformed via `national_prefix_transform_rule`,
          // and nothing could be said about the actual national prefix:
          // what is it and was it even there.
          // If a `national_prefix_for_parsing` doesn't have any "capturing groups",
          // then everything it matches is a national prefix.
          // To determine whether `national_prefix_for_parsing` matched any
          // "capturing groups", the value of the result of calling `.exec()`
          // is looked at, and if it has non-undefined values where there're
          // "capturing groups" in the regular expression, then it means
          // that "capturing groups" have been matched.
          // It's not possible to tell whether there'll be any "capturing gropus"
          // before the matching process, because a `national_prefix_for_parsing`
          // could exhibit both behaviors.

          var capturedGroupsCount = prefixMatch.length - 1;
          var hasCapturedGroups = capturedGroupsCount > 0 && prefixMatch[capturedGroupsCount];

          if (metadata.nationalPrefixTransformRule() && hasCapturedGroups) {
            nationalNumber = number.replace(prefixPattern, metadata.nationalPrefixTransformRule()); // If there's more than one captured group,
            // then carrier code is the second one.

            if (capturedGroupsCount > 1) {
              carrierCode = prefixMatch[1];
            }
          } // If there're no "capturing groups",
          // or if there're "capturing groups" but no
          // `national_prefix_transform_rule`,
          // then just strip the national prefix from the number,
          // and possibly a carrier code.
          // Seems like there could be more.
          else {
            // `prefixBeforeNationalNumber` is the whole substring matched by
            // the `national_prefix_for_parsing` regular expression.
            // There seem to be no guarantees that it's just a national prefix.
            // For example, if there's a carrier code, it's gonna be a
            // part of `prefixBeforeNationalNumber` too.
            var prefixBeforeNationalNumber = prefixMatch[0];
            nationalNumber = number.slice(prefixBeforeNationalNumber.length); // If there's at least one captured group,
            // then carrier code is the first one.

            if (hasCapturedGroups) {
              carrierCode = prefixMatch[1];
            }
          } // Tries to guess whether a national prefix was present in the input.
          // This is not something copy-pasted from Google's library:
          // they don't seem to have an equivalent for that.
          // So this isn't an "officially approved" way of doing something like that.
          // But since there seems no other existing method, this library uses it.


          var nationalPrefix;

          if (hasCapturedGroups) {
            var possiblePositionOfTheFirstCapturedGroup = number.indexOf(prefixMatch[1]);
            var possibleNationalPrefix = number.slice(0, possiblePositionOfTheFirstCapturedGroup); // Example: an Argentinian (AR) phone number `0111523456789`.
            // `prefixMatch[0]` is `01115`, and `$1` is `11`,
            // and the rest of the phone number is `23456789`.
            // The national number is transformed via `9$1` to `91123456789`.
            // National prefix `0` is detected being present at the start.
            // if (possibleNationalPrefix.indexOf(metadata.numberingPlan.nationalPrefix()) === 0) {

            if (possibleNationalPrefix === metadata.numberingPlan.nationalPrefix()) {
              nationalPrefix = metadata.numberingPlan.nationalPrefix();
            }
          } else {
            nationalPrefix = prefixMatch[0];
          }

          return {
            nationalNumber: nationalNumber,
            nationalPrefix: nationalPrefix,
            carrierCode: carrierCode
          };
        }
      }

      return {
        nationalNumber: number
      };
    }

    /**
     * Strips national prefix and carrier code from a complete phone number.
     * The difference from the non-"FromCompleteNumber" function is that
     * it won't extract national prefix if the resultant number is too short
     * to be a complete number for the selected phone numbering plan.
     * @param  {string} number — Complete phone number digits.
     * @param  {Metadata} metadata — Metadata with a phone numbering plan selected.
     * @return {object} `{ nationalNumber: string, carrierCode: string? }`.
     */

    function extractNationalNumber(number, metadata) {
      // Parsing national prefixes and carrier codes
      // is only required for local phone numbers
      // but some people don't understand that
      // and sometimes write international phone numbers
      // with national prefixes (or maybe even carrier codes).
      // http://ucken.blogspot.ru/2016/03/trunk-prefixes-in-skype4b.html
      // Google's original library forgives such mistakes
      // and so does this library, because it has been requested:
      // https://github.com/catamphetamine/libphonenumber-js/issues/127
      var _extractNationalNumbe = extractNationalNumberFromPossiblyIncompleteNumber(number, metadata),
          carrierCode = _extractNationalNumbe.carrierCode,
          nationalNumber = _extractNationalNumbe.nationalNumber;

      if (nationalNumber !== number) {
        if (!shouldHaveExtractedNationalPrefix(number, nationalNumber, metadata)) {
          // Don't strip the national prefix.
          return {
            nationalNumber: number
          };
        } // Check the national (significant) number length after extracting national prefix and carrier code.
        // Legacy generated metadata (before `1.0.18`) didn't support the "possible lengths" feature.


        if (metadata.possibleLengths()) {
          // The number remaining after stripping the national prefix and carrier code
          // should be long enough to have a possible length for the country.
          // Otherwise, don't strip the national prefix and carrier code,
          // since the original number could be a valid number.
          // This check has been copy-pasted "as is" from Google's original library:
          // https://github.com/google/libphonenumber/blob/876268eb1ad6cdc1b7b5bef17fc5e43052702d57/java/libphonenumber/src/com/google/i18n/phonenumbers/PhoneNumberUtil.java#L3236-L3250
          // It doesn't check for the "possibility" of the original `number`.
          // I guess it's fine not checking that one. It works as is anyway.
          if (!isPossibleIncompleteNationalNumber(nationalNumber, metadata)) {
            // Don't strip the national prefix.
            return {
              nationalNumber: number
            };
          }
        }
      }

      return {
        nationalNumber: nationalNumber,
        carrierCode: carrierCode
      };
    } // In some countries, the same digit could be a national prefix
    // or a leading digit of a valid phone number.
    // For example, in Russia, national prefix is `8`,
    // and also `800 555 35 35` is a valid number
    // in which `8` is not a national prefix, but the first digit
    // of a national (significant) number.
    // Same's with Belarus:
    // `82004910060` is a valid national (significant) number,
    // but `2004910060` is not.
    // To support such cases (to prevent the code from always stripping
    // national prefix), a condition is imposed: a national prefix
    // is not extracted when the original number is "viable" and the
    // resultant number is not, a "viable" national number being the one
    // that matches `national_number_pattern`.

    function shouldHaveExtractedNationalPrefix(nationalNumberBefore, nationalNumberAfter, metadata) {
      // The equivalent in Google's code is:
      // https://github.com/google/libphonenumber/blob/e326fa1fc4283bb05eb35cb3c15c18f98a31af33/java/libphonenumber/src/com/google/i18n/phonenumbers/PhoneNumberUtil.java#L2969-L3004
      if (matchesEntirely(nationalNumberBefore, metadata.nationalNumberPattern()) && !matchesEntirely(nationalNumberAfter, metadata.nationalNumberPattern())) {
        return false;
      } // This "is possible" national number (length) check has been commented out
      // because it's superceded by the (effectively) same check done in the
      // `extractNationalNumber()` function after it calls `shouldHaveExtractedNationalPrefix()`.
      // In other words, why run the same check twice if it could only be run once.
      // // Check the national (significant) number length after extracting national prefix and carrier code.
      // // Fixes a minor "weird behavior" bug: https://gitlab.com/catamphetamine/libphonenumber-js/-/issues/57
      // // (Legacy generated metadata (before `1.0.18`) didn't support the "possible lengths" feature).
      // if (metadata.possibleLengths()) {
      // 	if (isPossibleIncompleteNationalNumber(nationalNumberBefore, metadata) &&
      // 		!isPossibleIncompleteNationalNumber(nationalNumberAfter, metadata)) {
      // 		return false
      // 	}
      // }


      return true;
    }

    function isPossibleIncompleteNationalNumber(nationalNumber, metadata) {
      switch (checkNumberLength(nationalNumber, metadata)) {
        case 'TOO_SHORT':
        case 'INVALID_LENGTH':
          // This library ignores "local-only" phone numbers (for simplicity).
          // See the readme for more info on what are "local-only" phone numbers.
          // case 'IS_POSSIBLE_LOCAL_ONLY':
          return false;

        default:
          return true;
      }
    }

    /**
     * Sometimes some people incorrectly input international phone numbers
     * without the leading `+`. This function corrects such input.
     * @param  {string} number — Phone number digits.
     * @param  {string?} country
     * @param  {string?} callingCode
     * @param  {object} metadata
     * @return {object} `{ countryCallingCode: string?, number: string }`.
     */

    function extractCountryCallingCodeFromInternationalNumberWithoutPlusSign(number, country, callingCode, metadata) {
      var countryCallingCode = country ? getCountryCallingCode(country, metadata) : callingCode;

      if (number.indexOf(countryCallingCode) === 0) {
        metadata = new Metadata(metadata);
        metadata.selectNumberingPlan(country, callingCode);
        var possibleShorterNumber = number.slice(countryCallingCode.length);

        var _extractNationalNumbe = extractNationalNumber(possibleShorterNumber, metadata),
            possibleShorterNationalNumber = _extractNationalNumbe.nationalNumber;

        var _extractNationalNumbe2 = extractNationalNumber(number, metadata),
            nationalNumber = _extractNationalNumbe2.nationalNumber; // If the number was not valid before but is valid now,
        // or if it was too long before, we consider the number
        // with the country calling code stripped to be a better result
        // and keep that instead.
        // For example, in Germany (+49), `49` is a valid area code,
        // so if a number starts with `49`, it could be both a valid
        // national German number or an international number without
        // a leading `+`.


        if (!matchesEntirely(nationalNumber, metadata.nationalNumberPattern()) && matchesEntirely(possibleShorterNationalNumber, metadata.nationalNumberPattern()) || checkNumberLength(nationalNumber, metadata) === 'TOO_LONG') {
          return {
            countryCallingCode: countryCallingCode,
            number: possibleShorterNumber
          };
        }
      }

      return {
        number: number
      };
    }

    /**
     * Converts a phone number digits (possibly with a `+`)
     * into a calling code and the rest phone number digits.
     * The "rest phone number digits" could include
     * a national prefix, carrier code, and national
     * (significant) number.
     * @param  {string} number — Phone number digits (possibly with a `+`).
     * @param  {string} [country] — Default country.
     * @param  {string} [callingCode] — Default calling code (some phone numbering plans are non-geographic).
     * @param  {object} metadata
     * @return {object} `{ countryCallingCode: string?, number: string }`
     * @example
     * // Returns `{ countryCallingCode: "1", number: "2133734253" }`.
     * extractCountryCallingCode('2133734253', 'US', null, metadata)
     * extractCountryCallingCode('2133734253', null, '1', metadata)
     * extractCountryCallingCode('+12133734253', null, null, metadata)
     * extractCountryCallingCode('+12133734253', 'RU', null, metadata)
     */

    function extractCountryCallingCode(number, country, callingCode, metadata) {
      if (!number) {
        return {};
      } // If this is not an international phone number,
      // then either extract an "IDD" prefix, or extract a
      // country calling code from a number by autocorrecting it
      // by prepending a leading `+` in cases when it starts
      // with the country calling code.
      // https://wikitravel.org/en/International_dialling_prefix
      // https://github.com/catamphetamine/libphonenumber-js/issues/376


      if (number[0] !== '+') {
        // Convert an "out-of-country" dialing phone number
        // to a proper international phone number.
        var numberWithoutIDD = stripIddPrefix(number, country, callingCode, metadata); // If an IDD prefix was stripped then
        // convert the number to international one
        // for subsequent parsing.

        if (numberWithoutIDD && numberWithoutIDD !== number) {
          number = '+' + numberWithoutIDD;
        } else {
          // Check to see if the number starts with the country calling code
          // for the default country. If so, we remove the country calling code,
          // and do some checks on the validity of the number before and after.
          // https://github.com/catamphetamine/libphonenumber-js/issues/376
          if (country || callingCode) {
            var _extractCountryCallin = extractCountryCallingCodeFromInternationalNumberWithoutPlusSign(number, country, callingCode, metadata),
                countryCallingCode = _extractCountryCallin.countryCallingCode,
                shorterNumber = _extractCountryCallin.number;

            if (countryCallingCode) {
              return {
                countryCallingCode: countryCallingCode,
                number: shorterNumber
              };
            }
          }

          return {
            number: number
          };
        }
      } // Fast abortion: country codes do not begin with a '0'


      if (number[1] === '0') {
        return {};
      }

      metadata = new Metadata(metadata); // The thing with country phone codes
      // is that they are orthogonal to each other
      // i.e. there's no such country phone code A
      // for which country phone code B exists
      // where B starts with A.
      // Therefore, while scanning digits,
      // if a valid country code is found,
      // that means that it is the country code.
      //

      var i = 2;

      while (i - 1 <= MAX_LENGTH_COUNTRY_CODE && i <= number.length) {
        var _countryCallingCode = number.slice(1, i);

        if (metadata.hasCallingCode(_countryCallingCode)) {
          metadata.selectNumberingPlan(_countryCallingCode);
          return {
            countryCallingCode: _countryCallingCode,
            number: number.slice(i)
          };
        }

        i++;
      }

      return {};
    }

    function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$1(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$1(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$1(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$1(o, minLen); }

    function _arrayLikeToArray$1(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
    var USE_NON_GEOGRAPHIC_COUNTRY_CODE = false;
    function getCountryByCallingCode(callingCode, nationalPhoneNumber, metadata) {
      /* istanbul ignore if */
      if (USE_NON_GEOGRAPHIC_COUNTRY_CODE) {
        if (metadata.isNonGeographicCallingCode(callingCode)) {
          return '001';
        }
      } // Is always non-empty, because `callingCode` is always valid


      var possibleCountries = metadata.getCountryCodesForCallingCode(callingCode);

      if (!possibleCountries) {
        return;
      } // If there's just one country corresponding to the country code,
      // then just return it, without further phone number digits validation.


      if (possibleCountries.length === 1) {
        return possibleCountries[0];
      }

      return selectCountryFromList(possibleCountries, nationalPhoneNumber, metadata.metadata);
    }

    function selectCountryFromList(possibleCountries, nationalPhoneNumber, metadata) {
      // Re-create `metadata` because it will be selecting a `country`.
      metadata = new Metadata(metadata);

      for (var _iterator = _createForOfIteratorHelperLoose(possibleCountries), _step; !(_step = _iterator()).done;) {
        var country = _step.value;
        metadata.country(country); // Leading digits check would be the simplest and fastest one.
        // Leading digits patterns are only defined for about 20% of all countries.
        // https://gitlab.com/catamphetamine/libphonenumber-js/blob/master/METADATA.md#leading_digits
        // Matching "leading digits" is a sufficient but not necessary condition.

        if (metadata.leadingDigits()) {
          if (nationalPhoneNumber && nationalPhoneNumber.search(metadata.leadingDigits()) === 0) {
            return country;
          }
        } // Else perform full validation with all of those
        // fixed-line/mobile/etc regular expressions.
        else if (getNumberType({
          phone: nationalPhoneNumber,
          country: country
        }, undefined, metadata.metadata)) {
          return country;
        }
      }
    }

    // This is a port of Google Android `libphonenumber`'s
    // This prevents malicious input from consuming CPU.

    var MAX_INPUT_STRING_LENGTH = 250; // This consists of the plus symbol, digits, and arabic-indic digits.

    var PHONE_NUMBER_START_PATTERN = new RegExp('[' + PLUS_CHARS + VALID_DIGITS + ']'); // Regular expression of trailing characters that we want to remove.
    // A trailing `#` is sometimes used when writing phone numbers with extensions in US.
    // Example: "+1 (645) 123 1234-910#" number has extension "910".

    var AFTER_PHONE_NUMBER_END_PATTERN = new RegExp('[^' + VALID_DIGITS + '#' + ']+$');
    //
    // ```js
    // parse('8 (800) 555-35-35', 'RU')
    // parse('8 (800) 555-35-35', 'RU', metadata)
    // parse('8 (800) 555-35-35', { country: { default: 'RU' } })
    // parse('8 (800) 555-35-35', { country: { default: 'RU' } }, metadata)
    // parse('+7 800 555 35 35')
    // parse('+7 800 555 35 35', metadata)
    // ```
    //

    function parse(text, options, metadata) {
      // If assigning the `{}` default value is moved to the arguments above,
      // code coverage would decrease for some weird reason.
      options = options || {};
      metadata = new Metadata(metadata); // Validate `defaultCountry`.

      if (options.defaultCountry && !metadata.hasCountry(options.defaultCountry)) {
        if (options.v2) {
          throw new ParseError('INVALID_COUNTRY');
        }

        throw new Error("Unknown country: ".concat(options.defaultCountry));
      } // Parse the phone number.


      var _parseInput = parseInput(text, options.v2, options.extract),
          formattedPhoneNumber = _parseInput.number,
          ext = _parseInput.ext,
          error = _parseInput.error; // If the phone number is not viable then return nothing.


      if (!formattedPhoneNumber) {
        if (options.v2) {
          if (error === 'TOO_SHORT') {
            throw new ParseError('TOO_SHORT');
          }

          throw new ParseError('NOT_A_NUMBER');
        }

        return {};
      }

      var _parsePhoneNumber = parsePhoneNumber$1(formattedPhoneNumber, options.defaultCountry, options.defaultCallingCode, metadata),
          country = _parsePhoneNumber.country,
          nationalNumber = _parsePhoneNumber.nationalNumber,
          countryCallingCode = _parsePhoneNumber.countryCallingCode,
          carrierCode = _parsePhoneNumber.carrierCode;

      if (!metadata.hasSelectedNumberingPlan()) {
        if (options.v2) {
          throw new ParseError('INVALID_COUNTRY');
        }

        return {};
      } // Validate national (significant) number length.


      if (!nationalNumber || nationalNumber.length < MIN_LENGTH_FOR_NSN) {
        // Won't throw here because the regexp already demands length > 1.

        /* istanbul ignore if */
        if (options.v2) {
          throw new ParseError('TOO_SHORT');
        } // Google's demo just throws an error in this case.


        return {};
      } // Validate national (significant) number length.
      //
      // A sidenote:
      //
      // They say that sometimes national (significant) numbers
      // can be longer than `MAX_LENGTH_FOR_NSN` (e.g. in Germany).
      // https://github.com/googlei18n/libphonenumber/blob/7e1748645552da39c4e1ba731e47969d97bdb539/resources/phonenumber.proto#L36
      // Such numbers will just be discarded.
      //


      if (nationalNumber.length > MAX_LENGTH_FOR_NSN) {
        if (options.v2) {
          throw new ParseError('TOO_LONG');
        } // Google's demo just throws an error in this case.


        return {};
      }

      if (options.v2) {
        var phoneNumber = new PhoneNumber(countryCallingCode, nationalNumber, metadata.metadata);

        if (country) {
          phoneNumber.country = country;
        }

        if (carrierCode) {
          phoneNumber.carrierCode = carrierCode;
        }

        if (ext) {
          phoneNumber.ext = ext;
        }

        return phoneNumber;
      } // Check if national phone number pattern matches the number.
      // National number pattern is different for each country,
      // even for those ones which are part of the "NANPA" group.


      var valid = (options.extended ? metadata.hasSelectedNumberingPlan() : country) ? matchesEntirely(nationalNumber, metadata.nationalNumberPattern()) : false;

      if (!options.extended) {
        return valid ? result(country, nationalNumber, ext) : {};
      } // isInternational: countryCallingCode !== undefined


      return {
        country: country,
        countryCallingCode: countryCallingCode,
        carrierCode: carrierCode,
        valid: valid,
        possible: valid ? true : options.extended === true && metadata.possibleLengths() && isPossibleNumber(nationalNumber, metadata) ? true : false,
        phone: nationalNumber,
        ext: ext
      };
    }
    /**
     * Extracts a formatted phone number from text.
     * Doesn't guarantee that the extracted phone number
     * is a valid phone number (for example, doesn't validate its length).
     * @param  {string} text
     * @param  {boolean} [extract] — If `false`, then will parse the entire `text` as a phone number.
     * @param  {boolean} [throwOnError] — By default, it won't throw if the text is too long.
     * @return {string}
     * @example
     * // Returns "(213) 373-4253".
     * extractFormattedPhoneNumber("Call (213) 373-4253 for assistance.")
     */

    function extractFormattedPhoneNumber(text, extract, throwOnError) {
      if (!text) {
        return;
      }

      if (text.length > MAX_INPUT_STRING_LENGTH) {
        if (throwOnError) {
          throw new ParseError('TOO_LONG');
        }

        return;
      }

      if (extract === false) {
        return text;
      } // Attempt to extract a possible number from the string passed in


      var startsAt = text.search(PHONE_NUMBER_START_PATTERN);

      if (startsAt < 0) {
        return;
      }

      return text // Trim everything to the left of the phone number
      .slice(startsAt) // Remove trailing non-numerical characters
      .replace(AFTER_PHONE_NUMBER_END_PATTERN, '');
    }
    /**
     * @param  {string} text - Input.
     * @param  {boolean} v2 - Legacy API functions don't pass `v2: true` flag.
     * @param  {boolean} [extract] - Whether to extract a phone number from `text`, or attempt to parse the entire text as a phone number.
     * @return {object} `{ ?number, ?ext }`.
     */


    function parseInput(text, v2, extract) {
      // Parse RFC 3966 phone number URI.
      if (text && text.indexOf('tel:') === 0) {
        return parseRFC3966(text);
      }

      var number = extractFormattedPhoneNumber(text, extract, v2); // If the phone number is not viable, then abort.

      if (!number) {
        return {};
      }

      if (!isViablePhoneNumber(number)) {
        if (isViablePhoneNumberStart(number)) {
          return {
            error: 'TOO_SHORT'
          };
        }

        return {};
      } // Attempt to parse extension first, since it doesn't require region-specific
      // data and we want to have the non-normalised number here.


      var withExtensionStripped = extractExtension(number);

      if (withExtensionStripped.ext) {
        return withExtensionStripped;
      }

      return {
        number: number
      };
    }
    /**
     * Creates `parse()` result object.
     */


    function result(country, nationalNumber, ext) {
      var result = {
        country: country,
        phone: nationalNumber
      };

      if (ext) {
        result.ext = ext;
      }

      return result;
    }
    /**
     * Parses a viable phone number.
     * @param {string} formattedPhoneNumber — Example: "(213) 373-4253".
     * @param {string} [defaultCountry]
     * @param {string} [defaultCallingCode]
     * @param {Metadata} metadata
     * @return {object} Returns `{ country: string?, countryCallingCode: string?, nationalNumber: string? }`.
     */


    function parsePhoneNumber$1(formattedPhoneNumber, defaultCountry, defaultCallingCode, metadata) {
      // Extract calling code from phone number.
      var _extractCountryCallin = extractCountryCallingCode(parseIncompletePhoneNumber(formattedPhoneNumber), defaultCountry, defaultCallingCode, metadata.metadata),
          countryCallingCode = _extractCountryCallin.countryCallingCode,
          number = _extractCountryCallin.number; // Choose a country by `countryCallingCode`.


      var country;

      if (countryCallingCode) {
        metadata.selectNumberingPlan(countryCallingCode);
      } // If `formattedPhoneNumber` is in "national" format
      // then `number` is defined and `countryCallingCode` isn't.
      else if (number && (defaultCountry || defaultCallingCode)) {
        metadata.selectNumberingPlan(defaultCountry, defaultCallingCode);

        if (defaultCountry) {
          country = defaultCountry;
        }

        countryCallingCode = defaultCallingCode || getCountryCallingCode(defaultCountry, metadata.metadata);
      } else return {};

      if (!number) {
        return {
          countryCallingCode: countryCallingCode
        };
      }

      var _extractNationalNumbe = extractNationalNumber(parseIncompletePhoneNumber(number), metadata),
          nationalNumber = _extractNationalNumbe.nationalNumber,
          carrierCode = _extractNationalNumbe.carrierCode; // Sometimes there are several countries
      // corresponding to the same country phone code
      // (e.g. NANPA countries all having `1` country phone code).
      // Therefore, to reliably determine the exact country,
      // national (significant) number should have been parsed first.
      //
      // When `metadata.json` is generated, all "ambiguous" country phone codes
      // get their countries populated with the full set of
      // "phone number type" regular expressions.
      //


      var exactCountry = getCountryByCallingCode(countryCallingCode, nationalNumber, metadata);

      if (exactCountry) {
        country = exactCountry;
        /* istanbul ignore if */

        if (exactCountry === '001') ; else {
          metadata.country(country);
        }
      }

      return {
        country: country,
        countryCallingCode: countryCallingCode,
        nationalNumber: nationalNumber,
        carrierCode: carrierCode
      };
    }

    function ownKeys$2(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread$2(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$2(Object(source), !0).forEach(function (key) { _defineProperty$2(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$2(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty$2(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
    function parsePhoneNumber(text, options, metadata) {
      return parse(text, _objectSpread$2(_objectSpread$2({}, options), {}, {
        v2: true
      }), metadata);
    }

    function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

    function ownKeys$1(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread$1(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$1(Object(source), !0).forEach(function (key) { _defineProperty$1(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$1(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty$1(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

    function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

    function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

    function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
    function normalizeArguments(args) {
      var _Array$prototype$slic = Array.prototype.slice.call(args),
          _Array$prototype$slic2 = _slicedToArray(_Array$prototype$slic, 4),
          arg_1 = _Array$prototype$slic2[0],
          arg_2 = _Array$prototype$slic2[1],
          arg_3 = _Array$prototype$slic2[2],
          arg_4 = _Array$prototype$slic2[3];

      var text;
      var options;
      var metadata; // If the phone number is passed as a string.
      // `parsePhoneNumber('88005553535', ...)`.

      if (typeof arg_1 === 'string') {
        text = arg_1;
      } else throw new TypeError('A text for parsing must be a string.'); // If "default country" argument is being passed then move it to `options`.
      // `parsePhoneNumber('88005553535', 'RU', [options], metadata)`.


      if (!arg_2 || typeof arg_2 === 'string') {
        if (arg_4) {
          options = arg_3;
          metadata = arg_4;
        } else {
          options = undefined;
          metadata = arg_3;
        }

        if (arg_2) {
          options = _objectSpread$1({
            defaultCountry: arg_2
          }, options);
        }
      } // `defaultCountry` is not passed.
      // Example: `parsePhoneNumber('+78005553535', [options], metadata)`.
      else if (isObject$1(arg_2)) {
        if (arg_3) {
          options = arg_2;
          metadata = arg_3;
        } else {
          metadata = arg_2;
        }
      } else throw new Error("Invalid second argument: ".concat(arg_2));

      return {
        text: text,
        options: options,
        metadata: metadata
      };
    } // Otherwise istanbul would show this as "branch not covered".

    /* istanbul ignore next */

    var isObject$1 = function isObject(_) {
      return _typeof(_) === 'object';
    };

    function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
    function parsePhoneNumberFromString$2(text, options, metadata) {
      // Validate `defaultCountry`.
      if (options && options.defaultCountry && !isSupportedCountry(options.defaultCountry, metadata)) {
        options = _objectSpread(_objectSpread({}, options), {}, {
          defaultCountry: undefined
        });
      } // Parse phone number.


      try {
        return parsePhoneNumber(text, options, metadata);
      } catch (error) {
        /* istanbul ignore else */
        if (error instanceof ParseError) ; else {
          throw error;
        }
      }
    }

    function parsePhoneNumberFromString$1() {
      var _normalizeArguments = normalizeArguments(arguments),
          text = _normalizeArguments.text,
          options = _normalizeArguments.options,
          metadata = _normalizeArguments.metadata;

      return parsePhoneNumberFromString$2(text, options, metadata);
    }

    function parsePhoneNumberFromString() {
    	return withMetadataArgument(parsePhoneNumberFromString$1, arguments)
    }

    var IS_PHONE_NUMBER = 'isPhoneNumber';
    /**
     * Checks if the string is a valid phone number. To successfully validate any phone number the text must include
     * the intl. calling code, if the calling code wont be provided then the region must be set.
     *
     * @param value the potential phone number string to test
     * @param region 2 characters uppercase country code (e.g. DE, US, CH) for country specific validation.
     * If text doesn't start with the international calling code (e.g. +41), then you must set this parameter.
     */
    function isPhoneNumber(value, region) {
        try {
            var phoneNum = parsePhoneNumberFromString(value, region);
            var result = phoneNum === null || phoneNum === void 0 ? void 0 : phoneNum.isValid();
            return !!result;
        }
        catch (error) {
            // logging?
            return false;
        }
    }
    /**
     * Checks if the string is a valid phone number. To successfully validate any phone number the text must include
     * the intl. calling code, if the calling code wont be provided then the region must be set.
     *
     * @param region 2 characters uppercase country code (e.g. DE, US, CH) for country specific validation.
     * If text doesn't start with the international calling code (e.g. +41), then you must set this parameter.
     */
    function IsPhoneNumber(region, validationOptions) {
        return ValidateBy({
            name: IS_PHONE_NUMBER,
            constraints: [region],
            validator: {
                validate: function (value, args) { return isPhoneNumber(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid phone number'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_MILITARY_TIME = 'isMilitaryTime';
    /**
     * Checks if the string represents a time without a given timezone in the format HH:MM (military)
     * If the given value does not match the pattern HH:MM, then it returns false.
     */
    function isMilitaryTime(value) {
        var militaryTimeRegex = /^([01]\d|2[0-3]):?([0-5]\d)$/;
        return typeof value === 'string' && matchesValidator(value, militaryTimeRegex);
    }
    /**
     * Checks if the string represents a time without a given timezone in the format HH:MM (military)
     * If the given value does not match the pattern HH:MM, then it returns false.
     */
    function IsMilitaryTime(validationOptions) {
        return ValidateBy({
            name: IS_MILITARY_TIME,
            validator: {
                validate: function (value, args) { return isMilitaryTime(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid representation of military time in the format HH:MM'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isHash$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isHash;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var lengths = {
    	  md5: 32,
    	  md4: 32,
    	  sha1: 40,
    	  sha256: 64,
    	  sha384: 96,
    	  sha512: 128,
    	  ripemd128: 32,
    	  ripemd160: 40,
    	  tiger128: 32,
    	  tiger160: 40,
    	  tiger192: 48,
    	  crc32: 8,
    	  crc32b: 8
    	};

    	function isHash(str, algorithm) {
    	  (0, _assertString.default)(str);
    	  var hash = new RegExp("^[a-fA-F0-9]{".concat(lengths[algorithm], "}$"));
    	  return hash.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isHash$1, isHash$1.exports));

    var isHashValidator = /*@__PURE__*/getDefaultExportFromCjs(isHash$1.exports);

    var IS_HASH = 'isHash';
    /**
     * Check if the string is a hash of type algorithm.
     * Algorithm is one of ['md4', 'md5', 'sha1', 'sha256', 'sha384', 'sha512', 'ripemd128', 'ripemd160', 'tiger128',
     * 'tiger160', 'tiger192', 'crc32', 'crc32b']
     */
    function isHash(value, algorithm) {
        return typeof value === 'string' && isHashValidator(value, algorithm);
    }
    /**
     * Check if the string is a hash of type algorithm.
     * Algorithm is one of ['md4', 'md5', 'sha1', 'sha256', 'sha384', 'sha512', 'ripemd128', 'ripemd160', 'tiger128',
     * 'tiger160', 'tiger192', 'crc32', 'crc32b']
     */
    function IsHash(algorithm, validationOptions) {
        return ValidateBy({
            name: IS_HASH,
            constraints: [algorithm],
            validator: {
                validate: function (value, args) { return isHash(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a hash of type $constraint1'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isISSN$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isISSN;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var issn = '^\\d{4}-?\\d{3}[\\dX]$';

    	function isISSN(str) {
    	  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    	  (0, _assertString.default)(str);
    	  var testIssn = issn;
    	  testIssn = options.require_hyphen ? testIssn.replace('?', '') : testIssn;
    	  testIssn = options.case_sensitive ? new RegExp(testIssn) : new RegExp(testIssn, 'i');

    	  if (!testIssn.test(str)) {
    	    return false;
    	  }

    	  var digits = str.replace('-', '').toUpperCase();
    	  var checksum = 0;

    	  for (var i = 0; i < digits.length; i++) {
    	    var digit = digits[i];
    	    checksum += (digit === 'X' ? 10 : +digit) * (8 - i);
    	  }

    	  return checksum % 11 === 0;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isISSN$1, isISSN$1.exports));

    var isISSNValidator = /*@__PURE__*/getDefaultExportFromCjs(isISSN$1.exports);

    var IS_ISSN = 'isISSN';
    /**
     * Checks if the string is a ISSN.
     * If given value is not a string, then it returns false.
     */
    function isISSN(value, options) {
        return typeof value === 'string' && isISSNValidator(value, options);
    }
    /**
     * Checks if the string is a ISSN.
     * If given value is not a string, then it returns false.
     */
    function IsISSN(options, validationOptions) {
        return ValidateBy({
            name: IS_ISSN,
            constraints: [options],
            validator: {
                validate: function (value, args) { return isISSN(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a ISSN'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_DATE_STRING = 'isDateString';
    /**
     * Alias for IsISO8601 validator
     */
    function isDateString(value, options) {
        return isISO8601(value, options);
    }
    /**
     * Alias for IsISO8601 validator
     */
    function IsDateString(options, validationOptions) {
        return ValidateBy({
            name: IS_DATE_STRING,
            constraints: [options],
            validator: {
                validate: function (value) { return isDateString(value, options); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid ISO 8601 date string'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isBoolean$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isBoolean;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var defaultOptions = {
    	  loose: false
    	};
    	var strictBooleans = ['true', 'false', '1', '0'];
    	var looseBooleans = [].concat(strictBooleans, ['yes', 'no']);

    	function isBoolean(str) {
    	  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultOptions;
    	  (0, _assertString.default)(str);

    	  if (options.loose) {
    	    return looseBooleans.includes(str.toLowerCase());
    	  }

    	  return strictBooleans.includes(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isBoolean$1, isBoolean$1.exports));

    var isBooleanValidator = /*@__PURE__*/getDefaultExportFromCjs(isBoolean$1.exports);

    var IS_BOOLEAN_STRING = 'isBooleanString';
    /**
     * Checks if a string is a boolean.
     * If given value is not a string, then it returns false.
     */
    function isBooleanString(value) {
        return typeof value === 'string' && isBooleanValidator(value);
    }
    /**
     * Checks if a string is a boolean.
     * If given value is not a string, then it returns false.
     */
    function IsBooleanString(validationOptions) {
        return ValidateBy({
            name: IS_BOOLEAN_STRING,
            validator: {
                validate: function (value, args) { return isBooleanString(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a boolean string'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isNumeric = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isNumeric;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _alpha = alpha$1;

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var numericNoSymbols = /^[0-9]+$/;

    	function isNumeric(str, options) {
    	  (0, _assertString.default)(str);

    	  if (options && options.no_symbols) {
    	    return numericNoSymbols.test(str);
    	  }

    	  return new RegExp("^[+-]?([0-9]*[".concat((options || {}).locale ? _alpha.decimal[options.locale] : '.', "])?[0-9]+$")).test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isNumeric, isNumeric.exports));

    var isNumericValidator = /*@__PURE__*/getDefaultExportFromCjs(isNumeric.exports);

    var IS_NUMBER_STRING = 'isNumberString';
    /**
     * Checks if the string is numeric.
     * If given value is not a string, then it returns false.
     */
    function isNumberString(value, options) {
        return typeof value === 'string' && isNumericValidator(value, options);
    }
    /**
     * Checks if the string is numeric.
     * If given value is not a string, then it returns false.
     */
    function IsNumberString(options, validationOptions) {
        return ValidateBy({
            name: IS_NUMBER_STRING,
            constraints: [options],
            validator: {
                validate: function (value, args) { return isNumberString(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a number string'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isBase32$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isBase32;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var base32 = /^[A-Z2-7]+=*$/;

    	function isBase32(str) {
    	  (0, _assertString.default)(str);
    	  var len = str.length;

    	  if (len % 8 === 0 && base32.test(str)) {
    	    return true;
    	  }

    	  return false;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isBase32$1, isBase32$1.exports));

    var isBase32Validator = /*@__PURE__*/getDefaultExportFromCjs(isBase32$1.exports);

    var IS_BASE32 = 'isBase32';
    /**
     * Checks if a string is base32 encoded.
     * If given value is not a string, then it returns false.
     */
    function isBase32(value) {
        return typeof value === 'string' && isBase32Validator(value);
    }
    /**
     * Check if a string is base32 encoded.
     * If given value is not a string, then it returns false.
     */
    function IsBase32(validationOptions) {
        return ValidateBy({
            name: IS_BASE32,
            validator: {
                validate: function (value, args) { return isBase32(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be base32 encoded'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isBIC$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isBIC;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _isISO31661Alpha = isISO31661Alpha2$2;

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	// https://en.wikipedia.org/wiki/ISO_9362
    	var isBICReg = /^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/;

    	function isBIC(str) {
    	  (0, _assertString.default)(str); // toUpperCase() should be removed when a new major version goes out that changes
    	  // the regex to [A-Z] (per the spec).

    	  if (!_isISO31661Alpha.CountryCodes.has(str.slice(4, 6).toUpperCase())) {
    	    return false;
    	  }

    	  return isBICReg.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isBIC$1, isBIC$1.exports));

    var isBICValidator = /*@__PURE__*/getDefaultExportFromCjs(isBIC$1.exports);

    var IS_BIC = 'isBIC';
    /**
     * Check if a string is a BIC (Bank Identification Code) or SWIFT code.
     * If given value is not a string, then it returns false.
     */
    function isBIC(value) {
        return typeof value === 'string' && isBICValidator(value);
    }
    /**
     * Check if a string is a BIC (Bank Identification Code) or SWIFT code.
     * If given value is not a string, then it returns false.
     */
    function IsBIC(validationOptions) {
        return ValidateBy({
            name: IS_BIC,
            validator: {
                validate: function (value, args) { return isBIC(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a BIC or SWIFT code'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isBtcAddress$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isBtcAddress;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	// supports Bech32 addresses
    	var bech32 = /^(bc1)[a-z0-9]{25,39}$/;
    	var base58 = /^(1|3)[A-HJ-NP-Za-km-z1-9]{25,39}$/;

    	function isBtcAddress(str) {
    	  (0, _assertString.default)(str); // check for bech32

    	  if (str.startsWith('bc1')) {
    	    return bech32.test(str);
    	  }

    	  return base58.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isBtcAddress$1, isBtcAddress$1.exports));

    var isBtcAddressValidator = /*@__PURE__*/getDefaultExportFromCjs(isBtcAddress$1.exports);

    var IS_BTC_ADDRESS = 'isBtcAddress';
    /**
     * Check if the string is a valid BTC address.
     * If given value is not a string, then it returns false.
     */
    function isBtcAddress(value) {
        return typeof value === 'string' && isBtcAddressValidator(value);
    }
    /**
     * Check if the string is a valid BTC address.
     * If given value is not a string, then it returns false.
     */
    function IsBtcAddress(validationOptions) {
        return ValidateBy({
            name: IS_BTC_ADDRESS,
            validator: {
                validate: function (value, args) { return isBtcAddress(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a BTC address'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isDataURI$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isDataURI;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var validMediaType = /^[a-z]+\/[a-z0-9\-\+]+$/i;
    	var validAttribute = /^[a-z\-]+=[a-z0-9\-]+$/i;
    	var validData = /^[a-z0-9!\$&'\(\)\*\+,;=\-\._~:@\/\?%\s]*$/i;

    	function isDataURI(str) {
    	  (0, _assertString.default)(str);
    	  var data = str.split(',');

    	  if (data.length < 2) {
    	    return false;
    	  }

    	  var attributes = data.shift().trim().split(';');
    	  var schemeAndMediaType = attributes.shift();

    	  if (schemeAndMediaType.substr(0, 5) !== 'data:') {
    	    return false;
    	  }

    	  var mediaType = schemeAndMediaType.substr(5);

    	  if (mediaType !== '' && !validMediaType.test(mediaType)) {
    	    return false;
    	  }

    	  for (var i = 0; i < attributes.length; i++) {
    	    if (!(i === attributes.length - 1 && attributes[i].toLowerCase() === 'base64') && !validAttribute.test(attributes[i])) {
    	      return false;
    	    }
    	  }

    	  for (var _i = 0; _i < data.length; _i++) {
    	    if (!validData.test(data[_i])) {
    	      return false;
    	    }
    	  }

    	  return true;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isDataURI$1, isDataURI$1.exports));

    var isDataURIValidator = /*@__PURE__*/getDefaultExportFromCjs(isDataURI$1.exports);

    var IS_DATA_URI = 'isDataURI';
    /**
     * Check if the string is a data uri format.
     * If given value is not a string, then it returns false.
     */
    function isDataURI(value) {
        return typeof value === 'string' && isDataURIValidator(value);
    }
    /**
     * Check if the string is a data uri format.
     * If given value is not a string, then it returns false.
     */
    function IsDataURI(validationOptions) {
        return ValidateBy({
            name: IS_DATA_URI,
            validator: {
                validate: function (value, args) { return isDataURI(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a data uri format'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isEAN$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isEAN;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	/**
    	 * The most commonly used EAN standard is
    	 * the thirteen-digit EAN-13, while the
    	 * less commonly used 8-digit EAN-8 barcode was
    	 * introduced for use on small packages.
    	 * Also EAN/UCC-14 is used for Grouping of individual
    	 * trade items above unit level(Intermediate, Carton or Pallet).
    	 * For more info about EAN-14 checkout: https://www.gtin.info/itf-14-barcodes/
    	 * EAN consists of:
    	 * GS1 prefix, manufacturer code, product code and check digit
    	 * Reference: https://en.wikipedia.org/wiki/International_Article_Number
    	 * Reference: https://www.gtin.info/
    	 */

    	/**
    	 * Define EAN Lenghts; 8 for EAN-8; 13 for EAN-13; 14 for EAN-14
    	 * and Regular Expression for valid EANs (EAN-8, EAN-13, EAN-14),
    	 * with exact numberic matching of 8 or 13 or 14 digits [0-9]
    	 */
    	var LENGTH_EAN_8 = 8;
    	var LENGTH_EAN_14 = 14;
    	var validEanRegex = /^(\d{8}|\d{13}|\d{14})$/;
    	/**
    	 * Get position weight given:
    	 * EAN length and digit index/position
    	 *
    	 * @param {number} length
    	 * @param {number} index
    	 * @return {number}
    	 */

    	function getPositionWeightThroughLengthAndIndex(length, index) {
    	  if (length === LENGTH_EAN_8 || length === LENGTH_EAN_14) {
    	    return index % 2 === 0 ? 3 : 1;
    	  }

    	  return index % 2 === 0 ? 1 : 3;
    	}
    	/**
    	 * Calculate EAN Check Digit
    	 * Reference: https://en.wikipedia.org/wiki/International_Article_Number#Calculation_of_checksum_digit
    	 *
    	 * @param {string} ean
    	 * @return {number}
    	 */


    	function calculateCheckDigit(ean) {
    	  var checksum = ean.slice(0, -1).split('').map(function (char, index) {
    	    return Number(char) * getPositionWeightThroughLengthAndIndex(ean.length, index);
    	  }).reduce(function (acc, partialSum) {
    	    return acc + partialSum;
    	  }, 0);
    	  var remainder = 10 - checksum % 10;
    	  return remainder < 10 ? remainder : 0;
    	}
    	/**
    	 * Check if string is valid EAN:
    	 * Matches EAN-8/EAN-13/EAN-14 regex
    	 * Has valid check digit.
    	 *
    	 * @param {string} str
    	 * @return {boolean}
    	 */


    	function isEAN(str) {
    	  (0, _assertString.default)(str);
    	  var actualCheckDigit = Number(str.slice(-1));
    	  return validEanRegex.test(str) && actualCheckDigit === calculateCheckDigit(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isEAN$1, isEAN$1.exports));

    var isEANValidator = /*@__PURE__*/getDefaultExportFromCjs(isEAN$1.exports);

    var IS_EAN = 'isEAN';
    /**
     * Check if the string is an EAN (European Article Number).
     * If given value is not a string, then it returns false.
     */
    function isEAN(value) {
        return typeof value === 'string' && isEANValidator(value);
    }
    /**
     * Check if the string is an EAN (European Article Number).
     * If given value is not a string, then it returns false.
     */
    function IsEAN(validationOptions) {
        return ValidateBy({
            name: IS_EAN,
            validator: {
                validate: function (value, args) { return isEAN(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an EAN (European Article Number)'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isEthereumAddress$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isEthereumAddress;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var eth = /^(0x)[0-9a-f]{40}$/i;

    	function isEthereumAddress(str) {
    	  (0, _assertString.default)(str);
    	  return eth.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isEthereumAddress$1, isEthereumAddress$1.exports));

    var isEthereumAddressValidator = /*@__PURE__*/getDefaultExportFromCjs(isEthereumAddress$1.exports);

    var IS_ETHEREUM_ADDRESS = 'isEthereumAddress';
    /**
     * Check if the string is an Ethereum address using basic regex. Does not validate address checksums.
     * If given value is not a string, then it returns false.
     */
    function isEthereumAddress(value) {
        return typeof value === 'string' && isEthereumAddressValidator(value);
    }
    /**
     * Check if the string is an Ethereum address using basic regex. Does not validate address checksums.
     * If given value is not a string, then it returns false.
     */
    function IsEthereumAddress(validationOptions) {
        return ValidateBy({
            name: IS_ETHEREUM_ADDRESS,
            validator: {
                validate: function (value, args) { return isEthereumAddress(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an Ethereum address'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isHSL$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isHSL;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var hslComma = /^hsla?\(((\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?))(deg|grad|rad|turn)?(,(\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?)%){2}(,((\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?)%?))?\)$/i;
    	var hslSpace = /^hsla?\(((\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?))(deg|grad|rad|turn)?(\s(\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?)%){2}\s?(\/\s((\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?)%?)\s?)?\)$/i;

    	function isHSL(str) {
    	  (0, _assertString.default)(str); // Strip duplicate spaces before calling the validation regex (See  #1598 for more info)

    	  var strippedStr = str.replace(/\s+/g, ' ').replace(/\s?(hsla?\(|\)|,)\s?/ig, '$1');

    	  if (strippedStr.indexOf(',') !== -1) {
    	    return hslComma.test(strippedStr);
    	  }

    	  return hslSpace.test(strippedStr);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isHSL$1, isHSL$1.exports));

    var isHSLValidator = /*@__PURE__*/getDefaultExportFromCjs(isHSL$1.exports);

    var IS_HSL = 'isHSL';
    /**
     * Check if the string is an HSL (hue, saturation, lightness, optional alpha) color based on CSS Colors Level 4 specification.
     * Comma-separated format supported. Space-separated format supported with the exception of a few edge cases (ex: hsl(200grad+.1%62%/1)).
     * If given value is not a string, then it returns false.
     */
    function isHSL(value) {
        return typeof value === 'string' && isHSLValidator(value);
    }
    /**
     * Check if the string is an HSL (hue, saturation, lightness, optional alpha) color based on CSS Colors Level 4 specification.
     * Comma-separated format supported. Space-separated format supported with the exception of a few edge cases (ex: hsl(200grad+.1%62%/1)).
     * If given value is not a string, then it returns false.
     */
    function IsHSL(validationOptions) {
        return ValidateBy({
            name: IS_HSL,
            validator: {
                validate: function (value, args) { return isHSL(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a HSL color'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isIBAN$2 = {};

    Object.defineProperty(isIBAN$2, "__esModule", {
      value: true
    });
    var _default$2 = isIBAN$2.default = isIBAN$1;
    isIBAN$2.locales = void 0;

    var _assertString$3 = _interopRequireDefault$3(assertString.exports);

    function _interopRequireDefault$3(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /**
     * List of country codes with
     * corresponding IBAN regular expression
     * Reference: https://en.wikipedia.org/wiki/International_Bank_Account_Number
     */
    var ibanRegexThroughCountryCode = {
      AD: /^(AD[0-9]{2})\d{8}[A-Z0-9]{12}$/,
      AE: /^(AE[0-9]{2})\d{3}\d{16}$/,
      AL: /^(AL[0-9]{2})\d{8}[A-Z0-9]{16}$/,
      AT: /^(AT[0-9]{2})\d{16}$/,
      AZ: /^(AZ[0-9]{2})[A-Z0-9]{4}\d{20}$/,
      BA: /^(BA[0-9]{2})\d{16}$/,
      BE: /^(BE[0-9]{2})\d{12}$/,
      BG: /^(BG[0-9]{2})[A-Z]{4}\d{6}[A-Z0-9]{8}$/,
      BH: /^(BH[0-9]{2})[A-Z]{4}[A-Z0-9]{14}$/,
      BR: /^(BR[0-9]{2})\d{23}[A-Z]{1}[A-Z0-9]{1}$/,
      BY: /^(BY[0-9]{2})[A-Z0-9]{4}\d{20}$/,
      CH: /^(CH[0-9]{2})\d{5}[A-Z0-9]{12}$/,
      CR: /^(CR[0-9]{2})\d{18}$/,
      CY: /^(CY[0-9]{2})\d{8}[A-Z0-9]{16}$/,
      CZ: /^(CZ[0-9]{2})\d{20}$/,
      DE: /^(DE[0-9]{2})\d{18}$/,
      DK: /^(DK[0-9]{2})\d{14}$/,
      DO: /^(DO[0-9]{2})[A-Z]{4}\d{20}$/,
      EE: /^(EE[0-9]{2})\d{16}$/,
      EG: /^(EG[0-9]{2})\d{25}$/,
      ES: /^(ES[0-9]{2})\d{20}$/,
      FI: /^(FI[0-9]{2})\d{14}$/,
      FO: /^(FO[0-9]{2})\d{14}$/,
      FR: /^(FR[0-9]{2})\d{10}[A-Z0-9]{11}\d{2}$/,
      GB: /^(GB[0-9]{2})[A-Z]{4}\d{14}$/,
      GE: /^(GE[0-9]{2})[A-Z0-9]{2}\d{16}$/,
      GI: /^(GI[0-9]{2})[A-Z]{4}[A-Z0-9]{15}$/,
      GL: /^(GL[0-9]{2})\d{14}$/,
      GR: /^(GR[0-9]{2})\d{7}[A-Z0-9]{16}$/,
      GT: /^(GT[0-9]{2})[A-Z0-9]{4}[A-Z0-9]{20}$/,
      HR: /^(HR[0-9]{2})\d{17}$/,
      HU: /^(HU[0-9]{2})\d{24}$/,
      IE: /^(IE[0-9]{2})[A-Z0-9]{4}\d{14}$/,
      IL: /^(IL[0-9]{2})\d{19}$/,
      IQ: /^(IQ[0-9]{2})[A-Z]{4}\d{15}$/,
      IR: /^(IR[0-9]{2})0\d{2}0\d{18}$/,
      IS: /^(IS[0-9]{2})\d{22}$/,
      IT: /^(IT[0-9]{2})[A-Z]{1}\d{10}[A-Z0-9]{12}$/,
      JO: /^(JO[0-9]{2})[A-Z]{4}\d{22}$/,
      KW: /^(KW[0-9]{2})[A-Z]{4}[A-Z0-9]{22}$/,
      KZ: /^(KZ[0-9]{2})\d{3}[A-Z0-9]{13}$/,
      LB: /^(LB[0-9]{2})\d{4}[A-Z0-9]{20}$/,
      LC: /^(LC[0-9]{2})[A-Z]{4}[A-Z0-9]{24}$/,
      LI: /^(LI[0-9]{2})\d{5}[A-Z0-9]{12}$/,
      LT: /^(LT[0-9]{2})\d{16}$/,
      LU: /^(LU[0-9]{2})\d{3}[A-Z0-9]{13}$/,
      LV: /^(LV[0-9]{2})[A-Z]{4}[A-Z0-9]{13}$/,
      MC: /^(MC[0-9]{2})\d{10}[A-Z0-9]{11}\d{2}$/,
      MD: /^(MD[0-9]{2})[A-Z0-9]{20}$/,
      ME: /^(ME[0-9]{2})\d{18}$/,
      MK: /^(MK[0-9]{2})\d{3}[A-Z0-9]{10}\d{2}$/,
      MR: /^(MR[0-9]{2})\d{23}$/,
      MT: /^(MT[0-9]{2})[A-Z]{4}\d{5}[A-Z0-9]{18}$/,
      MU: /^(MU[0-9]{2})[A-Z]{4}\d{19}[A-Z]{3}$/,
      MZ: /^(MZ[0-9]{2})\d{21}$/,
      NL: /^(NL[0-9]{2})[A-Z]{4}\d{10}$/,
      NO: /^(NO[0-9]{2})\d{11}$/,
      PK: /^(PK[0-9]{2})[A-Z0-9]{4}\d{16}$/,
      PL: /^(PL[0-9]{2})\d{24}$/,
      PS: /^(PS[0-9]{2})[A-Z0-9]{4}\d{21}$/,
      PT: /^(PT[0-9]{2})\d{21}$/,
      QA: /^(QA[0-9]{2})[A-Z]{4}[A-Z0-9]{21}$/,
      RO: /^(RO[0-9]{2})[A-Z]{4}[A-Z0-9]{16}$/,
      RS: /^(RS[0-9]{2})\d{18}$/,
      SA: /^(SA[0-9]{2})\d{2}[A-Z0-9]{18}$/,
      SC: /^(SC[0-9]{2})[A-Z]{4}\d{20}[A-Z]{3}$/,
      SE: /^(SE[0-9]{2})\d{20}$/,
      SI: /^(SI[0-9]{2})\d{15}$/,
      SK: /^(SK[0-9]{2})\d{20}$/,
      SM: /^(SM[0-9]{2})[A-Z]{1}\d{10}[A-Z0-9]{12}$/,
      SV: /^(SV[0-9]{2})[A-Z0-9]{4}\d{20}$/,
      TL: /^(TL[0-9]{2})\d{19}$/,
      TN: /^(TN[0-9]{2})\d{20}$/,
      TR: /^(TR[0-9]{2})\d{5}[A-Z0-9]{17}$/,
      UA: /^(UA[0-9]{2})\d{6}[A-Z0-9]{19}$/,
      VA: /^(VA[0-9]{2})\d{18}$/,
      VG: /^(VG[0-9]{2})[A-Z0-9]{4}\d{16}$/,
      XK: /^(XK[0-9]{2})\d{16}$/
    };
    /**
     * Check whether string has correct universal IBAN format
     * The IBAN consists of up to 34 alphanumeric characters, as follows:
     * Country Code using ISO 3166-1 alpha-2, two letters
     * check digits, two digits and
     * Basic Bank Account Number (BBAN), up to 30 alphanumeric characters.
     * NOTE: Permitted IBAN characters are: digits [0-9] and the 26 latin alphabetic [A-Z]
     *
     * @param {string} str - string under validation
     * @return {boolean}
     */

    function hasValidIbanFormat(str) {
      // Strip white spaces and hyphens
      var strippedStr = str.replace(/[\s\-]+/gi, '').toUpperCase();
      var isoCountryCode = strippedStr.slice(0, 2).toUpperCase();
      return isoCountryCode in ibanRegexThroughCountryCode && ibanRegexThroughCountryCode[isoCountryCode].test(strippedStr);
    }
    /**
       * Check whether string has valid IBAN Checksum
       * by performing basic mod-97 operation and
       * the remainder should equal 1
       * -- Start by rearranging the IBAN by moving the four initial characters to the end of the string
       * -- Replace each letter in the string with two digits, A -> 10, B = 11, Z = 35
       * -- Interpret the string as a decimal integer and
       * -- compute the remainder on division by 97 (mod 97)
       * Reference: https://en.wikipedia.org/wiki/International_Bank_Account_Number
       *
       * @param {string} str
       * @return {boolean}
       */


    function hasValidIbanChecksum(str) {
      var strippedStr = str.replace(/[^A-Z0-9]+/gi, '').toUpperCase(); // Keep only digits and A-Z latin alphabetic

      var rearranged = strippedStr.slice(4) + strippedStr.slice(0, 4);
      var alphaCapsReplacedWithDigits = rearranged.replace(/[A-Z]/g, function (char) {
        return char.charCodeAt(0) - 55;
      });
      var remainder = alphaCapsReplacedWithDigits.match(/\d{1,7}/g).reduce(function (acc, value) {
        return Number(acc + value) % 97;
      }, '');
      return remainder === 1;
    }

    function isIBAN$1(str) {
      (0, _assertString$3.default)(str);
      return hasValidIbanFormat(str) && hasValidIbanChecksum(str);
    }

    var locales$1 = Object.keys(ibanRegexThroughCountryCode);
    isIBAN$2.locales = locales$1;

    var IS_IBAN = 'isIBAN';
    /**
     * Check if a string is a IBAN (International Bank Account Number).
     * If given value is not a string, then it returns false.
     */
    function isIBAN(value) {
        return typeof value === 'string' && _default$2(value);
    }
    /**
     * Check if a string is a IBAN (International Bank Account Number).
     * If given value is not a string, then it returns false.
     */
    function IsIBAN(validationOptions) {
        return ValidateBy({
            name: IS_IBAN,
            validator: {
                validate: function (value, args) { return isIBAN(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an IBAN'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isIdentityCard$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isIdentityCard;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _isInt = _interopRequireDefault(isInt$1.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var validators = {
    	  PL: function PL(str) {
    	    (0, _assertString.default)(str);
    	    var weightOfDigits = {
    	      1: 1,
    	      2: 3,
    	      3: 7,
    	      4: 9,
    	      5: 1,
    	      6: 3,
    	      7: 7,
    	      8: 9,
    	      9: 1,
    	      10: 3,
    	      11: 0
    	    };

    	    if (str != null && str.length === 11 && (0, _isInt.default)(str, {
    	      allow_leading_zeroes: true
    	    })) {
    	      var digits = str.split('').slice(0, -1);
    	      var sum = digits.reduce(function (acc, digit, index) {
    	        return acc + Number(digit) * weightOfDigits[index + 1];
    	      }, 0);
    	      var modulo = sum % 10;
    	      var lastDigit = Number(str.charAt(str.length - 1));

    	      if (modulo === 0 && lastDigit === 0 || lastDigit === 10 - modulo) {
    	        return true;
    	      }
    	    }

    	    return false;
    	  },
    	  ES: function ES(str) {
    	    (0, _assertString.default)(str);
    	    var DNI = /^[0-9X-Z][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/;
    	    var charsValue = {
    	      X: 0,
    	      Y: 1,
    	      Z: 2
    	    };
    	    var controlDigits = ['T', 'R', 'W', 'A', 'G', 'M', 'Y', 'F', 'P', 'D', 'X', 'B', 'N', 'J', 'Z', 'S', 'Q', 'V', 'H', 'L', 'C', 'K', 'E']; // sanitize user input

    	    var sanitized = str.trim().toUpperCase(); // validate the data structure

    	    if (!DNI.test(sanitized)) {
    	      return false;
    	    } // validate the control digit


    	    var number = sanitized.slice(0, -1).replace(/[X,Y,Z]/g, function (char) {
    	      return charsValue[char];
    	    });
    	    return sanitized.endsWith(controlDigits[number % 23]);
    	  },
    	  FI: function FI(str) {
    	    // https://dvv.fi/en/personal-identity-code#:~:text=control%20character%20for%20a-,personal,-identity%20code%20calculated
    	    (0, _assertString.default)(str);

    	    if (str.length !== 11) {
    	      return false;
    	    }

    	    if (!str.match(/^\d{6}[\-A\+]\d{3}[0-9ABCDEFHJKLMNPRSTUVWXY]{1}$/)) {
    	      return false;
    	    }

    	    var checkDigits = '0123456789ABCDEFHJKLMNPRSTUVWXY';
    	    var idAsNumber = parseInt(str.slice(0, 6), 10) * 1000 + parseInt(str.slice(7, 10), 10);
    	    var remainder = idAsNumber % 31;
    	    var checkDigit = checkDigits[remainder];
    	    return checkDigit === str.slice(10, 11);
    	  },
    	  IN: function IN(str) {
    	    var DNI = /^[1-9]\d{3}\s?\d{4}\s?\d{4}$/; // multiplication table

    	    var d = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]]; // permutation table

    	    var p = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]]; // sanitize user input

    	    var sanitized = str.trim(); // validate the data structure

    	    if (!DNI.test(sanitized)) {
    	      return false;
    	    }

    	    var c = 0;
    	    var invertedArray = sanitized.replace(/\s/g, '').split('').map(Number).reverse();
    	    invertedArray.forEach(function (val, i) {
    	      c = d[c][p[i % 8][val]];
    	    });
    	    return c === 0;
    	  },
    	  IR: function IR(str) {
    	    if (!str.match(/^\d{10}$/)) return false;
    	    str = "0000".concat(str).substr(str.length - 6);
    	    if (parseInt(str.substr(3, 6), 10) === 0) return false;
    	    var lastNumber = parseInt(str.substr(9, 1), 10);
    	    var sum = 0;

    	    for (var i = 0; i < 9; i++) {
    	      sum += parseInt(str.substr(i, 1), 10) * (10 - i);
    	    }

    	    sum %= 11;
    	    return sum < 2 && lastNumber === sum || sum >= 2 && lastNumber === 11 - sum;
    	  },
    	  IT: function IT(str) {
    	    if (str.length !== 9) return false;
    	    if (str === 'CA00000AA') return false; // https://it.wikipedia.org/wiki/Carta_d%27identit%C3%A0_elettronica_italiana

    	    return str.search(/C[A-Z][0-9]{5}[A-Z]{2}/i) > -1;
    	  },
    	  NO: function NO(str) {
    	    var sanitized = str.trim();
    	    if (isNaN(Number(sanitized))) return false;
    	    if (sanitized.length !== 11) return false;
    	    if (sanitized === '00000000000') return false; // https://no.wikipedia.org/wiki/F%C3%B8dselsnummer

    	    var f = sanitized.split('').map(Number);
    	    var k1 = (11 - (3 * f[0] + 7 * f[1] + 6 * f[2] + 1 * f[3] + 8 * f[4] + 9 * f[5] + 4 * f[6] + 5 * f[7] + 2 * f[8]) % 11) % 11;
    	    var k2 = (11 - (5 * f[0] + 4 * f[1] + 3 * f[2] + 2 * f[3] + 7 * f[4] + 6 * f[5] + 5 * f[6] + 4 * f[7] + 3 * f[8] + 2 * k1) % 11) % 11;
    	    if (k1 !== f[9] || k2 !== f[10]) return false;
    	    return true;
    	  },
    	  TH: function TH(str) {
    	    if (!str.match(/^[1-8]\d{12}$/)) return false; // validate check digit

    	    var sum = 0;

    	    for (var i = 0; i < 12; i++) {
    	      sum += parseInt(str[i], 10) * (13 - i);
    	    }

    	    return str[12] === ((11 - sum % 11) % 10).toString();
    	  },
    	  LK: function LK(str) {
    	    var old_nic = /^[1-9]\d{8}[vx]$/i;
    	    var new_nic = /^[1-9]\d{11}$/i;
    	    if (str.length === 10 && old_nic.test(str)) return true;else if (str.length === 12 && new_nic.test(str)) return true;
    	    return false;
    	  },
    	  'he-IL': function heIL(str) {
    	    var DNI = /^\d{9}$/; // sanitize user input

    	    var sanitized = str.trim(); // validate the data structure

    	    if (!DNI.test(sanitized)) {
    	      return false;
    	    }

    	    var id = sanitized;
    	    var sum = 0,
    	        incNum;

    	    for (var i = 0; i < id.length; i++) {
    	      incNum = Number(id[i]) * (i % 2 + 1); // Multiply number by 1 or 2

    	      sum += incNum > 9 ? incNum - 9 : incNum; // Sum the digits up and add to total
    	    }

    	    return sum % 10 === 0;
    	  },
    	  'ar-LY': function arLY(str) {
    	    // Libya National Identity Number NIN is 12 digits, the first digit is either 1 or 2
    	    var NIN = /^(1|2)\d{11}$/; // sanitize user input

    	    var sanitized = str.trim(); // validate the data structure

    	    if (!NIN.test(sanitized)) {
    	      return false;
    	    }

    	    return true;
    	  },
    	  'ar-TN': function arTN(str) {
    	    var DNI = /^\d{8}$/; // sanitize user input

    	    var sanitized = str.trim(); // validate the data structure

    	    if (!DNI.test(sanitized)) {
    	      return false;
    	    }

    	    return true;
    	  },
    	  'zh-CN': function zhCN(str) {
    	    var provincesAndCities = ['11', // 北京
    	    '12', // 天津
    	    '13', // 河北
    	    '14', // 山西
    	    '15', // 内蒙古
    	    '21', // 辽宁
    	    '22', // 吉林
    	    '23', // 黑龙江
    	    '31', // 上海
    	    '32', // 江苏
    	    '33', // 浙江
    	    '34', // 安徽
    	    '35', // 福建
    	    '36', // 江西
    	    '37', // 山东
    	    '41', // 河南
    	    '42', // 湖北
    	    '43', // 湖南
    	    '44', // 广东
    	    '45', // 广西
    	    '46', // 海南
    	    '50', // 重庆
    	    '51', // 四川
    	    '52', // 贵州
    	    '53', // 云南
    	    '54', // 西藏
    	    '61', // 陕西
    	    '62', // 甘肃
    	    '63', // 青海
    	    '64', // 宁夏
    	    '65', // 新疆
    	    '71', // 台湾
    	    '81', // 香港
    	    '82', // 澳门
    	    '91' // 国外
    	    ];
    	    var powers = ['7', '9', '10', '5', '8', '4', '2', '1', '6', '3', '7', '9', '10', '5', '8', '4', '2'];
    	    var parityBit = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

    	    var checkAddressCode = function checkAddressCode(addressCode) {
    	      return provincesAndCities.includes(addressCode);
    	    };

    	    var checkBirthDayCode = function checkBirthDayCode(birDayCode) {
    	      var yyyy = parseInt(birDayCode.substring(0, 4), 10);
    	      var mm = parseInt(birDayCode.substring(4, 6), 10);
    	      var dd = parseInt(birDayCode.substring(6), 10);
    	      var xdata = new Date(yyyy, mm - 1, dd);

    	      if (xdata > new Date()) {
    	        return false; // eslint-disable-next-line max-len
    	      } else if (xdata.getFullYear() === yyyy && xdata.getMonth() === mm - 1 && xdata.getDate() === dd) {
    	        return true;
    	      }

    	      return false;
    	    };

    	    var getParityBit = function getParityBit(idCardNo) {
    	      var id17 = idCardNo.substring(0, 17);
    	      var power = 0;

    	      for (var i = 0; i < 17; i++) {
    	        power += parseInt(id17.charAt(i), 10) * parseInt(powers[i], 10);
    	      }

    	      var mod = power % 11;
    	      return parityBit[mod];
    	    };

    	    var checkParityBit = function checkParityBit(idCardNo) {
    	      return getParityBit(idCardNo) === idCardNo.charAt(17).toUpperCase();
    	    };

    	    var check15IdCardNo = function check15IdCardNo(idCardNo) {
    	      var check = /^[1-9]\d{7}((0[1-9])|(1[0-2]))((0[1-9])|([1-2][0-9])|(3[0-1]))\d{3}$/.test(idCardNo);
    	      if (!check) return false;
    	      var addressCode = idCardNo.substring(0, 2);
    	      check = checkAddressCode(addressCode);
    	      if (!check) return false;
    	      var birDayCode = "19".concat(idCardNo.substring(6, 12));
    	      check = checkBirthDayCode(birDayCode);
    	      if (!check) return false;
    	      return true;
    	    };

    	    var check18IdCardNo = function check18IdCardNo(idCardNo) {
    	      var check = /^[1-9]\d{5}[1-9]\d{3}((0[1-9])|(1[0-2]))((0[1-9])|([1-2][0-9])|(3[0-1]))\d{3}(\d|x|X)$/.test(idCardNo);
    	      if (!check) return false;
    	      var addressCode = idCardNo.substring(0, 2);
    	      check = checkAddressCode(addressCode);
    	      if (!check) return false;
    	      var birDayCode = idCardNo.substring(6, 14);
    	      check = checkBirthDayCode(birDayCode);
    	      if (!check) return false;
    	      return checkParityBit(idCardNo);
    	    };

    	    var checkIdCardNo = function checkIdCardNo(idCardNo) {
    	      var check = /^\d{15}|(\d{17}(\d|x|X))$/.test(idCardNo);
    	      if (!check) return false;

    	      if (idCardNo.length === 15) {
    	        return check15IdCardNo(idCardNo);
    	      }

    	      return check18IdCardNo(idCardNo);
    	    };

    	    return checkIdCardNo(str);
    	  },
    	  'zh-TW': function zhTW(str) {
    	    var ALPHABET_CODES = {
    	      A: 10,
    	      B: 11,
    	      C: 12,
    	      D: 13,
    	      E: 14,
    	      F: 15,
    	      G: 16,
    	      H: 17,
    	      I: 34,
    	      J: 18,
    	      K: 19,
    	      L: 20,
    	      M: 21,
    	      N: 22,
    	      O: 35,
    	      P: 23,
    	      Q: 24,
    	      R: 25,
    	      S: 26,
    	      T: 27,
    	      U: 28,
    	      V: 29,
    	      W: 32,
    	      X: 30,
    	      Y: 31,
    	      Z: 33
    	    };
    	    var sanitized = str.trim().toUpperCase();
    	    if (!/^[A-Z][0-9]{9}$/.test(sanitized)) return false;
    	    return Array.from(sanitized).reduce(function (sum, number, index) {
    	      if (index === 0) {
    	        var code = ALPHABET_CODES[number];
    	        return code % 10 * 9 + Math.floor(code / 10);
    	      }

    	      if (index === 9) {
    	        return (10 - sum % 10 - Number(number)) % 10 === 0;
    	      }

    	      return sum + Number(number) * (9 - index);
    	    }, 0);
    	  }
    	};

    	function isIdentityCard(str, locale) {
    	  (0, _assertString.default)(str);

    	  if (locale in validators) {
    	    return validators[locale](str);
    	  } else if (locale === 'any') {
    	    for (var key in validators) {
    	      // https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md#ignoring-code-for-coverage-purposes
    	      // istanbul ignore else
    	      if (validators.hasOwnProperty(key)) {
    	        var validator = validators[key];

    	        if (validator(str)) {
    	          return true;
    	        }
    	      }
    	    }

    	    return false;
    	  }

    	  throw new Error("Invalid locale '".concat(locale, "'"));
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isIdentityCard$1, isIdentityCard$1.exports));

    var isIdentityCardValidator = /*@__PURE__*/getDefaultExportFromCjs(isIdentityCard$1.exports);

    var IS_IDENTITY_CARD = 'isIdentityCard';
    /**
     * Check if the string is a valid identity card code.
     * locale is one of ['ES', 'zh-TW', 'he-IL', 'ar-TN'] OR 'any'. If 'any' is used, function will check if any of the locals match.
     * Defaults to 'any'.
     * If given value is not a string, then it returns false.
     */
    function isIdentityCard(value, locale) {
        return typeof value === 'string' && isIdentityCardValidator(value, locale);
    }
    /**
     * Check if the string is a valid identity card code.
     * locale is one of ['ES', 'zh-TW', 'he-IL', 'ar-TN'] OR 'any'. If 'any' is used, function will check if any of the locals match.
     * Defaults to 'any'.
     * If given value is not a string, then it returns false.
     */
    function IsIdentityCard(locale, validationOptions) {
        return ValidateBy({
            name: IS_IDENTITY_CARD,
            constraints: [locale],
            validator: {
                validate: function (value, args) { return isIdentityCard(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a identity card number'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isISRC$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isISRC;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	// see http://isrc.ifpi.org/en/isrc-standard/code-syntax
    	var isrc = /^[A-Z]{2}[0-9A-Z]{3}\d{2}\d{5}$/;

    	function isISRC(str) {
    	  (0, _assertString.default)(str);
    	  return isrc.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isISRC$1, isISRC$1.exports));

    var isISRCValidator = /*@__PURE__*/getDefaultExportFromCjs(isISRC$1.exports);

    var IS_ISRC = 'isISRC';
    /**
     * Check if the string is a ISRC.
     * If given value is not a string, then it returns false.
     */
    function isISRC(value) {
        return typeof value === 'string' && isISRCValidator(value);
    }
    /**
     * Check if the string is a ISRC.
     * If given value is not a string, then it returns false.
     */
    function IsISRC(validationOptions) {
        return ValidateBy({
            name: IS_ISRC,
            validator: {
                validate: function (value, args) { return isISRC(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an ISRC'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isLocale$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isLocale;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var localeReg = /^[A-Za-z]{2,4}([_-]([A-Za-z]{4}|[\d]{3}))?([_-]([A-Za-z]{2}|[\d]{3}))?$/;

    	function isLocale(str) {
    	  (0, _assertString.default)(str);

    	  if (str === 'en_US_POSIX' || str === 'ca_ES_VALENCIA') {
    	    return true;
    	  }

    	  return localeReg.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isLocale$1, isLocale$1.exports));

    var isLocaleValidator = /*@__PURE__*/getDefaultExportFromCjs(isLocale$1.exports);

    var IS_LOCALE = 'isLocale';
    /**
     * Check if the string is a locale.
     * If given value is not a string, then it returns false.
     */
    function isLocale(value) {
        return typeof value === 'string' && isLocaleValidator(value);
    }
    /**
     * Check if the string is a locale.
     * If given value is not a string, then it returns false.
     */
    function IsLocale(validationOptions) {
        return ValidateBy({
            name: IS_LOCALE,
            validator: {
                validate: function (value, args) { return isLocale(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be locale'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isMagnetURI$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isMagnetURI;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var magnetURI = /^magnet:\?xt(?:\.1)?=urn:(?:aich|bitprint|btih|ed2k|ed2khash|kzhash|md5|sha1|tree:tiger):[a-z0-9]{32}(?:[a-z0-9]{8})?($|&)/i;

    	function isMagnetURI(url) {
    	  (0, _assertString.default)(url);
    	  return magnetURI.test(url.trim());
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isMagnetURI$1, isMagnetURI$1.exports));

    var isMagnetURIValidator = /*@__PURE__*/getDefaultExportFromCjs(isMagnetURI$1.exports);

    var IS_MAGNET_URI = 'isMagnetURI';
    /**
     * Check if the string is a magnet uri format.
     * If given value is not a string, then it returns false.
     */
    function isMagnetURI(value) {
        return typeof value === 'string' && isMagnetURIValidator(value);
    }
    /**
     * Check if the string is a magnet uri format.
     * If given value is not a string, then it returns false.
     */
    function IsMagnetURI(validationOptions) {
        return ValidateBy({
            name: IS_MAGNET_URI,
            validator: {
                validate: function (value, args) { return isMagnetURI(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be magnet uri format'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isMimeType$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isMimeType;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	/*
    	  Checks if the provided string matches to a correct Media type format (MIME type)

    	  This function only checks is the string format follows the
    	  etablished rules by the according RFC specifications.
    	  This function supports 'charset' in textual media types
    	  (https://tools.ietf.org/html/rfc6657).

    	  This function does not check against all the media types listed
    	  by the IANA (https://www.iana.org/assignments/media-types/media-types.xhtml)
    	  because of lightness purposes : it would require to include
    	  all these MIME types in this librairy, which would weigh it
    	  significantly. This kind of effort maybe is not worth for the use that
    	  this function has in this entire librairy.

    	  More informations in the RFC specifications :
    	  - https://tools.ietf.org/html/rfc2045
    	  - https://tools.ietf.org/html/rfc2046
    	  - https://tools.ietf.org/html/rfc7231#section-3.1.1.1
    	  - https://tools.ietf.org/html/rfc7231#section-3.1.1.5
    	*/
    	// Match simple MIME types
    	// NB :
    	//   Subtype length must not exceed 100 characters.
    	//   This rule does not comply to the RFC specs (what is the max length ?).
    	var mimeTypeSimple = /^(application|audio|font|image|message|model|multipart|text|video)\/[a-zA-Z0-9\.\-\+]{1,100}$/i; // eslint-disable-line max-len
    	// Handle "charset" in "text/*"

    	var mimeTypeText = /^text\/[a-zA-Z0-9\.\-\+]{1,100};\s?charset=("[a-zA-Z0-9\.\-\+\s]{0,70}"|[a-zA-Z0-9\.\-\+]{0,70})(\s?\([a-zA-Z0-9\.\-\+\s]{1,20}\))?$/i; // eslint-disable-line max-len
    	// Handle "boundary" in "multipart/*"

    	var mimeTypeMultipart = /^multipart\/[a-zA-Z0-9\.\-\+]{1,100}(;\s?(boundary|charset)=("[a-zA-Z0-9\.\-\+\s]{0,70}"|[a-zA-Z0-9\.\-\+]{0,70})(\s?\([a-zA-Z0-9\.\-\+\s]{1,20}\))?){0,2}$/i; // eslint-disable-line max-len

    	function isMimeType(str) {
    	  (0, _assertString.default)(str);
    	  return mimeTypeSimple.test(str) || mimeTypeText.test(str) || mimeTypeMultipart.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isMimeType$1, isMimeType$1.exports));

    var isMimeTypeValidator = /*@__PURE__*/getDefaultExportFromCjs(isMimeType$1.exports);

    var IS_MIME_TYPE = 'isMimeType';
    /**
     * Check if the string matches to a valid MIME type format
     * If given value is not a string, then it returns false.
     */
    function isMimeType(value) {
        return typeof value === 'string' && isMimeTypeValidator(value);
    }
    /**
     * Check if the string matches to a valid MIME type format
     * If given value is not a string, then it returns false.
     */
    function IsMimeType(validationOptions) {
        return ValidateBy({
            name: IS_MIME_TYPE,
            validator: {
                validate: function (value, args) { return isMimeType(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be MIME type format'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isOctal$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isOctal;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var octal = /^(0o)?[0-7]+$/i;

    	function isOctal(str) {
    	  (0, _assertString.default)(str);
    	  return octal.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isOctal$1, isOctal$1.exports));

    var isOctalValidator = /*@__PURE__*/getDefaultExportFromCjs(isOctal$1.exports);

    var IS_OCTAL = 'isOctal';
    /**
     * Check if the string is a valid octal number.
     * If given value is not a string, then it returns false.
     */
    function isOctal(value) {
        return typeof value === 'string' && isOctalValidator(value);
    }
    /**
     * Check if the string is a valid octal number.
     * If given value is not a string, then it returns false.
     */
    function IsOctal(validationOptions) {
        return ValidateBy({
            name: IS_OCTAL,
            validator: {
                validate: function (value, args) { return isOctal(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be valid octal number'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isPassportNumber$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isPassportNumber;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	/**
    	 * Reference:
    	 * https://en.wikipedia.org/ -- Wikipedia
    	 * https://docs.microsoft.com/en-us/microsoft-365/compliance/eu-passport-number -- EU Passport Number
    	 * https://countrycode.org/ -- Country Codes
    	 */
    	var passportRegexByCountryCode = {
    	  AM: /^[A-Z]{2}\d{7}$/,
    	  // ARMENIA
    	  AR: /^[A-Z]{3}\d{6}$/,
    	  // ARGENTINA
    	  AT: /^[A-Z]\d{7}$/,
    	  // AUSTRIA
    	  AU: /^[A-Z]\d{7}$/,
    	  // AUSTRALIA
    	  BE: /^[A-Z]{2}\d{6}$/,
    	  // BELGIUM
    	  BG: /^\d{9}$/,
    	  // BULGARIA
    	  BR: /^[A-Z]{2}\d{6}$/,
    	  // BRAZIL
    	  BY: /^[A-Z]{2}\d{7}$/,
    	  // BELARUS
    	  CA: /^[A-Z]{2}\d{6}$/,
    	  // CANADA
    	  CH: /^[A-Z]\d{7}$/,
    	  // SWITZERLAND
    	  CN: /^G\d{8}$|^E(?![IO])[A-Z0-9]\d{7}$/,
    	  // CHINA [G=Ordinary, E=Electronic] followed by 8-digits, or E followed by any UPPERCASE letter (except I and O) followed by 7 digits
    	  CY: /^[A-Z](\d{6}|\d{8})$/,
    	  // CYPRUS
    	  CZ: /^\d{8}$/,
    	  // CZECH REPUBLIC
    	  DE: /^[CFGHJKLMNPRTVWXYZ0-9]{9}$/,
    	  // GERMANY
    	  DK: /^\d{9}$/,
    	  // DENMARK
    	  DZ: /^\d{9}$/,
    	  // ALGERIA
    	  EE: /^([A-Z]\d{7}|[A-Z]{2}\d{7})$/,
    	  // ESTONIA (K followed by 7-digits), e-passports have 2 UPPERCASE followed by 7 digits
    	  ES: /^[A-Z0-9]{2}([A-Z0-9]?)\d{6}$/,
    	  // SPAIN
    	  FI: /^[A-Z]{2}\d{7}$/,
    	  // FINLAND
    	  FR: /^\d{2}[A-Z]{2}\d{5}$/,
    	  // FRANCE
    	  GB: /^\d{9}$/,
    	  // UNITED KINGDOM
    	  GR: /^[A-Z]{2}\d{7}$/,
    	  // GREECE
    	  HR: /^\d{9}$/,
    	  // CROATIA
    	  HU: /^[A-Z]{2}(\d{6}|\d{7})$/,
    	  // HUNGARY
    	  IE: /^[A-Z0-9]{2}\d{7}$/,
    	  // IRELAND
    	  IN: /^[A-Z]{1}-?\d{7}$/,
    	  // INDIA
    	  ID: /^[A-C]\d{7}$/,
    	  // INDONESIA
    	  IR: /^[A-Z]\d{8}$/,
    	  // IRAN
    	  IS: /^(A)\d{7}$/,
    	  // ICELAND
    	  IT: /^[A-Z0-9]{2}\d{7}$/,
    	  // ITALY
    	  JP: /^[A-Z]{2}\d{7}$/,
    	  // JAPAN
    	  KR: /^[MS]\d{8}$/,
    	  // SOUTH KOREA, REPUBLIC OF KOREA, [S=PS Passports, M=PM Passports]
    	  LT: /^[A-Z0-9]{8}$/,
    	  // LITHUANIA
    	  LU: /^[A-Z0-9]{8}$/,
    	  // LUXEMBURG
    	  LV: /^[A-Z0-9]{2}\d{7}$/,
    	  // LATVIA
    	  LY: /^[A-Z0-9]{8}$/,
    	  // LIBYA
    	  MT: /^\d{7}$/,
    	  // MALTA
    	  MZ: /^([A-Z]{2}\d{7})|(\d{2}[A-Z]{2}\d{5})$/,
    	  // MOZAMBIQUE
    	  MY: /^[AHK]\d{8}$/,
    	  // MALAYSIA
    	  NL: /^[A-Z]{2}[A-Z0-9]{6}\d$/,
    	  // NETHERLANDS
    	  PL: /^[A-Z]{2}\d{7}$/,
    	  // POLAND
    	  PT: /^[A-Z]\d{6}$/,
    	  // PORTUGAL
    	  RO: /^\d{8,9}$/,
    	  // ROMANIA
    	  RU: /^\d{9}$/,
    	  // RUSSIAN FEDERATION
    	  SE: /^\d{8}$/,
    	  // SWEDEN
    	  SL: /^(P)[A-Z]\d{7}$/,
    	  // SLOVANIA
    	  SK: /^[0-9A-Z]\d{7}$/,
    	  // SLOVAKIA
    	  TR: /^[A-Z]\d{8}$/,
    	  // TURKEY
    	  UA: /^[A-Z]{2}\d{6}$/,
    	  // UKRAINE
    	  US: /^\d{9}$/ // UNITED STATES

    	};
    	/**
    	 * Check if str is a valid passport number
    	 * relative to provided ISO Country Code.
    	 *
    	 * @param {string} str
    	 * @param {string} countryCode
    	 * @return {boolean}
    	 */

    	function isPassportNumber(str, countryCode) {
    	  (0, _assertString.default)(str);
    	  /** Remove All Whitespaces, Convert to UPPERCASE */

    	  var normalizedStr = str.replace(/\s/g, '').toUpperCase();
    	  return countryCode.toUpperCase() in passportRegexByCountryCode && passportRegexByCountryCode[countryCode].test(normalizedStr);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isPassportNumber$1, isPassportNumber$1.exports));

    var isPassportNumberValidator = /*@__PURE__*/getDefaultExportFromCjs(isPassportNumber$1.exports);

    var IS_PASSPORT_NUMBER = 'isPassportNumber';
    /**
     * Check if the string is a valid passport number relative to a specific country code.
     * If given value is not a string, then it returns false.
     */
    function isPassportNumber(value, countryCode) {
        return typeof value === 'string' && isPassportNumberValidator(value, countryCode);
    }
    /**
     * Check if the string is a valid passport number relative to a specific country code.
     * If given value is not a string, then it returns false.
     */
    function IsPassportNumber(countryCode, validationOptions) {
        return ValidateBy({
            name: IS_PASSPORT_NUMBER,
            constraints: [countryCode],
            validator: {
                validate: function (value, args) { return isPassportNumber(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be valid passport number'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isPostalCode$2 = {};

    Object.defineProperty(isPostalCode$2, "__esModule", {
      value: true
    });
    var _default$1 = isPostalCode$2.default = isPostalCode$1;
    isPostalCode$2.locales = void 0;

    var _assertString$2 = _interopRequireDefault$2(assertString.exports);

    function _interopRequireDefault$2(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    // common patterns
    var threeDigit = /^\d{3}$/;
    var fourDigit = /^\d{4}$/;
    var fiveDigit = /^\d{5}$/;
    var sixDigit = /^\d{6}$/;
    var patterns = {
      AD: /^AD\d{3}$/,
      AT: fourDigit,
      AU: fourDigit,
      AZ: /^AZ\d{4}$/,
      BE: fourDigit,
      BG: fourDigit,
      BR: /^\d{5}-\d{3}$/,
      BY: /2[1-4]{1}\d{4}$/,
      CA: /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][\s\-]?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
      CH: fourDigit,
      CN: /^(0[1-7]|1[012356]|2[0-7]|3[0-6]|4[0-7]|5[1-7]|6[1-7]|7[1-5]|8[1345]|9[09])\d{4}$/,
      CZ: /^\d{3}\s?\d{2}$/,
      DE: fiveDigit,
      DK: fourDigit,
      DO: fiveDigit,
      DZ: fiveDigit,
      EE: fiveDigit,
      ES: /^(5[0-2]{1}|[0-4]{1}\d{1})\d{3}$/,
      FI: fiveDigit,
      FR: /^\d{2}\s?\d{3}$/,
      GB: /^(gir\s?0aa|[a-z]{1,2}\d[\da-z]?\s?(\d[a-z]{2})?)$/i,
      GR: /^\d{3}\s?\d{2}$/,
      HR: /^([1-5]\d{4}$)/,
      HT: /^HT\d{4}$/,
      HU: fourDigit,
      ID: fiveDigit,
      IE: /^(?!.*(?:o))[A-Za-z]\d[\dw]\s\w{4}$/i,
      IL: /^(\d{5}|\d{7})$/,
      IN: /^((?!10|29|35|54|55|65|66|86|87|88|89)[1-9][0-9]{5})$/,
      IR: /\b(?!(\d)\1{3})[13-9]{4}[1346-9][013-9]{5}\b/,
      IS: threeDigit,
      IT: fiveDigit,
      JP: /^\d{3}\-\d{4}$/,
      KE: fiveDigit,
      KR: /^(\d{5}|\d{6})$/,
      LI: /^(948[5-9]|949[0-7])$/,
      LT: /^LT\-\d{5}$/,
      LU: fourDigit,
      LV: /^LV\-\d{4}$/,
      LK: fiveDigit,
      MX: fiveDigit,
      MT: /^[A-Za-z]{3}\s{0,1}\d{4}$/,
      MY: fiveDigit,
      NL: /^\d{4}\s?[a-z]{2}$/i,
      NO: fourDigit,
      NP: /^(10|21|22|32|33|34|44|45|56|57)\d{3}$|^(977)$/i,
      NZ: fourDigit,
      PL: /^\d{2}\-\d{3}$/,
      PR: /^00[679]\d{2}([ -]\d{4})?$/,
      PT: /^\d{4}\-\d{3}?$/,
      RO: sixDigit,
      RU: sixDigit,
      SA: fiveDigit,
      SE: /^[1-9]\d{2}\s?\d{2}$/,
      SG: sixDigit,
      SI: fourDigit,
      SK: /^\d{3}\s?\d{2}$/,
      TH: fiveDigit,
      TN: fourDigit,
      TW: /^\d{3}(\d{2})?$/,
      UA: fiveDigit,
      US: /^\d{5}(-\d{4})?$/,
      ZA: fourDigit,
      ZM: fiveDigit
    };
    var locales = Object.keys(patterns);
    isPostalCode$2.locales = locales;

    function isPostalCode$1(str, locale) {
      (0, _assertString$2.default)(str);

      if (locale in patterns) {
        return patterns[locale].test(str);
      } else if (locale === 'any') {
        for (var key in patterns) {
          // https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md#ignoring-code-for-coverage-purposes
          // istanbul ignore else
          if (patterns.hasOwnProperty(key)) {
            var pattern = patterns[key];

            if (pattern.test(str)) {
              return true;
            }
          }
        }

        return false;
      }

      throw new Error("Invalid locale '".concat(locale, "'"));
    }

    var IS_POSTAL_CODE = 'isPostalCode';
    /**
     * Check if the string is a postal code, in the specified locale.
     * If given value is not a string, then it returns false.
     */
    function isPostalCode(value, locale) {
        return typeof value === 'string' && _default$1(value, locale);
    }
    /**
     * Check if the string is a postal code, in the specified locale.
     * If given value is not a string, then it returns false.
     */
    function IsPostalCode(locale, validationOptions) {
        return ValidateBy({
            name: IS_POSTAL_CODE,
            constraints: [locale],
            validator: {
                validate: function (value, args) { return isPostalCode(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a postal code'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isRFC3339$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isRFC3339;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	/* Based on https://tools.ietf.org/html/rfc3339#section-5.6 */
    	var dateFullYear = /[0-9]{4}/;
    	var dateMonth = /(0[1-9]|1[0-2])/;
    	var dateMDay = /([12]\d|0[1-9]|3[01])/;
    	var timeHour = /([01][0-9]|2[0-3])/;
    	var timeMinute = /[0-5][0-9]/;
    	var timeSecond = /([0-5][0-9]|60)/;
    	var timeSecFrac = /(\.[0-9]+)?/;
    	var timeNumOffset = new RegExp("[-+]".concat(timeHour.source, ":").concat(timeMinute.source));
    	var timeOffset = new RegExp("([zZ]|".concat(timeNumOffset.source, ")"));
    	var partialTime = new RegExp("".concat(timeHour.source, ":").concat(timeMinute.source, ":").concat(timeSecond.source).concat(timeSecFrac.source));
    	var fullDate = new RegExp("".concat(dateFullYear.source, "-").concat(dateMonth.source, "-").concat(dateMDay.source));
    	var fullTime = new RegExp("".concat(partialTime.source).concat(timeOffset.source));
    	var rfc3339 = new RegExp("^".concat(fullDate.source, "[ tT]").concat(fullTime.source, "$"));

    	function isRFC3339(str) {
    	  (0, _assertString.default)(str);
    	  return rfc3339.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isRFC3339$1, isRFC3339$1.exports));

    var isRFC3339Validator = /*@__PURE__*/getDefaultExportFromCjs(isRFC3339$1.exports);

    var IS_RFC_3339 = 'isRFC3339';
    /**
     * Check if the string is a valid RFC 3339 date.
     * If given value is not a string, then it returns false.
     */
    function isRFC3339(value) {
        return typeof value === 'string' && isRFC3339Validator(value);
    }
    /**
     * Check if the string is a valid RFC 3339 date.
     * If given value is not a string, then it returns false.
     */
    function IsRFC3339(validationOptions) {
        return ValidateBy({
            name: IS_RFC_3339,
            validator: {
                validate: function (value, args) { return isRFC3339(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be RFC 3339 date'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isRgbColor$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isRgbColor;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var rgbColor = /^rgb\((([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5]),){2}([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\)$/;
    	var rgbaColor = /^rgba\((([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5]),){3}(0?\.\d|1(\.0)?|0(\.0)?)\)$/;
    	var rgbColorPercent = /^rgb\((([0-9]%|[1-9][0-9]%|100%),){2}([0-9]%|[1-9][0-9]%|100%)\)/;
    	var rgbaColorPercent = /^rgba\((([0-9]%|[1-9][0-9]%|100%),){3}(0?\.\d|1(\.0)?|0(\.0)?)\)/;

    	function isRgbColor(str) {
    	  var includePercentValues = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    	  (0, _assertString.default)(str);

    	  if (!includePercentValues) {
    	    return rgbColor.test(str) || rgbaColor.test(str);
    	  }

    	  return rgbColor.test(str) || rgbaColor.test(str) || rgbColorPercent.test(str) || rgbaColorPercent.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isRgbColor$1, isRgbColor$1.exports));

    var isRgbColorValidator = /*@__PURE__*/getDefaultExportFromCjs(isRgbColor$1.exports);

    var IS_RGB_COLOR = 'isRgbColor';
    /**
     * Check if the string is a rgb or rgba color.
     * `includePercentValues` defaults to true. If you don't want to allow to set rgb or rgba values with percents, like rgb(5%,5%,5%), or rgba(90%,90%,90%,.3), then set it to false.
     * If given value is not a string, then it returns false.
     */
    function isRgbColor(value, includePercentValues) {
        return typeof value === 'string' && isRgbColorValidator(value, includePercentValues);
    }
    /**
     * Check if the string is a rgb or rgba color.
     * `includePercentValues` defaults to true. If you don't want to allow to set rgb or rgba values with percents, like rgb(5%,5%,5%), or rgba(90%,90%,90%,.3), then set it to false.
     * If given value is not a string, then it returns false.
     */
    function IsRgbColor(includePercentValues, validationOptions) {
        return ValidateBy({
            name: IS_RGB_COLOR,
            constraints: [includePercentValues],
            validator: {
                validate: function (value, args) { return isRgbColor(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be RGB color'; }, validationOptions),
            },
        }, validationOptions);
    }

    var isSemVer$1 = {exports: {}};

    var multilineRegex = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = multilineRegexp;

    	/**
    	 * Build RegExp object from an array
    	 * of multiple/multi-line regexp parts
    	 *
    	 * @param {string[]} parts
    	 * @param {string} flags
    	 * @return {object} - RegExp object
    	 */
    	function multilineRegexp(parts, flags) {
    	  var regexpAsStringLiteral = parts.join('');
    	  return new RegExp(regexpAsStringLiteral, flags);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (multilineRegex, multilineRegex.exports));

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isSemVer;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _multilineRegex = _interopRequireDefault(multilineRegex.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	/**
    	 * Regular Expression to match
    	 * semantic versioning (SemVer)
    	 * built from multi-line, multi-parts regexp
    	 * Reference: https://semver.org/
    	 */
    	var semanticVersioningRegex = (0, _multilineRegex.default)(['^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)', '(?:-((?:0|[1-9]\\d*|\\d*[a-z-][0-9a-z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-z-][0-9a-z-]*))*))', '?(?:\\+([0-9a-z-]+(?:\\.[0-9a-z-]+)*))?$'], 'i');

    	function isSemVer(str) {
    	  (0, _assertString.default)(str);
    	  return semanticVersioningRegex.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isSemVer$1, isSemVer$1.exports));

    var isSemVerValidator = /*@__PURE__*/getDefaultExportFromCjs(isSemVer$1.exports);

    var IS_SEM_VER = 'isSemVer';
    /**
     * Check if the string is a Semantic Versioning Specification (SemVer).
     * If given value is not a string, then it returns false.
     */
    function isSemVer(value) {
        return typeof value === 'string' && isSemVerValidator(value);
    }
    /**
     * Check if the string is a Semantic Versioning Specification (SemVer).
     * If given value is not a string, then it returns false.
     */
    function IsSemVer(validationOptions) {
        return ValidateBy({
            name: IS_SEM_VER,
            validator: {
                validate: function (value, args) { return isSemVer(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a Semantic Versioning Specification'; }, validationOptions),
            },
        }, validationOptions);
    }

    var validator$1 = {exports: {}};

    var toDate = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = toDate;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function toDate(date) {
    	  (0, _assertString.default)(date);
    	  date = Date.parse(date);
    	  return !isNaN(date) ? new Date(date) : null;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (toDate, toDate.exports));

    var toInt = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = toInt;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function toInt(str, radix) {
    	  (0, _assertString.default)(str);
    	  return parseInt(str, radix || 10);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (toInt, toInt.exports));

    var toBoolean = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = toBoolean;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function toBoolean(str, strict) {
    	  (0, _assertString.default)(str);

    	  if (strict) {
    	    return str === '1' || /^true$/i.test(str);
    	  }

    	  return str !== '0' && !/^false$/i.test(str) && str !== '';
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (toBoolean, toBoolean.exports));

    var equals = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = equals;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function equals(str, comparison) {
    	  (0, _assertString.default)(str);
    	  return str === comparison;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (equals, equals.exports));

    var isIPRange = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isIPRange;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _isIP = _interopRequireDefault(isIP$1.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var subnetMaybe = /^\d{1,3}$/;
    	var v4Subnet = 32;
    	var v6Subnet = 128;

    	function isIPRange(str) {
    	  var version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    	  (0, _assertString.default)(str);
    	  var parts = str.split('/'); // parts[0] -> ip, parts[1] -> subnet

    	  if (parts.length !== 2) {
    	    return false;
    	  }

    	  if (!subnetMaybe.test(parts[1])) {
    	    return false;
    	  } // Disallow preceding 0 i.e. 01, 02, ...


    	  if (parts[1].length > 1 && parts[1].startsWith('0')) {
    	    return false;
    	  }

    	  var isValidIP = (0, _isIP.default)(parts[0], version);

    	  if (!isValidIP) {
    	    return false;
    	  } // Define valid subnet according to IP's version


    	  var expectedSubnet = null;

    	  switch (String(version)) {
    	    case '4':
    	      expectedSubnet = v4Subnet;
    	      break;

    	    case '6':
    	      expectedSubnet = v6Subnet;
    	      break;

    	    default:
    	      expectedSubnet = (0, _isIP.default)(parts[0], '6') ? v6Subnet : v4Subnet;
    	  }

    	  return parts[1] <= expectedSubnet && parts[1] >= 0;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isIPRange, isIPRange.exports));

    var isDate$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isDate;

    	var _merge = _interopRequireDefault(merge.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

    	function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    	function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

    	function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

    	function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

    	function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

    	function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    	var default_date_options = {
    	  format: 'YYYY/MM/DD',
    	  delimiters: ['/', '-'],
    	  strictMode: false
    	};

    	function isValidFormat(format) {
    	  return /(^(y{4}|y{2})[.\/-](m{1,2})[.\/-](d{1,2})$)|(^(m{1,2})[.\/-](d{1,2})[.\/-]((y{4}|y{2})$))|(^(d{1,2})[.\/-](m{1,2})[.\/-]((y{4}|y{2})$))/gi.test(format);
    	}

    	function zip(date, format) {
    	  var zippedArr = [],
    	      len = Math.min(date.length, format.length);

    	  for (var i = 0; i < len; i++) {
    	    zippedArr.push([date[i], format[i]]);
    	  }

    	  return zippedArr;
    	}

    	function isDate(input, options) {
    	  if (typeof options === 'string') {
    	    // Allow backward compatbility for old format isDate(input [, format])
    	    options = (0, _merge.default)({
    	      format: options
    	    }, default_date_options);
    	  } else {
    	    options = (0, _merge.default)(options, default_date_options);
    	  }

    	  if (typeof input === 'string' && isValidFormat(options.format)) {
    	    var formatDelimiter = options.delimiters.find(function (delimiter) {
    	      return options.format.indexOf(delimiter) !== -1;
    	    });
    	    var dateDelimiter = options.strictMode ? formatDelimiter : options.delimiters.find(function (delimiter) {
    	      return input.indexOf(delimiter) !== -1;
    	    });
    	    var dateAndFormat = zip(input.split(dateDelimiter), options.format.toLowerCase().split(formatDelimiter));
    	    var dateObj = {};

    	    var _iterator = _createForOfIteratorHelper(dateAndFormat),
    	        _step;

    	    try {
    	      for (_iterator.s(); !(_step = _iterator.n()).done;) {
    	        var _step$value = _slicedToArray(_step.value, 2),
    	            dateWord = _step$value[0],
    	            formatWord = _step$value[1];

    	        if (dateWord.length !== formatWord.length) {
    	          return false;
    	        }

    	        dateObj[formatWord.charAt(0)] = dateWord;
    	      }
    	    } catch (err) {
    	      _iterator.e(err);
    	    } finally {
    	      _iterator.f();
    	    }

    	    return new Date("".concat(dateObj.m, "/").concat(dateObj.d, "/").concat(dateObj.y)).getDate() === +dateObj.d;
    	  }

    	  if (!options.strictMode) {
    	    return Object.prototype.toString.call(input) === '[object Date]' && isFinite(input);
    	  }

    	  return false;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isDate$1, isDate$1.exports));

    var isIMEI = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isIMEI;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var imeiRegexWithoutHypens = /^[0-9]{15}$/;
    	var imeiRegexWithHypens = /^\d{2}-\d{6}-\d{6}-\d{1}$/;

    	function isIMEI(str, options) {
    	  (0, _assertString.default)(str);
    	  options = options || {}; // default regex for checking imei is the one without hyphens

    	  var imeiRegex = imeiRegexWithoutHypens;

    	  if (options.allow_hyphens) {
    	    imeiRegex = imeiRegexWithHypens;
    	  }

    	  if (!imeiRegex.test(str)) {
    	    return false;
    	  }

    	  str = str.replace(/-/g, '');
    	  var sum = 0,
    	      mul = 2,
    	      l = 14;

    	  for (var i = 0; i < l; i++) {
    	    var digit = str.substring(l - i - 1, l - i);
    	    var tp = parseInt(digit, 10) * mul;

    	    if (tp >= 10) {
    	      sum += tp % 10 + 1;
    	    } else {
    	      sum += tp;
    	    }

    	    if (mul === 1) {
    	      mul += 1;
    	    } else {
    	      mul -= 1;
    	    }
    	  }

    	  var chk = (10 - sum % 10) % 10;

    	  if (chk !== parseInt(str.substring(14, 15), 10)) {
    	    return false;
    	  }

    	  return true;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isIMEI, isIMEI.exports));

    var isMD5 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isMD5;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var md5 = /^[a-f0-9]{32}$/;

    	function isMD5(str) {
    	  (0, _assertString.default)(str);
    	  return md5.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isMD5, isMD5.exports));

    var isEmpty = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isEmpty;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _merge = _interopRequireDefault(merge.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var default_is_empty_options = {
    	  ignore_whitespace: false
    	};

    	function isEmpty(str, options) {
    	  (0, _assertString.default)(str);
    	  options = (0, _merge.default)(options, default_is_empty_options);
    	  return (options.ignore_whitespace ? str.trim().length : str.length) === 0;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isEmpty, isEmpty.exports));

    var isAfter = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isAfter;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _toDate = _interopRequireDefault(toDate.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function isAfter(str) {
    	  var date = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : String(new Date());
    	  (0, _assertString.default)(str);
    	  var comparison = (0, _toDate.default)(date);
    	  var original = (0, _toDate.default)(str);
    	  return !!(original && comparison && original > comparison);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isAfter, isAfter.exports));

    var isBefore = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isBefore;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _toDate = _interopRequireDefault(toDate.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function isBefore(str) {
    	  var date = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : String(new Date());
    	  (0, _assertString.default)(str);
    	  var comparison = (0, _toDate.default)(date);
    	  var original = (0, _toDate.default)(str);
    	  return !!(original && comparison && original < comparison);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isBefore, isBefore.exports));

    var isIn = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isIn;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _toString = _interopRequireDefault(toString$1.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    	function isIn(str, options) {
    	  (0, _assertString.default)(str);
    	  var i;

    	  if (Object.prototype.toString.call(options) === '[object Array]') {
    	    var array = [];

    	    for (i in options) {
    	      // https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md#ignoring-code-for-coverage-purposes
    	      // istanbul ignore else
    	      if ({}.hasOwnProperty.call(options, i)) {
    	        array[i] = (0, _toString.default)(options[i]);
    	      }
    	    }

    	    return array.indexOf(str) >= 0;
    	  } else if (_typeof(options) === 'object') {
    	    return options.hasOwnProperty(str);
    	  } else if (options && typeof options.indexOf === 'function') {
    	    return options.indexOf(str) >= 0;
    	  }

    	  return false;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isIn, isIn.exports));

    var isTaxID = {exports: {}};

    var algorithms = {};

    Object.defineProperty(algorithms, "__esModule", {
      value: true
    });
    algorithms.iso7064Check = iso7064Check;
    algorithms.luhnCheck = luhnCheck;
    algorithms.reverseMultiplyAndSum = reverseMultiplyAndSum;
    algorithms.verhoeffCheck = verhoeffCheck;

    /**
     * Algorithmic validation functions
     * May be used as is or implemented in the workflow of other validators.
     */

    /*
     * ISO 7064 validation function
     * Called with a string of numbers (incl. check digit)
     * to validate according to ISO 7064 (MOD 11, 10).
     */
    function iso7064Check(str) {
      var checkvalue = 10;

      for (var i = 0; i < str.length - 1; i++) {
        checkvalue = (parseInt(str[i], 10) + checkvalue) % 10 === 0 ? 10 * 2 % 11 : (parseInt(str[i], 10) + checkvalue) % 10 * 2 % 11;
      }

      checkvalue = checkvalue === 1 ? 0 : 11 - checkvalue;
      return checkvalue === parseInt(str[10], 10);
    }
    /*
     * Luhn (mod 10) validation function
     * Called with a string of numbers (incl. check digit)
     * to validate according to the Luhn algorithm.
     */


    function luhnCheck(str) {
      var checksum = 0;
      var second = false;

      for (var i = str.length - 1; i >= 0; i--) {
        if (second) {
          var product = parseInt(str[i], 10) * 2;

          if (product > 9) {
            // sum digits of product and add to checksum
            checksum += product.toString().split('').map(function (a) {
              return parseInt(a, 10);
            }).reduce(function (a, b) {
              return a + b;
            }, 0);
          } else {
            checksum += product;
          }
        } else {
          checksum += parseInt(str[i], 10);
        }

        second = !second;
      }

      return checksum % 10 === 0;
    }
    /*
     * Reverse TIN multiplication and summation helper function
     * Called with an array of single-digit integers and a base multiplier
     * to calculate the sum of the digits multiplied in reverse.
     * Normally used in variations of MOD 11 algorithmic checks.
     */


    function reverseMultiplyAndSum(digits, base) {
      var total = 0;

      for (var i = 0; i < digits.length; i++) {
        total += digits[i] * (base - i);
      }

      return total;
    }
    /*
     * Verhoeff validation helper function
     * Called with a string of numbers
     * to validate according to the Verhoeff algorithm.
     */


    function verhoeffCheck(str) {
      var d_table = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]];
      var p_table = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]]; // Copy (to prevent replacement) and reverse

      var str_copy = str.split('').reverse().join('');
      var checksum = 0;

      for (var i = 0; i < str_copy.length; i++) {
        checksum = d_table[checksum][p_table[i % 8][parseInt(str_copy[i], 10)]];
      }

      return checksum === 0;
    }

    (function (module, exports) {

    	function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isTaxID;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var algorithms$1 = _interopRequireWildcard(algorithms);

    	var _isDate = _interopRequireDefault(isDate$1.exports);

    	function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

    	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

    	function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    	function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

    	function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

    	function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

    	function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    	/**
    	 * TIN Validation
    	 * Validates Tax Identification Numbers (TINs) from the US, EU member states and the United Kingdom.
    	 *
    	 * EU-UK:
    	 * National TIN validity is calculated using public algorithms as made available by DG TAXUD.
    	 *
    	 * See `https://ec.europa.eu/taxation_customs/tin/specs/FS-TIN%20Algorithms-Public.docx` for more information.
    	 *
    	 * US:
    	 * An Employer Identification Number (EIN), also known as a Federal Tax Identification Number,
    	 *  is used to identify a business entity.
    	 *
    	 * NOTES:
    	 *  - Prefix 47 is being reserved for future use
    	 *  - Prefixes 26, 27, 45, 46 and 47 were previously assigned by the Philadelphia campus.
    	 *
    	 * See `http://www.irs.gov/Businesses/Small-Businesses-&-Self-Employed/How-EINs-are-Assigned-and-Valid-EIN-Prefixes`
    	 * for more information.
    	 */
    	// Locale functions

    	/*
    	 * bg-BG validation function
    	 * (Edinen graždanski nomer (EGN/ЕГН), persons only)
    	 * Checks if birth date (first six digits) is valid and calculates check (last) digit
    	 */
    	function bgBgCheck(tin) {
    	  // Extract full year, normalize month and check birth date validity
    	  var century_year = tin.slice(0, 2);
    	  var month = parseInt(tin.slice(2, 4), 10);

    	  if (month > 40) {
    	    month -= 40;
    	    century_year = "20".concat(century_year);
    	  } else if (month > 20) {
    	    month -= 20;
    	    century_year = "18".concat(century_year);
    	  } else {
    	    century_year = "19".concat(century_year);
    	  }

    	  if (month < 10) {
    	    month = "0".concat(month);
    	  }

    	  var date = "".concat(century_year, "/").concat(month, "/").concat(tin.slice(4, 6));

    	  if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
    	    return false;
    	  } // split digits into an array for further processing


    	  var digits = tin.split('').map(function (a) {
    	    return parseInt(a, 10);
    	  }); // Calculate checksum by multiplying digits with fixed values

    	  var multip_lookup = [2, 4, 8, 5, 10, 9, 7, 3, 6];
    	  var checksum = 0;

    	  for (var i = 0; i < multip_lookup.length; i++) {
    	    checksum += digits[i] * multip_lookup[i];
    	  }

    	  checksum = checksum % 11 === 10 ? 0 : checksum % 11;
    	  return checksum === digits[9];
    	}
    	/*
    	 * cs-CZ validation function
    	 * (Rodné číslo (RČ), persons only)
    	 * Checks if birth date (first six digits) is valid and divisibility by 11
    	 * Material not in DG TAXUD document sourced from:
    	 * -`https://lorenc.info/3MA381/overeni-spravnosti-rodneho-cisla.htm`
    	 * -`https://www.mvcr.cz/clanek/rady-a-sluzby-dokumenty-rodne-cislo.aspx`
    	 */


    	function csCzCheck(tin) {
    	  tin = tin.replace(/\W/, ''); // Extract full year from TIN length

    	  var full_year = parseInt(tin.slice(0, 2), 10);

    	  if (tin.length === 10) {
    	    if (full_year < 54) {
    	      full_year = "20".concat(full_year);
    	    } else {
    	      full_year = "19".concat(full_year);
    	    }
    	  } else {
    	    if (tin.slice(6) === '000') {
    	      return false;
    	    } // Three-zero serial not assigned before 1954


    	    if (full_year < 54) {
    	      full_year = "19".concat(full_year);
    	    } else {
    	      return false; // No 18XX years seen in any of the resources
    	    }
    	  } // Add missing zero if needed


    	  if (full_year.length === 3) {
    	    full_year = [full_year.slice(0, 2), '0', full_year.slice(2)].join('');
    	  } // Extract month from TIN and normalize


    	  var month = parseInt(tin.slice(2, 4), 10);

    	  if (month > 50) {
    	    month -= 50;
    	  }

    	  if (month > 20) {
    	    // Month-plus-twenty was only introduced in 2004
    	    if (parseInt(full_year, 10) < 2004) {
    	      return false;
    	    }

    	    month -= 20;
    	  }

    	  if (month < 10) {
    	    month = "0".concat(month);
    	  } // Check date validity


    	  var date = "".concat(full_year, "/").concat(month, "/").concat(tin.slice(4, 6));

    	  if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
    	    return false;
    	  } // Verify divisibility by 11


    	  if (tin.length === 10) {
    	    if (parseInt(tin, 10) % 11 !== 0) {
    	      // Some numbers up to and including 1985 are still valid if
    	      // check (last) digit equals 0 and modulo of first 9 digits equals 10
    	      var checkdigit = parseInt(tin.slice(0, 9), 10) % 11;

    	      if (parseInt(full_year, 10) < 1986 && checkdigit === 10) {
    	        if (parseInt(tin.slice(9), 10) !== 0) {
    	          return false;
    	        }
    	      } else {
    	        return false;
    	      }
    	    }
    	  }

    	  return true;
    	}
    	/*
    	 * de-AT validation function
    	 * (Abgabenkontonummer, persons/entities)
    	 * Verify TIN validity by calling luhnCheck()
    	 */


    	function deAtCheck(tin) {
    	  return algorithms$1.luhnCheck(tin);
    	}
    	/*
    	 * de-DE validation function
    	 * (Steueridentifikationsnummer (Steuer-IdNr.), persons only)
    	 * Tests for single duplicate/triplicate value, then calculates ISO 7064 check (last) digit
    	 * Partial implementation of spec (same result with both algorithms always)
    	 */


    	function deDeCheck(tin) {
    	  // Split digits into an array for further processing
    	  var digits = tin.split('').map(function (a) {
    	    return parseInt(a, 10);
    	  }); // Fill array with strings of number positions

    	  var occurences = [];

    	  for (var i = 0; i < digits.length - 1; i++) {
    	    occurences.push('');

    	    for (var j = 0; j < digits.length - 1; j++) {
    	      if (digits[i] === digits[j]) {
    	        occurences[i] += j;
    	      }
    	    }
    	  } // Remove digits with one occurence and test for only one duplicate/triplicate


    	  occurences = occurences.filter(function (a) {
    	    return a.length > 1;
    	  });

    	  if (occurences.length !== 2 && occurences.length !== 3) {
    	    return false;
    	  } // In case of triplicate value only two digits are allowed next to each other


    	  if (occurences[0].length === 3) {
    	    var trip_locations = occurences[0].split('').map(function (a) {
    	      return parseInt(a, 10);
    	    });
    	    var recurrent = 0; // Amount of neighbour occurences

    	    for (var _i = 0; _i < trip_locations.length - 1; _i++) {
    	      if (trip_locations[_i] + 1 === trip_locations[_i + 1]) {
    	        recurrent += 1;
    	      }
    	    }

    	    if (recurrent === 2) {
    	      return false;
    	    }
    	  }

    	  return algorithms$1.iso7064Check(tin);
    	}
    	/*
    	 * dk-DK validation function
    	 * (CPR-nummer (personnummer), persons only)
    	 * Checks if birth date (first six digits) is valid and assigned to century (seventh) digit,
    	 * and calculates check (last) digit
    	 */


    	function dkDkCheck(tin) {
    	  tin = tin.replace(/\W/, ''); // Extract year, check if valid for given century digit and add century

    	  var year = parseInt(tin.slice(4, 6), 10);
    	  var century_digit = tin.slice(6, 7);

    	  switch (century_digit) {
    	    case '0':
    	    case '1':
    	    case '2':
    	    case '3':
    	      year = "19".concat(year);
    	      break;

    	    case '4':
    	    case '9':
    	      if (year < 37) {
    	        year = "20".concat(year);
    	      } else {
    	        year = "19".concat(year);
    	      }

    	      break;

    	    default:
    	      if (year < 37) {
    	        year = "20".concat(year);
    	      } else if (year > 58) {
    	        year = "18".concat(year);
    	      } else {
    	        return false;
    	      }

    	      break;
    	  } // Add missing zero if needed


    	  if (year.length === 3) {
    	    year = [year.slice(0, 2), '0', year.slice(2)].join('');
    	  } // Check date validity


    	  var date = "".concat(year, "/").concat(tin.slice(2, 4), "/").concat(tin.slice(0, 2));

    	  if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
    	    return false;
    	  } // Split digits into an array for further processing


    	  var digits = tin.split('').map(function (a) {
    	    return parseInt(a, 10);
    	  });
    	  var checksum = 0;
    	  var weight = 4; // Multiply by weight and add to checksum

    	  for (var i = 0; i < 9; i++) {
    	    checksum += digits[i] * weight;
    	    weight -= 1;

    	    if (weight === 1) {
    	      weight = 7;
    	    }
    	  }

    	  checksum %= 11;

    	  if (checksum === 1) {
    	    return false;
    	  }

    	  return checksum === 0 ? digits[9] === 0 : digits[9] === 11 - checksum;
    	}
    	/*
    	 * el-CY validation function
    	 * (Arithmos Forologikou Mitroou (AFM/ΑΦΜ), persons only)
    	 * Verify TIN validity by calculating ASCII value of check (last) character
    	 */


    	function elCyCheck(tin) {
    	  // split digits into an array for further processing
    	  var digits = tin.slice(0, 8).split('').map(function (a) {
    	    return parseInt(a, 10);
    	  });
    	  var checksum = 0; // add digits in even places

    	  for (var i = 1; i < digits.length; i += 2) {
    	    checksum += digits[i];
    	  } // add digits in odd places


    	  for (var _i2 = 0; _i2 < digits.length; _i2 += 2) {
    	    if (digits[_i2] < 2) {
    	      checksum += 1 - digits[_i2];
    	    } else {
    	      checksum += 2 * (digits[_i2] - 2) + 5;

    	      if (digits[_i2] > 4) {
    	        checksum += 2;
    	      }
    	    }
    	  }

    	  return String.fromCharCode(checksum % 26 + 65) === tin.charAt(8);
    	}
    	/*
    	 * el-GR validation function
    	 * (Arithmos Forologikou Mitroou (AFM/ΑΦΜ), persons/entities)
    	 * Verify TIN validity by calculating check (last) digit
    	 * Algorithm not in DG TAXUD document- sourced from:
    	 * - `http://epixeirisi.gr/%CE%9A%CE%A1%CE%99%CE%A3%CE%99%CE%9C%CE%91-%CE%98%CE%95%CE%9C%CE%91%CE%A4%CE%91-%CE%A6%CE%9F%CE%A1%CE%9F%CE%9B%CE%9F%CE%93%CE%99%CE%91%CE%A3-%CE%9A%CE%91%CE%99-%CE%9B%CE%9F%CE%93%CE%99%CE%A3%CE%A4%CE%99%CE%9A%CE%97%CE%A3/23791/%CE%91%CF%81%CE%B9%CE%B8%CE%BC%CF%8C%CF%82-%CE%A6%CE%BF%CF%81%CE%BF%CE%BB%CE%BF%CE%B3%CE%B9%CE%BA%CE%BF%CF%8D-%CE%9C%CE%B7%CF%84%CF%81%CF%8E%CE%BF%CF%85`
    	 */


    	function elGrCheck(tin) {
    	  // split digits into an array for further processing
    	  var digits = tin.split('').map(function (a) {
    	    return parseInt(a, 10);
    	  });
    	  var checksum = 0;

    	  for (var i = 0; i < 8; i++) {
    	    checksum += digits[i] * Math.pow(2, 8 - i);
    	  }

    	  return checksum % 11 % 10 === digits[8];
    	}
    	/*
    	 * en-GB validation function (should go here if needed)
    	 * (National Insurance Number (NINO) or Unique Taxpayer Reference (UTR),
    	 * persons/entities respectively)
    	 */

    	/*
    	 * en-IE validation function
    	 * (Personal Public Service Number (PPS No), persons only)
    	 * Verify TIN validity by calculating check (second to last) character
    	 */


    	function enIeCheck(tin) {
    	  var checksum = algorithms$1.reverseMultiplyAndSum(tin.split('').slice(0, 7).map(function (a) {
    	    return parseInt(a, 10);
    	  }), 8);

    	  if (tin.length === 9 && tin[8] !== 'W') {
    	    checksum += (tin[8].charCodeAt(0) - 64) * 9;
    	  }

    	  checksum %= 23;

    	  if (checksum === 0) {
    	    return tin[7].toUpperCase() === 'W';
    	  }

    	  return tin[7].toUpperCase() === String.fromCharCode(64 + checksum);
    	} // Valid US IRS campus prefixes


    	var enUsCampusPrefix = {
    	  andover: ['10', '12'],
    	  atlanta: ['60', '67'],
    	  austin: ['50', '53'],
    	  brookhaven: ['01', '02', '03', '04', '05', '06', '11', '13', '14', '16', '21', '22', '23', '25', '34', '51', '52', '54', '55', '56', '57', '58', '59', '65'],
    	  cincinnati: ['30', '32', '35', '36', '37', '38', '61'],
    	  fresno: ['15', '24'],
    	  internet: ['20', '26', '27', '45', '46', '47'],
    	  kansas: ['40', '44'],
    	  memphis: ['94', '95'],
    	  ogden: ['80', '90'],
    	  philadelphia: ['33', '39', '41', '42', '43', '46', '48', '62', '63', '64', '66', '68', '71', '72', '73', '74', '75', '76', '77', '81', '82', '83', '84', '85', '86', '87', '88', '91', '92', '93', '98', '99'],
    	  sba: ['31']
    	}; // Return an array of all US IRS campus prefixes

    	function enUsGetPrefixes() {
    	  var prefixes = [];

    	  for (var location in enUsCampusPrefix) {
    	    // https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md#ignoring-code-for-coverage-purposes
    	    // istanbul ignore else
    	    if (enUsCampusPrefix.hasOwnProperty(location)) {
    	      prefixes.push.apply(prefixes, _toConsumableArray(enUsCampusPrefix[location]));
    	    }
    	  }

    	  return prefixes;
    	}
    	/*
    	 * en-US validation function
    	 * Verify that the TIN starts with a valid IRS campus prefix
    	 */


    	function enUsCheck(tin) {
    	  return enUsGetPrefixes().indexOf(tin.substr(0, 2)) !== -1;
    	}
    	/*
    	 * es-ES validation function
    	 * (Documento Nacional de Identidad (DNI)
    	 * or Número de Identificación de Extranjero (NIE), persons only)
    	 * Verify TIN validity by calculating check (last) character
    	 */


    	function esEsCheck(tin) {
    	  // Split characters into an array for further processing
    	  var chars = tin.toUpperCase().split(''); // Replace initial letter if needed

    	  if (isNaN(parseInt(chars[0], 10)) && chars.length > 1) {
    	    var lead_replace = 0;

    	    switch (chars[0]) {
    	      case 'Y':
    	        lead_replace = 1;
    	        break;

    	      case 'Z':
    	        lead_replace = 2;
    	        break;
    	    }

    	    chars.splice(0, 1, lead_replace); // Fill with zeros if smaller than proper
    	  } else {
    	    while (chars.length < 9) {
    	      chars.unshift(0);
    	    }
    	  } // Calculate checksum and check according to lookup


    	  var lookup = ['T', 'R', 'W', 'A', 'G', 'M', 'Y', 'F', 'P', 'D', 'X', 'B', 'N', 'J', 'Z', 'S', 'Q', 'V', 'H', 'L', 'C', 'K', 'E'];
    	  chars = chars.join('');
    	  var checksum = parseInt(chars.slice(0, 8), 10) % 23;
    	  return chars[8] === lookup[checksum];
    	}
    	/*
    	 * et-EE validation function
    	 * (Isikukood (IK), persons only)
    	 * Checks if birth date (century digit and six following) is valid and calculates check (last) digit
    	 * Material not in DG TAXUD document sourced from:
    	 * - `https://www.oecd.org/tax/automatic-exchange/crs-implementation-and-assistance/tax-identification-numbers/Estonia-TIN.pdf`
    	 */


    	function etEeCheck(tin) {
    	  // Extract year and add century
    	  var full_year = tin.slice(1, 3);
    	  var century_digit = tin.slice(0, 1);

    	  switch (century_digit) {
    	    case '1':
    	    case '2':
    	      full_year = "18".concat(full_year);
    	      break;

    	    case '3':
    	    case '4':
    	      full_year = "19".concat(full_year);
    	      break;

    	    default:
    	      full_year = "20".concat(full_year);
    	      break;
    	  } // Check date validity


    	  var date = "".concat(full_year, "/").concat(tin.slice(3, 5), "/").concat(tin.slice(5, 7));

    	  if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
    	    return false;
    	  } // Split digits into an array for further processing


    	  var digits = tin.split('').map(function (a) {
    	    return parseInt(a, 10);
    	  });
    	  var checksum = 0;
    	  var weight = 1; // Multiply by weight and add to checksum

    	  for (var i = 0; i < 10; i++) {
    	    checksum += digits[i] * weight;
    	    weight += 1;

    	    if (weight === 10) {
    	      weight = 1;
    	    }
    	  } // Do again if modulo 11 of checksum is 10


    	  if (checksum % 11 === 10) {
    	    checksum = 0;
    	    weight = 3;

    	    for (var _i3 = 0; _i3 < 10; _i3++) {
    	      checksum += digits[_i3] * weight;
    	      weight += 1;

    	      if (weight === 10) {
    	        weight = 1;
    	      }
    	    }

    	    if (checksum % 11 === 10) {
    	      return digits[10] === 0;
    	    }
    	  }

    	  return checksum % 11 === digits[10];
    	}
    	/*
    	 * fi-FI validation function
    	 * (Henkilötunnus (HETU), persons only)
    	 * Checks if birth date (first six digits plus century symbol) is valid
    	 * and calculates check (last) digit
    	 */


    	function fiFiCheck(tin) {
    	  // Extract year and add century
    	  var full_year = tin.slice(4, 6);
    	  var century_symbol = tin.slice(6, 7);

    	  switch (century_symbol) {
    	    case '+':
    	      full_year = "18".concat(full_year);
    	      break;

    	    case '-':
    	      full_year = "19".concat(full_year);
    	      break;

    	    default:
    	      full_year = "20".concat(full_year);
    	      break;
    	  } // Check date validity


    	  var date = "".concat(full_year, "/").concat(tin.slice(2, 4), "/").concat(tin.slice(0, 2));

    	  if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
    	    return false;
    	  } // Calculate check character


    	  var checksum = parseInt(tin.slice(0, 6) + tin.slice(7, 10), 10) % 31;

    	  if (checksum < 10) {
    	    return checksum === parseInt(tin.slice(10), 10);
    	  }

    	  checksum -= 10;
    	  var letters_lookup = ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'];
    	  return letters_lookup[checksum] === tin.slice(10);
    	}
    	/*
    	 * fr/nl-BE validation function
    	 * (Numéro national (N.N.), persons only)
    	 * Checks if birth date (first six digits) is valid and calculates check (last two) digits
    	 */


    	function frBeCheck(tin) {
    	  // Zero month/day value is acceptable
    	  if (tin.slice(2, 4) !== '00' || tin.slice(4, 6) !== '00') {
    	    // Extract date from first six digits of TIN
    	    var date = "".concat(tin.slice(0, 2), "/").concat(tin.slice(2, 4), "/").concat(tin.slice(4, 6));

    	    if (!(0, _isDate.default)(date, 'YY/MM/DD')) {
    	      return false;
    	    }
    	  }

    	  var checksum = 97 - parseInt(tin.slice(0, 9), 10) % 97;
    	  var checkdigits = parseInt(tin.slice(9, 11), 10);

    	  if (checksum !== checkdigits) {
    	    checksum = 97 - parseInt("2".concat(tin.slice(0, 9)), 10) % 97;

    	    if (checksum !== checkdigits) {
    	      return false;
    	    }
    	  }

    	  return true;
    	}
    	/*
    	 * fr-FR validation function
    	 * (Numéro fiscal de référence (numéro SPI), persons only)
    	 * Verify TIN validity by calculating check (last three) digits
    	 */


    	function frFrCheck(tin) {
    	  tin = tin.replace(/\s/g, '');
    	  var checksum = parseInt(tin.slice(0, 10), 10) % 511;
    	  var checkdigits = parseInt(tin.slice(10, 13), 10);
    	  return checksum === checkdigits;
    	}
    	/*
    	 * fr/lb-LU validation function
    	 * (numéro d’identification personnelle, persons only)
    	 * Verify birth date validity and run Luhn and Verhoeff checks
    	 */


    	function frLuCheck(tin) {
    	  // Extract date and check validity
    	  var date = "".concat(tin.slice(0, 4), "/").concat(tin.slice(4, 6), "/").concat(tin.slice(6, 8));

    	  if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
    	    return false;
    	  } // Run Luhn check


    	  if (!algorithms$1.luhnCheck(tin.slice(0, 12))) {
    	    return false;
    	  } // Remove Luhn check digit and run Verhoeff check


    	  return algorithms$1.verhoeffCheck("".concat(tin.slice(0, 11)).concat(tin[12]));
    	}
    	/*
    	 * hr-HR validation function
    	 * (Osobni identifikacijski broj (OIB), persons/entities)
    	 * Verify TIN validity by calling iso7064Check(digits)
    	 */


    	function hrHrCheck(tin) {
    	  return algorithms$1.iso7064Check(tin);
    	}
    	/*
    	 * hu-HU validation function
    	 * (Adóazonosító jel, persons only)
    	 * Verify TIN validity by calculating check (last) digit
    	 */


    	function huHuCheck(tin) {
    	  // split digits into an array for further processing
    	  var digits = tin.split('').map(function (a) {
    	    return parseInt(a, 10);
    	  });
    	  var checksum = 8;

    	  for (var i = 1; i < 9; i++) {
    	    checksum += digits[i] * (i + 1);
    	  }

    	  return checksum % 11 === digits[9];
    	}
    	/*
    	 * lt-LT validation function (should go here if needed)
    	 * (Asmens kodas, persons/entities respectively)
    	 * Current validation check is alias of etEeCheck- same format applies
    	 */

    	/*
    	 * it-IT first/last name validity check
    	 * Accepts it-IT TIN-encoded names as a three-element character array and checks their validity
    	 * Due to lack of clarity between resources ("Are only Italian consonants used?
    	 * What happens if a person has X in their name?" etc.) only two test conditions
    	 * have been implemented:
    	 * Vowels may only be followed by other vowels or an X character
    	 * and X characters after vowels may only be followed by other X characters.
    	 */


    	function itItNameCheck(name) {
    	  // true at the first occurence of a vowel
    	  var vowelflag = false; // true at the first occurence of an X AFTER vowel
    	  // (to properly handle last names with X as consonant)

    	  var xflag = false;

    	  for (var i = 0; i < 3; i++) {
    	    if (!vowelflag && /[AEIOU]/.test(name[i])) {
    	      vowelflag = true;
    	    } else if (!xflag && vowelflag && name[i] === 'X') {
    	      xflag = true;
    	    } else if (i > 0) {
    	      if (vowelflag && !xflag) {
    	        if (!/[AEIOU]/.test(name[i])) {
    	          return false;
    	        }
    	      }

    	      if (xflag) {
    	        if (!/X/.test(name[i])) {
    	          return false;
    	        }
    	      }
    	    }
    	  }

    	  return true;
    	}
    	/*
    	 * it-IT validation function
    	 * (Codice fiscale (TIN-IT), persons only)
    	 * Verify name, birth date and codice catastale validity
    	 * and calculate check character.
    	 * Material not in DG-TAXUD document sourced from:
    	 * `https://en.wikipedia.org/wiki/Italian_fiscal_code`
    	 */


    	function itItCheck(tin) {
    	  // Capitalize and split characters into an array for further processing
    	  var chars = tin.toUpperCase().split(''); // Check first and last name validity calling itItNameCheck()

    	  if (!itItNameCheck(chars.slice(0, 3))) {
    	    return false;
    	  }

    	  if (!itItNameCheck(chars.slice(3, 6))) {
    	    return false;
    	  } // Convert letters in number spaces back to numbers if any


    	  var number_locations = [6, 7, 9, 10, 12, 13, 14];
    	  var number_replace = {
    	    L: '0',
    	    M: '1',
    	    N: '2',
    	    P: '3',
    	    Q: '4',
    	    R: '5',
    	    S: '6',
    	    T: '7',
    	    U: '8',
    	    V: '9'
    	  };

    	  for (var _i4 = 0, _number_locations = number_locations; _i4 < _number_locations.length; _i4++) {
    	    var i = _number_locations[_i4];

    	    if (chars[i] in number_replace) {
    	      chars.splice(i, 1, number_replace[chars[i]]);
    	    }
    	  } // Extract month and day, and check date validity


    	  var month_replace = {
    	    A: '01',
    	    B: '02',
    	    C: '03',
    	    D: '04',
    	    E: '05',
    	    H: '06',
    	    L: '07',
    	    M: '08',
    	    P: '09',
    	    R: '10',
    	    S: '11',
    	    T: '12'
    	  };
    	  var month = month_replace[chars[8]];
    	  var day = parseInt(chars[9] + chars[10], 10);

    	  if (day > 40) {
    	    day -= 40;
    	  }

    	  if (day < 10) {
    	    day = "0".concat(day);
    	  }

    	  var date = "".concat(chars[6]).concat(chars[7], "/").concat(month, "/").concat(day);

    	  if (!(0, _isDate.default)(date, 'YY/MM/DD')) {
    	    return false;
    	  } // Calculate check character by adding up even and odd characters as numbers


    	  var checksum = 0;

    	  for (var _i5 = 1; _i5 < chars.length - 1; _i5 += 2) {
    	    var char_to_int = parseInt(chars[_i5], 10);

    	    if (isNaN(char_to_int)) {
    	      char_to_int = chars[_i5].charCodeAt(0) - 65;
    	    }

    	    checksum += char_to_int;
    	  }

    	  var odd_convert = {
    	    // Maps of characters at odd places
    	    A: 1,
    	    B: 0,
    	    C: 5,
    	    D: 7,
    	    E: 9,
    	    F: 13,
    	    G: 15,
    	    H: 17,
    	    I: 19,
    	    J: 21,
    	    K: 2,
    	    L: 4,
    	    M: 18,
    	    N: 20,
    	    O: 11,
    	    P: 3,
    	    Q: 6,
    	    R: 8,
    	    S: 12,
    	    T: 14,
    	    U: 16,
    	    V: 10,
    	    W: 22,
    	    X: 25,
    	    Y: 24,
    	    Z: 23,
    	    0: 1,
    	    1: 0
    	  };

    	  for (var _i6 = 0; _i6 < chars.length - 1; _i6 += 2) {
    	    var _char_to_int = 0;

    	    if (chars[_i6] in odd_convert) {
    	      _char_to_int = odd_convert[chars[_i6]];
    	    } else {
    	      var multiplier = parseInt(chars[_i6], 10);
    	      _char_to_int = 2 * multiplier + 1;

    	      if (multiplier > 4) {
    	        _char_to_int += 2;
    	      }
    	    }

    	    checksum += _char_to_int;
    	  }

    	  if (String.fromCharCode(65 + checksum % 26) !== chars[15]) {
    	    return false;
    	  }

    	  return true;
    	}
    	/*
    	 * lv-LV validation function
    	 * (Personas kods (PK), persons only)
    	 * Check validity of birth date and calculate check (last) digit
    	 * Support only for old format numbers (not starting with '32', issued before 2017/07/01)
    	 * Material not in DG TAXUD document sourced from:
    	 * `https://boot.ritakafija.lv/forums/index.php?/topic/88314-personas-koda-algoritms-%C4%8Deksumma/`
    	 */


    	function lvLvCheck(tin) {
    	  tin = tin.replace(/\W/, ''); // Extract date from TIN

    	  var day = tin.slice(0, 2);

    	  if (day !== '32') {
    	    // No date/checksum check if new format
    	    var month = tin.slice(2, 4);

    	    if (month !== '00') {
    	      // No date check if unknown month
    	      var full_year = tin.slice(4, 6);

    	      switch (tin[6]) {
    	        case '0':
    	          full_year = "18".concat(full_year);
    	          break;

    	        case '1':
    	          full_year = "19".concat(full_year);
    	          break;

    	        default:
    	          full_year = "20".concat(full_year);
    	          break;
    	      } // Check date validity


    	      var date = "".concat(full_year, "/").concat(tin.slice(2, 4), "/").concat(day);

    	      if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
    	        return false;
    	      }
    	    } // Calculate check digit


    	    var checksum = 1101;
    	    var multip_lookup = [1, 6, 3, 7, 9, 10, 5, 8, 4, 2];

    	    for (var i = 0; i < tin.length - 1; i++) {
    	      checksum -= parseInt(tin[i], 10) * multip_lookup[i];
    	    }

    	    return parseInt(tin[10], 10) === checksum % 11;
    	  }

    	  return true;
    	}
    	/*
    	 * mt-MT validation function
    	 * (Identity Card Number or Unique Taxpayer Reference, persons/entities)
    	 * Verify Identity Card Number structure (no other tests found)
    	 */


    	function mtMtCheck(tin) {
    	  if (tin.length !== 9) {
    	    // No tests for UTR
    	    var chars = tin.toUpperCase().split(''); // Fill with zeros if smaller than proper

    	    while (chars.length < 8) {
    	      chars.unshift(0);
    	    } // Validate format according to last character


    	    switch (tin[7]) {
    	      case 'A':
    	      case 'P':
    	        if (parseInt(chars[6], 10) === 0) {
    	          return false;
    	        }

    	        break;

    	      default:
    	        {
    	          var first_part = parseInt(chars.join('').slice(0, 5), 10);

    	          if (first_part > 32000) {
    	            return false;
    	          }

    	          var second_part = parseInt(chars.join('').slice(5, 7), 10);

    	          if (first_part === second_part) {
    	            return false;
    	          }
    	        }
    	    }
    	  }

    	  return true;
    	}
    	/*
    	 * nl-NL validation function
    	 * (Burgerservicenummer (BSN) or Rechtspersonen Samenwerkingsverbanden Informatie Nummer (RSIN),
    	 * persons/entities respectively)
    	 * Verify TIN validity by calculating check (last) digit (variant of MOD 11)
    	 */


    	function nlNlCheck(tin) {
    	  return algorithms$1.reverseMultiplyAndSum(tin.split('').slice(0, 8).map(function (a) {
    	    return parseInt(a, 10);
    	  }), 9) % 11 === parseInt(tin[8], 10);
    	}
    	/*
    	 * pl-PL validation function
    	 * (Powszechny Elektroniczny System Ewidencji Ludności (PESEL)
    	 * or Numer identyfikacji podatkowej (NIP), persons/entities)
    	 * Verify TIN validity by validating birth date (PESEL) and calculating check (last) digit
    	 */


    	function plPlCheck(tin) {
    	  // NIP
    	  if (tin.length === 10) {
    	    // Calculate last digit by multiplying with lookup
    	    var lookup = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    	    var _checksum = 0;

    	    for (var i = 0; i < lookup.length; i++) {
    	      _checksum += parseInt(tin[i], 10) * lookup[i];
    	    }

    	    _checksum %= 11;

    	    if (_checksum === 10) {
    	      return false;
    	    }

    	    return _checksum === parseInt(tin[9], 10);
    	  } // PESEL
    	  // Extract full year using month


    	  var full_year = tin.slice(0, 2);
    	  var month = parseInt(tin.slice(2, 4), 10);

    	  if (month > 80) {
    	    full_year = "18".concat(full_year);
    	    month -= 80;
    	  } else if (month > 60) {
    	    full_year = "22".concat(full_year);
    	    month -= 60;
    	  } else if (month > 40) {
    	    full_year = "21".concat(full_year);
    	    month -= 40;
    	  } else if (month > 20) {
    	    full_year = "20".concat(full_year);
    	    month -= 20;
    	  } else {
    	    full_year = "19".concat(full_year);
    	  } // Add leading zero to month if needed


    	  if (month < 10) {
    	    month = "0".concat(month);
    	  } // Check date validity


    	  var date = "".concat(full_year, "/").concat(month, "/").concat(tin.slice(4, 6));

    	  if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
    	    return false;
    	  } // Calculate last digit by mulitplying with odd one-digit numbers except 5


    	  var checksum = 0;
    	  var multiplier = 1;

    	  for (var _i7 = 0; _i7 < tin.length - 1; _i7++) {
    	    checksum += parseInt(tin[_i7], 10) * multiplier % 10;
    	    multiplier += 2;

    	    if (multiplier > 10) {
    	      multiplier = 1;
    	    } else if (multiplier === 5) {
    	      multiplier += 2;
    	    }
    	  }

    	  checksum = 10 - checksum % 10;
    	  return checksum === parseInt(tin[10], 10);
    	}
    	/*
    	* pt-BR validation function
    	* (Cadastro de Pessoas Físicas (CPF, persons)
    	* Cadastro Nacional de Pessoas Jurídicas (CNPJ, entities)
    	* Both inputs will be validated
    	*/


    	function ptBrCheck(tin) {
    	  if (tin.length === 11) {
    	    var _sum;

    	    var remainder;
    	    _sum = 0;
    	    if ( // Reject known invalid CPFs
    	    tin === '11111111111' || tin === '22222222222' || tin === '33333333333' || tin === '44444444444' || tin === '55555555555' || tin === '66666666666' || tin === '77777777777' || tin === '88888888888' || tin === '99999999999' || tin === '00000000000') return false;

    	    for (var i = 1; i <= 9; i++) {
    	      _sum += parseInt(tin.substring(i - 1, i), 10) * (11 - i);
    	    }

    	    remainder = _sum * 10 % 11;
    	    if (remainder === 10) remainder = 0;
    	    if (remainder !== parseInt(tin.substring(9, 10), 10)) return false;
    	    _sum = 0;

    	    for (var _i8 = 1; _i8 <= 10; _i8++) {
    	      _sum += parseInt(tin.substring(_i8 - 1, _i8), 10) * (12 - _i8);
    	    }

    	    remainder = _sum * 10 % 11;
    	    if (remainder === 10) remainder = 0;
    	    if (remainder !== parseInt(tin.substring(10, 11), 10)) return false;
    	    return true;
    	  }

    	  if ( // Reject know invalid CNPJs
    	  tin === '00000000000000' || tin === '11111111111111' || tin === '22222222222222' || tin === '33333333333333' || tin === '44444444444444' || tin === '55555555555555' || tin === '66666666666666' || tin === '77777777777777' || tin === '88888888888888' || tin === '99999999999999') {
    	    return false;
    	  }

    	  var length = tin.length - 2;
    	  var identifiers = tin.substring(0, length);
    	  var verificators = tin.substring(length);
    	  var sum = 0;
    	  var pos = length - 7;

    	  for (var _i9 = length; _i9 >= 1; _i9--) {
    	    sum += identifiers.charAt(length - _i9) * pos;
    	    pos -= 1;

    	    if (pos < 2) {
    	      pos = 9;
    	    }
    	  }

    	  var result = sum % 11 < 2 ? 0 : 11 - sum % 11;

    	  if (result !== parseInt(verificators.charAt(0), 10)) {
    	    return false;
    	  }

    	  length += 1;
    	  identifiers = tin.substring(0, length);
    	  sum = 0;
    	  pos = length - 7;

    	  for (var _i10 = length; _i10 >= 1; _i10--) {
    	    sum += identifiers.charAt(length - _i10) * pos;
    	    pos -= 1;

    	    if (pos < 2) {
    	      pos = 9;
    	    }
    	  }

    	  result = sum % 11 < 2 ? 0 : 11 - sum % 11;

    	  if (result !== parseInt(verificators.charAt(1), 10)) {
    	    return false;
    	  }

    	  return true;
    	}
    	/*
    	 * pt-PT validation function
    	 * (Número de identificação fiscal (NIF), persons/entities)
    	 * Verify TIN validity by calculating check (last) digit (variant of MOD 11)
    	 */


    	function ptPtCheck(tin) {
    	  var checksum = 11 - algorithms$1.reverseMultiplyAndSum(tin.split('').slice(0, 8).map(function (a) {
    	    return parseInt(a, 10);
    	  }), 9) % 11;

    	  if (checksum > 9) {
    	    return parseInt(tin[8], 10) === 0;
    	  }

    	  return checksum === parseInt(tin[8], 10);
    	}
    	/*
    	 * ro-RO validation function
    	 * (Cod Numeric Personal (CNP) or Cod de înregistrare fiscală (CIF),
    	 * persons only)
    	 * Verify CNP validity by calculating check (last) digit (test not found for CIF)
    	 * Material not in DG TAXUD document sourced from:
    	 * `https://en.wikipedia.org/wiki/National_identification_number#Romania`
    	 */


    	function roRoCheck(tin) {
    	  if (tin.slice(0, 4) !== '9000') {
    	    // No test found for this format
    	    // Extract full year using century digit if possible
    	    var full_year = tin.slice(1, 3);

    	    switch (tin[0]) {
    	      case '1':
    	      case '2':
    	        full_year = "19".concat(full_year);
    	        break;

    	      case '3':
    	      case '4':
    	        full_year = "18".concat(full_year);
    	        break;

    	      case '5':
    	      case '6':
    	        full_year = "20".concat(full_year);
    	        break;
    	    } // Check date validity


    	    var date = "".concat(full_year, "/").concat(tin.slice(3, 5), "/").concat(tin.slice(5, 7));

    	    if (date.length === 8) {
    	      if (!(0, _isDate.default)(date, 'YY/MM/DD')) {
    	        return false;
    	      }
    	    } else if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
    	      return false;
    	    } // Calculate check digit


    	    var digits = tin.split('').map(function (a) {
    	      return parseInt(a, 10);
    	    });
    	    var multipliers = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
    	    var checksum = 0;

    	    for (var i = 0; i < multipliers.length; i++) {
    	      checksum += digits[i] * multipliers[i];
    	    }

    	    if (checksum % 11 === 10) {
    	      return digits[12] === 1;
    	    }

    	    return digits[12] === checksum % 11;
    	  }

    	  return true;
    	}
    	/*
    	 * sk-SK validation function
    	 * (Rodné číslo (RČ) or bezvýznamové identifikačné číslo (BIČ), persons only)
    	 * Checks validity of pre-1954 birth numbers (rodné číslo) only
    	 * Due to the introduction of the pseudo-random BIČ it is not possible to test
    	 * post-1954 birth numbers without knowing whether they are BIČ or RČ beforehand
    	 */


    	function skSkCheck(tin) {
    	  if (tin.length === 9) {
    	    tin = tin.replace(/\W/, '');

    	    if (tin.slice(6) === '000') {
    	      return false;
    	    } // Three-zero serial not assigned before 1954
    	    // Extract full year from TIN length


    	    var full_year = parseInt(tin.slice(0, 2), 10);

    	    if (full_year > 53) {
    	      return false;
    	    }

    	    if (full_year < 10) {
    	      full_year = "190".concat(full_year);
    	    } else {
    	      full_year = "19".concat(full_year);
    	    } // Extract month from TIN and normalize


    	    var month = parseInt(tin.slice(2, 4), 10);

    	    if (month > 50) {
    	      month -= 50;
    	    }

    	    if (month < 10) {
    	      month = "0".concat(month);
    	    } // Check date validity


    	    var date = "".concat(full_year, "/").concat(month, "/").concat(tin.slice(4, 6));

    	    if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
    	      return false;
    	    }
    	  }

    	  return true;
    	}
    	/*
    	 * sl-SI validation function
    	 * (Davčna številka, persons/entities)
    	 * Verify TIN validity by calculating check (last) digit (variant of MOD 11)
    	 */


    	function slSiCheck(tin) {
    	  var checksum = 11 - algorithms$1.reverseMultiplyAndSum(tin.split('').slice(0, 7).map(function (a) {
    	    return parseInt(a, 10);
    	  }), 8) % 11;

    	  if (checksum === 10) {
    	    return parseInt(tin[7], 10) === 0;
    	  }

    	  return checksum === parseInt(tin[7], 10);
    	}
    	/*
    	 * sv-SE validation function
    	 * (Personnummer or samordningsnummer, persons only)
    	 * Checks validity of birth date and calls luhnCheck() to validate check (last) digit
    	 */


    	function svSeCheck(tin) {
    	  // Make copy of TIN and normalize to two-digit year form
    	  var tin_copy = tin.slice(0);

    	  if (tin.length > 11) {
    	    tin_copy = tin_copy.slice(2);
    	  } // Extract date of birth


    	  var full_year = '';
    	  var month = tin_copy.slice(2, 4);
    	  var day = parseInt(tin_copy.slice(4, 6), 10);

    	  if (tin.length > 11) {
    	    full_year = tin.slice(0, 4);
    	  } else {
    	    full_year = tin.slice(0, 2);

    	    if (tin.length === 11 && day < 60) {
    	      // Extract full year from centenarian symbol
    	      // Should work just fine until year 10000 or so
    	      var current_year = new Date().getFullYear().toString();
    	      var current_century = parseInt(current_year.slice(0, 2), 10);
    	      current_year = parseInt(current_year, 10);

    	      if (tin[6] === '-') {
    	        if (parseInt("".concat(current_century).concat(full_year), 10) > current_year) {
    	          full_year = "".concat(current_century - 1).concat(full_year);
    	        } else {
    	          full_year = "".concat(current_century).concat(full_year);
    	        }
    	      } else {
    	        full_year = "".concat(current_century - 1).concat(full_year);

    	        if (current_year - parseInt(full_year, 10) < 100) {
    	          return false;
    	        }
    	      }
    	    }
    	  } // Normalize day and check date validity


    	  if (day > 60) {
    	    day -= 60;
    	  }

    	  if (day < 10) {
    	    day = "0".concat(day);
    	  }

    	  var date = "".concat(full_year, "/").concat(month, "/").concat(day);

    	  if (date.length === 8) {
    	    if (!(0, _isDate.default)(date, 'YY/MM/DD')) {
    	      return false;
    	    }
    	  } else if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
    	    return false;
    	  }

    	  return algorithms$1.luhnCheck(tin.replace(/\W/, ''));
    	} // Locale lookup objects

    	/*
    	 * Tax id regex formats for various locales
    	 *
    	 * Where not explicitly specified in DG-TAXUD document both
    	 * uppercase and lowercase letters are acceptable.
    	 */


    	var taxIdFormat = {
    	  'bg-BG': /^\d{10}$/,
    	  'cs-CZ': /^\d{6}\/{0,1}\d{3,4}$/,
    	  'de-AT': /^\d{9}$/,
    	  'de-DE': /^[1-9]\d{10}$/,
    	  'dk-DK': /^\d{6}-{0,1}\d{4}$/,
    	  'el-CY': /^[09]\d{7}[A-Z]$/,
    	  'el-GR': /^([0-4]|[7-9])\d{8}$/,
    	  'en-GB': /^\d{10}$|^(?!GB|NK|TN|ZZ)(?![DFIQUV])[A-Z](?![DFIQUVO])[A-Z]\d{6}[ABCD ]$/i,
    	  'en-IE': /^\d{7}[A-W][A-IW]{0,1}$/i,
    	  'en-US': /^\d{2}[- ]{0,1}\d{7}$/,
    	  'es-ES': /^(\d{0,8}|[XYZKLM]\d{7})[A-HJ-NP-TV-Z]$/i,
    	  'et-EE': /^[1-6]\d{6}(00[1-9]|0[1-9][0-9]|[1-6][0-9]{2}|70[0-9]|710)\d$/,
    	  'fi-FI': /^\d{6}[-+A]\d{3}[0-9A-FHJ-NPR-Y]$/i,
    	  'fr-BE': /^\d{11}$/,
    	  'fr-FR': /^[0-3]\d{12}$|^[0-3]\d\s\d{2}(\s\d{3}){3}$/,
    	  // Conforms both to official spec and provided example
    	  'fr-LU': /^\d{13}$/,
    	  'hr-HR': /^\d{11}$/,
    	  'hu-HU': /^8\d{9}$/,
    	  'it-IT': /^[A-Z]{6}[L-NP-V0-9]{2}[A-EHLMPRST][L-NP-V0-9]{2}[A-ILMZ][L-NP-V0-9]{3}[A-Z]$/i,
    	  'lv-LV': /^\d{6}-{0,1}\d{5}$/,
    	  // Conforms both to DG TAXUD spec and original research
    	  'mt-MT': /^\d{3,7}[APMGLHBZ]$|^([1-8])\1\d{7}$/i,
    	  'nl-NL': /^\d{9}$/,
    	  'pl-PL': /^\d{10,11}$/,
    	  'pt-BR': /(?:^\d{11}$)|(?:^\d{14}$)/,
    	  'pt-PT': /^\d{9}$/,
    	  'ro-RO': /^\d{13}$/,
    	  'sk-SK': /^\d{6}\/{0,1}\d{3,4}$/,
    	  'sl-SI': /^[1-9]\d{7}$/,
    	  'sv-SE': /^(\d{6}[-+]{0,1}\d{4}|(18|19|20)\d{6}[-+]{0,1}\d{4})$/
    	}; // taxIdFormat locale aliases

    	taxIdFormat['lb-LU'] = taxIdFormat['fr-LU'];
    	taxIdFormat['lt-LT'] = taxIdFormat['et-EE'];
    	taxIdFormat['nl-BE'] = taxIdFormat['fr-BE']; // Algorithmic tax id check functions for various locales

    	var taxIdCheck = {
    	  'bg-BG': bgBgCheck,
    	  'cs-CZ': csCzCheck,
    	  'de-AT': deAtCheck,
    	  'de-DE': deDeCheck,
    	  'dk-DK': dkDkCheck,
    	  'el-CY': elCyCheck,
    	  'el-GR': elGrCheck,
    	  'en-IE': enIeCheck,
    	  'en-US': enUsCheck,
    	  'es-ES': esEsCheck,
    	  'et-EE': etEeCheck,
    	  'fi-FI': fiFiCheck,
    	  'fr-BE': frBeCheck,
    	  'fr-FR': frFrCheck,
    	  'fr-LU': frLuCheck,
    	  'hr-HR': hrHrCheck,
    	  'hu-HU': huHuCheck,
    	  'it-IT': itItCheck,
    	  'lv-LV': lvLvCheck,
    	  'mt-MT': mtMtCheck,
    	  'nl-NL': nlNlCheck,
    	  'pl-PL': plPlCheck,
    	  'pt-BR': ptBrCheck,
    	  'pt-PT': ptPtCheck,
    	  'ro-RO': roRoCheck,
    	  'sk-SK': skSkCheck,
    	  'sl-SI': slSiCheck,
    	  'sv-SE': svSeCheck
    	}; // taxIdCheck locale aliases

    	taxIdCheck['lb-LU'] = taxIdCheck['fr-LU'];
    	taxIdCheck['lt-LT'] = taxIdCheck['et-EE'];
    	taxIdCheck['nl-BE'] = taxIdCheck['fr-BE']; // Regexes for locales where characters should be omitted before checking format

    	var allsymbols = /[-\\\/!@#$%\^&\*\(\)\+\=\[\]]+/g;
    	var sanitizeRegexes = {
    	  'de-AT': allsymbols,
    	  'de-DE': /[\/\\]/g,
    	  'fr-BE': allsymbols
    	}; // sanitizeRegexes locale aliases

    	sanitizeRegexes['nl-BE'] = sanitizeRegexes['fr-BE'];
    	/*
    	 * Validator function
    	 * Return true if the passed string is a valid tax identification number
    	 * for the specified locale.
    	 * Throw an error exception if the locale is not supported.
    	 */

    	function isTaxID(str) {
    	  var locale = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'en-US';
    	  (0, _assertString.default)(str); // Copy TIN to avoid replacement if sanitized

    	  var strcopy = str.slice(0);

    	  if (locale in taxIdFormat) {
    	    if (locale in sanitizeRegexes) {
    	      strcopy = strcopy.replace(sanitizeRegexes[locale], '');
    	    }

    	    if (!taxIdFormat[locale].test(strcopy)) {
    	      return false;
    	    }

    	    if (locale in taxIdCheck) {
    	      return taxIdCheck[locale](strcopy);
    	    } // Fallthrough; not all locales have algorithmic checks


    	    return true;
    	  }

    	  throw new Error("Invalid locale '".concat(locale, "'"));
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isTaxID, isTaxID.exports));

    var isTaxIDValidator = /*@__PURE__*/getDefaultExportFromCjs(isTaxID.exports);

    var isISO4217$1 = {};

    Object.defineProperty(isISO4217$1, "__esModule", {
      value: true
    });
    var _default = isISO4217$1.default = isISO4217;
    isISO4217$1.CurrencyCodes = void 0;

    var _assertString$1 = _interopRequireDefault$1(assertString.exports);

    function _interopRequireDefault$1(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    // from https://en.wikipedia.org/wiki/ISO_4217
    var validISO4217CurrencyCodes = new Set(['AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BOV', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHE', 'CHF', 'CHW', 'CLF', 'CLP', 'CNY', 'COP', 'COU', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MXV', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'USN', 'UYI', 'UYU', 'UYW', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XAG', 'XAU', 'XBA', 'XBB', 'XBC', 'XBD', 'XCD', 'XDR', 'XOF', 'XPD', 'XPF', 'XPT', 'XSU', 'XTS', 'XUA', 'XXX', 'YER', 'ZAR', 'ZMW', 'ZWL']);

    function isISO4217(str) {
      (0, _assertString$1.default)(str);
      return validISO4217CurrencyCodes.has(str.toUpperCase());
    }

    var CurrencyCodes = validISO4217CurrencyCodes;
    isISO4217$1.CurrencyCodes = CurrencyCodes;

    var isBase58$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isBase58;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	// Accepted chars - 123456789ABCDEFGH JKLMN PQRSTUVWXYZabcdefghijk mnopqrstuvwxyz
    	var base58Reg = /^[A-HJ-NP-Za-km-z1-9]*$/;

    	function isBase58(str) {
    	  (0, _assertString.default)(str);

    	  if (base58Reg.test(str)) {
    	    return true;
    	  }

    	  return false;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isBase58$1, isBase58$1.exports));

    var isBase58Validator = /*@__PURE__*/getDefaultExportFromCjs(isBase58$1.exports);

    var ltrim = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = ltrim;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function ltrim(str, chars) {
    	  (0, _assertString.default)(str); // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping

    	  var pattern = chars ? new RegExp("^[".concat(chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "]+"), 'g') : /^\s+/g;
    	  return str.replace(pattern, '');
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (ltrim, ltrim.exports));

    var rtrim = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = rtrim;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function rtrim(str, chars) {
    	  (0, _assertString.default)(str);

    	  if (chars) {
    	    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
    	    var pattern = new RegExp("[".concat(chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "]+$"), 'g');
    	    return str.replace(pattern, '');
    	  } // Use a faster and more safe than regex trim method https://blog.stevenlevithan.com/archives/faster-trim-javascript


    	  var strIndex = str.length - 1;

    	  while (/\s/.test(str.charAt(strIndex))) {
    	    strIndex -= 1;
    	  }

    	  return str.slice(0, strIndex + 1);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (rtrim, rtrim.exports));

    var trim = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = trim;

    	var _rtrim = _interopRequireDefault(rtrim.exports);

    	var _ltrim = _interopRequireDefault(ltrim.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function trim(str, chars) {
    	  return (0, _rtrim.default)((0, _ltrim.default)(str, chars), chars);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (trim, trim.exports));

    var _escape = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = escape;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function escape(str) {
    	  (0, _assertString.default)(str);
    	  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\//g, '&#x2F;').replace(/\\/g, '&#x5C;').replace(/`/g, '&#96;');
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (_escape, _escape.exports));

    var _unescape = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = unescape;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function unescape(str) {
    	  (0, _assertString.default)(str);
    	  return str.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x2F;/g, '/').replace(/&#x5C;/g, '\\').replace(/&#96;/g, '`').replace(/&amp;/g, '&'); // &amp; replacement has to be the last one to prevent
    	  // bugs with intermediate strings containing escape sequences
    	  // See: https://github.com/validatorjs/validator.js/issues/1827
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (_unescape, _unescape.exports));

    var stripLow = {exports: {}};

    var blacklist = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = blacklist;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function blacklist(str, chars) {
    	  (0, _assertString.default)(str);
    	  return str.replace(new RegExp("[".concat(chars, "]+"), 'g'), '');
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (blacklist, blacklist.exports));

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = stripLow;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	var _blacklist = _interopRequireDefault(blacklist.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function stripLow(str, keep_new_lines) {
    	  (0, _assertString.default)(str);
    	  var chars = keep_new_lines ? '\\x00-\\x09\\x0B\\x0C\\x0E-\\x1F\\x7F' : '\\x00-\\x1F\\x7F';
    	  return (0, _blacklist.default)(str, chars);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (stripLow, stripLow.exports));

    var whitelist = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = whitelist;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function whitelist(str, chars) {
    	  (0, _assertString.default)(str);
    	  return str.replace(new RegExp("[^".concat(chars, "]+"), 'g'), '');
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (whitelist, whitelist.exports));

    var isWhitelisted = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isWhitelisted;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	function isWhitelisted(str, chars) {
    	  (0, _assertString.default)(str);

    	  for (var i = str.length - 1; i >= 0; i--) {
    	    if (chars.indexOf(str[i]) === -1) {
    	      return false;
    	    }
    	  }

    	  return true;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isWhitelisted, isWhitelisted.exports));

    var normalizeEmail = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = normalizeEmail;

    	var _merge = _interopRequireDefault(merge.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var default_normalize_email_options = {
    	  // The following options apply to all email addresses
    	  // Lowercases the local part of the email address.
    	  // Please note this may violate RFC 5321 as per http://stackoverflow.com/a/9808332/192024).
    	  // The domain is always lowercased, as per RFC 1035
    	  all_lowercase: true,
    	  // The following conversions are specific to GMail
    	  // Lowercases the local part of the GMail address (known to be case-insensitive)
    	  gmail_lowercase: true,
    	  // Removes dots from the local part of the email address, as that's ignored by GMail
    	  gmail_remove_dots: true,
    	  // Removes the subaddress (e.g. "+foo") from the email address
    	  gmail_remove_subaddress: true,
    	  // Conversts the googlemail.com domain to gmail.com
    	  gmail_convert_googlemaildotcom: true,
    	  // The following conversions are specific to Outlook.com / Windows Live / Hotmail
    	  // Lowercases the local part of the Outlook.com address (known to be case-insensitive)
    	  outlookdotcom_lowercase: true,
    	  // Removes the subaddress (e.g. "+foo") from the email address
    	  outlookdotcom_remove_subaddress: true,
    	  // The following conversions are specific to Yahoo
    	  // Lowercases the local part of the Yahoo address (known to be case-insensitive)
    	  yahoo_lowercase: true,
    	  // Removes the subaddress (e.g. "-foo") from the email address
    	  yahoo_remove_subaddress: true,
    	  // The following conversions are specific to Yandex
    	  // Lowercases the local part of the Yandex address (known to be case-insensitive)
    	  yandex_lowercase: true,
    	  // The following conversions are specific to iCloud
    	  // Lowercases the local part of the iCloud address (known to be case-insensitive)
    	  icloud_lowercase: true,
    	  // Removes the subaddress (e.g. "+foo") from the email address
    	  icloud_remove_subaddress: true
    	}; // List of domains used by iCloud

    	var icloud_domains = ['icloud.com', 'me.com']; // List of domains used by Outlook.com and its predecessors
    	// This list is likely incomplete.
    	// Partial reference:
    	// https://blogs.office.com/2013/04/17/outlook-com-gets-two-step-verification-sign-in-by-alias-and-new-international-domains/

    	var outlookdotcom_domains = ['hotmail.at', 'hotmail.be', 'hotmail.ca', 'hotmail.cl', 'hotmail.co.il', 'hotmail.co.nz', 'hotmail.co.th', 'hotmail.co.uk', 'hotmail.com', 'hotmail.com.ar', 'hotmail.com.au', 'hotmail.com.br', 'hotmail.com.gr', 'hotmail.com.mx', 'hotmail.com.pe', 'hotmail.com.tr', 'hotmail.com.vn', 'hotmail.cz', 'hotmail.de', 'hotmail.dk', 'hotmail.es', 'hotmail.fr', 'hotmail.hu', 'hotmail.id', 'hotmail.ie', 'hotmail.in', 'hotmail.it', 'hotmail.jp', 'hotmail.kr', 'hotmail.lv', 'hotmail.my', 'hotmail.ph', 'hotmail.pt', 'hotmail.sa', 'hotmail.sg', 'hotmail.sk', 'live.be', 'live.co.uk', 'live.com', 'live.com.ar', 'live.com.mx', 'live.de', 'live.es', 'live.eu', 'live.fr', 'live.it', 'live.nl', 'msn.com', 'outlook.at', 'outlook.be', 'outlook.cl', 'outlook.co.il', 'outlook.co.nz', 'outlook.co.th', 'outlook.com', 'outlook.com.ar', 'outlook.com.au', 'outlook.com.br', 'outlook.com.gr', 'outlook.com.pe', 'outlook.com.tr', 'outlook.com.vn', 'outlook.cz', 'outlook.de', 'outlook.dk', 'outlook.es', 'outlook.fr', 'outlook.hu', 'outlook.id', 'outlook.ie', 'outlook.in', 'outlook.it', 'outlook.jp', 'outlook.kr', 'outlook.lv', 'outlook.my', 'outlook.ph', 'outlook.pt', 'outlook.sa', 'outlook.sg', 'outlook.sk', 'passport.com']; // List of domains used by Yahoo Mail
    	// This list is likely incomplete

    	var yahoo_domains = ['rocketmail.com', 'yahoo.ca', 'yahoo.co.uk', 'yahoo.com', 'yahoo.de', 'yahoo.fr', 'yahoo.in', 'yahoo.it', 'ymail.com']; // List of domains used by yandex.ru

    	var yandex_domains = ['yandex.ru', 'yandex.ua', 'yandex.kz', 'yandex.com', 'yandex.by', 'ya.ru']; // replace single dots, but not multiple consecutive dots

    	function dotsReplacer(match) {
    	  if (match.length > 1) {
    	    return match;
    	  }

    	  return '';
    	}

    	function normalizeEmail(email, options) {
    	  options = (0, _merge.default)(options, default_normalize_email_options);
    	  var raw_parts = email.split('@');
    	  var domain = raw_parts.pop();
    	  var user = raw_parts.join('@');
    	  var parts = [user, domain]; // The domain is always lowercased, as it's case-insensitive per RFC 1035

    	  parts[1] = parts[1].toLowerCase();

    	  if (parts[1] === 'gmail.com' || parts[1] === 'googlemail.com') {
    	    // Address is GMail
    	    if (options.gmail_remove_subaddress) {
    	      parts[0] = parts[0].split('+')[0];
    	    }

    	    if (options.gmail_remove_dots) {
    	      // this does not replace consecutive dots like example..email@gmail.com
    	      parts[0] = parts[0].replace(/\.+/g, dotsReplacer);
    	    }

    	    if (!parts[0].length) {
    	      return false;
    	    }

    	    if (options.all_lowercase || options.gmail_lowercase) {
    	      parts[0] = parts[0].toLowerCase();
    	    }

    	    parts[1] = options.gmail_convert_googlemaildotcom ? 'gmail.com' : parts[1];
    	  } else if (icloud_domains.indexOf(parts[1]) >= 0) {
    	    // Address is iCloud
    	    if (options.icloud_remove_subaddress) {
    	      parts[0] = parts[0].split('+')[0];
    	    }

    	    if (!parts[0].length) {
    	      return false;
    	    }

    	    if (options.all_lowercase || options.icloud_lowercase) {
    	      parts[0] = parts[0].toLowerCase();
    	    }
    	  } else if (outlookdotcom_domains.indexOf(parts[1]) >= 0) {
    	    // Address is Outlook.com
    	    if (options.outlookdotcom_remove_subaddress) {
    	      parts[0] = parts[0].split('+')[0];
    	    }

    	    if (!parts[0].length) {
    	      return false;
    	    }

    	    if (options.all_lowercase || options.outlookdotcom_lowercase) {
    	      parts[0] = parts[0].toLowerCase();
    	    }
    	  } else if (yahoo_domains.indexOf(parts[1]) >= 0) {
    	    // Address is Yahoo
    	    if (options.yahoo_remove_subaddress) {
    	      var components = parts[0].split('-');
    	      parts[0] = components.length > 1 ? components.slice(0, -1).join('-') : components[0];
    	    }

    	    if (!parts[0].length) {
    	      return false;
    	    }

    	    if (options.all_lowercase || options.yahoo_lowercase) {
    	      parts[0] = parts[0].toLowerCase();
    	    }
    	  } else if (yandex_domains.indexOf(parts[1]) >= 0) {
    	    if (options.all_lowercase || options.yandex_lowercase) {
    	      parts[0] = parts[0].toLowerCase();
    	    }

    	    parts[1] = 'yandex.ru'; // all yandex domains are equal, 1st preferred
    	  } else if (options.all_lowercase) {
    	    // Any other address
    	    parts[0] = parts[0].toLowerCase();
    	  }

    	  return parts.join('@');
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (normalizeEmail, normalizeEmail.exports));

    var isSlug = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isSlug;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var charsetRegex = /^[^\s-_](?!.*?[-_]{2,})[a-z0-9-\\][^\s]*[^-_\s]$/;

    	function isSlug(str) {
    	  (0, _assertString.default)(str);
    	  return charsetRegex.test(str);
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isSlug, isSlug.exports));

    var isLicensePlate = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isLicensePlate;

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var validators = {
    	  'cs-CZ': function csCZ(str) {
    	    return /^(([ABCDEFHKIJKLMNPRSTUVXYZ]|[0-9])-?){5,8}$/.test(str);
    	  },
    	  'de-DE': function deDE(str) {
    	    return /^((AW|UL|AK|GA|AÖ|LF|AZ|AM|AS|ZE|AN|AB|A|KG|KH|BA|EW|BZ|HY|KM|BT|HP|B|BC|BI|BO|FN|TT|ÜB|BN|AH|BS|FR|HB|ZZ|BB|BK|BÖ|OC|OK|CW|CE|C|CO|LH|CB|KW|LC|LN|DA|DI|DE|DH|SY|NÖ|DO|DD|DU|DN|D|EI|EA|EE|FI|EM|EL|EN|PF|ED|EF|ER|AU|ZP|E|ES|NT|EU|FL|FO|FT|FF|F|FS|FD|FÜ|GE|G|GI|GF|GS|ZR|GG|GP|GR|NY|ZI|GÖ|GZ|GT|HA|HH|HM|HU|WL|HZ|WR|RN|HK|HD|HN|HS|GK|HE|HF|RZ|HI|HG|HO|HX|IK|IL|IN|J|JL|KL|KA|KS|KF|KE|KI|KT|KO|KN|KR|KC|KU|K|LD|LL|LA|L|OP|LM|LI|LB|LU|LÖ|HL|LG|MD|GN|MZ|MA|ML|MR|MY|AT|DM|MC|NZ|RM|RG|MM|ME|MB|MI|FG|DL|HC|MW|RL|MK|MG|MÜ|WS|MH|M|MS|NU|NB|ND|NM|NK|NW|NR|NI|NF|DZ|EB|OZ|TG|TO|N|OA|GM|OB|CA|EH|FW|OF|OL|OE|OG|BH|LR|OS|AA|GD|OH|KY|NP|WK|PB|PA|PE|PI|PS|P|PM|PR|RA|RV|RE|R|H|SB|WN|RS|RD|RT|BM|NE|GV|RP|SU|GL|RO|GÜ|RH|EG|RW|PN|SK|MQ|RU|SZ|RI|SL|SM|SC|HR|FZ|VS|SW|SN|CR|SE|SI|SO|LP|SG|NH|SP|IZ|ST|BF|TE|HV|OD|SR|S|AC|DW|ZW|TF|TS|TR|TÜ|UM|PZ|TP|UE|UN|UH|MN|KK|VB|V|AE|PL|RC|VG|GW|PW|VR|VK|KB|WA|WT|BE|WM|WE|AP|MO|WW|FB|WZ|WI|WB|JE|WF|WO|W|WÜ|BL|Z|GC)[- ]?[A-Z]{1,2}[- ]?\d{1,4}|(AIC|FDB|ABG|SLN|SAW|KLZ|BUL|ESB|NAB|SUL|WST|ABI|AZE|BTF|KÖT|DKB|FEU|ROT|ALZ|SMÜ|WER|AUR|NOR|DÜW|BRK|HAB|TÖL|WOR|BAD|BAR|BER|BIW|EBS|KEM|MÜB|PEG|BGL|BGD|REI|WIL|BKS|BIR|WAT|BOR|BOH|BOT|BRB|BLK|HHM|NEB|NMB|WSF|LEO|HDL|WMS|WZL|BÜS|CHA|KÖZ|ROD|WÜM|CLP|NEC|COC|ZEL|COE|CUX|DAH|LDS|DEG|DEL|RSL|DLG|DGF|LAN|HEI|MED|DON|KIB|ROK|JÜL|MON|SLE|EBE|EIC|HIG|WBS|BIT|PRÜ|LIB|EMD|WIT|ERH|HÖS|ERZ|ANA|ASZ|MAB|MEK|STL|SZB|FDS|HCH|HOR|WOL|FRG|GRA|WOS|FRI|FFB|GAP|GER|BRL|CLZ|GTH|NOH|HGW|GRZ|LÖB|NOL|WSW|DUD|HMÜ|OHA|KRU|HAL|HAM|HBS|QLB|HVL|NAU|HAS|EBN|GEO|HOH|HDH|ERK|HER|WAN|HEF|ROF|HBN|ALF|HSK|USI|NAI|REH|SAN|KÜN|ÖHR|HOL|WAR|ARN|BRG|GNT|HOG|WOH|KEH|MAI|PAR|RID|ROL|KLE|GEL|KUS|KYF|ART|SDH|LDK|DIL|MAL|VIB|LER|BNA|GHA|GRM|MTL|WUR|LEV|LIF|STE|WEL|LIP|VAI|LUP|HGN|LBZ|LWL|PCH|STB|DAN|MKK|SLÜ|MSP|TBB|MGH|MTK|BIN|MSH|EIL|HET|SGH|BID|MYK|MSE|MST|MÜR|WRN|MEI|GRH|RIE|MZG|MIL|OBB|BED|FLÖ|MOL|FRW|SEE|SRB|AIB|MOS|BCH|ILL|SOB|NMS|NEA|SEF|UFF|NEW|VOH|NDH|TDO|NWM|GDB|GVM|WIS|NOM|EIN|GAN|LAU|HEB|OHV|OSL|SFB|ERB|LOS|BSK|KEL|BSB|MEL|WTL|OAL|FÜS|MOD|OHZ|OPR|BÜR|PAF|PLÖ|CAS|GLA|REG|VIT|ECK|SIM|GOA|EMS|DIZ|GOH|RÜD|SWA|NES|KÖN|MET|LRO|BÜZ|DBR|ROS|TET|HRO|ROW|BRV|HIP|PAN|GRI|SHK|EIS|SRO|SOK|LBS|SCZ|MER|QFT|SLF|SLS|HOM|SLK|ASL|BBG|SBK|SFT|SHG|MGN|MEG|ZIG|SAD|NEN|OVI|SHA|BLB|SIG|SON|SPN|FOR|GUB|SPB|IGB|WND|STD|STA|SDL|OBG|HST|BOG|SHL|PIR|FTL|SEB|SÖM|SÜW|TIR|SAB|TUT|ANG|SDT|LÜN|LSZ|MHL|VEC|VER|VIE|OVL|ANK|OVP|SBG|UEM|UER|WLG|GMN|NVP|RDG|RÜG|DAU|FKB|WAF|WAK|SLZ|WEN|SOG|APD|WUG|GUN|ESW|WIZ|WES|DIN|BRA|BÜD|WHV|HWI|GHC|WTM|WOB|WUN|MAK|SEL|OCH|HOT|WDA)[- ]?(([A-Z][- ]?\d{1,4})|([A-Z]{2}[- ]?\d{1,3})))[- ]?(E|H)?$/.test(str);
    	  },
    	  'de-LI': function deLI(str) {
    	    return /^FL[- ]?\d{1,5}[UZ]?$/.test(str);
    	  },
    	  'fi-FI': function fiFI(str) {
    	    return /^(?=.{4,7})(([A-Z]{1,3}|[0-9]{1,3})[\s-]?([A-Z]{1,3}|[0-9]{1,5}))$/.test(str);
    	  },
    	  'pt-PT': function ptPT(str) {
    	    return /^([A-Z]{2}|[0-9]{2})[ -·]?([A-Z]{2}|[0-9]{2})[ -·]?([A-Z]{2}|[0-9]{2})$/.test(str);
    	  },
    	  'sq-AL': function sqAL(str) {
    	    return /^[A-Z]{2}[- ]?((\d{3}[- ]?(([A-Z]{2})|T))|(R[- ]?\d{3}))$/.test(str);
    	  },
    	  'pt-BR': function ptBR(str) {
    	    return /^[A-Z]{3}[ -]?[0-9][A-Z][0-9]{2}|[A-Z]{3}[ -]?[0-9]{4}$/.test(str);
    	  }
    	};

    	function isLicensePlate(str, locale) {
    	  (0, _assertString.default)(str);

    	  if (locale in validators) {
    	    return validators[locale](str);
    	  } else if (locale === 'any') {
    	    for (var key in validators) {
    	      /* eslint guard-for-in: 0 */
    	      var validator = validators[key];

    	      if (validator(str)) {
    	        return true;
    	      }
    	    }

    	    return false;
    	  }

    	  throw new Error("Invalid locale '".concat(locale, "'"));
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isLicensePlate, isLicensePlate.exports));

    var isStrongPassword$1 = {exports: {}};

    (function (module, exports) {

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = isStrongPassword;

    	var _merge = _interopRequireDefault(merge.exports);

    	var _assertString = _interopRequireDefault(assertString.exports);

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var upperCaseRegex = /^[A-Z]$/;
    	var lowerCaseRegex = /^[a-z]$/;
    	var numberRegex = /^[0-9]$/;
    	var symbolRegex = /^[-#!$@%^&*()_+|~=`{}\[\]:";'<>?,.\/ ]$/;
    	var defaultOptions = {
    	  minLength: 8,
    	  minLowercase: 1,
    	  minUppercase: 1,
    	  minNumbers: 1,
    	  minSymbols: 1,
    	  returnScore: false,
    	  pointsPerUnique: 1,
    	  pointsPerRepeat: 0.5,
    	  pointsForContainingLower: 10,
    	  pointsForContainingUpper: 10,
    	  pointsForContainingNumber: 10,
    	  pointsForContainingSymbol: 10
    	};
    	/* Counts number of occurrences of each char in a string
    	 * could be moved to util/ ?
    	*/

    	function countChars(str) {
    	  var result = {};
    	  Array.from(str).forEach(function (char) {
    	    var curVal = result[char];

    	    if (curVal) {
    	      result[char] += 1;
    	    } else {
    	      result[char] = 1;
    	    }
    	  });
    	  return result;
    	}
    	/* Return information about a password */


    	function analyzePassword(password) {
    	  var charMap = countChars(password);
    	  var analysis = {
    	    length: password.length,
    	    uniqueChars: Object.keys(charMap).length,
    	    uppercaseCount: 0,
    	    lowercaseCount: 0,
    	    numberCount: 0,
    	    symbolCount: 0
    	  };
    	  Object.keys(charMap).forEach(function (char) {
    	    /* istanbul ignore else */
    	    if (upperCaseRegex.test(char)) {
    	      analysis.uppercaseCount += charMap[char];
    	    } else if (lowerCaseRegex.test(char)) {
    	      analysis.lowercaseCount += charMap[char];
    	    } else if (numberRegex.test(char)) {
    	      analysis.numberCount += charMap[char];
    	    } else if (symbolRegex.test(char)) {
    	      analysis.symbolCount += charMap[char];
    	    }
    	  });
    	  return analysis;
    	}

    	function scorePassword(analysis, scoringOptions) {
    	  var points = 0;
    	  points += analysis.uniqueChars * scoringOptions.pointsPerUnique;
    	  points += (analysis.length - analysis.uniqueChars) * scoringOptions.pointsPerRepeat;

    	  if (analysis.lowercaseCount > 0) {
    	    points += scoringOptions.pointsForContainingLower;
    	  }

    	  if (analysis.uppercaseCount > 0) {
    	    points += scoringOptions.pointsForContainingUpper;
    	  }

    	  if (analysis.numberCount > 0) {
    	    points += scoringOptions.pointsForContainingNumber;
    	  }

    	  if (analysis.symbolCount > 0) {
    	    points += scoringOptions.pointsForContainingSymbol;
    	  }

    	  return points;
    	}

    	function isStrongPassword(str) {
    	  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    	  (0, _assertString.default)(str);
    	  var analysis = analyzePassword(str);
    	  options = (0, _merge.default)(options || {}, defaultOptions);

    	  if (options.returnScore) {
    	    return scorePassword(analysis, options);
    	  }

    	  return analysis.length >= options.minLength && analysis.lowercaseCount >= options.minLowercase && analysis.uppercaseCount >= options.minUppercase && analysis.numberCount >= options.minNumbers && analysis.symbolCount >= options.minSymbols;
    	}

    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (isStrongPassword$1, isStrongPassword$1.exports));

    var isVAT$1 = {};

    Object.defineProperty(isVAT$1, "__esModule", {
      value: true
    });
    isVAT$1.default = isVAT;
    isVAT$1.vatMatchers = void 0;

    var _assertString = _interopRequireDefault(assertString.exports);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var vatMatchers = {
      GB: /^GB((\d{3} \d{4} ([0-8][0-9]|9[0-6]))|(\d{9} \d{3})|(((GD[0-4])|(HA[5-9]))[0-9]{2}))$/,
      IT: /^(IT)?[0-9]{11}$/,
      NL: /^(NL)?[0-9]{9}B[0-9]{2}$/
    };
    isVAT$1.vatMatchers = vatMatchers;

    function isVAT(str, countryCode) {
      (0, _assertString.default)(str);
      (0, _assertString.default)(countryCode);

      if (countryCode in vatMatchers) {
        return vatMatchers[countryCode].test(str);
      }

      throw new Error("Invalid country code: '".concat(countryCode, "'"));
    }

    (function (module, exports) {

    	function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    	Object.defineProperty(exports, "__esModule", {
    	  value: true
    	});
    	exports.default = void 0;

    	var _toDate = _interopRequireDefault(toDate.exports);

    	var _toFloat = _interopRequireDefault(toFloat.exports);

    	var _toInt = _interopRequireDefault(toInt.exports);

    	var _toBoolean = _interopRequireDefault(toBoolean.exports);

    	var _equals = _interopRequireDefault(equals.exports);

    	var _contains = _interopRequireDefault(contains$1.exports);

    	var _matches = _interopRequireDefault(matches$1.exports);

    	var _isEmail = _interopRequireDefault(isEmail$1.exports);

    	var _isURL = _interopRequireDefault(isURL$1.exports);

    	var _isMACAddress = _interopRequireDefault(isMACAddress$1.exports);

    	var _isIP = _interopRequireDefault(isIP$1.exports);

    	var _isIPRange = _interopRequireDefault(isIPRange.exports);

    	var _isFQDN = _interopRequireDefault(isFQDN$1.exports);

    	var _isDate = _interopRequireDefault(isDate$1.exports);

    	var _isBoolean = _interopRequireDefault(isBoolean$1.exports);

    	var _isLocale = _interopRequireDefault(isLocale$1.exports);

    	var _isAlpha = _interopRequireWildcard(isAlpha$2);

    	var _isAlphanumeric = _interopRequireWildcard(isAlphanumeric$2);

    	var _isNumeric = _interopRequireDefault(isNumeric.exports);

    	var _isPassportNumber = _interopRequireDefault(isPassportNumber$1.exports);

    	var _isPort = _interopRequireDefault(isPort$1.exports);

    	var _isLowercase = _interopRequireDefault(isLowercase$1.exports);

    	var _isUppercase = _interopRequireDefault(isUppercase$1.exports);

    	var _isIMEI = _interopRequireDefault(isIMEI.exports);

    	var _isAscii = _interopRequireDefault(isAscii$1.exports);

    	var _isFullWidth = _interopRequireDefault(isFullWidth$2);

    	var _isHalfWidth = _interopRequireDefault(isHalfWidth$2);

    	var _isVariableWidth = _interopRequireDefault(isVariableWidth$1.exports);

    	var _isMultibyte = _interopRequireDefault(isMultibyte$1.exports);

    	var _isSemVer = _interopRequireDefault(isSemVer$1.exports);

    	var _isSurrogatePair = _interopRequireDefault(isSurrogatePair$1.exports);

    	var _isInt = _interopRequireDefault(isInt$1.exports);

    	var _isFloat = _interopRequireWildcard(isFloat$1);

    	var _isDecimal = _interopRequireDefault(isDecimal$1.exports);

    	var _isHexadecimal = _interopRequireDefault(isHexadecimal$1.exports);

    	var _isOctal = _interopRequireDefault(isOctal$1.exports);

    	var _isDivisibleBy = _interopRequireDefault(isDivisibleBy$1.exports);

    	var _isHexColor = _interopRequireDefault(isHexColor$1.exports);

    	var _isRgbColor = _interopRequireDefault(isRgbColor$1.exports);

    	var _isHSL = _interopRequireDefault(isHSL$1.exports);

    	var _isISRC = _interopRequireDefault(isISRC$1.exports);

    	var _isIBAN = _interopRequireWildcard(isIBAN$2);

    	var _isBIC = _interopRequireDefault(isBIC$1.exports);

    	var _isMD = _interopRequireDefault(isMD5.exports);

    	var _isHash = _interopRequireDefault(isHash$1.exports);

    	var _isJWT = _interopRequireDefault(isJWT$1.exports);

    	var _isJSON = _interopRequireDefault(isJSON$1.exports);

    	var _isEmpty = _interopRequireDefault(isEmpty.exports);

    	var _isLength = _interopRequireDefault(isLength.exports);

    	var _isByteLength = _interopRequireDefault(isByteLength$1.exports);

    	var _isUUID = _interopRequireDefault(isUUID$1.exports);

    	var _isMongoId = _interopRequireDefault(isMongoId$1.exports);

    	var _isAfter = _interopRequireDefault(isAfter.exports);

    	var _isBefore = _interopRequireDefault(isBefore.exports);

    	var _isIn = _interopRequireDefault(isIn.exports);

    	var _isCreditCard = _interopRequireDefault(isCreditCard$1.exports);

    	var _isIdentityCard = _interopRequireDefault(isIdentityCard$1.exports);

    	var _isEAN = _interopRequireDefault(isEAN$1.exports);

    	var _isISIN = _interopRequireDefault(isISIN$1.exports);

    	var _isISBN = _interopRequireDefault(isISBN$1.exports);

    	var _isISSN = _interopRequireDefault(isISSN$1.exports);

    	var _isTaxID = _interopRequireDefault(isTaxID.exports);

    	var _isMobilePhone = _interopRequireWildcard(isMobilePhone$2);

    	var _isEthereumAddress = _interopRequireDefault(isEthereumAddress$1.exports);

    	var _isCurrency = _interopRequireDefault(isCurrency$1.exports);

    	var _isBtcAddress = _interopRequireDefault(isBtcAddress$1.exports);

    	var _isISO = _interopRequireDefault(isISO8601$1.exports);

    	var _isRFC = _interopRequireDefault(isRFC3339$1.exports);

    	var _isISO31661Alpha = _interopRequireDefault(isISO31661Alpha2$2);

    	var _isISO31661Alpha2 = _interopRequireDefault(isISO31661Alpha3$1.exports);

    	var _isISO2 = _interopRequireDefault(isISO4217$1);

    	var _isBase = _interopRequireDefault(isBase32$1.exports);

    	var _isBase2 = _interopRequireDefault(isBase58$1.exports);

    	var _isBase3 = _interopRequireDefault(isBase64$1.exports);

    	var _isDataURI = _interopRequireDefault(isDataURI$1.exports);

    	var _isMagnetURI = _interopRequireDefault(isMagnetURI$1.exports);

    	var _isMimeType = _interopRequireDefault(isMimeType$1.exports);

    	var _isLatLong = _interopRequireDefault(isLatLong$1.exports);

    	var _isPostalCode = _interopRequireWildcard(isPostalCode$2);

    	var _ltrim = _interopRequireDefault(ltrim.exports);

    	var _rtrim = _interopRequireDefault(rtrim.exports);

    	var _trim = _interopRequireDefault(trim.exports);

    	var _escape$1 = _interopRequireDefault(_escape.exports);

    	var _unescape$1 = _interopRequireDefault(_unescape.exports);

    	var _stripLow = _interopRequireDefault(stripLow.exports);

    	var _whitelist = _interopRequireDefault(whitelist.exports);

    	var _blacklist = _interopRequireDefault(blacklist.exports);

    	var _isWhitelisted = _interopRequireDefault(isWhitelisted.exports);

    	var _normalizeEmail = _interopRequireDefault(normalizeEmail.exports);

    	var _isSlug = _interopRequireDefault(isSlug.exports);

    	var _isLicensePlate = _interopRequireDefault(isLicensePlate.exports);

    	var _isStrongPassword = _interopRequireDefault(isStrongPassword$1.exports);

    	var _isVAT = _interopRequireDefault(isVAT$1);

    	function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

    	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

    	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    	var version = '13.7.0';
    	var validator = {
    	  version: version,
    	  toDate: _toDate.default,
    	  toFloat: _toFloat.default,
    	  toInt: _toInt.default,
    	  toBoolean: _toBoolean.default,
    	  equals: _equals.default,
    	  contains: _contains.default,
    	  matches: _matches.default,
    	  isEmail: _isEmail.default,
    	  isURL: _isURL.default,
    	  isMACAddress: _isMACAddress.default,
    	  isIP: _isIP.default,
    	  isIPRange: _isIPRange.default,
    	  isFQDN: _isFQDN.default,
    	  isBoolean: _isBoolean.default,
    	  isIBAN: _isIBAN.default,
    	  isBIC: _isBIC.default,
    	  isAlpha: _isAlpha.default,
    	  isAlphaLocales: _isAlpha.locales,
    	  isAlphanumeric: _isAlphanumeric.default,
    	  isAlphanumericLocales: _isAlphanumeric.locales,
    	  isNumeric: _isNumeric.default,
    	  isPassportNumber: _isPassportNumber.default,
    	  isPort: _isPort.default,
    	  isLowercase: _isLowercase.default,
    	  isUppercase: _isUppercase.default,
    	  isAscii: _isAscii.default,
    	  isFullWidth: _isFullWidth.default,
    	  isHalfWidth: _isHalfWidth.default,
    	  isVariableWidth: _isVariableWidth.default,
    	  isMultibyte: _isMultibyte.default,
    	  isSemVer: _isSemVer.default,
    	  isSurrogatePair: _isSurrogatePair.default,
    	  isInt: _isInt.default,
    	  isIMEI: _isIMEI.default,
    	  isFloat: _isFloat.default,
    	  isFloatLocales: _isFloat.locales,
    	  isDecimal: _isDecimal.default,
    	  isHexadecimal: _isHexadecimal.default,
    	  isOctal: _isOctal.default,
    	  isDivisibleBy: _isDivisibleBy.default,
    	  isHexColor: _isHexColor.default,
    	  isRgbColor: _isRgbColor.default,
    	  isHSL: _isHSL.default,
    	  isISRC: _isISRC.default,
    	  isMD5: _isMD.default,
    	  isHash: _isHash.default,
    	  isJWT: _isJWT.default,
    	  isJSON: _isJSON.default,
    	  isEmpty: _isEmpty.default,
    	  isLength: _isLength.default,
    	  isLocale: _isLocale.default,
    	  isByteLength: _isByteLength.default,
    	  isUUID: _isUUID.default,
    	  isMongoId: _isMongoId.default,
    	  isAfter: _isAfter.default,
    	  isBefore: _isBefore.default,
    	  isIn: _isIn.default,
    	  isCreditCard: _isCreditCard.default,
    	  isIdentityCard: _isIdentityCard.default,
    	  isEAN: _isEAN.default,
    	  isISIN: _isISIN.default,
    	  isISBN: _isISBN.default,
    	  isISSN: _isISSN.default,
    	  isMobilePhone: _isMobilePhone.default,
    	  isMobilePhoneLocales: _isMobilePhone.locales,
    	  isPostalCode: _isPostalCode.default,
    	  isPostalCodeLocales: _isPostalCode.locales,
    	  isEthereumAddress: _isEthereumAddress.default,
    	  isCurrency: _isCurrency.default,
    	  isBtcAddress: _isBtcAddress.default,
    	  isISO8601: _isISO.default,
    	  isRFC3339: _isRFC.default,
    	  isISO31661Alpha2: _isISO31661Alpha.default,
    	  isISO31661Alpha3: _isISO31661Alpha2.default,
    	  isISO4217: _isISO2.default,
    	  isBase32: _isBase.default,
    	  isBase58: _isBase2.default,
    	  isBase64: _isBase3.default,
    	  isDataURI: _isDataURI.default,
    	  isMagnetURI: _isMagnetURI.default,
    	  isMimeType: _isMimeType.default,
    	  isLatLong: _isLatLong.default,
    	  ltrim: _ltrim.default,
    	  rtrim: _rtrim.default,
    	  trim: _trim.default,
    	  escape: _escape$1.default,
    	  unescape: _unescape$1.default,
    	  stripLow: _stripLow.default,
    	  whitelist: _whitelist.default,
    	  blacklist: _blacklist.default,
    	  isWhitelisted: _isWhitelisted.default,
    	  normalizeEmail: _normalizeEmail.default,
    	  toString: toString,
    	  isSlug: _isSlug.default,
    	  isStrongPassword: _isStrongPassword.default,
    	  isTaxID: _isTaxID.default,
    	  isDate: _isDate.default,
    	  isLicensePlate: _isLicensePlate.default,
    	  isVAT: _isVAT.default,
    	  ibanLocales: _isIBAN.locales
    	};
    	var _default = validator;
    	exports.default = _default;
    	module.exports = exports.default;
    	module.exports.default = exports.default;
    } (validator$1, validator$1.exports));

    var validator = /*@__PURE__*/getDefaultExportFromCjs(validator$1.exports);

    var IS_STRONG_PASSWORD = 'isStrongPassword';
    /**
     * Checks if the string is a strong password.
     * If given value is not a string, then it returns false.
     */
    function isStrongPassword(value, options) {
        return typeof value === 'string' && validator.isStrongPassword(value, options);
    }
    /**
     * Checks if the string is a strong password.
     * If given value is not a string, then it returns false.
     */
    function IsStrongPassword(options, validationOptions) {
        return ValidateBy({
            name: IS_STRONG_PASSWORD,
            constraints: [options],
            validator: {
                validate: function (value, args) { return isStrongPassword(value, args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property is not strong enough'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_TIMEZONE = 'isTimeZone';
    /**
     * Checks if the string represents a valid IANA timezone
     * If the given value is not a valid IANA timezone, then it returns false.
     */
    function isTimeZone(value) {
        try {
            if (typeof value !== 'string') {
                return false;
            }
            /** Specifying an invalid time-zone will raise a `RangeError: Invalid time zone specified` error. */
            Intl.DateTimeFormat(undefined, { timeZone: value });
            return true;
        }
        catch (exception) {
            return false;
        }
    }
    /**
     * Checks if the string represents a valid IANA timezone
     * If the given value is not a valid IANA timezone, then it returns false.
     */
    function IsTimeZone(validationOptions) {
        return ValidateBy({
            name: IS_TIMEZONE,
            validator: {
                validate: function (value, args) { return isTimeZone(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid IANA time-zone'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_BASE58 = 'isBase58';
    /**
     * Checks if a string is base58 encoded.
     * If given value is not a string, then it returns false.
     */
    function isBase58(value) {
        return typeof value === 'string' && isBase58Validator(value);
    }
    /**
     * Checks if a string is base58 encoded.
     * If given value is not a string, then it returns false.
     */
    function IsBase58(validationOptions) {
        return ValidateBy({
            name: IS_BASE58,
            validator: {
                validate: function (value, args) { return isBase58(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be base58 encoded'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_TAX_ID = 'isTaxId';
    /**
     * Checks if the string is a valid tax ID. Default locale is `en-US`.
     * If given value is not a string, then it returns false.
     *
     * Supported locales: bg-BG, cs-CZ, de-AT, de-DE, dk-DK, el-CY, el-GR, en-CA,
     * en-IE, en-US, es-ES, et-EE, fi-FI, fr-BE, fr-FR, fr-LU, hr-HR, hu-HU, it-IT,
     * lv-LV, mt-MT, nl-NL, pl-PL, pt-BR, pt-PT, ro-RO, sk-SK, sl-SI, sv-SE.
     */
    function isTaxId(value, locale) {
        return typeof value === 'string' && isTaxIDValidator(value, locale || 'en-US');
    }
    /**
     * Checks if the string is a valid tax ID. Default locale is `en-US`.
     * If given value is not a string, then it returns false.
     *
     * Supported locales: bg-BG, cs-CZ, de-AT, de-DE, dk-DK, el-CY, el-GR, en-CA,
     * en-IE, en-US, es-ES, et-EE, fi-FI, fr-BE, fr-FR, fr-LU, hr-HR, hu-HU, it-IT,
     * lv-LV, mt-MT, nl-NL, pl-PL, pt-BR, pt-PT, ro-RO, sk-SK, sl-SI, sv-SE.
     */
    function IsTaxId(locale, validationOptions) {
        return ValidateBy({
            name: IS_TAX_ID,
            constraints: [locale],
            validator: {
                validate: function (value, args) { return isTaxId(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a Tax Identification Number'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_ISO4217_CURRENCY_CODE = 'isISO4217CurrencyCode';
    /**
     * Check if the string is a valid [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) officially assigned currency code.
     */
    function isISO4217CurrencyCode(value) {
        return typeof value === 'string' && _default(value);
    }
    /**
     * Check if the string is a valid [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) officially assigned currency code.
     */
    function IsISO4217CurrencyCode(validationOptions) {
        return ValidateBy({
            name: IS_ISO4217_CURRENCY_CODE,
            validator: {
                validate: function (value, args) { return isISO4217CurrencyCode(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid ISO4217 currency code'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_BOOLEAN = 'isBoolean';
    /**
     * Checks if a given value is a boolean.
     */
    function isBoolean(value) {
        return value instanceof Boolean || typeof value === 'boolean';
    }
    /**
     * Checks if a value is a boolean.
     */
    function IsBoolean(validationOptions) {
        return ValidateBy({
            name: IS_BOOLEAN,
            validator: {
                validate: function (value, args) { return isBoolean(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a boolean value'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_DATE = 'isDate';
    /**
     * Checks if a given value is a date.
     */
    function isDate(value) {
        return value instanceof Date && !isNaN(value.getTime());
    }
    /**
     * Checks if a value is a date.
     */
    function IsDate(validationOptions) {
        return ValidateBy({
            name: IS_DATE,
            validator: {
                validate: function (value, args) { return isDate(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a Date instance'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_NUMBER = 'isNumber';
    /**
     * Checks if a given value is a number.
     */
    function isNumber(value, options) {
        if (options === void 0) { options = {}; }
        if (typeof value !== 'number') {
            return false;
        }
        if (value === Infinity || value === -Infinity) {
            return !!options.allowInfinity;
        }
        if (Number.isNaN(value)) {
            return !!options.allowNaN;
        }
        if (options.maxDecimalPlaces !== undefined) {
            var decimalPlaces = 0;
            if (value % 1 !== 0) {
                decimalPlaces = value.toString().split('.')[1].length;
            }
            if (decimalPlaces > options.maxDecimalPlaces) {
                return false;
            }
        }
        return Number.isFinite(value);
    }
    /**
     * Checks if a value is a number.
     */
    function IsNumber(options, validationOptions) {
        if (options === void 0) { options = {}; }
        return ValidateBy({
            name: IS_NUMBER,
            constraints: [options],
            validator: {
                validate: function (value, args) { return isNumber(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a number conforming to the specified constraints'; }, validationOptions),
            },
        }, validationOptions);
    }

    var __read = (undefined && undefined.__read) || function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };
    var IS_ENUM = 'isEnum';
    /**
     * Checks if a given value is the member of the provided enum.
     */
    function isEnum(value, entity) {
        var enumValues = Object.keys(entity).map(function (k) { return entity[k]; });
        return enumValues.includes(value);
    }
    /**
     * Returns the possible values from an enum (both simple number indexed and string indexed enums).
     */
    function validEnumValues(entity) {
        return Object.entries(entity)
            .filter(function (_a) {
            var _b = __read(_a, 2), key = _b[0]; _b[1];
            return isNaN(parseInt(key));
        })
            .map(function (_a) {
            var _b = __read(_a, 2); _b[0]; var value = _b[1];
            return value;
        });
    }
    /**
     * Checks if a given value is the member of the provided enum.
     */
    function IsEnum(entity, validationOptions) {
        return ValidateBy({
            name: IS_ENUM,
            constraints: [entity, validEnumValues(entity)],
            validator: {
                validate: function (value, args) { return isEnum(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be one of the following values: $constraint2'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_INT = 'isInt';
    /**
     * Checks if value is an integer.
     */
    function isInt(val) {
        return typeof val === 'number' && Number.isInteger(val);
    }
    /**
     * Checks if value is an integer.
     */
    function IsInt(validationOptions) {
        return ValidateBy({
            name: IS_INT,
            validator: {
                validate: function (value, args) { return isInt(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an integer number'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_STRING = 'isString';
    /**
     * Checks if a given value is a real string.
     */
    function isString(value) {
        return value instanceof String || typeof value === 'string';
    }
    /**
     * Checks if a given value is a real string.
     */
    function IsString(validationOptions) {
        return ValidateBy({
            name: IS_STRING,
            validator: {
                validate: function (value, args) { return isString(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a string'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_ARRAY = 'isArray';
    /**
     * Checks if a given value is an array
     */
    function isArray(value) {
        return Array.isArray(value);
    }
    /**
     * Checks if a given value is an array
     */
    function IsArray(validationOptions) {
        return ValidateBy({
            name: IS_ARRAY,
            validator: {
                validate: function (value, args) { return isArray(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an array'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_OBJECT = 'isObject';
    /**
     * Checks if the value is valid Object.
     * Returns false if the value is not an object.
     */
    function isObject(value) {
        return value != null && (typeof value === 'object' || typeof value === 'function') && !Array.isArray(value);
    }
    /**
     * Checks if the value is valid Object.
     * Returns false if the value is not an object.
     */
    function IsObject(validationOptions) {
        return ValidateBy({
            name: IS_OBJECT,
            validator: {
                validate: function (value, args) { return isObject(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an object'; }, validationOptions),
            },
        }, validationOptions);
    }

    var ARRAY_CONTAINS = 'arrayContains';
    /**
     * Checks if array contains all values from the given array of values.
     * If null or undefined is given then this function returns false.
     */
    function arrayContains(array, values) {
        if (!Array.isArray(array))
            return false;
        return values.every(function (value) { return array.indexOf(value) !== -1; });
    }
    /**
     * Checks if array contains all values from the given array of values.
     * If null or undefined is given then this function returns false.
     */
    function ArrayContains(values, validationOptions) {
        return ValidateBy({
            name: ARRAY_CONTAINS,
            constraints: [values],
            validator: {
                validate: function (value, args) { return arrayContains(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain $constraint1 values'; }, validationOptions),
            },
        }, validationOptions);
    }

    var ARRAY_NOT_CONTAINS = 'arrayNotContains';
    /**
     * Checks if array does not contain any of the given values.
     * If null or undefined is given then this function returns false.
     */
    function arrayNotContains(array, values) {
        if (!Array.isArray(array))
            return false;
        return values.every(function (value) { return array.indexOf(value) === -1; });
    }
    /**
     * Checks if array does not contain any of the given values.
     * If null or undefined is given then this function returns false.
     */
    function ArrayNotContains(values, validationOptions) {
        return ValidateBy({
            name: ARRAY_NOT_CONTAINS,
            constraints: [values],
            validator: {
                validate: function (value, args) { return arrayNotContains(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property should not contain $constraint1 values'; }, validationOptions),
            },
        }, validationOptions);
    }

    var ARRAY_NOT_EMPTY = 'arrayNotEmpty';
    /**
     * Checks if given array is not empty.
     * If null or undefined is given then this function returns false.
     */
    function arrayNotEmpty(array) {
        return Array.isArray(array) && array.length > 0;
    }
    /**
     * Checks if given array is not empty.
     * If null or undefined is given then this function returns false.
     */
    function ArrayNotEmpty(validationOptions) {
        return ValidateBy({
            name: ARRAY_NOT_EMPTY,
            validator: {
                validate: function (value, args) { return arrayNotEmpty(value); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property should not be empty'; }, validationOptions),
            },
        }, validationOptions);
    }

    var ARRAY_MIN_SIZE = 'arrayMinSize';
    /**
     * Checks if the array's length is greater than or equal to the specified number.
     * If null or undefined is given then this function returns false.
     */
    function arrayMinSize(array, min) {
        return Array.isArray(array) && array.length >= min;
    }
    /**
     * Checks if the array's length is greater than or equal to the specified number.
     * If null or undefined is given then this function returns false.
     */
    function ArrayMinSize(min, validationOptions) {
        return ValidateBy({
            name: ARRAY_MIN_SIZE,
            constraints: [min],
            validator: {
                validate: function (value, args) { return arrayMinSize(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain at least $constraint1 elements'; }, validationOptions),
            },
        }, validationOptions);
    }

    var ARRAY_MAX_SIZE = 'arrayMaxSize';
    /**
     * Checks if the array's length is less or equal to the specified number.
     * If null or undefined is given then this function returns false.
     */
    function arrayMaxSize(array, max) {
        return Array.isArray(array) && array.length <= max;
    }
    /**
     * Checks if the array's length is less or equal to the specified number.
     * If null or undefined is given then this function returns false.
     */
    function ArrayMaxSize(max, validationOptions) {
        return ValidateBy({
            name: ARRAY_MAX_SIZE,
            constraints: [max],
            validator: {
                validate: function (value, args) { return arrayMaxSize(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain no more than $constraint1 elements'; }, validationOptions),
            },
        }, validationOptions);
    }

    var ARRAY_UNIQUE = 'arrayUnique';
    /**
     * Checks if all array's values are unique. Comparison for objects is reference-based.
     * If null or undefined is given then this function returns false.
     */
    function arrayUnique(array, identifier) {
        if (!Array.isArray(array))
            return false;
        if (identifier) {
            array = array.map(function (o) { return (o != null ? identifier(o) : o); });
        }
        var uniqueItems = array.filter(function (a, b, c) { return c.indexOf(a) === b; });
        return array.length === uniqueItems.length;
    }
    /**
     * Checks if all array's values are unique. Comparison for objects is reference-based.
     * If null or undefined is given then this function returns false.
     */
    function ArrayUnique(identifierOrOptions, validationOptions) {
        var identifier = typeof identifierOrOptions === 'function' ? identifierOrOptions : undefined;
        var options = typeof identifierOrOptions !== 'function' ? identifierOrOptions : validationOptions;
        return ValidateBy({
            name: ARRAY_UNIQUE,
            validator: {
                validate: function (value, args) { return arrayUnique(value, identifier); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + "All $property's elements must be unique"; }, options),
            },
        }, options);
    }

    var IS_NOT_EMPTY_OBJECT = 'isNotEmptyObject';
    /**
     * Checks if the value is valid Object & not empty.
     * Returns false if the value is not an object or an empty valid object.
     */
    function isNotEmptyObject(value, options) {
        if (!isObject(value)) {
            return false;
        }
        if ((options === null || options === void 0 ? void 0 : options.nullable) === true) {
            return !Object.values(value).every(function (propertyValue) { return propertyValue === null || propertyValue === undefined; });
        }
        for (var key in value) {
            if (value.hasOwnProperty(key)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Checks if the value is valid Object & not empty.
     * Returns false if the value is not an object or an empty valid object.
     */
    function IsNotEmptyObject(options, validationOptions) {
        return ValidateBy({
            name: IS_NOT_EMPTY_OBJECT,
            constraints: [options],
            validator: {
                validate: function (value, args) { return isNotEmptyObject(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a non-empty object'; }, validationOptions),
            },
        }, validationOptions);
    }

    var IS_INSTANCE = 'isInstance';
    /**
     * Checks if the value is an instance of the specified object.
     */
    function isInstance(object, targetTypeConstructor) {
        return (targetTypeConstructor && typeof targetTypeConstructor === 'function' && object instanceof targetTypeConstructor);
    }
    /**
     * Checks if the value is an instance of the specified object.
     */
    function IsInstance(targetType, validationOptions) {
        return ValidateBy({
            name: IS_INSTANCE,
            constraints: [targetType],
            validator: {
                validate: function (value, args) { return isInstance(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
                defaultMessage: buildMessage(function (eachPrefix, args) {
                    if (args === null || args === void 0 ? void 0 : args.constraints[0]) {
                        return eachPrefix + "$property must be an instance of ".concat(args === null || args === void 0 ? void 0 : args.constraints[0].name);
                    }
                    else {
                        return eachPrefix + "".concat(IS_INSTANCE, " decorator expects and object as value, but got falsy value.");
                    }
                }, validationOptions),
            },
        }, validationOptions);
    }

    /**
     * Validates given object by object's decorators or given validation schema.
     */
    function validate(schemaNameOrObject, objectOrValidationOptions, maybeValidatorOptions) {
        if (typeof schemaNameOrObject === 'string') {
            return getFromContainer(Validator).validate(schemaNameOrObject, objectOrValidationOptions, maybeValidatorOptions);
        }
        else {
            return getFromContainer(Validator).validate(schemaNameOrObject, objectOrValidationOptions);
        }
    }
    /**
     * Validates given object by object's decorators or given validation schema and reject on error.
     */
    function validateOrReject(schemaNameOrObject, objectOrValidationOptions, maybeValidatorOptions) {
        if (typeof schemaNameOrObject === 'string') {
            return getFromContainer(Validator).validateOrReject(schemaNameOrObject, objectOrValidationOptions, maybeValidatorOptions);
        }
        else {
            return getFromContainer(Validator).validateOrReject(schemaNameOrObject, objectOrValidationOptions);
        }
    }
    /**
     * Validates given object by object's decorators or given validation schema.
     * Note that this method completely ignores async validations.
     * If you want to properly perform validation you need to call validate method instead.
     */
    function validateSync(schemaNameOrObject, objectOrValidationOptions, maybeValidatorOptions) {
        if (typeof schemaNameOrObject === 'string') {
            return getFromContainer(Validator).validateSync(schemaNameOrObject, objectOrValidationOptions, maybeValidatorOptions);
        }
        else {
            return getFromContainer(Validator).validateSync(schemaNameOrObject, objectOrValidationOptions);
        }
    }
    /**
     * Registers a new validation schema.
     */
    function registerSchema(schema) {
        getMetadataStorage().addValidationSchema(schema);
    }

    exports.ARRAY_CONTAINS = ARRAY_CONTAINS;
    exports.ARRAY_MAX_SIZE = ARRAY_MAX_SIZE;
    exports.ARRAY_MIN_SIZE = ARRAY_MIN_SIZE;
    exports.ARRAY_NOT_CONTAINS = ARRAY_NOT_CONTAINS;
    exports.ARRAY_NOT_EMPTY = ARRAY_NOT_EMPTY;
    exports.ARRAY_UNIQUE = ARRAY_UNIQUE;
    exports.Allow = Allow;
    exports.ArrayContains = ArrayContains;
    exports.ArrayMaxSize = ArrayMaxSize;
    exports.ArrayMinSize = ArrayMinSize;
    exports.ArrayNotContains = ArrayNotContains;
    exports.ArrayNotEmpty = ArrayNotEmpty;
    exports.ArrayUnique = ArrayUnique;
    exports.CONTAINS = CONTAINS;
    exports.Contains = Contains;
    exports.EQUALS = EQUALS;
    exports.Equals = Equals;
    exports.IS_ALPHA = IS_ALPHA;
    exports.IS_ALPHANUMERIC = IS_ALPHANUMERIC;
    exports.IS_ARRAY = IS_ARRAY;
    exports.IS_ASCII = IS_ASCII;
    exports.IS_BASE32 = IS_BASE32;
    exports.IS_BASE58 = IS_BASE58;
    exports.IS_BASE64 = IS_BASE64;
    exports.IS_BIC = IS_BIC;
    exports.IS_BOOLEAN = IS_BOOLEAN;
    exports.IS_BOOLEAN_STRING = IS_BOOLEAN_STRING;
    exports.IS_BTC_ADDRESS = IS_BTC_ADDRESS;
    exports.IS_BYTE_LENGTH = IS_BYTE_LENGTH;
    exports.IS_CREDIT_CARD = IS_CREDIT_CARD;
    exports.IS_CURRENCY = IS_CURRENCY;
    exports.IS_DATA_URI = IS_DATA_URI;
    exports.IS_DATE = IS_DATE;
    exports.IS_DATE_STRING = IS_DATE_STRING;
    exports.IS_DECIMAL = IS_DECIMAL;
    exports.IS_DEFINED = IS_DEFINED;
    exports.IS_DIVISIBLE_BY = IS_DIVISIBLE_BY;
    exports.IS_EAN = IS_EAN;
    exports.IS_EMAIL = IS_EMAIL;
    exports.IS_EMPTY = IS_EMPTY;
    exports.IS_ENUM = IS_ENUM;
    exports.IS_ETHEREUM_ADDRESS = IS_ETHEREUM_ADDRESS;
    exports.IS_FIREBASE_PUSH_ID = IS_FIREBASE_PUSH_ID;
    exports.IS_FQDN = IS_FQDN;
    exports.IS_FULL_WIDTH = IS_FULL_WIDTH;
    exports.IS_HALF_WIDTH = IS_HALF_WIDTH;
    exports.IS_HASH = IS_HASH;
    exports.IS_HEXADECIMAL = IS_HEXADECIMAL;
    exports.IS_HEX_COLOR = IS_HEX_COLOR;
    exports.IS_HSL = IS_HSL;
    exports.IS_IBAN = IS_IBAN;
    exports.IS_IDENTITY_CARD = IS_IDENTITY_CARD;
    exports.IS_IN = IS_IN;
    exports.IS_INSTANCE = IS_INSTANCE;
    exports.IS_INT = IS_INT;
    exports.IS_IP = IS_IP;
    exports.IS_ISBN = IS_ISBN;
    exports.IS_ISIN = IS_ISIN;
    exports.IS_ISO31661_ALPHA_2 = IS_ISO31661_ALPHA_2;
    exports.IS_ISO31661_ALPHA_3 = IS_ISO31661_ALPHA_3;
    exports.IS_ISO4217_CURRENCY_CODE = IS_ISO4217_CURRENCY_CODE;
    exports.IS_ISO8601 = IS_ISO8601;
    exports.IS_ISRC = IS_ISRC;
    exports.IS_ISSN = IS_ISSN;
    exports.IS_JSON = IS_JSON;
    exports.IS_JWT = IS_JWT;
    exports.IS_LATITUDE = IS_LATITUDE;
    exports.IS_LATLONG = IS_LATLONG;
    exports.IS_LENGTH = IS_LENGTH;
    exports.IS_LOCALE = IS_LOCALE;
    exports.IS_LONGITUDE = IS_LONGITUDE;
    exports.IS_LOWERCASE = IS_LOWERCASE;
    exports.IS_MAC_ADDRESS = IS_MAC_ADDRESS;
    exports.IS_MAGNET_URI = IS_MAGNET_URI;
    exports.IS_MILITARY_TIME = IS_MILITARY_TIME;
    exports.IS_MIME_TYPE = IS_MIME_TYPE;
    exports.IS_MOBILE_PHONE = IS_MOBILE_PHONE;
    exports.IS_MONGO_ID = IS_MONGO_ID;
    exports.IS_MULTIBYTE = IS_MULTIBYTE;
    exports.IS_NEGATIVE = IS_NEGATIVE;
    exports.IS_NOT_EMPTY = IS_NOT_EMPTY;
    exports.IS_NOT_EMPTY_OBJECT = IS_NOT_EMPTY_OBJECT;
    exports.IS_NOT_IN = IS_NOT_IN;
    exports.IS_NUMBER = IS_NUMBER;
    exports.IS_NUMBER_STRING = IS_NUMBER_STRING;
    exports.IS_OBJECT = IS_OBJECT;
    exports.IS_OCTAL = IS_OCTAL;
    exports.IS_PASSPORT_NUMBER = IS_PASSPORT_NUMBER;
    exports.IS_PHONE_NUMBER = IS_PHONE_NUMBER;
    exports.IS_PORT = IS_PORT;
    exports.IS_POSITIVE = IS_POSITIVE;
    exports.IS_POSTAL_CODE = IS_POSTAL_CODE;
    exports.IS_RFC_3339 = IS_RFC_3339;
    exports.IS_RGB_COLOR = IS_RGB_COLOR;
    exports.IS_SEM_VER = IS_SEM_VER;
    exports.IS_STRING = IS_STRING;
    exports.IS_STRONG_PASSWORD = IS_STRONG_PASSWORD;
    exports.IS_SURROGATE_PAIR = IS_SURROGATE_PAIR;
    exports.IS_TAX_ID = IS_TAX_ID;
    exports.IS_TIMEZONE = IS_TIMEZONE;
    exports.IS_UPPERCASE = IS_UPPERCASE;
    exports.IS_URL = IS_URL;
    exports.IS_UUID = IS_UUID;
    exports.IS_VARIABLE_WIDTH = IS_VARIABLE_WIDTH;
    exports.IsAlpha = IsAlpha;
    exports.IsAlphanumeric = IsAlphanumeric;
    exports.IsArray = IsArray;
    exports.IsAscii = IsAscii;
    exports.IsBIC = IsBIC;
    exports.IsBase32 = IsBase32;
    exports.IsBase58 = IsBase58;
    exports.IsBase64 = IsBase64;
    exports.IsBoolean = IsBoolean;
    exports.IsBooleanString = IsBooleanString;
    exports.IsBtcAddress = IsBtcAddress;
    exports.IsByteLength = IsByteLength;
    exports.IsCreditCard = IsCreditCard;
    exports.IsCurrency = IsCurrency;
    exports.IsDataURI = IsDataURI;
    exports.IsDate = IsDate;
    exports.IsDateString = IsDateString;
    exports.IsDecimal = IsDecimal;
    exports.IsDefined = IsDefined;
    exports.IsDivisibleBy = IsDivisibleBy;
    exports.IsEAN = IsEAN;
    exports.IsEmail = IsEmail;
    exports.IsEmpty = IsEmpty;
    exports.IsEnum = IsEnum;
    exports.IsEthereumAddress = IsEthereumAddress;
    exports.IsFQDN = IsFQDN;
    exports.IsFirebasePushId = IsFirebasePushId;
    exports.IsFullWidth = IsFullWidth;
    exports.IsHSL = IsHSL;
    exports.IsHalfWidth = IsHalfWidth;
    exports.IsHash = IsHash;
    exports.IsHexColor = IsHexColor;
    exports.IsHexadecimal = IsHexadecimal;
    exports.IsIBAN = IsIBAN;
    exports.IsIP = IsIP;
    exports.IsISBN = IsISBN;
    exports.IsISIN = IsISIN;
    exports.IsISO31661Alpha2 = IsISO31661Alpha2;
    exports.IsISO31661Alpha3 = IsISO31661Alpha3;
    exports.IsISO4217CurrencyCode = IsISO4217CurrencyCode;
    exports.IsISO8601 = IsISO8601;
    exports.IsISRC = IsISRC;
    exports.IsISSN = IsISSN;
    exports.IsIdentityCard = IsIdentityCard;
    exports.IsIn = IsIn;
    exports.IsInstance = IsInstance;
    exports.IsInt = IsInt;
    exports.IsJSON = IsJSON;
    exports.IsJWT = IsJWT;
    exports.IsLatLong = IsLatLong;
    exports.IsLatitude = IsLatitude;
    exports.IsLocale = IsLocale;
    exports.IsLongitude = IsLongitude;
    exports.IsLowercase = IsLowercase;
    exports.IsMACAddress = IsMACAddress;
    exports.IsMagnetURI = IsMagnetURI;
    exports.IsMilitaryTime = IsMilitaryTime;
    exports.IsMimeType = IsMimeType;
    exports.IsMobilePhone = IsMobilePhone;
    exports.IsMongoId = IsMongoId;
    exports.IsMultibyte = IsMultibyte;
    exports.IsNegative = IsNegative;
    exports.IsNotEmpty = IsNotEmpty;
    exports.IsNotEmptyObject = IsNotEmptyObject;
    exports.IsNotIn = IsNotIn;
    exports.IsNumber = IsNumber;
    exports.IsNumberString = IsNumberString;
    exports.IsObject = IsObject;
    exports.IsOctal = IsOctal;
    exports.IsOptional = IsOptional;
    exports.IsPassportNumber = IsPassportNumber;
    exports.IsPhoneNumber = IsPhoneNumber;
    exports.IsPort = IsPort;
    exports.IsPositive = IsPositive;
    exports.IsPostalCode = IsPostalCode;
    exports.IsRFC3339 = IsRFC3339;
    exports.IsRgbColor = IsRgbColor;
    exports.IsSemVer = IsSemVer;
    exports.IsString = IsString;
    exports.IsStrongPassword = IsStrongPassword;
    exports.IsSurrogatePair = IsSurrogatePair;
    exports.IsTaxId = IsTaxId;
    exports.IsTimeZone = IsTimeZone;
    exports.IsUUID = IsUUID;
    exports.IsUppercase = IsUppercase;
    exports.IsUrl = IsUrl;
    exports.IsVariableWidth = IsVariableWidth;
    exports.Length = Length;
    exports.MATCHES = MATCHES;
    exports.MAX = MAX;
    exports.MAX_DATE = MAX_DATE;
    exports.MAX_LENGTH = MAX_LENGTH;
    exports.MIN = MIN;
    exports.MIN_DATE = MIN_DATE;
    exports.MIN_LENGTH = MIN_LENGTH;
    exports.Matches = Matches;
    exports.Max = Max;
    exports.MaxDate = MaxDate;
    exports.MaxLength = MaxLength;
    exports.MetadataStorage = MetadataStorage;
    exports.Min = Min;
    exports.MinDate = MinDate;
    exports.MinLength = MinLength;
    exports.NOT_CONTAINS = NOT_CONTAINS;
    exports.NOT_EQUALS = NOT_EQUALS;
    exports.NotContains = NotContains;
    exports.NotEquals = NotEquals;
    exports.Validate = Validate;
    exports.ValidateBy = ValidateBy;
    exports.ValidateIf = ValidateIf;
    exports.ValidateNested = ValidateNested;
    exports.ValidatePromise = ValidatePromise;
    exports.ValidationError = ValidationError;
    exports.ValidationTypes = ValidationTypes;
    exports.Validator = Validator;
    exports.ValidatorConstraint = ValidatorConstraint;
    exports.arrayContains = arrayContains;
    exports.arrayMaxSize = arrayMaxSize;
    exports.arrayMinSize = arrayMinSize;
    exports.arrayNotContains = arrayNotContains;
    exports.arrayNotEmpty = arrayNotEmpty;
    exports.arrayUnique = arrayUnique;
    exports.buildMessage = buildMessage;
    exports.contains = contains;
    exports.equals = equals$1;
    exports.getFromContainer = getFromContainer;
    exports.getMetadataStorage = getMetadataStorage;
    exports.isAlpha = isAlpha;
    exports.isAlphanumeric = isAlphanumeric;
    exports.isArray = isArray;
    exports.isAscii = isAscii;
    exports.isBIC = isBIC;
    exports.isBase32 = isBase32;
    exports.isBase58 = isBase58;
    exports.isBase64 = isBase64;
    exports.isBoolean = isBoolean;
    exports.isBooleanString = isBooleanString;
    exports.isBtcAddress = isBtcAddress;
    exports.isByteLength = isByteLength;
    exports.isCreditCard = isCreditCard;
    exports.isCurrency = isCurrency;
    exports.isDataURI = isDataURI;
    exports.isDate = isDate;
    exports.isDateString = isDateString;
    exports.isDecimal = isDecimal;
    exports.isDefined = isDefined;
    exports.isDivisibleBy = isDivisibleBy;
    exports.isEAN = isEAN;
    exports.isEmail = isEmail;
    exports.isEmpty = isEmpty$1;
    exports.isEnum = isEnum;
    exports.isEthereumAddress = isEthereumAddress;
    exports.isFQDN = isFQDN;
    exports.isFirebasePushId = isFirebasePushId;
    exports.isFullWidth = isFullWidth;
    exports.isHSL = isHSL;
    exports.isHalfWidth = isHalfWidth;
    exports.isHash = isHash;
    exports.isHexColor = isHexColor;
    exports.isHexadecimal = isHexadecimal;
    exports.isIBAN = isIBAN;
    exports.isIP = isIP;
    exports.isISBN = isISBN;
    exports.isISIN = isISIN;
    exports.isISO31661Alpha2 = isISO31661Alpha2;
    exports.isISO31661Alpha3 = isISO31661Alpha3;
    exports.isISO4217CurrencyCode = isISO4217CurrencyCode;
    exports.isISO8601 = isISO8601;
    exports.isISRC = isISRC;
    exports.isISSN = isISSN;
    exports.isIdentityCard = isIdentityCard;
    exports.isIn = isIn$1;
    exports.isInstance = isInstance;
    exports.isInt = isInt;
    exports.isJSON = isJSON;
    exports.isJWT = isJWT;
    exports.isLatLong = isLatLong;
    exports.isLatitude = isLatitude;
    exports.isLocale = isLocale;
    exports.isLongitude = isLongitude;
    exports.isLowercase = isLowercase;
    exports.isMACAddress = isMACAddress;
    exports.isMagnetURI = isMagnetURI;
    exports.isMilitaryTime = isMilitaryTime;
    exports.isMimeType = isMimeType;
    exports.isMobilePhone = isMobilePhone;
    exports.isMongoId = isMongoId;
    exports.isMultibyte = isMultibyte;
    exports.isNegative = isNegative;
    exports.isNotEmpty = isNotEmpty;
    exports.isNotEmptyObject = isNotEmptyObject;
    exports.isNotIn = isNotIn;
    exports.isNumber = isNumber;
    exports.isNumberString = isNumberString;
    exports.isObject = isObject;
    exports.isOctal = isOctal;
    exports.isPassportNumber = isPassportNumber;
    exports.isPhoneNumber = isPhoneNumber;
    exports.isPort = isPort;
    exports.isPositive = isPositive;
    exports.isPostalCode = isPostalCode;
    exports.isRFC3339 = isRFC3339;
    exports.isRgbColor = isRgbColor;
    exports.isSemVer = isSemVer;
    exports.isString = isString;
    exports.isStrongPassword = isStrongPassword;
    exports.isSurrogatePair = isSurrogatePair;
    exports.isTaxId = isTaxId;
    exports.isTimeZone = isTimeZone;
    exports.isURL = isURL;
    exports.isUUID = isUUID;
    exports.isUppercase = isUppercase;
    exports.isValidationOptions = isValidationOptions;
    exports.isVariableWidth = isVariableWidth;
    exports.length = length;
    exports.matches = matches;
    exports.max = max;
    exports.maxDate = maxDate;
    exports.maxLength = maxLength;
    exports.min = min;
    exports.minDate = minDate;
    exports.minLength = minLength;
    exports.notContains = notContains;
    exports.notEquals = notEquals;
    exports.registerDecorator = registerDecorator;
    exports.registerSchema = registerSchema;
    exports.useContainer = useContainer;
    exports.validate = validate;
    exports.validateOrReject = validateOrReject;
    exports.validateSync = validateSync;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=class-validator.umd.js.map
