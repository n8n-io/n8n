import { toUint8Array } from './buffer.js';
import { _debugLog } from './debugging.js';
import * as primitive from './internal/primitives.js';
import { _polyfill_metadata, checkInstance, checkStruct, initMetadata, isCustom, isInstance, isStatic, isStruct, } from './internal/struct.js';
import { _throw } from './misc.js';
import { capitalize } from './string.js';
export * as Struct from './internal/struct.js';
/**
 * Gets the size in bytes of a type
 */
export function sizeof(type) {
    if (type === undefined || type === null)
        return 0;
    if (Array.isArray(type)) {
        let size = 0;
        for (let i = 0; i < type.length; i++) {
            size += sizeof(type[i]);
        }
        return size;
    }
    // primitive or character
    if (typeof type == 'string') {
        primitive.checkValid(type);
        return (+primitive.normalize(type).match(primitive.regex)[2] / 8);
    }
    if (isCustom(type))
        return type[Symbol.size];
    checkStruct(type);
    const constructor = isStatic(type) ? type : type.constructor;
    _polyfill_metadata(constructor);
    const { struct } = constructor[Symbol.metadata];
    let size = struct.staticSize;
    if (isStatic(type))
        return size;
    for (const member of struct.members.values()) {
        const value = type[member.name];
        if (isInstance(value) && value.constructor[Symbol.metadata].struct.isDynamic) {
            if (struct.isUnion)
                size = Math.max(size, sizeof(value));
            else
                size += sizeof(value);
            continue;
        }
        if (typeof member.length != 'string')
            continue;
        let subSize = 0;
        for (let i = 0; i < type[member.length]; i++) {
            subSize += sizeof(isStruct(value[i]) ? value[i] : member.type);
        }
        if (struct.isUnion)
            size = Math.max(size, subSize);
        else
            size += subSize;
    }
    return size;
}
/**
 * Returns the offset (in bytes) of a member in a struct.
 */
export function offsetof(type, memberName) {
    checkStruct(type);
    const constructor = isStatic(type) ? type : type.constructor;
    _polyfill_metadata(constructor);
    const { struct } = constructor[Symbol.metadata];
    if (isStatic(type) || !struct.isDynamic) {
        return (struct.members.get(memberName)?.staticOffset
            ?? _throw(new Error('Struct does not have member: ' + memberName)));
    }
    let offset = 0;
    for (const member of struct.members.values()) {
        if (member.name == memberName)
            return offset;
        const value = type[member.name];
        offset += sizeof(isStruct(value) ? value : member.type);
    }
    throw new Error('Struct does not have member: ' + memberName);
}
/**
 * Aligns a number
 */
export function align(value, alignment) {
    return Math.ceil(value / alignment) * alignment;
}
/**
 * Decorates a class as a struct
 */
export function struct(options = {}) {
    return function _decorateStruct(target, context) {
        const members = new Map();
        let staticSize = 0, isDynamic = false;
        for (const { name, type, length } of initMetadata(context)) {
            if (!primitive.isValid(type) && !isStatic(type))
                throw new TypeError('Not a valid type: ' + type);
            if (typeof length == 'string') {
                const countedBy = members.get(length);
                if (!countedBy)
                    throw new Error(`"${length}" is undefined or declared after "${name}"`);
                if (!primitive.isType(countedBy.type))
                    throw new Error(`"${length}" is not a number and cannot be used to count "${name}"`);
            }
            let decl = `${typeof type == 'string' ? type : type.name} ${name}`;
            if (length !== undefined)
                decl += `[${length}]`;
            members.set(name, {
                name,
                staticOffset: options.isUnion ? 0 : staticSize,
                type: primitive.isValid(type) ? primitive.normalize(type) : type,
                length,
                decl,
            });
            const memberSize = typeof length == 'string' || (isStatic(type) && type[Symbol.metadata].struct.isDynamic)
                ? 0
                : sizeof(type) * (length || 1);
            isDynamic ||= isStatic(type) ? type[Symbol.metadata].struct.isDynamic : typeof length == 'string';
            staticSize = options.isUnion ? Math.max(staticSize, memberSize) : staticSize + memberSize;
            staticSize = align(staticSize, options.align || 1);
            _debugLog('define', target.name + '.' + name);
        }
        context.metadata.struct = {
            options,
            members,
            staticSize,
            isDynamic,
            isUnion: options.isUnion ?? false,
        };
        return target;
    };
}
/**
 * Decorates a class member to be serialized
 */
export function member(type, length) {
    return function (value, context) {
        let name = context.name;
        if (typeof name == 'symbol') {
            console.warn('Symbol used for struct member name will be coerced to string: ' + name.toString());
            name = name.toString();
        }
        if (!name)
            throw new ReferenceError('Invalid name for struct member');
        initMetadata(context).push({ name, type, length });
        return value;
    };
}
/** Gets the length of a member */
function _memberLength(instance, member) {
    if (member.length === undefined)
        return -1;
    if (typeof member.length == 'string')
        return instance[member.length];
    return Number.isSafeInteger(member.length) && member.length >= 0
        ? member.length
        : _throw(new Error('Array lengths must be natural numbers'));
}
/**
 * Serializes a struct into a Uint8Array
 */
export function serialize(instance) {
    if (isCustom(instance) && typeof instance[Symbol.serialize] == 'function')
        return instance[Symbol.serialize]();
    checkInstance(instance);
    _polyfill_metadata(instance.constructor);
    const { options, members } = instance.constructor[Symbol.metadata].struct;
    const size = sizeof(instance);
    const buffer = new Uint8Array(size);
    const view = new DataView(buffer.buffer);
    _debugLog('serialize', instance.constructor.name);
    let offset = 0, nextOffset = 0;
    // for unions we should write members in ascending last modified order, but we don't have that info.
    for (const member of members.values()) {
        const length = _memberLength(instance, member);
        _debugLog('\t', member.decl);
        for (let i = 0; i < Math.abs(length); i++) {
            let value = length != -1 ? instance[member.name][i] : instance[member.name];
            if (typeof value == 'string') {
                value = value.charCodeAt(0);
            }
            offset = nextOffset;
            nextOffset += isInstance(value) ? sizeof(value) : sizeof(member.type);
            if (!primitive.isType(member.type)) {
                buffer.set(value ? serialize(value) : new Uint8Array(sizeof(member.type)), offset);
                continue;
            }
            const fn = `set${capitalize(member.type)}`;
            if (fn == 'setInt64') {
                view.setBigInt64(offset, BigInt(value), !options.bigEndian);
                continue;
            }
            if (fn == 'setUint64') {
                view.setBigUint64(offset, BigInt(value), !options.bigEndian);
                continue;
            }
            if (fn == 'setInt128') {
                view.setBigUint64(offset + (!options.bigEndian ? 0 : 8), value & primitive.mask64, !options.bigEndian);
                view.setBigInt64(offset + (!options.bigEndian ? 8 : 0), value >> BigInt(64), !options.bigEndian);
                continue;
            }
            if (fn == 'setUint128') {
                view.setBigUint64(offset + (!options.bigEndian ? 0 : 8), value & primitive.mask64, !options.bigEndian);
                view.setBigUint64(offset + (!options.bigEndian ? 8 : 0), value >> BigInt(64), !options.bigEndian);
                continue;
            }
            if (fn == 'setFloat128') {
                view.setFloat64(offset + (!options.bigEndian ? 0 : 8), Number(value), !options.bigEndian);
                view.setBigUint64(offset + (!options.bigEndian ? 8 : 0), BigInt(0), !options.bigEndian);
                continue;
            }
            view[fn](offset, Number(value), !options.bigEndian);
        }
    }
    return buffer;
}
/**
 * Deserializes a struct from a Uint8Array
 */
export function deserialize(instance, _buffer) {
    const buffer = toUint8Array(_buffer);
    if (isCustom(instance) && typeof instance[Symbol.deserialize] == 'function')
        return instance[Symbol.deserialize](buffer);
    checkInstance(instance);
    _polyfill_metadata(instance.constructor);
    const { options, members } = instance.constructor[Symbol.metadata].struct;
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    _debugLog('deserialize', instance.constructor.name);
    let offset = 0, nextOffset = 0;
    for (const member of members.values()) {
        const length = _memberLength(instance, member);
        _debugLog('\t', member.decl);
        for (let i = 0; i < Math.abs(length); i++) {
            let object = length != -1 ? instance[member.name] : instance;
            const key = length != -1 ? i : member.name;
            const isNullish = object[key] === null || object[key] === undefined;
            const needsAllocation = isNullish && isStatic(member.type) && member.type[Symbol.metadata].struct.isDynamic;
            offset = nextOffset;
            if (!isInstance(object[key]) && !needsAllocation)
                nextOffset += sizeof(member.type);
            if (typeof instance[member.name] == 'string') {
                instance[member.name] =
                    instance[member.name].slice(0, i)
                        + String.fromCharCode(view.getUint8(offset))
                        + instance[member.name].slice(i + 1);
                continue;
            }
            if (!primitive.isType(member.type)) {
                if (needsAllocation && isStatic(member.type))
                    object[key] ??= new member.type();
                else if (isNullish)
                    continue;
                deserialize(object[key], new Uint8Array(buffer.subarray(offset)));
                nextOffset += sizeof(object[key]);
                continue;
            }
            if (length && length != -1)
                object ||= [];
            const fn = `get${capitalize(member.type)}`;
            if (fn == 'getInt64') {
                object[key] = view.getBigInt64(offset, !options.bigEndian);
                continue;
            }
            if (fn == 'getUint64') {
                object[key] = view.getBigUint64(offset, !options.bigEndian);
                continue;
            }
            if (fn == 'getInt128') {
                object[key] =
                    (view.getBigInt64(offset + (!options.bigEndian ? 8 : 0), !options.bigEndian) << BigInt(64))
                        | view.getBigUint64(offset + (!options.bigEndian ? 0 : 8), !options.bigEndian);
                continue;
            }
            if (fn == 'getUint128') {
                object[key] =
                    (view.getBigUint64(offset + (!options.bigEndian ? 8 : 0), !options.bigEndian) << BigInt(64))
                        | view.getBigUint64(offset + (!options.bigEndian ? 0 : 8), !options.bigEndian);
                continue;
            }
            if (fn == 'getFloat128') {
                object[key] = view.getFloat64(offset + (!options.bigEndian ? 0 : 8), !options.bigEndian);
                continue;
            }
            object[key] = view[fn](offset, !options.bigEndian);
        }
    }
}
function _member(type) {
    function _structMemberDecorator(valueOrLength, context) {
        if (typeof valueOrLength == 'number' || typeof valueOrLength == 'string') {
            return member(type, valueOrLength);
        }
        return member(type)(valueOrLength, context);
    }
    return _structMemberDecorator;
}
/**
 * Shortcut types
 *
 * Instead of writing `@member(type)` you can write `@types.type`, or `@types.type(length)` for arrays
 */
export const types = Object.fromEntries(primitive.validNames.map(t => [t, _member(t)]));
