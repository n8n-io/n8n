"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterUpdateTime = exports.FilterCreationTime = exports.FilterTime = exports.FilterId = exports.FilterCount = exports.FilterRef = exports.FilterProperty = exports.FilterBase = exports.Filters = void 0;
const errors_js_1 = require("../../errors.js");
const base_js_1 = require("../../proto/v1/base.js");
const utils_js_1 = require("./utils.js");
/**
 * Use this class when you want to chain filters together using logical operators.
 *
 * Since JS/TS has no native support for & and | as logical operators, you must use these methods and nest
 * the filters you want to combine.
 *
 * ANDs and ORs can be nested an arbitrary number of times.
 *
 * @example
 * ```ts
 * const filter = Filters.and(
 *   collection.filter.byProperty('name').equal('John'),
 *   collection.filter.byProperty('age').greaterThan(18),
 * );
 * ```
 */
class Filters {
    /**
     * Combine filters using the logical AND operator.
     *
     * @param {FilterValue[]} filters The filters to combine.
     */
    static and(...filters) {
        return {
            operator: 'And',
            filters,
            value: null,
        };
    }
    /**
     * Combine filters using the logical OR operator.
     *
     * @param {FilterValue[]} filters The filters to combine.
     */
    static or(...filters) {
        return {
            operator: 'Or',
            filters,
            value: null,
        };
    }
    /**
     * Negate a filter using the logical NOT operator.
     *
     * @param {FilterValue} filter The filter to negate.
     */
    static not(filter) {
        return {
            operator: 'Not',
            filters: [filter],
            value: null,
        };
    }
}
exports.Filters = Filters;
class FilterBase {
    constructor(property, target) {
        this.property = property;
        this.target = target;
    }
    targetPath() {
        if (!this.target) {
            return base_js_1.FilterTarget.fromPartial({
                property: utils_js_1.TargetGuards.isProperty(this.property) ? this.property : undefined,
                count: utils_js_1.TargetGuards.isCountRef(this.property)
                    ? base_js_1.FilterReferenceCount.fromPartial({
                        on: this.property.linkOn,
                    })
                    : undefined,
            });
        }
        let target = this.target;
        while (target.target !== undefined) {
            if (utils_js_1.TargetGuards.isTargetRef(target.target)) {
                target = target.target;
            }
            else {
                throw new errors_js_1.WeaviateInvalidInputError('Invalid target reference');
            }
        }
        target.target = this.property;
        return this.resolveTargets(this.target);
    }
    resolveTargets(internal) {
        return base_js_1.FilterTarget.fromPartial({
            property: utils_js_1.TargetGuards.isProperty(internal) ? internal : undefined,
            singleTarget: utils_js_1.TargetGuards.isSingleTargetRef(internal)
                ? base_js_1.FilterReferenceSingleTarget.fromPartial({
                    on: internal.linkOn,
                    target: this.resolveTargets(internal.target),
                })
                : undefined,
            multiTarget: utils_js_1.TargetGuards.isMultiTargetRef(internal)
                ? base_js_1.FilterReferenceMultiTarget.fromPartial({
                    on: internal.linkOn,
                    targetCollection: internal.targetCollection,
                    target: this.resolveTargets(internal.target),
                })
                : undefined,
            count: utils_js_1.TargetGuards.isCountRef(internal)
                ? base_js_1.FilterReferenceCount.fromPartial({
                    on: internal.linkOn,
                })
                : undefined,
        });
    }
}
exports.FilterBase = FilterBase;
class FilterProperty extends FilterBase {
    constructor(property, length, target) {
        super(length ? `len(${property})` : property, target);
    }
    isNull(value) {
        return {
            operator: 'IsNull',
            target: this.targetPath(),
            value: value,
        };
    }
    containsAny(value) {
        return {
            operator: 'ContainsAny',
            target: this.targetPath(),
            value: value,
        };
    }
    containsNone(value) {
        return {
            operator: 'ContainsNone',
            target: this.targetPath(),
            value: value,
        };
    }
    containsAll(value) {
        return {
            operator: 'ContainsAll',
            target: this.targetPath(),
            value: value,
        };
    }
    equal(value) {
        return {
            operator: 'Equal',
            target: this.targetPath(),
            value: value,
        };
    }
    notEqual(value) {
        return {
            operator: 'NotEqual',
            target: this.targetPath(),
            value: value,
        };
    }
    lessThan(value) {
        return {
            operator: 'LessThan',
            target: this.targetPath(),
            value: value,
        };
    }
    lessOrEqual(value) {
        return {
            operator: 'LessThanEqual',
            target: this.targetPath(),
            value: value,
        };
    }
    greaterThan(value) {
        return {
            operator: 'GreaterThan',
            target: this.targetPath(),
            value: value,
        };
    }
    greaterOrEqual(value) {
        return {
            operator: 'GreaterThanEqual',
            target: this.targetPath(),
            value: value,
        };
    }
    like(value) {
        return {
            operator: 'Like',
            target: this.targetPath(),
            value: value,
        };
    }
    withinGeoRange(value) {
        return {
            operator: 'WithinGeoRange',
            target: this.targetPath(),
            value: value,
        };
    }
}
exports.FilterProperty = FilterProperty;
class FilterRef {
    constructor(target) {
        this.target = target;
    }
    byRef(linkOn) {
        this.target.target = { type_: 'single', linkOn: linkOn };
        return new FilterRef(Object.assign({}, this.target));
    }
    byRefMultiTarget(linkOn, targetCollection) {
        this.target.target = { type_: 'multi', linkOn: linkOn, targetCollection: targetCollection };
        return new FilterRef(Object.assign({}, this.target));
    }
    byProperty(name, length = false) {
        return new FilterProperty(name, length, Object.assign({}, this.target));
    }
    byRefCount(linkOn) {
        return new FilterCount(linkOn, Object.assign({}, this.target));
    }
    byId() {
        return new FilterId(Object.assign({}, this.target));
    }
    byCreationTime() {
        return new FilterCreationTime(Object.assign({}, this.target));
    }
    byUpdateTime() {
        return new FilterUpdateTime(Object.assign({}, this.target));
    }
}
exports.FilterRef = FilterRef;
class FilterCount extends FilterBase {
    constructor(linkOn, target) {
        super({ type_: 'count', linkOn }, target);
    }
    equal(value) {
        return {
            operator: 'Equal',
            target: this.targetPath(),
            value: value,
        };
    }
    notEqual(value) {
        return {
            operator: 'NotEqual',
            target: this.targetPath(),
            value: value,
        };
    }
    lessThan(value) {
        return {
            operator: 'LessThan',
            target: this.targetPath(),
            value: value,
        };
    }
    lessOrEqual(value) {
        return {
            operator: 'LessThanEqual',
            target: this.targetPath(),
            value: value,
        };
    }
    greaterThan(value) {
        return {
            operator: 'GreaterThan',
            target: this.targetPath(),
            value: value,
        };
    }
    greaterOrEqual(value) {
        return {
            operator: 'GreaterThanEqual',
            target: this.targetPath(),
            value: value,
        };
    }
}
exports.FilterCount = FilterCount;
class FilterId extends FilterBase {
    constructor(target) {
        super('_id', target);
    }
    equal(value) {
        return {
            operator: 'Equal',
            target: this.targetPath(),
            value: value,
        };
    }
    notEqual(value) {
        return {
            operator: 'NotEqual',
            target: this.targetPath(),
            value: value,
        };
    }
    containsAny(value) {
        return {
            operator: 'ContainsAny',
            target: this.targetPath(),
            value: value,
        };
    }
}
exports.FilterId = FilterId;
class FilterTime extends FilterBase {
    containsAny(value) {
        return {
            operator: 'ContainsAny',
            target: this.targetPath(),
            value: value.map(this.toValue),
        };
    }
    equal(value) {
        return {
            operator: 'Equal',
            target: this.targetPath(),
            value: this.toValue(value),
        };
    }
    notEqual(value) {
        return {
            operator: 'NotEqual',
            target: this.targetPath(),
            value: this.toValue(value),
        };
    }
    lessThan(value) {
        return {
            operator: 'LessThan',
            target: this.targetPath(),
            value: this.toValue(value),
        };
    }
    lessOrEqual(value) {
        return {
            operator: 'LessThanEqual',
            target: this.targetPath(),
            value: this.toValue(value),
        };
    }
    greaterThan(value) {
        return {
            operator: 'GreaterThan',
            target: this.targetPath(),
            value: this.toValue(value),
        };
    }
    greaterOrEqual(value) {
        return {
            operator: 'GreaterThanEqual',
            target: this.targetPath(),
            value: this.toValue(value),
        };
    }
    toValue(value) {
        return value instanceof Date ? value.toISOString() : value;
    }
}
exports.FilterTime = FilterTime;
class FilterCreationTime extends FilterTime {
    constructor(target) {
        super('_creationTimeUnix', target);
    }
}
exports.FilterCreationTime = FilterCreationTime;
class FilterUpdateTime extends FilterTime {
    constructor(target) {
        super('_lastUpdateTimeUnix', target);
    }
}
exports.FilterUpdateTime = FilterUpdateTime;
