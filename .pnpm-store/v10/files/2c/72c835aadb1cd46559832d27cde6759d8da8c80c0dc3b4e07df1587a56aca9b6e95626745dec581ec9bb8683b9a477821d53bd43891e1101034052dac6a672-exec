export namespace Replies {
    interface Empty {
    }
    interface AssertQueue {
        queue: string;
        messageCount: number;
        consumerCount: number;
    }
    interface PurgeQueue {
        messageCount: number;
    }
    interface DeleteQueue {
        messageCount: number;
    }
    interface AssertExchange {
        exchange: string;
    }
    interface Consume {
        consumerTag: string;
    }
}

export namespace Options {
    interface Connect {
        /**
         * The to be used protocol
         *
         * Default value: 'amqp'
         */
        protocol?: string | undefined;
        /**
         * Hostname used for connecting to the server.
         *
         * Default value: 'localhost'
         */
        hostname?: string | undefined;
        /**
         * Port used for connecting to the server.
         *
         * Default value: 5672
         */
        port?: number | undefined;
        /**
         * Username used for authenticating against the server.
         *
         * Default value: 'guest'
         */
        username?: string | undefined;
        /**
         * Password used for authenticating against the server.
         *
         * Default value: 'guest'
         */
        password?: string | undefined;
        /**
         * The desired locale for error messages. RabbitMQ only ever uses en_US
         *
         * Default value: 'en_US'
         */
        locale?: string | undefined;
        /**
         * The size in bytes of the maximum frame allowed over the connection. 0 means
         * no limit (but since frames have a size field which is an unsigned 32 bit integer, it’s perforce 2^32 - 1).
         *
         * Default value: 0x1000 (4kb) - That's the allowed minimum, it will fit many purposes
         */
        frameMax?: number | undefined;
        /**
         * The period of the connection heartbeat in seconds.
         *
         * Default value: 0
         */
        heartbeat?: number | undefined;
        /**
         * What VHost shall be used.
         *
         * Default value: '/'
         */
        vhost?: string | undefined;
    }

    interface AssertQueue {
        exclusive?: boolean | undefined;
        durable?: boolean | undefined;
        autoDelete?: boolean | undefined;
        arguments?: any;
        messageTtl?: number | undefined;
        expires?: number | undefined;
        deadLetterExchange?: string | undefined;
        deadLetterRoutingKey?: string | undefined;
        maxLength?: number | undefined;
        maxPriority?: number | undefined;
    }
    interface DeleteQueue {
        ifUnused?: boolean | undefined;
        ifEmpty?: boolean | undefined;
    }
    interface AssertExchange {
        durable?: boolean | undefined;
        internal?: boolean | undefined;
        autoDelete?: boolean | undefined;
        alternateExchange?: string | undefined;
        arguments?: any;
    }
    interface DeleteExchange {
        ifUnused?: boolean | undefined;
    }
    interface Publish {
        expiration?: string | number | undefined;
        userId?: string | undefined;
        CC?: string | string[] | undefined;

        mandatory?: boolean | undefined;
        persistent?: boolean | undefined;
        deliveryMode?: boolean | number | undefined;
        BCC?: string | string[] | undefined;

        contentType?: string | undefined;
        contentEncoding?: string | undefined;
        headers?: any;
        priority?: number | undefined;
        correlationId?: string | undefined;
        replyTo?: string | undefined;
        messageId?: string | undefined;
        timestamp?: number | undefined;
        type?: string | undefined;
        appId?: string | undefined;
    }
    interface Consume {
        consumerTag?: string | undefined;
        noLocal?: boolean | undefined;
        noAck?: boolean | undefined;
        exclusive?: boolean | undefined;
        priority?: number | undefined;
        arguments?: any;
    }
    interface Get {
        noAck?: boolean | undefined;
    }
}

export interface Message {
    content: Buffer;
    fields: MessageFields;
    properties: MessageProperties;
}

export interface GetMessage extends Message {
    fields: GetMessageFields;
}

export interface ConsumeMessage extends Message {
    fields: ConsumeMessageFields;
}

export interface CommonMessageFields {
    deliveryTag: number;
    redelivered: boolean;
    exchange: string;
    routingKey: string;
}

export interface MessageFields extends CommonMessageFields {
    messageCount?: number | undefined;
    consumerTag?: string | undefined;
}

export interface GetMessageFields extends CommonMessageFields {
    messageCount: number;
}

export interface ConsumeMessageFields extends CommonMessageFields {
    consumerTag: string;
}

export interface MessageProperties {
    contentType: any | undefined;
    contentEncoding: any | undefined;
    headers: MessagePropertyHeaders;
    deliveryMode: any | undefined;
    priority: any | undefined;
    correlationId: any | undefined;
    replyTo: any | undefined;
    expiration: any | undefined;
    messageId: any | undefined;
    timestamp: any | undefined;
    type: any | undefined;
    userId: any | undefined;
    appId: any | undefined;
    clusterId: any | undefined;
}

export interface MessagePropertyHeaders {
    "x-first-death-exchange"?: string | undefined;
    "x-first-death-queue"?: string | undefined;
    "x-first-death-reason"?: string | undefined;
    "x-death"?: XDeath[] | undefined;
    [key: string]: any;
}

export interface XDeath {
    count: number;
    reason: "rejected" | "expired" | "maxlen";
    queue: string;
    time: {
        "!": "timestamp";
        value: number;
    };
    exchange: string;
    "original-expiration"?: any;
    "routing-keys": string[];
}

export interface ServerProperties {
    host: string;
    product: string;
    version: string;
    platform: string;
    copyright?: string | undefined;
    information: string;
    [key: string]: string | undefined;
}
