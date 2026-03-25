Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('./currentScopes.js');
const exports$1 = require('./exports.js');
const semanticAttributes = require('./semanticAttributes.js');
const object = require('./utils/object.js');
const normalize = require('./utils/normalize.js');
const trace = require('./tracing/trace.js');

const trpcCaptureContext = { mechanism: { handled: false, type: 'auto.rpc.trpc.middleware' } };

function captureIfError(nextResult) {
  // TODO: Set span status based on what TRPCError was encountered
  if (
    typeof nextResult === 'object' &&
    nextResult !== null &&
    'ok' in nextResult &&
    !nextResult.ok &&
    'error' in nextResult
  ) {
    exports$1.captureException(nextResult.error, trpcCaptureContext);
  }
}

/**
 * Sentry tRPC middleware that captures errors and creates spans for tRPC procedures.
 */
function trpcMiddleware(options = {}) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return async function (opts) {
    const { path, type, next, rawInput, getRawInput } = opts;

    const client = currentScopes.getClient();
    const clientOptions = client?.getOptions();

    const trpcContext = {
      procedure_path: path,
      procedure_type: type,
    };

    object.addNonEnumerableProperty(
      trpcContext,
      '__sentry_override_normalization_depth__',
      1 + // 1 for context.input + the normal normalization depth
        (clientOptions?.normalizeDepth ?? 5), // 5 is a sane depth
    );

    if (options.attachRpcInput !== undefined ? options.attachRpcInput : clientOptions?.sendDefaultPii) {
      if (rawInput !== undefined) {
        trpcContext.input = normalize.normalize(rawInput);
      }

      if (getRawInput !== undefined && typeof getRawInput === 'function') {
        try {
          const rawRes = await getRawInput();

          trpcContext.input = normalize.normalize(rawRes);
        } catch {
          // noop
        }
      }
    }

    return currentScopes.withIsolationScope(scope => {
      scope.setContext('trpc', trpcContext);
      return trace.startSpanManual(
        {
          name: `trpc/${path}`,
          op: 'rpc.server',
          attributes: {
            [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'route',
            [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.rpc.trpc',
          },
          forceTransaction: !!options.forceTransaction,
        },
        async span => {
          try {
            const nextResult = await next();
            captureIfError(nextResult);
            span.end();
            return nextResult;
          } catch (e) {
            exports$1.captureException(e, trpcCaptureContext);
            span.end();
            throw e;
          }
        },
      ) ;
    });
  };
}

exports.trpcMiddleware = trpcMiddleware;
//# sourceMappingURL=trpc.js.map
