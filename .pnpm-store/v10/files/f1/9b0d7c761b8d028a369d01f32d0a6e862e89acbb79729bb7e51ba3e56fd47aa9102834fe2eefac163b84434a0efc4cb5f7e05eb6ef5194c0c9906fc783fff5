/* eslint no-console: 0 */

import { camelize } from "./utils/inflector";
import isAssociation from "./utils/is-association";
import assert from "./assert";
import BelongsTo from "./orm/associations/belongs-to";
import Container from "./container";
import { singularize, pluralize } from "inflected";
import pick from "lodash/pick";
import assign from "lodash/assign";
import find from "lodash/find";
import isPlainObject from "lodash/isPlainObject";
import isInteger from "lodash/isInteger";

import PretenderConfig from "./mock-server/pretender-config";

const isPluralForModelCache = {};

const defaultInflector = { singularize, pluralize };

/**
 * Creates a Server
 * @param {Object} options Server's configuration object
 * @param {String} options.urlPrefix The base URL for the routes. Example: `http://miragejs.com`.
 * @param {String} options.namespace The default namespace for the `Server`. Example: `/api/v1`.
 * @param {Number} options.timing Default latency for the routes to respond to a request.
 * @param {String} options.environment Defines the environment of the `Server`.
 * @param {Boolean} options.trackRequests Pretender `trackRequests`.
 * @param {Boolean} options.useDefaultPassthroughs True to use mirage provided passthroughs
 * @param {Boolean} options.logging Set to true or false to explicitly specify logging behavior.
 * @param {Function} options.seeds Called on the seed phase. Should be used to seed the database.
 * @param {Function} options.scenarios Alias for seeds.
 * @param {Function} options.routes Should be used to define server routes.
 * @param {Function} options.baseConfig Alias for routes.
 * @param {Object} options.inflector Default inflector (used for pluralization and singularization).
 * @param {Object} options.identityManagers Database identity managers.
 * @param {Object} options.models Server models
 * @param {Object} options.serializers Server serializers
 * @param {Object} options.factories Server factories
 * @param {Object} options.pretender Pretender instance
 */
export function createServer(options) {
  return new Server(options);
}

/**
  The Mirage server.

  Note that `this` within your `routes` function refers to the server instance, which is the same instance that `server` refers to in your tests.

  @class Server
  @public
*/
export default class Server {
  /**
   * Creates a Server
   * @param {Object} options Server's configuration object
   * @param {String} options.urlPrefix The base URL for the routes. Example: `http://miragejs.com`.
   * @param {String} options.namespace The default namespace for the `Server`. Example: `/api/v1`.
   * @param {Number} options.timing Default latency for the routes to respond to a request.
   * @param {String} options.environment Defines the environment of the `Server`.
   * @param {Boolean} options.trackRequests Pretender `trackRequests`.
   * @param {Boolean} options.useDefaultPassthroughs True to use mirage provided passthroughs
   * @param {Boolean} options.logging Set to true or false to explicitly specify logging behavior.
   * @param {Function} options.seeds Called on the seed phase. Should be used to seed the database.
   * @param {Function} options.scenarios Alias for seeds.
   * @param {Function} options.routes Should be used to define server routes.
   * @param {Function} options.baseConfig Alias for routes.
   * @param {Object} options.inflector Default inflector (used for pluralization and singularization).
   * @param {Object} options.identityManagers Database identity managers.
   * @param {Object} options.models Server models
   * @param {Object} options.serializers Server serializers
   * @param {Object} options.factories Server factories
   * @param {Object} options.pretender Pretender instance
   */
  constructor(options = {}) {
    this._container = new Container();
    this.config(options);

    /**
      Returns the Mirage Db instance.

      @property db
      @return Db
    */
    this.db = this.db || undefined;

    /**
      Returns the Mirage Schema (ORM) instance.

      @property schema
      @return Schema
    */
    this.schema = this.schema || undefined;

    this.middleware = [];
  }

  // todo deprecate following
  get namespace() {
    return this.interceptor.namespace;
  }
  set namespace(value) {
    this.interceptor.namespace = value;
  }

  // todo deprecate following
  get urlPrefix() {
    return this.interceptor.urlPrefix;
  }
  set urlPrefix(value) {
    this.interceptor.urlPrefix = value;
  }

  // todo deprecate following
  get timing() {
    return this.interceptor.timing;
  }
  set timing(value) {
    this.interceptor.timing = value;
  }

  // todo deprecate following
  get passthroughChecks() {
    return this.interceptor.passthroughChecks;
  }
  set passthroughChecks(value) {
    this.interceptor.passthroughChecks = value;
  }

  config(config = {}) {
    if (!config.interceptor) {
      config.interceptor = new PretenderConfig();
    }

    if (this.interceptor) {
      this.interceptor.config(config);
    } else {
      this.interceptor = config.interceptor;
      this.interceptor.create(this, config);
    }

    let didOverrideConfig =
      config.environment &&
      this.environment &&
      this.environment !== config.environment;
    assert(
      !didOverrideConfig,
      "You cannot modify Mirage's environment once the server is created"
    );
    this.environment = config.environment || this.environment || "development";

    if (config.routes) {
      assert(
        !config.baseConfig,
        "The routes option is an alias for the baseConfig option. You can't pass both options into your server definition."
      );
      config.baseConfig = config.routes;
    }

    if (config.seeds) {
      assert(
        !config.scenarios,
        "The seeds option is an alias for the scenarios.default option. You can't pass both options into your server definition."
      );
      config.scenarios = { default: config.seeds };
    }

    this._config = config;

    /**
      Mirage needs know the singular and plural versions of certain words for some of its APIs to work.

      For example, whenever you define a model

      ```js
      createServer({
        models: {
          post: Model
        }
      })
      ```

      Mirage will pluralize the word "post" and use it to create a `db.posts` database collection.

      To accomplish this, Mirage uses an object called an Inflector. An Inflector is an object with two methods, `singularize` and `pluralize`, that Mirage will call whenever it needs to inflect a word.

      Mirage has a default inflector, so if you write

      ```js
      createServer()
      ```

      you'll be using the node [inflected](https://github.com/martinandert/inflected#readme) package. This can be customized if you have irregular words or need to change the defaults. You can wead more in [the guide on customizing inflections](/docs/advanced/customizing-inflections).

      You typically should be able to make your customizations using the provided inflector. It's good to match any custom inflections your backend uses, as this will keep your Mirage code more consistent and simpler.

      You can also override the inflector completely and provide your own `pluralize` and `singularize` methods:

      ```js
      createServer({
        inflector: {
          pluralize(word) {
            // your logic
          },
          singularize(word) {
            // your logic
          }
        }
      })
      ```
    */
    this.inflector = config.inflector || defaultInflector;
    this._container.register("inflector", this.inflector);

    /**
      Set to `true` or `false` to explicitly specify logging behavior.

      By default, server responses are logged in non-testing environments. Logging is disabled by default in testing, so as not to clutter CI test runner output.

      For example, to enable logging in tests, write the following:

      ```js
      test('I can view all users', function() {
        server.logging = true;
        server.create('user');

        visit('/users');
        // ...
      });
      ```

      You can also write a custom log message using the [Pretender server's `handledRequest` hook](https://github.com/pretenderjs/pretender#handled-requests). (You can access the pretender server from your Mirage server via `server.pretender`.)

      To override,

      ```js
      createServer({
        routes() {
          this.pretender.handledRequest = function(verb, path, request) {
            let { responseText } = request;
            // log request and response data
          }
        }
      })
      ```

      @property logging
      @return {Boolean}
      @public
    */
    this.logging = config.logging !== undefined ? this.logging : undefined;

    this.testConfig = this.testConfig || undefined;

    this.trackRequests = config.trackRequests;

    if (this.db) {
      this.db.registerIdentityManagers(config.identityManagers);
    } else {
      this.db = this._container.create(
        "Db",
        undefined,
        config.identityManagers
      );
    }

    if (this.schema) {
      this.schema.registerModels(config.models);
      this.serializerOrRegistry.registerSerializers(config.serializers || {});
    } else {
      this.schema = this._container.create("Schema", this.db, config.models);
      this.serializerOrRegistry = this._container.create(
        "SerializerRegistry",
        this.schema,
        config.serializers
      );
    }

    let hasFactories = this._hasModulesOfType(config, "factories");
    let hasDefaultScenario =
      config.scenarios &&
      Object.prototype.hasOwnProperty.call(config.scenarios, "default");

    if (config.baseConfig) {
      this.loadConfig(config.baseConfig);
    }

    if (this.isTest()) {
      this.loadConfig(config.testConfig);

      if (typeof window !== "undefined") {
        window.server = this; // TODO: Better way to inject server into test env
      }
    }

    if (this.isTest() && hasFactories) {
      this.loadFactories(config.factories);
    } else if (!this.isTest() && hasDefaultScenario) {
      this.loadFactories(config.factories);
      config.scenarios.default(this);
    } else {
      this.loadFixtures();
    }

    this.interceptor.start?.();
  }

  /**
   * Determines if the current environment is the testing environment.
   *
   * @method isTest
   * @return {Boolean} True if the environment is 'test', false otherwise.
   * @public
   * @hide
   */
  isTest() {
    return this.environment === "test";
  }

  /**
    Determines if the server should log.

    @method shouldLog
    @return The value of this.logging if defined, or false if in the testing environment,
    true otherwise.
    @public
    @hide
  */
  shouldLog() {
    return typeof this.logging !== "undefined" ? this.logging : !this.isTest();
  }

  /**
   * Load the configuration given, setting timing to 0 if in the test
   * environment.
   *
   * @method loadConfig
   * @param {Object} config The configuration to load.
   * @public
   * @hide
   */
  loadConfig(config) {
    config?.call(this);
    this.timing = this.isTest() ? 0 : this.timing || 0;
  }

  // TODO deprecate this in favor of direct call
  passthrough(...paths) {
    this.interceptor.passthrough?.(...paths);
  }

  /**
    By default, `fixtures` will be loaded during testing if you don't have factories defined, and during development if you don't have `seeds` defined. You can use `loadFixtures()` to also load fixture files in either of these environments, in addition to using factories to seed your database.

    `server.loadFixtures()` loads all the files, and `server.loadFixtures(file1, file2...)` loads selective fixture files.

    For example, in a test you may want to start out with all your fixture data loaded:

    ```js
    test('I can view the photos', function() {
      server.loadFixtures();
      server.createList('photo', 10);

      visit('/');

      andThen(() => {
        equal( find('img').length, 10 );
      });
    });
    ```

    or in development, you may want to load a few reference fixture files, and use factories to define the rest of your data:

    ```js
    createServer({
      ...,
      seeds(server) {
        server.loadFixtures('countries', 'states');

        let author = server.create('author');
        server.createList('post', 10, {author_id: author.id});
      }
    })
    ```

    @method loadFixtures
    @param {String} [...args] The name of the fixture to load.
    @public
  */
  loadFixtures(...args) {
    let { fixtures } = this._config;

    if (args.length) {
      let camelizedArgs = args.map(camelize);

      let missingKeys = camelizedArgs.filter((key) => !fixtures[key]);
      if (missingKeys.length) {
        throw new Error(`Fixtures not found: ${missingKeys.join(", ")}`);
      }

      fixtures = pick(fixtures, ...camelizedArgs);
    }

    this.db.loadData(fixtures);
  }

  /*
    Factory methods
  */

  /**
   * Load factories into Mirage's database.
   *
   * @method loadFactories
   * @param {Object} factoryMap
   * @public
   * @hide
   */
  loadFactories(factoryMap = {}) {
    // Store a reference to the factories
    let currentFactoryMap = this._factoryMap || {};
    this._factoryMap = assign(currentFactoryMap, factoryMap);

    // Create a collection for each factory
    Object.keys(factoryMap).forEach((type) => {
      let collectionName = this.schema.toCollectionName(type);
      this.db.createCollection(collectionName);
    });
  }

  /**
   * Get the factory for a given type.
   *
   * @method factoryFor
   * @param {String} type
   * @private
   * @hide
   */
  factoryFor(type) {
    let camelizedType = camelize(type);

    if (this._factoryMap && this._factoryMap[camelizedType]) {
      return this._factoryMap[camelizedType];
    }
  }

  build(type, ...traitsAndOverrides) {
    let traits = traitsAndOverrides.filter(
      (arg) => arg && typeof arg === "string"
    );
    let overrides = find(traitsAndOverrides, (arg) => isPlainObject(arg));
    let camelizedType = camelize(type);

    // Store sequence for factory type as instance variable
    this.factorySequences = this.factorySequences || {};
    this.factorySequences[camelizedType] =
      this.factorySequences[camelizedType] + 1 || 0;

    let OriginalFactory = this.factoryFor(type);
    if (OriginalFactory) {
      OriginalFactory = OriginalFactory.extend({});
      let attrs = OriginalFactory.attrs || {};
      this._validateTraits(traits, OriginalFactory, type);
      let mergedExtensions = this._mergeExtensions(attrs, traits, overrides);
      this._mapAssociationsFromAttributes(type, attrs, overrides);
      this._mapAssociationsFromAttributes(type, mergedExtensions);

      let Factory = OriginalFactory.extend(mergedExtensions);
      let factory = new Factory();

      let sequence = this.factorySequences[camelizedType];
      return factory.build(sequence);
    } else {
      return overrides;
    }
  }

  buildList(type, amount, ...traitsAndOverrides) {
    assert(
      isInteger(amount),
      `second argument has to be an integer, you passed: ${typeof amount}`
    );

    let list = [];

    const buildArgs = [type, ...traitsAndOverrides];
    for (let i = 0; i < amount; i++) {
      list.push(this.build.apply(this, buildArgs));
    }

    return list;
  }

  /**
    Generates a single model of type *type*, inserts it into the database (giving it an id), and returns the data that was
    added.

    ```js
    test("I can view a contact's details", function() {
      let contact = server.create('contact');

      visit('/contacts/' + contact.id);

      andThen(() => {
        equal( find('h1').text(), 'The contact is Link');
      });
    });
    ```

    You can override the attributes from the factory definition with a
    hash passed in as the second parameter. For example, if we had this factory

    ```js
    export default Factory.extend({
      name: 'Link'
    });
    ```

    we could override the name like this:

    ```js
    test("I can view the contacts", function() {
      server.create('contact', {name: 'Zelda'});

      visit('/');

      andThen(() => {
        equal( find('p').text(), 'Zelda' );
      });
    });
    ```

    @method create
    @param type the singularized type of the model
    @param traitsAndOverrides
    @public
  */
  create(type, ...options) {
    assert(
      this._modelOrFactoryExistsForType(type),
      `You called server.create('${type}') but no model or factory was found. Make sure you're passing in the singularized version of the model or factory name.`
    );

    // When there is a Model defined, we should return an instance
    // of it instead of returning the bare attributes.
    let traits = options.filter((arg) => arg && typeof arg === "string");
    let overrides = find(options, (arg) => isPlainObject(arg));
    let collectionFromCreateList = find(
      options,
      (arg) => arg && Array.isArray(arg)
    );

    let attrs = this.build(type, ...traits, overrides);
    let modelOrRecord;

    if (this.schema && this.schema[this.schema.toCollectionName(type)]) {
      let modelClass = this.schema[this.schema.toCollectionName(type)];

      modelOrRecord = modelClass.create(attrs);
    } else {
      let collection, collectionName;

      if (collectionFromCreateList) {
        collection = collectionFromCreateList;
      } else {
        collectionName = this.schema
          ? this.schema.toInternalCollectionName(type)
          : `_${this.inflector.pluralize(type)}`;
        collection = this.db[collectionName];
      }

      assert(
        collection,
        `You called server.create('${type}') but no model or factory was found.`
      );
      modelOrRecord = collection.insert(attrs);
    }

    let OriginalFactory = this.factoryFor(type);
    if (OriginalFactory) {
      OriginalFactory.extractAfterCreateCallbacks({ traits }).forEach(
        (afterCreate) => {
          afterCreate(modelOrRecord, this);
        }
      );
    }

    return modelOrRecord;
  }

  /**
    Creates *amount* models of type *type*, optionally overriding the attributes from the factory with *attrs*.

    Returns the array of records that were added to the database.

    Here's an example from a test:

    ```js
    test("I can view the contacts", function() {
      server.createList('contact', 5);
      let youngContacts = server.createList('contact', 5, {age: 15});

      visit('/');

      andThen(function() {
        equal(currentRouteName(), 'index');
        equal( find('p').length, 10 );
      });
    });
    ```

    And one from setting up your development database:

    ```js
    createServer({
      seeds(server) {
        let contact = server.create('contact')

        server.createList('address', 5, { contact })
      }
    })
    ```

    @method createList
    @param type
    @param amount
    @param traitsAndOverrides
    @public
  */
  createList(type, amount, ...traitsAndOverrides) {
    assert(
      this._modelOrFactoryExistsForType(type),
      `You called server.createList('${type}') but no model or factory was found. Make sure you're passing in the singularized version of the model or factory name.`
    );
    assert(
      isInteger(amount),
      `second argument has to be an integer, you passed: ${typeof amount}`
    );

    let list = [];
    let collectionName = this.schema
      ? this.schema.toInternalCollectionName(type)
      : `_${this.inflector.pluralize(type)}`;
    let collection = this.db[collectionName];

    const createArguments = [type, ...traitsAndOverrides, collection];

    for (let i = 0; i < amount; i++) {
      list.push(this.create.apply(this, createArguments));
    }

    return list;
  }

  /**
    Shutdown the server and stop intercepting network requests.

    @method shutdown
    @public
  */
  shutdown() {
    if (typeof window !== "undefined") {
      this.interceptor.shutdown();
    }

    if (typeof window !== "undefined" && this.environment === "test") {
      window.server = undefined;
    }
  }

  resource(resourceName, { only, except, path } = {}) {
    resourceName = this.inflector.pluralize(resourceName);
    path = path || `/${resourceName}`;
    only = only || [];
    except = except || [];

    if (only.length > 0 && except.length > 0) {
      throw "cannot use both :only and :except options";
    }

    let actionsMethodsAndsPathsMappings = {
      index: { methods: ["get"], path: `${path}` },
      show: { methods: ["get"], path: `${path}/:id` },
      create: { methods: ["post"], path: `${path}` },
      update: { methods: ["put", "patch"], path: `${path}/:id` },
      delete: { methods: ["del"], path: `${path}/:id` },
    };

    let allActions = Object.keys(actionsMethodsAndsPathsMappings);
    let actions =
      (only.length > 0 && only) ||
      (except.length > 0 &&
        allActions.filter((action) => except.indexOf(action) === -1)) ||
      allActions;

    actions.forEach((action) => {
      let methodsWithPath = actionsMethodsAndsPathsMappings[action];

      methodsWithPath.methods.forEach((method) => {
        return path === resourceName
          ? this[method](methodsWithPath.path)
          : this[method](methodsWithPath.path, resourceName);
      });
    });
  }

  _serialize(body) {
    if (typeof body === "string") {
      return body;
    } else {
      return JSON.stringify(body);
    }
  }

  registerRouteHandler(
    verb,
    path,
    rawHandler,
    customizedCode,
    options,
    middleware = this.middleware
  ) {
    let routeHandler = this._container.create("RouteHandler", {
      schema: this.schema,
      verb,
      rawHandler,
      customizedCode,
      options,
      path,
      serializerOrRegistry: this.serializerOrRegistry,
      middleware,
    });

    return (request) => {
      return routeHandler.handle(request).then((mirageResponse) => {
        let [code, headers, response] = mirageResponse;

        return [code, headers, this._serialize(response)];
      });
    };
  }

  /**
   *
   * @private
   * @hide
   */
  _hasModulesOfType(modules, type) {
    let modulesOfType = modules[type];
    return modulesOfType ? Object.keys(modulesOfType).length > 0 : false;
  }

  /**
   *
   * @private
   * @hide
   */
  _typeIsPluralForModel(typeOrCollectionName) {
    if (typeof isPluralForModelCache[typeOrCollectionName] !== "boolean") {
      let modelOrFactoryExists =
        this._modelOrFactoryExistsForTypeOrCollectionName(typeOrCollectionName);
      let isPlural =
        typeOrCollectionName === this.inflector.pluralize(typeOrCollectionName);
      let isUncountable =
        this.inflector.singularize(typeOrCollectionName) ===
        this.inflector.pluralize(typeOrCollectionName);

      const isPluralForModel =
        isPlural && !isUncountable && modelOrFactoryExists;

      isPluralForModelCache[typeOrCollectionName] = isPluralForModel;
    }

    return isPluralForModelCache[typeOrCollectionName];
  }

  /**
   *
   * @private
   * @hide
   */
  _modelOrFactoryExistsForType(type) {
    let modelExists = this.schema && this.schema.modelFor(camelize(type));
    let dbCollectionExists =
      this.db[this.schema.toInternalCollectionName(type)];

    return (
      (modelExists || dbCollectionExists) && !this._typeIsPluralForModel(type)
    );
  }

  /**
   *
   * @private
   * @hide
   */
  _modelOrFactoryExistsForTypeOrCollectionName(typeOrCollectionName) {
    let modelExists =
      this.schema && this.schema.modelFor(camelize(typeOrCollectionName));
    let dbCollectionExists =
      this.db[this.schema.toInternalCollectionName(typeOrCollectionName)];

    return modelExists || dbCollectionExists;
  }

  /**
   *
   * @private
   * @hide
   */
  _validateTraits(traits, factory, type) {
    traits.forEach((traitName) => {
      if (!factory.isTrait(traitName)) {
        throw new Error(
          `'${traitName}' trait is not registered in '${type}' factory`
        );
      }
    });
  }

  /**
   *
   * @private
   * @hide
   */
  _mergeExtensions(attrs, traits, overrides) {
    let allExtensions = traits.map((traitName) => {
      return attrs[traitName].extension;
    });
    allExtensions.push(overrides || {});
    return allExtensions.reduce((accum, extension) => {
      return assign(accum, extension);
    }, {});
  }

  /**
   *
   * @private
   * @hide
   */
  _mapAssociationsFromAttributes(modelName, attributes, overrides = {}) {
    Object.keys(attributes || {})
      .filter((attr) => {
        return isAssociation(attributes[attr]);
      })
      .forEach((attr) => {
        let modelClass = this.schema.modelClassFor(modelName);
        let association = modelClass.associationFor(attr);

        assert(
          association && association instanceof BelongsTo,
          `You're using the \`association\` factory helper on the '${attr}' attribute of your ${modelName} factory, but that attribute is not a \`belongsTo\` association.`
        );

        let isSelfReferentialBelongsTo =
          association &&
          association instanceof BelongsTo &&
          association.modelName === modelName;

        assert(
          !isSelfReferentialBelongsTo,
          `You're using the association() helper on your ${modelName} factory for ${attr}, which is a belongsTo self-referential relationship. You can't do this as it will lead to infinite recursion. You can move the helper inside of a trait and use it selectively.`
        );

        let isPolymorphic =
          association && association.opts && association.opts.polymorphic;

        assert(
          !isPolymorphic,
          `You're using the association() helper on your ${modelName} factory for ${attr}, which is a polymorphic relationship. This is not currently supported.`
        );

        let factoryAssociation = attributes[attr];
        let foreignKey = `${camelize(attr)}Id`;
        if (!overrides[attr]) {
          attributes[foreignKey] = this.create(
            association.modelName,
            ...factoryAssociation.traitsAndOverrides
          ).id;
        }
        delete attributes[attr];
      });
  }
}
