const { default: fastify } = require('fastify')
const { test, after, describe, beforeEach } = require('node:test')
const { resourceFromAttributes } = require('@opentelemetry/resources')
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions')
const FastifyOtelInstrumentation = require('..')
const { ExportResultCode } = require('@opentelemetry/core')
const assert = require('node:assert')
const { trace } = require('@opentelemetry/api')

describe('FastifyOtelInstrumentation with opentelemetry.NodeSDK', () => {
  const traceExporter = {
    spans: [],
    export: (spans, resultCallback) => {
      traceExporter.spans.push(...spans)
      resultCallback({ code: ExportResultCode.SUCCESS })
    },
    shutdown: async () => {},
    reset: () => {
      traceExporter.spans = []
    }
  }

  beforeEach(() => {
    trace.disable() // This is somehow necessary to reset Node SDK
    traceExporter.reset()
  })

  test('should export spans when registered as a NodeSDK instrumentation', async () => {
    const fastifyOtel = new FastifyOtelInstrumentation({ registerOnInitialization: true })
    const sdk = new NodeSDK({
      resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'test-service' }),
      traceExporter,
      instrumentations: [fastifyOtel]
    })
    sdk.start()
    after(() => sdk.shutdown())
    after(() => fastifyOtel.disable())

    const app = fastify()
    app.get('/qq', async () => 'hello world')

    await app.listen()
    after(() => app.close())

    const response = await fetch(
      `http://localhost:${app.server.address().port}/qq`
    )
    assert.equal(response.status, 200)

    await sdk.shutdown() // flush spans

    const spans = traceExporter.spans
    assert.equal(spans.length, 2)

    assert.deepStrictEqual(spans[0].name, 'handler - fastify -> @fastify/otel')
    assert.deepStrictEqual(spans[0].attributes, {
      'fastify.type': 'request-handler',
      'hook.callback.name': 'anonymous',
      'hook.name': 'fastify - route-handler',
      'http.route': '/qq',
    })
    assert.deepStrictEqual(spans[1].name, 'request')
    assert.deepStrictEqual(spans[1].attributes, {
      'fastify.root': '@fastify/otel',
      'http.request.method': 'GET',
      'http.response.status_code': 200,
      'http.route': '/qq',
      'url.path': '/qq',
    })
  })

  test('should export spans when registered as Fastify plugin', async () => {
    const sdk = new NodeSDK({
      resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'test-service' }),
      traceExporter,
    })
    sdk.start()
    after(() => sdk.shutdown())

    const app = fastify()
    await app.register(new FastifyOtelInstrumentation().plugin())
    app.get('/qq', async () => 'hello world')

    await app.listen()
    after(() => app.close())

    const response = await fetch(
      `http://localhost:${app.server.address().port}/qq`
    )
    assert.equal(response.status, 200)

    await sdk.shutdown() // flush spans

    const spans = traceExporter.spans
    assert.equal(spans.length, 2)

    assert.deepStrictEqual(spans[0].name, 'handler - fastify -> @fastify/otel')
    assert.deepStrictEqual(spans[0].attributes, {
      'fastify.type': 'request-handler',
      'hook.callback.name': 'anonymous',
      'hook.name': 'fastify -> @fastify/otel - route-handler',
      'http.route': '/qq',
    })
    assert.deepStrictEqual(spans[1].name, 'request')
    assert.deepStrictEqual(spans[1].attributes, {
      'fastify.root': '@fastify/otel',
      'http.request.method': 'GET',
      'http.response.status_code': 200,
      'http.route': '/qq',
      'url.path': '/qq',
    })
  })
})
