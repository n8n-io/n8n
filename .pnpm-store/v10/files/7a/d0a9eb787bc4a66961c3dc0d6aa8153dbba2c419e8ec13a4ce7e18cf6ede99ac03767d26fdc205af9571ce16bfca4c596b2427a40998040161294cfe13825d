# @prisma/instrumentation

[![npm version](https://img.shields.io/npm/v/@prisma/instrumentation.svg?style=flat)](https://www.npmjs.com/package/@prisma/instrumentation) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/prisma/prisma/blob/main/CONTRIBUTING.md) [![GitHub license](https://img.shields.io/badge/license-Apache%202-blue)](https://github.com/prisma/prisma/blob/main/LICENSE) [![Discord](https://img.shields.io/discord/937751382725886062?label=Discord)](https://pris.ly/discord)

[OTEL - OpenTelemetry](https://opentelemetry.io/) compliant instrumentation for Prisma Client.

## Installing

```
$ npm install @prisma/instrumentation
```

## Usage

```ts
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { PrismaInstrumentation } from '@prisma/instrumentation'

registerInstrumentations({
  instrumentations: [new PrismaInstrumentation()],
})
```

## Jaeger

Exporting traces to [Jaeger Tracing](https://jaegertracing.io).

```ts
import { context, trace } from '@opentelemetry/api'
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { PrismaInstrumentation } from '@prisma/instrumentation'

import { PrismaClient } from '.prisma/client'

const contextManager = new AsyncLocalStorageContextManager().enable()

context.setGlobalContextManager(contextManager)

const otlpTraceExporter = new OTLPTraceExporter()

const provider = new BasicTracerProvider({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'test-tracing-service',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  }),
  spanProcessors: [new SimpleSpanProcessor(otlpTraceExporter)],
})

trace.setGlobalTracerProvider(provider)

registerInstrumentations({
  instrumentations: [new PrismaInstrumentation()],
})

async function main() {
  const prisma = new PrismaClient()

  const email = `user.${Date.now()}@prisma.io`

  await prisma.user.create({
    data: {
      email: email,
    },
  })
}

main()
```
