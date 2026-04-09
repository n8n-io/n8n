# OpenTelemetry Semantic Conventions

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

Semantic Convention constants for use with the OpenTelemetry SDK/APIs. [This document][trace-semantic_conventions] defines standard attributes for traces.

## Installation

```bash
npm install --save @opentelemetry/semantic-conventions
```

## Import Structure

This package has 2 separate exports.
The main export (`@opentelemetry/semantic-conventions`) includes only stable semantic conventions.
It is subject to the restrictions of semantic versioning 2.0.
The `/incubating` export (`@opentelemetry/semantic-conventions/incubating`) contains all stable and unstable semantic conventions.
It is _NOT_ subject to the restrictions of semantic versioning and _MAY_ contain breaking changes in minor releases.

## Usage

### Stable SemConv

```ts
import { 
  ATTR_NETWORK_PEER_ADDRESS,
  ATTR_NETWORK_PEER_PORT,
  ATTR_NETWORK_PROTOCOL_NAME,
  ATTR_NETWORK_PROTOCOL_VERSION,
  NETWORK_TRANSPORT_VALUE_TCP,
} from '@opentelemetry/semantic-conventions';

const span = tracer.startSpan(spanName, spanOptions)
  .setAttributes({
    [ATTR_NETWORK_PEER_ADDRESS]: 'localhost',
    [ATTR_NETWORK_PEER_PORT]: 8080,
    [ATTR_NETWORK_PROTOCOL_NAME]: 'http',
    [ATTR_NETWORK_PROTOCOL_VERSION]: '1.1',
    [ATTR_NETWORK_TRANSPORT]: NETWORK_TRANSPORT_VALUE_TCP,
  });
```

### Unstable SemConv

```ts
import { 
  ATTR_PROCESS_COMMAND,
  ATTR_PROCESS_COMMAND_ARGS,
  ATTR_PROCESS_COMMAND_LINE,
} from '@opentelemetry/semantic-conventions/incubating';

const span = tracer.startSpan(spanName, spanOptions)
  .setAttributes({
    [ATTR_PROCESS_COMMAND]: 'cat',
    [ATTR_PROCESS_COMMAND_ARGS]: ['file1', 'file2'],
    [ATTR_CONTAINER_COMMAND_LINE]: 'cat file1 file2',
  });
```

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/semantic-conventions
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fsemantic-conventions.svg

[trace-semantic_conventions]: https://github.com/open-telemetry/semantic-conventions/tree/main/specification/trace/semantic_conventions
