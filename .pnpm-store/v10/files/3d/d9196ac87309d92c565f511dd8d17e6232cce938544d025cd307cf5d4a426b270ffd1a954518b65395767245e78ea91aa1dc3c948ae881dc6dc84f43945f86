// src/manifest.ts
import { MethodDescriptor } from "./method-descriptor.mjs";
import { assign } from "./utils/index.mjs";
var Manifest = class {
  allowResourceHostOverride;
  authAttr;
  bodyAttr;
  clientId;
  context;
  gatewayConfigs;
  headersAttr;
  host;
  hostAttr;
  middleware;
  parameterEncoder;
  resources;
  signalAttr;
  timeoutAttr;
  constructor(options, { gatewayConfigs, middleware = [], context = {} }) {
    this.allowResourceHostOverride = options.allowResourceHostOverride || false;
    this.authAttr = options.authAttr;
    this.bodyAttr = options.bodyAttr;
    this.clientId = options.clientId || null;
    this.context = context;
    this.gatewayConfigs = assign({}, gatewayConfigs, options.gatewayConfigs);
    this.headersAttr = options.headersAttr;
    this.host = options.host;
    this.hostAttr = options.hostAttr;
    this.parameterEncoder = options.parameterEncoder || encodeURIComponent;
    this.resources = options.resources || {};
    this.signalAttr = options.signalAttr;
    this.timeoutAttr = options.timeoutAttr;
    const clientMiddleware = options.middleware || options.middlewares || [];
    if (options.ignoreGlobalMiddleware) {
      this.middleware = clientMiddleware;
    } else {
      this.middleware = [...clientMiddleware, ...middleware];
    }
  }
  eachResource(callback) {
    Object.keys(this.resources).forEach((resourceName) => {
      const methods = this.eachMethod(resourceName, (methodName) => ({
        name: methodName,
        descriptor: this.createMethodDescriptor(resourceName, methodName)
      }));
      callback(resourceName, methods);
    });
  }
  eachMethod(resourceName, callback) {
    return Object.keys(this.resources[resourceName]).map(callback);
  }
  createMethodDescriptor(resourceName, methodName) {
    const definition = this.resources[resourceName][methodName];
    if (!definition || !["string", "function"].includes(typeof definition.path)) {
      throw new Error(
        `[Mappersmith] path is undefined for resource "${resourceName}" method "${methodName}"`
      );
    }
    return new MethodDescriptor(
      assign(
        {
          host: this.host,
          allowResourceHostOverride: this.allowResourceHostOverride,
          parameterEncoder: this.parameterEncoder,
          bodyAttr: this.bodyAttr,
          headersAttr: this.headersAttr,
          authAttr: this.authAttr,
          timeoutAttr: this.timeoutAttr,
          hostAttr: this.hostAttr,
          signalAttr: this.signalAttr
        },
        definition
      )
    );
  }
  /**
   * @param {Object} args
   *   @param {String|Null} args.clientId
   *   @param {String} args.resourceName
   *   @param {String} args.resourceMethod
   *   @param {Object} args.context
   *   @param {Boolean} args.mockRequest
   *
   * @return {Array<Object>}
   */
  createMiddleware(args) {
    const createInstance = (middlewareFactory) => {
      const defaultDescriptor = {
        __name: middlewareFactory.name || middlewareFactory.toString(),
        response(next) {
          return next();
        },
        /**
         * @since 2.27.0
         * Replaced the request method
         */
        prepareRequest(next) {
          return this.request ? next().then((req) => {
            var _a;
            return (_a = this.request) == null ? void 0 : _a.call(this, req);
          }) : next();
        }
      };
      const middlewareParams = assign(args, {
        clientId: this.clientId,
        context: assign({}, this.context)
      });
      return assign(defaultDescriptor, middlewareFactory(middlewareParams));
    };
    const { resourceName: name, resourceMethod: method } = args;
    const resourceMiddleware = this.createMethodDescriptor(name, method).middleware;
    const middlewares = [...resourceMiddleware, ...this.middleware];
    return middlewares.map(createInstance);
  }
};
var manifest_default = Manifest;
export {
  Manifest,
  manifest_default as default
};
//# sourceMappingURL=manifest.mjs.map