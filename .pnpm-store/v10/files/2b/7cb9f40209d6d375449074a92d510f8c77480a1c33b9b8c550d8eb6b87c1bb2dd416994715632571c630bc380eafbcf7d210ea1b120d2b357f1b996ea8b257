"use strict";
/*--------------------------------------------------------------------------

@sinclair/typebox/value

The MIT License (MIT)

Copyright (c) 2017-2023 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueDelta = exports.ValueDeltaUnableToDiffUnknownValue = exports.ValueDeltaObjectWithSymbolKeyError = exports.Edit = exports.Delete = exports.Update = exports.Insert = void 0;
const typebox_1 = require("../typebox");
const is_1 = require("./is");
const clone_1 = require("./clone");
const pointer_1 = require("./pointer");
exports.Insert = typebox_1.Type.Object({
    type: typebox_1.Type.Literal('insert'),
    path: typebox_1.Type.String(),
    value: typebox_1.Type.Unknown(),
});
exports.Update = typebox_1.Type.Object({
    type: typebox_1.Type.Literal('update'),
    path: typebox_1.Type.String(),
    value: typebox_1.Type.Unknown(),
});
exports.Delete = typebox_1.Type.Object({
    type: typebox_1.Type.Literal('delete'),
    path: typebox_1.Type.String(),
});
exports.Edit = typebox_1.Type.Union([exports.Insert, exports.Update, exports.Delete]);
// ---------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------
class ValueDeltaObjectWithSymbolKeyError extends Error {
    constructor(key) {
        super('ValueDelta: Cannot diff objects with symbol keys');
        this.key = key;
    }
}
exports.ValueDeltaObjectWithSymbolKeyError = ValueDeltaObjectWithSymbolKeyError;
class ValueDeltaUnableToDiffUnknownValue extends Error {
    constructor(value) {
        super('ValueDelta: Unable to create diff edits for unknown value');
        this.value = value;
    }
}
exports.ValueDeltaUnableToDiffUnknownValue = ValueDeltaUnableToDiffUnknownValue;
// ---------------------------------------------------------------------
// ValueDelta
// ---------------------------------------------------------------------
var ValueDelta;
(function (ValueDelta) {
    // ---------------------------------------------------------------------
    // Edits
    // ---------------------------------------------------------------------
    function Update(path, value) {
        return { type: 'update', path, value };
    }
    function Insert(path, value) {
        return { type: 'insert', path, value };
    }
    function Delete(path) {
        return { type: 'delete', path };
    }
    // ---------------------------------------------------------------------
    // Diff
    // ---------------------------------------------------------------------
    function* Object(path, current, next) {
        if (!is_1.Is.Object(next))
            return yield Update(path, next);
        const currentKeys = [...globalThis.Object.keys(current), ...globalThis.Object.getOwnPropertySymbols(current)];
        const nextKeys = [...globalThis.Object.keys(next), ...globalThis.Object.getOwnPropertySymbols(next)];
        for (const key of currentKeys) {
            if (typeof key === 'symbol')
                throw new ValueDeltaObjectWithSymbolKeyError(key);
            if (next[key] === undefined && nextKeys.includes(key))
                yield Update(`${path}/${String(key)}`, undefined);
        }
        for (const key of nextKeys) {
            if (current[key] === undefined || next[key] === undefined)
                continue;
            if (typeof key === 'symbol')
                throw new ValueDeltaObjectWithSymbolKeyError(key);
            yield* Visit(`${path}/${String(key)}`, current[key], next[key]);
        }
        for (const key of nextKeys) {
            if (typeof key === 'symbol')
                throw new ValueDeltaObjectWithSymbolKeyError(key);
            if (current[key] === undefined)
                yield Insert(`${path}/${String(key)}`, next[key]);
        }
        for (const key of currentKeys.reverse()) {
            if (typeof key === 'symbol')
                throw new ValueDeltaObjectWithSymbolKeyError(key);
            if (next[key] === undefined && !nextKeys.includes(key))
                yield Delete(`${path}/${String(key)}`);
        }
    }
    function* Array(path, current, next) {
        if (!is_1.Is.Array(next))
            return yield Update(path, next);
        for (let i = 0; i < Math.min(current.length, next.length); i++) {
            yield* Visit(`${path}/${i}`, current[i], next[i]);
        }
        for (let i = 0; i < next.length; i++) {
            if (i < current.length)
                continue;
            yield Insert(`${path}/${i}`, next[i]);
        }
        for (let i = current.length - 1; i >= 0; i--) {
            if (i < next.length)
                continue;
            yield Delete(`${path}/${i}`);
        }
    }
    function* TypedArray(path, current, next) {
        if (!is_1.Is.TypedArray(next) || current.length !== next.length || globalThis.Object.getPrototypeOf(current).constructor.name !== globalThis.Object.getPrototypeOf(next).constructor.name)
            return yield Update(path, next);
        for (let i = 0; i < Math.min(current.length, next.length); i++) {
            yield* Visit(`${path}/${i}`, current[i], next[i]);
        }
    }
    function* Value(path, current, next) {
        if (current === next)
            return;
        yield Update(path, next);
    }
    function* Visit(path, current, next) {
        if (is_1.Is.Object(current)) {
            return yield* Object(path, current, next);
        }
        else if (is_1.Is.Array(current)) {
            return yield* Array(path, current, next);
        }
        else if (is_1.Is.TypedArray(current)) {
            return yield* TypedArray(path, current, next);
        }
        else if (is_1.Is.Value(current)) {
            return yield* Value(path, current, next);
        }
        else {
            throw new ValueDeltaUnableToDiffUnknownValue(current);
        }
    }
    function Diff(current, next) {
        return [...Visit('', current, next)];
    }
    ValueDelta.Diff = Diff;
    // ---------------------------------------------------------------------
    // Patch
    // ---------------------------------------------------------------------
    function IsRootUpdate(edits) {
        return edits.length > 0 && edits[0].path === '' && edits[0].type === 'update';
    }
    function IsIdentity(edits) {
        return edits.length === 0;
    }
    function Patch(current, edits) {
        if (IsRootUpdate(edits)) {
            return clone_1.ValueClone.Clone(edits[0].value);
        }
        if (IsIdentity(edits)) {
            return clone_1.ValueClone.Clone(current);
        }
        const clone = clone_1.ValueClone.Clone(current);
        for (const edit of edits) {
            switch (edit.type) {
                case 'insert': {
                    pointer_1.ValuePointer.Set(clone, edit.path, edit.value);
                    break;
                }
                case 'update': {
                    pointer_1.ValuePointer.Set(clone, edit.path, edit.value);
                    break;
                }
                case 'delete': {
                    pointer_1.ValuePointer.Delete(clone, edit.path);
                    break;
                }
            }
        }
        return clone;
    }
    ValueDelta.Patch = Patch;
})(ValueDelta = exports.ValueDelta || (exports.ValueDelta = {}));
