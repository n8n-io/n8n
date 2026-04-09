import { expectAssignable } from 'tsd'
import { InstrumentationBase, InstrumentationConfig } from '@opentelemetry/instrumentation'
import { Context, Span, TextMapGetter, TextMapSetter, Tracer } from '@opentelemetry/api'
import { fastify as Fastify, FastifyInstance, FastifyPluginCallback, FastifyRequest } from 'fastify'

import FastifyInstrumentation, { FastifyOtelInstrumentation } from '.'
import { FastifyOtelInstrumentationOpts } from './types'

expectAssignable<InstrumentationBase>(new FastifyOtelInstrumentation())
expectAssignable<InstrumentationBase>(new FastifyInstrumentation())
expectAssignable<InstrumentationConfig>({
  enabled: true,
  requestHook (span, request) {
    expectAssignable<Span>(span)
    expectAssignable<FastifyRequest>(request)
  },
  lifecycleHook (span, info) {
    expectAssignable<Span>(span)
    expectAssignable<string>(info.hookName)
    expectAssignable<FastifyRequest>(info.request)
    expectAssignable<string | undefined>(info.handler)
  },
  recordExceptions: false
} as FastifyOtelInstrumentationOpts)
expectAssignable<InstrumentationConfig>({} as FastifyOtelInstrumentationOpts)

const app = Fastify()
const plugin = new FastifyOtelInstrumentation().plugin()

expectAssignable<FastifyInstance>(app)
expectAssignable<FastifyPluginCallback>(plugin)
expectAssignable<FastifyInstance>(app.register(plugin))
expectAssignable<FastifyInstance>(app.register(plugin).register(plugin))

app.register(new FastifyOtelInstrumentation().plugin())
app.register((nested, _opts, done) => {
  nested.register(new FastifyOtelInstrumentation().plugin())
  done()
})

app.get('/', async function (request, reply) {
  const otel = request.opentelemetry()

  expectAssignable<(carrier: any, setter?: TextMapSetter) => void>(otel.inject)
  expectAssignable<(carrier: any, getter?: TextMapGetter) => Context>(otel.extract)
  expectAssignable<Tracer>(otel.tracer)

  if (otel.enabled) {
    expectAssignable<Span>(otel.span)
    expectAssignable<Context>(otel.context)
  } else {
    expectAssignable<null>(otel.span)
    expectAssignable<null>(otel.context)
  }
})

// Test that otel field in FastifyContextConfig is optional
app.get('/with-config', { config: { } }, async function (_request, _reply) {
  return { hello: 'world' }
})

app.get('/with-otel-true', { config: { otel: true } }, async function (_request, _reply) {
  return { hello: 'world' }
})

app.get('/with-otel-false', { config: { otel: false } }, async function (_request, _reply) {
  return { hello: 'world' }
})

app.get('/with-other-config', { config: { customField: 'value' } }, async function (_request, _reply) {
  return { hello: 'world' }
})
