"use strict";Object.defineProperty(exports, "__esModule", {value: true});// src/RequestController.ts
var _outvariant = require('outvariant');
var _deferredpromise = require('@open-draft/deferred-promise');

// src/InterceptorError.ts
var InterceptorError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InterceptorError";
    Object.setPrototypeOf(this, InterceptorError.prototype);
  }
};

// src/RequestController.ts
var kRequestHandled = Symbol("kRequestHandled");
var kResponsePromise = Symbol("kResponsePromise");
var RequestController = class {
  constructor(request) {
    this.request = request;
    this[kRequestHandled] = false;
    this[kResponsePromise] = new (0, _deferredpromise.DeferredPromise)();
  }
  /**
   * Respond to this request with the given `Response` instance.
   * @example
   * controller.respondWith(new Response())
   * controller.respondWith(Response.json({ id }))
   * controller.respondWith(Response.error())
   */
  respondWith(response) {
    _outvariant.invariant.as(
      InterceptorError,
      !this[kRequestHandled],
      'Failed to respond to the "%s %s" request: the "request" event has already been handled.',
      this.request.method,
      this.request.url
    );
    this[kRequestHandled] = true;
    this[kResponsePromise].resolve(response);
  }
  /**
   * Error this request with the given error.
   * @example
   * controller.errorWith()
   * controller.errorWith(new Error('Oops!'))
   */
  errorWith(error) {
    _outvariant.invariant.as(
      InterceptorError,
      !this[kRequestHandled],
      'Failed to error the "%s %s" request: the "request" event has already been handled.',
      this.request.method,
      this.request.url
    );
    this[kRequestHandled] = true;
    this[kResponsePromise].resolve(error);
  }
};
kResponsePromise, kRequestHandled;

// src/utils/emitAsync.ts
async function emitAsync(emitter, eventName, ...data) {
  const listners = emitter.listeners(eventName);
  if (listners.length === 0) {
    return;
  }
  for (const listener of listners) {
    await listener.apply(emitter, data);
  }
}

// src/utils/handleRequest.ts

var _until = require('@open-draft/until');

// src/utils/isPropertyAccessible.ts
function isPropertyAccessible(obj, key) {
  try {
    obj[key];
    return true;
  } catch (e) {
    return false;
  }
}

// src/utils/responseUtils.ts
function createServerErrorResponse(body) {
  return new Response(
    JSON.stringify(
      body instanceof Error ? {
        name: body.name,
        message: body.message,
        stack: body.stack
      } : body
    ),
    {
      status: 500,
      statusText: "Unhandled Exception",
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
function isResponseError(response) {
  return isPropertyAccessible(response, "type") && response.type === "error";
}

// src/utils/isNodeLikeError.ts
function isNodeLikeError(error) {
  if (error == null) {
    return false;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  return "code" in error && "errno" in error;
}

// src/utils/handleRequest.ts
async function handleRequest(options) {
  const handleResponse = async (response) => {
    if (response instanceof Error) {
      options.onError(response);
    } else if (isResponseError(response)) {
      options.onRequestError(response);
    } else {
      await options.onResponse(response);
    }
    return true;
  };
  const handleResponseError = async (error) => {
    if (error instanceof InterceptorError) {
      throw result.error;
    }
    if (isNodeLikeError(error)) {
      options.onError(error);
      return true;
    }
    if (error instanceof Response) {
      return await handleResponse(error);
    }
    return false;
  };
  options.emitter.once("request", ({ requestId: pendingRequestId }) => {
    if (pendingRequestId !== options.requestId) {
      return;
    }
    if (options.controller[kResponsePromise].state === "pending") {
      options.controller[kResponsePromise].resolve(void 0);
    }
  });
  const requestAbortPromise = new (0, _deferredpromise.DeferredPromise)();
  if (options.request.signal) {
    if (options.request.signal.aborted) {
      requestAbortPromise.reject(options.request.signal.reason);
    } else {
      options.request.signal.addEventListener(
        "abort",
        () => {
          requestAbortPromise.reject(options.request.signal.reason);
        },
        { once: true }
      );
    }
  }
  const result = await _until.until.call(void 0, async () => {
    const requestListtenersPromise = emitAsync(options.emitter, "request", {
      requestId: options.requestId,
      request: options.request,
      controller: options.controller
    });
    await Promise.race([
      // Short-circuit the request handling promise if the request gets aborted.
      requestAbortPromise,
      requestListtenersPromise,
      options.controller[kResponsePromise]
    ]);
    const mockedResponse = await options.controller[kResponsePromise];
    return mockedResponse;
  });
  if (requestAbortPromise.state === "rejected") {
    options.onError(requestAbortPromise.rejectionReason);
    return true;
  }
  if (result.error) {
    if (await handleResponseError(result.error)) {
      return true;
    }
    if (options.emitter.listenerCount("unhandledException") > 0) {
      const unhandledExceptionController = new RequestController(
        options.request
      );
      await emitAsync(options.emitter, "unhandledException", {
        error: result.error,
        request: options.request,
        requestId: options.requestId,
        controller: unhandledExceptionController
      }).then(() => {
        if (unhandledExceptionController[kResponsePromise].state === "pending") {
          unhandledExceptionController[kResponsePromise].resolve(void 0);
        }
      });
      const nextResult = await _until.until.call(void 0, 
        () => unhandledExceptionController[kResponsePromise]
      );
      if (nextResult.error) {
        return handleResponseError(nextResult.error);
      }
      if (nextResult.data) {
        return handleResponse(nextResult.data);
      }
    }
    options.onResponse(createServerErrorResponse(result.error));
    return true;
  }
  if (result.data) {
    return handleResponse(result.data);
  }
  return false;
}







exports.isPropertyAccessible = isPropertyAccessible; exports.createServerErrorResponse = createServerErrorResponse; exports.RequestController = RequestController; exports.emitAsync = emitAsync; exports.handleRequest = handleRequest;
//# sourceMappingURL=chunk-6L3PFBGT.js.map