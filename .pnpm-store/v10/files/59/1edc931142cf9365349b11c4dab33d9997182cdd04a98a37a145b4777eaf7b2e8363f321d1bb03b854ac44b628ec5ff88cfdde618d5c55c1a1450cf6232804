/*
This file is copied from https://github.com/nodejs/node/blob/v14.19.3/lib/internal/per_context/primordials.js
under the following license:

Copyright Node.js contributors. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/

'use strict';

/* eslint-disable node-core/prefer-primordials */

// This file subclasses and stores the JS builtins that come from the VM
// so that Node.js's builtin modules do not need to later look these up from
// the global proxy, which can be mutated by users.

// Use of primordials have sometimes a dramatic impact on performance, please
// benchmark all changes made in performance-sensitive areas of the codebase.
// See: https://github.com/nodejs/node/pull/38248

const primordials = {};

const {
  defineProperty: ReflectDefineProperty,
  getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
  ownKeys: ReflectOwnKeys,
} = Reflect;

// `uncurryThis` is equivalent to `func => Function.prototype.call.bind(func)`.
// It is using `bind.bind(call)` to avoid using `Function.prototype.bind`
// and `Function.prototype.call` after it may have been mutated by users.
const { apply, bind, call } = Function.prototype;
const uncurryThis = bind.bind(call);
primordials.uncurryThis = uncurryThis;

// `applyBind` is equivalent to `func => Function.prototype.apply.bind(func)`.
// It is using `bind.bind(apply)` to avoid using `Function.prototype.bind`
// and `Function.prototype.apply` after it may have been mutated by users.
const applyBind = bind.bind(apply);
primordials.applyBind = applyBind;

// Methods that accept a variable number of arguments, and thus it's useful to
// also create `${prefix}${key}Apply`, which uses `Function.prototype.apply`,
// instead of `Function.prototype.call`, and thus doesn't require iterator
// destructuring.
const varargsMethods = [
  // 'ArrayPrototypeConcat' is omitted, because it performs the spread
  // on its own for arrays and array-likes with a truthy
  // @@isConcatSpreadable symbol property.
  'ArrayOf',
  'ArrayPrototypePush',
  'ArrayPrototypeUnshift',
  // 'FunctionPrototypeCall' is omitted, since there's 'ReflectApply'
  // and 'FunctionPrototypeApply'.
  'MathHypot',
  'MathMax',
  'MathMin',
  'StringPrototypeConcat',
  'TypedArrayOf',
];

function getNewKey(key) {
  return typeof key === 'symbol' ?
    `Symbol${key.description[7].toUpperCase()}${key.description.slice(8)}` :
    `${key[0].toUpperCase()}${key.slice(1)}`;
}

function copyAccessor(dest, prefix, key, { enumerable, get, set }) {
  ReflectDefineProperty(dest, `${prefix}Get${key}`, {
    value: uncurryThis(get),
    enumerable
  });
  if (set !== undefined) {
    ReflectDefineProperty(dest, `${prefix}Set${key}`, {
      value: uncurryThis(set),
      enumerable
    });
  }
}

function copyPropsRenamed(src, dest, prefix) {
  for (const key of ReflectOwnKeys(src)) {
    const newKey = getNewKey(key);
    const desc = ReflectGetOwnPropertyDescriptor(src, key);
    if ('get' in desc) {
      copyAccessor(dest, prefix, newKey, desc);
    } else {
      const name = `${prefix}${newKey}`;
      ReflectDefineProperty(dest, name, desc);
      if (varargsMethods.includes(name)) {
        ReflectDefineProperty(dest, `${name}Apply`, {
          // `src` is bound as the `this` so that the static `this` points
          // to the object it was defined on,
          // e.g.: `ArrayOfApply` gets a `this` of `Array`:
          value: applyBind(desc.value, src),
        });
      }
    }
  }
}

function copyPropsRenamedBound(src, dest, prefix) {
  for (const key of ReflectOwnKeys(src)) {
    const newKey = getNewKey(key);
    const desc = ReflectGetOwnPropertyDescriptor(src, key);
    if ('get' in desc) {
      copyAccessor(dest, prefix, newKey, desc);
    } else {
      const { value } = desc;
      if (typeof value === 'function') {
        desc.value = value.bind(src);
      }

      const name = `${prefix}${newKey}`;
      ReflectDefineProperty(dest, name, desc);
      if (varargsMethods.includes(name)) {
        ReflectDefineProperty(dest, `${name}Apply`, {
          value: applyBind(value, src),
        });
      }
    }
  }
}

function copyPrototype(src, dest, prefix) {
  for (const key of ReflectOwnKeys(src)) {
    const newKey = getNewKey(key);
    const desc = ReflectGetOwnPropertyDescriptor(src, key);
    if ('get' in desc) {
      copyAccessor(dest, prefix, newKey, desc);
    } else {
      const { value } = desc;
      if (typeof value === 'function') {
        desc.value = uncurryThis(value);
      }

      const name = `${prefix}${newKey}`;
      ReflectDefineProperty(dest, name, desc);
      if (varargsMethods.includes(name)) {
        ReflectDefineProperty(dest, `${name}Apply`, {
          value: applyBind(value),
        });
      }
    }
  }
}

// Create copies of configurable value properties of the global object
[
  'Proxy',
  'globalThis',
].forEach((name) => {
  // eslint-disable-next-line no-restricted-globals
  primordials[name] = globalThis[name];
});

// Create copies of URI handling functions
[
  decodeURI,
  decodeURIComponent,
  encodeURI,
  encodeURIComponent,
].forEach((fn) => {
  primordials[fn.name] = fn;
});

// Create copies of the namespace objects
[
  'JSON',
  'Math',
  'Proxy',
  'Reflect',
].forEach((name) => {
  // eslint-disable-next-line no-restricted-globals
  copyPropsRenamed(global[name], primordials, name);
});

// Create copies of intrinsic objects
[
  'Array',
  'ArrayBuffer',
  'BigInt',
  'BigInt64Array',
  'BigUint64Array',
  'Boolean',
  'DataView',
  'Date',
  'Error',
  'EvalError',
  'Float32Array',
  'Float64Array',
  'Function',
  'Int16Array',
  'Int32Array',
  'Int8Array',
  'Map',
  'Number',
  'Object',
  'RangeError',
  'ReferenceError',
  'RegExp',
  'Set',
  'String',
  'Symbol',
  'SyntaxError',
  'TypeError',
  'URIError',
  'Uint16Array',
  'Uint32Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'WeakMap',
  'WeakSet',
].forEach((name) => {
  // eslint-disable-next-line no-restricted-globals
  const original = global[name];
  primordials[name] = original;
  copyPropsRenamed(original, primordials, name);
  copyPrototype(original.prototype, primordials, `${name}Prototype`);
});

// Create copies of intrinsic objects that require a valid `this` to call
// static methods.
// Refs: https://www.ecma-international.org/ecma-262/#sec-promise.all
[
  'Promise',
].forEach((name) => {
  // eslint-disable-next-line no-restricted-globals
  const original = global[name];
  primordials[name] = original;
  copyPropsRenamedBound(original, primordials, name);
  copyPrototype(original.prototype, primordials, `${name}Prototype`);
});

// Create copies of abstract intrinsic objects that are not directly exposed
// on the global object.
// Refs: https://tc39.es/ecma262/#sec-%typedarray%-intrinsic-object
[
  { name: 'TypedArray', original: Reflect.getPrototypeOf(Uint8Array) },
  { name: 'ArrayIterator', original: {
    prototype: Reflect.getPrototypeOf(Array.prototype[Symbol.iterator]()),
  } },
  { name: 'StringIterator', original: {
    prototype: Reflect.getPrototypeOf(String.prototype[Symbol.iterator]()),
  } },
].forEach(({ name, original }) => {
  primordials[name] = original;
  // The static %TypedArray% methods require a valid `this`, but can't be bound,
  // as they need a subclass constructor as the receiver:
  copyPrototype(original, primordials, name);
  copyPrototype(original.prototype, primordials, `${name}Prototype`);
});

/* eslint-enable node-core/prefer-primordials */

const {
  ArrayPrototypeForEach,
  FunctionPrototypeCall,
  Map,
  ObjectFreeze,
  ObjectSetPrototypeOf,
  Set,
  SymbolIterator,
  WeakMap,
  WeakSet,
} = primordials;

// Because these functions are used by `makeSafe`, which is exposed
// on the `primordials` object, it's important to use const references
// to the primordials that they use:
const createSafeIterator = (factory, next) => {
  class SafeIterator {
    constructor(iterable) {
      this._iterator = factory(iterable);
    }
    next() {
      return next(this._iterator);
    }
    [SymbolIterator]() {
      return this;
    }
  }
  ObjectSetPrototypeOf(SafeIterator.prototype, null);
  ObjectFreeze(SafeIterator.prototype);
  ObjectFreeze(SafeIterator);
  return SafeIterator;
};

primordials.SafeArrayIterator = createSafeIterator(
  primordials.ArrayPrototypeSymbolIterator,
  primordials.ArrayIteratorPrototypeNext
);
primordials.SafeStringIterator = createSafeIterator(
  primordials.StringPrototypeSymbolIterator,
  primordials.StringIteratorPrototypeNext
);

const copyProps = (src, dest) => {
  ArrayPrototypeForEach(ReflectOwnKeys(src), (key) => {
    if (!ReflectGetOwnPropertyDescriptor(dest, key)) {
      ReflectDefineProperty(
        dest,
        key,
        ReflectGetOwnPropertyDescriptor(src, key));
    }
  });
};

const makeSafe = (unsafe, safe) => {
  if (SymbolIterator in unsafe.prototype) {
    const dummy = new unsafe();
    let next; // We can reuse the same `next` method.

    ArrayPrototypeForEach(ReflectOwnKeys(unsafe.prototype), (key) => {
      if (!ReflectGetOwnPropertyDescriptor(safe.prototype, key)) {
        const desc = ReflectGetOwnPropertyDescriptor(unsafe.prototype, key);
        if (
          typeof desc.value === 'function' &&
          desc.value.length === 0 &&
          SymbolIterator in (FunctionPrototypeCall(desc.value, dummy) ?? {})
        ) {
          const createIterator = uncurryThis(desc.value);
          next = next ?? uncurryThis(createIterator(dummy).next);
          const SafeIterator = createSafeIterator(createIterator, next);
          desc.value = function() {
            return new SafeIterator(this);
          };
        }
        ReflectDefineProperty(safe.prototype, key, desc);
      }
    });
  } else {
    copyProps(unsafe.prototype, safe.prototype);
  }
  copyProps(unsafe, safe);

  ObjectSetPrototypeOf(safe.prototype, null);
  ObjectFreeze(safe.prototype);
  ObjectFreeze(safe);
  return safe;
};
primordials.makeSafe = makeSafe;

// Subclass the constructors because we need to use their prototype
// methods later.
// Defining the `constructor` is necessary here to avoid the default
// constructor which uses the user-mutable `%ArrayIteratorPrototype%.next`.
primordials.SafeMap = makeSafe(
  Map,
  class SafeMap extends Map {
    constructor(i) { super(i); } // eslint-disable-line no-useless-constructor
  }
);
primordials.SafeWeakMap = makeSafe(
  WeakMap,
  class SafeWeakMap extends WeakMap {
    constructor(i) { super(i); } // eslint-disable-line no-useless-constructor
  }
);
primordials.SafeSet = makeSafe(
  Set,
  class SafeSet extends Set {
    constructor(i) { super(i); } // eslint-disable-line no-useless-constructor
  }
);
primordials.SafeWeakSet = makeSafe(
  WeakSet,
  class SafeWeakSet extends WeakSet {
    constructor(i) { super(i); } // eslint-disable-line no-useless-constructor
  }
);

ObjectSetPrototypeOf(primordials, null);
ObjectFreeze(primordials);

module.exports = primordials;
