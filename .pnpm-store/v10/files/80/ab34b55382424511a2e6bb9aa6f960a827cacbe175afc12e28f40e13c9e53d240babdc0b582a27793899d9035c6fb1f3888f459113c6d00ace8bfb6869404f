"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultDbStatementSerializer = void 0;
/**
 * List of regexes and the number of arguments that should be serialized for matching commands.
 * For example, HSET should serialize which key and field it's operating on, but not its value.
 * Setting the subset to -1 will serialize all arguments.
 * Commands without a match will have their first argument serialized.
 *
 * Refer to https://redis.io/commands/ for the full list.
 */
const serializationSubsets = [
    {
        regex: /^ECHO/i,
        args: 0,
    },
    {
        regex: /^(LPUSH|MSET|PFA|PUBLISH|RPUSH|SADD|SET|SPUBLISH|XADD|ZADD)/i,
        args: 1,
    },
    {
        regex: /^(HSET|HMSET|LSET|LINSERT)/i,
        args: 2,
    },
    {
        regex: /^(ACL|BIT|B[LRZ]|CLIENT|CLUSTER|CONFIG|COMMAND|DECR|DEL|EVAL|EX|FUNCTION|GEO|GET|HINCR|HMGET|HSCAN|INCR|L[TRLM]|MEMORY|P[EFISTU]|RPOP|S[CDIMORSU]|XACK|X[CDGILPRT]|Z[CDILMPRS])/i,
        args: -1,
    },
];
/**
 * Given the redis command name and arguments, return a combination of the
 * command name + the allowed arguments according to `serializationSubsets`.
 * @param cmdName The redis command name
 * @param cmdArgs The redis command arguments
 * @returns a combination of the command name + args according to `serializationSubsets`.
 */
const defaultDbStatementSerializer = (cmdName, cmdArgs) => {
    if (Array.isArray(cmdArgs) && cmdArgs.length) {
        const nArgsToSerialize = serializationSubsets.find(({ regex }) => {
            return regex.test(cmdName);
        })?.args ?? 0;
        const argsToSerialize = nArgsToSerialize >= 0 ? cmdArgs.slice(0, nArgsToSerialize) : cmdArgs;
        if (cmdArgs.length > argsToSerialize.length) {
            argsToSerialize.push(`[${cmdArgs.length - nArgsToSerialize} other arguments]`);
        }
        return `${cmdName} ${argsToSerialize.join(' ')}`;
    }
    return cmdName;
};
exports.defaultDbStatementSerializer = defaultDbStatementSerializer;
//# sourceMappingURL=index.js.map