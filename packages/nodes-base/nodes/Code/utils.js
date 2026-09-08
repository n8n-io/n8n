export function isObject(maybe) {
    return (typeof maybe === 'object' && maybe !== null && !Array.isArray(maybe) && !(maybe instanceof Date));
}
function isTraversable(maybe) {
    return isObject(maybe) && typeof maybe.toJSON !== 'function' && Object.keys(maybe).length > 0;
}
/**
 * Stringify any non-standard JS objects (e.g. `Date`, `RegExp`) inside output items at any depth.
 */
export function standardizeOutput(output) {
    function standardizeOutputRecursive(obj, knownObjects = new WeakSet()) {
        for (const [key, value] of Object.entries(obj)) {
            if (!isTraversable(value))
                continue;
            if (typeof value === 'object' && value !== null) {
                if (knownObjects.has(value)) {
                    // Found circular reference
                    continue;
                }
                knownObjects.add(value);
            }
            obj[key] =
                value.constructor.name !== 'Object'
                    ? JSON.stringify(value) // Date, RegExp, etc.
                    : standardizeOutputRecursive(value, knownObjects);
        }
        return obj;
    }
    standardizeOutputRecursive(output);
    return output;
}
export const addPostExecutionWarning = (context, returnData, inputItemsLength) => {
    if (returnData.length !== inputItemsLength ||
        returnData.some((item) => item.pairedItem === undefined)) {
        context.addExecutionHints({
            message: 'To make sure expressions after this node work, return the input items that produced each output item. <a target="_blank" href="https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-code-node/">More info</a>',
            location: 'outputPane',
        });
    }
};
//# sourceMappingURL=utils.js.map