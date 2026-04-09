"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCliInputs = formatCliInputs;
function formatCliInputs(input) {
    if (!input) {
        return {};
    }
    if (Array.isArray(input)) {
        return input.reduce((result, param) => {
            const parsed = parseParam(param);
            return { ...result, ...parsed };
        }, {});
    }
    return parseParam(input);
}
function parseParam(param) {
    try {
        const parsedObject = JSON.parse(param);
        if (typeof parsedObject === 'object' && parsedObject !== null) {
            return parsedObject;
        }
    }
    catch {
        // do nothing
    }
    if (typeof param === 'string') {
        // Handle comma-separated key-value pairs
        if (param.includes(',')) {
            return param.split(',').reduce((acc, pair) => {
                const [key, value] = pair.split('=');
                if (key && value) {
                    acc[key.trim()] = value.trim();
                }
                return acc;
            }, {});
        }
        // Handle single key-value pair
        if (param.includes('=')) {
            const [key, value] = param.split('=');
            return { [key.trim()]: value.trim() };
        }
    }
    return {};
}
//# sourceMappingURL=format-cli-inputs.js.map