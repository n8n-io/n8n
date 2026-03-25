"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exclusion = void 0;
const globals_1 = require("../globals");
const error_1 = require("../error");
/**
 * Creates a database exclusion.
 * Can be used on entity.
 * Can create exclusions with composite columns when used on entity.
 */
function Exclusion(nameOrExpression, maybeExpression) {
    const name = maybeExpression ? nameOrExpression : undefined;
    const expression = maybeExpression ? maybeExpression : nameOrExpression;
    if (!expression)
        throw new error_1.TypeORMError(`Exclusion expression is required`);
    return function (clsOrObject, propertyName) {
        (0, globals_1.getMetadataArgsStorage)().exclusions.push({
            target: propertyName
                ? clsOrObject.constructor
                : clsOrObject,
            name: name,
            expression: expression,
        });
    };
}
exports.Exclusion = Exclusion;

//# sourceMappingURL=Exclusion.js.map
