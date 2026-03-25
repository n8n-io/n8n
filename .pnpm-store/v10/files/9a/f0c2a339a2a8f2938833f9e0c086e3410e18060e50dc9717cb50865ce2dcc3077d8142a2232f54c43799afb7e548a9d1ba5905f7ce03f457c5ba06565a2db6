import "@miragejs/pretender-node-polyfill/before";
import Pretender from "pretender";
import "@miragejs/pretender-node-polyfill/after";
import assert from "../assert";
import assign from "lodash/assign";

/**
  Mirage Interceptor Class

    urlPrefix;

    namespace;

    // Creates the interceptor instance
    constructor(mirageServer, mirageConfig)

    // Allow you to change some of the config options after the server is created
    config(mirageConfig)

    // These are the equivalent of the functions that were on the Mirage Server.
    // Those Mirage Server functions are redirected to the Interceptors functions for
    // backward compatibility
    get
    post
    put
    delete
    del
    patch
    head
    options

    // Start the interceptor. (Optional) this happens after the mirage server has been completed configured
    // and all the models, routes, etc have been defined.
    start
    // Shutdown the interceptor instance
    shutdown

 */

/**
 @hide
 */
const defaultPassthroughs = [
  "http://localhost:0/chromecheckurl", // mobile chrome
  "http://localhost:30820/socket.io", // electron
  (request) => {
    return /.+\.hot-update.json$/.test(request.url);
  },
];

const defaultRouteOptions = {
  coalesce: false,
  timing: undefined,
};

/**
 * Determine if the object contains a valid option.
 *
 * @method isOption
 * @param {Object} option An object with one option value pair.
 * @return {Boolean} True if option is a valid option, false otherwise.
 * @private
 */
function isOption(option) {
  if (!option || typeof option !== "object") {
    return false;
  }

  let allOptions = Object.keys(defaultRouteOptions);
  let optionKeys = Object.keys(option);
  for (let i = 0; i < optionKeys.length; i++) {
    let key = optionKeys[i];
    if (allOptions.indexOf(key) > -1) {
      return true;
    }
  }
  return false;
}

/**
 @hide
 */
export { defaultPassthroughs };

/**
 * Extract arguments for a route.
 *
 * @method extractRouteArguments
 * @param {Array} args Of the form [options], [object, code], [function, code]
 * [shorthand, options], [shorthand, code, options]
 * @return {Array} [handler (i.e. the function, object or shorthand), code,
 * options].
 */
function extractRouteArguments(args) {
  let [lastArg] = args.splice(-1);
  if (isOption(lastArg)) {
    lastArg = assign({}, defaultRouteOptions, lastArg);
  } else {
    args.push(lastArg);
    lastArg = defaultRouteOptions;
  }
  let t = 2 - args.length;
  while (t-- > 0) {
    args.push(undefined);
  }
  args.push(lastArg);
  return args;
}

export default class PretenderConfig {
  urlPrefix;

  namespace;

  timing;

  passthroughChecks;

  pretender;

  mirageServer;

  trackRequests;

  create(mirageServer, config) {
    this.mirageServer = mirageServer;
    this.pretender = this._create(mirageServer, config);

    /**
     Mirage uses [pretender.js](https://github.com/trek/pretender) as its xhttp interceptor. In your Mirage config, `this.pretender` refers to the actual Pretender instance, so any config options that work there will work here as well.

     ```js
     createServer({
        routes() {
          this.pretender.handledRequest = (verb, path, request) => {
            console.log(`Your server responded to ${path}`);
          }
        }
      })
     ```

     Refer to [Pretender's docs](https://github.com/pretenderjs/pretender) if you want to change any options on your Pretender instance.

     @property pretender
     @return {Object} The Pretender instance
     @public
     */
    mirageServer.pretender = this.pretender;

    this.passthroughChecks = this.passthroughChecks || [];

    this.config(config);

    [
      ["get"],
      ["post"],
      ["put"],
      ["delete", "del"],
      ["patch"],
      ["head"],
      ["options"],
    ].forEach(([verb, alias]) => {
      this[verb] = (path, ...args) => {
        let [rawHandler, customizedCode, options] = extractRouteArguments(args);
        let handler = mirageServer.registerRouteHandler(
          verb,
          path,
          rawHandler,
          customizedCode,
          options
        );
        let fullPath = this._getFullPath(path);
        let timing =
          options.timing !== undefined ? options.timing : () => this.timing;
        return this.pretender?.[verb](fullPath, handler, timing);
      };

      mirageServer[verb] = this[verb];
      if (alias) {
        this[alias] = this[verb];
        mirageServer[alias] = this[verb];
      }
    });
  }

  config(config) {
    let useDefaultPassthroughs =
      typeof config.useDefaultPassthroughs !== "undefined"
        ? config.useDefaultPassthroughs
        : true;
    if (useDefaultPassthroughs) {
      this._configureDefaultPassthroughs();
    }

    let didOverridePretenderConfig =
      config.trackRequests !== undefined &&
      config.trackRequests !== this.trackRequests;
    assert(
      !didOverridePretenderConfig,
      "You cannot modify Pretender's request tracking once the server is created"
    );

    /**
     Set the number of milliseconds for the the Server's response time.

     By default there's a 400ms delay during development, and 0 delay in testing (so your tests run fast).

     ```js
     createServer({
        routes() {
          this.timing = 400; // default
        }
      })
     ```

     To set the timing for individual routes, see the `timing` option for route handlers.

     @property timing
     @type Number
     @public
     */
    this.timing = config.timing ?? this.timing ?? 400;

    /**
     Sets a string to prefix all route handler URLs with.

     Useful if your app makes API requests to a different port.

     ```js
     createServer({
        routes() {
          this.urlPrefix = 'http://localhost:8080'
        }
      })
     ```
     */
    this.urlPrefix = this.urlPrefix || config.urlPrefix || "";

    /**
     Set the base namespace used for all routes defined with `get`, `post`, `put` or `del`.

     For example,

     ```js
     createServer({
        routes() {
          this.namespace = '/api';

          // this route will handle the URL '/api/contacts'
          this.get('/contacts', 'contacts');
        }
      })
     ```

     Note that only routes defined after `this.namespace` are affected. This is useful if you have a few one-off routes that you don't want under your namespace:

     ```js
     createServer({
        routes() {

          // this route handles /auth
          this.get('/auth', function() { ...});

          this.namespace = '/api';
          // this route will handle the URL '/api/contacts'
          this.get('/contacts', 'contacts');
        };
      })
     ```

     If your app is loaded from the filesystem vs. a server (e.g. via Cordova or Electron vs. `localhost` or `https://yourhost.com/`), you will need to explicitly define a namespace. Likely values are `/` (if requests are made with relative paths) or `https://yourhost.com/api/...` (if requests are made to a defined server).

     For a sample implementation leveraging a configured API host & namespace, check out [this issue comment](https://github.com/miragejs/ember-cli-mirage/issues/497#issuecomment-183458721).

     @property namespace
     @type String
     @public
     */
    this.namespace = this.namespace || config.namespace || "";
  }

  /**
   *
   * @private
   * @hide
   */
  _configureDefaultPassthroughs() {
    defaultPassthroughs.forEach((passthroughUrl) => {
      this.passthrough(passthroughUrl);
    });
  }

  /**
   * Creates a new Pretender instance.
   *
   * @method _create
   * @param {Server} server
   * @return {Object} A new Pretender instance.
   * @public
   */
  _create(mirageServer, config) {
    if (typeof window !== "undefined") {
      this.trackRequests = config.trackRequests || false;
      return new Pretender(
        function () {
          this.passthroughRequest = function (verb, path, request) {
            if (mirageServer.shouldLog()) {
              console.log(
                `Mirage: Passthrough request for ${verb.toUpperCase()} ${
                  request.url
                }`
              );
            }
          };

          this.handledRequest = function (verb, path, request) {
            if (mirageServer.shouldLog()) {
              console.groupCollapsed(
                `Mirage: [${request.status}] ${verb.toUpperCase()} ${
                  request.url
                }`
              );
              let { requestBody, responseText } = request;
              let loggedRequest, loggedResponse;

              try {
                loggedRequest = JSON.parse(requestBody);
              } catch (e) {
                loggedRequest = requestBody;
              }

              try {
                loggedResponse = JSON.parse(responseText);
              } catch (e) {
                loggedResponse = responseText;
              }

              console.groupCollapsed("Response");
              console.log(loggedResponse);
              console.groupEnd();

              console.groupCollapsed("Request (data)");
              console.log(loggedRequest);
              console.groupEnd();

              console.groupCollapsed("Request (raw)");
              console.log(request);
              console.groupEnd();

              console.groupEnd();
            }
          };

          let originalCheckPassthrough = this.checkPassthrough;
          this.checkPassthrough = function (request) {
            let shouldPassthrough = mirageServer.passthroughChecks.some(
              (passthroughCheck) => passthroughCheck(request)
            );

            if (shouldPassthrough) {
              let url = request.url.includes("?")
                ? request.url.substr(0, request.url.indexOf("?"))
                : request.url;

              this[request.method.toLowerCase()](url, this.passthrough);
            }

            return originalCheckPassthrough.apply(this, arguments);
          };

          this.unhandledRequest = function (verb, path) {
            path = decodeURI(path);
            let namespaceError = "";
            if (this.namespace === "") {
              namespaceError =
                "There is no existing namespace defined. Please define one";
            } else {
              namespaceError = `The existing namespace is ${this.namespace}`;
            }
            assert(
              `Your app tried to ${verb} '${path}', but there was no route defined to handle this request. Define a route for this endpoint in your routes() config. Did you forget to define a namespace? ${namespaceError}`
            );
          };
        },
        { trackRequests: this.trackRequests }
      );
    }
  }

  /**
   By default, if your app makes a request that is not defined in your server config, Mirage will throw an error. You can use `passthrough` to whitelist requests, and allow them to pass through your Mirage server to the actual network layer.

   Note: Put all passthrough config at the bottom of your routes, to give your route handlers precedence.

   To ignore paths on your current host (as well as configured `namespace`), use a leading `/`:

   ```js
   this.passthrough('/addresses');
   ```

   You can also pass a list of paths, or call `passthrough` multiple times:

   ```js
   this.passthrough('/addresses', '/contacts');
   this.passthrough('/something');
   this.passthrough('/else');
   ```

   These lines will allow all HTTP verbs to pass through. If you want only certain verbs to pass through, pass an array as the last argument with the specified verbs:

   ```js
   this.passthrough('/addresses', ['post']);
   this.passthrough('/contacts', '/photos', ['get']);
   ```

   You can pass a function to `passthrough` to do a runtime check on whether or not the request should be handled by Mirage. If the function returns `true` Mirage will not handle the request and let it pass through.

   ```js
   this.passthrough(request => {
      return request.queryParams.skipMirage;
    });
   ```

   If you want all requests on the current domain to pass through, simply invoke the method with no arguments:

   ```js
   this.passthrough();
   ```

   Note again that the current namespace (i.e. any `namespace` property defined above this call) will be applied.

   You can also allow other-origin hosts to passthrough. If you use a fully-qualified domain name, the `namespace` property will be ignored. Use two * wildcards to match all requests under a path:

   ```js
   this.passthrough('http://api.foo.bar/**');
   this.passthrough('http://api.twitter.com/v1/cards/**');
   ```

   In versions of Pretender prior to 0.12, `passthrough` only worked with jQuery >= 2.x. As long as you're on Pretender@0.12 or higher, you should be all set.

   @method passthrough
   @param {String} [...paths] Any number of paths to whitelist
   @param {Array} options Unused
   @public
   */
  passthrough(...paths) {
    // this only works in browser-like environments for now. in node users will have to configure
    // their own interceptor if they are using one.
    if (typeof window !== "undefined") {
      let verbs = ["get", "post", "put", "delete", "patch", "options", "head"];
      let lastArg = paths[paths.length - 1];

      if (paths.length === 0) {
        paths = ["/**", "/"];
      } else if (paths.length > 1 && Array.isArray(lastArg)) {
        verbs = paths.pop();
      }

      paths.forEach((path) => {
        if (typeof path === "function") {
          this.passthroughChecks.push(path);
        } else {
          verbs.forEach((verb) => {
            let fullPath = this._getFullPath(path);
            this.pretender[verb](fullPath, this.pretender.passthrough);
          });
        }
      });
    }
  }

  /**
   * Builds a full path for Pretender to monitor based on the `path` and
   * configured options (`urlPrefix` and `namespace`).
   *
   * @private
   * @hide
   */
  _getFullPath(path) {
    path = path[0] === "/" ? path.slice(1) : path;
    let fullPath = "";
    let urlPrefix = this.urlPrefix ? this.urlPrefix.trim() : "";
    let namespace = "";

    // if there is a urlPrefix and a namespace
    if (this.urlPrefix && this.namespace) {
      if (
        this.namespace[0] === "/" &&
        this.namespace[this.namespace.length - 1] === "/"
      ) {
        namespace = this.namespace
          .substring(0, this.namespace.length - 1)
          .substring(1);
      }

      if (
        this.namespace[0] === "/" &&
        this.namespace[this.namespace.length - 1] !== "/"
      ) {
        namespace = this.namespace.substring(1);
      }

      if (
        this.namespace[0] !== "/" &&
        this.namespace[this.namespace.length - 1] === "/"
      ) {
        namespace = this.namespace.substring(0, this.namespace.length - 1);
      }

      if (
        this.namespace[0] !== "/" &&
        this.namespace[this.namespace.length - 1] !== "/"
      ) {
        namespace = this.namespace;
      }
    }

    // if there is a namespace and no urlPrefix
    if (this.namespace && !this.urlPrefix) {
      if (
        this.namespace[0] === "/" &&
        this.namespace[this.namespace.length - 1] === "/"
      ) {
        namespace = this.namespace.substring(0, this.namespace.length - 1);
      }

      if (
        this.namespace[0] === "/" &&
        this.namespace[this.namespace.length - 1] !== "/"
      ) {
        namespace = this.namespace;
      }

      if (
        this.namespace[0] !== "/" &&
        this.namespace[this.namespace.length - 1] === "/"
      ) {
        let namespaceSub = this.namespace.substring(
          0,
          this.namespace.length - 1
        );
        namespace = `/${namespaceSub}`;
      }

      if (
        this.namespace[0] !== "/" &&
        this.namespace[this.namespace.length - 1] !== "/"
      ) {
        namespace = `/${this.namespace}`;
      }
    }

    // if no namespace
    if (!this.namespace) {
      namespace = "";
    }

    // check to see if path is a FQDN. if so, ignore any urlPrefix/namespace that was set
    if (/^https?:\/\//.test(path)) {
      fullPath += path;
    } else {
      // otherwise, if there is a urlPrefix, use that as the beginning of the path
      if (urlPrefix.length) {
        fullPath +=
          urlPrefix[urlPrefix.length - 1] === "/" ? urlPrefix : `${urlPrefix}/`;
      }

      // add the namespace to the path
      fullPath += namespace;

      // add a trailing slash to the path if it doesn't already contain one
      if (fullPath[fullPath.length - 1] !== "/") {
        fullPath += "/";
      }

      // finally add the configured path
      fullPath += path;

      // if we're making a same-origin request, ensure a / is prepended and
      // dedup any double slashes
      if (!/^https?:\/\//.test(fullPath)) {
        fullPath = `/${fullPath}`;
        fullPath = fullPath.replace(/\/+/g, "/");
      }
    }

    return fullPath;
  }

  start() {
    // unneeded for pretender implementation
  }

  shutdown() {
    this.pretender.shutdown();
  }
}
