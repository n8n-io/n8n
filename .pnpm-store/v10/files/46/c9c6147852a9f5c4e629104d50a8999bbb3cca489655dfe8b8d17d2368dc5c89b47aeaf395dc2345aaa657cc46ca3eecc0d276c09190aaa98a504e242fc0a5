'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert')
const Fastify = require(process.env.FASTIFY_VERSION || 'fastify')

const { InstrumentationBase } = require('@opentelemetry/instrumentation')
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node')
const { InMemorySpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base')

const FastifyInstrumentation = require('..')
const { FastifyOtelInstrumentation } = require('..')

describe('Interface', () => {
  test('should exports support', t => {
    assert.equal(FastifyInstrumentation.name, 'FastifyOtelInstrumentation')
    assert.equal(
      FastifyOtelInstrumentation.name,
      'FastifyOtelInstrumentation'
    )
    assert.equal(
      FastifyInstrumentation.FastifyOtelInstrumentation.name,
      'FastifyOtelInstrumentation'
    )
    assert.strictEqual(
      Object.getPrototypeOf(FastifyInstrumentation),
      InstrumentationBase
    )
  })

  test('FastifyInstrumentation#plugin should return a valid Fastify Plugin', async t => {
    const app = Fastify()
    const instrumentation = new FastifyInstrumentation()
    const plugin = instrumentation.plugin()

    assert.equal(typeof plugin, 'function')
    assert.equal(plugin.length, 3)

    app.register(plugin)

    await app.ready()
  })

  test('FastifyOtelInstrumentationOpts#ignorePaths - should be a valid string or function', async t => {
    assert.throws(() => new FastifyInstrumentation({ ignorePaths: 123 }))
    assert.throws(() => new FastifyInstrumentation({ ignorePaths: '' }))
    assert.throws(() => new FastifyInstrumentation({ ignorePaths: {} }))
    assert.doesNotThrow(() => new FastifyInstrumentation({ ignorePaths: () => true }))
    assert.doesNotThrow(() => new FastifyInstrumentation({ ignorePaths: '/foo' }))
  })

  test('FastifyOtelInstrumentationOpts#recordExceptions - should be a boolean when provided', async t => {
    assert.throws(() => new FastifyInstrumentation({ recordExceptions: 'nope' }), /boolean/)
    assert.doesNotThrow(() => new FastifyInstrumentation({ recordExceptions: true }))
    assert.doesNotThrow(() => new FastifyInstrumentation({ recordExceptions: false }))
  })

  test('NamedFastifyInstrumentation#plugin should return a valid Fastify Plugin', async t => {
    const app = Fastify()
    const instrumentation = new FastifyOtelInstrumentation()
    const plugin = instrumentation.plugin()

    assert.equal(typeof plugin, 'function')
    assert.equal(plugin.length, 3)

    app.register(plugin)

    await app.ready()
  })

  test('FastifyInstrumentation#plugin should expose the right set of APIs', async () => {
    /** @type {import('fastify').FastifyInstance} */
    const app = Fastify()
    const instrumentation = new FastifyInstrumentation()
    const plugin = instrumentation.plugin()

    await app.register(plugin)

    app.get('/', (request, reply) => {
      const otel = request.opentelemetry()

      assert.equal(otel.enabled, true)
      assert.equal(typeof otel.span.spanContext().spanId, 'string')
      assert.equal(typeof otel.tracer, 'object')
      assert.equal(typeof otel.context, 'object')
      assert.equal(typeof otel.inject, 'function')
      assert.equal(otel.inject.length, 2)
      assert.ok(!otel.inject({}))
      assert.equal(typeof otel.extract, 'function')
      assert.equal(otel.extract.length, 2)
      assert.equal(typeof (otel.extract({})), 'object')

      return 'world'
    })

    const res = await app.inject({
      method: 'GET',
      url: '/'
    })
    assert.equal(res.payload, 'world')
  })

  test('FastifyRequest#opentelemetry() returns FastifyDisabledOtelRequestContext when disabled for a request', async () => {
    /** @type {import('fastify').FastifyInstance} */
    const app = Fastify()
    const instrumentation = new FastifyInstrumentation()
    const plugin = instrumentation.plugin()

    await app.register(plugin)

    app.get('/', { config: { otel: false } }, (request) => {
      const otel = request.opentelemetry()

      assert.equal(otel.enabled, false)
      assert.equal(otel.span, null)
      assert.equal(typeof otel.tracer, 'object')
      assert.equal(otel.context, null)
      assert.equal(typeof otel.inject, 'function')
      assert.equal(otel.inject.length, 2)
      assert.ok(!otel.inject({}))
      assert.equal(typeof otel.extract, 'function')
      assert.equal(otel.extract.length, 2)
      assert.equal(typeof (otel.extract({})), 'object')

      return 'world'
    })

    app.get('/withOtel', { config: { otel: true } }, (request) => {
      const otel = request.opentelemetry()

      assert.equal(otel.enabled, true)
      assert.equal(typeof otel.span.spanContext().spanId, 'string')
      assert.equal(typeof otel.tracer, 'object')
      assert.equal(typeof otel.context, 'object')
      assert.equal(typeof otel.inject, 'function')
      assert.equal(otel.inject.length, 2)
      assert.ok(!otel.inject({}))
      assert.equal(typeof otel.extract, 'function')
      assert.equal(otel.extract.length, 2)
      assert.equal(typeof (otel.extract({})), 'object')

      return 'world'
    })

    app.get('/withOnRequest', { config: { otel: false }, async onRequest (req) { req.fakeData = 123 } }, (request) => {
      const otel = request.opentelemetry()

      assert.equal(request.fakeData, 123)
      assert.equal(otel.enabled, false)
      assert.equal(otel.span, null)
      assert.equal(typeof otel.tracer, 'object')
      assert.equal(otel.context, null)
      assert.equal(typeof otel.inject, 'function')
      assert.equal(otel.inject.length, 2)
      assert.ok(!otel.inject({}))
      assert.equal(typeof otel.extract, 'function')
      assert.equal(otel.extract.length, 2)
      assert.equal(typeof (otel.extract({})), 'object')

      return 'world'
    })

    app.get(
      '/withManyOnRequest',
      {
        config: { otel: false },
        onRequest: [
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
      async function helloworld (request) {
        const otel = request.opentelemetry()

        assert.equal(otel.enabled, false)
        assert.equal(otel.span, null)
        assert.equal(typeof otel.tracer, 'object')
        assert.equal(otel.context, null)
        assert.equal(typeof otel.inject, 'function')
        assert.equal(otel.inject.length, 2)
        assert.ok(!otel.inject({}))
        assert.equal(typeof otel.extract, 'function')
        assert.equal(otel.extract.length, 2)
        assert.equal(typeof (otel.extract({})), 'object')

        return 'world'
      }
    )

    const res1 = await app.inject({
      method: 'GET',
      url: '/'
    })
    assert.equal(res1.statusCode, 200)
    assert.equal(res1.payload, 'world')

    const res2 = await app.inject({
      method: 'GET',
      url: '/withOtel'
    })
    assert.equal(res2.statusCode, 200)
    assert.equal(res2.payload, 'world')

    const res3 = await app.inject({
      method: 'GET',
      url: '/withOnRequest'
    })
    assert.equal(res3.statusCode, 200)
    assert.equal(res3.payload, 'world')
  })

  test('FastifyInstrumentation#requestHook should be invoked and can mutate span', async () => {
    /** @type {import('fastify').FastifyInstance} */
    const app = Fastify()

    let hookCalled = false
    const exporter = new InMemorySpanExporter()
    const provider = new NodeTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)]
    })
    provider.register()

    const instrumentation = new FastifyInstrumentation({
      requestHook: (span, request) => {
        hookCalled = true
        span.setAttribute('x-user', request.headers['x-user'] ?? 'anon')
      }
    })
    instrumentation.setTracerProvider(provider)

    await app.register(instrumentation.plugin())

    app.get('/', () => 'ok')

    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-user': 'baki' },
    })

    assert.equal(res.statusCode, 200)
    assert.equal(res.payload, 'ok')
    assert.equal(hookCalled, true)

    const spans = exporter.getFinishedSpans()
    assert.equal(spans.length, 2)

    const rootSpan = spans.find(s => s.name === 'request')
    assert.ok(rootSpan)
    assert.equal(rootSpan.attributes['x-user'], 'baki')
  })

  test('FastifyInstrumentation#requestHook should not crash when it throws', async () => {
    /** @type {import('fastify').FastifyInstance} */
    const app = Fastify()

    const instrumentation = new FastifyInstrumentation({
      requestHook: () => {
        throw new Error('test')
      }
    })

    await app.register(instrumentation.plugin())

    app.get('/', () => 'ok')

    const res = await app.inject({
      method: 'GET',
      url: '/'
    })

    assert.equal(res.statusCode, 200)
    assert.equal(res.payload, 'ok')
  })

  test('FastifyInstrumentation#lifecycleHook should be invoked for every hook span', async () => {
    const app = Fastify()

    const calls = []
    const exporter = new InMemorySpanExporter()
    const provider = new NodeTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)]
    })
    provider.register()

    const instrumentation = new FastifyInstrumentation({
      lifecycleHook: (span, info) => {
        calls.push({ hookName: info.hookName, handler: info.handler })
        span.updateName(`custom:${info.hookName}`)
        span.setAttribute('hook.handler', info.handler ?? 'unknown')
        span.addEvent('customized')
      }
    })
    instrumentation.setTracerProvider(provider)

    await app.register(instrumentation.plugin())

    app.get('/', {
      preHandler: function guard (request, reply, done) {
        done()
      }
    }, function routeHandler () {
      return 'ok'
    })

    const res = await app.inject({
      method: 'GET',
      url: '/'
    })

    assert.equal(res.statusCode, 200)
    assert.equal(res.payload, 'ok')
    assert.deepStrictEqual(calls.map(call => call.hookName), ['preHandler', 'handler'])
    assert.deepStrictEqual(calls.map(call => call.handler), ['guard', 'routeHandler'])

    const hookSpans = exporter.getFinishedSpans().filter(span => span.name.startsWith('custom:'))
    assert.equal(hookSpans.length, 2)
    assert.ok(hookSpans.every(span => span.attributes['hook.handler'] != null))
  })

  test('FastifyInstrumentation#lifecycleHook should not crash when it throws', async () => {
    const app = Fastify()

    const instrumentation = new FastifyInstrumentation({
      lifecycleHook: () => {
        throw new Error('boom')
      }
    })

    await app.register(instrumentation.plugin())

    app.get('/', () => 'ok')

    const res = await app.inject({
      method: 'GET',
      url: '/'
    })

    assert.equal(res.statusCode, 200)
    assert.equal(res.payload, 'ok')
  })

  test('FastifyInstrumentationOptions#recordExceptions defaults to true', async () => {
    const exporter = new InMemorySpanExporter()
    const provider = new NodeTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)]
    })
    provider.register()

    const instrumentation = new FastifyInstrumentation()
    instrumentation.setTracerProvider(provider)

    /** @type {import('fastify').FastifyInstance} */
    const app = Fastify()
    await app.register(instrumentation.plugin())

    app.get('/', async function badRequest () {
      const error = new Error('book not found')
      error.statusCode = 404
      throw error
    })

    const res = await app.inject({
      method: 'GET',
      url: '/'
    })

    assert.equal(res.statusCode, 404)

    const spans = exporter.getFinishedSpans()
    const handlerSpan = spans.find((span) => span.name.startsWith('handler'))

    assert.ok(handlerSpan)
    assert.equal(handlerSpan.events.length, 1)
    assert.equal(handlerSpan.events[0].name, 'exception')

    await app.close()
    instrumentation.disable()
  })

  test('FastifyInstrumentationOptions#recordExceptions can be disabled', async () => {
    const exporter = new InMemorySpanExporter()
    const provider = new NodeTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)]
    })
    provider.register()

    const instrumentation = new FastifyInstrumentation({
      recordExceptions: false
    })
    instrumentation.setTracerProvider(provider)

    /** @type {import('fastify').FastifyInstance} */
    const app = Fastify()
    await app.register(instrumentation.plugin())

    app.get('/', async function badRequest () {
      const error = new Error('book not found')
      error.statusCode = 404
      throw error
    })

    const res = await app.inject({
      method: 'GET',
      url: '/'
    })

    assert.equal(res.statusCode, 404)

    const spans = exporter.getFinishedSpans()
    const handlerSpan = spans.find((span) => span.name.startsWith('handler'))

    assert.ok(handlerSpan)
    assert.equal(handlerSpan.events.length, 0)

    await app.close()
    instrumentation.disable()
  })
})
