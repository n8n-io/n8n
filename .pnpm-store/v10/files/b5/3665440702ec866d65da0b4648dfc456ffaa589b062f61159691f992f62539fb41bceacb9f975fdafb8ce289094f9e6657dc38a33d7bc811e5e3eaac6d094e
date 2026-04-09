"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stub = exports.mockFn = exports.mockDeep = exports.mockReset = exports.mockClear = exports.JestMockExtended = void 0;
const CalledWithFn_1 = __importDefault(require("./CalledWithFn"));
const DEFAULT_CONFIG = {
    ignoreProps: ['then'],
};
let GLOBAL_CONFIG = DEFAULT_CONFIG;
exports.JestMockExtended = {
    DEFAULT_CONFIG,
    configure: (config) => {
        // Shallow merge so they can override anything they want.
        GLOBAL_CONFIG = Object.assign(Object.assign({}, DEFAULT_CONFIG), config);
    },
    resetConfig: () => {
        GLOBAL_CONFIG = DEFAULT_CONFIG;
    },
};
const mockClear = (mock) => {
    for (let key of Object.keys(mock)) {
        if (mock[key] === null || mock[key] === undefined) {
            continue;
        }
        if (mock[key]._isMockObject) {
            (0, exports.mockClear)(mock[key]);
        }
        if (mock[key]._isMockFunction) {
            mock[key].mockClear();
        }
    }
    // This is a catch for if they pass in a jest.fn()
    if (!mock._isMockObject) {
        return mock.mockClear();
    }
};
exports.mockClear = mockClear;
const mockReset = (mock) => {
    for (let key of Object.keys(mock)) {
        if (mock[key] === null || mock[key] === undefined) {
            continue;
        }
        if (mock[key]._isMockObject) {
            (0, exports.mockReset)(mock[key]);
        }
        if (mock[key]._isMockFunction) {
            mock[key].mockReset();
        }
    }
    // This is a catch for if they pass in a jest.fn()
    // Worst case, we will create a jest.fn() (since this is a proxy)
    // below in the get and call mockReset on it
    if (!mock._isMockObject) {
        return mock.mockReset();
    }
};
exports.mockReset = mockReset;
function mockDeep(arg1, arg2) {
    const [opts, mockImplementation] = typeof arg1 === 'object' && (typeof arg1.fallbackMockImplementation === 'function' || arg1.funcPropSupport === true)
        ? [arg1, arg2]
        : [{}, arg1];
    return mock(mockImplementation, { deep: true, fallbackMockImplementation: opts.fallbackMockImplementation });
}
exports.mockDeep = mockDeep;
const overrideMockImp = (obj, opts) => {
    const proxy = new Proxy(obj, handler(opts));
    for (let name of Object.keys(obj)) {
        if (typeof obj[name] === 'object' && obj[name] !== null) {
            proxy[name] = overrideMockImp(obj[name], opts);
        }
        else {
            proxy[name] = obj[name];
        }
    }
    return proxy;
};
const handler = (opts) => ({
    ownKeys(target) {
        return Reflect.ownKeys(target);
    },
    set: (obj, property, value) => {
        // @ts-ignore All of these ignores are due to https://github.com/microsoft/TypeScript/issues/1863
        obj[property] = value;
        return true;
    },
    get: (obj, property) => {
        var _a;
        let fn = (0, CalledWithFn_1.default)({ fallbackMockImplementation: opts === null || opts === void 0 ? void 0 : opts.fallbackMockImplementation });
        // @ts-ignore
        if (!(property in obj)) {
            if ((_a = GLOBAL_CONFIG.ignoreProps) === null || _a === void 0 ? void 0 : _a.includes(property)) {
                return undefined;
            }
            // Jest's internal equality checking does some wierd stuff to check for iterable equality
            if (property === Symbol.iterator) {
                // @ts-ignore
                return obj[property];
            }
            // So this calls check here is totally not ideal - jest internally does a
            // check to see if this is a spy - which we want to say no to, but blindly returning
            // an proxy for calls results in the spy check returning true. This is another reason
            // why deep is opt in.
            if ((opts === null || opts === void 0 ? void 0 : opts.deep) && property !== 'calls') {
                // @ts-ignore
                obj[property] = new Proxy(fn, handler(opts));
                // @ts-ignore
                obj[property]._isMockObject = true;
            }
            else {
                // @ts-ignore
                obj[property] = (0, CalledWithFn_1.default)({ fallbackMockImplementation: opts === null || opts === void 0 ? void 0 : opts.fallbackMockImplementation });
            }
        }
        // @ts-ignore
        if (obj instanceof Date && typeof obj[property] === 'function') {
            // @ts-ignore
            return obj[property].bind(obj);
        }
        // @ts-ignore
        return obj[property];
    },
});
const mock = (mockImplementation = {}, opts) => {
    // @ts-ignore private
    mockImplementation._isMockObject = true;
    return overrideMockImp(mockImplementation, opts);
};
const mockFn = () => {
    // @ts-ignore
    return (0, CalledWithFn_1.default)();
};
exports.mockFn = mockFn;
const stub = () => {
    return new Proxy({}, {
        get: (obj, property) => {
            if (property in obj) {
                // @ts-ignore
                return obj[property];
            }
            return jest.fn();
        },
    });
};
exports.stub = stub;
exports.default = mock;
