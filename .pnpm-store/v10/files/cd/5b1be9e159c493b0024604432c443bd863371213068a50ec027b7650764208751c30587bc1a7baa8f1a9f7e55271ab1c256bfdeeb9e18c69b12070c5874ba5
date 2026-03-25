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
exports.RedisInstrumentationV2_V3 = void 0;
const instrumentation_1 = require("@opentelemetry/instrumentation");
const utils_1 = require("./utils");
/** @knipignore */
const version_1 = require("../version");
const api_1 = require("@opentelemetry/api");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const semconv_1 = require("../semconv");
const redis_common_1 = require("@opentelemetry/redis-common");
class RedisInstrumentationV2_V3 extends instrumentation_1.InstrumentationBase {
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
        return [
            new instrumentation_1.InstrumentationNodeModuleDefinition('redis', ['>=2.6.0 <4'], moduleExports => {
                if ((0, instrumentation_1.isWrapped)(moduleExports.RedisClient.prototype['internal_send_command'])) {
                    this._unwrap(moduleExports.RedisClient.prototype, 'internal_send_command');
                }
                this._wrap(moduleExports.RedisClient.prototype, 'internal_send_command', this._getPatchInternalSendCommand());
                if ((0, instrumentation_1.isWrapped)(moduleExports.RedisClient.prototype['create_stream'])) {
                    this._unwrap(moduleExports.RedisClient.prototype, 'create_stream');
                }
                this._wrap(moduleExports.RedisClient.prototype, 'create_stream', this._getPatchCreateStream());
                if ((0, instrumentation_1.isWrapped)(moduleExports.createClient)) {
                    this._unwrap(moduleExports, 'createClient');
                }
                this._wrap(moduleExports, 'createClient', this._getPatchCreateClient());
                return moduleExports;
            }, moduleExports => {
                if (moduleExports === undefined)
                    return;
                this._unwrap(moduleExports.RedisClient.prototype, 'internal_send_command');
                this._unwrap(moduleExports.RedisClient.prototype, 'create_stream');
                this._unwrap(moduleExports, 'createClient');
            }),
        ];
    }
    /**
     * Patch internal_send_command(...) to trace requests
     */
    _getPatchInternalSendCommand() {
        const instrumentation = this;
        return function internal_send_command(original) {
            return function internal_send_command_trace(cmd) {
                // Versions of redis (2.4+) use a single options object
                // instead of named arguments
                if (arguments.length !== 1 || typeof cmd !== 'object') {
                    // We don't know how to trace this call, so don't start/stop a span
                    return original.apply(this, arguments);
                }
                const config = instrumentation.getConfig();
                const hasNoParentSpan = api_1.trace.getSpan(api_1.context.active()) === undefined;
                if (config.requireParentSpan === true && hasNoParentSpan) {
                    return original.apply(this, arguments);
                }
                const dbStatementSerializer = config?.dbStatementSerializer || redis_common_1.defaultDbStatementSerializer;
                const attributes = {};
                if (instrumentation._semconvStability & instrumentation_1.SemconvStability.OLD) {
                    Object.assign(attributes, {
                        [semconv_1.ATTR_DB_SYSTEM]: semconv_1.DB_SYSTEM_VALUE_REDIS,
                        [semconv_1.ATTR_DB_STATEMENT]: dbStatementSerializer(cmd.command, cmd.args),
                    });
                }
                if (instrumentation._semconvStability & instrumentation_1.SemconvStability.STABLE) {
                    Object.assign(attributes, {
                        [semantic_conventions_1.ATTR_DB_SYSTEM_NAME]: semconv_1.DB_SYSTEM_NAME_VALUE_REDIS,
                        [semantic_conventions_1.ATTR_DB_OPERATION_NAME]: cmd.command,
                        [semantic_conventions_1.ATTR_DB_QUERY_TEXT]: dbStatementSerializer(cmd.command, cmd.args),
                    });
                }
                const span = instrumentation.tracer.startSpan(`${RedisInstrumentationV2_V3.COMPONENT}-${cmd.command}`, {
                    kind: api_1.SpanKind.CLIENT,
                    attributes,
                });
                // Set attributes for not explicitly typed RedisPluginClientTypes
                if (this.connection_options) {
                    const connectionAttributes = {};
                    if (instrumentation._semconvStability & instrumentation_1.SemconvStability.OLD) {
                        Object.assign(connectionAttributes, {
                            [semconv_1.ATTR_NET_PEER_NAME]: this.connection_options.host,
                            [semconv_1.ATTR_NET_PEER_PORT]: this.connection_options.port,
                        });
                    }
                    if (instrumentation._semconvStability & instrumentation_1.SemconvStability.STABLE) {
                        Object.assign(connectionAttributes, {
                            [semantic_conventions_1.ATTR_SERVER_ADDRESS]: this.connection_options.host,
                            [semantic_conventions_1.ATTR_SERVER_PORT]: this.connection_options.port,
                        });
                    }
                    span.setAttributes(connectionAttributes);
                }
                if (this.address &&
                    instrumentation._semconvStability & instrumentation_1.SemconvStability.OLD) {
                    span.setAttribute(semconv_1.ATTR_DB_CONNECTION_STRING, `redis://${this.address}`);
                }
                const originalCallback = arguments[0].callback;
                if (originalCallback) {
                    const originalContext = api_1.context.active();
                    arguments[0].callback = function callback(err, reply) {
                        if (config?.responseHook) {
                            const responseHook = config.responseHook;
                            (0, instrumentation_1.safeExecuteInTheMiddle)(() => {
                                responseHook(span, cmd.command, cmd.args, reply);
                            }, err => {
                                if (err) {
                                    instrumentation._diag.error('Error executing responseHook', err);
                                }
                            }, true);
                        }
                        (0, utils_1.endSpan)(span, err);
                        return api_1.context.with(originalContext, originalCallback, this, ...arguments);
                    };
                }
                try {
                    // Span will be ended in callback
                    return original.apply(this, arguments);
                }
                catch (rethrow) {
                    (0, utils_1.endSpan)(span, rethrow);
                    throw rethrow; // rethrow after ending span
                }
            };
        };
    }
    _getPatchCreateClient() {
        return function createClient(original) {
            return (0, utils_1.getTracedCreateClient)(original);
        };
    }
    _getPatchCreateStream() {
        return function createReadStream(original) {
            return (0, utils_1.getTracedCreateStreamTrace)(original);
        };
    }
}
exports.RedisInstrumentationV2_V3 = RedisInstrumentationV2_V3;
//# sourceMappingURL=instrumentation.js.map