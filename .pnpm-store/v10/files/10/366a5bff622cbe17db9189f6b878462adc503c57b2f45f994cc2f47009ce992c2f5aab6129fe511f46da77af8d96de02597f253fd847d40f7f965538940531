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
exports.RedisInstrumentationV4_V5 = void 0;
const api_1 = require("@opentelemetry/api");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const utils_1 = require("./utils");
const redis_common_1 = require("@opentelemetry/redis-common");
/** @knipignore */
const version_1 = require("../version");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const semconv_1 = require("../semconv");
const OTEL_OPEN_SPANS = Symbol('opentelemetry.instrumentation.redis.open_spans');
const MULTI_COMMAND_OPTIONS = Symbol('opentelemetry.instrumentation.redis.multi_command_options');
class RedisInstrumentationV4_V5 extends instrumentation_1.InstrumentationBase {
    static COMPONENT = 'redis';
    _semconvStability;
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, config);
        this._semconvStability = config.semconvStability
            ? config.semconvStability
            : (0, instrumentation_1.semconvStabilityFromStr)('database', process.env.OTEL_SEMCONV_STABILITY_OPT_IN);
    }
    setConfig(config = {}) {
        super.setConfig(config);
        this._semconvStability = config.semconvStability
            ? config.semconvStability
            : (0, instrumentation_1.semconvStabilityFromStr)('database', process.env.OTEL_SEMCONV_STABILITY_OPT_IN);
    }
    init() {
        // @node-redis/client is a new package introduced and consumed by 'redis 4.0.x'
        // on redis@4.1.0 it was changed to @redis/client.
        // we will instrument both packages
        return [
            this._getInstrumentationNodeModuleDefinition('@redis/client'),
            this._getInstrumentationNodeModuleDefinition('@node-redis/client'),
        ];
    }
    _getInstrumentationNodeModuleDefinition(basePackageName) {
        const commanderModuleFile = new instrumentation_1.InstrumentationNodeModuleFile(`${basePackageName}/dist/lib/commander.js`, ['^1.0.0'], (moduleExports, moduleVersion) => {
            const transformCommandArguments = moduleExports.transformCommandArguments;
            if (!transformCommandArguments) {
                this._diag.error('internal instrumentation error, missing transformCommandArguments function');
                return moduleExports;
            }
            // function name and signature changed in redis 4.1.0 from 'extendWithCommands' to 'attachCommands'
            // the matching internal package names starts with 1.0.x (for redis 4.0.x)
            const functionToPatch = moduleVersion?.startsWith('1.0.')
                ? 'extendWithCommands'
                : 'attachCommands';
            // this is the function that extend a redis client with a list of commands.
            // the function patches the commandExecutor to record a span
            if ((0, instrumentation_1.isWrapped)(moduleExports?.[functionToPatch])) {
                this._unwrap(moduleExports, functionToPatch);
            }
            this._wrap(moduleExports, functionToPatch, this._getPatchExtendWithCommands(transformCommandArguments));
            return moduleExports;
        }, (moduleExports) => {
            if ((0, instrumentation_1.isWrapped)(moduleExports?.extendWithCommands)) {
                this._unwrap(moduleExports, 'extendWithCommands');
            }
            if ((0, instrumentation_1.isWrapped)(moduleExports?.attachCommands)) {
                this._unwrap(moduleExports, 'attachCommands');
            }
        });
        const multiCommanderModule = new instrumentation_1.InstrumentationNodeModuleFile(`${basePackageName}/dist/lib/client/multi-command.js`, ['^1.0.0', '^5.0.0'], (moduleExports) => {
            const redisClientMultiCommandPrototype = moduleExports?.default?.prototype;
            if ((0, instrumentation_1.isWrapped)(redisClientMultiCommandPrototype?.exec)) {
                this._unwrap(redisClientMultiCommandPrototype, 'exec');
            }
            this._wrap(redisClientMultiCommandPrototype, 'exec', this._getPatchMultiCommandsExec(false));
            if ((0, instrumentation_1.isWrapped)(redisClientMultiCommandPrototype?.execAsPipeline)) {
                this._unwrap(redisClientMultiCommandPrototype, 'execAsPipeline');
            }
            this._wrap(redisClientMultiCommandPrototype, 'execAsPipeline', this._getPatchMultiCommandsExec(true));
            if ((0, instrumentation_1.isWrapped)(redisClientMultiCommandPrototype?.addCommand)) {
                this._unwrap(redisClientMultiCommandPrototype, 'addCommand');
            }
            this._wrap(redisClientMultiCommandPrototype, 'addCommand', this._getPatchMultiCommandsAddCommand());
            return moduleExports;
        }, (moduleExports) => {
            const redisClientMultiCommandPrototype = moduleExports?.default?.prototype;
            if ((0, instrumentation_1.isWrapped)(redisClientMultiCommandPrototype?.exec)) {
                this._unwrap(redisClientMultiCommandPrototype, 'exec');
            }
            if ((0, instrumentation_1.isWrapped)(redisClientMultiCommandPrototype?.addCommand)) {
                this._unwrap(redisClientMultiCommandPrototype, 'addCommand');
            }
        });
        const clientIndexModule = new instrumentation_1.InstrumentationNodeModuleFile(`${basePackageName}/dist/lib/client/index.js`, ['^1.0.0', '^5.0.0'], (moduleExports) => {
            const redisClientPrototype = moduleExports?.default?.prototype;
            // In some @redis/client versions 'multi' is a method. In later
            // versions, as of https://github.com/redis/node-redis/pull/2324,
            // 'MULTI' is a method and 'multi' is a property defined in the
            // constructor that points to 'MULTI', and therefore it will not
            // be defined on the prototype.
            if (redisClientPrototype?.multi) {
                if ((0, instrumentation_1.isWrapped)(redisClientPrototype?.multi)) {
                    this._unwrap(redisClientPrototype, 'multi');
                }
                this._wrap(redisClientPrototype, 'multi', this._getPatchRedisClientMulti());
            }
            if (redisClientPrototype?.MULTI) {
                if ((0, instrumentation_1.isWrapped)(redisClientPrototype?.MULTI)) {
                    this._unwrap(redisClientPrototype, 'MULTI');
                }
                this._wrap(redisClientPrototype, 'MULTI', this._getPatchRedisClientMulti());
            }
            if ((0, instrumentation_1.isWrapped)(redisClientPrototype?.sendCommand)) {
                this._unwrap(redisClientPrototype, 'sendCommand');
            }
            this._wrap(redisClientPrototype, 'sendCommand', this._getPatchRedisClientSendCommand());
            this._wrap(redisClientPrototype, 'connect', this._getPatchedClientConnect());
            return moduleExports;
        }, (moduleExports) => {
            const redisClientPrototype = moduleExports?.default?.prototype;
            if ((0, instrumentation_1.isWrapped)(redisClientPrototype?.multi)) {
                this._unwrap(redisClientPrototype, 'multi');
            }
            if ((0, instrumentation_1.isWrapped)(redisClientPrototype?.MULTI)) {
                this._unwrap(redisClientPrototype, 'MULTI');
            }
            if ((0, instrumentation_1.isWrapped)(redisClientPrototype?.sendCommand)) {
                this._unwrap(redisClientPrototype, 'sendCommand');
            }
        });
        return new instrumentation_1.InstrumentationNodeModuleDefinition(basePackageName, ['^1.0.0', '^5.0.0'], (moduleExports) => {
            return moduleExports;
        }, () => { }, [commanderModuleFile, multiCommanderModule, clientIndexModule]);
    }
    // serves both for redis 4.0.x where function name is extendWithCommands
    // and redis ^4.1.0 where function name is attachCommands
    _getPatchExtendWithCommands(transformCommandArguments) {
        const plugin = this;
        return function extendWithCommandsPatchWrapper(original) {
            return function extendWithCommandsPatch(config) {
                if (config?.BaseClass?.name !== 'RedisClient') {
                    return original.apply(this, arguments);
                }
                const origExecutor = config.executor;
                config.executor = function (command, args) {
                    const redisCommandArguments = transformCommandArguments(command, args).args;
                    return plugin._traceClientCommand(origExecutor, this, arguments, redisCommandArguments);
                };
                return original.apply(this, arguments);
            };
        };
    }
    _getPatchMultiCommandsExec(isPipeline) {
        const plugin = this;
        return function execPatchWrapper(original) {
            return function execPatch() {
                const execRes = original.apply(this, arguments);
                if (typeof execRes?.then !== 'function') {
                    plugin._diag.error('non-promise result when patching exec/execAsPipeline');
                    return execRes;
                }
                return execRes
                    .then((redisRes) => {
                    const openSpans = this[OTEL_OPEN_SPANS];
                    plugin._endSpansWithRedisReplies(openSpans, redisRes, isPipeline);
                    return redisRes;
                })
                    .catch((err) => {
                    const openSpans = this[OTEL_OPEN_SPANS];
                    if (!openSpans) {
                        plugin._diag.error('cannot find open spans to end for multi/pipeline');
                    }
                    else {
                        const replies = err.constructor.name === 'MultiErrorReply'
                            ? err.replies
                            : new Array(openSpans.length).fill(err);
                        plugin._endSpansWithRedisReplies(openSpans, replies, isPipeline);
                    }
                    return Promise.reject(err);
                });
            };
        };
    }
    _getPatchMultiCommandsAddCommand() {
        const plugin = this;
        return function addCommandWrapper(original) {
            return function addCommandPatch(args) {
                return plugin._traceClientCommand(original, this, arguments, args);
            };
        };
    }
    _getPatchRedisClientMulti() {
        return function multiPatchWrapper(original) {
            return function multiPatch() {
                const multiRes = original.apply(this, arguments);
                multiRes[MULTI_COMMAND_OPTIONS] = this.options;
                return multiRes;
            };
        };
    }
    _getPatchRedisClientSendCommand() {
        const plugin = this;
        return function sendCommandWrapper(original) {
            return function sendCommandPatch(args) {
                return plugin._traceClientCommand(original, this, arguments, args);
            };
        };
    }
    _getPatchedClientConnect() {
        const plugin = this;
        return function connectWrapper(original) {
            return function patchedConnect() {
                const options = this.options;
                const attributes = (0, utils_1.getClientAttributes)(plugin._diag, options, plugin._semconvStability);
                const span = plugin.tracer.startSpan(`${RedisInstrumentationV4_V5.COMPONENT}-connect`, {
                    kind: api_1.SpanKind.CLIENT,
                    attributes,
                });
                const res = api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => {
                    return original.apply(this);
                });
                return res
                    .then((result) => {
                    span.end();
                    return result;
                })
                    .catch((error) => {
                    span.recordException(error);
                    span.setStatus({
                        code: api_1.SpanStatusCode.ERROR,
                        message: error.message,
                    });
                    span.end();
                    return Promise.reject(error);
                });
            };
        };
    }
    _traceClientCommand(origFunction, origThis, origArguments, redisCommandArguments) {
        const hasNoParentSpan = api_1.trace.getSpan(api_1.context.active()) === undefined;
        if (hasNoParentSpan && this.getConfig().requireParentSpan) {
            return origFunction.apply(origThis, origArguments);
        }
        const clientOptions = origThis.options || origThis[MULTI_COMMAND_OPTIONS];
        const commandName = redisCommandArguments[0]; // types also allows it to be a Buffer, but in practice it only string
        const commandArgs = redisCommandArguments.slice(1);
        const dbStatementSerializer = this.getConfig().dbStatementSerializer || redis_common_1.defaultDbStatementSerializer;
        const attributes = (0, utils_1.getClientAttributes)(this._diag, clientOptions, this._semconvStability);
        if (this._semconvStability & instrumentation_1.SemconvStability.STABLE) {
            attributes[semantic_conventions_1.ATTR_DB_OPERATION_NAME] = commandName;
        }
        try {
            const dbStatement = dbStatementSerializer(commandName, commandArgs);
            if (dbStatement != null) {
                if (this._semconvStability & instrumentation_1.SemconvStability.OLD) {
                    attributes[semconv_1.ATTR_DB_STATEMENT] = dbStatement;
                }
                if (this._semconvStability & instrumentation_1.SemconvStability.STABLE) {
                    attributes[semantic_conventions_1.ATTR_DB_QUERY_TEXT] = dbStatement;
                }
            }
        }
        catch (e) {
            this._diag.error('dbStatementSerializer throw an exception', e, {
                commandName,
            });
        }
        const span = this.tracer.startSpan(`${RedisInstrumentationV4_V5.COMPONENT}-${commandName}`, {
            kind: api_1.SpanKind.CLIENT,
            attributes,
        });
        const res = api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => {
            return origFunction.apply(origThis, origArguments);
        });
        if (typeof res?.then === 'function') {
            res.then((redisRes) => {
                this._endSpanWithResponse(span, commandName, commandArgs, redisRes, undefined);
            }, (err) => {
                this._endSpanWithResponse(span, commandName, commandArgs, null, err);
            });
        }
        else {
            const redisClientMultiCommand = res;
            redisClientMultiCommand[OTEL_OPEN_SPANS] =
                redisClientMultiCommand[OTEL_OPEN_SPANS] || [];
            redisClientMultiCommand[OTEL_OPEN_SPANS].push({
                span,
                commandName,
                commandArgs,
            });
        }
        return res;
    }
    _endSpansWithRedisReplies(openSpans, replies, isPipeline = false) {
        if (!openSpans) {
            return this._diag.error('cannot find open spans to end for redis multi/pipeline');
        }
        if (replies.length !== openSpans.length) {
            return this._diag.error('number of multi command spans does not match response from redis');
        }
        // Determine a single operation name for the batch of commands.
        // If all commands are identical, include the command name (e.g., "MULTI SET").
        // Otherwise, use a generic "MULTI" or "PIPELINE" label for the span.
        const allCommands = openSpans.map(s => s.commandName);
        const allSameCommand = allCommands.every(cmd => cmd === allCommands[0]);
        const operationName = allSameCommand
            ? (isPipeline ? 'PIPELINE ' : 'MULTI ') + allCommands[0]
            : isPipeline
                ? 'PIPELINE'
                : 'MULTI';
        for (let i = 0; i < openSpans.length; i++) {
            const { span, commandArgs } = openSpans[i];
            const currCommandRes = replies[i];
            const [res, err] = currCommandRes instanceof Error
                ? [null, currCommandRes]
                : [currCommandRes, undefined];
            if (this._semconvStability & instrumentation_1.SemconvStability.STABLE) {
                span.setAttribute(semantic_conventions_1.ATTR_DB_OPERATION_NAME, operationName);
            }
            this._endSpanWithResponse(span, allCommands[i], commandArgs, res, err);
        }
    }
    _endSpanWithResponse(span, commandName, commandArgs, response, error) {
        const { responseHook } = this.getConfig();
        if (!error && responseHook) {
            try {
                responseHook(span, commandName, commandArgs, response);
            }
            catch (err) {
                this._diag.error('responseHook throw an exception', err);
            }
        }
        if (error) {
            span.recordException(error);
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: error?.message });
        }
        span.end();
    }
}
exports.RedisInstrumentationV4_V5 = RedisInstrumentationV4_V5;
//# sourceMappingURL=instrumentation.js.map