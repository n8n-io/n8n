"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Test6 = void 0;
const Mock_1 = __importStar(require("./Mock"));
const Matchers_1 = require("./Matchers");
const CalledWithFn_1 = __importDefault(require("./CalledWithFn"));
class Test1 {
    constructor(id) {
        this.deepProp = new Test2();
        this.id = id;
        this.anotherPart = id;
    }
    ofAnother(test) {
        return test.getNumber();
    }
    getNumber() {
        return this.id;
    }
    getNumberWithMockArg(mock) {
        return this.id;
    }
    getSomethingWithArgs(arg1, arg2) {
        return this.id;
    }
    getSomethingWithMoreArgs(arg1, arg2, arg3) {
        return this.id;
    }
}
class Test2 {
    constructor() {
        this.deeperProp = new Test3();
    }
    getNumber(num) {
        return num * 2;
    }
    getAnotherString(str) {
        return `${str} another string`;
    }
}
class Test3 {
    getNumber(num) {
        return num ^ 2;
    }
}
class Test4 {
    constructor(test1, int) { }
}
class Test6 {
    constructor(funcValueProp, id) {
        this.id = id;
        this.funcValueProp = funcValueProp;
    }
}
exports.Test6 = Test6;
describe('jest-mock-extended', () => {
    test('Can be assigned back to itself even when there are private parts', () => {
        // No TS errors here
        const mockObj = (0, Mock_1.default)();
        // No error here.
        new Test1(1).ofAnother(mockObj);
        expect(mockObj.getNumber).toHaveBeenCalledTimes(1);
    });
    test('Check that a jest.fn() is created without any invocation to the mock method', () => {
        const mockObj = (0, Mock_1.default)();
        expect(mockObj.getNumber).toHaveBeenCalledTimes(0);
    });
    test('Check that invocations are registered', () => {
        const mockObj = (0, Mock_1.default)();
        mockObj.getNumber();
        mockObj.getNumber();
        expect(mockObj.getNumber).toHaveBeenCalledTimes(2);
    });
    test('Can mock a return value', () => {
        const mockObj = (0, Mock_1.default)();
        mockObj.getNumber.mockReturnValue(12);
        expect(mockObj.getNumber()).toBe(12);
    });
    test('Can specify args', () => {
        const mockObj = (0, Mock_1.default)();
        mockObj.getSomethingWithArgs(1, 2);
        expect(mockObj.getSomethingWithArgs).toBeCalledWith(1, 2);
    });
    test('Can specify calledWith', () => {
        const mockObj = (0, Mock_1.default)();
        mockObj.getSomethingWithArgs.calledWith(1, 2).mockReturnValue(1);
        expect(mockObj.getSomethingWithArgs(1, 2)).toBe(1);
    });
    test('Can specify fallbackMockImplementation', () => {
        const mockObj = (0, Mock_1.default)({}, {
            fallbackMockImplementation: () => {
                throw new Error('not mocked');
            },
        });
        expect(() => mockObj.getSomethingWithArgs(1, 2)).toThrowError('not mocked');
    });
    test('Can specify multiple calledWith', () => {
        const mockObj = (0, Mock_1.default)();
        mockObj.getSomethingWithArgs.calledWith(1, 2).mockReturnValue(3);
        mockObj.getSomethingWithArgs.calledWith(6, 7).mockReturnValue(13);
        expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
        expect(mockObj.getSomethingWithArgs(6, 7)).toBe(13);
    });
    test('Can set props', () => {
        const mockObj = (0, Mock_1.default)();
        mockObj.id = 17;
        expect(mockObj.id).toBe(17);
    });
    test('Can set false and null boolean props', () => {
        const mockObj = (0, Mock_1.default)({
            someValue: false,
        });
        const mockObj2 = (0, Mock_1.default)({
            someValue: null,
        });
        expect(mockObj.someValue).toBe(false);
        expect(mockObj2.someValue).toBe(null);
    });
    test('can set undefined explicitly', () => {
        const mockObj = (0, Mock_1.default)({
            someValue: undefined, // this is intentionally set to undefined
        });
        expect(mockObj.someValue).toBe(undefined);
    });
    test('Equals self', () => {
        const mockObj = (0, Mock_1.default)();
        expect(mockObj).toBe(mockObj);
        expect(mockObj).toEqual(mockObj);
        const spy = jest.fn();
        spy(mockObj);
        expect(spy).toHaveBeenCalledWith(mockObj);
    });
    describe('Mimic Type', () => {
        test('can use MockProxy in place of Mock Type', () => {
            const t1 = (0, Mock_1.default)();
            const i1 = (0, Mock_1.default)();
            // no TS error
            const f = new Test4(t1, i1);
        });
    });
    describe('calledWith', () => {
        test('can use calledWith without mock', () => {
            const mockFunc = (0, CalledWithFn_1.default)();
            mockFunc.calledWith((0, Matchers_1.anyNumber)(), (0, Matchers_1.anyNumber)()).mockReturnValue(3);
            expect(mockFunc(1, 2)).toBe(3);
        });
        test('Can specify matchers', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithArgs.calledWith((0, Matchers_1.anyNumber)(), (0, Matchers_1.anyNumber)()).mockReturnValue(3);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
        });
        test('does not match when one arg does not match Matcher', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithArgs.calledWith((0, Matchers_1.anyNumber)(), (0, Matchers_1.anyNumber)()).mockReturnValue(3);
            // @ts-ignore
            expect(mockObj.getSomethingWithArgs('1', 2)).toBe(undefined);
        });
        test('can use literals', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithArgs.calledWith(1, 2).mockReturnValue(3);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
        });
        test('can mix Matchers with literals', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithArgs.calledWith(1, (0, Matchers_1.anyNumber)()).mockReturnValue(3);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
        });
        test('supports multiple calledWith', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithArgs.calledWith(2, (0, Matchers_1.anyNumber)()).mockReturnValue(4);
            mockObj.getSomethingWithArgs.calledWith(1, (0, Matchers_1.anyNumber)()).mockReturnValue(3);
            mockObj.getSomethingWithArgs.calledWith(6, (0, Matchers_1.anyNumber)()).mockReturnValue(7);
            expect(mockObj.getSomethingWithArgs(2, 2)).toBe(4);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
            expect(mockObj.getSomethingWithArgs(6, 2)).toBe(7);
            expect(mockObj.getSomethingWithArgs(7, 2)).toBe(undefined);
        });
        test('supports overriding with same args', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithArgs.calledWith(1, 2).mockReturnValue(4);
            mockObj.getSomethingWithArgs.calledWith(1, 2).mockReturnValue(3);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
        });
        test('Support jest matcher', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithArgs.calledWith(expect.anything(), expect.anything()).mockReturnValue(3);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
        });
        test('Suport mix Matchers with literals and with jest matcher', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithMoreArgs.calledWith((0, Matchers_1.anyNumber)(), expect.anything(), 3).mockReturnValue(4);
            expect(mockObj.getSomethingWithMoreArgs(1, 2, 3)).toBe(4);
            expect(mockObj.getSomethingWithMoreArgs(1, 2, 4)).toBeUndefined;
        });
        test('Can use calledWith with an other mock', () => {
            const mockObj = (0, Mock_1.default)();
            const mockArg = (0, Mock_1.default)();
            mockObj.getNumberWithMockArg.calledWith(mockArg).mockReturnValue(4);
            expect(mockObj.getNumberWithMockArg(mockArg)).toBe(4);
        });
    });
    describe('Matchers with toHaveBeenCalledWith', () => {
        test('matchers allow all args to be Matcher based', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithArgs(2, 4);
            expect(mockObj.getSomethingWithArgs).toHaveBeenCalledWith((0, Matchers_1.anyNumber)(), (0, Matchers_1.anyNumber)());
        });
        test('matchers allow for a mix of Matcher and literal', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithArgs(2, 4);
            expect(mockObj.getSomethingWithArgs).toHaveBeenCalledWith((0, Matchers_1.anyNumber)(), 4);
        });
        test('matchers allow for not.toHaveBeenCalledWith', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithArgs(2, 4);
            expect(mockObj.getSomethingWithArgs).not.toHaveBeenCalledWith((0, Matchers_1.anyNumber)(), 5);
        });
    });
    describe('Deep mock support', () => {
        test('can deep mock members', () => {
            const mockObj = (0, Mock_1.mockDeep)();
            mockObj.deepProp.getNumber.calledWith(1).mockReturnValue(4);
            expect(mockObj.deepProp.getNumber(1)).toBe(4);
        });
        test('three level deep mock', () => {
            const mockObj = (0, Mock_1.mockDeep)();
            mockObj.deepProp.deeperProp.getNumber.calledWith(1).mockReturnValue(4);
            expect(mockObj.deepProp.deeperProp.getNumber(1)).toBe(4);
        });
        test('maintains API for deep mocks', () => {
            const mockObj = (0, Mock_1.mockDeep)();
            mockObj.deepProp.getNumber(100);
            expect(mockObj.deepProp.getNumber.mock.calls[0][0]).toBe(100);
        });
        test('non deep expectation work as expected', () => {
            const mockObj = (0, Mock_1.mockDeep)();
            new Test1(1).ofAnother(mockObj);
            expect(mockObj.getNumber).toHaveBeenCalledTimes(1);
        });
        test('deep expectation work as expected', () => {
            const mockObj = (0, Mock_1.mockDeep)();
            mockObj.deepProp.getNumber(2);
            expect(mockObj.deepProp.getNumber).toHaveBeenCalledTimes(1);
        });
        test('fallback mock implementation can be overridden', () => {
            const mockObj = (0, Mock_1.mockDeep)({
                fallbackMockImplementation: () => {
                    throw new Error('not mocked');
                },
            });
            mockObj.deepProp.getAnotherString.calledWith('foo'); // no mock implementation
            expect(() => mockObj.getNumber()).toThrowError('not mocked');
            expect(() => mockObj.deepProp.getAnotherString('foo')).toThrowError('not mocked');
        });
        test('fallback mock implementation can be overridden while also providing a mock implementation', () => {
            const mockObj = (0, Mock_1.mockDeep)({
                fallbackMockImplementation: () => {
                    throw new Error('not mocked');
                },
            }, {
                getNumber: () => {
                    return 150;
                },
            });
            mockObj.deepProp.getAnotherString.calledWith('?').mockReturnValue('mocked');
            expect(mockObj.getNumber()).toBe(150);
            expect(mockObj.deepProp.getAnotherString('?')).toBe('mocked');
            expect(() => mockObj.deepProp.getNumber(1)).toThrowError('not mocked');
            expect(() => mockObj.deepProp.getAnotherString('!')).toThrowError('not mocked');
        });
    });
    describe('Deep mock support for class variables which are functions but also have nested properties and functions', () => {
        test('can deep mock members', () => {
            const mockObj = (0, Mock_1.mockDeep)({ funcPropSupport: true });
            const input = new Test1(1);
            mockObj.funcValueProp.nonDeepProp.calledWith(input).mockReturnValue(4);
            expect(mockObj.funcValueProp.nonDeepProp(input)).toBe(4);
        });
        test('three or more level deep mock', () => {
            const mockObj = (0, Mock_1.mockDeep)({ funcPropSupport: true });
            mockObj.funcValueProp.deepProp.deeperProp.getNumber.calledWith(1).mockReturnValue(4);
            expect(mockObj.funcValueProp.deepProp.deeperProp.getNumber(1)).toBe(4);
        });
        test('maintains API for deep mocks', () => {
            const mockObj = (0, Mock_1.mockDeep)({ funcPropSupport: true });
            mockObj.funcValueProp.deepProp.getNumber(100);
            expect(mockObj.funcValueProp.deepProp.getNumber.mock.calls[0][0]).toBe(100);
        });
        test('deep expectation work as expected', () => {
            const mockObj = (0, Mock_1.mockDeep)();
            mockObj.funcValueProp.deepProp.getNumber(2);
            expect(mockObj.funcValueProp.deepProp.getNumber).toHaveBeenCalledTimes(1);
        });
        test('can mock base function which have properties', () => {
            const mockObj = (0, Mock_1.mockDeep)();
            mockObj.funcValueProp.calledWith(1).mockReturnValue(2);
            expect(mockObj.funcValueProp(1)).toBe(2);
        });
        test('base function expectation work as expected', () => {
            const mockObj = (0, Mock_1.mockDeep)();
            mockObj.funcValueProp(1);
            expect(mockObj.funcValueProp).toHaveBeenCalledTimes(1);
        });
    });
    describe('mock implementation support', () => {
        test('can provide mock implementation for props', () => {
            const mockObj = (0, Mock_1.default)({
                id: 61,
            });
            expect(mockObj.id).toBe(61);
        });
        test('can provide mock implementation for functions', () => {
            const mockObj = (0, Mock_1.default)({
                getNumber: () => {
                    return 150;
                },
            });
            expect(mockObj.getNumber()).toBe(150);
        });
        test('Partially mocked implementations can have non-mocked function expectations', () => {
            const mockObj = (0, Mock_1.default)({
                getNumber: () => {
                    return 150;
                },
            });
            mockObj.getSomethingWithArgs.calledWith(1, 2).mockReturnValue(3);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
        });
        test('can provide deep mock implementations', () => {
            const mockObj = (0, Mock_1.mockDeep)({
                deepProp: {
                    getNumber: (num) => {
                        return 76;
                    },
                },
            });
            expect(mockObj.deepProp.getNumber(123)).toBe(76);
        });
        test('Partially mocked implementations of deep mocks can have non-mocked function expectations', () => {
            const mockObj = (0, Mock_1.mockDeep)({
                deepProp: {
                    getNumber: (num) => {
                        return 76;
                    },
                },
            });
            mockObj.deepProp.getAnotherString.calledWith('abc').mockReturnValue('this string');
            expect(mockObj.deepProp.getAnotherString('abc')).toBe('this string');
        });
    });
    describe('Promise', () => {
        test('Can return as Promise.resolve', async () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.id = 17;
            const promiseMockObj = Promise.resolve(mockObj);
            await expect(promiseMockObj).resolves.toBeDefined();
            await expect(promiseMockObj).resolves.toMatchObject({ id: 17 });
        });
        test('Can return as Promise.reject', async () => {
            const mockError = (0, Mock_1.default)();
            mockError.message = '17';
            const promiseMockObj = Promise.reject(mockError);
            try {
                await promiseMockObj;
                fail('Promise must be rejected');
            }
            catch (e) {
                await expect(e).toBeDefined();
                await expect(e).toBe(mockError);
                await expect(e).toHaveProperty('message', '17');
            }
            await expect(promiseMockObj).rejects.toBeDefined();
            await expect(promiseMockObj).rejects.toBe(mockError);
            await expect(promiseMockObj).rejects.toHaveProperty('message', '17');
        });
        test('Can mock a then function', async () => {
            const mockPromiseObj = Promise.resolve(42);
            const mockObj = (0, Mock_1.default)();
            mockObj.id = 17;
            // @ts-ignore
            mockObj.then = mockPromiseObj.then.bind(mockPromiseObj);
            const promiseMockObj = Promise.resolve(mockObj);
            await promiseMockObj;
            await expect(promiseMockObj).resolves.toBeDefined();
            await expect(promiseMockObj).resolves.toEqual(42);
        });
    });
    describe('clearing / resetting', () => {
        test('mockReset supports jest.fn()', () => {
            const fn = jest.fn().mockImplementation(() => true);
            expect(fn()).toBe(true);
            (0, Mock_1.mockReset)(fn);
            expect(fn()).toBe(undefined);
        });
        test('mockClear supports jest.fn()', () => {
            const fn = jest.fn().mockImplementation(() => true);
            fn();
            expect(fn.mock.calls.length).toBe(1);
            (0, Mock_1.mockClear)(fn);
            expect(fn.mock.calls.length).toBe(0);
        });
        test('mockReset object', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithArgs.calledWith(1, (0, Matchers_1.anyNumber)()).mockReturnValue(3);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
            (0, Mock_1.mockReset)(mockObj);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(undefined);
            mockObj.getSomethingWithArgs.calledWith(1, (0, Matchers_1.anyNumber)()).mockReturnValue(3);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
        });
        test('mockClear object', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.getSomethingWithArgs.calledWith(1, (0, Matchers_1.anyNumber)()).mockReturnValue(3);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
            expect(mockObj.getSomethingWithArgs.mock.calls.length).toBe(1);
            (0, Mock_1.mockClear)(mockObj);
            expect(mockObj.getSomethingWithArgs.mock.calls.length).toBe(0);
            // Does not clear mock implementations of calledWith
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
        });
        test('mockReset deep', () => {
            const mockObj = (0, Mock_1.mockDeep)();
            mockObj.deepProp.getNumber.calledWith(1).mockReturnValue(4);
            expect(mockObj.deepProp.getNumber(1)).toBe(4);
            (0, Mock_1.mockReset)(mockObj);
            expect(mockObj.deepProp.getNumber(1)).toBe(undefined);
        });
        test('mockClear deep', () => {
            const mockObj = (0, Mock_1.mockDeep)();
            mockObj.deepProp.getNumber.calledWith(1).mockReturnValue(4);
            expect(mockObj.deepProp.getNumber(1)).toBe(4);
            expect(mockObj.deepProp.getNumber.mock.calls.length).toBe(1);
            (0, Mock_1.mockClear)(mockObj);
            expect(mockObj.deepProp.getNumber.mock.calls.length).toBe(0);
            // Does not clear mock implementations of calledWith
            expect(mockObj.deepProp.getNumber(1)).toBe(4);
        });
        test('mockReset ignores undefined properties', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.someValue = undefined;
            mockObj.getSomethingWithArgs.calledWith(1, (0, Matchers_1.anyNumber)()).mockReturnValue(3);
            (0, Mock_1.mockReset)(mockObj);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(undefined);
        });
        test('mockReset ignores null properties', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.someValue = null;
            mockObj.getSomethingWithArgs.calledWith(1, (0, Matchers_1.anyNumber)()).mockReturnValue(3);
            (0, Mock_1.mockReset)(mockObj);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(undefined);
        });
        test('mockClear ignores undefined properties', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.someValue = undefined;
            mockObj.getSomethingWithArgs.calledWith(1, (0, Matchers_1.anyNumber)()).mockReturnValue(3);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
            expect(mockObj.getSomethingWithArgs.mock.calls.length).toBe(1);
            (0, Mock_1.mockClear)(mockObj);
            expect(mockObj.getSomethingWithArgs.mock.calls.length).toBe(0);
        });
        test('mockClear ignores null properties', () => {
            const mockObj = (0, Mock_1.default)();
            mockObj.someValue = null;
            mockObj.getSomethingWithArgs.calledWith(1, (0, Matchers_1.anyNumber)()).mockReturnValue(3);
            expect(mockObj.getSomethingWithArgs(1, 2)).toBe(3);
            expect(mockObj.getSomethingWithArgs.mock.calls.length).toBe(1);
            (0, Mock_1.mockClear)(mockObj);
            expect(mockObj.getSomethingWithArgs.mock.calls.length).toBe(0);
        });
    });
    describe('function mock', () => {
        test('should mock function', async () => {
            const mockFunc = (0, Mock_1.mockFn)();
            mockFunc.mockResolvedValue(`str`);
            const result = await mockFunc(1, 2);
            expect(result).toBe(`str`);
        });
        test('should mock function and use calledWith', async () => {
            const mockFunc = (0, Mock_1.mockFn)();
            mockFunc.calledWith(1, 2).mockResolvedValue(`str`);
            const result = await mockFunc(1, 2);
            expect(result).toBe(`str`);
        });
    });
    describe('ignoreProps', () => {
        test('can configure ignoreProps', async () => {
            Mock_1.JestMockExtended.configure({ ignoreProps: ['ignoreMe'] });
            const mockObj = (0, Mock_1.default)();
            expect(mockObj.ignoreMe).toBeUndefined();
            expect(mockObj.dontIgnoreMe).toBeDefined();
        });
    });
    describe('JestMockExtended config', () => {
        test('can mock then', async () => {
            Mock_1.JestMockExtended.configure({ ignoreProps: [] });
            const mockObj = (0, Mock_1.default)();
            mockObj.then();
            expect(mockObj.then).toHaveBeenCalled();
        });
        test('can reset config', async () => {
            Mock_1.JestMockExtended.configure({ ignoreProps: [] });
            Mock_1.JestMockExtended.resetConfig();
            const mockObj = (0, Mock_1.default)();
            expect(mockObj.then).toBeUndefined();
        });
    });
    describe('mock Date', () => {
        test('should call built-in date functions', () => {
            const mockObj = (0, Mock_1.default)({ date: new Date('2000-01-15') });
            expect(mockObj.date.getFullYear()).toBe(2000);
            expect(mockObj.date.getMonth()).toBe(0);
            expect(mockObj.date.getDate()).toBe(15);
        });
    });
});
