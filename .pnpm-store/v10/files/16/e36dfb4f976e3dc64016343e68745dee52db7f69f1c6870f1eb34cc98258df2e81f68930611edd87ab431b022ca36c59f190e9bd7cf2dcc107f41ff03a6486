"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const convertKeys_1 = require("../convertKeys");
describe('convertKeysToCamelCase', () => {
    test('converts keys of a json payload from snake_case to camelCase', () => {
        const testJson = {
            test_key: 'test',
            another_test_key: 'another_test',
            one_more_test_key: 'one_more_test',
            camelKey: 'camel_test',
        };
        expect((0, convertKeys_1.convertKeysToCamelCase)(testJson)).toEqual({
            testKey: 'test',
            anotherTestKey: 'another_test',
            oneMoreTestKey: 'one_more_test',
            camelKey: 'camel_test',
        });
    });
    test('converts arrays of object keys from snake_case to camelCase', () => {
        const testJson = [
            {
                test_key: 'test',
                another_test_key: 'another_test',
            },
            {
                one_more_test_key: 'one_more_test',
                camel_key: 'camel_test',
            },
        ];
        expect((0, convertKeys_1.convertKeysToCamelCase)(testJson)).toEqual([
            {
                testKey: 'test',
                anotherTestKey: 'another_test',
            },
            {
                oneMoreTestKey: 'one_more_test',
                camelKey: 'camel_test',
            },
        ]);
    });
    test('converts nested object keys from snake_case to camelCase', () => {
        const testJson = {
            test_key: 'test',
            another_test_key: 'another_test',
            nested_object: {
                nested_key: 'nested',
                another_nested_key: 'another_nested',
            },
        };
        expect((0, convertKeys_1.convertKeysToCamelCase)(testJson)).toEqual({
            testKey: 'test',
            anotherTestKey: 'another_test',
            nestedObject: {
                nestedKey: 'nested',
                anotherNestedKey: 'another_nested',
            },
        });
    });
    test('returns primitives as is', () => {
        const input = 'test';
        expect((0, convertKeys_1.convertKeysToCamelCase)(input)).toBe(input);
        const input2 = 1;
        expect((0, convertKeys_1.convertKeysToCamelCase)(input2)).toBe(input2);
        const input3 = [];
        expect((0, convertKeys_1.convertKeysToCamelCase)(input3)).toEqual(input3);
    });
});
//# sourceMappingURL=convertKeys.test.js.map