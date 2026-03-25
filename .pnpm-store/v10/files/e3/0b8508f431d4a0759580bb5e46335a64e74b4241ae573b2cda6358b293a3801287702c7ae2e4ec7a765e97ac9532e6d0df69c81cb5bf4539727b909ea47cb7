(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ClassTransformer = {}));
})(this, (function (exports) { 'use strict';

    exports.TransformationType = void 0;
    (function (TransformationType) {
        TransformationType[TransformationType["PLAIN_TO_CLASS"] = 0] = "PLAIN_TO_CLASS";
        TransformationType[TransformationType["CLASS_TO_PLAIN"] = 1] = "CLASS_TO_PLAIN";
        TransformationType[TransformationType["CLASS_TO_CLASS"] = 2] = "CLASS_TO_CLASS";
    })(exports.TransformationType || (exports.TransformationType = {}));

    /**
     * Storage all library metadata.
     */
    var MetadataStorage = /** @class */ (function () {
        function MetadataStorage() {
            // -------------------------------------------------------------------------
            // Properties
            // -------------------------------------------------------------------------
            this._typeMetadatas = new Map();
            this._transformMetadatas = new Map();
            this._exposeMetadatas = new Map();
            this._excludeMetadatas = new Map();
            this._ancestorsMap = new Map();
        }
        // -------------------------------------------------------------------------
        // Adder Methods
        // -------------------------------------------------------------------------
        MetadataStorage.prototype.addTypeMetadata = function (metadata) {
            if (!this._typeMetadatas.has(metadata.target)) {
                this._typeMetadatas.set(metadata.target, new Map());
            }
            this._typeMetadatas.get(metadata.target).set(metadata.propertyName, metadata);
        };
        MetadataStorage.prototype.addTransformMetadata = function (metadata) {
            if (!this._transformMetadatas.has(metadata.target)) {
                this._transformMetadatas.set(metadata.target, new Map());
            }
            if (!this._transformMetadatas.get(metadata.target).has(metadata.propertyName)) {
                this._transformMetadatas.get(metadata.target).set(metadata.propertyName, []);
            }
            this._transformMetadatas.get(metadata.target).get(metadata.propertyName).push(metadata);
        };
        MetadataStorage.prototype.addExposeMetadata = function (metadata) {
            if (!this._exposeMetadatas.has(metadata.target)) {
                this._exposeMetadatas.set(metadata.target, new Map());
            }
            this._exposeMetadatas.get(metadata.target).set(metadata.propertyName, metadata);
        };
        MetadataStorage.prototype.addExcludeMetadata = function (metadata) {
            if (!this._excludeMetadatas.has(metadata.target)) {
                this._excludeMetadatas.set(metadata.target, new Map());
            }
            this._excludeMetadatas.get(metadata.target).set(metadata.propertyName, metadata);
        };
        // -------------------------------------------------------------------------
        // Public Methods
        // -------------------------------------------------------------------------
        MetadataStorage.prototype.findTransformMetadatas = function (target, propertyName, transformationType) {
            return this.findMetadatas(this._transformMetadatas, target, propertyName).filter(function (metadata) {
                if (!metadata.options)
                    return true;
                if (metadata.options.toClassOnly === true && metadata.options.toPlainOnly === true)
                    return true;
                if (metadata.options.toClassOnly === true) {
                    return (transformationType === exports.TransformationType.CLASS_TO_CLASS ||
                        transformationType === exports.TransformationType.PLAIN_TO_CLASS);
                }
                if (metadata.options.toPlainOnly === true) {
                    return transformationType === exports.TransformationType.CLASS_TO_PLAIN;
                }
                return true;
            });
        };
        MetadataStorage.prototype.findExcludeMetadata = function (target, propertyName) {
            return this.findMetadata(this._excludeMetadatas, target, propertyName);
        };
        MetadataStorage.prototype.findExposeMetadata = function (target, propertyName) {
            return this.findMetadata(this._exposeMetadatas, target, propertyName);
        };
        MetadataStorage.prototype.findExposeMetadataByCustomName = function (target, name) {
            return this.getExposedMetadatas(target).find(function (metadata) {
                return metadata.options && metadata.options.name === name;
            });
        };
        MetadataStorage.prototype.findTypeMetadata = function (target, propertyName) {
            return this.findMetadata(this._typeMetadatas, target, propertyName);
        };
        MetadataStorage.prototype.getStrategy = function (target) {
            var excludeMap = this._excludeMetadatas.get(target);
            var exclude = excludeMap && excludeMap.get(undefined);
            var exposeMap = this._exposeMetadatas.get(target);
            var expose = exposeMap && exposeMap.get(undefined);
            if ((exclude && expose) || (!exclude && !expose))
                return 'none';
            return exclude ? 'excludeAll' : 'exposeAll';
        };
        MetadataStorage.prototype.getExposedMetadatas = function (target) {
            return this.getMetadata(this._exposeMetadatas, target);
        };
        MetadataStorage.prototype.getExcludedMetadatas = function (target) {
            return this.getMetadata(this._excludeMetadatas, target);
        };
        MetadataStorage.prototype.getExposedProperties = function (target, transformationType) {
            return this.getExposedMetadatas(target)
                .filter(function (metadata) {
                if (!metadata.options)
                    return true;
                if (metadata.options.toClassOnly === true && metadata.options.toPlainOnly === true)
                    return true;
                if (metadata.options.toClassOnly === true) {
                    return (transformationType === exports.TransformationType.CLASS_TO_CLASS ||
                        transformationType === exports.TransformationType.PLAIN_TO_CLASS);
                }
                if (metadata.options.toPlainOnly === true) {
                    return transformationType === exports.TransformationType.CLASS_TO_PLAIN;
                }
                return true;
            })
                .map(function (metadata) { return metadata.propertyName; });
        };
        MetadataStorage.prototype.getExcludedProperties = function (target, transformationType) {
            return this.getExcludedMetadatas(target)
                .filter(function (metadata) {
                if (!metadata.options)
                    return true;
                if (metadata.options.toClassOnly === true && metadata.options.toPlainOnly === true)
                    return true;
                if (metadata.options.toClassOnly === true) {
                    return (transformationType === exports.TransformationType.CLASS_TO_CLASS ||
                        transformationType === exports.TransformationType.PLAIN_TO_CLASS);
                }
                if (metadata.options.toPlainOnly === true) {
                    return transformationType === exports.TransformationType.CLASS_TO_PLAIN;
                }
                return true;
            })
                .map(function (metadata) { return metadata.propertyName; });
        };
        MetadataStorage.prototype.clear = function () {
            this._typeMetadatas.clear();
            this._exposeMetadatas.clear();
            this._excludeMetadatas.clear();
            this._ancestorsMap.clear();
        };
        // -------------------------------------------------------------------------
        // Private Methods
        // -------------------------------------------------------------------------
        MetadataStorage.prototype.getMetadata = function (metadatas, target) {
            var metadataFromTargetMap = metadatas.get(target);
            var metadataFromTarget;
            if (metadataFromTargetMap) {
                metadataFromTarget = Array.from(metadataFromTargetMap.values()).filter(function (meta) { return meta.propertyName !== undefined; });
            }
            var metadataFromAncestors = [];
            for (var _i = 0, _a = this.getAncestors(target); _i < _a.length; _i++) {
                var ancestor = _a[_i];
                var ancestorMetadataMap = metadatas.get(ancestor);
                if (ancestorMetadataMap) {
                    var metadataFromAncestor = Array.from(ancestorMetadataMap.values()).filter(function (meta) { return meta.propertyName !== undefined; });
                    metadataFromAncestors.push.apply(metadataFromAncestors, metadataFromAncestor);
                }
            }
            return metadataFromAncestors.concat(metadataFromTarget || []);
        };
        MetadataStorage.prototype.findMetadata = function (metadatas, target, propertyName) {
            var metadataFromTargetMap = metadatas.get(target);
            if (metadataFromTargetMap) {
                var metadataFromTarget = metadataFromTargetMap.get(propertyName);
                if (metadataFromTarget) {
                    return metadataFromTarget;
                }
            }
            for (var _i = 0, _a = this.getAncestors(target); _i < _a.length; _i++) {
                var ancestor = _a[_i];
                var ancestorMetadataMap = metadatas.get(ancestor);
                if (ancestorMetadataMap) {
                    var ancestorResult = ancestorMetadataMap.get(propertyName);
                    if (ancestorResult) {
                        return ancestorResult;
                    }
                }
            }
            return undefined;
        };
        MetadataStorage.prototype.findMetadatas = function (metadatas, target, propertyName) {
            var metadataFromTargetMap = metadatas.get(target);
            var metadataFromTarget;
            if (metadataFromTargetMap) {
                metadataFromTarget = metadataFromTargetMap.get(propertyName);
            }
            var metadataFromAncestorsTarget = [];
            for (var _i = 0, _a = this.getAncestors(target); _i < _a.length; _i++) {
                var ancestor = _a[_i];
                var ancestorMetadataMap = metadatas.get(ancestor);
                if (ancestorMetadataMap) {
                    if (ancestorMetadataMap.has(propertyName)) {
                        metadataFromAncestorsTarget.push.apply(metadataFromAncestorsTarget, ancestorMetadataMap.get(propertyName));
                    }
                }
            }
            return metadataFromAncestorsTarget
                .slice()
                .reverse()
                .concat((metadataFromTarget || []).slice().reverse());
        };
        MetadataStorage.prototype.getAncestors = function (target) {
            if (!target)
                return [];
            if (!this._ancestorsMap.has(target)) {
                var ancestors = [];
                for (var baseClass = Object.getPrototypeOf(target.prototype.constructor); typeof baseClass.prototype !== 'undefined'; baseClass = Object.getPrototypeOf(baseClass.prototype.constructor)) {
                    ancestors.push(baseClass);
                }
                this._ancestorsMap.set(target, ancestors);
            }
            return this._ancestorsMap.get(target);
        };
        return MetadataStorage;
    }());

    /**
     * Default metadata storage is used as singleton and can be used to storage all metadatas.
     */
    var defaultMetadataStorage = new MetadataStorage();

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

    function isPromise(p) {
        return p !== null && typeof p === 'object' && typeof p.then === 'function';
    }

    var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    };
    function instantiateArrayType(arrayType) {
        var array = new arrayType();
        if (!(array instanceof Set) && !('push' in array)) {
            return [];
        }
        return array;
    }
    var TransformOperationExecutor = /** @class */ (function () {
        // -------------------------------------------------------------------------
        // Constructor
        // -------------------------------------------------------------------------
        function TransformOperationExecutor(transformationType, options) {
            this.transformationType = transformationType;
            this.options = options;
            // -------------------------------------------------------------------------
            // Private Properties
            // -------------------------------------------------------------------------
            this.recursionStack = new Set();
        }
        // -------------------------------------------------------------------------
        // Public Methods
        // -------------------------------------------------------------------------
        TransformOperationExecutor.prototype.transform = function (source, value, targetType, arrayType, isMap, level) {
            var _this = this;
            if (level === void 0) { level = 0; }
            if (Array.isArray(value) || value instanceof Set) {
                var newValue_1 = arrayType && this.transformationType === exports.TransformationType.PLAIN_TO_CLASS
                    ? instantiateArrayType(arrayType)
                    : [];
                value.forEach(function (subValue, index) {
                    var subSource = source ? source[index] : undefined;
                    if (!_this.options.enableCircularCheck || !_this.isCircular(subValue)) {
                        var realTargetType = void 0;
                        if (typeof targetType !== 'function' &&
                            targetType &&
                            targetType.options &&
                            targetType.options.discriminator &&
                            targetType.options.discriminator.property &&
                            targetType.options.discriminator.subTypes) {
                            if (_this.transformationType === exports.TransformationType.PLAIN_TO_CLASS) {
                                realTargetType = targetType.options.discriminator.subTypes.find(function (subType) {
                                    return subType.name === subValue[targetType.options.discriminator.property];
                                });
                                var options = { newObject: newValue_1, object: subValue, property: undefined };
                                var newType = targetType.typeFunction(options);
                                realTargetType === undefined ? (realTargetType = newType) : (realTargetType = realTargetType.value);
                                if (!targetType.options.keepDiscriminatorProperty)
                                    delete subValue[targetType.options.discriminator.property];
                            }
                            if (_this.transformationType === exports.TransformationType.CLASS_TO_CLASS) {
                                realTargetType = subValue.constructor;
                            }
                            if (_this.transformationType === exports.TransformationType.CLASS_TO_PLAIN) {
                                subValue[targetType.options.discriminator.property] = targetType.options.discriminator.subTypes.find(function (subType) { return subType.value === subValue.constructor; }).name;
                            }
                        }
                        else {
                            realTargetType = targetType;
                        }
                        var value_1 = _this.transform(subSource, subValue, realTargetType, undefined, subValue instanceof Map, level + 1);
                        if (newValue_1 instanceof Set) {
                            newValue_1.add(value_1);
                        }
                        else {
                            newValue_1.push(value_1);
                        }
                    }
                    else if (_this.transformationType === exports.TransformationType.CLASS_TO_CLASS) {
                        if (newValue_1 instanceof Set) {
                            newValue_1.add(subValue);
                        }
                        else {
                            newValue_1.push(subValue);
                        }
                    }
                });
                return newValue_1;
            }
            else if (targetType === String && !isMap) {
                if (value === null || value === undefined)
                    return value;
                return String(value);
            }
            else if (targetType === Number && !isMap) {
                if (value === null || value === undefined)
                    return value;
                return Number(value);
            }
            else if (targetType === Boolean && !isMap) {
                if (value === null || value === undefined)
                    return value;
                return Boolean(value);
            }
            else if ((targetType === Date || value instanceof Date) && !isMap) {
                if (value instanceof Date) {
                    return new Date(value.valueOf());
                }
                if (value === null || value === undefined)
                    return value;
                return new Date(value);
            }
            else if (!!getGlobal().Buffer && (targetType === Buffer || value instanceof Buffer) && !isMap) {
                if (value === null || value === undefined)
                    return value;
                return Buffer.from(value);
            }
            else if (isPromise(value) && !isMap) {
                return new Promise(function (resolve, reject) {
                    value.then(function (data) { return resolve(_this.transform(undefined, data, targetType, undefined, undefined, level + 1)); }, reject);
                });
            }
            else if (!isMap && value !== null && typeof value === 'object' && typeof value.then === 'function') {
                // Note: We should not enter this, as promise has been handled above
                // This option simply returns the Promise preventing a JS error from happening and should be an inaccessible path.
                return value; // skip promise transformation
            }
            else if (typeof value === 'object' && value !== null) {
                // try to guess the type
                if (!targetType && value.constructor !== Object /* && TransformationType === TransformationType.CLASS_TO_PLAIN*/)
                    if (!Array.isArray(value) && value.constructor === Array) ;
                    else {
                        // We are good we can use the built-in constructor
                        targetType = value.constructor;
                    }
                if (!targetType && source)
                    targetType = source.constructor;
                if (this.options.enableCircularCheck) {
                    // add transformed type to prevent circular references
                    this.recursionStack.add(value);
                }
                var keys = this.getKeys(targetType, value, isMap);
                var newValue = source ? source : {};
                if (!source &&
                    (this.transformationType === exports.TransformationType.PLAIN_TO_CLASS ||
                        this.transformationType === exports.TransformationType.CLASS_TO_CLASS)) {
                    if (isMap) {
                        newValue = new Map();
                    }
                    else if (targetType) {
                        newValue = new targetType();
                    }
                    else {
                        newValue = {};
                    }
                }
                var _loop_1 = function (key) {
                    if (key === '__proto__' || key === 'constructor') {
                        return "continue";
                    }
                    var valueKey = key;
                    var newValueKey = key, propertyName = key;
                    if (!this_1.options.ignoreDecorators && targetType) {
                        if (this_1.transformationType === exports.TransformationType.PLAIN_TO_CLASS) {
                            var exposeMetadata = defaultMetadataStorage.findExposeMetadataByCustomName(targetType, key);
                            if (exposeMetadata) {
                                propertyName = exposeMetadata.propertyName;
                                newValueKey = exposeMetadata.propertyName;
                            }
                        }
                        else if (this_1.transformationType === exports.TransformationType.CLASS_TO_PLAIN ||
                            this_1.transformationType === exports.TransformationType.CLASS_TO_CLASS) {
                            var exposeMetadata = defaultMetadataStorage.findExposeMetadata(targetType, key);
                            if (exposeMetadata && exposeMetadata.options && exposeMetadata.options.name) {
                                newValueKey = exposeMetadata.options.name;
                            }
                        }
                    }
                    // get a subvalue
                    var subValue = undefined;
                    if (this_1.transformationType === exports.TransformationType.PLAIN_TO_CLASS) {
                        /**
                         * This section is added for the following report:
                         * https://github.com/typestack/class-transformer/issues/596
                         *
                         * We should not call functions or constructors when transforming to class.
                         */
                        subValue = value[valueKey];
                    }
                    else {
                        if (value instanceof Map) {
                            subValue = value.get(valueKey);
                        }
                        else if (value[valueKey] instanceof Function) {
                            subValue = value[valueKey]();
                        }
                        else {
                            subValue = value[valueKey];
                        }
                    }
                    // determine a type
                    var type = undefined, isSubValueMap = subValue instanceof Map;
                    if (targetType && isMap) {
                        type = targetType;
                    }
                    else if (targetType) {
                        var metadata_1 = defaultMetadataStorage.findTypeMetadata(targetType, propertyName);
                        if (metadata_1) {
                            var options = { newObject: newValue, object: value, property: propertyName };
                            var newType = metadata_1.typeFunction ? metadata_1.typeFunction(options) : metadata_1.reflectedType;
                            if (metadata_1.options &&
                                metadata_1.options.discriminator &&
                                metadata_1.options.discriminator.property &&
                                metadata_1.options.discriminator.subTypes) {
                                if (!(value[valueKey] instanceof Array)) {
                                    if (this_1.transformationType === exports.TransformationType.PLAIN_TO_CLASS) {
                                        type = metadata_1.options.discriminator.subTypes.find(function (subType) {
                                            if (subValue && subValue instanceof Object && metadata_1.options.discriminator.property in subValue) {
                                                return subType.name === subValue[metadata_1.options.discriminator.property];
                                            }
                                        });
                                        type === undefined ? (type = newType) : (type = type.value);
                                        if (!metadata_1.options.keepDiscriminatorProperty) {
                                            if (subValue && subValue instanceof Object && metadata_1.options.discriminator.property in subValue) {
                                                delete subValue[metadata_1.options.discriminator.property];
                                            }
                                        }
                                    }
                                    if (this_1.transformationType === exports.TransformationType.CLASS_TO_CLASS) {
                                        type = subValue.constructor;
                                    }
                                    if (this_1.transformationType === exports.TransformationType.CLASS_TO_PLAIN) {
                                        if (subValue) {
                                            subValue[metadata_1.options.discriminator.property] = metadata_1.options.discriminator.subTypes.find(function (subType) { return subType.value === subValue.constructor; }).name;
                                        }
                                    }
                                }
                                else {
                                    type = metadata_1;
                                }
                            }
                            else {
                                type = newType;
                            }
                            isSubValueMap = isSubValueMap || metadata_1.reflectedType === Map;
                        }
                        else if (this_1.options.targetMaps) {
                            // try to find a type in target maps
                            this_1.options.targetMaps
                                .filter(function (map) { return map.target === targetType && !!map.properties[propertyName]; })
                                .forEach(function (map) { return (type = map.properties[propertyName]); });
                        }
                        else if (this_1.options.enableImplicitConversion &&
                            this_1.transformationType === exports.TransformationType.PLAIN_TO_CLASS) {
                            // if we have no registererd type via the @Type() decorator then we check if we have any
                            // type declarations in reflect-metadata (type declaration is emited only if some decorator is added to the property.)
                            var reflectedType = Reflect.getMetadata('design:type', targetType.prototype, propertyName);
                            if (reflectedType) {
                                type = reflectedType;
                            }
                        }
                    }
                    // if value is an array try to get its custom array type
                    var arrayType_1 = Array.isArray(value[valueKey])
                        ? this_1.getReflectedType(targetType, propertyName)
                        : undefined;
                    // const subValueKey = TransformationType === TransformationType.PLAIN_TO_CLASS && newKeyName ? newKeyName : key;
                    var subSource = source ? source[valueKey] : undefined;
                    // if its deserialization then type if required
                    // if we uncomment this types like string[] will not work
                    // if (this.transformationType === TransformationType.PLAIN_TO_CLASS && !type && subValue instanceof Object && !(subValue instanceof Date))
                    //     throw new Error(`Cannot determine type for ${(targetType as any).name }.${propertyName}, did you forget to specify a @Type?`);
                    // if newValue is a source object that has method that match newKeyName then skip it
                    if (newValue.constructor.prototype) {
                        var descriptor = Object.getOwnPropertyDescriptor(newValue.constructor.prototype, newValueKey);
                        if ((this_1.transformationType === exports.TransformationType.PLAIN_TO_CLASS ||
                            this_1.transformationType === exports.TransformationType.CLASS_TO_CLASS) &&
                            // eslint-disable-next-line @typescript-eslint/unbound-method
                            ((descriptor && !descriptor.set) || newValue[newValueKey] instanceof Function))
                            return "continue";
                    }
                    if (!this_1.options.enableCircularCheck || !this_1.isCircular(subValue)) {
                        var transformKey = this_1.transformationType === exports.TransformationType.PLAIN_TO_CLASS ? newValueKey : key;
                        var finalValue = void 0;
                        if (this_1.transformationType === exports.TransformationType.CLASS_TO_PLAIN) {
                            // Get original value
                            finalValue = value[transformKey];
                            // Apply custom transformation
                            finalValue = this_1.applyCustomTransformations(finalValue, targetType, transformKey, value, this_1.transformationType);
                            // If nothing change, it means no custom transformation was applied, so use the subValue.
                            finalValue = value[transformKey] === finalValue ? subValue : finalValue;
                            // Apply the default transformation
                            finalValue = this_1.transform(subSource, finalValue, type, arrayType_1, isSubValueMap, level + 1);
                        }
                        else {
                            if (subValue === undefined && this_1.options.exposeDefaultValues) {
                                // Set default value if nothing provided
                                finalValue = newValue[newValueKey];
                            }
                            else {
                                finalValue = this_1.transform(subSource, subValue, type, arrayType_1, isSubValueMap, level + 1);
                                finalValue = this_1.applyCustomTransformations(finalValue, targetType, transformKey, value, this_1.transformationType);
                            }
                        }
                        if (finalValue !== undefined || this_1.options.exposeUnsetFields) {
                            if (newValue instanceof Map) {
                                newValue.set(newValueKey, finalValue);
                            }
                            else {
                                newValue[newValueKey] = finalValue;
                            }
                        }
                    }
                    else if (this_1.transformationType === exports.TransformationType.CLASS_TO_CLASS) {
                        var finalValue = subValue;
                        finalValue = this_1.applyCustomTransformations(finalValue, targetType, key, value, this_1.transformationType);
                        if (finalValue !== undefined || this_1.options.exposeUnsetFields) {
                            if (newValue instanceof Map) {
                                newValue.set(newValueKey, finalValue);
                            }
                            else {
                                newValue[newValueKey] = finalValue;
                            }
                        }
                    }
                };
                var this_1 = this;
                // traverse over keys
                for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                    var key = keys_1[_i];
                    _loop_1(key);
                }
                if (this.options.enableCircularCheck) {
                    this.recursionStack.delete(value);
                }
                return newValue;
            }
            else {
                return value;
            }
        };
        TransformOperationExecutor.prototype.applyCustomTransformations = function (value, target, key, obj, transformationType) {
            var _this = this;
            var metadatas = defaultMetadataStorage.findTransformMetadatas(target, key, this.transformationType);
            // apply versioning options
            if (this.options.version !== undefined) {
                metadatas = metadatas.filter(function (metadata) {
                    if (!metadata.options)
                        return true;
                    return _this.checkVersion(metadata.options.since, metadata.options.until);
                });
            }
            // apply grouping options
            if (this.options.groups && this.options.groups.length) {
                metadatas = metadatas.filter(function (metadata) {
                    if (!metadata.options)
                        return true;
                    return _this.checkGroups(metadata.options.groups);
                });
            }
            else {
                metadatas = metadatas.filter(function (metadata) {
                    return !metadata.options || !metadata.options.groups || !metadata.options.groups.length;
                });
            }
            metadatas.forEach(function (metadata) {
                value = metadata.transformFn({ value: value, key: key, obj: obj, type: transformationType, options: _this.options });
            });
            return value;
        };
        // preventing circular references
        TransformOperationExecutor.prototype.isCircular = function (object) {
            return this.recursionStack.has(object);
        };
        TransformOperationExecutor.prototype.getReflectedType = function (target, propertyName) {
            if (!target)
                return undefined;
            var meta = defaultMetadataStorage.findTypeMetadata(target, propertyName);
            return meta ? meta.reflectedType : undefined;
        };
        TransformOperationExecutor.prototype.getKeys = function (target, object, isMap) {
            var _this = this;
            // determine exclusion strategy
            var strategy = defaultMetadataStorage.getStrategy(target);
            if (strategy === 'none')
                strategy = this.options.strategy || 'exposeAll'; // exposeAll is default strategy
            // get all keys that need to expose
            var keys = [];
            if (strategy === 'exposeAll' || isMap) {
                if (object instanceof Map) {
                    keys = Array.from(object.keys());
                }
                else {
                    keys = Object.keys(object);
                }
            }
            if (isMap) {
                // expose & exclude do not apply for map keys only to fields
                return keys;
            }
            /**
             * If decorators are ignored but we don't want the extraneous values, then we use the
             * metadata to decide which property is needed, but doesn't apply the decorator effect.
             */
            if (this.options.ignoreDecorators && this.options.excludeExtraneousValues && target) {
                var exposedProperties = defaultMetadataStorage.getExposedProperties(target, this.transformationType);
                var excludedProperties = defaultMetadataStorage.getExcludedProperties(target, this.transformationType);
                keys = __spreadArray(__spreadArray([], exposedProperties, true), excludedProperties, true);
            }
            if (!this.options.ignoreDecorators && target) {
                // add all exposed to list of keys
                var exposedProperties = defaultMetadataStorage.getExposedProperties(target, this.transformationType);
                if (this.transformationType === exports.TransformationType.PLAIN_TO_CLASS) {
                    exposedProperties = exposedProperties.map(function (key) {
                        var exposeMetadata = defaultMetadataStorage.findExposeMetadata(target, key);
                        if (exposeMetadata && exposeMetadata.options && exposeMetadata.options.name) {
                            return exposeMetadata.options.name;
                        }
                        return key;
                    });
                }
                if (this.options.excludeExtraneousValues) {
                    keys = exposedProperties;
                }
                else {
                    keys = keys.concat(exposedProperties);
                }
                // exclude excluded properties
                var excludedProperties_1 = defaultMetadataStorage.getExcludedProperties(target, this.transformationType);
                if (excludedProperties_1.length > 0) {
                    keys = keys.filter(function (key) {
                        return !excludedProperties_1.includes(key);
                    });
                }
                // apply versioning options
                if (this.options.version !== undefined) {
                    keys = keys.filter(function (key) {
                        var exposeMetadata = defaultMetadataStorage.findExposeMetadata(target, key);
                        if (!exposeMetadata || !exposeMetadata.options)
                            return true;
                        return _this.checkVersion(exposeMetadata.options.since, exposeMetadata.options.until);
                    });
                }
                // apply grouping options
                if (this.options.groups && this.options.groups.length) {
                    keys = keys.filter(function (key) {
                        var exposeMetadata = defaultMetadataStorage.findExposeMetadata(target, key);
                        if (!exposeMetadata || !exposeMetadata.options)
                            return true;
                        return _this.checkGroups(exposeMetadata.options.groups);
                    });
                }
                else {
                    keys = keys.filter(function (key) {
                        var exposeMetadata = defaultMetadataStorage.findExposeMetadata(target, key);
                        return (!exposeMetadata ||
                            !exposeMetadata.options ||
                            !exposeMetadata.options.groups ||
                            !exposeMetadata.options.groups.length);
                    });
                }
            }
            // exclude prefixed properties
            if (this.options.excludePrefixes && this.options.excludePrefixes.length) {
                keys = keys.filter(function (key) {
                    return _this.options.excludePrefixes.every(function (prefix) {
                        return key.substr(0, prefix.length) !== prefix;
                    });
                });
            }
            // make sure we have unique keys
            keys = keys.filter(function (key, index, self) {
                return self.indexOf(key) === index;
            });
            return keys;
        };
        TransformOperationExecutor.prototype.checkVersion = function (since, until) {
            var decision = true;
            if (decision && since)
                decision = this.options.version >= since;
            if (decision && until)
                decision = this.options.version < until;
            return decision;
        };
        TransformOperationExecutor.prototype.checkGroups = function (groups) {
            if (!groups)
                return true;
            return this.options.groups.some(function (optionGroup) { return groups.includes(optionGroup); });
        };
        return TransformOperationExecutor;
    }());

    /**
     * These are the default options used by any transformation operation.
     */
    var defaultOptions = {
        enableCircularCheck: false,
        enableImplicitConversion: false,
        excludeExtraneousValues: false,
        excludePrefixes: undefined,
        exposeDefaultValues: false,
        exposeUnsetFields: true,
        groups: undefined,
        ignoreDecorators: false,
        strategy: undefined,
        targetMaps: undefined,
        version: undefined,
    };

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
    var ClassTransformer = /** @class */ (function () {
        function ClassTransformer() {
        }
        ClassTransformer.prototype.instanceToPlain = function (object, options) {
            var executor = new TransformOperationExecutor(exports.TransformationType.CLASS_TO_PLAIN, __assign(__assign({}, defaultOptions), options));
            return executor.transform(undefined, object, undefined, undefined, undefined, undefined);
        };
        ClassTransformer.prototype.classToPlainFromExist = function (object, plainObject, options) {
            var executor = new TransformOperationExecutor(exports.TransformationType.CLASS_TO_PLAIN, __assign(__assign({}, defaultOptions), options));
            return executor.transform(plainObject, object, undefined, undefined, undefined, undefined);
        };
        ClassTransformer.prototype.plainToInstance = function (cls, plain, options) {
            var executor = new TransformOperationExecutor(exports.TransformationType.PLAIN_TO_CLASS, __assign(__assign({}, defaultOptions), options));
            return executor.transform(undefined, plain, cls, undefined, undefined, undefined);
        };
        ClassTransformer.prototype.plainToClassFromExist = function (clsObject, plain, options) {
            var executor = new TransformOperationExecutor(exports.TransformationType.PLAIN_TO_CLASS, __assign(__assign({}, defaultOptions), options));
            return executor.transform(clsObject, plain, undefined, undefined, undefined, undefined);
        };
        ClassTransformer.prototype.instanceToInstance = function (object, options) {
            var executor = new TransformOperationExecutor(exports.TransformationType.CLASS_TO_CLASS, __assign(__assign({}, defaultOptions), options));
            return executor.transform(undefined, object, undefined, undefined, undefined, undefined);
        };
        ClassTransformer.prototype.classToClassFromExist = function (object, fromObject, options) {
            var executor = new TransformOperationExecutor(exports.TransformationType.CLASS_TO_CLASS, __assign(__assign({}, defaultOptions), options));
            return executor.transform(fromObject, object, undefined, undefined, undefined, undefined);
        };
        ClassTransformer.prototype.serialize = function (object, options) {
            return JSON.stringify(this.instanceToPlain(object, options));
        };
        /**
         * Deserializes given JSON string to a object of the given class.
         */
        ClassTransformer.prototype.deserialize = function (cls, json, options) {
            var jsonObject = JSON.parse(json);
            return this.plainToInstance(cls, jsonObject, options);
        };
        /**
         * Deserializes given JSON string to an array of objects of the given class.
         */
        ClassTransformer.prototype.deserializeArray = function (cls, json, options) {
            var jsonObject = JSON.parse(json);
            return this.plainToInstance(cls, jsonObject, options);
        };
        return ClassTransformer;
    }());

    /**
     * Marks the given class or property as excluded. By default the property is excluded in both
     * constructorToPlain and plainToConstructor transformations. It can be limited to only one direction
     * via using the `toPlainOnly` or `toClassOnly` option.
     *
     * Can be applied to class definitions and properties.
     */
    function Exclude(options) {
        if (options === void 0) { options = {}; }
        /**
         * NOTE: The `propertyName` property must be marked as optional because
         * this decorator used both as a class and a property decorator and the
         * Typescript compiler will freak out if we make it mandatory as a class
         * decorator only receives one parameter.
         */
        return function (object, propertyName) {
            defaultMetadataStorage.addExcludeMetadata({
                target: object instanceof Function ? object : object.constructor,
                propertyName: propertyName,
                options: options,
            });
        };
    }

    /**
     * Marks the given class or property as included. By default the property is included in both
     * constructorToPlain and plainToConstructor transformations. It can be limited to only one direction
     * via using the `toPlainOnly` or `toClassOnly` option.
     *
     * Can be applied to class definitions and properties.
     */
    function Expose(options) {
        if (options === void 0) { options = {}; }
        /**
         * NOTE: The `propertyName` property must be marked as optional because
         * this decorator used both as a class and a property decorator and the
         * Typescript compiler will freak out if we make it mandatory as a class
         * decorator only receives one parameter.
         */
        return function (object, propertyName) {
            defaultMetadataStorage.addExposeMetadata({
                target: object instanceof Function ? object : object.constructor,
                propertyName: propertyName,
                options: options,
            });
        };
    }

    /**
     * Return the class instance only with the exposed properties.
     *
     * Can be applied to functions and getters/setters only.
     */
    function TransformInstanceToInstance(params) {
        return function (target, propertyKey, descriptor) {
            var classTransformer = new ClassTransformer();
            var originalMethod = descriptor.value;
            descriptor.value = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var result = originalMethod.apply(this, args);
                var isPromise = !!result && (typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function';
                return isPromise
                    ? result.then(function (data) { return classTransformer.instanceToInstance(data, params); })
                    : classTransformer.instanceToInstance(result, params);
            };
        };
    }

    /**
     * Transform the object from class to plain object and return only with the exposed properties.
     *
     * Can be applied to functions and getters/setters only.
     */
    function TransformInstanceToPlain(params) {
        return function (target, propertyKey, descriptor) {
            var classTransformer = new ClassTransformer();
            var originalMethod = descriptor.value;
            descriptor.value = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var result = originalMethod.apply(this, args);
                var isPromise = !!result && (typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function';
                return isPromise
                    ? result.then(function (data) { return classTransformer.instanceToPlain(data, params); })
                    : classTransformer.instanceToPlain(result, params);
            };
        };
    }

    /**
     * Return the class instance only with the exposed properties.
     *
     * Can be applied to functions and getters/setters only.
     */
    function TransformPlainToInstance(classType, params) {
        return function (target, propertyKey, descriptor) {
            var classTransformer = new ClassTransformer();
            var originalMethod = descriptor.value;
            descriptor.value = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var result = originalMethod.apply(this, args);
                var isPromise = !!result && (typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function';
                return isPromise
                    ? result.then(function (data) { return classTransformer.plainToInstance(classType, data, params); })
                    : classTransformer.plainToInstance(classType, result, params);
            };
        };
    }

    /**
     * Defines a custom logic for value transformation.
     *
     * Can be applied to properties only.
     */
    function Transform(transformFn, options) {
        if (options === void 0) { options = {}; }
        return function (target, propertyName) {
            defaultMetadataStorage.addTransformMetadata({
                target: target.constructor,
                propertyName: propertyName,
                transformFn: transformFn,
                options: options,
            });
        };
    }

    /**
     * Specifies a type of the property.
     * The given TypeFunction can return a constructor. A discriminator can be given in the options.
     *
     * Can be applied to properties only.
     */
    function Type(typeFunction, options) {
        if (options === void 0) { options = {}; }
        return function (target, propertyName) {
            var reflectedType = Reflect.getMetadata('design:type', target, propertyName);
            defaultMetadataStorage.addTypeMetadata({
                target: target.constructor,
                propertyName: propertyName,
                reflectedType: reflectedType,
                typeFunction: typeFunction,
                options: options,
            });
        };
    }

    var classTransformer = new ClassTransformer();
    function classToPlain(object, options) {
        return classTransformer.instanceToPlain(object, options);
    }
    function instanceToPlain(object, options) {
        return classTransformer.instanceToPlain(object, options);
    }
    function classToPlainFromExist(object, plainObject, options) {
        return classTransformer.classToPlainFromExist(object, plainObject, options);
    }
    function plainToClass(cls, plain, options) {
        return classTransformer.plainToInstance(cls, plain, options);
    }
    function plainToInstance(cls, plain, options) {
        return classTransformer.plainToInstance(cls, plain, options);
    }
    function plainToClassFromExist(clsObject, plain, options) {
        return classTransformer.plainToClassFromExist(clsObject, plain, options);
    }
    function instanceToInstance(object, options) {
        return classTransformer.instanceToInstance(object, options);
    }
    function classToClassFromExist(object, fromObject, options) {
        return classTransformer.classToClassFromExist(object, fromObject, options);
    }
    function serialize(object, options) {
        return classTransformer.serialize(object, options);
    }
    /**
     * Deserializes given JSON string to a object of the given class.
     *
     * @deprecated This function is being removed. Please use the following instead:
     * ```
     * instanceToClass(cls, JSON.parse(json), options)
     * ```
     */
    function deserialize(cls, json, options) {
        return classTransformer.deserialize(cls, json, options);
    }
    /**
     * Deserializes given JSON string to an array of objects of the given class.
     *
     * @deprecated This function is being removed. Please use the following instead:
     * ```
     * JSON.parse(json).map(value => instanceToClass(cls, value, options))
     * ```
     *
     */
    function deserializeArray(cls, json, options) {
        return classTransformer.deserializeArray(cls, json, options);
    }

    exports.ClassTransformer = ClassTransformer;
    exports.Exclude = Exclude;
    exports.Expose = Expose;
    exports.Transform = Transform;
    exports.TransformInstanceToInstance = TransformInstanceToInstance;
    exports.TransformInstanceToPlain = TransformInstanceToPlain;
    exports.TransformPlainToInstance = TransformPlainToInstance;
    exports.Type = Type;
    exports.classToClassFromExist = classToClassFromExist;
    exports.classToPlain = classToPlain;
    exports.classToPlainFromExist = classToPlainFromExist;
    exports.deserialize = deserialize;
    exports.deserializeArray = deserializeArray;
    exports.instanceToInstance = instanceToInstance;
    exports.instanceToPlain = instanceToPlain;
    exports.plainToClass = plainToClass;
    exports.plainToClassFromExist = plainToClassFromExist;
    exports.plainToInstance = plainToInstance;
    exports.serialize = serialize;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=class-transformer.umd.js.map
