# OpenTelemetry `kafkajs` Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`kafkajs`](https://www.npmjs.com/package/kafkajs) package, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

```bash
npm install --save @opentelemetry/instrumentation-kafkajs
```

### Supported versions

- [`kafkajs`](https://www.npmjs.com/package/kafkajs) versions `>=0.3.0 <3`

## Usage

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const {
  KafkaJsInstrumentation,
} = require('@opentelemetry/instrumentation-kafkajs');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new KafkaJsInstrumentation({
      // see below for available configuration
    }),
  ],
});
```

### Instrumentation Options

You can set the following:

| Options        | Type                                   | Description                                                                                              |
|----------------|----------------------------------------|----------------------------------------------------------------------------------------------------------|
| `producerHook` | `KafkaProducerCustomAttributeFunction` | Function called before a producer message is sent. Allows for adding custom attributes to the span.      |
| `consumerHook` | `KafkaConsumerCustomAttributeFunction` | Function called before a consumer message is processed. Allows for adding custom attributes to the span. |

## Semantic Conventions

This package uses `@opentelemetry/semantic-conventions` version `1.30+`, which implements Semantic Convention [Version 1.30.0](https://github.com/open-telemetry/semantic-conventions/blob/v1.30.0/docs/README.md)

### Spans Emitted

| KafkaJS Object | Action                     | Span Kind | Span Name                  | Operation Type / Name |
|----------------|----------------------------|-----------|----------------------------|-----------------------|
| Consumer       | `eachBatch`                | Client    | `poll <topic-name>`        | `receive` / `poll`    |
| Consumer       | `eachBatch`, `eachMessage` | Consumer  | `process <topic-name>` [1] | `process` / `process` |
| Producer       | `send`                     | Producer  | `send <topic-name>`        | `send` / `send`       |

**[1] `process <topic-name>`:** In the context of `eachBatch`, this span will be emitted for each message in the batch but the timing (start, end, duration) will reflect the timing of the batch.

### Metrics Emitted

| KafkaJS Object        | Metric Name                           | Short Description                                                                                      |
|-----------------------|---------------------------------------|--------------------------------------------------------------------------------------------------------|
| Consumer              | `messaging.process.duration`          | Duration of processing operation. [1]                                                                  |
| Consumer              | `messaging.client.consumed.messages`  | Number of messages that were delivered to the application.                                             |
| Consumer and Producer | `messaging.client.operation.duration` | Number of messages that were delivered to the application. (Only emitted for kafkajs@1.5.0 and later.) |
| Producer              | `messaging.client.sent.messages`      | Number of messages producer attempted to send to the broker.                                           |

**[1] `messaging.process.duration`:** In the context of `eachBatch`, this metric will be emitted once for each message but the value reflects the duration of the entire batch.

### Attributes Collected

These attributes are added to both spans and metrics, where possible.

| Attribute                            | Short Description                                                                                                                                                  |
|--------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `messaging.system`                   | An identifier for the messaging system being used (i.e. `"kafka"`).                                                                                                |
| `messaging.destination.name`         | The message destination name.                                                                                                                                      |
| `messaging.operation.type`           | A string identifying the type of messaging operation.                                                                                                              |
| `messaging.operation.name`           | The system-specific name of the messaging operation.                                                                                                               |
| `messaging.operation.name`           | The system-specific name of the messaging operation.                                                                                                               |
| `messaging.kafka.message.key`        | A stringified value representing the key of the Kafka message (if present).                                                                                        |
| `messaging.kafka.message.tombstone`  | A boolean that is true if the message is a tombstone.                                                                                                              |
| `messaging.kafka.offset`             | The offset of a record in the corresponding Kafka partition.                                                                                                       |
| `messaging.destination.partition.id` | The identifier of the partition messages are sent to or received from, unique within the `messaging.destination.name`. **Note:** only available on producer spans. |

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-kafkajs
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-kafkajs.svg
