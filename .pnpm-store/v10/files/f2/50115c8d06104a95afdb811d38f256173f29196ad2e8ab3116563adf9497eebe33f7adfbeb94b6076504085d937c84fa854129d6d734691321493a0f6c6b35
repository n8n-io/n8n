"use strict";
/*
 * Copyright The OpenTelemetry Authors, Aspecto
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
exports.KafkaJsInstrumentation = void 0;
const api_1 = require("@opentelemetry/api");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const internal_types_1 = require("./internal-types");
const propagator_1 = require("./propagator");
const semconv_1 = require("./semconv");
/** @knipignore */
const version_1 = require("./version");
function prepareCounter(meter, value, attributes) {
    return (errorType) => {
        meter.add(value, {
            ...attributes,
            ...(errorType ? { [semantic_conventions_1.ATTR_ERROR_TYPE]: errorType } : {}),
        });
    };
}
function prepareDurationHistogram(meter, value, attributes) {
    return (errorType) => {
        meter.record((Date.now() - value) / 1000, {
            ...attributes,
            ...(errorType ? { [semantic_conventions_1.ATTR_ERROR_TYPE]: errorType } : {}),
        });
    };
}
const HISTOGRAM_BUCKET_BOUNDARIES = [
    0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10,
];
class KafkaJsInstrumentation extends instrumentation_1.InstrumentationBase {
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, config);
    }
    _updateMetricInstruments() {
        this._clientDuration = this.meter.createHistogram(semconv_1.METRIC_MESSAGING_CLIENT_OPERATION_DURATION, { advice: { explicitBucketBoundaries: HISTOGRAM_BUCKET_BOUNDARIES } });
        this._sentMessages = this.meter.createCounter(semconv_1.METRIC_MESSAGING_CLIENT_SENT_MESSAGES);
        this._consumedMessages = this.meter.createCounter(semconv_1.METRIC_MESSAGING_CLIENT_CONSUMED_MESSAGES);
        this._processDuration = this.meter.createHistogram(semconv_1.METRIC_MESSAGING_PROCESS_DURATION, { advice: { explicitBucketBoundaries: HISTOGRAM_BUCKET_BOUNDARIES } });
    }
    init() {
        const unpatch = (moduleExports) => {
            if ((0, instrumentation_1.isWrapped)(moduleExports?.Kafka?.prototype.producer)) {
                this._unwrap(moduleExports.Kafka.prototype, 'producer');
            }
            if ((0, instrumentation_1.isWrapped)(moduleExports?.Kafka?.prototype.consumer)) {
                this._unwrap(moduleExports.Kafka.prototype, 'consumer');
            }
        };
        const module = new instrumentation_1.InstrumentationNodeModuleDefinition('kafkajs', ['>=0.3.0 <3'], (moduleExports) => {
            unpatch(moduleExports);
            this._wrap(moduleExports?.Kafka?.prototype, 'producer', this._getProducerPatch());
            this._wrap(moduleExports?.Kafka?.prototype, 'consumer', this._getConsumerPatch());
            return moduleExports;
        }, unpatch);
        return module;
    }
    _getConsumerPatch() {
        const instrumentation = this;
        return (original) => {
            return function consumer(...args) {
                const newConsumer = original.apply(this, args);
                if ((0, instrumentation_1.isWrapped)(newConsumer.run)) {
                    instrumentation._unwrap(newConsumer, 'run');
                }
                instrumentation._wrap(newConsumer, 'run', instrumentation._getConsumerRunPatch());
                instrumentation._setKafkaEventListeners(newConsumer);
                return newConsumer;
            };
        };
    }
    _setKafkaEventListeners(kafkaObj) {
        if (kafkaObj[internal_types_1.EVENT_LISTENERS_SET])
            return;
        // The REQUEST Consumer event was added in kafkajs@1.5.0.
        if (kafkaObj.events?.REQUEST) {
            kafkaObj.on(kafkaObj.events.REQUEST, this._recordClientDurationMetric.bind(this));
        }
        kafkaObj[internal_types_1.EVENT_LISTENERS_SET] = true;
    }
    _recordClientDurationMetric(event) {
        const [address, port] = event.payload.broker.split(':');
        this._clientDuration.record(event.payload.duration / 1000, {
            [semconv_1.ATTR_MESSAGING_SYSTEM]: semconv_1.MESSAGING_SYSTEM_VALUE_KAFKA,
            [semconv_1.ATTR_MESSAGING_OPERATION_NAME]: `${event.payload.apiName}`,
            [semantic_conventions_1.ATTR_SERVER_ADDRESS]: address,
            [semantic_conventions_1.ATTR_SERVER_PORT]: Number.parseInt(port, 10),
        });
    }
    _getProducerPatch() {
        const instrumentation = this;
        return (original) => {
            return function consumer(...args) {
                const newProducer = original.apply(this, args);
                if ((0, instrumentation_1.isWrapped)(newProducer.sendBatch)) {
                    instrumentation._unwrap(newProducer, 'sendBatch');
                }
                instrumentation._wrap(newProducer, 'sendBatch', instrumentation._getSendBatchPatch());
                if ((0, instrumentation_1.isWrapped)(newProducer.send)) {
                    instrumentation._unwrap(newProducer, 'send');
                }
                instrumentation._wrap(newProducer, 'send', instrumentation._getSendPatch());
                if ((0, instrumentation_1.isWrapped)(newProducer.transaction)) {
                    instrumentation._unwrap(newProducer, 'transaction');
                }
                instrumentation._wrap(newProducer, 'transaction', instrumentation._getProducerTransactionPatch());
                instrumentation._setKafkaEventListeners(newProducer);
                return newProducer;
            };
        };
    }
    _getConsumerRunPatch() {
        const instrumentation = this;
        return (original) => {
            return function run(...args) {
                const config = args[0];
                if (config?.eachMessage) {
                    if ((0, instrumentation_1.isWrapped)(config.eachMessage)) {
                        instrumentation._unwrap(config, 'eachMessage');
                    }
                    instrumentation._wrap(config, 'eachMessage', instrumentation._getConsumerEachMessagePatch());
                }
                if (config?.eachBatch) {
                    if ((0, instrumentation_1.isWrapped)(config.eachBatch)) {
                        instrumentation._unwrap(config, 'eachBatch');
                    }
                    instrumentation._wrap(config, 'eachBatch', instrumentation._getConsumerEachBatchPatch());
                }
                return original.call(this, config);
            };
        };
    }
    _getConsumerEachMessagePatch() {
        const instrumentation = this;
        return (original) => {
            return function eachMessage(...args) {
                const payload = args[0];
                const propagatedContext = api_1.propagation.extract(api_1.ROOT_CONTEXT, payload.message.headers, propagator_1.bufferTextMapGetter);
                const span = instrumentation._startConsumerSpan({
                    topic: payload.topic,
                    message: payload.message,
                    operationType: semconv_1.MESSAGING_OPERATION_TYPE_VALUE_PROCESS,
                    ctx: propagatedContext,
                    attributes: {
                        [semconv_1.ATTR_MESSAGING_DESTINATION_PARTITION_ID]: String(payload.partition),
                    },
                });
                const pendingMetrics = [
                    prepareDurationHistogram(instrumentation._processDuration, Date.now(), {
                        [semconv_1.ATTR_MESSAGING_SYSTEM]: semconv_1.MESSAGING_SYSTEM_VALUE_KAFKA,
                        [semconv_1.ATTR_MESSAGING_OPERATION_NAME]: 'process',
                        [semconv_1.ATTR_MESSAGING_DESTINATION_NAME]: payload.topic,
                        [semconv_1.ATTR_MESSAGING_DESTINATION_PARTITION_ID]: String(payload.partition),
                    }),
                    prepareCounter(instrumentation._consumedMessages, 1, {
                        [semconv_1.ATTR_MESSAGING_SYSTEM]: semconv_1.MESSAGING_SYSTEM_VALUE_KAFKA,
                        [semconv_1.ATTR_MESSAGING_OPERATION_NAME]: 'process',
                        [semconv_1.ATTR_MESSAGING_DESTINATION_NAME]: payload.topic,
                        [semconv_1.ATTR_MESSAGING_DESTINATION_PARTITION_ID]: String(payload.partition),
                    }),
                ];
                const eachMessagePromise = api_1.context.with(api_1.trace.setSpan(propagatedContext, span), () => {
                    return original.apply(this, args);
                });
                return instrumentation._endSpansOnPromise([span], pendingMetrics, eachMessagePromise);
            };
        };
    }
    _getConsumerEachBatchPatch() {
        return (original) => {
            const instrumentation = this;
            return function eachBatch(...args) {
                const payload = args[0];
                // https://github.com/open-telemetry/opentelemetry-specification/blob/master/specification/trace/semantic_conventions/messaging.md#topic-with-multiple-consumers
                const receivingSpan = instrumentation._startConsumerSpan({
                    topic: payload.batch.topic,
                    message: undefined,
                    operationType: semconv_1.MESSAGING_OPERATION_TYPE_VALUE_RECEIVE,
                    ctx: api_1.ROOT_CONTEXT,
                    attributes: {
                        [semconv_1.ATTR_MESSAGING_BATCH_MESSAGE_COUNT]: payload.batch.messages.length,
                        [semconv_1.ATTR_MESSAGING_DESTINATION_PARTITION_ID]: String(payload.batch.partition),
                    },
                });
                return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), receivingSpan), () => {
                    const startTime = Date.now();
                    const spans = [];
                    const pendingMetrics = [
                        prepareCounter(instrumentation._consumedMessages, payload.batch.messages.length, {
                            [semconv_1.ATTR_MESSAGING_SYSTEM]: semconv_1.MESSAGING_SYSTEM_VALUE_KAFKA,
                            [semconv_1.ATTR_MESSAGING_OPERATION_NAME]: 'process',
                            [semconv_1.ATTR_MESSAGING_DESTINATION_NAME]: payload.batch.topic,
                            [semconv_1.ATTR_MESSAGING_DESTINATION_PARTITION_ID]: String(payload.batch.partition),
                        }),
                    ];
                    payload.batch.messages.forEach(message => {
                        const propagatedContext = api_1.propagation.extract(api_1.ROOT_CONTEXT, message.headers, propagator_1.bufferTextMapGetter);
                        const spanContext = api_1.trace
                            .getSpan(propagatedContext)
                            ?.spanContext();
                        let origSpanLink;
                        if (spanContext) {
                            origSpanLink = {
                                context: spanContext,
                            };
                        }
                        spans.push(instrumentation._startConsumerSpan({
                            topic: payload.batch.topic,
                            message,
                            operationType: semconv_1.MESSAGING_OPERATION_TYPE_VALUE_PROCESS,
                            link: origSpanLink,
                            attributes: {
                                [semconv_1.ATTR_MESSAGING_DESTINATION_PARTITION_ID]: String(payload.batch.partition),
                            },
                        }));
                        pendingMetrics.push(prepareDurationHistogram(instrumentation._processDuration, startTime, {
                            [semconv_1.ATTR_MESSAGING_SYSTEM]: semconv_1.MESSAGING_SYSTEM_VALUE_KAFKA,
                            [semconv_1.ATTR_MESSAGING_OPERATION_NAME]: 'process',
                            [semconv_1.ATTR_MESSAGING_DESTINATION_NAME]: payload.batch.topic,
                            [semconv_1.ATTR_MESSAGING_DESTINATION_PARTITION_ID]: String(payload.batch.partition),
                        }));
                    });
                    const batchMessagePromise = original.apply(this, args);
                    spans.unshift(receivingSpan);
                    return instrumentation._endSpansOnPromise(spans, pendingMetrics, batchMessagePromise);
                });
            };
        };
    }
    _getProducerTransactionPatch() {
        const instrumentation = this;
        return (original) => {
            return function transaction(...args) {
                const transactionSpan = instrumentation.tracer.startSpan('transaction');
                const transactionPromise = original.apply(this, args);
                transactionPromise
                    .then((transaction) => {
                    const originalSend = transaction.send;
                    transaction.send = function send(...args) {
                        return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), transactionSpan), () => {
                            const patched = instrumentation._getSendPatch()(originalSend);
                            return patched.apply(this, args).catch(err => {
                                transactionSpan.setStatus({
                                    code: api_1.SpanStatusCode.ERROR,
                                    message: err?.message,
                                });
                                transactionSpan.recordException(err);
                                throw err;
                            });
                        });
                    };
                    const originalSendBatch = transaction.sendBatch;
                    transaction.sendBatch = function sendBatch(...args) {
                        return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), transactionSpan), () => {
                            const patched = instrumentation._getSendBatchPatch()(originalSendBatch);
                            return patched.apply(this, args).catch(err => {
                                transactionSpan.setStatus({
                                    code: api_1.SpanStatusCode.ERROR,
                                    message: err?.message,
                                });
                                transactionSpan.recordException(err);
                                throw err;
                            });
                        });
                    };
                    const originalCommit = transaction.commit;
                    transaction.commit = function commit(...args) {
                        const originCommitPromise = originalCommit
                            .apply(this, args)
                            .then(() => {
                            transactionSpan.setStatus({ code: api_1.SpanStatusCode.OK });
                        });
                        return instrumentation._endSpansOnPromise([transactionSpan], [], originCommitPromise);
                    };
                    const originalAbort = transaction.abort;
                    transaction.abort = function abort(...args) {
                        const originAbortPromise = originalAbort.apply(this, args);
                        return instrumentation._endSpansOnPromise([transactionSpan], [], originAbortPromise);
                    };
                })
                    .catch(err => {
                    transactionSpan.setStatus({
                        code: api_1.SpanStatusCode.ERROR,
                        message: err?.message,
                    });
                    transactionSpan.recordException(err);
                    transactionSpan.end();
                });
                return transactionPromise;
            };
        };
    }
    _getSendBatchPatch() {
        const instrumentation = this;
        return (original) => {
            return function sendBatch(...args) {
                const batch = args[0];
                const messages = batch.topicMessages || [];
                const spans = [];
                const pendingMetrics = [];
                messages.forEach(topicMessage => {
                    topicMessage.messages.forEach(message => {
                        spans.push(instrumentation._startProducerSpan(topicMessage.topic, message));
                        pendingMetrics.push(prepareCounter(instrumentation._sentMessages, 1, {
                            [semconv_1.ATTR_MESSAGING_SYSTEM]: semconv_1.MESSAGING_SYSTEM_VALUE_KAFKA,
                            [semconv_1.ATTR_MESSAGING_OPERATION_NAME]: 'send',
                            [semconv_1.ATTR_MESSAGING_DESTINATION_NAME]: topicMessage.topic,
                            ...(message.partition !== undefined
                                ? {
                                    [semconv_1.ATTR_MESSAGING_DESTINATION_PARTITION_ID]: String(message.partition),
                                }
                                : {}),
                        }));
                    });
                });
                const origSendResult = original.apply(this, args);
                return instrumentation._endSpansOnPromise(spans, pendingMetrics, origSendResult);
            };
        };
    }
    _getSendPatch() {
        const instrumentation = this;
        return (original) => {
            return function send(...args) {
                const record = args[0];
                const spans = record.messages.map(message => {
                    return instrumentation._startProducerSpan(record.topic, message);
                });
                const pendingMetrics = record.messages.map(m => prepareCounter(instrumentation._sentMessages, 1, {
                    [semconv_1.ATTR_MESSAGING_SYSTEM]: semconv_1.MESSAGING_SYSTEM_VALUE_KAFKA,
                    [semconv_1.ATTR_MESSAGING_OPERATION_NAME]: 'send',
                    [semconv_1.ATTR_MESSAGING_DESTINATION_NAME]: record.topic,
                    ...(m.partition !== undefined
                        ? {
                            [semconv_1.ATTR_MESSAGING_DESTINATION_PARTITION_ID]: String(m.partition),
                        }
                        : {}),
                }));
                const origSendResult = original.apply(this, args);
                return instrumentation._endSpansOnPromise(spans, pendingMetrics, origSendResult);
            };
        };
    }
    _endSpansOnPromise(spans, pendingMetrics, sendPromise) {
        return Promise.resolve(sendPromise)
            .then(result => {
            pendingMetrics.forEach(m => m());
            return result;
        })
            .catch(reason => {
            let errorMessage;
            let errorType = semantic_conventions_1.ERROR_TYPE_VALUE_OTHER;
            if (typeof reason === 'string' || reason === undefined) {
                errorMessage = reason;
            }
            else if (typeof reason === 'object' &&
                Object.prototype.hasOwnProperty.call(reason, 'message')) {
                errorMessage = reason.message;
                errorType = reason.constructor.name;
            }
            pendingMetrics.forEach(m => m(errorType));
            spans.forEach(span => {
                span.setAttribute(semantic_conventions_1.ATTR_ERROR_TYPE, errorType);
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: errorMessage,
                });
            });
            throw reason;
        })
            .finally(() => {
            spans.forEach(span => span.end());
        });
    }
    _startConsumerSpan({ topic, message, operationType, ctx, link, attributes, }) {
        const operationName = operationType === semconv_1.MESSAGING_OPERATION_TYPE_VALUE_RECEIVE
            ? 'poll' // for batch processing spans
            : operationType; // for individual message processing spans
        const span = this.tracer.startSpan(`${operationName} ${topic}`, {
            kind: operationType === semconv_1.MESSAGING_OPERATION_TYPE_VALUE_RECEIVE
                ? api_1.SpanKind.CLIENT
                : api_1.SpanKind.CONSUMER,
            attributes: {
                ...attributes,
                [semconv_1.ATTR_MESSAGING_SYSTEM]: semconv_1.MESSAGING_SYSTEM_VALUE_KAFKA,
                [semconv_1.ATTR_MESSAGING_DESTINATION_NAME]: topic,
                [semconv_1.ATTR_MESSAGING_OPERATION_TYPE]: operationType,
                [semconv_1.ATTR_MESSAGING_OPERATION_NAME]: operationName,
                [semconv_1.ATTR_MESSAGING_KAFKA_MESSAGE_KEY]: message?.key
                    ? String(message.key)
                    : undefined,
                [semconv_1.ATTR_MESSAGING_KAFKA_MESSAGE_TOMBSTONE]: message?.key && message.value === null ? true : undefined,
                [semconv_1.ATTR_MESSAGING_KAFKA_OFFSET]: message?.offset,
            },
            links: link ? [link] : [],
        }, ctx);
        const { consumerHook } = this.getConfig();
        if (consumerHook && message) {
            (0, instrumentation_1.safeExecuteInTheMiddle)(() => consumerHook(span, { topic, message }), e => {
                if (e)
                    this._diag.error('consumerHook error', e);
            }, true);
        }
        return span;
    }
    _startProducerSpan(topic, message) {
        const span = this.tracer.startSpan(`send ${topic}`, {
            kind: api_1.SpanKind.PRODUCER,
            attributes: {
                [semconv_1.ATTR_MESSAGING_SYSTEM]: semconv_1.MESSAGING_SYSTEM_VALUE_KAFKA,
                [semconv_1.ATTR_MESSAGING_DESTINATION_NAME]: topic,
                [semconv_1.ATTR_MESSAGING_KAFKA_MESSAGE_KEY]: message.key
                    ? String(message.key)
                    : undefined,
                [semconv_1.ATTR_MESSAGING_KAFKA_MESSAGE_TOMBSTONE]: message.key && message.value === null ? true : undefined,
                [semconv_1.ATTR_MESSAGING_DESTINATION_PARTITION_ID]: message.partition !== undefined
                    ? String(message.partition)
                    : undefined,
                [semconv_1.ATTR_MESSAGING_OPERATION_NAME]: 'send',
                [semconv_1.ATTR_MESSAGING_OPERATION_TYPE]: semconv_1.MESSAGING_OPERATION_TYPE_VALUE_SEND,
            },
        });
        message.headers = message.headers ?? {};
        api_1.propagation.inject(api_1.trace.setSpan(api_1.context.active(), span), message.headers);
        const { producerHook } = this.getConfig();
        if (producerHook) {
            (0, instrumentation_1.safeExecuteInTheMiddle)(() => producerHook(span, { topic, message }), e => {
                if (e)
                    this._diag.error('producerHook error', e);
            }, true);
        }
        return span;
    }
}
exports.KafkaJsInstrumentation = KafkaJsInstrumentation;
//# sourceMappingURL=instrumentation.js.map