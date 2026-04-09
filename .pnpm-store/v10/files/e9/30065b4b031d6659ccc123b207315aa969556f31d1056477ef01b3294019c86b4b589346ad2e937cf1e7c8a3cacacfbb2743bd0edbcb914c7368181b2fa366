'use strict'

const {
  test,
  describe,
  after,
  afterEach,
  beforeEach
} = require('node:test')
const assert = require('node:assert')
const Fastify = require(process.env.FASTIFY_VERSION || 'fastify')

const {
  AsyncHooksContextManager
} = require('@opentelemetry/context-async-hooks')
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node')
const {
  InMemorySpanExporter,
  SimpleSpanProcessor
} = require('@opentelemetry/sdk-trace-base')
const { context } = require('@opentelemetry/api')

const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')

const FastifyInstrumentation = require('..')

// OTEL_SERVICE_NAME
// https://opentelemetry.io/docs/languages/sdk-configuration/general/
describe('Environment variable aware FastifyInstrumentation', () => {
  process.env.OTEL_SERVICE_NAME = 'my_app'
  process.env.OTEL_FASTIFY_IGNORE_PATHS = '/health/*'

  const httpInstrumentation = new HttpInstrumentation()
  const instrumentation = new FastifyInstrumentation()
  const contextManager = new AsyncHooksContextManager()
  const memoryExporter = new InMemorySpanExporter()
  const spanProcessor = new SimpleSpanProcessor(memoryExporter)
  const provider = new NodeTracerProvider({
    spanProcessors: [spanProcessor]
  })

  context.setGlobalContextManager(contextManager)
  httpInstrumentation.setTracerProvider(provider)
  instrumentation.setTracerProvider(provider)

  describe('Instrumentation#enabled', () => {
    beforeEach(() => {
      instrumentation.enable()
      httpInstrumentation.enable()
      contextManager.enable()
    })

    afterEach(() => {
      contextManager.disable()
      instrumentation.disable()
      httpInstrumentation.disable()
      spanProcessor.forceFlush()
      memoryExporter.reset()
    })

    test('should create spans with fastify-specific attributes (service.name comes from resource)', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get('/', async (request, reply) => 'hello world')

      await app.listen()

      after(() => app.close())

      const response = await fetch(
          `http://localhost:${app.server.address().port}/`
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [end, start] = spans

      assert.equal(spans.length, 2)
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'http.route': '/',
        'url.path': '/',
        'http.request.method': 'GET',
        'http.response.status_code': 200
      })
      assert.deepStrictEqual(end.attributes, {
        'hook.name': 'fastify -> @fastify/otel - route-handler',
        'fastify.type': 'request-handler',
        'http.route': '/',
        'hook.callback.name': 'anonymous'
      })
      assert.equal(response.status, 200)
      assert.equal(await response.text(), 'hello world')
    })

    test('should ignore route path instrumentation if FastifyOptions#ignorePaths is set (string|glob)', async () => {
      const instrumentation = new FastifyInstrumentation()

      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get('/health/up', async (request, reply) => 'hello world')

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/health/up`
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationLibrary.name === '@fastify/otel')

      assert.equal(spans.length, 0)
      assert.equal(await response.text(), 'hello world')
      assert.equal(response.status, 200)
    })
  })
})
