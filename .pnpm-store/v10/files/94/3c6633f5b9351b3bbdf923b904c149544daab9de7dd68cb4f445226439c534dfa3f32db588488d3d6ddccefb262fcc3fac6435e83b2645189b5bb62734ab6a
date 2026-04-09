import { expectAssignable } from 'tsd'
import { InstrumentationBase, InstrumentationConfig } from '@opentelemetry/instrumentation'
import { fastify as Fastify } from 'fastify'

import { FastifyOtelInstrumentation } from '.'
import { FastifyOtelInstrumentationOpts } from './types'

expectAssignable<InstrumentationBase>(new FastifyOtelInstrumentation())
expectAssignable<InstrumentationConfig>({ enabled: true } as FastifyOtelInstrumentationOpts)
expectAssignable<InstrumentationConfig>({} as FastifyOtelInstrumentationOpts)

const app = Fastify()
app.register(new FastifyOtelInstrumentation().plugin())
app.register((nested, _opts, done) => {
  nested.register(new FastifyOtelInstrumentation().plugin())
  done()
})
