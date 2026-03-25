# OpenTelemetry Propagator B3

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

The OpenTelemetry b3 propagator package provides multiple propagator
implementations for systems using the b3 context format. See the
[b3 specification][b3-spec] for complete details.

## B3 Formats

Single-Header Format:

```bash
b3: {TraceId}-{SpanId}-{SamplingState}-{ParentSpanId}
```

Multi-Header Format:

```bash
X-B3-TraceId: {TraceId}
X-B3-SpanId: {SpanId}
X-B3-ParentSpanId: {ParentSpanId}
X-B3-Sampled: {SamplingState}
```

- {TraceId}

  - Required
  - Encoded as 32 or 16 lower-hex characters
  - 16 character traceIds will be converted to 32 characters by left-padding
    with 0s to conform with the [OpenTelemetry specification][otel-spec-id-format]

- {SpanId}

  - Required
  - Encoded as 16 lower-hex characters

- {ParentSpanId}

  - Optional
  - Used to support the Zipkin functionality where the client and server spans
    that make up an HTTP request share the same id
  - Not propagated by this library

- {SamplingState} - Single-header

  - Optional
  - Valid values
    - 1 - Accept
    - 0 - Deny
    - d - Debug
    - Absent - Defer sampling decision

- {SamplingState} - Multi-header

  - Optional
  - Valid values
    - 1 - Accept
    - 0 - Deny

- {Flags} - Multi-header
  - Optional
  - Debug is encoded as `X-B3-Flags`: 1. Absent or any other value can be ignored. Debug implies an accept decision, so don't also send the `X-B3-Sampled` header.

## B3 Propagation

The default `B3Propagator` implements b3 propagation according to the
[OpenTelemetry specification][otel-b3-requirements]. It extracts b3 context
from multi and single header encodings and injects context using the
single-header b3 encoding by default. The inject encoding can be changed to
multi-header via configuration. See the examples below.

### B3 Single-Header Configuration

```javascript
const api = require('@opentelemetry/api');
const { B3Propagator } = require('@opentelemetry/propagator-b3');

api.propagation.setGlobalPropagator(new B3Propagator());
```

### B3 Multi-Header Configuration

```javascript
const api = require('@opentelemetry/api');
const { B3Propagator, B3InjectEncoding } = require('@opentelemetry/propagator-b3');

api.propagation.setGlobalPropagator(
  new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER })
);
```

### B3 Single and Multi-Header Configuration

The B3Propagator always extracts both the single and multi-header b3 encodings.
If you need to inject both encodings this can accomplished using a composite
propagator.

```javascript
const api = require('@opentelemetry/api');
const { CompositePropagator } = require('@opentelemetry/core');
const { B3Propagator, B3InjectEncoding } = require('@opentelemetry/propagator-b3');
api.propagation.setGlobalPropagator(
  new CompositePropagator({
    propagators: [
      new B3Propagator(),
      new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),
    ],
  })
);
```

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/master/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/propagator-b3
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fpropagator-b3.svg
[b3-spec]: https://github.com/openzipkin/b3-propagation
[otel-b3-requirements]: https://github.com/open-telemetry/opentelemetry-specification/blob/master/specification/context/api-propagators.md#b3-requirements
[otel-spec-id-format]: https://github.com/open-telemetry/opentelemetry-specification/blob/master/specification/trace/api.md#retrieving-the-traceid-and-spanid
