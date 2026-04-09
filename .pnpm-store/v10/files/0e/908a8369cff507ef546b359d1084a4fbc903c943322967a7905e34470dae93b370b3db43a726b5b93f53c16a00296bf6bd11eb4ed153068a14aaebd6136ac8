"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_EXPRESSION_KEYS = void 0;
exports.isRegexpSuccessCriteria = isRegexpSuccessCriteria;
exports.isJSONPathSuccessCriteria = isJSONPathSuccessCriteria;
exports.validateSuccessCriteria = validateSuccessCriteria;
function isRegexpSuccessCriteria(criteria) {
    return criteria.type === 'regex';
}
function isJSONPathSuccessCriteria(criteria) {
    const typeValue = criteria?.type;
    return (typeValue === 'jsonpath' || (typeof typeValue === 'object' && typeValue?.type === 'jsonpath'));
}
exports.ALLOWED_EXPRESSION_KEYS = [
    '$url',
    '$method',
    '$statusCode',
    '$request',
    '$response',
    '$inputs',
    '$outputs',
    '$steps',
    '$workflows',
    '$sourceDescriptions',
    '$components',
];
function validateSuccessCriteria(successCriteria) {
    successCriteria.forEach((criteria) => {
        const { condition } = criteria;
        if (isRegexpSuccessCriteria(criteria)) {
            const { context } = criteria;
            const regex = /\$[a-zA-Z_]\w*/g;
            const matches = context.match(regex);
            if (!matches) {
                throw new Error(`"${context}" does not contain any valid context.`);
            }
            const invalidKeys = matches.filter((key) => !exports.ALLOWED_EXPRESSION_KEYS.includes(key));
            if (invalidKeys.length) {
                throw new Error(`Success criteria context "${context}" is not allowed.`);
            }
        }
        else if (isJSONPathSuccessCriteria(criteria)) {
            if (!criteria.context) {
                throw new Error(`jsonpath success criteria context is required.`);
            }
            if (!criteria.condition) {
                throw new Error(`jsonpath success criteria condition is required.`);
            }
        }
        else {
            const regex = /\$[a-zA-Z_]\w*/g;
            const matches = condition.match(regex);
            if (!matches) {
                return;
            }
            const invalidKeys = matches.filter((key) => !exports.ALLOWED_EXPRESSION_KEYS.includes(key));
            if (invalidKeys.length) {
                throw new Error(`Success criteria condition ${condition} is not allowed.`);
            }
        }
    });
}
//# sourceMappingURL=validate-success-criteria.js.map