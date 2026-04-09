'use strict'

const {
  test,
  describe,
  before,
  after,
  afterEach,
  beforeEach
} = require('node:test')
const assert = require('node:assert')
const Fastify = require(process.env.FASTIFY_VERSION || 'fastify')

const {
  AsyncHooksContextManager
} = require('@opentelemetry/context-async-hooks')
const { JaegerPropagator } = require('@opentelemetry/propagator-jaeger')
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node')
const {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  AlwaysOnSampler
} = require('@opentelemetry/sdk-trace-base')
const {
  context,
  SpanStatusCode,
  trace,
  propagation
} = require('@opentelemetry/api')

const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')

const fp = require('fastify-plugin')

const FastifyInstrumentation = require('..')

describe('FastifyInstrumentation', () => {
  const httpInstrumentation = new HttpInstrumentation()
  const instrumentation = new FastifyInstrumentation()
  const contextManager = new AsyncHooksContextManager()
  const memoryExporter = new InMemorySpanExporter()
  const spanProcessor = new SimpleSpanProcessor(memoryExporter)
  const provider = new NodeTracerProvider({
    sampler: new AlwaysOnSampler(),
    spanProcessors: [spanProcessor]
  })

  provider.register()
  propagation.setGlobalPropagator(new JaegerPropagator())
  context.setGlobalContextManager(contextManager)
  httpInstrumentation.setTracerProvider(provider)
  instrumentation.setTracerProvider(provider)

  describe('Instrumentation#disabled', () => {
    test('should not create spans if disabled', async t => {
      before(() => {
        contextManager.enable()
      })

      after(() => {
        contextManager.disable()
        spanProcessor.forceFlush()
        memoryExporter.reset()
        instrumentation.disable()
        httpInstrumentation.disable()
      })

      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)
      app.register(fp(async function (fastify) {
        fastify.addHook('onRequest', (_request, _reply, done) => done())
      }))

      app.get('/', async (request, reply) => 'hello world')

      instrumentation.disable()

      const response = await app.inject({
        method: 'GET',
        url: '/'
      })

      const spans = memoryExporter
        .getFinishedSpans()
        .find(span => span.instrumentationScope.name === '@fastify/otel')

      assert.ok(spans == null)
      assert.equal(response.statusCode, 200)
      assert.equal(response.body, 'hello world')
    })

    test('should not create spans if disabled (route config)', async t => {
      before(() => {
        contextManager.enable()
      })

      after(() => {
        contextManager.disable()
        spanProcessor.forceFlush()
        memoryExporter.reset()
        instrumentation.disable()
        httpInstrumentation.disable()
      })

      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)
      app.register(fp(async function (fastify) {
        fastify.addHook('onRequest', (_request, _reply, done) => done())
      }))

      app.get('/', { config: { otel: false } }, async (request, reply) => 'hello world')

      instrumentation.disable()

      const response = await app.inject({
        method: 'GET',
        url: '/'
      })
      const spans = memoryExporter
        .getFinishedSpans()
        .find(span => span.instrumentationScope.name === '@fastify/otel')

      assert.ok(spans == null)
      assert.equal(response.statusCode, 200)
      assert.equal(response.body, 'hello world')
    })

    test('should not create spans for hooks if disabled', async t => {
      before(() => {
        contextManager.enable()
      })

      after(() => {
        contextManager.disable()
        spanProcessor.forceFlush()
        memoryExporter.reset()
        instrumentation.disable()
        httpInstrumentation.disable()
      })

      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)
      app.register(fp(async function (fastify) {
        fastify.addHook('onRequest', (_request, _reply, done) => done())
      }))
      instrumentation.disable()

      app.get('/', { preHandler: (request, reply, done) => { done() } }, async (request, reply) => 'hello world')

      const response = await app.inject({
        method: 'GET',
        url: '/'
      })

      const spans = memoryExporter
        .getFinishedSpans()
        .find(span => span.instrumentationScope.name === '@fastify/otel')

      assert.ok(spans == null)
      assert.equal(response.statusCode, 200)
      assert.equal(response.body, 'hello world')
    })

    test('should not create spans for hooks if disabled (route config)', async t => {
      before(() => {
        contextManager.enable()
      })

      after(() => {
        contextManager.disable()
        spanProcessor.forceFlush()
        memoryExporter.reset()
        instrumentation.disable()
        httpInstrumentation.disable()
      })

      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get('/', { config: { otel: false }, preHandler: (request, reply, done) => { done() } }, async (request, reply) => 'hello world')

      const response = await app.inject({
        method: 'GET',
        url: '/'
      })

      const spans = memoryExporter
        .getFinishedSpans()
        .find(span => span.instrumentationScope.name === '@fastify/otel')

      assert.ok(spans == null)
      assert.equal(response.statusCode, 200)
      assert.equal(response.body, 'hello world')
    })
  })

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

    test('should attach plugin if registerOnInitialization is true', async () => {
      const instrumentation = new FastifyInstrumentation({
        registerOnInitialization: true
      })
      assert.notEqual(instrumentation._handleInitialization, undefined)

      const app = await Fastify()
      assert.ok(app.hasPlugin('@fastify/otel'))
      app.close()

      instrumentation.disable()
      assert.equal(instrumentation._handleInitialization, undefined)
    })

    test('shouldn\'t attach plugin if registerOnInitialization isn\'t set', async () => {
      const instrumentation = new FastifyInstrumentation()
      assert.equal(instrumentation._handleInitialization, undefined)

      const app = await Fastify()
      assert.equal(app.hasPlugin('@fastify/otel'), false)
      app.close()
    })

    test('should ignore route path instrumentation if FastifyOptions#ignorePaths is set (string|glob)', async () => {
      const instrumentation = new FastifyInstrumentation({
        ignorePaths: '/health/*'
      })

      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)
      app.register(fp(async function (fastify) {
        fastify.addHook('onRequest', (_request, _reply, done) => done())
      }))

      app.get('/health/up', { preHandler: (request, reply, done) => { done() } }, async (request, reply) => 'hello world')

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/health/up`
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      assert.equal(spans.length, 0)
      assert.equal(await response.text(), 'hello world')
      assert.equal(response.status, 200)
    })

    test('should ignore route path instrumentation if FastifyOptions#ignorePaths is set (function)', async () => {
      const instrumentation = new FastifyInstrumentation({
        ignorePaths: (opts) => opts.url.includes('/health')
      })

      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)
      app.register(fp(async function (fastify) {
        fastify.addHook('onRequest', (_request, _reply, done) => done())
      }))

      app.get('/health', { onRequest: (request, reply, done) => { done() } }, async (request, reply) => 'hello world')

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/health`
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      assert.equal(spans.length, 0)
      assert.equal(await response.text(), 'hello world')
      assert.equal(response.status, 200)
    })

    test('should create anonymous span (simple case)', async t => {
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
      assert.equal(start.name, 'request')
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'http.route': '/',
        'url.path': '/',
        'http.request.method': 'GET',
        'http.response.status_code': 200
      })

      assert.equal(end.name, 'handler - fastify -> @fastify/otel')
      assert.deepStrictEqual(end.attributes, {
        'hook.name': 'fastify -> @fastify/otel - route-handler',
        'fastify.type': 'request-handler',
        'http.route': '/',
        'hook.callback.name': 'anonymous'
      })
      assert.equal(response.status, 200)
      assert.equal(await response.text(), 'hello world')
    })

    test('should infer propagated span', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get('/', async function helloworld () {
        return 'hello world'
      })

      await app.listen()

      after(() => app.close())

      let ctx = context.active()
      const span = trace.getTracer().startSpan('test-fetch', {}, ctx)

      ctx = trace.setSpan(ctx, span)

      const headers = {}

      propagation.inject(ctx, headers)

      const response = await fetch(
        `http://localhost:${app.server.address().port}/`,
        {
          headers
        }
      )

      span.end()

      const fastifySpans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')
      const [httpSpan] = memoryExporter
        .getFinishedSpans()
        .filter(
          span =>
            span.instrumentationScope.name ===
            '@opentelemetry/instrumentation-http'
        )

      const [end, start] = fastifySpans

      assert.equal(fastifySpans.length, 2)
      assert.equal(start.name, 'request')
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'http.route': '/',
        'url.path': '/',
        'http.request.method': 'GET',
        'http.response.status_code': 200
      })
      assert.equal(end.name, 'handler - helloworld')
      assert.deepStrictEqual(end.attributes, {
        'hook.name': 'fastify -> @fastify/otel - route-handler',
        'fastify.type': 'request-handler',
        'http.route': '/',
        'hook.callback.name': 'helloworld'
      })
      assert.equal(end.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(start.parentSpanContext.spanId, httpSpan.spanContext().spanId)
      assert.equal(httpSpan.parentSpanContext.spanId, span.spanContext().spanId)
      assert.equal(start.spanContext().traceId, span.spanContext().traceId)
      assert.equal(response.status, 200)
      assert.equal(await response.text(), 'hello world')
    })

    test('should create named span (simple case)', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get('/', async function helloworld () {
        return 'hello world'
      })

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

      assert.equal(end.name, 'handler - helloworld')
      assert.deepStrictEqual(end.attributes, {
        'hook.name': 'fastify -> @fastify/otel - route-handler',
        'fastify.type': 'request-handler',
        'http.route': '/',
        'hook.callback.name': 'helloworld'
      })
      assert.equal(end.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(response.status, 200)
      assert.equal(await response.text(), 'hello world')
    })

    test('should set http.route to route pattern for parameterized routes', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get('/users/:userId', async function getUser (request, reply) {
        return { userId: request.params.userId }
      })

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/users/123`
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [end, start] = spans

      assert.equal(spans.length, 2)
      assert.equal(start.name, 'request')
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'http.route': '/users/:userId',
        'url.path': '/users/123',
        'http.request.method': 'GET',
        'http.response.status_code': 200
      })

      assert.equal(end.name, 'handler - getUser')
      assert.deepStrictEqual(end.attributes, {
        'hook.name': 'fastify -> @fastify/otel - route-handler',
        'fastify.type': 'request-handler',
        'http.route': '/users/:userId',
        'hook.callback.name': 'getUser'
      })
      assert.equal(end.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(response.status, 200)
      assert.deepStrictEqual(await response.json(), { userId: '123' })
    })

    test('should handle route parameters in prefixed plugins', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      await app.register(
        async function plugin (app, opts) {
          app.get('/foo/:id', async function hello (request, reply) {
            return 'hello world'
          })
        },
        { prefix: '/test' }
      )

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/test/foo/123`
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [end, start] = spans

      assert.equal(spans.length, 2)
      assert.equal(start.name, 'request')
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'http.route': '/test/foo/:id',
        'url.path': '/test/foo/123',
        'http.request.method': 'GET',
        'http.response.status_code': 200
      })

      assert.equal(end.name, 'handler - hello')
      assert.deepStrictEqual(end.attributes, {
        'hook.name': 'plugin - route-handler',
        'fastify.type': 'request-handler',
        'http.route': '/test/foo/:id',
        'hook.callback.name': 'hello'
      })
      assert.equal(end.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(response.status, 200)
      assert.equal(await response.text(), 'hello world')
    })

    test('should create span for different hooks', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get(
        '/',
        {
          preHandler: function somePreHandler (request, reply, done) {
            done()
          },
          onRequest: [
            function onRequest1 (request, reply, done) {
              done()
            },
            function (request, reply, done) {
              done()
            }
          ]
        },
        async function helloworld () {
          return 'hello world'
        }
      )

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/`
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [preHandler, onReq2, onReq1, end, start] = spans

      assert.equal(spans.length, 5)
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'http.route': '/',
        'url.path': '/',
        'http.request.method': 'GET',
        'http.response.status_code': 200
      })

      assert.equal(onReq1.name, 'onRequest - onRequest1')
      assert.deepStrictEqual(onReq1.attributes, {
        'fastify.type': 'route-hook',
        'hook.callback.name': 'onRequest1',
        'hook.name': 'fastify -> @fastify/otel - route -> onRequest',
        'http.route': '/',
      })
      assert.equal(onReq2.name, 'onRequest - fastify -> @fastify/otel')
      assert.deepStrictEqual(onReq2.attributes, {
        'fastify.type': 'route-hook',
        'hook.callback.name': 'anonymous',
        'hook.name': 'fastify -> @fastify/otel - route -> onRequest',
        'http.route': '/',
      })
      assert.equal(preHandler.name, 'preHandler - somePreHandler')
      assert.deepStrictEqual(preHandler.attributes, {
        'fastify.type': 'route-hook',
        'hook.callback.name': 'somePreHandler',
        'hook.name': 'fastify -> @fastify/otel - route -> preHandler',
        'http.route': '/',
      })
      assert.equal(end.name, 'handler - helloworld')
      assert.deepStrictEqual(end.attributes, {
        'hook.name': 'fastify -> @fastify/otel - route-handler',
        'fastify.type': 'request-handler',
        'http.route': '/',
        'hook.callback.name': 'helloworld',
      })
      assert.equal(end.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(response.status, 200)
      assert.equal(await response.text(), 'hello world')
    })

    test('should create span for different hooks (patched)', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get(
        '/',
        {
          onSend: function onSend (request, reply, payload, done) {
            done(null, payload)
          }
        },
        async function helloworld () {
          return 'hello world'
        }
      )

      app.addHook('preValidation', function preValidation (request, reply, done) {
        done()
      })

      // Should not be patched
      app.addHook('onReady', function (done) {
        done()
      })

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/`
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [preValidation, end, start, onReq1] = spans

      assert.equal(spans.length, 4)
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'http.route': '/',
        'url.path': '/',
        'http.request.method': 'GET',
        'http.response.status_code': 200
      })
      assert.equal(onReq1.name, 'onSend - onSend')
      assert.deepStrictEqual(onReq1.attributes, {
        'fastify.type': 'route-hook',
        'hook.callback.name': 'onSend',
        'hook.name': 'fastify -> @fastify/otel - route -> onSend',
        'http.route': '/'
      })
      assert.equal(preValidation.name, 'preValidation - preValidation')
      assert.deepStrictEqual(preValidation.attributes, {
        'fastify.type': 'hook',
        'hook.callback.name': 'preValidation',
        'hook.name': 'fastify -> @fastify/otel - preValidation'
      })
      assert.equal(end.name, 'handler - helloworld')
      assert.deepStrictEqual(end.attributes, {
        'hook.name': 'fastify -> @fastify/otel - route-handler',
        'fastify.type': 'request-handler',
        'http.route': '/',
        'hook.callback.name': 'helloworld'
      })
      assert.equal(end.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(response.status, 200)
      assert.equal(await response.text(), 'hello world')
    })

    test('should create span for different hooks (error scenario)', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get('/', async function helloworld () {
        return 'hello world'
      })

      app.addHook('preHandler', function (request, reply, done) {
        throw new Error('error')
      })

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/`
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [preHandler, start] = spans

      assert.equal(spans.length, 2)
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'http.route': '/',
        'url.path': '/',
        'http.request.method': 'GET',
        'http.response.status_code': 500
      })
      assert.equal(preHandler.name, 'preHandler - fastify -> @fastify/otel')
      assert.deepStrictEqual(preHandler.attributes, {
        'fastify.type': 'hook',
        'hook.callback.name': 'anonymous',
        'hook.name': 'fastify -> @fastify/otel - preHandler'
      })
      assert.equal(preHandler.status.code, SpanStatusCode.ERROR)
      assert.equal(preHandler.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(response.status, 500)
    })

    test('should create named span (404)', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get('/', async function helloworld () {
        return 'hello world'
      })

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/`,
        { method: 'POST' }
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [start] = spans

      assert.equal(response.status, 404)
      assert.equal(spans.length, 1)
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'url.path': '/',
        'http.request.method': 'POST',
        'http.response.status_code': 404
      })
    })

    test('should create named span (404 - customized)', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.setNotFoundHandler(async function notFoundHandler (request, reply) {
        reply.code(404).send('not found')
      })

      app.get('/', async function helloworld () {
        return 'hello world'
      })

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/`,
        { method: 'POST' }
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [start, fof] = spans

      assert.equal(response.status, 404)
      assert.equal(spans.length, 2)
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'url.path': '/',
        'http.request.method': 'POST',
        'http.response.status_code': 404
      })
      assert.equal(fof.name, 'notFoundHandler - notFoundHandler')
      assert.deepStrictEqual(fof.attributes, {
        'hook.name': 'fastify -> @fastify/otel - not-found-handler',
        'fastify.type': 'hook',
        'hook.callback.name': 'notFoundHandler'
      })
    })

    test('should create named span (404 - customized with hooks)', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.setNotFoundHandler(
        {
          preHandler (request, reply, done) {
            done()
          },
          preValidation (request, reply, done) {
            done()
          }
        },
        async function notFoundHandler (request, reply) {
          reply.code(404).send('not found')
        }
      )

      app.get(
        '/',
        {
          schema: {
            headers: {
              type: 'object',
              properties: {
                'x-foo': { type: 'string' }
              }
            }
          }
        },
        async function helloworld () {
          return 'hello world'
        }
      )

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/`,
        { method: 'POST' }
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [preHandler, preValidation, start, fof] = spans

      assert.equal(response.status, 404)
      assert.equal(spans.length, 4)
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'url.path': '/',
        'http.request.method': 'POST',
        'http.response.status_code': 404
      })
      assert.deepStrictEqual(preHandler.attributes, {
        'hook.name':
          'fastify -> @fastify/otel - not-found-handler - preHandler',
        'fastify.type': 'hook',
        'hook.callback.name': 'preHandler'
      })
      assert.deepStrictEqual(preValidation.attributes, {
        'hook.name':
          'fastify -> @fastify/otel - not-found-handler - preValidation',
        'fastify.type': 'hook',
        'hook.callback.name': 'preValidation'
      })
      assert.deepStrictEqual(fof.attributes, {
        'hook.name': 'fastify -> @fastify/otel - not-found-handler',
        'fastify.type': 'hook',
        'hook.callback.name': 'notFoundHandler'
      })
      assert.equal(fof.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(preValidation.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(preHandler.parentSpanContext.spanId, start.spanContext().spanId)
    })

    test('should create named span (404 - customized with hooks)', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.setNotFoundHandler(
        {
          preHandler: function preHandler (request, reply, done) {
            done()
          },
          preValidation: function preValidation (request, reply, done) {
            done()
          }
        },
        async function notFoundHandler (request, reply) {
          reply.code(404).send('not found')
        }
      )

      app.get(
        '/',
        {
          schema: {
            headers: {
              type: 'object',
              properties: {
                'x-foo': { type: 'string' }
              }
            }
          }
        },
        async function helloworld () {
          return 'hello world'
        }
      )

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/`,
        { method: 'POST' }
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [preHandler, preValidation, start, fof] = spans

      assert.equal(response.status, 404)
      assert.equal(spans.length, 4)
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'url.path': '/',
        'http.request.method': 'POST',
        'http.response.status_code': 404
      })
      assert.deepStrictEqual(preHandler.attributes, {
        'hook.name':
          'fastify -> @fastify/otel - not-found-handler - preHandler',
        'fastify.type': 'hook',
        'hook.callback.name': 'preHandler'
      })
      assert.deepStrictEqual(preValidation.attributes, {
        'hook.name':
          'fastify -> @fastify/otel - not-found-handler - preValidation',
        'fastify.type': 'hook',
        'hook.callback.name': 'preValidation'
      })
      assert.deepStrictEqual(fof.attributes, {
        'hook.name': 'fastify -> @fastify/otel - not-found-handler',
        'fastify.type': 'hook',
        'hook.callback.name': 'notFoundHandler'
      })
      assert.equal(fof.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(preValidation.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(preHandler.parentSpanContext.spanId, start.spanContext().spanId)
    })

    test('should create span when the handler is overriden', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.addHook('onRoute', (routeOptions) => {
        const { handler } = routeOptions

        routeOptions.handler = function (...args) {
          return handler.call(this, ...args)
        }
      })

      app.get('/', async function helloworld () {
        return 'hello world'
      })

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/`
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [end, start] = spans

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
        'hook.callback.name': 'helloworld'
      })
      assert.equal(end.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(response.status, 200)
      assert.equal(await response.text(), 'hello world')
    })

    test('should end spans upon error', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get(
        '/',
        {
          errorHandler: function errorHandler (error, request, reply) {
            throw error
          }
        },
        async function helloworld () {
          throw new Error('error')
        }
      )

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
        'http.response.status_code': 500
      })
      assert.deepStrictEqual(end.attributes, {
        'hook.name': 'fastify -> @fastify/otel - route-handler',
        'fastify.type': 'request-handler',
        'http.route': '/',
        'hook.callback.name': 'helloworld'
      })
      assert.equal(end.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(response.status, 500)
      assert.deepStrictEqual(await response.json(), {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'error'
      })
    })

    test('should end spans upon error (with hook)', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get(
        '/',
        {
          onError: function decorated (_request, _reply, _error, done) {
            done()
          },
          errorHandler: function errorHandler (error, request, reply) {
            throw error
          }
        },
        async function helloworld () {
          throw new Error('error')
        }
      )

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/`
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [end, start, error] = spans

      assert.equal(spans.length, 3)
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'http.route': '/',
        'url.path': '/',
        'http.request.method': 'GET',
        'http.response.status_code': 500
      })
      assert.deepStrictEqual(error.attributes, {
        'fastify.type': 'route-hook',
        'hook.callback.name': 'decorated',
        'hook.name': 'fastify -> @fastify/otel - route -> onError',
        'http.route': '/',
      })
      assert.deepStrictEqual(end.attributes, {
        'hook.name': 'fastify -> @fastify/otel - route-handler',
        'fastify.type': 'request-handler',
        'http.route': '/',
        'hook.callback.name': 'helloworld'
      })
      assert.equal(end.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(response.status, 500)
      assert.deepStrictEqual(await response.json(), {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'error'
      })
    })

    test('should end spans upon error (with hook [array])', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      app.get(
        '/',
        {
          onError: [
            function decorated (_request, _reply, _error, done) {
              done()
            },
            function decorated2 (_request, _reply, _error, done) {
              done()
            }
          ],
          errorHandler: function errorHandler (error, request, reply) {
            throw error
          }
        },
        async function helloworld () {
          throw new Error('error')
        }
      )

      await app.listen()

      after(() => app.close())

      const response = await fetch(
        `http://localhost:${app.server.address().port}/`
      )

      const spans = memoryExporter
        .getFinishedSpans()
        .filter(span => span.instrumentationScope.name === '@fastify/otel')

      const [end, start, error2, error] = spans

      assert.equal(spans.length, 4)
      assert.deepStrictEqual(start.attributes, {
        'fastify.root': '@fastify/otel',
        'http.route': '/',
        'url.path': '/',
        'http.request.method': 'GET',
        'http.response.status_code': 500
      })
      assert.deepStrictEqual(error.attributes, {
        'fastify.type': 'route-hook',
        'hook.callback.name': 'decorated',
        'hook.name': 'fastify -> @fastify/otel - route -> onError',
        'http.route': '/'
      })
      assert.deepStrictEqual(error2.attributes, {
        'fastify.type': 'route-hook',
        'hook.callback.name': 'decorated2',
        'hook.name': 'fastify -> @fastify/otel - route -> onError',
        'http.route': '/'
      })
      assert.deepStrictEqual(end.attributes, {
        'hook.name': 'fastify -> @fastify/otel - route-handler',
        'fastify.type': 'request-handler',
        'http.route': '/',
        'hook.callback.name': 'helloworld'
      })
      assert.equal(end.parentSpanContext.spanId, start.spanContext().spanId)
      assert.equal(response.status, 500)
      assert.deepStrictEqual(await response.json(), {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'error'
      })
    })

    test('should return the Fastify instance from the patched `addHook`', async t => {
      const app = Fastify()
      const plugin = instrumentation.plugin()

      await app.register(plugin)

      const instance = app.addHook('onRequest', function onRequest () {})

      assert.equal(instance, app)
    })
  })

  describe('Encapulated Context', () => {
    describe('Instrumentation#disabled', () => {
      test('should not create spans if disabled', async t => {
        before(() => {
          contextManager.enable()
        })

        after(() => {
          contextManager.disable()
          spanProcessor.forceFlush()
          memoryExporter.reset()
          instrumentation.disable()
          httpInstrumentation.disable()
        })

        const app = Fastify()
        const plugin = instrumentation.plugin()

        await app.register(plugin)

        await app.register(function plugin (instance, _opts, done) {
          instance.get('/', async (request, reply) => 'hello world')
          done()
        })

        instrumentation.disable()

        const response = await app.inject({
          method: 'GET',
          url: '/'
        })

        const spans = memoryExporter
          .getFinishedSpans()
          .find(span => span.instrumentationScope.name === '@fastify/otel')

        assert.ok(spans == null)
        assert.equal(response.statusCode, 200)
        assert.equal(response.body, 'hello world')
      })
    })

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

      test('should create anonymous span (simple case)', async t => {
        const app = Fastify()
        const plugin = instrumentation.plugin()

        await app.register(plugin)

        await app.register(function plugin (instance, _opts, done) {
          instance.get('/', async (request, reply) => 'hello world')
          done()
        })

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
        assert.equal(end.name, 'handler - plugin')
        assert.deepStrictEqual(end.attributes, {
          'hook.name': 'plugin - route-handler',
          'fastify.type': 'request-handler',
          'http.route': '/',
          'hook.callback.name': 'anonymous'
        })
        assert.equal(response.status, 200)
        assert.equal(await response.text(), 'hello world')
      })

      test('should create named span (simple case)', async t => {
        const app = Fastify()
        const plugin = instrumentation.plugin()

        await app.register(async function nested (instance, _opts) {
          await instance.register(plugin)

          instance.get('/', async function helloworld () {
            return 'hello world'
          })
        })

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
        assert.equal(end.name, 'handler - helloworld')
        assert.deepStrictEqual(end.attributes, {
          'hook.name': 'nested -> @fastify/otel - route-handler',
          'fastify.type': 'request-handler',
          'http.route': '/',
          'hook.callback.name': 'helloworld'
        })
        assert.equal(end.parentSpanContext.spanId, start.spanContext().spanId)
        assert.equal(response.status, 200)
        assert.equal(await response.text(), 'hello world')
      })

      test('should create span for different hooks (patched)', async t => {
        const app = Fastify()
        const plugin = instrumentation.plugin()

        await app.register(plugin)

        await app.register(function nested (instance, _opts, done) {
          instance.get(
            '/',
            {
              onSend: function onSend (request, reply, payload, done) {
                done(null, payload)
              }
            },
            async function helloworld () {
              return 'hello world'
            }
          )

          instance.addHook('preValidation', function (request, reply, done) {
            done()
          })

          // Should not be patched
          instance.addHook('onReady', function (done) {
            done()
          })

          done()
        })

        await app.listen()

        after(() => app.close())

        const response = await fetch(
          `http://localhost:${app.server.address().port}/`
        )

        const spans = memoryExporter
          .getFinishedSpans()
          .filter(span => span.instrumentationScope.name === '@fastify/otel')

        const [preValidation, end, start, onReq1] = spans

        assert.equal(spans.length, 4)
        assert.deepStrictEqual(start.attributes, {
          'fastify.root': '@fastify/otel',
          'http.route': '/',
          'url.path': '/',
          'http.request.method': 'GET',
          'http.response.status_code': 200
        })
        assert.equal(onReq1.name, 'onSend - onSend')
        assert.deepStrictEqual(onReq1.attributes, {
          'fastify.type': 'route-hook',
          'hook.callback.name': 'onSend',
          'hook.name': 'nested - route -> onSend',
          'http.route': '/'
        })
        assert.equal(preValidation.name, 'preValidation - nested')
        assert.deepStrictEqual(preValidation.attributes, {
          'fastify.type': 'hook',
          'hook.callback.name': 'anonymous',
          'hook.name': 'nested - preValidation'
        })
        assert.equal(end.name, 'handler - helloworld')
        assert.deepStrictEqual(end.attributes, {
          'hook.name': 'nested - route-handler',
          'fastify.type': 'request-handler',
          'http.route': '/',
          'hook.callback.name': 'helloworld'
        })
        assert.equal(end.parentSpanContext.spanId, start.spanContext().spanId)
        assert.equal(response.status, 200)
        assert.equal(await response.text(), 'hello world')
      })

      test('should respect context (error scenario)', async t => {
        const app = Fastify()
        const plugin = instrumentation.plugin()

        await app.register(async function nested (instance, _opts) {
          await instance.register(plugin)
          instance.get('/', async function helloworld () {
            return 'hello world'
          })
        })

        // If registered under encapsulated context, hooks should be registered
        // under the encapsulated context
        app.addHook('preHandler', function (request, reply, done) {
          throw new Error('error')
        })

        await app.listen()

        after(() => app.close())

        const response = await fetch(
          `http://localhost:${app.server.address().port}/`
        )

        const spans = memoryExporter
          .getFinishedSpans()
          .filter(span => span.instrumentationScope.name === '@fastify/otel')

        const [start] = spans

        assert.equal(spans.length, 1)
        assert.deepStrictEqual(start.attributes, {
          'fastify.root': '@fastify/otel',
          'http.route': '/',
          'url.path': '/',
          'http.request.method': 'GET',
          'http.response.status_code': 500
        })
        assert.equal(response.status, 500)
      })

      test('#12 - should respect nested context', async t => {
        const app = Fastify()
        const plugin = instrumentation.plugin()

        await app.register(plugin)

        app.register(function nested (instance, _opts, done) {
          instance.get('/', async function helloworld () {
            return 'hello world'
          })

          instance.addHook('preValidation', function (request, reply, done) {
            done()
          })

          instance.register(
            function nested2 (nestedinstance2, _opts, done) {
              nestedinstance2.addHook(
                'preHandler',
                function (request, reply, done) {
                  // eslint-disable-next-line no-throw-literal
                  throw { statusCode: 500, message: 'error' }
                }
              )

              nestedinstance2.get('/', () => 'helloworld')

              done()
            },
            { prefix: '/nested2' }
          )

          // Should not be patched
          instance.addHook('onReady', function (done) {
            done()
          })

          done()
        })

        await app.listen()

        after(() => app.close())

        const response = await fetch(
          `http://localhost:${app.server.address().port}/`
        )
        const response2 = await fetch(
          `http://localhost:${app.server.address().port}/nested2`
        )

        const spans = memoryExporter
          .getFinishedSpans()
          .filter(span => span.instrumentationScope.name === '@fastify/otel')

        const [preValidation, start, end, preHandler2, end2, preValidation2] =
          spans

        assert.equal(spans.length, 6)
        assert.deepStrictEqual(preValidation.attributes, {
          'fastify.type': 'hook',
          'hook.callback.name': 'anonymous',
          'hook.name': 'nested - preValidation'
        })
        assert.deepStrictEqual(end.attributes, {
          'fastify.root': '@fastify/otel',
          'http.route': '/',
          'url.path': '/',
          'http.request.method': 'GET',
          'http.response.status_code': 200
        })
        assert.deepStrictEqual(start.attributes, {
          'hook.name': 'nested - route-handler',
          'fastify.type': 'request-handler',
          'http.route': '/',
          'hook.callback.name': 'helloworld'
        })
        assert.deepStrictEqual(preHandler2.attributes, {
          'hook.name': 'nested2 - preHandler',
          'fastify.type': 'hook',
          'hook.callback.name': 'anonymous'
        })
        assert.deepStrictEqual(end2.attributes, {
          'fastify.root': '@fastify/otel',
          'http.route': '/nested2',
          'url.path': '/nested2',
          'http.request.method': 'GET',
          'http.response.status_code': 500
        })
        assert.deepStrictEqual(preValidation2.attributes, {
          'hook.name': 'nested - preValidation',
          'fastify.type': 'hook',
          'hook.callback.name': 'anonymous'
        })

        assert.equal(start.parentSpanContext.spanId, end.spanContext().spanId)
        assert.equal(response.status, 200)
        assert.equal(await response.text(), 'hello world')
        assert.equal(response2.status, 500)
        assert.deepStrictEqual(await response2.json(), { message: 'error', statusCode: 500 })
      })

      test('should respect context (error scenario)', async t => {
        const app = Fastify()
        const plugin = instrumentation.plugin()

        await app.register(async function nested (instance, _opts) {
          await instance.register(plugin)
          instance.get('/', async function helloworld () {
            return 'hello world'
          })
        })

        // If registered under encapsulated context, hooks should be registered
        // under the encapsulated context
        app.addHook('preHandler', function (request, reply, done) {
          throw new Error('error')
        })

        await app.listen()

        after(() => app.close())

        const response = await fetch(
          `http://localhost:${app.server.address().port}/`
        )

        const spans = memoryExporter
          .getFinishedSpans()
          .filter(span => span.instrumentationScope.name === '@fastify/otel')

        const [start] = spans

        assert.equal(spans.length, 1)
        assert.deepStrictEqual(start.attributes, {
          'fastify.root': '@fastify/otel',
          'http.route': '/',
          'url.path': '/',
          'http.request.method': 'GET',
          'http.response.status_code': 500
        })
        assert.equal(response.status, 500)
      })
    })
  })
})
