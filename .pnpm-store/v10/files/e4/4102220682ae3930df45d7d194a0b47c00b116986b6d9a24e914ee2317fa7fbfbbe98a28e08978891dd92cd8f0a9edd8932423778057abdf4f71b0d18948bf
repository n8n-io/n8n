import { SpanStatusCode } from '@opentelemetry/api';
import { spanRequestSymbol } from './constants.js';

// Vendored from: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/407f61591ba69a39a6908264379d4d98a48dbec4/plugins/node/opentelemetry-instrumentation-fastify/src/utils.ts
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable @typescript-eslint/no-dynamic-delete */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * Starts Span
 * @param reply - reply function
 * @param tracer - tracer
 * @param spanName - span name
 * @param spanAttributes - span attributes
 */
function startSpan(
  reply,
  tracer,
  spanName,
  spanAttributes = {},
) {
  const span = tracer.startSpan(spanName, { attributes: spanAttributes });

  const spans = reply[spanRequestSymbol] || [];
  spans.push(span);

  Object.defineProperty(reply, spanRequestSymbol, {
    enumerable: false,
    configurable: true,
    value: spans,
  });

  return span;
}

/**
 * Ends span
 * @param reply - reply function
 * @param err - error
 */
function endSpan(reply, err) {
  const spans = reply[spanRequestSymbol] || [];
  // there is no active span, or it has already ended
  if (!spans.length) {
    return;
  }
  // biome-ignore lint/complexity/noForEach: <explanation>
  spans.forEach((span) => {
    if (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err.message,
      });
      span.recordException(err);
    }
    span.end();
  });
  delete reply[spanRequestSymbol];
}

// @TODO after approve add this to instrumentation package and replace usage
// when it will be released

/**
 * This function handles the missing case from instrumentation package when
 * execute can either return a promise or void. And using async is not an
 * option as it is producing unwanted side effects.
 * @param execute - function to be executed
 * @param onFinish - function called when function executed
 * @param preventThrowingError - prevent to throw error when execute
 * function fails
 */

function safeExecuteInTheMiddleMaybePromise(
  execute,
  onFinish,
  preventThrowingError,
) {
  let error;
  let result = undefined;
  try {
    result = execute();

    if (isPromise(result)) {
      result.then(
        res => onFinish(undefined, res),
        err => onFinish(err),
      );
    }
  } catch (e) {
    error = e;
  } finally {
    if (!isPromise(result)) {
      onFinish(error, result);
      if (error && true) {
        // eslint-disable-next-line no-unsafe-finally
        throw error;
      }
    }
    // eslint-disable-next-line no-unsafe-finally
    return result;
  }
}

function isPromise(val) {
  return (
    (typeof val === 'object' && val && typeof Object.getOwnPropertyDescriptor(val, 'then')?.value === 'function') ||
    false
  );
}

export { endSpan, safeExecuteInTheMiddleMaybePromise, startSpan };
//# sourceMappingURL=utils.js.map
