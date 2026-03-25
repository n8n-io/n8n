/// <reference types="node" />
import { Context, HrTime, Span, Attributes } from '@opentelemetry/api';
import { SemconvStability } from '@opentelemetry/instrumentation';
import type * as amqp from 'amqplib';
export declare const MESSAGE_STORED_SPAN: unique symbol;
export declare const CHANNEL_SPANS_NOT_ENDED: unique symbol;
export declare const CHANNEL_CONSUME_TIMEOUT_TIMER: unique symbol;
export declare const CONNECTION_ATTRIBUTES: unique symbol;
export type InstrumentationConnection = amqp.Connection & {
    [CONNECTION_ATTRIBUTES]?: Attributes;
};
export type InstrumentationPublishChannel = (amqp.Channel | amqp.ConfirmChannel) & {
    connection: InstrumentationConnection;
};
export type InstrumentationConsumeChannel = amqp.Channel & {
    connection: InstrumentationConnection;
    [CHANNEL_SPANS_NOT_ENDED]?: {
        msg: amqp.ConsumeMessage;
        timeOfConsume: HrTime;
    }[];
    [CHANNEL_CONSUME_TIMEOUT_TIMER]?: NodeJS.Timeout;
};
export type InstrumentationMessage = amqp.Message & {
    [MESSAGE_STORED_SPAN]?: Span;
};
export type InstrumentationConsumeMessage = amqp.ConsumeMessage & {
    [MESSAGE_STORED_SPAN]?: Span;
};
export declare const normalizeExchange: (exchangeName: string) => string;
export declare const getConnectionAttributesFromServer: (conn: amqp.Connection) => Attributes;
export declare const getConnectionAttributesFromUrl: (url: string | amqp.Options.Connect, netSemconvStability: SemconvStability) => Attributes;
export declare const markConfirmChannelTracing: (context: Context) => Context;
export declare const unmarkConfirmChannelTracing: (context: Context) => Context;
export declare const isConfirmChannelTracing: (context: Context) => boolean;
//# sourceMappingURL=utils.d.ts.map