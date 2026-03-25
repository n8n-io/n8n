export function isValidStringProperty(input) {
    return typeof input == 'string' && input.length > 0;
}
export function isValidStringArray(input) {
    if (Array.isArray(input)) {
        for (const i in input) {
            if (!isValidStringProperty(input[i])) {
                return false;
            }
        }
        return true;
    }
    return false;
}
