// src/client-builder.ts
import {
  Manifest
} from "./manifest.mjs";
import { Request } from "./request.mjs";
var isFactoryConfigured = (factory) => {
  if (!factory || !factory()) {
    return false;
  }
  return true;
};
var ClientBuilder = class {
  Promise;
  manifest;
  GatewayClassFactory;
  maxMiddlewareStackExecutionAllowed;
  constructor(manifestDefinition, GatewayClassFactory, configs) {
    if (!manifestDefinition) {
      throw new Error(`[Mappersmith] invalid manifest (${manifestDefinition})`);
    }
    if (!isFactoryConfigured(GatewayClassFactory)) {
      throw new Error("[Mappersmith] gateway class not configured (configs.gateway)");
    }
    if (!configs.Promise) {
      throw new Error("[Mappersmith] Promise not configured (configs.Promise)");
    }
    this.Promise = configs.Promise;
    this.manifest = new Manifest(manifestDefinition, configs);
    this.GatewayClassFactory = GatewayClassFactory;
    this.maxMiddlewareStackExecutionAllowed = configs.maxMiddlewareStackExecutionAllowed;
  }
  build() {
    const client = { _manifest: this.manifest };
    this.manifest.eachResource((resourceName, methods) => {
      client[resourceName] = this.buildResource(resourceName, methods);
    });
    return client;
  }
  buildResource(resourceName, methods) {
    const initialResourceValue = {};
    const resource = methods.reduce((resource2, method) => {
      const resourceMethod = (requestParams, context) => {
        const request = new Request(method.descriptor, requestParams, context);
        return this.invokeMiddlewares(String(resourceName), method.name, request);
      };
      return {
        ...resource2,
        [method.name]: resourceMethod
      };
    }, initialResourceValue);
    return resource;
  }
  invokeMiddlewares(resourceName, resourceMethod, initialRequest) {
    const middleware = this.manifest.createMiddleware({ resourceName, resourceMethod });
    const GatewayClass = this.GatewayClassFactory();
    const gatewayConfigs = this.manifest.gatewayConfigs;
    const requestPhaseFailureContext = {
      middleware: null,
      returnedInvalidRequest: false,
      abortExecution: false
    };
    const getInitialRequest = () => this.Promise.resolve(initialRequest);
    const chainRequestPhase = (next, middleware2) => () => {
      const abort = (error) => {
        requestPhaseFailureContext.abortExecution = true;
        throw error;
      };
      return this.Promise.resolve().then(() => middleware2.prepareRequest(next, abort)).then((request) => {
        if (request instanceof Request) {
          return request;
        }
        requestPhaseFailureContext.returnedInvalidRequest = true;
        const typeValue = typeof request;
        const prettyType = typeValue === "object" || typeValue === "function" ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          request.name || typeValue
        ) : typeValue;
        throw new Error(
          `[Mappersmith] middleware "${middleware2.__name}" should return "Request" but returned "${prettyType}"`
        );
      }).catch((e) => {
        requestPhaseFailureContext.middleware = middleware2.__name || null;
        throw e;
      });
    };
    const prepareRequest = middleware.reduce(chainRequestPhase, getInitialRequest);
    let executions = 0;
    const executeMiddlewareStack = () => prepareRequest().catch((e) => {
      const { returnedInvalidRequest, abortExecution, middleware: middleware2 } = requestPhaseFailureContext;
      if (returnedInvalidRequest || abortExecution) {
        throw e;
      }
      const error = new Error(
        `[Mappersmith] middleware "${middleware2}" failed in the request phase: ${e.message}`
      );
      error.stack = e.stack;
      throw error;
    }).then((finalRequest) => {
      executions++;
      if (executions > this.maxMiddlewareStackExecutionAllowed) {
        throw new Error(
          `[Mappersmith] infinite loop detected (middleware stack invoked ${executions} times). Check the use of "renew" in one of the middleware.`
        );
      }
      const renew = executeMiddlewareStack;
      const chainResponsePhase = (previousValue, currentValue) => () => {
        const nextValue = currentValue.response(previousValue, renew, finalRequest);
        return nextValue;
      };
      const callGateway = () => new GatewayClass(finalRequest, gatewayConfigs).call();
      const execute = middleware.reduce(chainResponsePhase, callGateway);
      return execute();
    });
    return new this.Promise((resolve, reject) => {
      executeMiddlewareStack().then((response) => resolve(response)).catch(reject);
    });
  }
};
var client_builder_default = ClientBuilder;
export {
  ClientBuilder,
  client_builder_default as default
};
//# sourceMappingURL=client-builder.mjs.map