"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindOperator = void 0;
const InstanceChecker_1 = require("../util/InstanceChecker");
const ApplyValueTransformers_1 = require("../util/ApplyValueTransformers");
/**
 * Find Operator used in Find Conditions.
 */
class FindOperator {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(type, value, useParameter = true, multipleParameters = false, getSql, objectLiteralParameters) {
        this["@instanceof"] = Symbol.for("FindOperator");
        this._type = type;
        this._value = value;
        this._useParameter = useParameter;
        this._multipleParameters = multipleParameters;
        this._getSql = getSql;
        this._objectLiteralParameters = objectLiteralParameters;
    }
    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------
    /**
     * Indicates if parameter is used or not for this operator.
     * Extracts final value if value is another find operator.
     */
    get useParameter() {
        if (InstanceChecker_1.InstanceChecker.isFindOperator(this._value))
            return this._value.useParameter;
        return this._useParameter;
    }
    /**
     * Indicates if multiple parameters must be used for this operator.
     * Extracts final value if value is another find operator.
     */
    get multipleParameters() {
        if (InstanceChecker_1.InstanceChecker.isFindOperator(this._value))
            return this._value.multipleParameters;
        return this._multipleParameters;
    }
    /**
     * Gets the Type of this FindOperator
     */
    get type() {
        return this._type;
    }
    /**
     * Gets the final value needs to be used as parameter value.
     */
    get value() {
        if (InstanceChecker_1.InstanceChecker.isFindOperator(this._value))
            return this._value.value;
        return this._value;
    }
    /**
     * Gets ObjectLiteral parameters.
     */
    get objectLiteralParameters() {
        if (InstanceChecker_1.InstanceChecker.isFindOperator(this._value))
            return this._value.objectLiteralParameters;
        return this._objectLiteralParameters;
    }
    /**
     * Gets the child FindOperator if it exists
     */
    get child() {
        if (InstanceChecker_1.InstanceChecker.isFindOperator(this._value))
            return this._value;
        return undefined;
    }
    /**
     * Gets the SQL generator
     */
    get getSql() {
        if (InstanceChecker_1.InstanceChecker.isFindOperator(this._value))
            return this._value.getSql;
        return this._getSql;
    }
    transformValue(transformer) {
        if (this._value instanceof FindOperator) {
            this._value.transformValue(transformer);
        }
        else {
            this._value =
                Array.isArray(this._value) && this._multipleParameters
                    ? this._value.map((v) => transformer &&
                        ApplyValueTransformers_1.ApplyValueTransformers.transformTo(transformer, v))
                    : ApplyValueTransformers_1.ApplyValueTransformers.transformTo(transformer, this._value);
        }
    }
}
exports.FindOperator = FindOperator;

//# sourceMappingURL=FindOperator.js.map
