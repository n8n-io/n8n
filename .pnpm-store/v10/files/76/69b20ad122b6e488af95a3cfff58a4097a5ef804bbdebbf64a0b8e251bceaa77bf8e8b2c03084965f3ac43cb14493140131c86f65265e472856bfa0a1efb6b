"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = void 0;
/**
 * Validation error description.
 */
class ValidationError {
    /**
     *
     * @param shouldDecorate decorate the message with ANSI formatter escape codes for better readability
     * @param hasParent true when the error is a child of an another one
     * @param parentPath path as string to the parent of this property
     * @param showConstraintMessages show constraint messages instead of constraint names
     */
    toString(shouldDecorate = false, hasParent = false, parentPath = ``, showConstraintMessages = false) {
        const boldStart = shouldDecorate ? `\x1b[1m` : ``;
        const boldEnd = shouldDecorate ? `\x1b[22m` : ``;
        const constraintsToString = () => { var _a; return (showConstraintMessages ? Object.values : Object.keys)((_a = this.constraints) !== null && _a !== void 0 ? _a : {}).join(`, `); };
        const propConstraintFailed = (propertyName) => ` - property ${boldStart}${parentPath}${propertyName}${boldEnd} has failed the following constraints: ${boldStart}${constraintsToString()}${boldEnd} \n`;
        if (!hasParent) {
            return (`An instance of ${boldStart}${this.target ? this.target.constructor.name : 'an object'}${boldEnd} has failed the validation:\n` +
                (this.constraints ? propConstraintFailed(this.property) : ``) +
                (this.children
                    ? this.children
                        .map(childError => childError.toString(shouldDecorate, true, this.property, showConstraintMessages))
                        .join(``)
                    : ``));
        }
        else {
            // we format numbers as array indexes for better readability.
            const formattedProperty = Number.isInteger(+this.property)
                ? `[${this.property}]`
                : `${parentPath ? `.` : ``}${this.property}`;
            if (this.constraints) {
                return propConstraintFailed(formattedProperty);
            }
            else {
                return this.children
                    ? this.children
                        .map(childError => childError.toString(shouldDecorate, true, `${parentPath}${formattedProperty}`, showConstraintMessages))
                        .join(``)
                    : ``;
            }
        }
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=ValidationError.js.map