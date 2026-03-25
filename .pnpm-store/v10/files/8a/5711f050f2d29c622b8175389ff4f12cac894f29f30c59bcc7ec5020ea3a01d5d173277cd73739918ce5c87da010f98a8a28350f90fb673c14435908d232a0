"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Location = void 0;
exports.joinPointer = joinPointer;
exports.isRef = isRef;
exports.isExternalValue = isExternalValue;
exports.unescapePointer = unescapePointer;
exports.escapePointer = escapePointer;
exports.parseRef = parseRef;
exports.parsePointer = parsePointer;
exports.pointerBaseName = pointerBaseName;
exports.refBaseName = refBaseName;
exports.isAbsoluteUrl = isAbsoluteUrl;
exports.isMappingRef = isMappingRef;
exports.isAnchor = isAnchor;
const utils_1 = require("./utils");
function joinPointer(base, key) {
    if (base === '')
        base = '#/';
    return base[base.length - 1] === '/' ? base + key : base + '/' + key;
}
function isRef(node) {
    return (0, utils_1.isPlainObject)(node) && typeof node.$ref === 'string';
}
function isExternalValue(node) {
    return (0, utils_1.isPlainObject)(node) && typeof node.externalValue === 'string';
}
class Location {
    constructor(source, pointer) {
        this.source = source;
        this.pointer = pointer;
    }
    child(components) {
        return new Location(this.source, joinPointer(this.pointer, (Array.isArray(components) ? components : [components]).map(escapePointer).join('/')));
    }
    key() {
        return { ...this, reportOnKey: true };
    }
    get absolutePointer() {
        return this.source.absoluteRef + (this.pointer === '#/' ? '' : this.pointer);
    }
}
exports.Location = Location;
function unescapePointer(fragment) {
    return decodeURIComponent(fragment.replace(/~1/g, '/').replace(/~0/g, '~'));
}
function escapePointer(fragment) {
    if (typeof fragment === 'number')
        return fragment;
    return fragment.replace(/~/g, '~0').replace(/\//g, '~1');
}
function parseRef(ref) {
    const [uri, pointer = ''] = ref.split('#/');
    return {
        uri: (uri.endsWith('#') ? uri.slice(0, -1) : uri) || null,
        pointer: parsePointer(pointer),
    };
}
function parsePointer(pointer) {
    return pointer.split('/').map(unescapePointer).filter(utils_1.isTruthy);
}
function pointerBaseName(pointer) {
    const parts = pointer.split('/');
    return parts[parts.length - 1];
}
function refBaseName(ref) {
    // eslint-disable-next-line no-useless-escape
    const parts = ref.split(/[\/\\]/); // split by '\' and '/'
    return parts[parts.length - 1].replace(/\.[^.]+$/, ''); // replace extension with empty string
}
function isAbsoluteUrl(ref) {
    return ref.startsWith('http://') || ref.startsWith('https://');
}
function isMappingRef(mapping) {
    // TODO: proper detection of mapping refs
    return (mapping.startsWith('#') ||
        mapping.startsWith('https://') ||
        mapping.startsWith('http://') ||
        mapping.startsWith('./') ||
        mapping.startsWith('../') ||
        mapping.indexOf('/') > -1);
}
function isAnchor(ref) {
    return /^#[A-Za-z][A-Za-z0-9\-_:.]*$/.test(ref);
}
