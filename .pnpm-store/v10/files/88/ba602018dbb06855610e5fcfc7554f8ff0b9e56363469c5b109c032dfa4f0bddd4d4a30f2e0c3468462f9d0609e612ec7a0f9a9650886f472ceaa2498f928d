import { addBreadcrumb } from '../breadcrumbs.js';
import { DEBUG_BUILD } from '../debug-build.js';
import { captureException } from '../exports.js';
import { defineIntegration } from '../integration.js';
import { SEMANTIC_ATTRIBUTE_SENTRY_OP, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN } from '../semanticAttributes.js';
import { debug } from '../utils/debug-logger.js';
import { addExceptionMechanism } from '../utils/misc.js';
import { isPlainObject } from '../utils/is.js';
import { SPAN_STATUS_ERROR, SPAN_STATUS_OK, setHttpStatus } from '../tracing/spanstatus.js';
import { startSpan } from '../tracing/trace.js';

// Based on Kamil Ogórek's work on:
// https://github.com/supabase-community/sentry-integration-js


const AUTH_OPERATIONS_TO_INSTRUMENT = [
  'reauthenticate',
  'signInAnonymously',
  'signInWithOAuth',
  'signInWithIdToken',
  'signInWithOtp',
  'signInWithPassword',
  'signInWithSSO',
  'signOut',
  'signUp',
  'verifyOtp',
];

const AUTH_ADMIN_OPERATIONS_TO_INSTRUMENT = [
  'createUser',
  'deleteUser',
  'listUsers',
  'getUserById',
  'updateUserById',
  'inviteUserByEmail',
];

const FILTER_MAPPINGS = {
  eq: 'eq',
  neq: 'neq',
  gt: 'gt',
  gte: 'gte',
  lt: 'lt',
  lte: 'lte',
  like: 'like',
  'like(all)': 'likeAllOf',
  'like(any)': 'likeAnyOf',
  ilike: 'ilike',
  'ilike(all)': 'ilikeAllOf',
  'ilike(any)': 'ilikeAnyOf',
  is: 'is',
  in: 'in',
  cs: 'contains',
  cd: 'containedBy',
  sr: 'rangeGt',
  nxl: 'rangeGte',
  sl: 'rangeLt',
  nxr: 'rangeLte',
  adj: 'rangeAdjacent',
  ov: 'overlaps',
  fts: '',
  plfts: 'plain',
  phfts: 'phrase',
  wfts: 'websearch',
  not: 'not',
};

const DB_OPERATIONS_TO_INSTRUMENT = ['select', 'insert', 'upsert', 'update', 'delete'];

function markAsInstrumented(fn) {
  try {
    (fn ).__SENTRY_INSTRUMENTED__ = true;
  } catch {
    // ignore errors here
  }
}

function isInstrumented(fn) {
  try {
    return (fn ).__SENTRY_INSTRUMENTED__;
  } catch {
    return false;
  }
}

/**
 * Extracts the database operation type from the HTTP method and headers
 * @param method - The HTTP method of the request
 * @param headers - The request headers
 * @returns The database operation type ('select', 'insert', 'upsert', 'update', or 'delete')
 */
function extractOperation(method, headers = {}) {
  switch (method) {
    case 'GET': {
      return 'select';
    }
    case 'POST': {
      if (headers['Prefer']?.includes('resolution=')) {
        return 'upsert';
      } else {
        return 'insert';
      }
    }
    case 'PATCH': {
      return 'update';
    }
    case 'DELETE': {
      return 'delete';
    }
    default: {
      return '<unknown-op>';
    }
  }
}

/**
 * Translates Supabase filter parameters into readable method names for tracing
 * @param key - The filter key from the URL search parameters
 * @param query - The filter value from the URL search parameters
 * @returns A string representation of the filter as a method call
 */
function translateFiltersIntoMethods(key, query) {
  if (query === '' || query === '*') {
    return 'select(*)';
  }

  if (key === 'select') {
    return `select(${query})`;
  }

  if (key === 'or' || key.endsWith('.or')) {
    return `${key}${query}`;
  }

  const [filter, ...value] = query.split('.');

  let method;
  // Handle optional `configPart` of the filter
  if (filter?.startsWith('fts')) {
    method = 'textSearch';
  } else if (filter?.startsWith('plfts')) {
    method = 'textSearch[plain]';
  } else if (filter?.startsWith('phfts')) {
    method = 'textSearch[phrase]';
  } else if (filter?.startsWith('wfts')) {
    method = 'textSearch[websearch]';
  } else {
    method = (filter && FILTER_MAPPINGS[filter ]) || 'filter';
  }

  return `${method}(${key}, ${value.join('.')})`;
}

function instrumentAuthOperation(operation, isAdmin = false) {
  return new Proxy(operation, {
    apply(target, thisArg, argumentsList) {
      return startSpan(
        {
          name: `auth ${isAdmin ? '(admin) ' : ''}${operation.name}`,
          attributes: {
            [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.db.supabase',
            [SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'db',
            'db.system': 'postgresql',
            'db.operation': `auth.${isAdmin ? 'admin.' : ''}${operation.name}`,
          },
        },
        span => {
          return Reflect.apply(target, thisArg, argumentsList)
            .then((res) => {
              if (res && typeof res === 'object' && 'error' in res && res.error) {
                span.setStatus({ code: SPAN_STATUS_ERROR });

                captureException(res.error, {
                  mechanism: {
                    handled: false,
                    type: 'auto.db.supabase.auth',
                  },
                });
              } else {
                span.setStatus({ code: SPAN_STATUS_OK });
              }

              span.end();
              return res;
            })
            .catch((err) => {
              span.setStatus({ code: SPAN_STATUS_ERROR });
              span.end();

              captureException(err, {
                mechanism: {
                  handled: false,
                  type: 'auto.db.supabase.auth',
                },
              });

              throw err;
            })
            .then(...argumentsList);
        },
      );
    },
  });
}

function instrumentSupabaseAuthClient(supabaseClientInstance) {
  const auth = supabaseClientInstance.auth;

  if (!auth || isInstrumented(supabaseClientInstance.auth)) {
    return;
  }

  for (const operation of AUTH_OPERATIONS_TO_INSTRUMENT) {
    const authOperation = auth[operation];

    if (!authOperation) {
      continue;
    }

    if (typeof supabaseClientInstance.auth[operation] === 'function') {
      supabaseClientInstance.auth[operation] = instrumentAuthOperation(authOperation);
    }
  }

  for (const operation of AUTH_ADMIN_OPERATIONS_TO_INSTRUMENT) {
    const authOperation = auth.admin[operation];

    if (!authOperation) {
      continue;
    }

    if (typeof supabaseClientInstance.auth.admin[operation] === 'function') {
      supabaseClientInstance.auth.admin[operation] = instrumentAuthOperation(authOperation, true);
    }
  }

  markAsInstrumented(supabaseClientInstance.auth);
}

function instrumentSupabaseClientConstructor(SupabaseClient) {
  if (isInstrumented((SupabaseClient ).prototype.from)) {
    return;
  }

  (SupabaseClient ).prototype.from = new Proxy(
    (SupabaseClient ).prototype.from,
    {
      apply(target, thisArg, argumentsList) {
        const rv = Reflect.apply(target, thisArg, argumentsList);
        const PostgRESTQueryBuilder = (rv ).constructor;

        instrumentPostgRESTQueryBuilder(PostgRESTQueryBuilder );

        return rv;
      },
    },
  );

  markAsInstrumented((SupabaseClient ).prototype.from);
}

function instrumentPostgRESTFilterBuilder(PostgRESTFilterBuilder) {
  if (isInstrumented((PostgRESTFilterBuilder.prototype ).then)) {
    return;
  }

  (PostgRESTFilterBuilder.prototype ).then = new Proxy(
    (PostgRESTFilterBuilder.prototype ).then,
    {
      apply(target, thisArg, argumentsList) {
        const operations = DB_OPERATIONS_TO_INSTRUMENT;
        const typedThis = thisArg ;
        const operation = extractOperation(typedThis.method, typedThis.headers);

        if (!operations.includes(operation)) {
          return Reflect.apply(target, thisArg, argumentsList);
        }

        if (!typedThis?.url?.pathname || typeof typedThis.url.pathname !== 'string') {
          return Reflect.apply(target, thisArg, argumentsList);
        }

        const pathParts = typedThis.url.pathname.split('/');
        const table = pathParts.length > 0 ? pathParts[pathParts.length - 1] : '';

        const queryItems = [];
        for (const [key, value] of typedThis.url.searchParams.entries()) {
          // It's possible to have multiple entries for the same key, eg. `id=eq.7&id=eq.3`,
          // so we need to use array instead of object to collect them.
          queryItems.push(translateFiltersIntoMethods(key, value));
        }
        const body = Object.create(null);
        if (isPlainObject(typedThis.body)) {
          for (const [key, value] of Object.entries(typedThis.body)) {
            body[key] = value;
          }
        }

        // Adding operation to the beginning of the description if it's not a `select` operation
        // For example, it can be an `insert` or `update` operation but the query can be `select(...)`
        // For `select` operations, we don't need repeat it in the description
        const description = `${operation === 'select' ? '' : `${operation}${body ? '(...) ' : ''}`}${queryItems.join(
          ' ',
        )} from(${table})`;

        const attributes = {
          'db.table': table,
          'db.schema': typedThis.schema,
          'db.url': typedThis.url.origin,
          'db.sdk': typedThis.headers['X-Client-Info'],
          'db.system': 'postgresql',
          'db.operation': operation,
          [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.db.supabase',
          [SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'db',
        };

        if (queryItems.length) {
          attributes['db.query'] = queryItems;
        }

        if (Object.keys(body).length) {
          attributes['db.body'] = body;
        }

        return startSpan(
          {
            name: description,
            attributes,
          },
          span => {
            return (Reflect.apply(target, thisArg, []) )
              .then(
                (res) => {
                  if (span) {
                    if (res && typeof res === 'object' && 'status' in res) {
                      setHttpStatus(span, res.status || 500);
                    }
                    span.end();
                  }

                  if (res.error) {
                    const err = new Error(res.error.message) ;
                    if (res.error.code) {
                      err.code = res.error.code;
                    }
                    if (res.error.details) {
                      err.details = res.error.details;
                    }

                    const supabaseContext = {};
                    if (queryItems.length) {
                      supabaseContext.query = queryItems;
                    }
                    if (Object.keys(body).length) {
                      supabaseContext.body = body;
                    }

                    captureException(err, scope => {
                      scope.addEventProcessor(e => {
                        addExceptionMechanism(e, {
                          handled: false,
                          type: 'auto.db.supabase.postgres',
                        });

                        return e;
                      });

                      scope.setContext('supabase', supabaseContext);

                      return scope;
                    });
                  }

                  const breadcrumb = {
                    type: 'supabase',
                    category: `db.${operation}`,
                    message: description,
                  };

                  const data = {};

                  if (queryItems.length) {
                    data.query = queryItems;
                  }

                  if (Object.keys(body).length) {
                    data.body = body;
                  }

                  if (Object.keys(data).length) {
                    breadcrumb.data = data;
                  }

                  addBreadcrumb(breadcrumb);

                  return res;
                },
                (err) => {
                  // TODO: shouldn't we capture this error?
                  if (span) {
                    setHttpStatus(span, 500);
                    span.end();
                  }
                  throw err;
                },
              )
              .then(...argumentsList);
          },
        );
      },
    },
  );

  markAsInstrumented((PostgRESTFilterBuilder.prototype ).then);
}

function instrumentPostgRESTQueryBuilder(PostgRESTQueryBuilder) {
  // We need to wrap _all_ operations despite them sharing the same `PostgRESTFilterBuilder`
  // constructor, as we don't know which method will be called first, and we don't want to miss any calls.
  for (const operation of DB_OPERATIONS_TO_INSTRUMENT) {
    if (isInstrumented((PostgRESTQueryBuilder.prototype )[operation])) {
      continue;
    }

    (PostgRESTQueryBuilder.prototype )[operation ] = new Proxy(
      (PostgRESTQueryBuilder.prototype )[operation ],
      {
        apply(target, thisArg, argumentsList) {
          const rv = Reflect.apply(target, thisArg, argumentsList);
          const PostgRESTFilterBuilder = (rv ).constructor;

          DEBUG_BUILD && debug.log(`Instrumenting ${operation} operation's PostgRESTFilterBuilder`);

          instrumentPostgRESTFilterBuilder(PostgRESTFilterBuilder);

          return rv;
        },
      },
    );

    markAsInstrumented((PostgRESTQueryBuilder.prototype )[operation]);
  }
}

const instrumentSupabaseClient = (supabaseClient) => {
  if (!supabaseClient) {
    DEBUG_BUILD && debug.warn('Supabase integration was not installed because no Supabase client was provided.');
    return;
  }
  const SupabaseClientConstructor =
    supabaseClient.constructor === Function ? supabaseClient : supabaseClient.constructor;

  instrumentSupabaseClientConstructor(SupabaseClientConstructor);
  instrumentSupabaseAuthClient(supabaseClient );
};

const INTEGRATION_NAME = 'Supabase';

const _supabaseIntegration = ((supabaseClient) => {
  return {
    setupOnce() {
      instrumentSupabaseClient(supabaseClient);
    },
    name: INTEGRATION_NAME,
  };
}) ;

const supabaseIntegration = defineIntegration((options) => {
  return _supabaseIntegration(options.supabaseClient);
}) ;

export { DB_OPERATIONS_TO_INSTRUMENT, FILTER_MAPPINGS, extractOperation, instrumentSupabaseClient, supabaseIntegration, translateFiltersIntoMethods };
//# sourceMappingURL=supabase.js.map
