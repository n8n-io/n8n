"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpandArguments = void 0;
const shell_quote_1 = require("shell-quote");
/**
 * Replace placeholders with additional arguments.
 */
class ExpandArguments {
    constructor(additionalArguments) {
        this.additionalArguments = additionalArguments;
    }
    parse(commandInfo) {
        const command = commandInfo.command.replace(/\\?\{([@*]|[1-9][0-9]*)\}/g, (match, placeholderTarget) => {
            // Don't replace the placeholder if it is escaped by a backslash.
            if (match.startsWith('\\')) {
                return match.slice(1);
            }
            // Replace numeric placeholder if value exists in additional arguments.
            if (!isNaN(placeholderTarget) &&
                placeholderTarget <= this.additionalArguments.length) {
                return (0, shell_quote_1.quote)([this.additionalArguments[placeholderTarget - 1]]);
            }
            // Replace all arguments placeholder.
            if (placeholderTarget === '@') {
                return (0, shell_quote_1.quote)(this.additionalArguments);
            }
            // Replace combined arguments placeholder.
            if (placeholderTarget === '*') {
                return (0, shell_quote_1.quote)([this.additionalArguments.join(' ')]);
            }
            // Replace placeholder with empty string
            // if value doesn't exist in additional arguments.
            return '';
        });
        return { ...commandInfo, command };
    }
}
exports.ExpandArguments = ExpandArguments;
