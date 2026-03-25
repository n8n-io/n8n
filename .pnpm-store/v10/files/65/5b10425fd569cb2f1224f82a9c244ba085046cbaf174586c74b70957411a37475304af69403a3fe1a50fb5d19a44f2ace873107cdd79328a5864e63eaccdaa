"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Check = void 0;
const globals_1 = require("../globals");
const error_1 = require("../error");
/**
 * Creates a database check.
 * Can be used on entity property or on entity.
 * Can create checks with composite columns when used on entity.
 */
function Check(nameOrExpression, maybeExpression) {
    const name = maybeExpression ? nameOrExpression : undefined;
    const expression = maybeExpression ? maybeExpression : nameOrExpression;
    if (!expression)
        throw new error_1.TypeORMError(`Check expression is required`);
    return function (clsOrObject, propertyName) {
        (0, globals_1.getMetadataArgsStorage)().checks.push({
            target: propertyName
                ? clsOrObject.constructor
                : clsOrObject,
            name: name,
            expression: expression,
        });
    };
}
exports.Check = Check;

//# sourceMappingURL=Check.js.map
