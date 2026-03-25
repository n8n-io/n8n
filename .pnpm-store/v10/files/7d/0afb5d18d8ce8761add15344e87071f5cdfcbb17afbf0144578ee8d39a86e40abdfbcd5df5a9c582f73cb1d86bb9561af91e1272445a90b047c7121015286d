export function isObjectNotArray(obj) {
    return typeof obj === 'object' && obj != null && !Array.isArray(obj);
}
export function deepMerge(first = {}, second = {}) {
    const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
    return Object.fromEntries([...keys].map(key => {
        const firstHasKey = key in first;
        const secondHasKey = key in second;
        const firstValue = first[key];
        const secondValue = second[key];
        let value;
        if (firstHasKey && secondHasKey) {
            value =
                isObjectNotArray(firstValue) && isObjectNotArray(secondValue)
                    ? deepMerge(firstValue, secondValue)
                    :
                        secondValue;
        }
        else if (firstHasKey) {
            value = firstValue;
        }
        else {
            value = secondValue;
        }
        return [key, value];
    }));
}
//# sourceMappingURL=deep-merge.js.map