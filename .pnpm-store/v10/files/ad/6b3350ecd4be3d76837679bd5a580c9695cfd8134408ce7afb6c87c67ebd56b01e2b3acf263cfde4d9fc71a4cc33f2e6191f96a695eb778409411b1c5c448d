import { MirageError } from "./assert";
import Response from "./response";
import FunctionHandler from "./route-handlers/function";
import ObjectHandler from "./route-handlers/object";
import GetShorthandHandler from "./route-handlers/shorthands/get";
import PostShorthandHandler from "./route-handlers/shorthands/post";
import PutShorthandHandler from "./route-handlers/shorthands/put";
import DeleteShorthandHandler from "./route-handlers/shorthands/delete";
import HeadShorthandHandler from "./route-handlers/shorthands/head";

const DEFAULT_CODES = { get: 200, put: 204, post: 201, delete: 204 };

function createHandler({
  verb,
  schema,
  serializerOrRegistry,
  path,
  rawHandler,
  options,
  middleware,
}) {
  let handler;
  let args = [
    schema,
    serializerOrRegistry,
    rawHandler,
    path,
    options,
    middleware,
  ];
  let type = typeof rawHandler;

  if (type === "function") {
    handler = new FunctionHandler(...args);
  } else if (type === "object" && rawHandler) {
    handler = new ObjectHandler(...args);
  } else if (verb === "get") {
    handler = new GetShorthandHandler(...args);
  } else if (verb === "post") {
    handler = new PostShorthandHandler(...args);
  } else if (verb === "put" || verb === "patch") {
    handler = new PutShorthandHandler(...args);
  } else if (verb === "delete") {
    handler = new DeleteShorthandHandler(...args);
  } else if (verb === "head") {
    handler = new HeadShorthandHandler(...args);
  }
  return handler;
}

/**
 * @hide
 */
export default class RouteHandler {
  constructor({
    schema,
    verb,
    rawHandler,
    customizedCode,
    options,
    path,
    serializerOrRegistry,
    middleware,
  }) {
    this.verb = verb;
    this.customizedCode = customizedCode;
    this.serializerOrRegistry = serializerOrRegistry;
    this.middleware = middleware || [];
    this.handler = createHandler({
      verb,
      schema,
      path,
      serializerOrRegistry,
      rawHandler,
      options,
    });
  }

  handle(request) {
    return this._getMirageResponseForRequest(request, this.middleware)
      .then((mirageResponse) => this.serialize(mirageResponse, request))
      .then((serializedMirageResponse) => {
        return serializedMirageResponse.toRackResponse();
      });
  }

  _getMirageResponseForRequest(request, middleware = []) {
    let result;
    try {
      /*
       We need to do this for the #serialize convenience method. Probably is
       a better way.
     */
      if (this.handler instanceof FunctionHandler) {
        this.handler.setRequest(request);
      }

      result = this.handleWithMiddleware(request, [
        ...middleware,
        (_, req) => this.handler.handle(req),
      ]);
    } catch (e) {
      if (e instanceof MirageError) {
        result = new Response(500, {}, e);
      } else {
        let message = e.message || e;

        result = new Response(
          500,
          {},
          {
            message,
            stack: `Mirage: Your ${request.method} handler for the url ${
              request.url
            } threw an error:\n\n${e.stack || e}`,
          }
        );
      }
    }

    return this._toMirageResponse(result);
  }

  handleWithMiddleware(request, middleware) {
    const [current, ...remaining] = middleware;
    return current(this.schema, request, (req = request) => {
      return this.handleWithMiddleware(req, remaining);
    });
  }

  _toMirageResponse(result) {
    let mirageResponse;

    return new Promise((resolve, reject) => {
      Promise.resolve(result)
        .then((response) => {
          if (response instanceof Response) {
            mirageResponse = result;
          } else {
            let code = this._getCodeForResponse(response);
            mirageResponse = new Response(code, {}, response);
          }
          resolve(mirageResponse);
        })
        .catch(reject);
    });
  }

  _getCodeForResponse(response) {
    let code;
    if (this.customizedCode) {
      code = this.customizedCode;
    } else {
      code = DEFAULT_CODES[this.verb];
      // Returning any data for a 204 is invalid
      if (code === 204 && response !== undefined && response !== "") {
        code = 200;
      }
    }
    return code;
  }

  serialize(mirageResponse, request) {
    mirageResponse.data = this.serializerOrRegistry.serialize(
      mirageResponse.data,
      request
    );

    return mirageResponse;
  }
}
