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
exports.ValuePointer = exports.ValuePointerRootDeleteError = exports.ValuePointerRootSetError = void 0;
class ValuePointerRootSetError extends Error {
    constructor(value, path, update) {
        super('ValuePointer: Cannot set root value');
        this.value = value;
        this.path = path;
        this.update = update;
    }
}
exports.ValuePointerRootSetError = ValuePointerRootSetError;
class ValuePointerRootDeleteError extends Error {
    constructor(value, path) {
        super('ValuePointer: Cannot delete root value');
        this.value = value;
        this.path = path;
    }
}
exports.ValuePointerRootDeleteError = ValuePointerRootDeleteError;
/** Provides functionality to update values through RFC6901 string pointers */
var ValuePointer;
(function (ValuePointer) {
    function Escape(component) {
        return component.indexOf('~') === -1 ? component : component.replace(/~1/g, '/').replace(/~0/g, '~');
    }
    /** Formats the given pointer into navigable key components */
    function* Format(pointer) {
        if (pointer === '')
            return;
        let [start, end] = [0, 0];
        for (let i = 0; i < pointer.length; i++) {
            const char = pointer.charAt(i);
            if (char === '/') {
                if (i === 0) {
                    start = i + 1;
                }
                else {
                    end = i;
                    yield Escape(pointer.slice(start, end));
                    start = i + 1;
                }
            }
            else {
                end = i;
            }
        }
        yield Escape(pointer.slice(start));
    }
    ValuePointer.Format = Format;
    /** Sets the value at the given pointer. If the value at the pointer does not exist it is created */
    function Set(value, pointer, update) {
        if (pointer === '')
            throw new ValuePointerRootSetError(value, pointer, update);
        let [owner, next, key] = [null, value, ''];
        for (const component of Format(pointer)) {
            if (next[component] === undefined)
                next[component] = {};
            owner = next;
            next = next[component];
            key = component;
        }
        owner[key] = update;
    }
    ValuePointer.Set = Set;
    /** Deletes a value at the given pointer */
    function Delete(value, pointer) {
        if (pointer === '')
            throw new ValuePointerRootDeleteError(value, pointer);
        let [owner, next, key] = [null, value, ''];
        for (const component of Format(pointer)) {
            if (next[component] === undefined || next[component] === null)
                return;
            owner = next;
            next = next[component];
            key = component;
        }
        if (globalThis.Array.isArray(owner)) {
            const index = parseInt(key);
            owner.splice(index, 1);
        }
        else {
            delete owner[key];
        }
    }
    ValuePointer.Delete = Delete;
    /** Returns true if a value exists at the given pointer */
    function Has(value, pointer) {
        if (pointer === '')
            return true;
        let [owner, next, key] = [null, value, ''];
        for (const component of Format(pointer)) {
            if (next[component] === undefined)
                return false;
            owner = next;
            next = next[component];
            key = component;
        }
        return globalThis.Object.getOwnPropertyNames(owner).includes(key);
    }
    ValuePointer.Has = Has;
    /** Gets the value at the given pointer */
    function Get(value, pointer) {
        if (pointer === '')
            return value;
        let current = value;
        for (const component of Format(pointer)) {
            if (current[component] === undefined)
                return undefined;
            current = current[component];
        }
        return current;
    }
    ValuePointer.Get = Get;
})(ValuePointer = exports.ValuePointer || (exports.ValuePointer = {}));
