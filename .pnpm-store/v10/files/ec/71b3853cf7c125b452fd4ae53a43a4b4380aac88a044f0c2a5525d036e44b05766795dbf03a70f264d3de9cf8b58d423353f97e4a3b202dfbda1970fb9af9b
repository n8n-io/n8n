'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.spyOn =
  exports.replaceProperty =
  exports.mocked =
  exports.fn =
  exports.ModuleMocker =
    void 0;
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable local/ban-types-eventually, local/prefer-rest-params-eventually */

// TODO remove re-export in Jest 30

// TODO remove re-export in Jest 30

// TODO in Jest 30 remove `SpyInstance` in favour of `Spied`
// eslint-disable-next-line @typescript-eslint/no-empty-interface
/**
 * All what the internal typings need is to be sure that we have any-function.
 * `FunctionLike` type ensures that and helps to constrain the type as well.
 * The default of `UnknownFunction` makes sure that `any`s do not leak to the
 * user side. For instance, calling `fn()` without implementation will return
 * a mock of `(...args: Array<unknown>) => unknown` type. If implementation
 * is provided, its typings are inferred correctly.
 */
const MOCK_CONSTRUCTOR_NAME = 'mockConstructor';
const FUNCTION_NAME_RESERVED_PATTERN = /[\s!-/:-@[-`{-~]/;
const FUNCTION_NAME_RESERVED_REPLACE = new RegExp(
  FUNCTION_NAME_RESERVED_PATTERN.source,
  'g'
);
const RESERVED_KEYWORDS = new Set([
  'arguments',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield'
]);
function matchArity(fn, length) {
  let mockConstructor;
  switch (length) {
    case 1:
      mockConstructor = function (_a) {
        return fn.apply(this, arguments);
      };
      break;
    case 2:
      mockConstructor = function (_a, _b) {
        return fn.apply(this, arguments);
      };
      break;
    case 3:
      mockConstructor = function (_a, _b, _c) {
        return fn.apply(this, arguments);
      };
      break;
    case 4:
      mockConstructor = function (_a, _b, _c, _d) {
        return fn.apply(this, arguments);
      };
      break;
    case 5:
      mockConstructor = function (_a, _b, _c, _d, _e) {
        return fn.apply(this, arguments);
      };
      break;
    case 6:
      mockConstructor = function (_a, _b, _c, _d, _e, _f) {
        return fn.apply(this, arguments);
      };
      break;
    case 7:
      mockConstructor = function (_a, _b, _c, _d, _e, _f, _g) {
        return fn.apply(this, arguments);
      };
      break;
    case 8:
      mockConstructor = function (_a, _b, _c, _d, _e, _f, _g, _h) {
        return fn.apply(this, arguments);
      };
      break;
    case 9:
      mockConstructor = function (_a, _b, _c, _d, _e, _f, _g, _h, _i) {
        return fn.apply(this, arguments);
      };
      break;
    default:
      mockConstructor = function () {
        return fn.apply(this, arguments);
      };
      break;
  }
  return mockConstructor;
}
function getObjectType(value) {
  return Object.prototype.toString.apply(value).slice(8, -1);
}
function getType(ref) {
  const typeName = getObjectType(ref);
  if (
    typeName === 'Function' ||
    typeName === 'AsyncFunction' ||
    typeName === 'GeneratorFunction' ||
    typeName === 'AsyncGeneratorFunction'
  ) {
    return 'function';
  } else if (Array.isArray(ref)) {
    return 'array';
  } else if (typeName === 'Object' || typeName === 'Module') {
    return 'object';
  } else if (
    typeName === 'Number' ||
    typeName === 'String' ||
    typeName === 'Boolean' ||
    typeName === 'Symbol'
  ) {
    return 'constant';
  } else if (
    typeName === 'Map' ||
    typeName === 'WeakMap' ||
    typeName === 'Set'
  ) {
    return 'collection';
  } else if (typeName === 'RegExp') {
    return 'regexp';
  } else if (ref === undefined) {
    return 'undefined';
  } else if (ref === null) {
    return 'null';
  } else {
    return null;
  }
}
function isReadonlyProp(object, prop) {
  if (
    prop === 'arguments' ||
    prop === 'caller' ||
    prop === 'callee' ||
    prop === 'name' ||
    prop === 'length'
  ) {
    const typeName = getObjectType(object);
    return (
      typeName === 'Function' ||
      typeName === 'AsyncFunction' ||
      typeName === 'GeneratorFunction' ||
      typeName === 'AsyncGeneratorFunction'
    );
  }
  if (
    prop === 'source' ||
    prop === 'global' ||
    prop === 'ignoreCase' ||
    prop === 'multiline'
  ) {
    return getObjectType(object) === 'RegExp';
  }
  return false;
}
class ModuleMocker {
  _environmentGlobal;
  _mockState;
  _mockConfigRegistry;
  _spyState;
  _invocationCallCounter;

  /**
   * @see README.md
   * @param global Global object of the test environment, used to create
   * mocks
   */
  constructor(global) {
    this._environmentGlobal = global;
    this._mockState = new WeakMap();
    this._mockConfigRegistry = new WeakMap();
    this._spyState = new Set();
    this._invocationCallCounter = 1;
  }
  _getSlots(object) {
    if (!object) {
      return [];
    }
    const slots = new Set();
    const EnvObjectProto = this._environmentGlobal.Object.prototype;
    const EnvFunctionProto = this._environmentGlobal.Function.prototype;
    const EnvRegExpProto = this._environmentGlobal.RegExp.prototype;

    // Also check the builtins in the current context as they leak through
    // core node modules.
    const ObjectProto = Object.prototype;
    const FunctionProto = Function.prototype;
    const RegExpProto = RegExp.prototype;

    // Properties of Object.prototype, Function.prototype and RegExp.prototype
    // are never reported as slots
    while (
      object != null &&
      object !== EnvObjectProto &&
      object !== EnvFunctionProto &&
      object !== EnvRegExpProto &&
      object !== ObjectProto &&
      object !== FunctionProto &&
      object !== RegExpProto
    ) {
      const ownNames = Object.getOwnPropertyNames(object);
      for (let i = 0; i < ownNames.length; i++) {
        const prop = ownNames[i];
        if (!isReadonlyProp(object, prop)) {
          const propDesc = Object.getOwnPropertyDescriptor(object, prop);
          if ((propDesc !== undefined && !propDesc.get) || object.__esModule) {
            slots.add(prop);
          }
        }
      }
      object = Object.getPrototypeOf(object);
    }
    return Array.from(slots);
  }
  _ensureMockConfig(f) {
    let config = this._mockConfigRegistry.get(f);
    if (!config) {
      config = this._defaultMockConfig();
      this._mockConfigRegistry.set(f, config);
    }
    return config;
  }
  _ensureMockState(f) {
    let state = this._mockState.get(f);
    if (!state) {
      state = this._defaultMockState();
      this._mockState.set(f, state);
    }
    if (state.calls.length > 0) {
      state.lastCall = state.calls[state.calls.length - 1];
    }
    return state;
  }
  _defaultMockConfig() {
    return {
      mockImpl: undefined,
      mockName: 'jest.fn()',
      specificMockImpls: []
    };
  }
  _defaultMockState() {
    return {
      calls: [],
      contexts: [],
      instances: [],
      invocationCallOrder: [],
      results: []
    };
  }
  _makeComponent(metadata, spyState) {
    if (metadata.type === 'object') {
      return new this._environmentGlobal.Object();
    } else if (metadata.type === 'array') {
      return new this._environmentGlobal.Array();
    } else if (metadata.type === 'regexp') {
      return new this._environmentGlobal.RegExp('');
    } else if (
      metadata.type === 'constant' ||
      metadata.type === 'collection' ||
      metadata.type === 'null' ||
      metadata.type === 'undefined'
    ) {
      return metadata.value;
    } else if (metadata.type === 'function') {
      const prototype =
        (metadata.members &&
          metadata.members.prototype &&
          metadata.members.prototype.members) ||
        {};
      const prototypeSlots = this._getSlots(prototype);
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const mocker = this;
      const mockConstructor = matchArity(function (...args) {
        const mockState = mocker._ensureMockState(f);
        const mockConfig = mocker._ensureMockConfig(f);
        mockState.instances.push(this);
        mockState.contexts.push(this);
        mockState.calls.push(args);
        // Create and record an "incomplete" mock result immediately upon
        // calling rather than waiting for the mock to return. This avoids
        // issues caused by recursion where results can be recorded in the
        // wrong order.
        const mockResult = {
          type: 'incomplete',
          value: undefined
        };
        mockState.results.push(mockResult);
        mockState.invocationCallOrder.push(mocker._invocationCallCounter++);

        // Will be set to the return value of the mock if an error is not thrown
        let finalReturnValue;
        // Will be set to the error that is thrown by the mock (if it throws)
        let thrownError;
        // Will be set to true if the mock throws an error. The presence of a
        // value in `thrownError` is not a 100% reliable indicator because a
        // function could throw a value of undefined.
        let callDidThrowError = false;
        try {
          // The bulk of the implementation is wrapped in an immediately
          // executed arrow function so the return value of the mock function
          // can be easily captured and recorded, despite the many separate
          // return points within the logic.
          finalReturnValue = (() => {
            if (this instanceof f) {
              // This is probably being called as a constructor
              prototypeSlots.forEach(slot => {
                // Copy prototype methods to the instance to make
                // it easier to interact with mock instance call and
                // return values
                if (prototype[slot].type === 'function') {
                  // @ts-expect-error no index signature
                  const protoImpl = this[slot];
                  // @ts-expect-error no index signature
                  this[slot] = mocker.generateFromMetadata(prototype[slot]);
                  // @ts-expect-error no index signature
                  this[slot]._protoImpl = protoImpl;
                }
              });

              // Run the mock constructor implementation
              const mockImpl = mockConfig.specificMockImpls.length
                ? mockConfig.specificMockImpls.shift()
                : mockConfig.mockImpl;
              return mockImpl && mockImpl.apply(this, arguments);
            }

            // If mockImplementationOnce()/mockImplementation() is last set,
            // implementation use the mock
            let specificMockImpl = mockConfig.specificMockImpls.shift();
            if (specificMockImpl === undefined) {
              specificMockImpl = mockConfig.mockImpl;
            }
            if (specificMockImpl) {
              return specificMockImpl.apply(this, arguments);
            }
            // Otherwise use prototype implementation
            if (f._protoImpl) {
              return f._protoImpl.apply(this, arguments);
            }
            return undefined;
          })();
        } catch (error) {
          // Store the thrown error so we can record it, then re-throw it.
          thrownError = error;
          callDidThrowError = true;
          throw error;
        } finally {
          // Record the result of the function.
          // NOTE: Intentionally NOT pushing/indexing into the array of mock
          //       results here to avoid corrupting results data if mockClear()
          //       is called during the execution of the mock.
          // @ts-expect-error reassigning 'incomplete'
          mockResult.type = callDidThrowError ? 'throw' : 'return';
          mockResult.value = callDidThrowError ? thrownError : finalReturnValue;
        }
        return finalReturnValue;
      }, metadata.length || 0);
      const f = this._createMockFunction(metadata, mockConstructor);
      f._isMockFunction = true;
      f.getMockImplementation = () => this._ensureMockConfig(f).mockImpl;
      if (spyState != null) {
        this._spyState.add(spyState);
      }
      this._mockState.set(f, this._defaultMockState());
      this._mockConfigRegistry.set(f, this._defaultMockConfig());
      Object.defineProperty(f, 'mock', {
        configurable: false,
        enumerable: true,
        get: () => this._ensureMockState(f),
        set: val => this._mockState.set(f, val)
      });
      f.mockClear = () => {
        this._mockState.delete(f);
        return f;
      };
      f.mockReset = () => {
        f.mockClear();
        this._mockConfigRegistry.delete(f);
        if (spyState != null) {
          spyState.reset?.();
        }
        return f;
      };
      f.mockRestore = () => {
        f.mockClear();
        this._mockConfigRegistry.delete(f);
        if (spyState != null) {
          spyState.restore();
          this._spyState.delete(spyState);
        }
      };
      f.mockReturnValueOnce = value =>
        // next function call will return this value or default return value
        f.mockImplementationOnce(() => value);
      f.mockResolvedValueOnce = value =>
        f.mockImplementationOnce(() =>
          this._environmentGlobal.Promise.resolve(value)
        );
      f.mockRejectedValueOnce = value =>
        f.mockImplementationOnce(() =>
          this._environmentGlobal.Promise.reject(value)
        );
      f.mockReturnValue = value =>
        // next function call will return specified return value or this one
        f.mockImplementation(() => value);
      f.mockResolvedValue = value =>
        f.mockImplementation(() =>
          this._environmentGlobal.Promise.resolve(value)
        );
      f.mockRejectedValue = value =>
        f.mockImplementation(() =>
          this._environmentGlobal.Promise.reject(value)
        );
      f.mockImplementationOnce = fn => {
        // next function call will use this mock implementation return value
        // or default mock implementation return value
        const mockConfig = this._ensureMockConfig(f);
        mockConfig.specificMockImpls.push(fn);
        return f;
      };
      f.withImplementation = withImplementation.bind(this);
      function withImplementation(fn, callback) {
        // Remember previous mock implementation, then set new one
        const mockConfig = this._ensureMockConfig(f);
        const previousImplementation = mockConfig.mockImpl;
        const previousSpecificImplementations = mockConfig.specificMockImpls;
        mockConfig.mockImpl = fn;
        mockConfig.specificMockImpls = [];
        const returnedValue = callback();
        if ((0, _jestUtil().isPromise)(returnedValue)) {
          return returnedValue.then(() => {
            mockConfig.mockImpl = previousImplementation;
            mockConfig.specificMockImpls = previousSpecificImplementations;
          });
        } else {
          mockConfig.mockImpl = previousImplementation;
          mockConfig.specificMockImpls = previousSpecificImplementations;
        }
      }
      f.mockImplementation = fn => {
        // next function call will use mock implementation return value
        const mockConfig = this._ensureMockConfig(f);
        mockConfig.mockImpl = fn;
        return f;
      };
      f.mockReturnThis = () =>
        f.mockImplementation(function () {
          return this;
        });
      f.mockName = name => {
        if (name) {
          const mockConfig = this._ensureMockConfig(f);
          mockConfig.mockName = name;
        }
        return f;
      };
      f.getMockName = () => {
        const mockConfig = this._ensureMockConfig(f);
        return mockConfig.mockName || 'jest.fn()';
      };
      if (metadata.mockImpl) {
        f.mockImplementation(metadata.mockImpl);
      }
      return f;
    } else {
      const unknownType = metadata.type || 'undefined type';
      throw new Error(`Unrecognized type ${unknownType}`);
    }
  }
  _createMockFunction(metadata, mockConstructor) {
    let name = metadata.name;
    if (!name) {
      return mockConstructor;
    }

    // Preserve `name` property of mocked function.
    const boundFunctionPrefix = 'bound ';
    let bindCall = '';
    // if-do-while for perf reasons. The common case is for the if to fail.
    if (name.startsWith(boundFunctionPrefix)) {
      do {
        name = name.substring(boundFunctionPrefix.length);
        // Call bind() just to alter the function name.
        bindCall = '.bind(null)';
      } while (name && name.startsWith(boundFunctionPrefix));
    }

    // Special case functions named `mockConstructor` to guard for infinite loops
    if (name === MOCK_CONSTRUCTOR_NAME) {
      return mockConstructor;
    }
    if (
      // It's a syntax error to define functions with a reserved keyword as name
      RESERVED_KEYWORDS.has(name) ||
      // It's also a syntax error to define functions with a name that starts with a number
      /^\d/.test(name)
    ) {
      name = `$${name}`;
    }

    // It's also a syntax error to define a function with a reserved character
    // as part of it's name.
    if (FUNCTION_NAME_RESERVED_PATTERN.test(name)) {
      name = name.replace(FUNCTION_NAME_RESERVED_REPLACE, '$');
    }
    const body =
      `return function ${name}() {` +
      `  return ${MOCK_CONSTRUCTOR_NAME}.apply(this,arguments);` +
      `}${bindCall}`;
    const createConstructor = new this._environmentGlobal.Function(
      MOCK_CONSTRUCTOR_NAME,
      body
    );
    return createConstructor(mockConstructor);
  }
  _generateMock(metadata, callbacks, refs) {
    // metadata not compatible but it's the same type, maybe problem with
    // overloading of _makeComponent and not _generateMock?
    // @ts-expect-error - unsure why TSC complains here?
    const mock = this._makeComponent(metadata);
    if (metadata.refID != null) {
      refs[metadata.refID] = mock;
    }
    this._getSlots(metadata.members).forEach(slot => {
      const slotMetadata = (metadata.members && metadata.members[slot]) || {};
      if (slotMetadata.ref != null) {
        callbacks.push(
          (function (ref) {
            return () => (mock[slot] = refs[ref]);
          })(slotMetadata.ref)
        );
      } else {
        mock[slot] = this._generateMock(slotMetadata, callbacks, refs);
      }
    });
    if (
      metadata.type !== 'undefined' &&
      metadata.type !== 'null' &&
      mock.prototype &&
      typeof mock.prototype === 'object'
    ) {
      mock.prototype.constructor = mock;
    }
    return mock;
  }

  /**
   * Check whether the given property of an object has been already replaced.
   */
  _findReplacedProperty(object, propertyKey) {
    for (const {restore} of this._spyState) {
      if (
        'object' in restore &&
        'property' in restore &&
        restore.object === object &&
        restore.property === propertyKey
      ) {
        return restore;
      }
    }
    return;
  }

  /**
   * @see README.md
   * @param metadata Metadata for the mock in the schema returned by the
   * getMetadata method of this module.
   */
  generateFromMetadata(metadata) {
    const callbacks = [];
    const refs = {};
    const mock = this._generateMock(metadata, callbacks, refs);
    callbacks.forEach(setter => setter());
    return mock;
  }

  /**
   * @see README.md
   * @param component The component for which to retrieve metadata.
   */
  getMetadata(component, _refs) {
    const refs = _refs || new Map();
    const ref = refs.get(component);
    if (ref != null) {
      return {
        ref
      };
    }
    const type = getType(component);
    if (!type) {
      return null;
    }
    const metadata = {
      type
    };
    if (
      type === 'constant' ||
      type === 'collection' ||
      type === 'undefined' ||
      type === 'null'
    ) {
      metadata.value = component;
      return metadata;
    } else if (type === 'function') {
      // @ts-expect-error component is a function so it has a name, but not
      // necessarily a string: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name#function_names_in_classes
      const componentName = component.name;
      if (typeof componentName === 'string') {
        metadata.name = componentName;
      }
      if (this.isMockFunction(component)) {
        metadata.mockImpl = component.getMockImplementation();
      }
    }
    metadata.refID = refs.size;
    refs.set(component, metadata.refID);
    let members = null;
    // Leave arrays alone
    if (type !== 'array') {
      // @ts-expect-error component is object
      this._getSlots(component).forEach(slot => {
        if (
          type === 'function' &&
          this.isMockFunction(component) &&
          slot.match(/^mock/)
        ) {
          return;
        }
        // @ts-expect-error no index signature
        const slotMetadata = this.getMetadata(component[slot], refs);
        if (slotMetadata) {
          if (!members) {
            members = {};
          }
          members[slot] = slotMetadata;
        }
      });
    }
    if (members) {
      metadata.members = members;
    }
    return metadata;
  }
  isMockFunction(fn) {
    return fn != null && fn._isMockFunction === true;
  }
  fn(implementation) {
    const length = implementation ? implementation.length : 0;
    const fn = this._makeComponent({
      length,
      type: 'function'
    });
    if (implementation) {
      fn.mockImplementation(implementation);
    }
    return fn;
  }
  _attachMockImplementation(mock, original) {
    mock.mockImplementation(function () {
      return original.apply(this, arguments);
    });
  }
  spyOn(object, methodKey, accessType) {
    if (
      object == null ||
      (typeof object !== 'object' && typeof object !== 'function')
    ) {
      throw new Error(
        `Cannot use spyOn on a primitive value; ${this._typeOf(object)} given`
      );
    }
    if (methodKey == null) {
      throw new Error('No property name supplied');
    }
    if (accessType) {
      return this._spyOnProperty(object, methodKey, accessType);
    }
    const original = object[methodKey];
    if (!original) {
      throw new Error(
        `Property \`${String(
          methodKey
        )}\` does not exist in the provided object`
      );
    }
    if (!this.isMockFunction(original)) {
      if (typeof original !== 'function') {
        throw new Error(
          `Cannot spy on the \`${String(
            methodKey
          )}\` property because it is not a function; ${this._typeOf(
            original
          )} given instead.${
            typeof original !== 'object'
              ? ` If you are trying to mock a property, use \`jest.replaceProperty(object, '${String(
                  methodKey
                )}', value)\` instead.`
              : ''
          }`
        );
      }
      const isMethodOwner = Object.prototype.hasOwnProperty.call(
        object,
        methodKey
      );
      let descriptor = Object.getOwnPropertyDescriptor(object, methodKey);
      let proto = Object.getPrototypeOf(object);
      while (!descriptor && proto !== null) {
        descriptor = Object.getOwnPropertyDescriptor(proto, methodKey);
        proto = Object.getPrototypeOf(proto);
      }
      let mock;
      if (descriptor && descriptor.get) {
        const originalGet = descriptor.get;
        mock = this._makeComponent(
          {
            type: 'function'
          },
          {
            reset: () => {
              this._attachMockImplementation(mock, original);
            },
            restore: () => {
              descriptor.get = originalGet;
              Object.defineProperty(object, methodKey, descriptor);
            }
          }
        );
        descriptor.get = () => mock;
        Object.defineProperty(object, methodKey, descriptor);
      } else {
        mock = this._makeComponent(
          {
            type: 'function'
          },
          {
            reset: () => {
              this._attachMockImplementation(mock, original);
            },
            restore: () => {
              if (isMethodOwner) {
                object[methodKey] = original;
              } else {
                delete object[methodKey];
              }
            }
          }
        );
        // @ts-expect-error: overriding original method with a mock
        object[methodKey] = mock;
      }
      this._attachMockImplementation(mock, original);
    }
    return object[methodKey];
  }
  _spyOnProperty(object, propertyKey, accessType) {
    let descriptor = Object.getOwnPropertyDescriptor(object, propertyKey);
    let proto = Object.getPrototypeOf(object);
    while (!descriptor && proto !== null) {
      descriptor = Object.getOwnPropertyDescriptor(proto, propertyKey);
      proto = Object.getPrototypeOf(proto);
    }
    if (!descriptor) {
      throw new Error(
        `Property \`${String(
          propertyKey
        )}\` does not exist in the provided object`
      );
    }
    if (!descriptor.configurable) {
      throw new Error(
        `Property \`${String(propertyKey)}\` is not declared configurable`
      );
    }
    if (!descriptor[accessType]) {
      throw new Error(
        `Property \`${String(
          propertyKey
        )}\` does not have access type ${accessType}`
      );
    }
    const original = descriptor[accessType];
    if (!this.isMockFunction(original)) {
      if (typeof original !== 'function') {
        throw new Error(
          `Cannot spy on the ${String(
            propertyKey
          )} property because it is not a function; ${this._typeOf(
            original
          )} given instead.${
            typeof original !== 'object'
              ? ` If you are trying to mock a property, use \`jest.replaceProperty(object, '${String(
                  propertyKey
                )}', value)\` instead.`
              : ''
          }`
        );
      }
      descriptor[accessType] = this._makeComponent(
        {
          type: 'function'
        },
        {
          reset: () => {
            this._attachMockImplementation(descriptor[accessType], original);
          },
          restore: () => {
            // @ts-expect-error: overriding original method with a mock
            descriptor[accessType] = original;
            Object.defineProperty(object, propertyKey, descriptor);
          }
        }
      );
      this._attachMockImplementation(descriptor[accessType], original);
    }
    Object.defineProperty(object, propertyKey, descriptor);
    return descriptor[accessType];
  }
  replaceProperty(object, propertyKey, value) {
    if (
      object == null ||
      (typeof object !== 'object' && typeof object !== 'function')
    ) {
      throw new Error(
        `Cannot use replaceProperty on a primitive value; ${this._typeOf(
          object
        )} given`
      );
    }
    if (propertyKey == null) {
      throw new Error('No property name supplied');
    }
    let descriptor = Object.getOwnPropertyDescriptor(object, propertyKey);
    let proto = Object.getPrototypeOf(object);
    while (!descriptor && proto !== null) {
      descriptor = Object.getOwnPropertyDescriptor(proto, propertyKey);
      proto = Object.getPrototypeOf(proto);
    }
    if (!descriptor) {
      throw new Error(
        `Property \`${String(
          propertyKey
        )}\` does not exist in the provided object`
      );
    }
    if (!descriptor.configurable) {
      throw new Error(
        `Property \`${String(propertyKey)}\` is not declared configurable`
      );
    }
    if (descriptor.get !== undefined) {
      throw new Error(
        `Cannot replace the \`${String(
          propertyKey
        )}\` property because it has a getter. Use \`jest.spyOn(object, '${String(
          propertyKey
        )}', 'get').mockReturnValue(value)\` instead.`
      );
    }
    if (descriptor.set !== undefined) {
      throw new Error(
        `Cannot replace the \`${String(
          propertyKey
        )}\` property because it has a setter. Use \`jest.spyOn(object, '${String(
          propertyKey
        )}', 'set').mockReturnValue(value)\` instead.`
      );
    }
    if (typeof descriptor.value === 'function') {
      throw new Error(
        `Cannot replace the \`${String(
          propertyKey
        )}\` property because it is a function. Use \`jest.spyOn(object, '${String(
          propertyKey
        )}')\` instead.`
      );
    }
    const existingRestore = this._findReplacedProperty(object, propertyKey);
    if (existingRestore) {
      return existingRestore.replaced.replaceValue(value);
    }
    const isPropertyOwner = Object.prototype.hasOwnProperty.call(
      object,
      propertyKey
    );
    const originalValue = descriptor.value;
    const restore = () => {
      if (isPropertyOwner) {
        object[propertyKey] = originalValue;
      } else {
        delete object[propertyKey];
      }
    };
    const replaced = {
      replaceValue: value => {
        object[propertyKey] = value;
        return replaced;
      },
      restore: () => {
        restore();
        this._spyState.delete({
          restore
        });
      }
    };
    restore.object = object;
    restore.property = propertyKey;
    restore.replaced = replaced;
    this._spyState.add({
      restore
    });
    return replaced.replaceValue(value);
  }
  clearAllMocks() {
    this._mockState = new WeakMap();
  }
  resetAllMocks() {
    this.clearAllMocks();
    this._mockConfigRegistry = new WeakMap();
    this._spyState.forEach(spyState => spyState.reset?.());
  }
  restoreAllMocks() {
    this.clearAllMocks();
    this._mockConfigRegistry = new WeakMap();
    this._spyState.forEach(spyState => spyState.restore());
    this._spyState = new Set();
  }
  _typeOf(value) {
    return value == null ? `${value}` : typeof value;
  }
  mocked(source, _options) {
    return source;
  }
}
exports.ModuleMocker = ModuleMocker;
const JestMock = new ModuleMocker(globalThis);
const fn = JestMock.fn.bind(JestMock);
exports.fn = fn;
const spyOn = JestMock.spyOn.bind(JestMock);
exports.spyOn = spyOn;
const mocked = JestMock.mocked.bind(JestMock);
exports.mocked = mocked;
const replaceProperty = JestMock.replaceProperty.bind(JestMock);
exports.replaceProperty = replaceProperty;
