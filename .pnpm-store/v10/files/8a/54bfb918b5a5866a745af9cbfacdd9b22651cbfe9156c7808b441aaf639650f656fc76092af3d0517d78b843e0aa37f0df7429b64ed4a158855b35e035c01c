"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Matchers_1 = require("./Matchers");
class Cls {
}
describe('Matchers', () => {
    describe('any', () => {
        test('returns true for false', () => {
            expect((0, Matchers_1.any)().asymmetricMatch(false)).toBe(true);
        });
        test('returns true for undefined', () => {
            expect((0, Matchers_1.any)().asymmetricMatch(undefined)).toBe(true);
        });
        test('returns true for null', () => {
            expect((0, Matchers_1.any)().asymmetricMatch(null)).toBe(true);
        });
        test('Supports undefined in chain', () => {
            const f = jest.fn();
            f(undefined);
            expect(f).toHaveBeenCalledWith((0, Matchers_1.any)());
        });
    });
    describe('anyString', () => {
        test('returns true for empty string', () => {
            expect((0, Matchers_1.anyString)().asymmetricMatch('')).toBe(true);
        });
        test('returns true for non-empty string', () => {
            expect((0, Matchers_1.anyString)().asymmetricMatch('123')).toBe(true);
        });
        test('returns false for number', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyString)().asymmetricMatch(123)).toBe(false);
        });
        test('returns false for null', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyString)().asymmetricMatch(null)).toBe(false);
        });
        test('returns false for undefined', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyString)().asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('anyNumber', () => {
        test('returns true for 0', () => {
            expect((0, Matchers_1.anyNumber)().asymmetricMatch(0)).toBe(true);
        });
        test('returns true for normal number', () => {
            expect((0, Matchers_1.anyNumber)().asymmetricMatch(123)).toBe(true);
        });
        test('returns false for string', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyNumber)().asymmetricMatch('123')).toBe(false);
        });
        test('returns false for null', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyNumber)().asymmetricMatch(null)).toBe(false);
        });
        test('returns false for undefined', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyNumber)().asymmetricMatch(undefined)).toBe(false);
        });
        test('returns false for NaN', () => {
            expect((0, Matchers_1.anyNumber)().asymmetricMatch(NaN)).toBe(false);
        });
    });
    describe('anyBoolean', () => {
        test('returns true for true', () => {
            expect((0, Matchers_1.anyBoolean)().asymmetricMatch(true)).toBe(true);
        });
        test('returns true for false', () => {
            expect((0, Matchers_1.anyBoolean)().asymmetricMatch(false)).toBe(true);
        });
        test('returns false for string', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyBoolean)().asymmetricMatch('true')).toBe(false);
        });
        test('returns false for null', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyBoolean)().asymmetricMatch(null)).toBe(false);
        });
        test('returns false for undefined', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyBoolean)().asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('anyFunction', () => {
        test('returns true for function', () => {
            expect((0, Matchers_1.anyFunction)().asymmetricMatch(() => { })).toBe(true);
        });
        test('returns false for string', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyFunction)().asymmetricMatch('true')).toBe(false);
        });
        test('returns false for null', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyFunction)().asymmetricMatch(null)).toBe(false);
        });
        test('returns false for undefined', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyFunction)().asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('anySymbol', () => {
        test('returns true for symbol', () => {
            expect((0, Matchers_1.anySymbol)().asymmetricMatch(Symbol('123'))).toBe(true);
        });
        test('returns false for string', () => {
            // @ts-ignore
            expect((0, Matchers_1.anySymbol)().asymmetricMatch('123')).toBe(false);
        });
        test('returns false for null', () => {
            // @ts-ignore
            expect((0, Matchers_1.anySymbol)().asymmetricMatch(null)).toBe(false);
        });
        test('returns false for undefined', () => {
            // @ts-ignore
            expect((0, Matchers_1.anySymbol)().asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('anyObject', () => {
        test('returns true for object', () => {
            expect((0, Matchers_1.anyObject)().asymmetricMatch({})).toBe(true);
        });
        test('returns true for new object', () => {
            expect((0, Matchers_1.anyObject)().asymmetricMatch(new Object())).toBe(true);
        });
        test('returns true for new instance', () => {
            expect((0, Matchers_1.anyObject)().asymmetricMatch(new Cls())).toBe(true);
        });
        test('returns true for new builtin', () => {
            expect((0, Matchers_1.anyObject)().asymmetricMatch(new Map())).toBe(true);
        });
        test('returns false for string', () => {
            expect((0, Matchers_1.anyObject)().asymmetricMatch('123')).toBe(false);
        });
        test('returns false for number', () => {
            expect((0, Matchers_1.anyObject)().asymmetricMatch(123)).toBe(false);
        });
        test('returns false for null', () => {
            expect((0, Matchers_1.anyObject)().asymmetricMatch(null)).toBe(false);
        });
        test('returns false for undefined', () => {
            expect((0, Matchers_1.anyObject)().asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('anyArray', () => {
        test('returns true for empty array', () => {
            expect((0, Matchers_1.anyArray)().asymmetricMatch([])).toBe(true);
        });
        test('returns true for non empty', () => {
            expect((0, Matchers_1.anyArray)().asymmetricMatch([1, 2, 3])).toBe(true);
        });
        test('returns false for object', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyArray)().asymmetricMatch({})).toBe(false);
        });
        test('returns false for null', () => {
            // @ts-ignored
            expect((0, Matchers_1.anyArray)().asymmetricMatch(null)).toBe(false);
        });
        test('returns false for undefined', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyArray)().asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('anyMap', () => {
        test('returns true for empty Map', () => {
            expect((0, Matchers_1.anyMap)().asymmetricMatch(new Map())).toBe(true);
        });
        test('returns true for non empty', () => {
            const map = new Map();
            map.set(1, 2);
            expect((0, Matchers_1.anyMap)().asymmetricMatch(map)).toBe(true);
        });
        test('returns false for object', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyMap)().asymmetricMatch({})).toBe(false);
        });
        test('returns false for null', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyMap)().asymmetricMatch(null)).toBe(false);
        });
        test('returns false for undefined', () => {
            // @ts-ignore
            expect((0, Matchers_1.anyMap)().asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('anySet', () => {
        test('returns true for empty Set', () => {
            expect((0, Matchers_1.anySet)().asymmetricMatch(new Set())).toBe(true);
        });
        test('returns true for non empty', () => {
            const set = new Set();
            set.add(2);
            expect((0, Matchers_1.anySet)().asymmetricMatch(set)).toBe(true);
        });
        test('returns false for object', () => {
            // @ts-ignore
            expect((0, Matchers_1.anySet)().asymmetricMatch({})).toBe(false);
        });
        test('returns false for null', () => {
            // @ts-ignore
            expect((0, Matchers_1.anySet)().asymmetricMatch(null)).toBe(false);
        });
        test('returns false for undefined', () => {
            // @ts-ignore
            expect((0, Matchers_1.anySet)().asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('isA', () => {
        test('returns true when class is the same builtin', () => {
            expect((0, Matchers_1.isA)(Map).asymmetricMatch(new Map())).toBe(true);
        });
        test('returns true for non empty', () => {
            expect((0, Matchers_1.isA)(Cls).asymmetricMatch(new Cls())).toBe(true);
        });
        test('returns false for object', () => {
            expect((0, Matchers_1.isA)(Cls).asymmetricMatch({})).toBe(false);
        });
        test('returns false for null', () => {
            expect((0, Matchers_1.isA)(Cls).asymmetricMatch(null)).toBe(false);
        });
        test('returns false for undefined', () => {
            expect((0, Matchers_1.isA)(Cls).asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('arrayIncludes', () => {
        test('returns true when array contains value', () => {
            expect((0, Matchers_1.arrayIncludes)('val').asymmetricMatch(['val', 'val2'])).toBe(true);
        });
        test('returns false when array does not contain value', () => {
            expect((0, Matchers_1.arrayIncludes)('val3').asymmetricMatch(['val', 'val2'])).toBe(false);
        });
        test('returns false when not a map', () => {
            // @ts-ignore
            expect((0, Matchers_1.arrayIncludes)('val3').asymmetricMatch({})).toBe(false);
        });
        test('returns false when for null', () => {
            // @ts-ignore
            expect((0, Matchers_1.arrayIncludes)('val3').asymmetricMatch(null)).toBe(false);
        });
        test('returns false when for undefined', () => {
            // @ts-ignore
            expect((0, Matchers_1.arrayIncludes)('val3').asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('mapHas', () => {
        test('returns true when map contains key', () => {
            expect((0, Matchers_1.mapHas)('key').asymmetricMatch(new Map([['key', 'val']]))).toBe(true);
        });
        test('returns false when map does not contain key', () => {
            expect((0, Matchers_1.mapHas)('key3').asymmetricMatch(new Map([['key', 'val']]))).toBe(false);
        });
        test('returns false when not a map', () => {
            // @ts-ignore
            expect((0, Matchers_1.mapHas)('val3').asymmetricMatch({})).toBe(false);
        });
        test('returns false when for null', () => {
            // @ts-ignore
            expect((0, Matchers_1.mapHas)('val3').asymmetricMatch(null)).toBe(false);
        });
        test('returns false when for undefined', () => {
            // @ts-ignore
            expect((0, Matchers_1.mapHas)('val3').asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('setHas', () => {
        test('returns true when set contains value', () => {
            expect((0, Matchers_1.setHas)('val').asymmetricMatch(new Set(['val']))).toBe(true);
        });
        test('returns false when set does not contain value', () => {
            expect((0, Matchers_1.setHas)('val3').asymmetricMatch(new Set(['val', 'val2']))).toBe(false);
        });
        test('returns false when not a set', () => {
            // @ts-ignore
            expect((0, Matchers_1.setHas)('val3').asymmetricMatch({})).toBe(false);
        });
        test('returns false when for null', () => {
            // @ts-ignore
            expect((0, Matchers_1.setHas)('val3').asymmetricMatch(null)).toBe(false);
        });
        test('returns false when for undefined', () => {
            // @ts-ignore
            expect((0, Matchers_1.setHas)('val3').asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('objectContainsKey', () => {
        test('returns true when object contains key', () => {
            expect((0, Matchers_1.objectContainsKey)('key').asymmetricMatch({ key: 'val' })).toBe(true);
        });
        test('returns false when object does not contain key', () => {
            expect((0, Matchers_1.objectContainsKey)('key3').asymmetricMatch({ key: 'val' })).toBe(false);
        });
        test('returns false when not a object', () => {
            expect((0, Matchers_1.objectContainsKey)('val3').asymmetricMatch(213)).toBe(false);
        });
        test('returns false when for null', () => {
            expect((0, Matchers_1.objectContainsKey)('val3').asymmetricMatch(null)).toBe(false);
        });
        test('returns false when for undefined', () => {
            expect((0, Matchers_1.objectContainsKey)('val3').asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('objectContainsValue', () => {
        test('returns true when object contains value', () => {
            expect((0, Matchers_1.objectContainsValue)('val').asymmetricMatch({ key: 'val' })).toBe(true);
        });
        test('returns false when object does not contain value', () => {
            expect((0, Matchers_1.objectContainsValue)('val3').asymmetricMatch({ key: 'val' })).toBe(false);
        });
        test('returns false when not a object', () => {
            expect((0, Matchers_1.objectContainsValue)('val3').asymmetricMatch(213)).toBe(false);
        });
        test('returns false when for null', () => {
            expect((0, Matchers_1.objectContainsValue)('val3').asymmetricMatch(null)).toBe(false);
        });
        test('returns false when for undefined', () => {
            expect((0, Matchers_1.objectContainsValue)('val3').asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('notNull', () => {
        test('returns true when object', () => {
            expect((0, Matchers_1.notNull)().asymmetricMatch({ key: 'val' })).toBe(true);
        });
        test('returns true when undefined', () => {
            expect((0, Matchers_1.notNull)().asymmetricMatch(undefined)).toBe(true);
        });
        test('returns true when empty string', () => {
            expect((0, Matchers_1.notNull)().asymmetricMatch('')).toBe(true);
        });
        test('returns false when for null', () => {
            expect((0, Matchers_1.notNull)().asymmetricMatch(null)).toBe(false);
        });
    });
    describe('notUndefined', () => {
        test('returns true when object', () => {
            expect((0, Matchers_1.notUndefined)().asymmetricMatch({ key: 'val' })).toBe(true);
        });
        test('returns true when null', () => {
            expect((0, Matchers_1.notUndefined)().asymmetricMatch(null)).toBe(true);
        });
        test('returns true when empty string', () => {
            expect((0, Matchers_1.notUndefined)().asymmetricMatch('')).toBe(true);
        });
        test('returns false when for undefined', () => {
            expect((0, Matchers_1.notUndefined)().asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('notEmpty', () => {
        test('returns true when object', () => {
            expect((0, Matchers_1.notEmpty)().asymmetricMatch({ key: 'val' })).toBe(true);
        });
        test('returns true when null', () => {
            expect((0, Matchers_1.notEmpty)().asymmetricMatch(null)).toBe(false);
        });
        test('returns true when empty string', () => {
            expect((0, Matchers_1.notEmpty)().asymmetricMatch('')).toBe(false);
        });
        test('returns false when for undefined', () => {
            expect((0, Matchers_1.notEmpty)().asymmetricMatch(undefined)).toBe(false);
        });
    });
    describe('captor', () => {
        let fn;
        let doSomething;
        beforeEach(() => {
            fn = jest.fn();
            doSomething = (fn, count) => {
                fn(String(count), count, { 1: 2 });
            };
        });
        test('can capture arg with other matchers', () => {
            doSomething(fn, 1);
            const argCaptor = (0, Matchers_1.captor)();
            expect(fn).toHaveBeenCalledWith(argCaptor, (0, Matchers_1.any)(), (0, Matchers_1.any)());
            expect(argCaptor.value).toBe('1');
        });
        test('stores all values', () => {
            doSomething(fn, 1);
            doSomething(fn, 2);
            doSomething(fn, 3);
            const argCaptor = (0, Matchers_1.captor)();
            expect(fn).toHaveBeenNthCalledWith(1, argCaptor, (0, Matchers_1.any)(), (0, Matchers_1.any)());
            expect(fn).toHaveBeenNthCalledWith(2, argCaptor, (0, Matchers_1.any)(), (0, Matchers_1.any)());
            expect(fn).toHaveBeenNthCalledWith(3, argCaptor, (0, Matchers_1.any)(), (0, Matchers_1.any)());
            expect(argCaptor.value).toBe('3');
            expect(argCaptor.values).toEqual(['1', '2', '3']);
        });
    });
    describe('matches function', () => {
        test('expects passes for when it returns true', () => {
            const fn = jest.fn();
            fn(1);
            expect(fn).toHaveBeenCalledWith((0, Matchers_1.matches)((val) => val === 1));
        });
        test('expects with not passes for when it returns false', () => {
            const fn = jest.fn();
            fn(1);
            expect(fn).not.toHaveBeenCalledWith((0, Matchers_1.matches)((val) => val === 2));
        });
    });
});
