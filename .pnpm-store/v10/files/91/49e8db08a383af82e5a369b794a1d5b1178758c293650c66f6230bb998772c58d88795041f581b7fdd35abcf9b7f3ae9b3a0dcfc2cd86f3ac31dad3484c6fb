Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');
const constants = require('../integrations/http/constants.js');

/**
 * This method patches the request object to capture the body.
 * Instead of actually consuming the streamed body ourselves, which has potential side effects,
 * we monkey patch `req.on('data')` to intercept the body chunks.
 * This way, we only read the body if the user also consumes the body, ensuring we do not change any behavior in unexpected ways.
 */
function patchRequestToCaptureBody(
  req,
  isolationScope,
  maxIncomingRequestBodySize,
  integrationName,
) {
  let bodyByteLength = 0;
  const chunks = [];

  debugBuild.DEBUG_BUILD && core.debug.log(integrationName, 'Patching request.on');

  /**
   * We need to keep track of the original callbacks, in order to be able to remove listeners again.
   * Since `off` depends on having the exact same function reference passed in, we need to be able to map
   * original listeners to our wrapped ones.
   */
  const callbackMap = new WeakMap();

  const maxBodySize =
    maxIncomingRequestBodySize === 'small'
      ? 1000
      : maxIncomingRequestBodySize === 'medium'
        ? 10000
        : constants.MAX_BODY_BYTE_LENGTH;

  try {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    req.on = new Proxy(req.on, {
      apply: (target, thisArg, args) => {
        const [event, listener, ...restArgs] = args;

        if (event === 'data') {
          debugBuild.DEBUG_BUILD &&
            core.debug.log(integrationName, `Handling request.on("data") with maximum body size of ${maxBodySize}b`);

          const callback = new Proxy(listener, {
            apply: (target, thisArg, args) => {
              try {
                const chunk = args[0] ;
                const bufferifiedChunk = Buffer.from(chunk);

                if (bodyByteLength < maxBodySize) {
                  chunks.push(bufferifiedChunk);
                  bodyByteLength += bufferifiedChunk.byteLength;
                } else if (debugBuild.DEBUG_BUILD) {
                  core.debug.log(
                    integrationName,
                    `Dropping request body chunk because maximum body length of ${maxBodySize}b is exceeded.`,
                  );
                }
              } catch (_err) {
                debugBuild.DEBUG_BUILD && core.debug.error(integrationName, 'Encountered error while storing body chunk.');
              }

              return Reflect.apply(target, thisArg, args);
            },
          });

          callbackMap.set(listener, callback);

          return Reflect.apply(target, thisArg, [event, callback, ...restArgs]);
        }

        return Reflect.apply(target, thisArg, args);
      },
    });

    // Ensure we also remove callbacks correctly
    // eslint-disable-next-line @typescript-eslint/unbound-method
    req.off = new Proxy(req.off, {
      apply: (target, thisArg, args) => {
        const [, listener] = args;

        const callback = callbackMap.get(listener);
        if (callback) {
          callbackMap.delete(listener);

          const modifiedArgs = args.slice();
          modifiedArgs[1] = callback;
          return Reflect.apply(target, thisArg, modifiedArgs);
        }

        return Reflect.apply(target, thisArg, args);
      },
    });

    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8');
        if (body) {
          // Using Buffer.byteLength here, because the body may contain characters that are not 1 byte long
          const bodyByteLength = Buffer.byteLength(body, 'utf-8');
          const truncatedBody =
            bodyByteLength > maxBodySize
              ? `${Buffer.from(body)
                  .subarray(0, maxBodySize - 3)
                  .toString('utf-8')}...`
              : body;

          isolationScope.setSDKProcessingMetadata({ normalizedRequest: { data: truncatedBody } });
        }
      } catch (error) {
        if (debugBuild.DEBUG_BUILD) {
          core.debug.error(integrationName, 'Error building captured request body', error);
        }
      }
    });
  } catch (error) {
    if (debugBuild.DEBUG_BUILD) {
      core.debug.error(integrationName, 'Error patching request to capture body', error);
    }
  }
}

exports.patchRequestToCaptureBody = patchRequestToCaptureBody;
//# sourceMappingURL=captureRequestBody.js.map
