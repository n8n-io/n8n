"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const index_1 = require("../src/index");
const assert = require("assert");
describe('#defaultDbStatementSerializer()', () => {
    [
        {
            cmdName: 'UNKNOWN',
            cmdArgs: ['something'],
            expected: 'UNKNOWN [1 other arguments]',
        },
        {
            cmdName: 'ECHO',
            cmdArgs: ['echo'],
            expected: 'ECHO [1 other arguments]',
        },
        {
            cmdName: 'LPUSH',
            cmdArgs: ['list', 'value'],
            expected: 'LPUSH list [1 other arguments]',
        },
        {
            cmdName: 'HSET',
            cmdArgs: ['hash', 'field', 'value'],
            expected: 'HSET hash field [1 other arguments]',
        },
        {
            cmdName: 'INCRBY',
            cmdArgs: ['key', 5],
            expected: 'INCRBY key 5',
        },
    ].forEach(({ cmdName, cmdArgs, expected }) => {
        it(`should serialize the correct number of arguments for ${cmdName}`, () => {
            assert.strictEqual((0, index_1.defaultDbStatementSerializer)(cmdName, cmdArgs), expected);
        });
    });
});
//# sourceMappingURL=redis-common.test.js.map