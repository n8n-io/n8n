import { map } from './map';
export function pluck(...properties) {
    const length = properties.length;
    if (length === 0) {
        throw new Error('list of properties cannot be empty.');
    }
    return map((x) => {
        let currentProp = x;
        for (let i = 0; i < length; i++) {
            const p = currentProp === null || currentProp === void 0 ? void 0 : currentProp[properties[i]];
            if (typeof p !== 'undefined') {
                currentProp = p;
            }
            else {
                return undefined;
            }
        }
        return currentProp;
    });
}
//# sourceMappingURL=pluck.js.map