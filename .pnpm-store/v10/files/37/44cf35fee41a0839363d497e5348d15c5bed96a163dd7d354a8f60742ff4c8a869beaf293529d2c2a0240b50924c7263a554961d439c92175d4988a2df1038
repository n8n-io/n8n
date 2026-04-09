export function filterObject(object, predicate) {
    const entries = Object.entries(object);
    return Object.fromEntries(entries.filter(([key, value]) => predicate(key, value)));
}
export function pick(object, ...keys) {
    const picked = {};
    for (const key of keys.flat()) {
        picked[key] = object[key];
    }
    return picked;
}
export function omit(object, ...keys) {
    return filterObject(object, key => !keys.flat().includes(key));
}
export function assignWithDefaults(to, from, defaults = to) {
    const keys = new Set([...Object.keys(to), ...Object.keys(from)]);
    for (const key of keys) {
        try {
            to[key] = from[key] ?? defaults[key] ?? to[key];
        }
        catch {
            // Do nothing
        }
    }
}
export function isJSON(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch {
        return false;
    }
}
export function resolveConstructors(object) {
    const constructors = [];
    for (let prototype = object; prototype && !['Function', 'Object'].includes(prototype.constructor.name); prototype = Object.getPrototypeOf(prototype)) {
        constructors.push(prototype.constructor.name);
    }
    return constructors;
}
export function* getAllPrototypes(object) {
    for (let prototype = object; prototype; prototype = Object.getPrototypeOf(prototype)) {
        yield prototype;
    }
}
export function map(items) {
    return new Map(Object.entries(items));
}
export function getByString(object, path, separator = /[.[\]'"]/) {
    return path
        .split(separator)
        .filter(p => p)
        .reduce((o, p) => o?.[p], object);
}
export function setByString(object, path, value, separator = /[.[\]'"]/) {
    return path
        .split(separator)
        .filter(p => p)
        .reduce((o, p, i) => (o[p] = path.split(separator).filter(p => p).length === ++i ? value : o[p] || {}), object);
}
/**
 * Binds a this value for all of the functions in an object (not recursive)
 */
export function bindFunctions(fns, thisValue) {
    return Object.fromEntries(Object.entries(fns).map(([k, v]) => [k, typeof v == 'function' ? v.bind(thisValue) : v]));
}
