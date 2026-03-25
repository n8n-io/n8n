"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queryParamsStringify_1 = require("../queryParamsStringify");
describe('queryParamsStringify', () => {
    test('should stringify array params correctly', () => {
        const params = {
            ids: ['1', '2', '3'],
        };
        expect((0, queryParamsStringify_1.queryParamsStringify)(params)).toEqual('ids=1&ids=2&ids=3');
    });
    test('should stringify array params correctly when there are other params', () => {
        const params = {
            ids: ['1', '2', '3'],
            other: 'param',
        };
        expect((0, queryParamsStringify_1.queryParamsStringify)(params)).toEqual('ids=1&ids=2&ids=3&other=param');
    });
});
//# sourceMappingURL=queryParamsStringify.test.js.map