"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMessageMatcher = errorMessageMatcher;
const colorette_1 = require("colorette");
function errorMessageMatcher(hint, // assertion returned from call to matcherHint
generic, // condition which correct value must fulfill
specific // incorrect value returned from call to printWithType
) {
    return `${hint}\n\n${(0, colorette_1.bold)('Matcher error')}: ${generic}${typeof specific === 'string' ? `\n\n${specific}` : ''}`;
}
//# sourceMappingURL=error-message-matcher.js.map