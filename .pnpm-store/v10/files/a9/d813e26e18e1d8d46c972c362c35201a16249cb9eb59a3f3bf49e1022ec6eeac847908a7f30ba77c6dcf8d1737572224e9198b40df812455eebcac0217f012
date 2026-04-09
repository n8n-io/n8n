'use strict'
const dc = require('node:diagnostics_channel')
const { context, trace, SpanStatusCode, propagation, diag } = require('@opentelemetry/api')
const { getRPCMetadata, RPCType } = require('@opentelemetry/core')
const {
  ATTR_HTTP_ROUTE,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_URL_PATH
} = require('@opentelemetry/semantic-conventions')
const { InstrumentationBase } = require('@opentelemetry/instrumentation')

const {
  version: PACKAGE_VERSION,
  name: PACKAGE_NAME
} = require('./package.json')

// Constants
const SUPPORTED_VERSIONS = '>=4.0.0 <6'
const FASTIFY_HOOKS = [
  'onRequest',
  'preParsing',
  'preValidation',
  'preHandler',
  'preSerialization',
  'onSend',
  'onResponse',
  'onError'
]
const ATTRIBUTE_NAMES = {
  HOOK_NAME: 'hook.name',
  FASTIFY_TYPE: 'fastify.type',
  HOOK_CALLBACK_NAME: 'hook.callback.name',
  ROOT: 'fastify.root'
}
const HOOK_TYPES = {
  ROUTE: 'route-hook',
  INSTANCE: 'hook',
  HANDLER: 'request-handler'
}
const ANONYMOUS_FUNCTION_NAME = 'anonymous'

// Symbols
const kInstrumentation = Symbol('fastify otel instance')
const kRequestSpan = Symbol('fastify otel request spans')
const kRequestContext = Symbol('fastify otel request context')
const kAddHookOriginal = Symbol('fastify otel addhook original')
const kSetNotFoundOriginal = Symbol('fastify otel setnotfound original')
const kIgnorePaths = Symbol('fastify otel ignore path')
const kRecordExceptions = Symbol('fastify otel record exceptions')

class FastifyOtelInstrumentation extends InstrumentationBase {
  logger = null
  _requestHook = null
  _lifecycleHook = null

  constructor (config) {
    super(PACKAGE_NAME, PACKAGE_VERSION, config)
    this.logger = diag.createComponentLogger({ namespace: PACKAGE_NAME })
    this[kIgnorePaths] = null
    this[kRecordExceptions] = true

    if (config?.recordExceptions != null) {
      if (typeof config.recordExceptions !== 'boolean') {
        throw new TypeError('recordExceptions must be a boolean')
      }

      this[kRecordExceptions] = config.recordExceptions
    }
    if (typeof config?.requestHook === 'function') {
      this._requestHook = config.requestHook
    }
    if (typeof config?.lifecycleHook === 'function') {
      this._lifecycleHook = config.lifecycleHook
    }

    if (config?.ignorePaths != null || process.env.OTEL_FASTIFY_IGNORE_PATHS != null) {
      const ignorePaths = config?.ignorePaths ?? process.env.OTEL_FASTIFY_IGNORE_PATHS

      if ((typeof ignorePaths !== 'string' || ignorePaths.length === 0) && typeof ignorePaths !== 'function') {
        throw new TypeError(
          'ignorePaths must be a string or a function'
        )
      }

      let globMatcher = null

      this[kIgnorePaths] = (routeOptions) => {
        if (typeof ignorePaths === 'function') {
          return ignorePaths(routeOptions)
        } else {
          // Using minimatch to match the path until path.matchesGlob is out of experimental
          // path.matchesGlob uses minimatch internally
          if (globMatcher == null) {
            globMatcher = require('minimatch').minimatch
          }

          return globMatcher(routeOptions.url, ignorePaths)
        }
      }
    }
  }

  enable () {
    if (this._handleInitialization === undefined && this.getConfig().registerOnInitialization) {
      this._handleInitialization = (message) => {
        // Cannot use `fastify.register(plugin)` because it is lazily executed and
        // thus requires user code to await fastify instance first.
        this.plugin()(message.fastify, undefined, () => {})

        // Add an empty plugin to keep `app.hasPlugin('@fastify/otel')` invariant
        const emptyPlugin = (_, __, done) => {
          done()
        }
        emptyPlugin[Symbol.for('skip-override')] = true
        emptyPlugin[Symbol.for('fastify.display-name')] = '@fastify/otel'
        message.fastify.register(emptyPlugin)
      }
      dc.subscribe('fastify.initialization', this._handleInitialization)
    }
    return super.enable()
  }

  disable () {
    if (this._handleInitialization) {
      dc.unsubscribe('fastify.initialization', this._handleInitialization)
      this._handleInitialization = undefined
    }
    return super.disable()
  }

  // We do not do patching in this instrumentation
  init () {
    return []
  }

  plugin () {
    const instrumentation = this

    FastifyInstrumentationPlugin[Symbol.for('skip-override')] = true
    FastifyInstrumentationPlugin[Symbol.for('fastify.display-name')] = '@fastify/otel'
    FastifyInstrumentationPlugin[Symbol.for('plugin-meta')] = {
      fastify: SUPPORTED_VERSIONS,
      name: '@fastify/otel',
    }

    return FastifyInstrumentationPlugin

    function FastifyInstrumentationPlugin (instance, opts, done) {
      instance.decorate(kInstrumentation, instrumentation)
      // addHook and notfoundHandler are essentially inherited from the prototype
      // what is important is to bound it to the right instance
      instance.decorate(kAddHookOriginal, instance.addHook)
      instance.decorate(kSetNotFoundOriginal, instance.setNotFoundHandler)
      instance.decorateRequest('opentelemetry', function openetelemetry () {
        const ctx = this[kRequestContext]
        const span = this[kRequestSpan]

        return {
          enabled: this.routeOptions.config?.otel !== false,
          span,
          tracer: instrumentation.tracer,
          context: ctx,
          inject: (carrier, setter) => {
            return propagation.inject(ctx, carrier, setter)
          },
          extract: (carrier, getter) => {
            return propagation.extract(ctx, carrier, getter)
          }
        }
      })
      instance.decorateRequest(kRequestSpan, null)
      instance.decorateRequest(kRequestContext, null)

      instance.addHook('onRoute', function otelWireRoute (routeOptions) {
        if (instrumentation[kIgnorePaths]?.(routeOptions) === true) {
          instrumentation.logger.debug(
            `Ignoring route instrumentation ${routeOptions.method} ${routeOptions.url} because it matches the ignore path`
          )
          return
        }

        if (routeOptions.config?.otel === false) {
          instrumentation.logger.debug(
            `Ignoring route instrumentation ${routeOptions.method} ${routeOptions.url} because it is disabled`
          )

          return
        }

        for (const hook of FASTIFY_HOOKS) {
          if (routeOptions[hook] != null) {
            const handlerLike = routeOptions[hook]

            if (typeof handlerLike === 'function') {
              routeOptions[hook] = handlerWrapper(handlerLike, hook, {
                [ATTRIBUTE_NAMES.HOOK_NAME]: `${this.pluginName} - route -> ${hook}`,
                [ATTRIBUTE_NAMES.FASTIFY_TYPE]: HOOK_TYPES.ROUTE,
                [ATTR_HTTP_ROUTE]: routeOptions.url,
                [ATTRIBUTE_NAMES.HOOK_CALLBACK_NAME]:
                  handlerLike.name?.length > 0
                    ? handlerLike.name
                    : ANONYMOUS_FUNCTION_NAME /* c8 ignore next */
              })
            } else if (Array.isArray(handlerLike)) {
              const wrappedHandlers = []

              for (const handler of handlerLike) {
                wrappedHandlers.push(
                  handlerWrapper(handler, hook, {
                    [ATTRIBUTE_NAMES.HOOK_NAME]: `${this.pluginName} - route -> ${hook}`,
                    [ATTRIBUTE_NAMES.FASTIFY_TYPE]: HOOK_TYPES.ROUTE,
                    [ATTR_HTTP_ROUTE]: routeOptions.url,
                    [ATTRIBUTE_NAMES.HOOK_CALLBACK_NAME]:
                      handler.name?.length > 0
                        ? handler.name
                        : ANONYMOUS_FUNCTION_NAME
                  })
                )
              }

              routeOptions[hook] = wrappedHandlers
            }
          }
        }

        // We always want to add the onSend hook to the route to be executed last
        if (routeOptions.onSend != null) {
          routeOptions.onSend = Array.isArray(routeOptions.onSend)
            ? [...routeOptions.onSend, finalizeResponseSpanHook]
            : [routeOptions.onSend, finalizeResponseSpanHook]
        } else {
          routeOptions.onSend = finalizeResponseSpanHook
        }

        // We always want to add the onError hook to the route to be executed last
        if (routeOptions.onError != null) {
          routeOptions.onError = Array.isArray(routeOptions.onError)
            ? [...routeOptions.onError, recordErrorInSpanHook]
            : [routeOptions.onError, recordErrorInSpanHook]
        } else {
          routeOptions.onError = recordErrorInSpanHook
        }

        routeOptions.handler = handlerWrapper(routeOptions.handler, 'handler', {
          [ATTRIBUTE_NAMES.HOOK_NAME]: `${this.pluginName} - route-handler`,
          [ATTRIBUTE_NAMES.FASTIFY_TYPE]: HOOK_TYPES.HANDLER,
          [ATTR_HTTP_ROUTE]: routeOptions.url,
          [ATTRIBUTE_NAMES.HOOK_CALLBACK_NAME]:
            routeOptions.handler.name.length > 0
              ? routeOptions.handler.name
              : ANONYMOUS_FUNCTION_NAME
        })
      })

      instance.addHook('onRequest', function startRequestSpanHook (request, _reply, hookDone) {
        if (
          this[kInstrumentation].isEnabled() === false ||
          request.routeOptions.config?.otel === false
        ) {
          return hookDone()
        }

        if (this[kInstrumentation][kIgnorePaths]?.({
          url: request.url,
          method: request.method,
        }) === true) {
          this[kInstrumentation].logger.debug(
            `Ignoring request ${request.method} ${request.url} because it matches the ignore path`
          )
          return hookDone()
        }

        let ctx = context.active()

        if (trace.getSpan(ctx) == null) {
          ctx = propagation.extract(ctx, request.headers)
        }

        const rpcMetadata = getRPCMetadata(ctx)

        if (
          request.routeOptions.url != null &&
          rpcMetadata?.type === RPCType.HTTP
        ) {
          rpcMetadata.route = request.routeOptions.url
        }

        const attributes = {
          [ATTRIBUTE_NAMES.ROOT]: '@fastify/otel',
          [ATTR_HTTP_REQUEST_METHOD]: request.method,
          [ATTR_URL_PATH]: request.url
        }

        if (request.routeOptions.url != null) {
          attributes[ATTR_HTTP_ROUTE] = request.routeOptions.url
        }

        /** @type {import('@opentelemetry/api').Span} */
        const span = this[kInstrumentation].tracer.startSpan('request', {
          attributes
        }, ctx)

        try {
          this[kInstrumentation]._requestHook?.(span, request)
        } catch (err) {
          this[kInstrumentation].logger.error({ err }, 'requestHook threw')
        }

        request[kRequestContext] = trace.setSpan(ctx, span)
        request[kRequestSpan] = span

        context.with(request[kRequestContext], () => {
          hookDone()
        })
      })

      // onResponse is the last hook to be executed, only added for 404 handlers
      instance.addHook('onResponse', function finalizeNotFoundSpanHook (request, reply, hookDone) {
        const span = request[kRequestSpan]

        if (span != null) {
          span.setStatus({
            code: SpanStatusCode.OK,
            message: 'OK'
          })
          span.setAttributes({
            [ATTR_HTTP_RESPONSE_STATUS_CODE]: 404
          })
          span.end()
        }

        request[kRequestSpan] = null

        hookDone()
      })

      instance.addHook = addHookPatched
      instance.setNotFoundHandler = setNotFoundHandlerPatched

      done()

      function finalizeResponseSpanHook (request, reply, payload, hookDone) {
        /** @type {import('@opentelemetry/api').Span} */
        const span = request[kRequestSpan]

        if (span != null) {
          if (reply.statusCode < 500) {
            span.setStatus({
              code: SpanStatusCode.OK,
              message: 'OK'
            })
          }

          span.setAttributes({
            [ATTR_HTTP_RESPONSE_STATUS_CODE]: reply.statusCode
          })
          span.end()
        }

        request[kRequestSpan] = null

        hookDone(null, payload)
      }

      function recordErrorInSpanHook (request, reply, error, hookDone) {
        /** @type {Span} */
        const span = request[kRequestSpan]

        if (span != null) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          })
          if (instrumentation[kRecordExceptions] !== false) {
            span.recordException(error)
          }
        }

        hookDone()
      }

      function addHookPatched (name, hook) {
        const addHookOriginal = this[kAddHookOriginal]

        if (FASTIFY_HOOKS.includes(name)) {
          return addHookOriginal.call(
            this,
            name,
            handlerWrapper(hook, name, {
              [ATTRIBUTE_NAMES.HOOK_NAME]: `${this.pluginName} - ${name}`,
              [ATTRIBUTE_NAMES.FASTIFY_TYPE]: HOOK_TYPES.INSTANCE,
              [ATTRIBUTE_NAMES.HOOK_CALLBACK_NAME]:
                hook.name?.length > 0
                  ? hook.name
                  : ANONYMOUS_FUNCTION_NAME /* c8 ignore next */
            })
          )
        } else {
          return addHookOriginal.call(this, name, hook)
        }
      }

      function setNotFoundHandlerPatched (hooks, handler) {
        const setNotFoundHandlerOriginal = this[kSetNotFoundOriginal]
        if (typeof hooks === 'function') {
          handler = handlerWrapper(hooks, 'notFoundHandler', {
            [ATTRIBUTE_NAMES.HOOK_NAME]: `${this.pluginName} - not-found-handler`,
            [ATTRIBUTE_NAMES.FASTIFY_TYPE]: HOOK_TYPES.INSTANCE,
            [ATTRIBUTE_NAMES.HOOK_CALLBACK_NAME]:
              hooks.name?.length > 0
                ? hooks.name
                : ANONYMOUS_FUNCTION_NAME /* c8 ignore next */
          })
          setNotFoundHandlerOriginal.call(this, handler)
        } else {
          if (hooks.preValidation != null) {
            hooks.preValidation = handlerWrapper(hooks.preValidation, 'notFoundHandler - preValidation', {
              [ATTRIBUTE_NAMES.HOOK_NAME]: `${this.pluginName} - not-found-handler - preValidation`,
              [ATTRIBUTE_NAMES.FASTIFY_TYPE]: HOOK_TYPES.INSTANCE,
              [ATTRIBUTE_NAMES.HOOK_CALLBACK_NAME]:
                hooks.preValidation.name?.length > 0
                  ? hooks.preValidation.name
                  : ANONYMOUS_FUNCTION_NAME /* c8 ignore next */
            })
          }

          if (hooks.preHandler != null) {
            hooks.preHandler = handlerWrapper(hooks.preHandler, 'notFoundHandler - preHandler', {
              [ATTRIBUTE_NAMES.HOOK_NAME]: `${this.pluginName} - not-found-handler - preHandler`,
              [ATTRIBUTE_NAMES.FASTIFY_TYPE]: HOOK_TYPES.INSTANCE,
              [ATTRIBUTE_NAMES.HOOK_CALLBACK_NAME]:
                hooks.preHandler.name?.length > 0
                  ? hooks.preHandler.name
                  : ANONYMOUS_FUNCTION_NAME /* c8 ignore next */
            })
          }

          handler = handlerWrapper(handler, 'notFoundHandler', {
            [ATTRIBUTE_NAMES.HOOK_NAME]: `${this.pluginName} - not-found-handler`,
            [ATTRIBUTE_NAMES.FASTIFY_TYPE]: HOOK_TYPES.INSTANCE,
            [ATTRIBUTE_NAMES.HOOK_CALLBACK_NAME]:
              handler.name?.length > 0
                ? handler.name
                : ANONYMOUS_FUNCTION_NAME /* c8 ignore next */
          })
          setNotFoundHandlerOriginal.call(this, hooks, handler)
        }
      }

      function handlerWrapper (handler, hookName, spanAttributes = {}) {
        return function handlerWrapped (...args) {
          /** @type {FastifyOtelInstrumentation} */
          const instrumentation = this[kInstrumentation]
          const [request] = args

          if (instrumentation.isEnabled() === false || request.routeOptions.config?.otel === false) {
            instrumentation.logger.debug(
              `Ignoring route instrumentation ${request.routeOptions.method} ${request.routeOptions.url} because it is disabled`
            )
            return handler.call(this, ...args)
          }

          if (instrumentation[kIgnorePaths]?.({
            url: request.url,
            method: request.method,
          }) === true) {
            instrumentation.logger.debug(
              `Ignoring route instrumentation ${request.routeOptions.method} ${request.routeOptions.url} because it matches the ignore path`
            )
            return handler.call(this, ...args)
          }

          /* c8 ignore next */
          const ctx = request[kRequestContext] ?? context.active()
          const handlerName = handler.name?.length > 0
            ? handler.name
            : this.pluginName /* c8 ignore next */ ?? ANONYMOUS_FUNCTION_NAME /* c8 ignore next */

          const span = instrumentation.tracer.startSpan(
            `${hookName} - ${handlerName}`,
            {
              attributes: spanAttributes
            },
            ctx
          )

          if (instrumentation._lifecycleHook != null) {
            try {
              instrumentation._lifecycleHook(span, {
                hookName,
                request,
                handler: handlerName
              })
            } catch (err) {
              instrumentation.logger.error({ err }, 'Execution of lifecycleHook failed')
            }
          }

          return context.with(
            trace.setSpan(ctx, span),
            function () {
              try {
                const res = handler.call(this, ...args)

                if (typeof res?.then === 'function') {
                  return res.then(
                    result => {
                      span.end()
                      return result
                    },
                    error => {
                      span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: error.message
                      })
                      if (instrumentation[kRecordExceptions] !== false) {
                        span.recordException(error)
                      }
                      span.end()
                      return Promise.reject(error)
                    }
                  )
                }

                span.end()
                return res
              } catch (error) {
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: error.message
                })
                if (instrumentation[kRecordExceptions] !== false) {
                  span.recordException(error)
                }
                span.end()
                throw error
              }
            },
            this
          )
        }
      }
    }
  }
}

module.exports = FastifyOtelInstrumentation
module.exports.FastifyOtelInstrumentation = FastifyOtelInstrumentation
