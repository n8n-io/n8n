import { trace, context } from '@opentelemetry/api';
import { InstrumentationBase, InstrumentationNodeModuleDefinition, InstrumentationNodeModuleFile, safeExecuteInTheMiddle } from '@opentelemetry/instrumentation';
import { ATTR_DB_NAMESPACE, ATTR_SERVER_ADDRESS, ATTR_SERVER_PORT, ATTR_DB_OPERATION_NAME, ATTR_DB_QUERY_TEXT, ATTR_DB_SYSTEM_NAME, ATTR_DB_RESPONSE_STATUS_CODE, ATTR_ERROR_TYPE } from '@opentelemetry/semantic-conventions';
import { SDK_VERSION, debug, replaceExports, startSpanManual, SPAN_STATUS_ERROR, defineIntegration } from '@sentry/core';
import { generateInstrumentOnce, addOriginToSpan } from '@sentry/node-core';
import { DEBUG_BUILD } from '../../debug-build.js';

/* eslint-disable max-lines */
// Instrumentation for https://github.com/porsager/postgres


const INTEGRATION_NAME = 'PostgresJs';
const SUPPORTED_VERSIONS = ['>=3.0.0 <4'];
const SQL_OPERATION_REGEX = /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i;

const CONNECTION_CONTEXT_SYMBOL = Symbol('sentryPostgresConnectionContext');
const INSTRUMENTED_MARKER = Symbol.for('sentry.instrumented.postgresjs');
// Marker to track if a query was created from an instrumented sql instance
// This prevents double-spanning when both wrapper and prototype patches are active
const QUERY_FROM_INSTRUMENTED_SQL = Symbol.for('sentry.query.from.instrumented.sql');

const instrumentPostgresJs = generateInstrumentOnce(
  INTEGRATION_NAME,
  (options) =>
    new PostgresJsInstrumentation({
      requireParentSpan: options?.requireParentSpan ?? true,
      requestHook: options?.requestHook,
    }),
);

/**
 * Instrumentation for the [postgres](https://www.npmjs.com/package/postgres) library.
 * This instrumentation captures postgresjs queries and their attributes.
 *
 * Uses internal Sentry patching patterns to support both CommonJS and ESM environments.
 */
class PostgresJsInstrumentation extends InstrumentationBase {
   constructor(config) {
    super('sentry-postgres-js', SDK_VERSION, config);
  }

  /**
   * Initializes the instrumentation by patching the postgres module.
   * Uses two complementary approaches:
   * 1. Main function wrapper: instruments sql instances created AFTER instrumentation is set up (CJS + ESM)
   * 2. Query.prototype patch: fallback for sql instances created BEFORE instrumentation (CJS only)
   */
   init() {
    const module = new InstrumentationNodeModuleDefinition(
      'postgres',
      SUPPORTED_VERSIONS,
      exports => {
        try {
          return this._patchPostgres(exports);
        } catch (e) {
          DEBUG_BUILD && debug.error('Failed to patch postgres module:', e);
          return exports;
        }
      },
      exports => exports,
    );

    // Add fallback Query.prototype patching for pre-existing sql instances (CJS only)
    // This catches queries from sql instances created before Sentry was initialized
    ['src', 'cf/src', 'cjs/src'].forEach(path => {
      module.files.push(
        new InstrumentationNodeModuleFile(
          `postgres/${path}/query.js`,
          SUPPORTED_VERSIONS,
          this._patchQueryPrototype.bind(this),
          this._unpatchQueryPrototype.bind(this),
        ),
      );
    });

    return module;
  }

  /**
   * Patches the postgres module by wrapping the main export function.
   * This intercepts the creation of sql instances and instruments them.
   */
   _patchPostgres(exports) {
    // In CJS: exports is the function itself
    // In ESM: exports.default is the function
    const isFunction = typeof exports === 'function';
    const Original = isFunction ? exports : exports.default;

    if (typeof Original !== 'function') {
      DEBUG_BUILD && debug.warn('postgres module does not export a function. Skipping instrumentation.');
      return exports;
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    const WrappedPostgres = function ( ...args) {
      const sql = Reflect.construct(Original , args);

      // Validate that construction succeeded and returned a valid function object
      if (!sql || typeof sql !== 'function') {
        DEBUG_BUILD && debug.warn('postgres() did not return a valid instance');
        return sql;
      }

      return self._instrumentSqlInstance(sql);
    };

    Object.setPrototypeOf(WrappedPostgres, Original);
    Object.setPrototypeOf(WrappedPostgres.prototype, (Original ).prototype);

    for (const key of Object.getOwnPropertyNames(Original)) {
      if (!['length', 'name', 'prototype'].includes(key)) {
        const descriptor = Object.getOwnPropertyDescriptor(Original, key);
        if (descriptor) {
          Object.defineProperty(WrappedPostgres, key, descriptor);
        }
      }
    }

    // For CJS: the exports object IS the function, so return the wrapped function
    // For ESM: replace the default export
    if (isFunction) {
      return WrappedPostgres ;
    } else {
      replaceExports(exports, 'default', WrappedPostgres);
      return exports;
    }
  }

  /**
   * Wraps query-returning methods (unsafe, file) to ensure their queries are instrumented.
   */
   _wrapQueryMethod(
    original,
    target,
    proxiedSql,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return function ( ...args) {
      const query = Reflect.apply(original, target, args);

      if (query && typeof query === 'object' && 'handle' in query) {
        self._wrapSingleQueryHandle(query , proxiedSql);
      }

      return query;
    };
  }

  /**
   * Wraps callback-based methods (begin, reserve) to recursively instrument Sql instances.
   * Note: These methods can also be used as tagged templates, which we pass through unchanged.
   *
   * Savepoint is not wrapped to avoid complex nested transaction instrumentation issues.
   * Queries within savepoint callbacks are still instrumented through the parent transaction's Sql instance.
   */
   _wrapCallbackMethod(
    original,
    target,
    parentSqlInstance,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return function ( ...args) {
      // Extract parent context to propagate to child instances
      const parentContext = (parentSqlInstance )[CONNECTION_CONTEXT_SYMBOL]

;

      // Check if this is a callback-based call by verifying the last argument is a function
      const isCallbackBased = typeof args[args.length - 1] === 'function';

      if (!isCallbackBased) {
        // Not a callback-based call - could be tagged template or promise-based
        const result = Reflect.apply(original, target, args);
        // If result is a Promise (e.g., reserve() without callback), instrument the resolved Sql instance
        if (result && typeof (result ).then === 'function') {
          return (result ).then((sqlInstance) => {
            return self._instrumentSqlInstance(sqlInstance, parentContext);
          });
        }
        return result;
      }

      // Callback-based call: wrap the callback to instrument the Sql instance
      const callback = (args.length === 1 ? args[0] : args[1]) ;
      const wrappedCallback = function (sqlInstance) {
        const instrumentedSql = self._instrumentSqlInstance(sqlInstance, parentContext);
        return callback(instrumentedSql);
      };

      const newArgs = args.length === 1 ? [wrappedCallback] : [args[0], wrappedCallback];
      return Reflect.apply(original, target, newArgs);
    };
  }

  /**
   * Sets connection context attributes on a span.
   */
   _setConnectionAttributes(span, connectionContext) {
    if (!connectionContext) {
      return;
    }
    if (connectionContext.ATTR_DB_NAMESPACE) {
      span.setAttribute(ATTR_DB_NAMESPACE, connectionContext.ATTR_DB_NAMESPACE);
    }
    if (connectionContext.ATTR_SERVER_ADDRESS) {
      span.setAttribute(ATTR_SERVER_ADDRESS, connectionContext.ATTR_SERVER_ADDRESS);
    }
    if (connectionContext.ATTR_SERVER_PORT !== undefined) {
      // Port is stored as string in PostgresConnectionContext for requestHook backwards compatibility,
      // but OTEL semantic conventions expect port as a number for span attributes
      const portNumber = parseInt(connectionContext.ATTR_SERVER_PORT, 10);
      if (!isNaN(portNumber)) {
        span.setAttribute(ATTR_SERVER_PORT, portNumber);
      }
    }
  }

  /**
   * Extracts DB operation name from SQL query and sets it on the span.
   */
   _setOperationName(span, sanitizedQuery, command) {
    if (command) {
      span.setAttribute(ATTR_DB_OPERATION_NAME, command);
      return;
    }
    // Fallback: extract operation from the SQL query
    const operationMatch = sanitizedQuery?.match(SQL_OPERATION_REGEX);
    if (operationMatch?.[1]) {
      span.setAttribute(ATTR_DB_OPERATION_NAME, operationMatch[1].toUpperCase());
    }
  }

  /**
   * Extracts and stores connection context from sql.options.
   */
   _attachConnectionContext(sql, proxiedSql) {
    const sqlInstance = sql ;
    if (!sqlInstance.options || typeof sqlInstance.options !== 'object') {
      return;
    }

    const opts = sqlInstance.options;
    // postgres.js stores parsed options with host and port as arrays
    // The library defaults to 'localhost' and 5432 if not specified, but we're defensive here
    const host = opts.host?.[0] || 'localhost';
    const port = opts.port?.[0] || 5432;

    const connectionContext = {
      ATTR_DB_NAMESPACE: typeof opts.database === 'string' && opts.database !== '' ? opts.database : undefined,
      ATTR_SERVER_ADDRESS: host,
      ATTR_SERVER_PORT: String(port),
    };

    proxiedSql[CONNECTION_CONTEXT_SYMBOL] = connectionContext;
  }

  /**
   * Instruments a sql instance by wrapping its query execution methods.
   */
   _instrumentSqlInstance(sql, parentConnectionContext) {
    // Check if already instrumented to prevent double-wrapping
    // Using Symbol.for() ensures the marker survives proxying
    if ((sql )[INSTRUMENTED_MARKER]) {
      return sql;
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    // Wrap the sql function to intercept query creation
    const proxiedSql = new Proxy(sql , {
      apply(target, thisArg, argumentsList) {
        const query = Reflect.apply(target, thisArg, argumentsList);

        if (query && typeof query === 'object' && 'handle' in query) {
          self._wrapSingleQueryHandle(query , proxiedSql);
        }

        return query;
      },
      get(target, prop) {
        const original = (target )[prop];

        if (typeof prop !== 'string' || typeof original !== 'function') {
          return original;
        }

        // Wrap methods that return PendingQuery objects (unsafe, file)
        if (prop === 'unsafe' || prop === 'file') {
          return self._wrapQueryMethod(original , target, proxiedSql);
        }

        // Wrap begin and reserve (not savepoint to avoid duplicate spans)
        if (prop === 'begin' || prop === 'reserve') {
          return self._wrapCallbackMethod(original , target, proxiedSql);
        }

        return original;
      },
    });

    // Use provided parent context if available, otherwise extract from sql.options
    if (parentConnectionContext) {
      (proxiedSql )[CONNECTION_CONTEXT_SYMBOL] = parentConnectionContext;
    } else {
      this._attachConnectionContext(sql, proxiedSql );
    }

    // Mark both the original and proxy as instrumented to prevent double-wrapping
    // The proxy might be passed to other methods, or the original
    // might be accessed directly, so we need to mark both
    (sql )[INSTRUMENTED_MARKER] = true;
    (proxiedSql )[INSTRUMENTED_MARKER] = true;

    return proxiedSql;
  }

  /**
   * Wraps a single query's handle method to create spans.
   */
   _wrapSingleQueryHandle(
    query,
    sqlInstance,
  ) {
    // Prevent double wrapping - check if the handle itself is already wrapped
    if ((query.handle )?.__sentryWrapped) {
      return;
    }

    // Mark this query as coming from an instrumented sql instance
    // This prevents the Query.prototype fallback patch from double-spanning
    (query )[QUERY_FROM_INSTRUMENTED_SQL] = true;

    const originalHandle = query.handle ;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    // IMPORTANT: We must replace the handle function directly, not use a Proxy,
    // because Query.then() internally calls this.handle(), which would bypass a Proxy wrapper.
    const wrappedHandle = async function ( ...args) {
      if (!self._shouldCreateSpans()) {
        return originalHandle.apply(this, args);
      }

      const fullQuery = self._reconstructQuery(query.strings);
      const sanitizedSqlQuery = self._sanitizeSqlQuery(fullQuery);

      return startSpanManual(
        {
          name: sanitizedSqlQuery || 'postgresjs.query',
          op: 'db',
        },
        (span) => {
          addOriginToSpan(span, 'auto.db.postgresjs');

          span.setAttributes({
            [ATTR_DB_SYSTEM_NAME]: 'postgres',
            [ATTR_DB_QUERY_TEXT]: sanitizedSqlQuery,
          });

          const connectionContext = sqlInstance
            ? ((sqlInstance )[CONNECTION_CONTEXT_SYMBOL]

)
            : undefined;

          self._setConnectionAttributes(span, connectionContext);

          const config = self.getConfig();
          const { requestHook } = config;
          if (requestHook) {
            safeExecuteInTheMiddle(
              () => requestHook(span, sanitizedSqlQuery, connectionContext),
              e => {
                if (e) {
                  span.setAttribute('sentry.hook.error', 'requestHook failed');
                  DEBUG_BUILD && debug.error(`Error in requestHook for ${INTEGRATION_NAME} integration:`, e);
                }
              },
              true,
            );
          }

          const queryWithCallbacks = this

;

          queryWithCallbacks.resolve = new Proxy(queryWithCallbacks.resolve , {
            apply: (resolveTarget, resolveThisArg, resolveArgs) => {
              try {
                self._setOperationName(span, sanitizedSqlQuery, resolveArgs?.[0]?.command);
                span.end();
              } catch (e) {
                DEBUG_BUILD && debug.error('Error ending span in resolve callback:', e);
              }

              return Reflect.apply(resolveTarget, resolveThisArg, resolveArgs);
            },
          });

          queryWithCallbacks.reject = new Proxy(queryWithCallbacks.reject , {
            apply: (rejectTarget, rejectThisArg, rejectArgs) => {
              try {
                span.setStatus({
                  code: SPAN_STATUS_ERROR,
                  message: rejectArgs?.[0]?.message || 'unknown_error',
                });

                span.setAttribute(ATTR_DB_RESPONSE_STATUS_CODE, rejectArgs?.[0]?.code || 'unknown');
                span.setAttribute(ATTR_ERROR_TYPE, rejectArgs?.[0]?.name || 'unknown');

                self._setOperationName(span, sanitizedSqlQuery);
                span.end();
              } catch (e) {
                DEBUG_BUILD && debug.error('Error ending span in reject callback:', e);
              }
              return Reflect.apply(rejectTarget, rejectThisArg, rejectArgs);
            },
          });

          // Handle synchronous errors that might occur before promise is created
          try {
            return originalHandle.apply(this, args);
          } catch (e) {
            span.setStatus({
              code: SPAN_STATUS_ERROR,
              message: e instanceof Error ? e.message : 'unknown_error',
            });
            span.end();
            throw e;
          }
        },
      );
    };

    (wrappedHandle ).__sentryWrapped = true;
    query.handle = wrappedHandle;
  }

  /**
   * Determines whether a span should be created based on the current context.
   * If `requireParentSpan` is set to true in the configuration, a span will
   * only be created if there is a parent span available.
   */
   _shouldCreateSpans() {
    const config = this.getConfig();
    const hasParentSpan = trace.getSpan(context.active()) !== undefined;
    return hasParentSpan || !config.requireParentSpan;
  }

  /**
   * Reconstructs the full SQL query from template strings with PostgreSQL placeholders.
   *
   * For sql`SELECT * FROM users WHERE id = ${123} AND name = ${'foo'}`:
   *   strings = ["SELECT * FROM users WHERE id = ", " AND name = ", ""]
   *   returns: "SELECT * FROM users WHERE id = $1 AND name = $2"
   */
   _reconstructQuery(strings) {
    if (!strings?.length) {
      return undefined;
    }
    if (strings.length === 1) {
      return strings[0] || undefined;
    }
    // Join template parts with PostgreSQL placeholders ($1, $2, etc.)
    return strings.reduce((acc, str, i) => (i === 0 ? str : `${acc}$${i}${str}`), '');
  }

  /**
   * Sanitize SQL query as per the OTEL semantic conventions
   * https://opentelemetry.io/docs/specs/semconv/database/database-spans/#sanitization-of-dbquerytext
   *
   * PostgreSQL $n placeholders are preserved per OTEL spec - they're parameterized queries,
   * not sensitive literals. Only actual values (strings, numbers, booleans) are sanitized.
   */
   _sanitizeSqlQuery(sqlQuery) {
    if (!sqlQuery) {
      return 'Unknown SQL Query';
    }

    return (
      sqlQuery
        // Remove comments first (they may contain newlines and extra spaces)
        .replace(/--.*$/gm, '') // Single line comments (multiline mode)
        .replace(/\/\*[\s\S]*?\*\//g, '') // Multi-line comments
        .replace(/;\s*$/, '') // Remove trailing semicolons
        // Collapse whitespace to a single space (after removing comments)
        .replace(/\s+/g, ' ')
        .trim() // Remove extra spaces and trim
        // Sanitize hex/binary literals before string literals
        .replace(/\bX'[0-9A-Fa-f]*'/gi, '?') // Hex string literals
        .replace(/\bB'[01]*'/gi, '?') // Binary string literals
        // Sanitize string literals (handles escaped quotes)
        .replace(/'(?:[^']|'')*'/g, '?')
        // Sanitize hex numbers
        .replace(/\b0x[0-9A-Fa-f]+/gi, '?')
        // Sanitize boolean literals
        .replace(/\b(?:TRUE|FALSE)\b/gi, '?')
        // Sanitize numeric literals (preserve $n placeholders via negative lookbehind)
        .replace(/-?\b\d+\.?\d*[eE][+-]?\d+\b/g, '?') // Scientific notation
        .replace(/-?\b\d+\.\d+\b/g, '?') // Decimals
        .replace(/-?\.\d+\b/g, '?') // Decimals starting with dot
        .replace(/(?<!\$)-?\b\d+\b/g, '?') // Integers (NOT $n placeholders)
        // Collapse IN clauses for cardinality (both ? and $n variants)
        .replace(/\bIN\b\s*\(\s*\?(?:\s*,\s*\?)*\s*\)/gi, 'IN (?)')
        .replace(/\bIN\b\s*\(\s*\$\d+(?:\s*,\s*\$\d+)*\s*\)/gi, 'IN ($?)')
    );
  }

  /**
   * Fallback patch for Query.prototype.handle to instrument queries from pre-existing sql instances.
   * This catches queries from sql instances created BEFORE Sentry was initialized (CJS only).
   *
   * Note: Queries from pre-existing instances won't have connection context (database, host, port)
   * because the sql instance wasn't created through our instrumented wrapper.
   */
   _patchQueryPrototype(moduleExports

) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const originalHandle = moduleExports.Query.prototype.handle;

    moduleExports.Query.prototype.handle = async function (

      ...args
    ) {
      // Skip if this query came from an instrumented sql instance (already handled by wrapper)
      if ((this )[QUERY_FROM_INSTRUMENTED_SQL]) {
        return originalHandle.apply(this, args);
      }

      // Skip if we shouldn't create spans
      if (!self._shouldCreateSpans()) {
        return originalHandle.apply(this, args);
      }

      const fullQuery = self._reconstructQuery(this.strings);
      const sanitizedSqlQuery = self._sanitizeSqlQuery(fullQuery);

      return startSpanManual(
        {
          name: sanitizedSqlQuery || 'postgresjs.query',
          op: 'db',
        },
        (span) => {
          addOriginToSpan(span, 'auto.db.postgresjs');

          span.setAttributes({
            [ATTR_DB_SYSTEM_NAME]: 'postgres',
            [ATTR_DB_QUERY_TEXT]: sanitizedSqlQuery,
          });

          // Note: No connection context available for pre-existing instances
          // because the sql instance wasn't created through our instrumented wrapper

          const config = self.getConfig();
          const { requestHook } = config;
          if (requestHook) {
            safeExecuteInTheMiddle(
              () => requestHook(span, sanitizedSqlQuery, undefined),
              e => {
                if (e) {
                  span.setAttribute('sentry.hook.error', 'requestHook failed');
                  DEBUG_BUILD && debug.error(`Error in requestHook for ${INTEGRATION_NAME} integration:`, e);
                }
              },
              true,
            );
          }

          // Wrap resolve to end span on success
          const originalResolve = this.resolve;
          this.resolve = new Proxy(originalResolve , {
            apply: (resolveTarget, resolveThisArg, resolveArgs) => {
              try {
                self._setOperationName(span, sanitizedSqlQuery, resolveArgs?.[0]?.command);
                span.end();
              } catch (e) {
                DEBUG_BUILD && debug.error('Error ending span in resolve callback:', e);
              }
              return Reflect.apply(resolveTarget, resolveThisArg, resolveArgs);
            },
          });

          // Wrap reject to end span on error
          const originalReject = this.reject;
          this.reject = new Proxy(originalReject , {
            apply: (rejectTarget, rejectThisArg, rejectArgs) => {
              try {
                span.setStatus({
                  code: SPAN_STATUS_ERROR,
                  message: rejectArgs?.[0]?.message || 'unknown_error',
                });
                span.setAttribute(ATTR_DB_RESPONSE_STATUS_CODE, rejectArgs?.[0]?.code || 'unknown');
                span.setAttribute(ATTR_ERROR_TYPE, rejectArgs?.[0]?.name || 'unknown');
                self._setOperationName(span, sanitizedSqlQuery);
                span.end();
              } catch (e) {
                DEBUG_BUILD && debug.error('Error ending span in reject callback:', e);
              }
              return Reflect.apply(rejectTarget, rejectThisArg, rejectArgs);
            },
          });

          try {
            return originalHandle.apply(this, args);
          } catch (e) {
            span.setStatus({
              code: SPAN_STATUS_ERROR,
              message: e instanceof Error ? e.message : 'unknown_error',
            });
            span.end();
            throw e;
          }
        },
      );
    };

    // Store original for unpatch - must be set on the NEW patched function
    moduleExports.Query.prototype.handle.__sentry_original__ = originalHandle;

    return moduleExports;
  }

  /**
   * Restores the original Query.prototype.handle method.
   */
   _unpatchQueryPrototype(moduleExports

) {
    if (moduleExports.Query.prototype.handle.__sentry_original__) {
      moduleExports.Query.prototype.handle = moduleExports.Query.prototype.handle.__sentry_original__;
    }
    return moduleExports;
  }
}

const _postgresJsIntegration = ((options) => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      instrumentPostgresJs(options);
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [postgres](https://www.npmjs.com/package/postgres) library.
 *
 * For more information, see the [`postgresIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/postgres/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *  integrations: [Sentry.postgresJsIntegration()],
 * });
 * ```
 */

const postgresJsIntegration = defineIntegration(_postgresJsIntegration);

export { PostgresJsInstrumentation, instrumentPostgresJs, postgresJsIntegration };
//# sourceMappingURL=postgresjs.js.map
