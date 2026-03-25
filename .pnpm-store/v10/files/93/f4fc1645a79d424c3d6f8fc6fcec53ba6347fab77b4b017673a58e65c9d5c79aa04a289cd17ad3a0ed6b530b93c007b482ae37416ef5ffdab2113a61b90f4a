export function removePropertyRecursively(object, propToRemove) {
    return Object.fromEntries(Object.entries(object)
        .map(([key, value]) => {
        if (key === propToRemove) {
            return undefined;
        }
        if (typeof value !== 'object' || !value) {
            return [key, value];
        }
        if (Array.isArray(value)) {
            return [
                key,
                value.map((arrayItem) => typeof arrayItem === 'object'
                    ? removePropertyRecursively(arrayItem, propToRemove)
                    : arrayItem),
            ];
        }
        return [key, removePropertyRecursively(value, propToRemove)];
    })
        .filter(Boolean));
}
//# sourceMappingURL=remove-property-recursively.js.map