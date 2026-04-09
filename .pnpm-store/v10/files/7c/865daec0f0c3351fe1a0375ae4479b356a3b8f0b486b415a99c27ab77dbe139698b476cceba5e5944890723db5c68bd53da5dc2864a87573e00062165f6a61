/// <reference types="node" />

import { InstrumentationBase, type InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation'
import type { FastifyPluginCallback } from 'fastify'

import type {
  FastifyOtelInstrumentationOpts,
  FastifyOtelLifecycleHookInfo,
  FastifyOtelOptions,
  FastifyOtelRequestContext
} from './types'

declare module 'fastify' {
  interface FastifyRequest {
    opentelemetry(): FastifyOtelRequestContext
  }

  interface FastifyContextConfig {
    /** Set this to `false` to disable OpenTelemetry for the route */
    otel?: boolean
  }
}

declare class FastifyOtelInstrumentation<Config extends FastifyOtelInstrumentationOpts = FastifyOtelInstrumentationOpts> extends InstrumentationBase<Config> {
  constructor (config?: FastifyOtelInstrumentationOpts)
  init (): InstrumentationNodeModuleDefinition[]
  plugin (): FastifyPluginCallback<FastifyOtelOptions>
}

declare namespace exported {
  export type { FastifyOtelInstrumentationOpts, FastifyOtelLifecycleHookInfo }
  export { FastifyOtelInstrumentation }
  export { FastifyOtelInstrumentation as default }
}

export = exported
