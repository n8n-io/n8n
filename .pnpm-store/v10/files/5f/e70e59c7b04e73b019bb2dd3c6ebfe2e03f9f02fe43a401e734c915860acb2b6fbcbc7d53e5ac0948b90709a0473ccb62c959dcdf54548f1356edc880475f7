const isObjectLike = (value) => typeof value === 'object' && value !== null;
export function isObject(input) {
    if (!isObjectLike(input) || Object.prototype.toString.call(input) !== '[object Object]') {
        return false;
    }
    if (Object.getPrototypeOf(input) === null) {
        return true;
    }
    let proto = input;
    while (Object.getPrototypeOf(proto) !== null) {
        proto = Object.getPrototypeOf(proto);
    }
    return Object.getPrototypeOf(input) === proto;
}
export function isDisjoint(...headers) {
    const sources = headers.filter(Boolean);
    if (sources.length === 0 || sources.length === 1) {
        return true;
    }
    let acc;
    for (const header of sources) {
        const parameters = Object.keys(header);
        if (!acc || acc.size === 0) {
            acc = new Set(parameters);
            continue;
        }
        for (const parameter of parameters) {
            if (acc.has(parameter)) {
                return false;
            }
            acc.add(parameter);
        }
    }
    return true;
}
export const isJWK = (key) => isObject(key) && typeof key.kty === 'string';
export const isPrivateJWK = (key) => key.kty !== 'oct' &&
    ((key.kty === 'AKP' && typeof key.priv === 'string') || typeof key.d === 'string');
export const isPublicJWK = (key) => key.kty !== 'oct' && key.d === undefined && key.priv === undefined;
export const isSecretJWK = (key) => key.kty === 'oct' && typeof key.k === 'string';
