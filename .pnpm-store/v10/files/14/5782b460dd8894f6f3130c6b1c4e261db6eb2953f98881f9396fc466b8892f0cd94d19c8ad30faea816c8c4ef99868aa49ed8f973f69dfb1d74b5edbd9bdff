Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const api = require('@opentelemetry/api');
const instrumentation = require('@opentelemetry/instrumentation');
const semanticConventions = require('@opentelemetry/semantic-conventions');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');
const debugBuild = require('../../debug-build.js');

// Instrumentation for https://github.com/porsager/postgres


const INTEGRATION_NAME = 'PostgresJs';
const SUPPORTED_VERSIONS = ['>=3.0.0 <4'];
const SQL_OPERATION_REGEX = /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i;

// Marker to track if a query was created from an instrumented sql instance
// This prevents double-spanning when both wrapper and prototype patches are active
const QUERY_FROM_INSTRUMENTED_SQL = Symbol.for('sentry.query.from.instrumented.sql');

const instrumentPostgresJs = nodeCore.generateInstrumentOnce(
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
class PostgresJsInstrumentation extends instrumentation.InstrumentationBase {
   constructor(config) {
    super('sentry-postgres-js', core.SDK_VERSION, config);
  }

  /**
   * Initializes the instrumentation by patching the postgres module.
   * Uses two complementary approaches:
   * 1. Main function wrapper: instruments sql instances created AFTER instrumentation is set up (CJS + ESM)
   * 2. Query.prototype patch: fallback for sql instances created BEFORE instrumentation (CJS only)
   */
   init() {
    const module = new instrumentation.InstrumentationNodeModuleDefinition(
      'postgres',
      SUPPORTED_VERSIONS,
      exports$1 => {
        try {
          return this._patchPostgres(exports$1);
        } catch (e) {
          debugBuild.DEBUG_BUILD && core.debug.error('Failed to patch postgres module:', e);
          return exports$1;
        }
      },
      exports$1 => exports$1,
    );

    // Add fallback Query.prototype patching for pre-existing sql instances (CJS only)
    // This catches queries from sql instances created before Sentry was initialized
    ['src', 'cf/src', 'cjs/src'].forEach(path => {
      module.files.push(
        new instrumentation.InstrumentationNodeModuleFile(
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
   _patchPostgres(exports$1) {
    // In CJS: exports is the function itself
    // In ESM: exports.default is the function
    const isFunction = typeof exports$1 === 'function';
    const Original = isFunction ? exports$1 : exports$1.default;

    if (typeof Original !== 'function') {
      debugBuild.DEBUG_BUILD && core.debug.warn('postgres module does not export a function. Skipping instrumentation.');
      return exports$1;
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    const WrappedPostgres = function ( ...args) {
      const sql = Reflect.construct(Original , args);

      // Validate that construction succeeded and returned a valid function object
      if (!sql || typeof sql !== 'function') {
        debugBuild.DEBUG_BUILD && core.debug.warn('postgres() did not return a valid instance');
        return sql;
      }

      // Delegate to the portable instrumentation from @sentry/core
      const config = self.getConfig();
      return core.instrumentPostgresJsSql(sql, {
        requireParentSpan: config.requireParentSpan,
        requestHook: config.requestHook,
      });
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
      core.replaceExports(exports$1, 'default', WrappedPostgres);
      return exports$1;
    }
  }

  /**
   * Determines whether a span should be created based on the current context.
   * If `requireParentSpan` is set to true in the configuration, a span will
   * only be created if there is a parent span available.
   */
   _shouldCreateSpans() {
    const config = this.getConfig();
    const hasParentSpan = api.trace.getSpan(api.context.active()) !== undefined;
    return hasParentSpan || !config.requireParentSpan;
  }

  /**
   * Extracts DB operation name from SQL query and sets it on the span.
   */
   _setOperationName(span, sanitizedQuery, command) {
    if (command) {
      span.setAttribute(semanticConventions.ATTR_DB_OPERATION_NAME, command);
      return;
    }
    // Fallback: extract operation from the SQL query
    const operationMatch = sanitizedQuery?.match(SQL_OPERATION_REGEX);
    if (operationMatch?.[1]) {
      span.setAttribute(semanticConventions.ATTR_DB_OPERATION_NAME, operationMatch[1].toUpperCase());
    }
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

      return core.startSpanManual(
        {
          name: sanitizedSqlQuery || 'postgresjs.query',
          op: 'db',
        },
        (span) => {
          nodeCore.addOriginToSpan(span, 'auto.db.postgresjs');

          span.setAttributes({
            [semanticConventions.ATTR_DB_SYSTEM_NAME]: 'postgres',
            [semanticConventions.ATTR_DB_QUERY_TEXT]: sanitizedSqlQuery,
          });

          // Note: No connection context available for pre-existing instances
          // because the sql instance wasn't created through our instrumented wrapper

          const config = self.getConfig();
          const { requestHook } = config;
          if (requestHook) {
            instrumentation.safeExecuteInTheMiddle(
              () => requestHook(span, sanitizedSqlQuery, undefined),
              e => {
                if (e) {
                  span.setAttribute('sentry.hook.error', 'requestHook failed');
                  debugBuild.DEBUG_BUILD && core.debug.error(`Error in requestHook for ${INTEGRATION_NAME} integration:`, e);
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
                debugBuild.DEBUG_BUILD && core.debug.error('Error ending span in resolve callback:', e);
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
                  code: core.SPAN_STATUS_ERROR,
                  message: rejectArgs?.[0]?.message || 'unknown_error',
                });
                span.setAttribute(semanticConventions.ATTR_DB_RESPONSE_STATUS_CODE, rejectArgs?.[0]?.code || 'unknown');
                span.setAttribute(semanticConventions.ATTR_ERROR_TYPE, rejectArgs?.[0]?.name || 'unknown');
                self._setOperationName(span, sanitizedSqlQuery);
                span.end();
              } catch (e) {
                debugBuild.DEBUG_BUILD && core.debug.error('Error ending span in reject callback:', e);
              }
              return Reflect.apply(rejectTarget, rejectThisArg, rejectArgs);
            },
          });

          try {
            return originalHandle.apply(this, args);
          } catch (e) {
            span.setStatus({
              code: core.SPAN_STATUS_ERROR,
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

const postgresJsIntegration = core.defineIntegration(_postgresJsIntegration);

exports.PostgresJsInstrumentation = PostgresJsInstrumentation;
exports.instrumentPostgresJs = instrumentPostgresJs;
exports.postgresJsIntegration = postgresJsIntegration;
//# sourceMappingURL=postgresjs.js.map
