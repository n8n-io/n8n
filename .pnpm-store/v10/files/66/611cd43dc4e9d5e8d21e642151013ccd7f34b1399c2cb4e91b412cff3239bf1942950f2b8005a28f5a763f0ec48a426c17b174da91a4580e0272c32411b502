import { DEBUG_BUILD } from '../debug-build.js';
import { SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN } from '../semanticAttributes.js';
import { debug } from '../utils/debug-logger.js';
import { getActiveSpan } from '../utils/spanUtils.js';
import { SPAN_STATUS_ERROR } from '../tracing/spanstatus.js';
import { startSpanManual } from '../tracing/trace.js';

// Portable instrumentation for https://github.com/porsager/postgres
// This can be used in any environment (Node.js, Cloudflare Workers, etc.)
// without depending on OpenTelemetry module hooking.


const SQL_OPERATION_REGEX = /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i;

const CONNECTION_CONTEXT_SYMBOL = Symbol('sentryPostgresConnectionContext');

// Use the same Symbol.for() markers as the Node.js OTel instrumentation
// so that both approaches recognize each other and prevent double-wrapping.
const INSTRUMENTED_MARKER = Symbol.for('sentry.instrumented.postgresjs');
// Marker to track if a query was created from an instrumented sql instance.
// This prevents double-spanning when both the wrapper and the Node.js Query.prototype
// fallback patch are active simultaneously.
const QUERY_FROM_INSTRUMENTED_SQL = Symbol.for('sentry.query.from.instrumented.sql');

/**
 * Instruments a postgres.js `sql` instance with Sentry tracing.
 *
 * This is a portable instrumentation function that works in any environment
 * (Node.js, Cloudflare Workers, etc.) without depending on OpenTelemetry.
 *
 * @example
 * ```javascript
 * import postgres from 'postgres';
 * import * as Sentry from '@sentry/cloudflare'; // or '@sentry/deno'
 *
 * const sql = Sentry.instrumentPostgresJsSql(
 *   postgres({ host: 'localhost', database: 'mydb' })
 * );
 *
 * // All queries now create Sentry spans
 * await sql`SELECT * FROM users WHERE id = ${userId}`;
 * ```
 */
function instrumentPostgresJsSql(sql, options) {
  if (!sql || typeof sql !== 'function') {
    DEBUG_BUILD && debug.warn('instrumentPostgresJsSql: provided value is not a valid postgres.js sql instance');
    return sql;
  }

  return _instrumentSqlInstance(sql, { requireParentSpan: true, ...options }) ;
}

/**
 * Instruments a sql instance by wrapping its query execution methods.
 */
function _instrumentSqlInstance(
  sql,
  options,
  parentConnectionContext,
) {
  // Check if already instrumented to prevent double-wrapping
  // Using Symbol.for() ensures the marker survives proxying
  if ((sql )[INSTRUMENTED_MARKER]) {
    return sql;
  }

  // Wrap the sql function to intercept query creation
  const proxiedSql = new Proxy(sql , {
    apply(target, thisArg, argumentsList) {
      const query = Reflect.apply(target, thisArg, argumentsList);

      if (query && typeof query === 'object' && 'handle' in query) {
        _wrapSingleQueryHandle(query , proxiedSql, options);
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
        return _wrapQueryMethod(original , target, proxiedSql, options);
      }

      // Wrap begin and reserve (not savepoint to avoid duplicate spans)
      if (prop === 'begin' || prop === 'reserve') {
        return _wrapCallbackMethod(original , target, proxiedSql, options);
      }

      return original;
    },
  });

  // Use provided parent context if available, otherwise extract from sql.options
  if (parentConnectionContext) {
    (proxiedSql )[CONNECTION_CONTEXT_SYMBOL] = parentConnectionContext;
  } else {
    _attachConnectionContext(sql, proxiedSql );
  }

  // Mark both the original and proxy as instrumented to prevent double-wrapping
  (sql )[INSTRUMENTED_MARKER] = true;
  (proxiedSql )[INSTRUMENTED_MARKER] = true;

  return proxiedSql;
}

/**
 * Wraps query-returning methods (unsafe, file) to ensure their queries are instrumented.
 */
function _wrapQueryMethod(
  original,
  target,
  proxiedSql,
  options,
) {
  return function ( ...args) {
    const query = Reflect.apply(original, target, args);

    if (query && typeof query === 'object' && 'handle' in query) {
      _wrapSingleQueryHandle(query , proxiedSql, options);
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
function _wrapCallbackMethod(
  original,
  target,
  parentSqlInstance,
  options,
) {
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
          return _instrumentSqlInstance(sqlInstance, options, parentContext);
        });
      }
      return result;
    }

    // Callback-based call: wrap the callback to instrument the Sql instance
    const callback = (args.length === 1 ? args[0] : args[1]) ;
    const wrappedCallback = function (sqlInstance) {
      const instrumentedSql = _instrumentSqlInstance(sqlInstance, options, parentContext);
      return callback(instrumentedSql);
    };

    const newArgs = args.length === 1 ? [wrappedCallback] : [args[0], wrappedCallback];
    return Reflect.apply(original, target, newArgs);
  };
}

/**
 * Wraps a single query's handle method to create spans.
 */
function _wrapSingleQueryHandle(
  query,
  sqlInstance,
  options,
) {
  // Prevent double wrapping - check if the handle itself is already wrapped
  if ((query.handle )?.__sentryWrapped) {
    return;
  }

  // Mark this query as coming from an instrumented sql instance.
  // This prevents the Node.js Query.prototype fallback patch from double-spanning.
  (query )[QUERY_FROM_INSTRUMENTED_SQL] = true;

  const originalHandle = query.handle ;

  // IMPORTANT: We must replace the handle function directly, not use a Proxy,
  // because Query.then() internally calls this.handle(), which would bypass a Proxy wrapper.
  const wrappedHandle = async function ( ...args) {
    if (!_shouldCreateSpans(options)) {
      return originalHandle.apply(this, args);
    }

    const fullQuery = _reconstructQuery(query.strings);
    const sanitizedSqlQuery = _sanitizeSqlQuery(fullQuery);

    return startSpanManual(
      {
        name: sanitizedSqlQuery || 'postgresjs.query',
        op: 'db',
      },
      (span) => {
        span.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, 'auto.db.postgresjs');

        span.setAttributes({
          'db.system.name': 'postgres',
          'db.query.text': sanitizedSqlQuery,
        });

        const connectionContext = sqlInstance
          ? ((sqlInstance )[CONNECTION_CONTEXT_SYMBOL]

)
          : undefined;

        _setConnectionAttributes(span, connectionContext);

        if (options.requestHook) {
          try {
            options.requestHook(span, sanitizedSqlQuery, connectionContext);
          } catch (e) {
            span.setAttribute('sentry.hook.error', 'requestHook failed');
            DEBUG_BUILD && debug.error('Error in requestHook for PostgresJs instrumentation:', e);
          }
        }

        const queryWithCallbacks = this

;

        queryWithCallbacks.resolve = new Proxy(queryWithCallbacks.resolve , {
          apply: (resolveTarget, resolveThisArg, resolveArgs) => {
            try {
              _setOperationName(span, sanitizedSqlQuery, resolveArgs?.[0]?.command);
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

              span.setAttribute('db.response.status_code', rejectArgs?.[0]?.code || 'unknown');
              span.setAttribute('error.type', rejectArgs?.[0]?.name || 'unknown');

              _setOperationName(span, sanitizedSqlQuery);
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
 * If `requireParentSpan` is set to true in the options, a span will
 * only be created if there is a parent span available.
 */
function _shouldCreateSpans(options) {
  const hasParentSpan = getActiveSpan() !== undefined;
  return hasParentSpan || !options.requireParentSpan;
}

/**
 * Reconstructs the full SQL query from template strings with PostgreSQL placeholders.
 *
 * For sql`SELECT * FROM users WHERE id = ${123} AND name = ${'foo'}`:
 *   strings = ["SELECT * FROM users WHERE id = ", " AND name = ", ""]
 *   returns: "SELECT * FROM users WHERE id = $1 AND name = $2"
 *
 * @internal Exported for testing only
 */
function _reconstructQuery(strings) {
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
 *
 * @internal Exported for testing only
 */
function _sanitizeSqlQuery(sqlQuery) {
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
 * Sets connection context attributes on a span.
 */
function _setConnectionAttributes(span, connectionContext) {
  if (!connectionContext) {
    return;
  }
  if (connectionContext.ATTR_DB_NAMESPACE) {
    span.setAttribute('db.namespace', connectionContext.ATTR_DB_NAMESPACE);
  }
  if (connectionContext.ATTR_SERVER_ADDRESS) {
    span.setAttribute('server.address', connectionContext.ATTR_SERVER_ADDRESS);
  }
  if (connectionContext.ATTR_SERVER_PORT !== undefined) {
    // Port is stored as string in PostgresConnectionContext for requestHook backwards compatibility,
    // but semantic conventions expect port as a number for span attributes
    const portNumber = parseInt(connectionContext.ATTR_SERVER_PORT, 10);
    if (!isNaN(portNumber)) {
      span.setAttribute('server.port', portNumber);
    }
  }
}

/**
 * Extracts DB operation name from SQL query and sets it on the span.
 */
function _setOperationName(span, sanitizedQuery, command) {
  if (command) {
    span.setAttribute('db.operation.name', command);
    return;
  }
  // Fallback: extract operation from the SQL query
  const operationMatch = sanitizedQuery?.match(SQL_OPERATION_REGEX);
  if (operationMatch?.[1]) {
    span.setAttribute('db.operation.name', operationMatch[1].toUpperCase());
  }
}

/**
 * Extracts and stores connection context from sql.options.
 */
function _attachConnectionContext(sql, proxiedSql) {
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

export { _reconstructQuery, _sanitizeSqlQuery, instrumentPostgresJsSql };
//# sourceMappingURL=postgresjs.js.map
