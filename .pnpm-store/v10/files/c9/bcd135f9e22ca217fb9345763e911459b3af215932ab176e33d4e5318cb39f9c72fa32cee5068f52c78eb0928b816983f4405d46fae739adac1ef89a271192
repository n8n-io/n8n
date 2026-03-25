import isPlainObject from 'lodash/isPlainObject';
import isFunction from 'lodash/isFunction';
import mapValues from 'lodash/mapValues';
import uniq from 'lodash/uniq';
import flatten from 'lodash/flatten';
import { camelize as camelize$1, dasherize as dasherize$1, underscore as underscore$1, capitalize as capitalize$1, singularize, pluralize } from 'inflected';
import lowerFirst from 'lodash/lowerFirst';
import isEqual from 'lodash/isEqual';
import map from 'lodash/map';
import cloneDeep from 'lodash/cloneDeep';
import invokeMap from 'lodash/invokeMap';
import compact from 'lodash/compact';
import has from 'lodash/has';
import values from 'lodash/values';
import isEmpty from 'lodash/isEmpty';
import get from 'lodash/get';
import uniqBy from 'lodash/uniqBy';
import forIn from 'lodash/forIn';
import pick from 'lodash/pick';
import assign from 'lodash/assign';
import find from 'lodash/find';
import isInteger from 'lodash/isInteger';
import '@miragejs/pretender-node-polyfill/before';
import Pretender from 'pretender';
import '@miragejs/pretender-node-polyfill/after';

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);

    if (enumerableOnly) {
      symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    }

    keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

function _typeof(obj) {
  "@babel/helpers - typeof";

  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  return _setPrototypeOf(o, p);
}

function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;

  try {
    Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}

function _construct(Parent, args, Class) {
  if (_isNativeReflectConstruct()) {
    _construct = Reflect.construct;
  } else {
    _construct = function _construct(Parent, args, Class) {
      var a = [null];
      a.push.apply(a, args);
      var Constructor = Function.bind.apply(Parent, a);
      var instance = new Constructor();
      if (Class) _setPrototypeOf(instance, Class.prototype);
      return instance;
    };
  }

  return _construct.apply(null, arguments);
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

function _possibleConstructorReturn(self, call) {
  if (call && (typeof call === "object" || typeof call === "function")) {
    return call;
  } else if (call !== void 0) {
    throw new TypeError("Derived constructors may only return object or undefined");
  }

  return _assertThisInitialized(self);
}

function _createSuper(Derived) {
  var hasNativeReflectConstruct = _isNativeReflectConstruct();

  return function _createSuperInternal() {
    var Super = _getPrototypeOf(Derived),
        result;

    if (hasNativeReflectConstruct) {
      var NewTarget = _getPrototypeOf(this).constructor;

      result = Reflect.construct(Super, arguments, NewTarget);
    } else {
      result = Super.apply(this, arguments);
    }

    return _possibleConstructorReturn(this, result);
  };
}

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}

function _toArray(arr) {
  return _arrayWithHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableRest();
}

function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}

function _iterableToArrayLimit(arr, i) {
  var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

  if (_i == null) return;
  var _arr = [];
  var _n = true;
  var _d = false;

  var _s, _e;

  try {
    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

  return arr2;
}

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

// jscs:disable disallowVar, requireArrayDestructuring
/**
  @hide
*/

function referenceSort (edges) {
  var nodes = uniq(flatten(edges));
  var cursor = nodes.length;
  var sorted = new Array(cursor);
  var visited = {};
  var i = cursor;

  var visit = function visit(node, i, predecessors) {
    if (predecessors.indexOf(node) >= 0) {
      throw new Error("Cyclic dependency in properties ".concat(JSON.stringify(predecessors)));
    }

    if (visited[i]) {
      return;
    } else {
      visited[i] = true;
    }

    var outgoing = edges.filter(function (edge) {
      return edge && edge[0] === node;
    });
    i = outgoing.length;

    if (i) {
      var preds = predecessors.concat(node);

      do {
        var pair = outgoing[--i];
        var child = pair[1];

        if (child) {
          visit(child, nodes.indexOf(child), preds);
        }
      } while (i);
    }

    sorted[--cursor] = node;
  };

  while (i--) {
    if (!visited[i]) {
      visit(nodes[i], i, []);
    }
  }

  return sorted.reverse();
}

var Factory = function Factory() {
  this.build = function (sequence) {
    var _this = this;

    var object = {};
    var topLevelAttrs = Object.assign({}, this.attrs);
    delete topLevelAttrs.afterCreate;
    Object.keys(topLevelAttrs).forEach(function (attr) {
      if (Factory.isTrait.call(_this, attr)) {
        delete topLevelAttrs[attr];
      }
    });
    var keys = sortAttrs(topLevelAttrs, sequence);
    keys.forEach(function (key) {
      var buildAttrs, _buildSingleValue;

      buildAttrs = function buildAttrs(attrs) {
        return mapValues(attrs, _buildSingleValue);
      };

      _buildSingleValue = function buildSingleValue(value) {
        if (Array.isArray(value)) {
          return value.map(_buildSingleValue);
        } else if (isPlainObject(value)) {
          return buildAttrs(value);
        } else if (isFunction(value)) {
          return value.call(topLevelAttrs, sequence);
        } else {
          return value;
        }
      };

      var value = topLevelAttrs[key];

      if (isFunction(value)) {
        object[key] = value.call(object, sequence);
      } else {
        object[key] = _buildSingleValue(value);
      }
    });
    return object;
  };
};

Factory.extend = function (attrs) {
  // Merge the new attributes with existing ones. If conflict, new ones win.
  var newAttrs = Object.assign({}, this.attrs, attrs);

  var Subclass = function Subclass() {
    this.attrs = newAttrs;
    Factory.call(this);
  }; // Copy extend


  Subclass.extend = Factory.extend;
  Subclass.extractAfterCreateCallbacks = Factory.extractAfterCreateCallbacks;
  Subclass.isTrait = Factory.isTrait; // Store a reference on the class for future subclasses

  Subclass.attrs = newAttrs;
  return Subclass;
};

Factory.extractAfterCreateCallbacks = function () {
  var _this2 = this;

  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      traits = _ref.traits;

  var afterCreateCallbacks = [];
  var attrs = this.attrs || {};
  var traitCandidates;

  if (attrs.afterCreate) {
    afterCreateCallbacks.push(attrs.afterCreate);
  }

  if (Array.isArray(traits)) {
    traitCandidates = traits;
  } else {
    traitCandidates = Object.keys(attrs);
  }

  traitCandidates.filter(function (attr) {
    return _this2.isTrait(attr) && attrs[attr].extension.afterCreate;
  }).forEach(function (attr) {
    afterCreateCallbacks.push(attrs[attr].extension.afterCreate);
  });
  return afterCreateCallbacks;
};

Factory.isTrait = function (attrName) {
  var attrs = this.attrs;
  return isPlainObject(attrs[attrName]) && attrs[attrName].__isTrait__ === true;
};

function sortAttrs(attrs, sequence) {
  var Temp = function Temp() {};

  var obj = new Temp();
  var refs = [];
  var property;
  Object.keys(attrs).forEach(function (key) {
    var value;
    Object.defineProperty(obj.constructor.prototype, key, {
      get: function get() {
        refs.push([property, key]);
        return value;
      },
      set: function set(newValue) {
        value = newValue;
      },
      enumerable: false,
      configurable: true
    });
  });
  Object.keys(attrs).forEach(function (key) {
    var value = attrs[key];

    if (typeof value !== "function") {
      obj[key] = value;
    }
  });
  Object.keys(attrs).forEach(function (key) {
    var value = attrs[key];
    property = key;

    if (typeof value === "function") {
      obj[key] = value.call(obj, sequence);
    }

    refs.push([key]);
  });
  return referenceSort(refs);
}

function isNumber(n) {
  return (+n).toString() === n.toString();
}
/**
  By default Mirage uses autoincrementing numbers starting with `1` as IDs for records. This can be customized by implementing one or more IdentityManagers for your application.

  An IdentityManager is a class that's responsible for generating unique identifiers. You can define a custom identity manager for your entire application, as well as on a per-model basis.

  A custom IdentityManager must implement these methods:

  - `fetch`, which must return an identifier not yet used
  - `set`, which is called with an `id` of a record being insert into Mirage's database
  - `reset`, which should reset database to initial state

  Check out the advanced guide on Mocking UUIDs to see a complete example of a custom IdentityManager.

  @class IdentityManager
  @constructor
  @public
*/


var IdentityManager = /*#__PURE__*/function () {
  function IdentityManager() {
    _classCallCheck(this, IdentityManager);

    this._nextId = 1;
    this._ids = {};
  }
  /**
    @method get
    @hide
    @private
  */


  _createClass(IdentityManager, [{
    key: "get",
    value: function get() {
      return this._nextId;
    }
    /**
      Registers `uniqueIdentifier` as used.
       This method should throw is `uniqueIdentifier` has already been taken.
       @method set
      @param {String|Number} uniqueIdentifier
      @public
    */

  }, {
    key: "set",
    value: function set(uniqueIdentifier) {
      if (this._ids[uniqueIdentifier]) {
        throw new Error("Attempting to use the ID ".concat(uniqueIdentifier, ", but it's already been used"));
      }

      if (isNumber(uniqueIdentifier) && +uniqueIdentifier >= this._nextId) {
        this._nextId = +uniqueIdentifier + 1;
      }

      this._ids[uniqueIdentifier] = true;
    }
    /**
      @method inc
      @hide
      @private
    */

  }, {
    key: "inc",
    value: function inc() {
      var nextValue = this.get() + 1;
      this._nextId = nextValue;
      return nextValue;
    }
    /**
      Returns the next unique identifier.
       @method fetch
      @return {String} Unique identifier
      @public
    */

  }, {
    key: "fetch",
    value: function fetch() {
      var id = this.get();
      this._ids[id] = true;
      this.inc();
      return id.toString();
    }
    /**
      Resets the identity manager, marking all unique identifiers as available.
       @method reset
      @public
    */

  }, {
    key: "reset",
    value: function reset() {
      this._nextId = 1;
      this._ids = {};
    }
  }]);

  return IdentityManager;
}();

/**
  @hide
*/
var association = function association() {
  var __isAssociation__ = true;

  for (var _len = arguments.length, traitsAndOverrides = new Array(_len), _key = 0; _key < _len; _key++) {
    traitsAndOverrides[_key] = arguments[_key];
  }

  return {
    __isAssociation__: __isAssociation__,
    traitsAndOverrides: traitsAndOverrides
  };
};

var trait = function trait(extension) {
  var __isTrait__ = true;
  return {
    extension: extension,
    __isTrait__: __isTrait__
  };
};

var warn = console.warn; // eslint-disable-line no-console

/**
  You can use this class when you want more control over your route handlers response.

  Pass the `code`, `headers` and `data` into the constructor and return an instance from any route handler.

  ```js
  import { Response } from 'miragejs';

  this.get('/users', () => {
    return new Response(400, { some: 'header' }, { errors: [ 'name cannot be blank'] });
  });
  ```
*/

var Response = /*#__PURE__*/function () {
  function Response(code) {
    var headers = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var data = arguments.length > 2 ? arguments[2] : undefined;

    _classCallCheck(this, Response);

    this.code = code;
    this.headers = headers; // Default data for "undefined 204" responses to empty string (no content)

    if (code === 204) {
      if (data !== undefined && data !== "") {
        warn("Mirage: One of your route handlers is returning a custom\n          204 Response that has data, but this is a violation of the HTTP spec\n          and could lead to unexpected behavior. 204 responses should have no\n          content (an empty string) as their body.");
      } else {
        this.data = "";
      } // Default data for "empty untyped" responses to empty JSON object

    } else if ((data === undefined || data === "") && !Object.prototype.hasOwnProperty.call(this.headers, "Content-Type")) {
      this.data = {};
    } else {
      this.data = data;
    } // Default "untyped" responses to application/json


    if (code !== 204 && !Object.prototype.hasOwnProperty.call(this.headers, "Content-Type")) {
      this.headers["Content-Type"] = "application/json";
    }
  }

  _createClass(Response, [{
    key: "toRackResponse",
    value: function toRackResponse() {
      return [this.code, this.headers, this.data];
    }
  }]);

  return Response;
}();

var camelizeCache = {};
var dasherizeCache = {};
var underscoreCache = {};
var capitalizeCache = {};
/**
 * @param {String} word
 * @hide
 */

function camelize(word) {
  if (typeof camelizeCache[word] !== "string") {
    var camelizedWord = camelize$1(underscore(word), false);
    /*
     The `ember-inflector` package's version of camelize lower-cases the first
     word after a slash, e.g.
          camelize('my-things/nice-watch'); // 'myThings/niceWatch'
      The `inflected` package doesn't, so we make that change here to not break
     existing functionality. (This affects the name of the schema collections.)
    */


    var camelized = camelizedWord.split("/").map(lowerFirst).join("/");
    camelizeCache[word] = camelized;
  }

  return camelizeCache[word];
}
/**
 * @param {String} word
 * @hide
 */

function dasherize(word) {
  if (typeof dasherizeCache[word] !== "string") {
    var dasherized = dasherize$1(underscore(word));

    dasherizeCache[word] = dasherized;
  }

  return dasherizeCache[word];
}
function underscore(word) {
  if (typeof underscoreCache[word] !== "string") {
    var underscored = underscore$1(word);

    underscoreCache[word] = underscored;
  }

  return underscoreCache[word];
}
function capitalize(word) {
  if (typeof capitalizeCache[word] !== "string") {
    var capitalized = capitalize$1(word);

    capitalizeCache[word] = capitalized;
  }

  return capitalizeCache[word];
}

/**
  @hide
*/

function isAssociation (object) {
  return isPlainObject(object) && object.__isAssociation__ === true;
}

/* eslint no-console: 0 */
var errorProps = ["description", "fileName", "lineNumber", "message", "name", "number", "stack"];
/**
  @hide
*/

function assert(bool, text) {
  if (typeof bool === "string" && !text) {
    // console.error(`Mirage: ${bool}`);
    throw new MirageError(bool);
  }

  if (!bool) {
    // console.error(`Mirage: ${text}`);
    throw new MirageError(text.replace(/^ +/gm, "") || "Assertion failed");
  }
}
/**
  @public
  @hide
  Copied from ember-metal/error
*/

function MirageError(message, stack) {
  var tmp = Error(message);

  if (stack) {
    tmp.stack = stack;
  }

  for (var idx = 0; idx < errorProps.length; idx++) {
    var prop = errorProps[idx];

    if (["description", "message", "stack"].indexOf(prop) > -1) {
      this[prop] = "Mirage: ".concat(tmp[prop]);
    } else {
      this[prop] = tmp[prop];
    }
  }
}
MirageError.prototype = Object.create(Error.prototype);

/**
  Associations represent relationships between your Models.

  The `hasMany` and `belongsTo` helpers are how you actually define relationships:
  
  ```js
  import { createServer, Model, hasMany, belongsTo }

  createServer({
    models: {
      user: Model.extend({
        comments: hasMany()
      }),
      comments: Model.extend({
        user: belongsTo()
      })
    }
  })
  ```

  View [the Relationships](https://miragejs.com/docs/main-concepts/relationships/) guide to learn more about setting up relationships.

  Each usage of the helper registers an Association (either a `HasMany` association or `BelongsTo` association) with your server's `Schema`. You can access these associations using either the `schema.associationsFor()` method, or the `associations` property on individual model instances.

  You can then introspect the associations to do things like dynamically build up your JSON response in your serializers.

  @class Association
  @constructor
  @public
*/

var Association = /*#__PURE__*/function () {
  function Association(modelName, opts) {
    _classCallCheck(this, Association);

    /**
      The modelName of the associated model.
       For example, given this configuration
      
      ```js
      createServer({
        models: {
          user: Model,
          comment: Model.extend({
            user: belongsTo()
          })
        }
      })
      ```
       the association's `modelName` would be `user`.
       Note that an association's `modelName` and the `name` can be different. This is because Mirage supports multiple relationships of the same type:
       ```js
      createServer({
        models: {
          user: Model,
          comment: Model.extend({
            author: belongsTo('user'),
            reviewer: belongsTo('user')
          })
        }
      })
      ```
       For both these relationships, the `modelName` is `user`, but the first association has a `name` of `author` while the second has a `name` of `reviewer`.
       @property
      @type {String}
      @public
    */
    this.modelName = undefined; // hack to add ESDOC info. Any better way?

    if (_typeof(modelName) === "object") {
      // Received opts only
      this.modelName = undefined;
      this.opts = modelName;
    } else {
      // The modelName of the association. (Might not be passed in - set later
      // by schema).
      this.modelName = modelName ? dasherize(modelName) : "";
      this.opts = opts || {};
    }
    /**
      The name of the association, which comes from the property name that was used to define it.
       For example, given this server definition
      
      ```js
      createServer({
        models: {
          user: Model,
          comment: Model.extend({
            author: belongsTo('user')
          })
        }
      })
      ```
       the association's `name` would be `author`.
      
      The name is used by Mirage to define foreign keys on the model (`comment.authorId` in this case), among other things.
       @property
      @type {String}
      @public
    */


    this.name = ""; // The modelName that owns this association

    this.ownerModelName = "";
  }
  /**
     A setter for schema, since we don't have a reference at constuction time.
      @method setSchema
     @public
     @hide
  */


  _createClass(Association, [{
    key: "setSchema",
    value: function setSchema(schema) {
      this.schema = schema;
    }
    /**
       Returns a Boolean that's true if the association is self-referential, i.e. if a model has an association with itself.
        For example, given
        ```js
       createServer({
         models: {
           user: Model.extend({
             friends: hasMany('user')
           })
         }
       })
       ```
        then
        ```js
       server.schema.associationsFor('user').friends.isReflexive // true
       ```
        @method isReflexive
       @return {Boolean}
       @public
    */

  }, {
    key: "isReflexive",
    value: function isReflexive() {
      var isExplicitReflexive = !!(this.modelName === this.ownerModelName && this.opts.inverse);
      var isImplicitReflexive = !!(this.opts.inverse === undefined && this.ownerModelName === this.modelName);
      return isExplicitReflexive || isImplicitReflexive;
    }
    /**
       Returns a Boolean that's true if the association is polymorphic:
        For example, given
        ```js
       createServer({
         models: {
           comment: Model.extend({
             commentable: belongsTo({ polymorphic: true })
           })
         }
       })
       ```
        then
        ```js
       server.schema.associationsFor('comment').commentable.isPolymorphic // true
       ```
        Check out [the guides on polymorphic associations](https://miragejs.com/docs/main-concepts/relationships/#polymorphic) to learn more.
        @accessor isPolymorphic
       @type {Boolean}
       @public
    */

  }, {
    key: "isPolymorphic",
    get: function get() {
      return this.opts.polymorphic;
    }
    /**
      Returns either the string `"hasMany"` or `"belongsTo"`, based on the association type.
    
      @accessor
      @type {String}
      @public
     */

  }, {
    key: "type",
    get: function get() {
      throw new Error("Subclasses of Association must implement a getter for type");
    }
    /**
      Returns the name used for the association's foreign key.
       ```js
      let server = createServer({
        models: {
          user: Model,
          post: Model.extend({
            fineAuthor: belongsTo("user"),
            comments: hasMany()
          }),
          comment: Model
        }
      });
       let associations = server.associationsFor('post')
       associations.fineAuthor.foreignKey // fineAuthorId
      associations.comments.foreignKey // commentIds
      ```
    
      @accessor
      @type {String}
      @public
     */

  }, {
    key: "foreignKey",
    get: function get() {
      return this.getForeignKey();
    }
    /**
      @hide
    */

  }, {
    key: "identifier",
    get: function get() {
      throw new Error("Subclasses of Association must implement a getter for identifier");
    }
  }]);

  return Association;
}();

var identifierCache$1 = {};
/**
 * The belongsTo association adds a fk to the owner of the association
 *
 * @class BelongsTo
 * @extends Association
 * @constructor
 * @public
 * @hide
 */

var BelongsTo = /*#__PURE__*/function (_Association) {
  _inherits(BelongsTo, _Association);

  var _super = _createSuper(BelongsTo);

  function BelongsTo() {
    _classCallCheck(this, BelongsTo);

    return _super.apply(this, arguments);
  }

  _createClass(BelongsTo, [{
    key: "identifier",
    get: function get() {
      if (typeof identifierCache$1[this.name] !== "string") {
        var identifier = "".concat(camelize(this.name), "Id");
        identifierCache$1[this.name] = identifier;
      }

      return identifierCache$1[this.name];
    }
  }, {
    key: "type",
    get: function get() {
      return "belongsTo";
    }
    /**
     * @method getForeignKeyArray
     * @return {Array} Array of camelized name of the model owning the association
     * and foreign key for the association
     * @public
     */

  }, {
    key: "getForeignKeyArray",
    value: function getForeignKeyArray() {
      return [camelize(this.ownerModelName), this.getForeignKey()];
    }
    /**
     * @method getForeignKey
     * @return {String} Foreign key for the association
     * @public
     */

  }, {
    key: "getForeignKey",
    value: function getForeignKey() {
      // we reuse identifierCache because it's the same logic as get identifier
      if (typeof identifierCache$1[this.name] !== "string") {
        var foreignKey = "".concat(camelize(this.name), "Id");
        identifierCache$1[this.name] = foreignKey;
      }

      return identifierCache$1[this.name];
    }
    /**
     * Registers belongs-to association defined by given key on given model,
     * defines getters / setters for associated parent and associated parent's id,
     * adds methods for creating unsaved parent record and creating a saved one
     *
     * @method addMethodsToModelClass
     * @param {Function} ModelClass
     * @param {String} key the named key for the association
     * @public
     */

  }, {
    key: "addMethodsToModelClass",
    value: function addMethodsToModelClass(ModelClass, key) {
      var modelPrototype = ModelClass.prototype;
      var association = this;
      var foreignKey = this.getForeignKey();

      var associationHash = _defineProperty({}, key, this);

      modelPrototype.belongsToAssociations = Object.assign(modelPrototype.belongsToAssociations, associationHash); // update belongsToAssociationFks

      Object.keys(modelPrototype.belongsToAssociations).forEach(function (key) {
        var value = modelPrototype.belongsToAssociations[key];
        modelPrototype.belongsToAssociationFks[value.getForeignKey()] = value;
      }); // Add to target's dependent associations array

      this.schema.addDependentAssociation(this, this.modelName); // TODO: look how this is used. Are these necessary, seems like they could be gotten from the above?
      // Or we could use a single data structure to store this information?

      modelPrototype.associationKeys.add(key);
      modelPrototype.associationIdKeys.add(foreignKey);
      Object.defineProperty(modelPrototype, foreignKey, {
        /*
          object.parentId
            - returns the associated parent's id
        */
        get: function get() {
          this._tempAssociations = this._tempAssociations || {};
          var tempParent = this._tempAssociations[key];
          var id;

          if (tempParent === null) {
            id = null;
          } else {
            if (association.isPolymorphic) {
              if (tempParent) {
                id = {
                  id: tempParent.id,
                  type: tempParent.modelName
                };
              } else {
                id = this.attrs[foreignKey];
              }
            } else {
              if (tempParent) {
                id = tempParent.id;
              } else {
                id = this.attrs[foreignKey];
              }
            }
          }

          return id;
        },

        /*
          object.parentId = (parentId)
            - sets the associated parent via id
        */
        set: function set(id) {
          var tempParent;

          if (id === null) {
            tempParent = null;
          } else if (id !== undefined) {
            if (association.isPolymorphic) {
              assert(_typeof(id) === "object", "You're setting an ID on the polymorphic association '".concat(association.name, "' but you didn't pass in an object. Polymorphic IDs need to be in the form { type, id }."));
              tempParent = association.schema[association.schema.toCollectionName(id.type)].find(id.id);
            } else {
              tempParent = association.schema[association.schema.toCollectionName(association.modelName)].find(id);
              assert(tempParent, "Couldn't find ".concat(association.modelName, " with id = ").concat(id));
            }
          }

          this[key] = tempParent;
        }
      });
      Object.defineProperty(modelPrototype, key, {
        /*
          object.parent
            - returns the associated parent
        */
        get: function get() {
          this._tempAssociations = this._tempAssociations || {};
          var tempParent = this._tempAssociations[key];
          var foreignKeyId = this[foreignKey];
          var model = null;

          if (tempParent) {
            model = tempParent;
          } else if (foreignKeyId !== null) {
            if (association.isPolymorphic) {
              model = association.schema[association.schema.toCollectionName(foreignKeyId.type)].find(foreignKeyId.id);
            } else {
              model = association.schema[association.schema.toCollectionName(association.modelName)].find(foreignKeyId);
            }
          }

          return model;
        },

        /*
          object.parent = (parentModel)
            - sets the associated parent via model
           I want to jot some notes about hasInverseFor. There used to be an
          association.inverse() check, but adding polymorphic associations
          complicated this. `comment.commentable`, you can't easily check for an
          inverse since `comments: hasMany()` could be on any model.
           Instead of making it very complex and looking for an inverse on the
          association in isoaltion, it was much simpler to ask the model being
          passed in if it had an inverse for the setting model and with its
          association.
        */
        set: function set(model) {
          this._tempAssociations = this._tempAssociations || {};
          this._tempAssociations[key] = model;

          if (model && model.hasInverseFor(association)) {
            var inverse = model.inverseFor(association);
            model.associate(this, inverse);
          }
        }
      });
      /*
        object.newParent
          - creates a new unsaved associated parent
         TODO: document polymorphic
      */

      modelPrototype["new".concat(capitalize(key))] = function () {
        var modelName, attrs;

        if (association.isPolymorphic) {
          modelName = arguments.length <= 0 ? undefined : arguments[0];
          attrs = arguments.length <= 1 ? undefined : arguments[1];
        } else {
          modelName = association.modelName;
          attrs = arguments.length <= 0 ? undefined : arguments[0];
        }

        var parent = association.schema[association.schema.toCollectionName(modelName)]["new"](attrs);
        this[key] = parent;
        return parent;
      };
      /*
        object.createParent
          - creates a new saved associated parent, and immediately persists both models
         TODO: document polymorphic
      */


      modelPrototype["create".concat(capitalize(key))] = function () {
        var modelName, attrs;

        if (association.isPolymorphic) {
          modelName = arguments.length <= 0 ? undefined : arguments[0];
          attrs = arguments.length <= 1 ? undefined : arguments[1];
        } else {
          modelName = association.modelName;
          attrs = arguments.length <= 0 ? undefined : arguments[0];
        }

        var parent = association.schema[association.schema.toCollectionName(modelName)].create(attrs);
        this[key] = parent;
        this.save();
        return parent.reload();
      };
    }
    /**
     *
     *
     * @public
     */

  }, {
    key: "disassociateAllDependentsFromTarget",
    value: function disassociateAllDependentsFromTarget(model) {
      var _this = this;

      var owner = this.ownerModelName;
      var fk;

      if (this.isPolymorphic) {
        fk = {
          type: model.modelName,
          id: model.id
        };
      } else {
        fk = model.id;
      }

      var dependents = this.schema[this.schema.toCollectionName(owner)].where(function (potentialOwner) {
        var id = potentialOwner[_this.getForeignKey()];

        if (!id) {
          return false;
        }

        if (_typeof(id) === "object") {
          return id.type === fk.type && id.id === fk.id;
        } else {
          return id === fk;
        }
      });
      dependents.models.forEach(function (dependent) {
        dependent.disassociate(model, _this);
        dependent.save();
      });
    }
  }]);

  return BelongsTo;
}(Association);

function duplicate(data) {
  if (Array.isArray(data)) {
    return data.map(duplicate);
  } else {
    return Object.assign({}, data);
  }
}
/**
  Mirage's `Db` has many `DbCollections`, which are equivalent to tables from traditional databases. They store specific types of data, for example `users` and `posts`.

  `DbCollections` have names, like `users`, which you use to access the collection from the `Db` object.

  Suppose you had a `user` model defined, and the following data had been inserted into your database (either through factories or fixtures):

  ```js
  export default [
    { id: 1, name: 'Zelda' },
    { id: 2, name: 'Link' }
  ];
  ```

  Then `db.contacts` would return this array.

  @class DbCollection
  @constructor
  @public
 */


var DbCollection = /*#__PURE__*/function () {
  function DbCollection(name, initialData, IdentityManager) {
    _classCallCheck(this, DbCollection);

    this.name = name;
    this._records = [];
    this.identityManager = new IdentityManager();

    if (initialData) {
      this.insert(initialData);
    }
  }
  /**
   * Returns a copy of the data, to prevent inadvertent data manipulation.
   * @method all
   * @public
   * @hide
   */


  _createClass(DbCollection, [{
    key: "all",
    value: function all() {
      return duplicate(this._records);
    }
    /**
      Inserts `data` into the collection. `data` can be a single object
      or an array of objects. Returns the inserted record.
       ```js
      // Insert a single record
      let link = db.users.insert({ name: 'Link', age: 173 });
       link;  // { id: 1, name: 'Link', age: 173 }
       // Insert an array
      let users = db.users.insert([
        { name: 'Zelda', age: 142 },
        { name: 'Epona', age: 58 },
      ]);
       users;  // [ { id: 2, name: 'Zelda', age: 142 }, { id: 3, name: 'Epona', age: 58 } ]
      ```
       @method insert
      @param data
      @public
     */

  }, {
    key: "insert",
    value: function insert(data) {
      var _this = this;

      if (!Array.isArray(data)) {
        return this._insertRecord(data);
      } else {
        return map(data, function (attrs) {
          return _this._insertRecord(attrs);
        });
      }
    }
    /**
      Returns a single record from the `collection` if `ids` is a single
      id, or an array of records if `ids` is an array of ids. Note
      each id can be an int or a string, but integer ids as strings
      (e.g. the string “1”) will be treated as integers.
       ```js
      // Given users = [{id: 1, name: 'Link'}, {id: 2, name: 'Zelda'}]
       db.users.find(1);      // {id: 1, name: 'Link'}
      db.users.find([1, 2]); // [{id: 1, name: 'Link'}, {id: 2, name: 'Zelda'}]
      ```
       @method find
      @param ids
      @public
     */

  }, {
    key: "find",
    value: function find(ids) {
      if (Array.isArray(ids)) {
        var records = this._findRecords(ids).filter(Boolean).map(duplicate); // Return a copy


        return records;
      } else {
        var record = this._findRecord(ids);

        if (!record) {
          return null;
        } // Return a copy


        return duplicate(record);
      }
    }
    /**
      Returns the first model from `collection` that matches the
      key-value pairs in the `query` object. Note that a string
      comparison is used. `query` is a POJO.
       ```js
      // Given users = [ { id: 1, name: 'Link' }, { id: 2, name: 'Zelda' } ]
      db.users.findBy({ name: 'Link' }); // { id: 1, name: 'Link' }
      ```
       @method find
      @param query
      @public
     */

  }, {
    key: "findBy",
    value: function findBy(query) {
      var record = this._findRecordBy(query);

      if (!record) {
        return null;
      } // Return a copy


      return duplicate(record);
    }
    /**
      Returns an array of models from `collection` that match the
      key-value pairs in the `query` object. Note that a string
      comparison is used. `query` is a POJO.
       ```js
      // Given users = [ { id: 1, name: 'Link' }, { id: 2, name: 'Zelda' } ]
       db.users.where({ name: 'Zelda' }); // [ { id: 2, name: 'Zelda' } ]
      ```
       @method where
      @param query
      @public
     */

  }, {
    key: "where",
    value: function where(query) {
      return this._findRecordsWhere(query).map(duplicate);
    }
    /**
      Finds the first record matching the provided _query_ in
      `collection`, or creates a new record using a merge of the
      `query` and optional `attributesForCreate`.
       Often times you may have a pattern like the following in your API stub:
       ```js
      // Given users = [
      //   { id: 1, name: 'Link' },
      //   { id: 2, name: 'Zelda' }
      // ]
       // Create Link if he doesn't yet exist
      let records = db.users.where({ name: 'Link' });
      let record;
       if (records.length > 0) {
        record = records[0];
      } else {
        record = db.users.insert({ name: 'Link' });
      }
      ```
       You can now replace this with the following:
       ```js
      let record = db.users.firstOrCreate({ name: 'Link' });
      ```
       An extended example using *attributesForCreate*:
       ```js
      let record = db.users.firstOrCreate({ name: 'Link' }, { evil: false });
      ```
       @method firstOrCreate
      @param query
      @param attributesForCreate
      @public
     */

  }, {
    key: "firstOrCreate",
    value: function firstOrCreate(query) {
      var attributesForCreate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var queryResult = this.where(query);

      var _queryResult = _slicedToArray(queryResult, 1),
          record = _queryResult[0];

      if (record) {
        return record;
      } else {
        var mergedAttributes = Object.assign(attributesForCreate, query);
        var createdRecord = this.insert(mergedAttributes);
        return createdRecord;
      }
    }
    /**
      Updates one or more records in the collection.
       If *attrs* is the only arg present, updates all records in the collection according to the key-value pairs in *attrs*.
       If *target* is present, restricts updates to those that match *target*. If *target* is a number or string, finds a single record whose id is *target* to update. If *target* is a POJO, queries *collection* for records that match the key-value pairs in *target*, and updates their *attrs*.
       Returns the updated record or records.
       ```js
      // Given users = [
      //   {id: 1, name: 'Link'},
      //   {id: 2, name: 'Zelda'}
      // ]
       db.users.update({name: 'Ganon'}); // db.users = [{id: 1, name: 'Ganon'}, {id: 2, name: 'Ganon'}]
      db.users.update(1, {name: 'Young Link'}); // db.users = [{id: 1, name: 'Young Link'}, {id: 2, name: 'Zelda'}]
      db.users.update({name: 'Link'}, {name: 'Epona'}); // db.users = [{id: 1, name: 'Epona'}, {id: 2, name: 'Zelda'}]
      ```
       @method update
      @param target
      @param attrs
      @public
     */

  }, {
    key: "update",
    value: function update(target, attrs) {
      var _this2 = this;

      var records;

      if (typeof attrs === "undefined") {
        attrs = target;
        var changedRecords = [];

        this._records.forEach(function (record) {
          var oldRecord = Object.assign({}, record);

          _this2._updateRecord(record, attrs);

          if (!isEqual(oldRecord, record)) {
            changedRecords.push(record);
          }
        });

        return changedRecords;
      } else if (typeof target === "number" || typeof target === "string") {
        var id = target;

        var record = this._findRecord(id);

        this._updateRecord(record, attrs);

        return record;
      } else if (Array.isArray(target)) {
        var ids = target;
        records = this._findRecords(ids);
        records.forEach(function (record) {
          _this2._updateRecord(record, attrs);
        });
        return records;
      } else if (_typeof(target) === "object") {
        var query = target;
        records = this._findRecordsWhere(query);
        records.forEach(function (record) {
          _this2._updateRecord(record, attrs);
        });
        return records;
      }
    }
    /**
      Removes one or more records in *collection*.
       If *target* is undefined, removes all records. If *target* is a number or string, removes a single record using *target* as id. If *target* is a POJO, queries *collection* for records that match the key-value pairs in *target*, and removes them from the collection.
       ```js
      // Given users = [
      //   {id: 1, name: 'Link'},
      //   {id: 2, name: 'Zelda'}
      // ]
       db.users.remove(); // db.users = []
      db.users.remove(1); // db.users = [{id: 2, name: 'Zelda'}]
      db.users.remove({name: 'Zelda'}); // db.users = [{id: 1, name: 'Link'}]
      ```
       @method remove
      @param target
      @public
     */

  }, {
    key: "remove",
    value: function remove(target) {
      var _this3 = this;

      var records;

      if (typeof target === "undefined") {
        this._records = [];
        this.identityManager.reset();
      } else if (typeof target === "number" || typeof target === "string") {
        var record = this._findRecord(target);

        var index = this._records.indexOf(record);

        this._records.splice(index, 1);
      } else if (Array.isArray(target)) {
        records = this._findRecords(target);
        records.forEach(function (record) {
          var index = _this3._records.indexOf(record);

          _this3._records.splice(index, 1);
        });
      } else if (_typeof(target) === "object") {
        records = this._findRecordsWhere(target);
        records.forEach(function (record) {
          var index = _this3._records.indexOf(record);

          _this3._records.splice(index, 1);
        });
      }
    }
    /*
      Private methods.
       These return the actual db objects, whereas the public
      API query methods return copies.
    */

    /**
      @method _findRecord
      @param id
      @private
      @hide
     */

  }, {
    key: "_findRecord",
    value: function _findRecord(id) {
      id = id.toString();
      return this._records.find(function (obj) {
        return obj.id === id;
      });
    }
    /**
      @method _findRecordBy
      @param query
      @private
      @hide
     */

  }, {
    key: "_findRecordBy",
    value: function _findRecordBy(query) {
      return this._findRecordsWhere(query)[0];
    }
    /**
      @method _findRecords
      @param ids
      @private
      @hide
     */

  }, {
    key: "_findRecords",
    value: function _findRecords(ids) {
      return ids.map(this._findRecord, this);
    }
    /**
      @method _findRecordsWhere
      @param query
      @private
      @hide
     */

  }, {
    key: "_findRecordsWhere",
    value: function _findRecordsWhere(query) {
      var records = this._records;

      function defaultQueryFunction(record) {
        var keys = Object.keys(query);
        return keys.every(function (key) {
          return String(record[key]) === String(query[key]);
        });
      }

      var queryFunction = _typeof(query) === "object" ? defaultQueryFunction : query;
      return records.filter(queryFunction);
    }
    /**
      @method _insertRecord
      @param data
      @private
      @hide
     */

  }, {
    key: "_insertRecord",
    value: function _insertRecord(data) {
      var attrs = duplicate(data);

      if (attrs && (attrs.id === undefined || attrs.id === null)) {
        attrs.id = this.identityManager.fetch(attrs);
      } else {
        attrs.id = attrs.id.toString();
        this.identityManager.set(attrs.id);
      }

      this._records.push(attrs);

      return duplicate(attrs);
    }
    /**
      @method _updateRecord
      @param record
      @param attrs
      @private
      @hide
     */

  }, {
    key: "_updateRecord",
    value: function _updateRecord(record, attrs) {
      var targetId = attrs && Object.prototype.hasOwnProperty.call(attrs, "id") ? attrs.id.toString() : null;
      var currentId = record.id;

      if (targetId && currentId !== targetId) {
        throw new Error("Updating the ID of a record is not permitted");
      }

      for (var attr in attrs) {
        if (attr === "id") {
          continue;
        }

        record[attr] = attrs[attr];
      }
    }
  }]);

  return DbCollection;
}();

/**
  Your Mirage server has a database which you can interact with in your route handlers. You’ll typically use models to interact with your database data, but you can always reach into the db directly in the event you want more control.

  Access the db from your route handlers via `schema.db`.

  You can access individual DbCollections by using `schema.db.name`:

  ```js
  schema.db.users  // would return, e.g., [ { id: 1, name: 'Yehuda' }, { id: 2, name: 'Tom '} ]
  ```

  @class Db
  @constructor
  @public
 */

var Db = /*#__PURE__*/function () {
  function Db(initialData, identityManagers) {
    _classCallCheck(this, Db);

    this._collections = [];
    this.registerIdentityManagers(identityManagers);

    if (initialData) {
      this.loadData(initialData);
    }
  }
  /**
    Loads an object of data into Mirage's database.
     The keys of the object correspond to the DbCollections, and the values are arrays of records.
     ```js
    server.db.loadData({
      users: [
        { name: 'Yehuda' },
        { name: 'Tom' }
      ]
    });
    ```
     As with `db.collection.insert`, IDs will automatically be created for records that don't have them.
     @method loadData
    @param {Object} data - Data to load
    @public
   */


  _createClass(Db, [{
    key: "loadData",
    value: function loadData(data) {
      for (var key in data) {
        this.createCollection(key, cloneDeep(data[key]));
      }
    }
    /**
     Logs out the contents of the Db.
      ```js
     server.db.dump() // { users: [ name: 'Yehuda', ...
     ```
      @method dump
     @public
     */

  }, {
    key: "dump",
    value: function dump() {
      return this._collections.reduce(function (data, collection) {
        data[collection.name] = collection.all();
        return data;
      }, {});
    }
    /**
      Add an empty collection named _name_ to your database. Typically you won’t need to do this yourself, since collections are automatically created for any models you have defined.
       @method createCollection
      @param name
      @param initialData (optional)
      @public
     */

  }, {
    key: "createCollection",
    value: function createCollection(name, initialData) {
      if (!this[name]) {
        var _IdentityManager = this.identityManagerFor(name);

        var newCollection = new DbCollection(name, initialData, _IdentityManager); // Public API has a convenient array interface. It comes at the cost of
        // returning a copy of all records to avoid accidental mutations.

        Object.defineProperty(this, name, {
          get: function get() {
            var recordsCopy = newCollection.all();
            ["insert", "find", "findBy", "where", "update", "remove", "firstOrCreate"].forEach(function (method) {
              recordsCopy[method] = function () {
                return newCollection[method].apply(newCollection, arguments);
              };
            });
            return recordsCopy;
          }
        }); // Private API does not have the array interface. This means internally, only
        // db-collection methods can be used. This is so records aren't copied redundantly
        // internally, which leads to accidental O(n^2) operations (e.g., createList).

        Object.defineProperty(this, "_".concat(name), {
          get: function get() {
            var recordsCopy = [];
            ["insert", "find", "findBy", "where", "update", "remove", "firstOrCreate"].forEach(function (method) {
              recordsCopy[method] = function () {
                return newCollection[method].apply(newCollection, arguments);
              };
            });
            return recordsCopy;
          }
        });

        this._collections.push(newCollection);
      } else if (initialData) {
        this[name].insert(initialData);
      }

      return this;
    }
    /**
      @method createCollections
      @param ...collections
      @public
      @hide
     */

  }, {
    key: "createCollections",
    value: function createCollections() {
      var _this = this;

      for (var _len = arguments.length, collections = new Array(_len), _key = 0; _key < _len; _key++) {
        collections[_key] = arguments[_key];
      }

      collections.forEach(function (c) {
        return _this.createCollection(c);
      });
    }
    /**
      Removes all data from Mirage's database.
       @method emptyData
      @public
     */

  }, {
    key: "emptyData",
    value: function emptyData() {
      this._collections.forEach(function (c) {
        return c.remove();
      });
    }
    /**
      @method identityManagerFor
      @param name
      @public
      @hide
     */

  }, {
    key: "identityManagerFor",
    value: function identityManagerFor(name) {
      return this._identityManagers[this._container.inflector.singularize(name)] || this._identityManagers.application || IdentityManager;
    }
    /**
      @method registerIdentityManagers
      @public
      @hide
     */

  }, {
    key: "registerIdentityManagers",
    value: function registerIdentityManagers(identityManagers) {
      this._identityManagers = identityManagers || {};
    }
  }]);

  return Db;
}();

/**
  Collections represent arrays of models. They are returned by a hasMany association, or by one of the ModelClass query methods:

  ```js
  let posts = user.blogPosts;
  let posts = schema.blogPosts.all();
  let posts = schema.blogPosts.find([1, 2, 4]);
  let posts = schema.blogPosts.where({ published: true });
  ```

  Note that there is also a `PolymorphicCollection` class that is identical to `Collection`, except it can contain a heterogeneous array of models. Thus, it has no `modelName` property. This lets serializers and other parts of the system interact with it differently.

  @class Collection
  @constructor
  @public
*/

var Collection = /*#__PURE__*/function () {
  function Collection(modelName) {
    var models = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    _classCallCheck(this, Collection);

    assert(modelName && typeof modelName === "string", "You must pass a `modelName` into a Collection");
    /**
      The dasherized model name this Collection represents.
       ```js
      let posts = user.blogPosts;
       posts.modelName; // "blog-post"
      ```
       The model name is separate from the actual models, since Collections can be empty.
       @property modelName
      @type {String}
      @public
    */

    this.modelName = modelName;
    /**
      The underlying plain JavaScript array of Models in this Collection.
       ```js
      posts.models // [ post:1, post:2, ... ]
      ```
       While Collections have many array-ish methods like `filter` and `sort`, it
      can be useful to work with the plain array if you want to work with methods
      like `map`, or use the `[]` accessor.
       For example, in testing you might want to assert against a model from the
      collection:
       ```js
      let newPost = user.posts.models[0].title;
       assert.equal(newPost, "My first post");
      ```
       @property models
      @type {Array}
      @public
    */

    this.models = models;
  }
  /**
    The number of models in the collection.
     ```js
    user.posts.length; // 2
    ```
     @property length
    @type {Integer}
    @public
  */


  _createClass(Collection, [{
    key: "length",
    get: function get() {
      return this.models.length;
    }
    /**
       Updates each model in the collection, and immediately persists all changes to the db.
        ```js
       let posts = user.blogPosts;
        posts.update('published', true); // the db was updated for all posts
       ```
        @method update
       @param key
       @param val
       @return this
       @public
     */

  }, {
    key: "update",
    value: function update() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      invokeMap.apply(void 0, [this.models, "update"].concat(args));
      return this;
    }
    /**
       Saves all models in the collection.
        ```js
       let posts = user.blogPosts;
        posts.models[0].published = true;
        posts.save(); // all posts saved to db
       ```
        @method save
       @return this
       @public
     */

  }, {
    key: "save",
    value: function save() {
      invokeMap(this.models, "save");
      return this;
    }
    /**
      Reloads each model in the collection.
       ```js
      let posts = author.blogPosts;
       // ...
       posts.reload(); // reloads data for each post from the db
      ```
       @method reload
      @return this
      @public
    */

  }, {
    key: "reload",
    value: function reload() {
      invokeMap(this.models, "reload");
      return this;
    }
    /**
      Destroys the db record for all models in the collection.
       ```js
      let posts = user.blogPosts;
       posts.destroy(); // all posts removed from db
      ```
       @method destroy
      @return this
      @public
    */

  }, {
    key: "destroy",
    value: function destroy() {
      invokeMap(this.models, "destroy");
      return this;
    }
    /**
      Adds a model to this collection.
       ```js
      posts.length; // 1
       posts.add(newPost);
       posts.length; // 2
      ```
       @method add
      @param {Model} model
      @return this
      @public
    */

  }, {
    key: "add",
    value: function add(model) {
      this.models.push(model);
      return this;
    }
    /**
      Removes a model from this collection.
       ```js
      posts.length; // 5
       let firstPost = posts.models[0];
      posts.remove(firstPost);
      posts.save();
       posts.length; // 4
      ```
       @method remove
      @param {Model} model
      @return this
      @public
    */

  }, {
    key: "remove",
    value: function remove(model) {
      var match = this.models.find(function (m) {
        return m.toString() === model.toString();
      });

      if (match) {
        var i = this.models.indexOf(match);
        this.models.splice(i, 1);
      }

      return this;
    }
    /**
      Checks if the Collection includes the given model.
       ```js
      posts.includes(newPost);
      ```
       Works by checking if the given model name and id exists in the Collection,
      making it a bit more flexible than strict object equality.
       ```js
      let post = server.create('post');
      let programming = server.create('tag', { text: 'Programming' });
       visit(`/posts/${post.id}`);
      click('.tag-selector');
      click('.tag:contains(Programming)');
       post.reload();
      assert.ok(post.tags.includes(programming));
      ```
       @method includes
      @return {Boolean}
      @public
    */

  }, {
    key: "includes",
    value: function includes(model) {
      return this.models.some(function (m) {
        return m.toString() === model.toString();
      });
    }
    /**
      Returns a new Collection with its models filtered according to the provided [callback function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter).
       ```js
      let publishedPosts = user.posts.filter(post => post.isPublished);
      ```
      @method filter
      @param {Function} f
      @return {Collection}
      @public
    */

  }, {
    key: "filter",
    value: function filter(f) {
      var filteredModels = this.models.filter(f);
      return new Collection(this.modelName, filteredModels);
    }
    /**
       Returns a new Collection with its models sorted according to the provided [compare function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Parameters).
        ```js
       let postsByTitleAsc = user.posts.sort((a, b) => a.title > b.title ? 1 : -1 );
       ```
        @method sort
       @param {Function} f
       @return {Collection}
       @public
     */

  }, {
    key: "sort",
    value: function sort(f) {
      var sortedModels = this.models.concat().sort(f);
      return new Collection(this.modelName, sortedModels);
    }
    /**
      Returns a new Collection with a subset of its models selected from `begin` to `end`.
       ```js
      let firstThreePosts = user.posts.slice(0, 3);
      ```
       @method slice
      @param {Integer} begin
      @param {Integer} end
      @return {Collection}
      @public
    */

  }, {
    key: "slice",
    value: function slice() {
      var _this$models;

      var slicedModels = (_this$models = this.models).slice.apply(_this$models, arguments);

      return new Collection(this.modelName, slicedModels);
    }
    /**
      Modifies the Collection by merging the models from another collection.
       ```js
      user.posts.mergeCollection(newPosts);
      user.posts.save();
      ```
       @method mergeCollection
      @param {Collection} collection
      @return this
      @public
     */

  }, {
    key: "mergeCollection",
    value: function mergeCollection(collection) {
      this.models = this.models.concat(collection.models);
      return this;
    }
    /**
       Simple string representation of the collection and id.
        ```js
       user.posts.toString(); // collection:post(post:1,post:4)
       ```
        @method toString
       @return {String}
       @public
     */

  }, {
    key: "toString",
    value: function toString() {
      return "collection:".concat(this.modelName, "(").concat(this.models.map(function (m) {
        return m.id;
      }).join(","), ")");
    }
  }]);

  return Collection;
}();

/**
 * An array of models, returned from one of the schema query
 * methods (all, find, where). Knows how to update and destroy its models.
 *
 * Identical to Collection except it can contain a heterogeneous array of
 * models. Thus, it has no `modelName` property. This lets serializers and
 * other parts of the system interact with it differently.
 *
 * @class PolymorphicCollection
 * @constructor
 * @public
 * @hide
 */

var PolymorphicCollection = /*#__PURE__*/function () {
  function PolymorphicCollection() {
    var models = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

    _classCallCheck(this, PolymorphicCollection);

    this.models = models;
  }
  /**
   * Number of models in the collection.
   *
   * @property length
   * @type Number
   * @public
   */


  _createClass(PolymorphicCollection, [{
    key: "length",
    get: function get() {
      return this.models.length;
    }
    /**
     * Updates each model in the collection (persisting immediately to the db).
     * @method update
     * @param key
     * @param val
     * @return this
     * @public
     */

  }, {
    key: "update",
    value: function update() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      invokeMap.apply(void 0, [this.models, "update"].concat(args));
      return this;
    }
    /**
     * Destroys the db record for all models in the collection.
     * @method destroy
     * @return this
     * @public
     */

  }, {
    key: "destroy",
    value: function destroy() {
      invokeMap(this.models, "destroy");
      return this;
    }
    /**
     * Saves all models in the collection.
     * @method save
     * @return this
     * @public
     */

  }, {
    key: "save",
    value: function save() {
      invokeMap(this.models, "save");
      return this;
    }
    /**
     * Reloads each model in the collection.
     * @method reload
     * @return this
     * @public
     */

  }, {
    key: "reload",
    value: function reload() {
      invokeMap(this.models, "reload");
      return this;
    }
    /**
     * Adds a model to this collection
     *
     * @method add
     * @return this
     * @public
     */

  }, {
    key: "add",
    value: function add(model) {
      this.models.push(model);
      return this;
    }
    /**
     * Removes a model to this collection
     *
     * @method remove
     * @return this
     * @public
     */

  }, {
    key: "remove",
    value: function remove(model) {
      var match = this.models.find(function (m) {
        return isEqual(m.attrs, model.attrs);
      });

      if (match) {
        var i = this.models.indexOf(match);
        this.models.splice(i, 1);
      }

      return this;
    }
    /**
     * Checks if the collection includes the model
     *
     * @method includes
     * @return boolean
     * @public
     */

  }, {
    key: "includes",
    value: function includes(model) {
      return this.models.some(function (m) {
        return isEqual(m.attrs, model.attrs);
      });
    }
    /**
     * @method filter
     * @param f
     * @return {Collection}
     * @public
     */

  }, {
    key: "filter",
    value: function filter(f) {
      var filteredModels = this.models.filter(f);
      return new PolymorphicCollection(filteredModels);
    }
    /**
     * @method sort
     * @param f
     * @return {Collection}
     * @public
     */

  }, {
    key: "sort",
    value: function sort(f) {
      var sortedModels = this.models.concat().sort(f);
      return new PolymorphicCollection(sortedModels);
    }
    /**
     * @method slice
     * @param {Integer} begin
     * @param {Integer} end
     * @return {Collection}
     * @public
     */

  }, {
    key: "slice",
    value: function slice() {
      var _this$models;

      var slicedModels = (_this$models = this.models).slice.apply(_this$models, arguments);

      return new PolymorphicCollection(slicedModels);
    }
    /**
     * @method mergeCollection
     * @param collection
     * @return this
     * @public
     */

  }, {
    key: "mergeCollection",
    value: function mergeCollection(collection) {
      this.models = this.models.concat(collection.models);
      return this;
    }
    /**
     * Simple string representation of the collection and id.
     * @method toString
     * @return {String}
     * @public
     */

  }, {
    key: "toString",
    value: function toString() {
      return "collection:".concat(this.modelName, "(").concat(this.models.map(function (m) {
        return m.id;
      }).join(","), ")");
    }
  }]);

  return PolymorphicCollection;
}();

var identifierCache = {};
/**
 * @class HasMany
 * @extends Association
 * @constructor
 * @public
 * @hide
 */

var HasMany = /*#__PURE__*/function (_Association) {
  _inherits(HasMany, _Association);

  var _super = _createSuper(HasMany);

  function HasMany() {
    _classCallCheck(this, HasMany);

    return _super.apply(this, arguments);
  }

  _createClass(HasMany, [{
    key: "identifier",
    get: function get() {
      if (typeof identifierCache[this.name] !== "string") {
        var identifier = "".concat(camelize(this._container.inflector.singularize(this.name)), "Ids");
        identifierCache[this.name] = identifier;
      }

      return identifierCache[this.name];
    }
  }, {
    key: "type",
    get: function get() {
      return "hasMany";
    }
    /**
     * @method getForeignKeyArray
     * @return {Array} Array of camelized model name of associated objects
     * and foreign key for the object owning the association
     * @public
     */

  }, {
    key: "getForeignKeyArray",
    value: function getForeignKeyArray() {
      return [camelize(this.ownerModelName), this.getForeignKey()];
    }
    /**
     * @method getForeignKey
     * @return {String} Foreign key for the object owning the association
     * @public
     */

  }, {
    key: "getForeignKey",
    value: function getForeignKey() {
      // we reuse identifierCache because it's the same logic as get identifier
      if (typeof identifierCache[this.name] !== "string") {
        var foreignKey = "".concat(this._container.inflector.singularize(camelize(this.name)), "Ids");
        identifierCache[this.name] = foreignKey;
      }

      return identifierCache[this.name];
    }
    /**
     * Registers has-many association defined by given key on given model,
     * defines getters / setters for associated records and associated records' ids,
     * adds methods for creating unsaved child records and creating saved ones
     *
     * @method addMethodsToModelClass
     * @param {Function} ModelClass
     * @param {String} key
     * @public
     */

  }, {
    key: "addMethodsToModelClass",
    value: function addMethodsToModelClass(ModelClass, key) {
      var modelPrototype = ModelClass.prototype;
      var association = this;
      var foreignKey = this.getForeignKey();

      var associationHash = _defineProperty({}, key, this);

      modelPrototype.hasManyAssociations = Object.assign(modelPrototype.hasManyAssociations, associationHash); // update hasManyAssociationFks

      Object.keys(modelPrototype.hasManyAssociations).forEach(function (key) {
        var value = modelPrototype.hasManyAssociations[key];
        modelPrototype.hasManyAssociationFks[value.getForeignKey()] = value;
      }); // Add to target's dependent associations array

      this.schema.addDependentAssociation(this, this.modelName); // TODO: look how this is used. Are these necessary, seems like they could be gotten from the above?
      // Or we could use a single data structure to store this information?

      modelPrototype.associationKeys.add(key);
      modelPrototype.associationIdKeys.add(foreignKey);
      Object.defineProperty(modelPrototype, foreignKey, {
        /*
          object.childrenIds
            - returns an array of the associated children's ids
        */
        get: function get() {
          this._tempAssociations = this._tempAssociations || {};
          var tempChildren = this._tempAssociations[key];
          var ids = [];

          if (tempChildren) {
            if (association.isPolymorphic) {
              ids = tempChildren.models.map(function (model) {
                return {
                  type: model.modelName,
                  id: model.id
                };
              });
            } else {
              ids = tempChildren.models.map(function (model) {
                return model.id;
              });
            }
          } else {
            ids = this.attrs[foreignKey] || [];
          }

          return ids;
        },

        /*
          object.childrenIds = ([childrenIds...])
            - sets the associated children (via id)
        */
        set: function set(ids) {
          var tempChildren;

          if (ids === null) {
            tempChildren = [];
          } else if (ids !== undefined) {
            assert(Array.isArray(ids), "You must pass an array in when setting ".concat(foreignKey, " on ").concat(this));

            if (association.isPolymorphic) {
              assert(ids.every(function (el) {
                return _typeof(el) === "object" && _typeof(el.type) !== undefined && _typeof(el.id) !== undefined;
              }), "You must pass in an array of polymorphic identifiers (objects of shape { type, id }) when setting ".concat(foreignKey, " on ").concat(this));
              var models = ids.map(function (_ref) {
                var type = _ref.type,
                    id = _ref.id;
                return association.schema[association.schema.toCollectionName(type)].find(id);
              });
              tempChildren = new PolymorphicCollection(models);
            } else {
              tempChildren = association.schema[association.schema.toCollectionName(association.modelName)].find(ids);
            }
          }

          this[key] = tempChildren;
        }
      });
      Object.defineProperty(modelPrototype, key, {
        /*
          object.children
            - returns an array of associated children
        */
        get: function get() {
          this._tempAssociations = this._tempAssociations || {};
          var collection = null;

          if (this._tempAssociations[key]) {
            collection = this._tempAssociations[key];
          } else {
            if (association.isPolymorphic) {
              if (this[foreignKey]) {
                var polymorphicIds = this[foreignKey];
                var models = polymorphicIds.map(function (_ref2) {
                  var type = _ref2.type,
                      id = _ref2.id;
                  return association.schema[association.schema.toCollectionName(type)].find(id);
                });
                collection = new PolymorphicCollection(models);
              } else {
                collection = new PolymorphicCollection(association.modelName);
              }
            } else {
              if (this[foreignKey]) {
                collection = association.schema[association.schema.toCollectionName(association.modelName)].find(this[foreignKey]);
              } else {
                collection = new Collection(association.modelName);
              }
            }

            this._tempAssociations[key] = collection;
          }

          return collection;
        },

        /*
          object.children = [model1, model2, ...]
            - sets the associated children (via array of models or Collection)
        */
        set: function set(models) {
          var _this = this;

          if (models instanceof Collection || models instanceof PolymorphicCollection) {
            models = models.models;
          }

          models = models ? compact(models) : [];
          this._tempAssociations = this._tempAssociations || {};
          var collection;

          if (association.isPolymorphic) {
            collection = new PolymorphicCollection(models);
          } else {
            collection = new Collection(association.modelName, models);
          }

          this._tempAssociations[key] = collection;
          models.forEach(function (model) {
            if (model.hasInverseFor(association)) {
              var inverse = model.inverseFor(association);
              model.associate(_this, inverse);
            }
          });
        }
      });
      /*
        object.newChild
          - creates a new unsaved associated child
      */

      modelPrototype["new".concat(capitalize(camelize(this._container.inflector.singularize(association.name))))] = function () {
        var modelName, attrs;

        if (association.isPolymorphic) {
          modelName = arguments.length <= 0 ? undefined : arguments[0];
          attrs = arguments.length <= 1 ? undefined : arguments[1];
        } else {
          modelName = association.modelName;
          attrs = arguments.length <= 0 ? undefined : arguments[0];
        }

        var child = association.schema[association.schema.toCollectionName(modelName)]["new"](attrs);
        var children = this[key].models;
        children.push(child);
        this[key] = children;
        return child;
      };
      /*
        object.createChild
          - creates a new saved associated child, and immediately persists both models
         TODO: forgot why this[key].add(child) doesn't work, most likely
        because these external APIs trigger saving cascades. Should probably
        have an internal method like this[key]._add.
      */


      modelPrototype["create".concat(capitalize(camelize(this._container.inflector.singularize(association.name))))] = function () {
        var modelName, attrs;

        if (association.isPolymorphic) {
          modelName = arguments.length <= 0 ? undefined : arguments[0];
          attrs = arguments.length <= 1 ? undefined : arguments[1];
        } else {
          modelName = association.modelName;
          attrs = arguments.length <= 0 ? undefined : arguments[0];
        }

        var child = association.schema[association.schema.toCollectionName(modelName)].create(attrs);
        var children = this[key].models;
        children.push(child);
        this[key] = children;
        this.save();
        return child.reload();
      };
    }
    /**
     *
     *
     * @public
     */

  }, {
    key: "disassociateAllDependentsFromTarget",
    value: function disassociateAllDependentsFromTarget(model) {
      var _this2 = this;

      var owner = this.ownerModelName;
      var fk;

      if (this.isPolymorphic) {
        fk = {
          type: model.modelName,
          id: model.id
        };
      } else {
        fk = model.id;
      }

      var dependents = this.schema[this.schema.toCollectionName(owner)].where(function (potentialOwner) {
        var currentIds = potentialOwner[_this2.getForeignKey()]; // Need this check because currentIds could be null


        return currentIds && currentIds.find(function (id) {
          if (_typeof(id) === "object") {
            return id.type === fk.type && id.id === fk.id;
          } else {
            return id === fk;
          }
        });
      });
      dependents.models.forEach(function (dependent) {
        dependent.disassociate(model, _this2);
        dependent.save();
      });
    }
  }]);

  return HasMany;
}(Association);

var pathModelClassCache = {};
/**
  @hide
*/

var BaseRouteHandler = /*#__PURE__*/function () {
  function BaseRouteHandler() {
    _classCallCheck(this, BaseRouteHandler);
  }

  _createClass(BaseRouteHandler, [{
    key: "getModelClassFromPath",
    value: function getModelClassFromPath(fullPath) {
      if (!fullPath) {
        return;
      }

      if (typeof pathModelClassCache[fullPath] !== "string") {
        var path = fullPath.split("/");
        var lastPath;

        for (var i = path.length - 1; i >= 0; i--) {
          var segment = path[i];

          if (segment.length && segment[0] !== ":") {
            lastPath = segment;
            break;
          }
        }

        pathModelClassCache[fullPath] = dasherize(camelize(this._container.inflector.singularize(lastPath)));
      }

      return pathModelClassCache[fullPath];
    }
  }, {
    key: "_getIdForRequest",
    value: function _getIdForRequest(request, jsonApiDoc) {
      var id;

      if (request && request.params && request.params.id) {
        id = request.params.id;
      } else if (jsonApiDoc && jsonApiDoc.data && jsonApiDoc.data.id) {
        id = jsonApiDoc.data.id;
      }

      return id;
    }
  }, {
    key: "_getJsonApiDocForRequest",
    value: function _getJsonApiDocForRequest(request, modelName) {
      var body;

      if (request && request.requestBody) {
        body = JSON.parse(request.requestBody);
      }

      return this.serializerOrRegistry.normalize(body, modelName);
    }
  }, {
    key: "_getAttrsForRequest",
    value: function _getAttrsForRequest(request, modelName) {
      var _this = this;

      var json = this._getJsonApiDocForRequest(request, modelName);

      var id = this._getIdForRequest(request, json);

      var attrs = {};
      assert(json.data && (json.data.attributes || json.data.type || json.data.relationships), "You're using a shorthand or #normalizedRequestAttrs, but your serializer's normalize function did not return a valid JSON:API document. Consult the docs for the normalize hook on the Serializer class.");

      if (json.data.attributes) {
        attrs = Object.keys(json.data.attributes).reduce(function (sum, key) {
          sum[camelize(key)] = json.data.attributes[key];
          return sum;
        }, {});
      }

      if (json.data.relationships) {
        Object.keys(json.data.relationships).forEach(function (relationshipName) {
          var relationship = json.data.relationships[relationshipName];

          var modelClass = _this.schema.modelClassFor(modelName);

          var association = modelClass.associationFor(camelize(relationshipName));
          var valueForRelationship;
          assert(association, "You're passing the relationship '".concat(relationshipName, "' to the '").concat(modelName, "' model via a ").concat(request.method, " to '").concat(request.url, "', but you did not define the '").concat(relationshipName, "' association on the '").concat(modelName, "' model."));

          if (association.isPolymorphic) {
            valueForRelationship = relationship.data;
          } else if (association instanceof HasMany) {
            valueForRelationship = relationship.data && relationship.data.map(function (rel) {
              return rel.id;
            });
          } else {
            valueForRelationship = relationship.data && relationship.data.id;
          }

          attrs[association.identifier] = valueForRelationship;
        }, {});
      }

      if (id) {
        attrs.id = id;
      }

      return attrs;
    }
  }, {
    key: "_getAttrsForFormRequest",
    value: function _getAttrsForFormRequest(_ref) {
      var requestBody = _ref.requestBody;
      var attrs;
      var urlEncodedParts = [];
      assert(requestBody && typeof requestBody === "string", "You're using the helper method #normalizedFormData, but the request body is empty or not a valid url encoded string.");
      urlEncodedParts = requestBody.split("&");
      attrs = urlEncodedParts.reduce(function (a, urlEncodedPart) {
        var _urlEncodedPart$split = urlEncodedPart.split("="),
            _urlEncodedPart$split2 = _slicedToArray(_urlEncodedPart$split, 2),
            key = _urlEncodedPart$split2[0],
            value = _urlEncodedPart$split2[1];

        a[key] = decodeURIComponent(value.replace(/\+/g, " "));
        return a;
      }, {});
      return attrs;
    }
  }]);

  return BaseRouteHandler;
}();

/**
 * @hide
 */

var FunctionRouteHandler = /*#__PURE__*/function (_BaseRouteHandler) {
  _inherits(FunctionRouteHandler, _BaseRouteHandler);

  var _super = _createSuper(FunctionRouteHandler);

  function FunctionRouteHandler(schema, serializerOrRegistry, userFunction, path, server) {
    var _this;

    _classCallCheck(this, FunctionRouteHandler);

    _this = _super.call(this, server);
    _this.schema = schema;
    _this.serializerOrRegistry = serializerOrRegistry;
    _this.userFunction = userFunction;
    _this.path = path;
    return _this;
  }

  _createClass(FunctionRouteHandler, [{
    key: "handle",
    value: function handle(request) {
      return this.userFunction(this.schema, request);
    }
  }, {
    key: "setRequest",
    value: function setRequest(request) {
      this.request = request;
    }
  }, {
    key: "serialize",
    value: function serialize(response, serializerType) {
      var serializer;

      if (serializerType) {
        serializer = this.serializerOrRegistry.serializerFor(serializerType, {
          explicit: true
        });
      } else {
        serializer = this.serializerOrRegistry;
      }

      return serializer.serialize(response, this.request);
    }
  }, {
    key: "normalizedRequestAttrs",
    value: function normalizedRequestAttrs() {
      var modelName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var path = this.path,
          request = this.request,
          requestHeaders = this.request.requestHeaders;
      var attrs;
      var lowerCaseHeaders = {};

      for (var header in requestHeaders) {
        lowerCaseHeaders[header.toLowerCase()] = requestHeaders[header];
      }

      if (/x-www-form-urlencoded/.test(lowerCaseHeaders["content-type"])) {
        attrs = this._getAttrsForFormRequest(request);
      } else {
        if (modelName) {
          assert(dasherize(modelName) === modelName, "You called normalizedRequestAttrs('".concat(modelName, "'), but normalizedRequestAttrs was intended to be used with the dasherized version of the model type. Please change this to normalizedRequestAttrs('").concat(dasherize(modelName), "')."));
        } else {
          modelName = this.getModelClassFromPath(path);
        }

        assert(this.schema.hasModelForModelName(modelName), "You're using a shorthand or the #normalizedRequestAttrs helper but the detected model of '".concat(modelName, "' does not exist. You might need to pass in the correct modelName as the first argument to #normalizedRequestAttrs."));
        attrs = this._getAttrsForRequest(request, modelName);
      }

      return attrs;
    }
  }]);

  return FunctionRouteHandler;
}(BaseRouteHandler);

/**
 * @hide
 */
var ObjectRouteHandler = /*#__PURE__*/function () {
  function ObjectRouteHandler(schema, serializerOrRegistry, object) {
    _classCallCheck(this, ObjectRouteHandler);

    this.schema = schema;
    this.serializerOrRegistry = serializerOrRegistry;
    this.object = object;
  }

  _createClass(ObjectRouteHandler, [{
    key: "handle",
    value: function handle() {
      return this.object;
    }
  }]);

  return ObjectRouteHandler;
}();

/**
  @hide
*/

var BaseShorthandRouteHandler = /*#__PURE__*/function (_BaseRouteHandler) {
  _inherits(BaseShorthandRouteHandler, _BaseRouteHandler);

  var _super = _createSuper(BaseShorthandRouteHandler);

  function BaseShorthandRouteHandler(schema, serializerOrRegistry, shorthand, path) {
    var _this;

    var options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

    _classCallCheck(this, BaseShorthandRouteHandler);

    _this = _super.call(this);
    shorthand = shorthand || _this.getModelClassFromPath(path);
    _this.schema = schema;
    _this.serializerOrRegistry = serializerOrRegistry;
    _this.shorthand = shorthand;
    _this.options = options;
    var type = Array.isArray(shorthand) ? "array" : _typeof(shorthand);

    if (type === "string") {
      var modelClass = _this.schema[_this.schema.toCollectionName(shorthand)];

      _this.handle = function (request) {
        return _this.handleStringShorthand(request, modelClass);
      };
    } else if (type === "array") {
      var modelClasses = shorthand.map(function (modelName) {
        return _this.schema[_this.schema.toCollectionName(modelName)];
      });

      _this.handle = function (request) {
        return _this.handleArrayShorthand(request, modelClasses);
      };
    }

    return _this;
  } // handleStringShorthand() {
  //
  // }
  //
  // handleArrayShorthand() {
  //
  // }


  return BaseShorthandRouteHandler;
}(BaseRouteHandler);

/**
 * @hide
 */

var GetShorthandRouteHandler = /*#__PURE__*/function (_BaseShorthandRouteHa) {
  _inherits(GetShorthandRouteHandler, _BaseShorthandRouteHa);

  var _super = _createSuper(GetShorthandRouteHandler);

  function GetShorthandRouteHandler() {
    _classCallCheck(this, GetShorthandRouteHandler);

    return _super.apply(this, arguments);
  }

  _createClass(GetShorthandRouteHandler, [{
    key: "handleStringShorthand",
    value:
    /*
      Retrieve a model/collection from the db.
       Examples:
        this.get('/contacts', 'contact');
        this.get('/contacts/:id', 'contact');
    */
    function handleStringShorthand(request, modelClass) {
      var modelName = this.shorthand;
      var camelizedModelName = camelize(modelName);
      assert(modelClass, "The route handler for ".concat(request.url, " is trying to access the ").concat(camelizedModelName, " model, but that model doesn't exist."));

      var id = this._getIdForRequest(request);

      if (id) {
        var model = modelClass.find(id);

        if (!model) {
          return new Response(404);
        } else {
          return model;
        }
      } else if (this.options.coalesce) {
        var ids = this.serializerOrRegistry.getCoalescedIds(request, camelizedModelName);

        if (ids) {
          return modelClass.find(ids);
        }
      }

      return modelClass.all();
    }
    /*
      Retrieve an array of collections from the db.
       Ex: this.get('/home', ['contacts', 'pictures']);
    */

  }, {
    key: "handleArrayShorthand",
    value: function handleArrayShorthand(request, modelClasses) {
      var keys = this.shorthand;

      var id = this._getIdForRequest(request);
      /*
      If the first key is singular and we have an id param in
      the request, we're dealing with the version of the shorthand
      that has a parent model and several has-many relationships.
      We throw an error, because the serializer is the appropriate
      place for this now.
      */


      assert(!id || this._container.inflector.singularize(keys[0]) !== keys[0], "It looks like you're using the \"Single record with\n      related records\" version of the array shorthand, in addition to opting\n      in to the model layer. This shorthand was made when there was no\n      serializer layer. Now that you're using models, please ensure your\n      relationships are defined, and create a serializer for the parent\n      model, adding the relationships there.");
      return modelClasses.map(function (modelClass) {
        return modelClass.all();
      });
    }
  }]);

  return GetShorthandRouteHandler;
}(BaseShorthandRouteHandler);

/**
 * @hide
 */

var PostShorthandRouteHandler = /*#__PURE__*/function (_BaseShorthandRouteHa) {
  _inherits(PostShorthandRouteHandler, _BaseShorthandRouteHa);

  var _super = _createSuper(PostShorthandRouteHandler);

  function PostShorthandRouteHandler() {
    _classCallCheck(this, PostShorthandRouteHandler);

    return _super.apply(this, arguments);
  }

  _createClass(PostShorthandRouteHandler, [{
    key: "handleStringShorthand",
    value:
    /*
      Push a new model of type *camelizedModelName* to the db.
       For example, this will push a 'user':
        this.post('/contacts', 'user');
    */
    function handleStringShorthand(request, modelClass) {
      var modelName = this.shorthand;
      var camelizedModelName = camelize(modelName);
      assert(modelClass, "The route handler for ".concat(request.url, " is trying to access the ").concat(camelizedModelName, " model, but that model doesn't exist."));

      var attrs = this._getAttrsForRequest(request, modelClass.camelizedModelName);

      return modelClass.create(attrs);
    }
  }]);

  return PostShorthandRouteHandler;
}(BaseShorthandRouteHandler);

/**
 * @hide
 */

var PutShorthandRouteHandler = /*#__PURE__*/function (_BaseShorthandRouteHa) {
  _inherits(PutShorthandRouteHandler, _BaseShorthandRouteHa);

  var _super = _createSuper(PutShorthandRouteHandler);

  function PutShorthandRouteHandler() {
    _classCallCheck(this, PutShorthandRouteHandler);

    return _super.apply(this, arguments);
  }

  _createClass(PutShorthandRouteHandler, [{
    key: "handleStringShorthand",
    value:
    /*
      Update an object from the db, specifying the type.
         this.put('/contacts/:id', 'user');
    */
    function handleStringShorthand(request, modelClass) {
      var modelName = this.shorthand;
      var camelizedModelName = camelize(modelName);
      assert(modelClass, "The route handler for ".concat(request.url, " is trying to access the ").concat(camelizedModelName, " model, but that model doesn't exist."));

      var id = this._getIdForRequest(request);

      var model = modelClass.find(id);

      if (!model) {
        return new Response(404);
      }

      var attrs = this._getAttrsForRequest(request, modelClass.camelizedModelName);

      return model.update(attrs);
    }
  }]);

  return PutShorthandRouteHandler;
}(BaseShorthandRouteHandler);

/**
 * @hide
 */

var DeleteShorthandRouteHandler = /*#__PURE__*/function (_BaseShorthandRouteHa) {
  _inherits(DeleteShorthandRouteHandler, _BaseShorthandRouteHa);

  var _super = _createSuper(DeleteShorthandRouteHandler);

  function DeleteShorthandRouteHandler() {
    _classCallCheck(this, DeleteShorthandRouteHandler);

    return _super.apply(this, arguments);
  }

  _createClass(DeleteShorthandRouteHandler, [{
    key: "handleStringShorthand",
    value:
    /*
      Remove the model from the db of type *camelizedModelName*.
       This would remove the user with id :id:
        Ex: this.del('/contacts/:id', 'user');
    */
    function handleStringShorthand(request, modelClass) {
      var modelName = this.shorthand;
      var camelizedModelName = camelize(modelName);
      assert(modelClass, "The route handler for ".concat(request.url, " is trying to access the ").concat(camelizedModelName, " model, but that model doesn't exist."));

      var id = this._getIdForRequest(request);

      var model = modelClass.find(id);

      if (!model) {
        return new Response(404);
      }

      model.destroy();
    }
    /*
      Remove the model and child related models from the db.
       This would remove the contact with id `:id`, as well
      as this contact's addresses and phone numbers.
        Ex: this.del('/contacts/:id', ['contact', 'addresses', 'numbers');
    */

  }, {
    key: "handleArrayShorthand",
    value: function handleArrayShorthand(request, modelClasses) {
      var _this = this;

      var id = this._getIdForRequest(request);

      var parent = modelClasses[0].find(id);
      var childTypes = modelClasses.slice(1).map(function (modelClass) {
        return _this._container.inflector.pluralize(modelClass.camelizedModelName);
      }); // Delete related children

      childTypes.forEach(function (type) {
        return parent[type].destroy();
      });
      parent.destroy();
    }
  }]);

  return DeleteShorthandRouteHandler;
}(BaseShorthandRouteHandler);

/**
 * @hide
 */

var HeadShorthandRouteHandler = /*#__PURE__*/function (_BaseShorthandRouteHa) {
  _inherits(HeadShorthandRouteHandler, _BaseShorthandRouteHa);

  var _super = _createSuper(HeadShorthandRouteHandler);

  function HeadShorthandRouteHandler() {
    _classCallCheck(this, HeadShorthandRouteHandler);

    return _super.apply(this, arguments);
  }

  _createClass(HeadShorthandRouteHandler, [{
    key: "handleStringShorthand",
    value:
    /*
      Retrieve a model/collection from the db.
       Examples:
        this.head('/contacts', 'contact');
        this.head('/contacts/:id', 'contact');
    */
    function handleStringShorthand(request, modelClass) {
      var modelName = this.shorthand;
      var camelizedModelName = camelize(modelName);
      assert(modelClass, "The route handler for ".concat(request.url, " is trying to access the ").concat(camelizedModelName, " model, but that model doesn't exist."));

      var id = this._getIdForRequest(request);

      if (id) {
        var model = modelClass.find(id);

        if (!model) {
          return new Response(404);
        } else {
          return new Response(204);
        }
      } else if (this.options.coalesce && request.queryParams && request.queryParams.ids) {
        var _model = modelClass.find(request.queryParams.ids);

        if (!_model) {
          return new Response(404);
        } else {
          return new Response(204);
        }
      } else {
        return new Response(204);
      }
    }
  }]);

  return HeadShorthandRouteHandler;
}(BaseShorthandRouteHandler);

var DEFAULT_CODES = {
  get: 200,
  put: 204,
  post: 201,
  "delete": 204
};

function createHandler(_ref) {
  var verb = _ref.verb,
      schema = _ref.schema,
      serializerOrRegistry = _ref.serializerOrRegistry,
      path = _ref.path,
      rawHandler = _ref.rawHandler,
      options = _ref.options,
      middleware = _ref.middleware;
  var handler;
  var args = [schema, serializerOrRegistry, rawHandler, path, options, middleware];

  var type = _typeof(rawHandler);

  if (type === "function") {
    handler = _construct(FunctionRouteHandler, args);
  } else if (type === "object" && rawHandler) {
    handler = _construct(ObjectRouteHandler, args);
  } else if (verb === "get") {
    handler = _construct(GetShorthandRouteHandler, args);
  } else if (verb === "post") {
    handler = _construct(PostShorthandRouteHandler, args);
  } else if (verb === "put" || verb === "patch") {
    handler = _construct(PutShorthandRouteHandler, args);
  } else if (verb === "delete") {
    handler = _construct(DeleteShorthandRouteHandler, args);
  } else if (verb === "head") {
    handler = _construct(HeadShorthandRouteHandler, args);
  }

  return handler;
}
/**
 * @hide
 */


var RouteHandler = /*#__PURE__*/function () {
  function RouteHandler(_ref2) {
    var schema = _ref2.schema,
        verb = _ref2.verb,
        rawHandler = _ref2.rawHandler,
        customizedCode = _ref2.customizedCode,
        options = _ref2.options,
        path = _ref2.path,
        serializerOrRegistry = _ref2.serializerOrRegistry,
        middleware = _ref2.middleware;

    _classCallCheck(this, RouteHandler);

    this.verb = verb;
    this.customizedCode = customizedCode;
    this.serializerOrRegistry = serializerOrRegistry;
    this.middleware = middleware || [];
    this.handler = createHandler({
      verb: verb,
      schema: schema,
      path: path,
      serializerOrRegistry: serializerOrRegistry,
      rawHandler: rawHandler,
      options: options
    });
  }

  _createClass(RouteHandler, [{
    key: "handle",
    value: function handle(request) {
      var _this = this;

      return this._getMirageResponseForRequest(request, this.middleware).then(function (mirageResponse) {
        return _this.serialize(mirageResponse, request);
      }).then(function (serializedMirageResponse) {
        return serializedMirageResponse.toRackResponse();
      });
    }
  }, {
    key: "_getMirageResponseForRequest",
    value: function _getMirageResponseForRequest(request) {
      var _this2 = this;

      var middleware = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      var result;

      try {
        /*
         We need to do this for the #serialize convenience method. Probably is
         a better way.
        */
        if (this.handler instanceof FunctionRouteHandler) {
          this.handler.setRequest(request);
        }

        result = this.handleWithMiddleware(request, [].concat(_toConsumableArray(middleware), [function (_, req) {
          return _this2.handler.handle(req);
        }]));
      } catch (e) {
        if (e instanceof MirageError) {
          result = new Response(500, {}, e);
        } else {
          var message = e.message || e;
          result = new Response(500, {}, {
            message: message,
            stack: "Mirage: Your ".concat(request.method, " handler for the url ").concat(request.url, " threw an error:\n\n").concat(e.stack || e)
          });
        }
      }

      return this._toMirageResponse(result);
    }
  }, {
    key: "handleWithMiddleware",
    value: function handleWithMiddleware(request, middleware) {
      var _this3 = this;

      var _middleware = _toArray(middleware),
          current = _middleware[0],
          remaining = _middleware.slice(1);

      return current(this.schema, request, function () {
        var req = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : request;
        return _this3.handleWithMiddleware(req, remaining);
      });
    }
  }, {
    key: "_toMirageResponse",
    value: function _toMirageResponse(result) {
      var _this4 = this;

      var mirageResponse;
      return new Promise(function (resolve, reject) {
        Promise.resolve(result).then(function (response) {
          if (response instanceof Response) {
            mirageResponse = result;
          } else {
            var code = _this4._getCodeForResponse(response);

            mirageResponse = new Response(code, {}, response);
          }

          resolve(mirageResponse);
        })["catch"](reject);
      });
    }
  }, {
    key: "_getCodeForResponse",
    value: function _getCodeForResponse(response) {
      var code;

      if (this.customizedCode) {
        code = this.customizedCode;
      } else {
        code = DEFAULT_CODES[this.verb]; // Returning any data for a 204 is invalid

        if (code === 204 && response !== undefined && response !== "") {
          code = 200;
        }
      }

      return code;
    }
  }, {
    key: "serialize",
    value: function serialize(mirageResponse, request) {
      mirageResponse.data = this.serializerOrRegistry.serialize(mirageResponse.data, request);
      return mirageResponse;
    }
  }]);

  return RouteHandler;
}();

/**
  @hide
*/

function extend(protoProps, staticProps) {
  var Child = /*#__PURE__*/function (_this) {
    _inherits(Child, _this);

    var _super = _createSuper(Child);

    function Child() {
      var _this2;

      _classCallCheck(this, Child);

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      _this2 = _super.call.apply(_super, [this].concat(args)); // The constructor function for the new subclass is optionally defined by you
      // in your `extend` definition

      if (protoProps && has(protoProps, "constructor")) {
        var _protoProps$construct;

        (_protoProps$construct = protoProps.constructor).call.apply(_protoProps$construct, [_assertThisInitialized(_this2)].concat(args));
      }

      return _this2;
    }

    return Child;
  }(this); // Add static properties to the constructor function, if supplied.


  Object.assign(Child, this, staticProps); // Add prototype properties (instance properties) to the subclass,
  // if supplied.

  if (protoProps) {
    Object.assign(Child.prototype, protoProps);
  }

  return Child;
}

/**
  Models wrap your database, and allow you to define relationships.

  **Class vs. instance methods**

  The methods documented below apply to _instances_ of models, but you'll typically use the `Schema` to access the model _class_, which can be used to find or create instances.

  You can find the Class methods documented under the `Schema` API docs.

  **Accessing properties and relationships**

  You can access properites (fields) and relationships directly off of models.

  ```js
  user.name;    // 'Sam'
  user.team;    // Team model
  user.teamId;  // Team id (foreign key)
  ```

  Mirage Models are schemaless in their attributes, but their relationship schema is known.

  For example,

  ```js
  let user = schema.users.create();
  user.attrs  // { }
  user.name   // undefined

  let user = schema.users.create({ name: 'Sam' });
  user.attrs  // { name: 'Sam' }
  user.name   // 'Sam'
  ```

  However, if a `user` has a `posts` relationships defined,

  ```js
  let user = schema.users.create();
  user.posts  // returns an empty Posts Collection
  ```

  @class Model
  @constructor
  @public
 */

var Model = /*#__PURE__*/function () {
  // TODO: schema and modelName now set statically at registration, need to remove

  /*
    Notes:
   - We need to pass in modelName, because models are created with
    .extend and anonymous functions, so you cannot use
    reflection to find the name of the constructor.
  */
  function Model(schema, modelName, attrs, fks) {
    var _this = this;

    _classCallCheck(this, Model);

    assert(schema, "A model requires a schema");
    assert(modelName, "A model requires a modelName");
    this._schema = schema;
    this.modelName = modelName;
    this.fks = fks || [];
    /**
      Returns the attributes of your model.
       ```js
      let post = schema.blogPosts.find(1);
      post.attrs; // {id: 1, title: 'Lorem Ipsum', publishedAt: '2012-01-01 10:00:00'}
      ```
       Note that you can also access individual attributes directly off a model, e.g. `post.title`.
       @property attrs
      @public
    */

    this.attrs = {};
    attrs = attrs || {}; // Ensure fks are there

    this.fks.forEach(function (fk) {
      _this.attrs[fk] = attrs[fk] !== undefined ? attrs[fk] : null;
    });
    Object.keys(attrs).forEach(function (name) {
      var value = attrs[name];

      _this._validateAttr(name, value);

      _this._setupAttr(name, value);

      _this._setupRelationship(name, value);
    });
    return this;
  }
  /**
    Create or saves the model.
     ```js
    let post = blogPosts.new({ title: 'Lorem ipsum' });
    post.id; // null
     post.save();
    post.id; // 1
     post.title = 'Hipster ipsum'; // db has not been updated
    post.save();                  // ...now the db is updated
    ```
     @method save
    @return this
    @public
   */


  _createClass(Model, [{
    key: "save",
    value: function save() {
      var collection = this._schema.toInternalCollectionName(this.modelName);

      if (this.isNew()) {
        // Update the attrs with the db response
        this.attrs = this._schema.db[collection].insert(this.attrs); // Ensure the id getter/setter is set

        this._definePlainAttribute("id");
      } else {
        this._schema.isSaving[this.toString()] = true;

        this._schema.db[collection].update(this.attrs.id, this.attrs);
      }

      this._saveAssociations();

      this._schema.isSaving[this.toString()] = false;
      return this;
    }
    /**
      Updates the record in the db.
       ```js
      let author = authors.find(1);
      let followers = users.find([1, 2]);
      let post = blogPosts.find(1);
      post.update('title', 'Hipster ipsum'); // the db was updated
      post.update({
        title: 'Lorem ipsum',
        created_at: 'before it was cool'
      });
      post.update({ author });
      post.update({ followers });
      ```
       @method update
      @param {String} key
      @param {any} val
      @return this
      @public
     */

  }, {
    key: "update",
    value: function update(key, val) {
      var attrs;

      if (key == null) {
        return this;
      }

      if (_typeof(key) === "object") {
        attrs = key;
      } else {
        (attrs = {})[key] = val;
      }

      Object.keys(attrs).forEach(function (attr) {
        if (!this.associationKeys.has(attr) && !this.associationIdKeys.has(attr)) {
          this._definePlainAttribute(attr);
        }

        this[attr] = attrs[attr];
      }, this);
      this.save();
      return this;
    }
    /**
      Destroys the db record.
       ```js
      let post = blogPosts.find(1);
      post.destroy(); // removed from the db
      ```
       @method destroy
      @public
     */

  }, {
    key: "destroy",
    value: function destroy() {
      if (this.isSaved()) {
        this._disassociateFromDependents();

        var collection = this._schema.toInternalCollectionName(this.modelName);

        this._schema.db[collection].remove(this.attrs.id);
      }
    }
    /**
      Boolean, true if the model has not been persisted yet to the db.
       ```js
      let post = blogPosts.new({title: 'Lorem ipsum'});
      post.isNew(); // true
      post.id;      // null
       post.save();  // true
      post.isNew(); // false
      post.id;      // 1
      ```
       @method isNew
      @return {Boolean}
      @public
     */

  }, {
    key: "isNew",
    value: function isNew() {
      var hasDbRecord = false;
      var hasId = this.attrs.id !== undefined && this.attrs.id !== null;

      if (hasId) {
        var collectionName = this._schema.toInternalCollectionName(this.modelName);

        var record = this._schema.db[collectionName].find(this.attrs.id);

        if (record) {
          hasDbRecord = true;
        }
      }

      return !hasDbRecord;
    }
    /**
      Boolean, opposite of `isNew`
       @method isSaved
      @return {Boolean}
      @public
     */

  }, {
    key: "isSaved",
    value: function isSaved() {
      return !this.isNew();
    }
    /**
      Reload a model's data from the database.
       ```js
      let post = blogPosts.find(1);
      post.attrs;     // {id: 1, title: 'Lorem ipsum'}
       post.title = 'Hipster ipsum';
      post.title;     // 'Hipster ipsum';
       post.reload();  // true
      post.title;     // 'Lorem ipsum'
      ```
       @method reload
      @return this
      @public
     */

  }, {
    key: "reload",
    value: function reload() {
      if (this.id) {
        var collection = this._schema.toInternalCollectionName(this.modelName);

        var attrs = this._schema.db[collection].find(this.id);

        Object.keys(attrs).filter(function (attr) {
          return attr !== "id";
        }).forEach(function (attr) {
          this.attrs[attr] = attrs[attr];
        }, this);
      } // Clear temp associations


      this._tempAssociations = {};
      return this;
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      return _objectSpread2({}, this.attrs);
    }
    /**
      Returns a hash of this model's associations.
       ```js
      let server = createServer({
        models: {
          user: Model,
          post: Model.extend({
            user: belongsTo(),
            comments: hasMany()
          }),
          comment: Model
        },
         seeds(server) {
          let peter = server.create("user", { name: "Peter" });
          server.create("post", { user: peter });
        }
      });
       let post = server.schema.posts.find(1)
      post.associations
       // {
      //   user: BelongsToAssociation,
      //   comments: HasManyAssociation
      // }
      ```
       Check out the docs on the Association class to see what fields are available for each association.
       @method associations
      @type {Object}
      @public
     */

  }, {
    key: "associations",
    get: function get() {
      return this._schema.associationsFor(this.modelName);
    }
    /**
      Returns the association for the given key
       @method associationFor
      @param key
      @public
      @hide
     */

  }, {
    key: "associationFor",
    value: function associationFor(key) {
      return this.associations[key];
    }
    /**
      Returns this model's inverse association for the given
      model-type-association pair, if it exists.
       Example:
            post: Model.extend({
             comments: hasMany()
           }),
           comments: Model.extend({
             post: belongsTo()
           })
        post.inversefor(commentsPostAssociation) would return the
       `post.comments` association object.
        Originally we had association.inverse() but that became impossible with
       the addition of polymorphic models. Consider the following:
            post: Model.extend({
             comments: hasMany()
           }),
           picture: Model.extend({
             comments: hasMany()
           }),
           comments: Model.extend({
             commentable: belongsTo({ polymorphic: true })
           })
        `commentable.inverse()` is ambiguous - does it return
       `post.comments` or `picture.comments`? Instead we need to ask each model
       if it has an inverse for a given association. post.inverseFor(commentable)
       is no longer ambiguous.
       @method hasInverseFor
      @param {String} modelName The model name of the class we're scanning
      @param {ORM/Association} association
      @return {ORM/Association}
      @public
      @hide
     */

  }, {
    key: "inverseFor",
    value: function inverseFor(association) {
      return this._explicitInverseFor(association) || this._implicitInverseFor(association);
    }
    /**
      Finds the inverse for an association that explicity defines it's inverse
       @private
      @hide
    */

  }, {
    key: "_explicitInverseFor",
    value: function _explicitInverseFor(association) {
      this._checkForMultipleExplicitInverses(association);

      var associations = this._schema.associationsFor(this.modelName);

      var inverse = association.opts.inverse;
      var candidate = inverse ? associations[inverse] : null;
      var matchingPolymorphic = candidate && candidate.isPolymorphic;
      var matchingInverse = candidate && candidate.modelName === association.ownerModelName;
      var candidateInverse = candidate && candidate.opts.inverse;

      if (candidateInverse && candidate.opts.inverse !== association.name) {
        assert(false, "You specified an inverse of ".concat(inverse, " for ").concat(association.name, ", but it does not match ").concat(candidate.modelName, " ").concat(candidate.name, "'s inverse"));
      }

      return matchingPolymorphic || matchingInverse ? candidate : null;
    }
    /**
      Ensures multiple explicit inverses don't exist on the current model
      for the given association.
       TODO: move this to compile-time check
       @private
      @hide
    */

  }, {
    key: "_checkForMultipleExplicitInverses",
    value: function _checkForMultipleExplicitInverses(association) {
      var associations = this._schema.associationsFor(this.modelName);

      var matchingExplicitInverses = Object.keys(associations).filter(function (key) {
        var candidate = associations[key];
        var modelMatches = association.ownerModelName === candidate.modelName;
        var inverseKeyMatches = association.name === candidate.opts.inverse;
        return modelMatches && inverseKeyMatches;
      });
      assert(matchingExplicitInverses.length <= 1, "The ".concat(this.modelName, " model has defined multiple explicit inverse associations for the ").concat(association.ownerModelName, ".").concat(association.name, " association."));
    }
    /**
      Finds if there is an inverse for an association that does not
      explicitly define one.
       @private
      @hide
    */

  }, {
    key: "_implicitInverseFor",
    value: function _implicitInverseFor(association) {
      var _this2 = this;

      var associations = this._schema.associationsFor(this.modelName);

      var modelName = association.ownerModelName;
      return values(associations).filter(function (candidate) {
        return candidate.modelName === modelName;
      }).reduce(function (inverse, candidate) {
        var candidateInverse = candidate.opts.inverse;
        var candidateIsImplicitInverse = candidateInverse === undefined;
        var candidateIsExplicitInverse = candidateInverse === association.name;
        var candidateMatches = candidateIsImplicitInverse || candidateIsExplicitInverse;

        if (candidateMatches) {
          // Need to move this check to compile-time init
          assert(!inverse, "The ".concat(_this2.modelName, " model has multiple possible inverse associations for the ").concat(association.ownerModelName, ".").concat(association.name, " association."));
          inverse = candidate;
        }

        return inverse;
      }, null);
    }
    /**
      Returns whether this model has an inverse association for the given
      model-type-association pair.
       @method hasInverseFor
      @param {String} modelName
      @param {ORM/Association} association
      @return {Boolean}
      @public
      @hide
     */

  }, {
    key: "hasInverseFor",
    value: function hasInverseFor(association) {
      return !!this.inverseFor(association);
    }
    /**
      Used to check if models match each other. If models are saved, we check model type
      and id, since they could have other non-persisted properties that are different.
       @public
      @hide
    */

  }, {
    key: "alreadyAssociatedWith",
    value: function alreadyAssociatedWith(model, association) {
      var associatedModelOrCollection = this[association.name];

      if (associatedModelOrCollection && model) {
        if (associatedModelOrCollection instanceof Model) {
          if (associatedModelOrCollection.isSaved() && model.isSaved()) {
            return associatedModelOrCollection.toString() === model.toString();
          } else {
            return associatedModelOrCollection === model;
          }
        } else {
          return associatedModelOrCollection.includes(model);
        }
      }
    }
  }, {
    key: "associate",
    value: function associate(model, association) {
      if (this.alreadyAssociatedWith(model, association)) {
        return;
      }

      var name = association.name;

      if (association instanceof HasMany) {
        if (!this[name].includes(model)) {
          this[name].add(model);
        }
      } else {
        this[name] = model;
      }
    }
  }, {
    key: "disassociate",
    value: function disassociate(model, association) {
      var fk = association.getForeignKey();

      if (association instanceof HasMany) {
        var i;

        if (association.isPolymorphic) {
          var found = this[fk].find(function (_ref) {
            var type = _ref.type,
                id = _ref.id;
            return type === model.modelName && id === model.id;
          });
          i = found && this[fk].indexOf(found);
        } else {
          i = this[fk].map(function (key) {
            return key.toString();
          }).indexOf(model.id.toString());
        }

        if (i > -1) {
          this.attrs[fk].splice(i, 1);
        }
      } else {
        this.attrs[fk] = null;
      }
    }
    /**
      @hide
    */

  }, {
    key: "isSaving",
    get: function get() {
      return this._schema.isSaving[this.toString()];
    } // Private

    /**
      model.attrs represents the persistable attributes, i.e. your db
      table fields.
      @method _setupAttr
      @param attr
      @param value
      @private
      @hide
     */

  }, {
    key: "_setupAttr",
    value: function _setupAttr(attr, value) {
      var isAssociation = this.associationKeys.has(attr) || this.associationIdKeys.has(attr);

      if (!isAssociation) {
        this.attrs[attr] = value; // define plain getter/setters for non-association keys

        this._definePlainAttribute(attr);
      }
    }
    /**
      Define getter/setter for a plain attribute
      @method _definePlainAttribute
      @param attr
      @private
      @hide
     */

  }, {
    key: "_definePlainAttribute",
    value: function _definePlainAttribute(attr) {
      // Ensure the property hasn't already been defined
      var existingProperty = Object.getOwnPropertyDescriptor(this, attr);

      if (existingProperty && existingProperty.get) {
        return;
      } // Ensure the attribute is on the attrs hash


      if (!Object.prototype.hasOwnProperty.call(this.attrs, attr)) {
        this.attrs[attr] = null;
      } // Define the getter/setter


      Object.defineProperty(this, attr, {
        get: function get() {
          return this.attrs[attr];
        },
        set: function set(val) {
          this.attrs[attr] = val;
        }
      });
    }
    /**
      Foreign keys get set on attrs directly (to avoid potential recursion), but
      model references use the setter.
     *
      We validate foreign keys during instantiation.
     *
      @method _setupRelationship
      @param attr
      @param value
      @private
      @hide
     */

  }, {
    key: "_setupRelationship",
    value: function _setupRelationship(attr, value) {
      var isFk = this.associationIdKeys.has(attr) || this.fks.includes(attr);
      var isAssociation = this.associationKeys.has(attr);

      if (isFk) {
        if (value !== undefined && value !== null) {
          this._validateForeignKeyExistsInDatabase(attr, value);
        }

        this.attrs[attr] = value;
      }

      if (isAssociation) {
        this[attr] = value;
      }
    }
    /**
      @method _validateAttr
      @private
      @hide
     */

  }, {
    key: "_validateAttr",
    value: function _validateAttr(key, value) {
      // Verify attr passed in for associations is actually an association
      {
        if (this.associationKeys.has(key)) {
          var association = this.associationFor(key);
          var isNull = value === null;

          if (association instanceof HasMany) {
            var isCollection = value instanceof Collection || value instanceof PolymorphicCollection;
            var isArrayOfModels = Array.isArray(value) && value.every(function (item) {
              return item instanceof Model;
            });
            assert(isCollection || isArrayOfModels || isNull, "You're trying to create a ".concat(this.modelName, " model and you passed in \"").concat(value, "\" under the ").concat(key, " key, but that key is a HasMany relationship. You must pass in a Collection, PolymorphicCollection, array of Models, or null."));
          } else if (association instanceof BelongsTo) {
            assert(value instanceof Model || isNull, "You're trying to create a ".concat(this.modelName, " model and you passed in \"").concat(value, "\" under the ").concat(key, " key, but that key is a BelongsTo relationship. You must pass in a Model or null."));
          }
        }
      } // Verify attrs passed in for association foreign keys are actually fks

      {
        if (this.associationIdKeys.has(key)) {
          if (key.endsWith("Ids")) {
            var isArray = Array.isArray(value);

            var _isNull = value === null;

            assert(isArray || _isNull, "You're trying to create a ".concat(this.modelName, " model and you passed in \"").concat(value, "\" under the ").concat(key, " key, but that key is a foreign key for a HasMany relationship. You must pass in an array of ids or null."));
          }
        }
      } // Verify no undefined associations are passed in

      {
        var isModelOrCollection = value instanceof Model || value instanceof Collection || value instanceof PolymorphicCollection;

        var _isArrayOfModels = Array.isArray(value) && value.length && value.every(function (item) {
          return item instanceof Model;
        });

        if (isModelOrCollection || _isArrayOfModels) {
          var modelOrCollection = value;
          assert(this.associationKeys.has(key), "You're trying to create a ".concat(this.modelName, " model and you passed in a ").concat(modelOrCollection.toString(), " under the ").concat(key, " key, but you haven't defined that key as an association on your model."));
        }
      }
    }
    /**
      Originally we validated this via association.setId method, but it triggered
      recursion. That method is designed for updating an existing model's ID so
      this method is needed during instantiation.
     *
      @method _validateForeignKeyExistsInDatabase
      @private
      @hide
     */

  }, {
    key: "_validateForeignKeyExistsInDatabase",
    value: function _validateForeignKeyExistsInDatabase(foreignKeyName, foreignKeys) {
      var _this3 = this;

      if (Array.isArray(foreignKeys)) {
        var association = this.hasManyAssociationFks[foreignKeyName];
        var found;

        if (association.isPolymorphic) {
          found = foreignKeys.map(function (_ref2) {
            var type = _ref2.type,
                id = _ref2.id;
            return _this3._schema.db[_this3._schema.toInternalCollectionName(type)].find(id);
          });
          found = compact(found);
        } else {
          found = this._schema.db[this._schema.toInternalCollectionName(association.modelName)].find(foreignKeys);
        }

        var foreignKeyLabel = association.isPolymorphic ? foreignKeys.map(function (fk) {
          return "".concat(fk.type, ":").concat(fk.id);
        }).join(",") : foreignKeys;
        assert(found.length === foreignKeys.length, "You're instantiating a ".concat(this.modelName, " that has a ").concat(foreignKeyName, " of ").concat(foreignKeyLabel, ", but some of those records don't exist in the database."));
      } else {
        var _association = this.belongsToAssociationFks[foreignKeyName];

        var _found;

        if (_association.isPolymorphic) {
          _found = this._schema.db[this._schema.toInternalCollectionName(foreignKeys.type)].find(foreignKeys.id);
        } else {
          _found = this._schema.db[this._schema.toInternalCollectionName(_association.modelName)].find(foreignKeys);
        }

        var _foreignKeyLabel = _association.isPolymorphic ? "".concat(foreignKeys.type, ":").concat(foreignKeys.id) : foreignKeys;

        assert(_found, "You're instantiating a ".concat(this.modelName, " that has a ").concat(foreignKeyName, " of ").concat(_foreignKeyLabel, ", but that record doesn't exist in the database."));
      }
    }
    /**
      Update associated children when saving a collection
     *
      @method _saveAssociations
      @private
      @hide
     */

  }, {
    key: "_saveAssociations",
    value: function _saveAssociations() {
      this._saveBelongsToAssociations();

      this._saveHasManyAssociations();
    }
  }, {
    key: "_saveBelongsToAssociations",
    value: function _saveBelongsToAssociations() {
      var _this4 = this;

      values(this.belongsToAssociations).forEach(function (association) {
        _this4._disassociateFromOldInverses(association);

        _this4._saveNewAssociates(association);

        _this4._associateWithNewInverses(association);
      });
    }
  }, {
    key: "_saveHasManyAssociations",
    value: function _saveHasManyAssociations() {
      var _this5 = this;

      values(this.hasManyAssociations).forEach(function (association) {
        _this5._disassociateFromOldInverses(association);

        _this5._saveNewAssociates(association);

        _this5._associateWithNewInverses(association);
      });
    }
  }, {
    key: "_disassociateFromOldInverses",
    value: function _disassociateFromOldInverses(association) {
      if (association instanceof HasMany) {
        this._disassociateFromHasManyInverses(association);
      } else if (association instanceof BelongsTo) {
        this._disassociateFromBelongsToInverse(association);
      }
    } // Disassociate currently persisted models that are no longer associated

  }, {
    key: "_disassociateFromHasManyInverses",
    value: function _disassociateFromHasManyInverses(association) {
      var _this6 = this;

      var fk = association.getForeignKey();
      var tempAssociation = this._tempAssociations && this._tempAssociations[association.name];
      var associateIds = this.attrs[fk];

      if (tempAssociation && associateIds) {
        var models;

        if (association.isPolymorphic) {
          models = associateIds.map(function (_ref3) {
            var type = _ref3.type,
                id = _ref3.id;
            return _this6._schema[_this6._schema.toCollectionName(type)].find(id);
          });
        } else {
          // TODO: prob should initialize hasMany fks with []
          models = this._schema[this._schema.toCollectionName(association.modelName)].find(associateIds || []).models;
        }

        models.filter(function (associate) {
          return (// filter out models that are already being saved
            !associate.isSaving && // filter out models that will still be associated
            !tempAssociation.includes(associate) && associate.hasInverseFor(association)
          );
        }).forEach(function (associate) {
          var inverse = associate.inverseFor(association);
          associate.disassociate(_this6, inverse);
          associate.save();
        });
      }
    }
    /*
      Disassociate currently persisted models that are no longer associated.
       Example:
         post: Model.extend({
          comments: hasMany()
        }),
         comment: Model.extend({
          post: belongsTo()
        })
       Assume `this` is comment:1. When saving, if comment:1 is no longer
      associated with post:1, we need to remove comment:1 from post:1.comments.
      In this example `association` would be `comment.post`.
    */

  }, {
    key: "_disassociateFromBelongsToInverse",
    value: function _disassociateFromBelongsToInverse(association) {
      var fk = association.getForeignKey();
      var tempAssociation = this._tempAssociations && this._tempAssociations[association.name];
      var associateId = this.attrs[fk];

      if (tempAssociation !== undefined && associateId) {
        var associate;

        if (association.isPolymorphic) {
          associate = this._schema[this._schema.toCollectionName(associateId.type)].find(associateId.id);
        } else {
          associate = this._schema[this._schema.toCollectionName(association.modelName)].find(associateId);
        }

        if (associate.hasInverseFor(association)) {
          var inverse = associate.inverseFor(association);
          associate.disassociate(this, inverse);

          associate._updateInDb(associate.attrs);
        }
      }
    } // Find all other models that depend on me and update their foreign keys

  }, {
    key: "_disassociateFromDependents",
    value: function _disassociateFromDependents() {
      var _this7 = this;

      this._schema.dependentAssociationsFor(this.modelName).forEach(function (association) {
        association.disassociateAllDependentsFromTarget(_this7);
      });
    }
  }, {
    key: "_saveNewAssociates",
    value: function _saveNewAssociates(association) {
      var fk = association.getForeignKey();
      var tempAssociate = this._tempAssociations && this._tempAssociations[association.name];

      if (tempAssociate !== undefined) {
        this.__isSavingNewChildren = true;
        delete this._tempAssociations[association.name];

        if (tempAssociate instanceof Collection) {
          tempAssociate.models.filter(function (model) {
            return !model.isSaving;
          }).forEach(function (child) {
            child.save();
          });

          this._updateInDb(_defineProperty({}, fk, tempAssociate.models.map(function (child) {
            return child.id;
          })));
        } else if (tempAssociate instanceof PolymorphicCollection) {
          tempAssociate.models.filter(function (model) {
            return !model.isSaving;
          }).forEach(function (child) {
            child.save();
          });

          this._updateInDb(_defineProperty({}, fk, tempAssociate.models.map(function (child) {
            return {
              type: child.modelName,
              id: child.id
            };
          })));
        } else {
          // Clearing the association
          if (tempAssociate === null) {
            this._updateInDb(_defineProperty({}, fk, null)); // Self-referential

          } else if (this.equals(tempAssociate)) {
            this._updateInDb(_defineProperty({}, fk, this.id)); // Non-self-referential

          } else if (!tempAssociate.isSaving) {
            // Save the tempAssociate and update the local reference
            tempAssociate.save();

            this._syncTempAssociations(tempAssociate);

            var fkValue;

            if (association.isPolymorphic) {
              fkValue = {
                id: tempAssociate.id,
                type: tempAssociate.modelName
              };
            } else {
              fkValue = tempAssociate.id;
            }

            this._updateInDb(_defineProperty({}, fk, fkValue));
          }
        }

        this.__isSavingNewChildren = false;
      }
    }
    /*
      Step 3 in saving associations.
       Example:
         // initial state
        post.author = steinbeck;
         // new state
        post.author = twain;
          1. Disassociate from old inverse (remove post from steinbeck.posts)
         2. Save new associates (if twain.isNew, save twain)
      -> 3. Associate with new inverse (add post to twain.posts)
    */

  }, {
    key: "_associateWithNewInverses",
    value: function _associateWithNewInverses(association) {
      var _this8 = this;

      if (!this.__isSavingNewChildren) {
        var modelOrCollection = this[association.name];

        if (modelOrCollection instanceof Model) {
          this._associateModelWithInverse(modelOrCollection, association);
        } else if (modelOrCollection instanceof Collection || modelOrCollection instanceof PolymorphicCollection) {
          modelOrCollection.models.forEach(function (model) {
            _this8._associateModelWithInverse(model, association);
          });
        }

        delete this._tempAssociations[association.name];
      }
    }
  }, {
    key: "_associateModelWithInverse",
    value: function _associateModelWithInverse(model, association) {
      var _this9 = this;

      if (model.hasInverseFor(association)) {
        var inverse = model.inverseFor(association);
        var inverseFk = inverse.getForeignKey();
        var ownerId = this.id;

        if (inverse instanceof BelongsTo) {
          var newId;

          if (inverse.isPolymorphic) {
            newId = {
              type: this.modelName,
              id: ownerId
            };
          } else {
            newId = ownerId;
          }

          this._schema.db[this._schema.toInternalCollectionName(model.modelName)].update(model.id, _defineProperty({}, inverseFk, newId));
        } else {
          var inverseCollection = this._schema.db[this._schema.toInternalCollectionName(model.modelName)];

          var currentIdsForInverse = inverseCollection.find(model.id)[inverse.getForeignKey()] || [];
          var newIdsForInverse = Object.assign([], currentIdsForInverse);

          var _newId, alreadyAssociatedWith;

          if (inverse.isPolymorphic) {
            _newId = {
              type: this.modelName,
              id: ownerId
            };
            alreadyAssociatedWith = newIdsForInverse.some(function (key) {
              return key.type == _this9.modelName && key.id == ownerId;
            });
          } else {
            _newId = ownerId;
            alreadyAssociatedWith = newIdsForInverse.includes(ownerId);
          }

          if (!alreadyAssociatedWith) {
            newIdsForInverse.push(_newId);
          }

          inverseCollection.update(model.id, _defineProperty({}, inverseFk, newIdsForInverse));
        }
      }
    } // Used to update data directly, since #save and #update can retrigger saves,
    // which can cause cycles with associations.

  }, {
    key: "_updateInDb",
    value: function _updateInDb(attrs) {
      this.attrs = this._schema.db[this._schema.toInternalCollectionName(this.modelName)].update(this.attrs.id, attrs);
    }
    /*
    Super gnarly: after we save this tempAssociate, we we need to through
    all other tempAssociates for a reference to this same model, and
    update it. Otherwise those other references are stale, which could
    cause a bug when they are subsequently saved.
     This only works for belongsTo right now, should add hasMany logic to it.
     See issue #1613: https://github.com/samselikoff/ember-cli-mirage/pull/1613
    */

  }, {
    key: "_syncTempAssociations",
    value: function _syncTempAssociations(tempAssociate) {
      var _this10 = this;

      Object.keys(this._tempAssociations).forEach(function (key) {
        if (_this10._tempAssociations[key] && _this10._tempAssociations[key].toString() === tempAssociate.toString()) {
          _this10._tempAssociations[key] = tempAssociate;
        }
      });
    }
    /**
      Simple string representation of the model and id.
       ```js
      let post = blogPosts.find(1);
      post.toString(); // "model:blogPost:1"
      ```
       @method toString
      @return {String}
      @public
    */

  }, {
    key: "toString",
    value: function toString() {
      var idLabel = this.id ? "(".concat(this.id, ")") : "";
      return "model:".concat(this.modelName).concat(idLabel);
    }
    /**
      Checks the equality of this model and the passed-in model
     *
      @method equals
      @return boolean
      @public
      @hide
     */

  }, {
    key: "equals",
    value: function equals(model) {
      return this.toString() === model.toString();
    }
  }]);

  return Model;
}();

Model.extend = extend;

Model.findBelongsToAssociation = function (associationType) {
  return this.prototype.belongsToAssociations[associationType];
};

/**
  Serializers are responsible for formatting your route handler's response.

  The application serializer will apply to every response. To make specific customizations, define per-model serializers.

  ```js
  import { createServer, RestSerializer } from 'miragejs';

  createServer({
    serializers: {
      application: RestSerializer,
      user: RestSerializer.extend({
        // user-specific customizations
      })
    }
  })
  ```

  Any Model or Collection returned from a route handler will pass through the serializer layer. Highest priority will be given to a model-specific serializer, then the application serializer, then the default serializer.

  Mirage ships with three named serializers:

  - **JSONAPISerializer**, to simulate JSON:API compliant API servers:

    ```js
    import { createServer, JSONAPISerializer } from 'miragejs';

    createServer({
      serializers: {
        application: JSONAPISerializer
      }
    })
    ```

  - **ActiveModelSerializer**, to mock Rails APIs that use AMS-style responses:

    ```js
    import { createServer, ActiveModelSerializer } from 'miragejs';

    createServer({
      serializers: {
        application: ActiveModelSerializer
      }
    })
    ```

  - **RestSerializer**, a good starting point for many generic REST APIs:

    ```js
    import { createServer, RestSerializer } from 'miragejs';

    createServer({
      serializers: {
        application: RestSerializer
      }
    })
    ```

  Additionally, Mirage has a basic Serializer class which you can customize using the hooks documented below:

  ```js
  import { createServer, Serializer } from 'miragejs';

  createServer({
    serializers: {
      application: Serializer
    }
  })
  ```

  When writing model-specific serializers, remember to extend from your application serializer so shared logic is used by your model-specific classes:

  ```js
  import { createServer, Serializer } from 'miragejs';

  const ApplicationSerializer = Serializer.extend()

  createServer({
    serializers: {
      application: ApplicationSerializer,
      blogPost: ApplicationSerializer.extend({
        include: ['comments']
      })
    }
  })
  ```

  @class Serializer
  @constructor
  @public
*/

var Serializer = /*#__PURE__*/function () {
  function Serializer(registry, type) {
    var _this = this;

    var request = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _classCallCheck(this, Serializer);

    this.registry = registry;
    this.type = type;
    this.request = request;
    /**
      Use this property on a model serializer to whitelist attributes that will be used in your JSON payload.
       For example, if you had a `blog-post` model in your database that looked like
       ```
      {
        id: 1,
        title: 'Lorem ipsum',
        createdAt: '2014-01-01 10:00:00',
        updatedAt: '2014-01-03 11:42:12'
      }
      ```
       and you just wanted `id` and `title`, you could write
       ```js
      Serializer.extend({
        attrs: ['id', 'title']
      });
      ```
       and the payload would look like
       ```
      {
        id: 1,
        title: 'Lorem ipsum'
      }
      ```
       @property attrs
      @public
    */

    this.attrs = this.attrs || undefined; // this is just here so I can add the doc comment. Better way?

    /**
      Use this property on a model serializer to specify related models you'd like to include in your JSON payload. (These can be considered default server-side includes.)
       For example, if you had an `author` with many `blog-post`s and you wanted to sideload these, specify so in the `include` key:
       ```js
      createServer({
        models: {
          author: Model.extend({
            blogPosts: hasMany()
          })
        },
        serializers: {
          author: Serializer.extend({
            include: ['blogPosts']
          });
        }
      })
      ```
       Now a response to a request for an author would look like this:
       ```
      GET /authors/1
       {
        author: {
          id: 1,
          name: 'Link',
          blogPostIds: [1, 2]
        },
        blogPosts: [
          {id: 1, authorId: 1, title: 'Lorem'},
          {id: 2, authorId: 1, title: 'Ipsum'}
        ]
      }
      ```
       You can also define `include` as a function so it can be determined dynamically.
      
      For example, you could conditionally include a relationship based on an `include` query parameter:
       ```js
      // Include blog posts for a GET to /authors/1?include=blogPosts
      
      Serializer.extend({
        include: function(request) {
          if (request.queryParams.include === "blogPosts") {
            return ['blogPosts'];
          } else {
            return [];
          }
        }
      });
      ```
       **Query param includes for JSONAPISerializer**
       The JSONAPISerializer supports the use of `include` query parameter to return compound documents out of the box.
       For example, if your app makes the following request
       ```
      GET /api/authors?include=blogPosts
      ```
       the `JSONAPISerializer` will inspect the query params of the request, see that the blogPosts relationship is present, and then proceed as if this relationship was specified directly in the include: [] array on the serializer itself.
       Note that, in accordance with the spec, Mirage gives precedence to an ?include query param over a default include: [] array that you might have specified directly on the serializer. Default includes will still be in effect, however, if a request does not have an ?include query param.
       Also note that default includes specified with the `include: []` array can only take a single model; they cannot take dot-separated paths to nested relationships.
       If you'd like to set a default dot-separated (nested) include path for a resource, you have to do it at the route level by setting a default value for `request.queryParams`:
       ```js
      this.get('/users', function(schema, request) => {
        request.queryParams = request.queryParams || {};
        if (!request.queryParams.include) {
          request.queryParams.include = 'blog-posts.comments';
        }
         // rest of route handler logic
      });
      ```
       @property include
      @public
    */

    this.include = this.include || []; // this is just here so I can add the doc comment. Better way?

    /**
      Set whether your JSON response should have a root key in it.
       *Doesn't apply to JSONAPISerializer.*
       Defaults to true, so a request for an author looks like:
       ```
      GET /authors/1
       {
        author: {
          id: 1,
          name: 'Link'
        }
      }
      ```
       Setting `root` to false disables this:
       ```js
      Serializer.extend({
        root: false
      });
      ```
       Now the response looks like:
       ```
      GET /authors/1
       {
        id: 1,
        name: 'Link'
      }
      ```
       @property root
      @public
    */

    this.root = this.root || undefined; // this is just here so I can add the doc comment. Better way?

    /**
      Set whether related models should be embedded or sideloaded.
       *Doesn't apply to JSONAPISerializer.*
       By default this false, so relationships are sideloaded:
       ```
      GET /authors/1
       {
        author: {
          id: 1,
          name: 'Link',
          blogPostIds: [1, 2]
        },
        blogPosts: [
          { id: 1, authorId: 1, title: 'Lorem' },
          { id: 2, authorId: 1, title: 'Ipsum' }
        ]
      }
      ```
       Setting `embed` to true will embed all related records:
       ```js
      Serializer.extend({
        embed: true
      });
      ```
       Now the response looks like:
       ```
      GET /authors/1
       {
        author: {
          id: 1,
          name: 'Link',
          blogPosts: [
            { id: 1, authorId: 1, title: 'Lorem' },
            { id: 2, authorId: 1, title: 'Ipsum' }
          ]
        }
      }
      ```
       You can also define `embed` as a function so it can be determined dynamically.
    */

    this.embed = this.embed || undefined; // this is just here so I can add the doc comment. Better way?

    this._embedFn = isFunction(this.embed) ? this.embed : function () {
      return !!_this.embed;
    };
    /**
      Use this to define how your serializer handles serializing relationship keys. It can take one of three values:
       - `included`, which is the default, will serialize the ids of a relationship if that relationship is included (sideloaded) along with the model or collection in the response
      - `always` will always serialize the ids of all relationships for the model or collection in the response
      - `never` will never serialize the ids of relationships for the model or collection in the response
       @property serializeIds
      @public
    */

    this.serializeIds = this.serializeIds || undefined; // this is just here so I can add the doc comment. Better way?

    /**
      Primary Key name of the model
       Defaults to 'id', so a request for an author looks like:
       ```
      GET /authors/1
       {
        author: {
          id: 1,
          name: 'Link'
        }
      }
      ```
       Setting `primaryKey` to 'authorId changes this:
       ```js
      Serializer.extend({
        primaryKey: 'authorId'
      });
      ```
       Now the response looks like:
       ```
      GET /authors/1
       {
        author: {
          authorId: 1,
          name: 'Link'
        }
      }
      ```
       @property primaryKey
      @public
    */

    this.primaryKey = this.primaryKey || undefined; // this is just here so I can add the doc comment. Better way?
  }
  /**
    Override this method to implement your own custom serialize function. *response* is whatever was returned from your route handler, and *request* is the Pretender request object.
     Returns a plain JavaScript object or array, which Mirage uses as the response data to your app's XHR request.
     You can also override this method, call super, and manipulate the data before Mirage responds with it. This is a great place to add metadata, or for one-off operations that don't fit neatly into any of Mirage's other abstractions:
     ```js
    serialize(object, request) {
      // This is how to call super, as Mirage borrows [Backbone's implementation of extend](http://backbonejs.org/#Model-extend)
      let json = Serializer.prototype.serialize.apply(this, arguments);
       // Add metadata, sort parts of the response, etc.
       return json;
    }
    ```
     @param primaryResource
    @param request
    @return { Object } the json response
   */


  _createClass(Serializer, [{
    key: "serialize",
    value: function serialize(primaryResource
    /* , request */
    ) {
      this.primaryResource = primaryResource;
      return this.buildPayload(primaryResource);
    }
    /**
      This method is used by the POST and PUT shorthands. These shorthands expect a valid JSON:API document as part of the request, so that they know how to create or update the appropriate resouce. The *normalize* method allows you to transform your request body into a JSON:API document, which lets you take advantage of the shorthands when you otherwise may not be able to.
       Note that this method is a noop if you're using JSON:API already, since request payloads sent along with POST and PUT requests will already be in the correct format.
       Take a look at the included `ActiveModelSerializer`'s normalize method for an example.
       @method normalize
      @param json
      @public
     */

  }, {
    key: "normalize",
    value: function normalize(json) {
      return json;
    }
  }, {
    key: "buildPayload",
    value: function buildPayload(primaryResource, toInclude, didSerialize, json) {
      if (!primaryResource && isEmpty(toInclude)) {
        return json;
      } else if (primaryResource) {
        var _this$getHashForPrima = this.getHashForPrimaryResource(primaryResource),
            _this$getHashForPrima2 = _slicedToArray(_this$getHashForPrima, 2),
            resourceHash = _this$getHashForPrima2[0],
            newIncludes = _this$getHashForPrima2[1];

        var newDidSerialize = this.isCollection(primaryResource) ? primaryResource.models : [primaryResource];
        return this.buildPayload(undefined, newIncludes, newDidSerialize, resourceHash);
      } else {
        var nextIncludedResource = toInclude.shift();

        var _this$getHashForInclu = this.getHashForIncludedResource(nextIncludedResource),
            _this$getHashForInclu2 = _slicedToArray(_this$getHashForInclu, 2),
            _resourceHash = _this$getHashForInclu2[0],
            _newIncludes = _this$getHashForInclu2[1];

        var newToInclude = _newIncludes.filter(function (resource) {
          return !didSerialize.map(function (m) {
            return m.toString();
          }).includes(resource.toString());
        }).concat(toInclude);

        var _newDidSerialize = (this.isCollection(nextIncludedResource) ? nextIncludedResource.models : [nextIncludedResource]).concat(didSerialize);

        var newJson = this.mergePayloads(json, _resourceHash);
        return this.buildPayload(undefined, newToInclude, _newDidSerialize, newJson);
      }
    }
  }, {
    key: "getHashForPrimaryResource",
    value: function getHashForPrimaryResource(resource) {
      var _this$getHashForResou = this.getHashForResource(resource),
          _this$getHashForResou2 = _slicedToArray(_this$getHashForResou, 2),
          hash = _this$getHashForResou2[0],
          addToIncludes = _this$getHashForResou2[1];

      var hashWithRoot;

      if (this.root) {
        assert(!(resource instanceof PolymorphicCollection), "The base Serializer class cannot serialize a top-level PolymorphicCollection when root is true, since PolymorphicCollections have no type.");
        var serializer = this.serializerFor(resource.modelName);
        var rootKey = serializer.keyForResource(resource);
        hashWithRoot = _defineProperty({}, rootKey, hash);
      } else {
        hashWithRoot = hash;
      }

      return [hashWithRoot, addToIncludes];
    }
  }, {
    key: "getHashForIncludedResource",
    value: function getHashForIncludedResource(resource) {
      var hashWithRoot, addToIncludes;

      if (resource instanceof PolymorphicCollection) {
        hashWithRoot = {};
        addToIncludes = resource.models;
      } else {
        var serializer = this.serializerFor(resource.modelName);

        var _serializer$getHashFo = serializer.getHashForResource(resource),
            _serializer$getHashFo2 = _slicedToArray(_serializer$getHashFo, 2),
            hash = _serializer$getHashFo2[0],
            newModels = _serializer$getHashFo2[1]; // Included resources always have a root, and are always pushed to an array.


        var rootKey = serializer.keyForRelationship(resource.modelName);
        hashWithRoot = Array.isArray(hash) ? _defineProperty({}, rootKey, hash) : _defineProperty({}, rootKey, [hash]);
        addToIncludes = newModels;
      }

      return [hashWithRoot, addToIncludes];
    }
  }, {
    key: "getHashForResource",
    value: function getHashForResource(resource) {
      var _this2 = this;

      var removeForeignKeys = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var didSerialize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var lookupSerializer = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
      var serializer = this;
      var hash; // PolymorphicCollection lacks a modelName, but is dealt with in the map
      // by looking up the serializer on a per-model basis

      if (lookupSerializer && resource.modelName) {
        serializer = this.serializerFor(resource.modelName);
      }

      if (this.isModel(resource)) {
        hash = serializer._hashForModel(resource, removeForeignKeys, didSerialize);
      } else {
        hash = resource.models.map(function (m) {
          var modelSerializer = serializer;

          if (!modelSerializer) {
            // Can't get here if lookupSerializer is false, so look it up
            modelSerializer = _this2.serializerFor(m.modelName);
          }

          return modelSerializer._hashForModel(m, removeForeignKeys, didSerialize);
        });
      }

      var addToIncludes = uniqBy(compact(flatten(serializer.getKeysForIncluded().map(function (key) {
        if (_this2.isCollection(resource)) {
          return resource.models.map(function (m) {
            return m[key];
          });
        } else {
          return resource[key];
        }
      }))), function (m) {
        return m.toString();
      });
      return [hash, addToIncludes];
    }
    /*
      Merges new resource hash into json. If json already has root key,
      pushes value of resourceHash onto that key.
       For example,
           json = {
            post: { id: 1, title: 'Lorem Ipsum', comment_ids: [1, 3] },
            comments: [
              { id: 1, text: 'foo' }
            ]
          };
           resourceHash = {
            comments: [
              { id: 2, text: 'bar' }
            ]
          };
       would yield
           {
            post: { id: 1, title: 'Lorem Ipsum', comment_ids: [1, 3] },
            comments: [
              { id: 1, text: 'foo' },
              { id: 2, text: 'bar' }
            ]
          };
     */

  }, {
    key: "mergePayloads",
    value: function mergePayloads(json, resourceHash) {
      var newJson;

      var _Object$keys = Object.keys(resourceHash),
          _Object$keys2 = _slicedToArray(_Object$keys, 1),
          resourceHashKey = _Object$keys2[0];

      if (json[resourceHashKey]) {
        newJson = json;
        newJson[resourceHashKey] = json[resourceHashKey].concat(resourceHash[resourceHashKey]);
      } else {
        newJson = Object.assign(json, resourceHash);
      }

      return newJson;
    }
  }, {
    key: "keyForResource",
    value: function keyForResource(resource) {
      var modelName = resource.modelName;
      return this.isModel(resource) ? this.keyForModel(modelName) : this.keyForCollection(modelName);
    }
    /**
      Used to define a custom key when serializing a primary model of modelName *modelName*. For example, the default Serializer will return something like the following:
       ```
      GET /blogPosts/1
       {
        blogPost: {
          id: 1,
          title: 'Lorem ipsum'
        }
      }
      ```
       If your API uses hyphenated keys, you could overwrite `keyForModel`:
       ```js
      // serializers/application.js
      export default Serializer.extend({
        keyForModel(modelName) {
          return hyphenate(modelName);
        }
      });
      ```
       Now the response will look like
       ```
      {
        'blog-post': {
          id: 1,
          title: 'Lorem ipsum'
        }
      }
      ```
       @method keyForModel
      @param modelName
      @public
     */

  }, {
    key: "keyForModel",
    value: function keyForModel(modelName) {
      return camelize(modelName);
    }
    /**
      Used to customize the key when serializing a primary collection. By default this pluralizes the return value of `keyForModel`.
       For example, by default the following request may look like:
       ```
      GET /blogPosts
       {
        blogPosts: [
          {
            id: 1,
            title: 'Lorem ipsum'
          },
          ...
        ]
      }
      ```
       If your API hyphenates keys, you could overwrite `keyForCollection`:
       ```js
      // serializers/application.js
      export default Serializer.extend({
        keyForCollection(modelName) {
          return this._container.inflector.pluralize(dasherize(modelName));
        }
      });
      ```
       Now the response would look like:
       ```
      {
        'blog-posts': [
          {
            id: 1,
            title: 'Lorem ipsum'
          },
          ...
        ]
      }
      ```
       @method keyForCollection
      @param modelName
      @public
     */

  }, {
    key: "keyForCollection",
    value: function keyForCollection(modelName) {
      return this._container.inflector.pluralize(this.keyForModel(modelName));
    }
  }, {
    key: "_hashForModel",
    value: function _hashForModel(model, removeForeignKeys) {
      var _this3 = this;

      var didSerialize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var attrs = this._attrsForModel(model);

      if (removeForeignKeys) {
        model.fks.forEach(function (fk) {
          delete attrs[fk];
        });
      }

      if (this.embed) {
        var newDidSerialize = Object.assign({}, didSerialize);
        newDidSerialize[model.modelName] = newDidSerialize[model.modelName] || {};
        newDidSerialize[model.modelName][model.id] = true;
        this.getKeysForEmbedded().forEach(function (key) {
          var associatedResource = model[key];

          if (associatedResource && !get(newDidSerialize, "".concat(associatedResource.modelName, ".").concat(associatedResource.id))) {
            var _this3$getHashForReso = _this3.getHashForResource(associatedResource, true, newDidSerialize, true),
                _this3$getHashForReso2 = _slicedToArray(_this3$getHashForReso, 1),
                associatedResourceHash = _this3$getHashForReso2[0];

            var formattedKey = _this3.keyForEmbeddedRelationship(key);

            attrs[formattedKey] = associatedResourceHash;

            if (_this3.isModel(associatedResource)) {
              var fk = "".concat(camelize(key), "Id");
              delete attrs[fk];
            }
          }
        });
      }

      return this._maybeAddAssociationIds(model, attrs);
    }
    /**
      @method _attrsForModel
      @param model
      @private
      @hide
     */

  }, {
    key: "_attrsForModel",
    value: function _attrsForModel(model) {
      var attrs = {};

      if (this.attrs) {
        attrs = this.attrs.reduce(function (memo, attr) {
          memo[attr] = model[attr];
          return memo;
        }, {});
      } else {
        attrs = Object.assign(attrs, model.attrs);
      } // Remove fks


      model.fks.forEach(function (key) {
        return delete attrs[key];
      });
      return this._formatAttributeKeys(attrs);
    }
    /**
      @method _maybeAddAssociationIds
      @param model
      @param attrs
      @private
      @hide
     */

  }, {
    key: "_maybeAddAssociationIds",
    value: function _maybeAddAssociationIds(model, attrs) {
      var _this4 = this;

      var newHash = Object.assign({}, attrs);

      if (this.serializeIds === "always") {
        _toConsumableArray(model.associationKeys).filter(function (key) {
          return !_this4._embedFn(key);
        }).forEach(function (key) {
          var resource = model[key];
          var association = model.associationFor(key);

          if (_this4.isCollection(resource)) {
            var formattedKey = _this4.keyForRelationshipIds(key);

            newHash[formattedKey] = model["".concat(_this4._container.inflector.singularize(key), "Ids")];
          } else if (_this4.isModel(resource) && association.isPolymorphic) {
            var formattedTypeKey = _this4.keyForPolymorphicForeignKeyType(key);

            var formattedIdKey = _this4.keyForPolymorphicForeignKeyId(key);

            newHash[formattedTypeKey] = model["".concat(key, "Id")].type;
            newHash[formattedIdKey] = model["".concat(key, "Id")].id;
          } else if (resource) {
            var _formattedKey = _this4.keyForForeignKey(key);

            newHash[_formattedKey] = model["".concat(key, "Id")];
          }
        });
      } else if (this.serializeIds === "included") {
        this.getKeysForIncluded().forEach(function (key) {
          var resource = model[key];
          var association = model.associationFor(key);

          if (_this4.isCollection(resource)) {
            var formattedKey = _this4.keyForRelationshipIds(key);

            newHash[formattedKey] = model["".concat(_this4._container.inflector.singularize(key), "Ids")];
          } else if (_this4.isModel(resource) && association.isPolymorphic) {
            var formattedTypeKey = _this4.keyForPolymorphicForeignKeyType(key);

            var formattedIdKey = _this4.keyForPolymorphicForeignKeyId(key);

            newHash[formattedTypeKey] = model["".concat(key, "Id")].type;
            newHash[formattedIdKey] = model["".concat(key, "Id")].id;
          } else if (_this4.isModel(resource)) {
            var _formattedKey2 = _this4.keyForForeignKey(key);

            newHash[_formattedKey2] = model["".concat(key, "Id")];
          }
        });
      }

      return newHash;
    }
    /**
      Used to customize how a model's attribute is formatted in your JSON payload.
       By default, model attributes are camelCase:
       ```
      GET /authors/1
       {
        author: {
          firstName: 'Link',
          lastName: 'The WoodElf'
        }
      }
      ```
       If your API expects snake case, you could write the following:
       ```js
      // serializers/application.js
      export default Serializer.extend({
        keyForAttribute(attr) {
          return underscore(attr);
        }
      });
      ```
       Now the response would look like:
       ```
      {
        author: {
          first_name: 'Link',
          last_name: 'The WoodElf'
        }
      }
      ```
       @method keyForAttribute
      @param attr
      @public
     */

  }, {
    key: "keyForAttribute",
    value: function keyForAttribute(attr) {
      if (attr === "id") {
        return this.keyForId();
      }

      return attr;
    }
    /**
      Use this hook to format the key for collections related to this model. *modelName* is the named parameter for the relationship.
       For example, if you're serializing an `author` that
      sideloads many `blogPosts`, the default response will look like:
       ```
      {
        author: {...},
        blogPosts: [...]
      }
      ```
       Overwrite `keyForRelationship` to format this key:
       ```js
      // serializers/application.js
      export default Serializer.extend({
        keyForRelationship(modelName) {
          return underscore(modelName);
        }
      });
      ```
       Now the response will look like this:
       ```
      {
        author: {...},
        blog_posts: [...]
      }
      ```
       @method keyForRelationship
      @param modelName
      @public
     */

  }, {
    key: "keyForRelationship",
    value: function keyForRelationship(modelName) {
      return camelize(this._container.inflector.pluralize(modelName));
    }
    /**
      Like `keyForRelationship`, but for embedded relationships.
       @method keyForEmbeddedRelationship
      @param attributeName
      @public
     */

  }, {
    key: "keyForEmbeddedRelationship",
    value: function keyForEmbeddedRelationship(attributeName) {
      return camelize(attributeName);
    }
    /**
      Use this hook to format the key for the IDS of a `hasMany` relationship
      in this model's JSON representation.
       For example, if you're serializing an `author` that
      sideloads many `blogPosts`, by default your `author` JSON would include a `blogPostIds` key:
       ```
      {
        author: {
          id: 1,
          blogPostIds: [1, 2, 3]
        },
        blogPosts: [...]
      }
      ```
       Overwrite `keyForRelationshipIds` to format this key:
       ```js
      // serializers/application.js
      export default Serializer.extend({
        keyForRelationshipIds(relationship) {
          return underscore(relationship) + '_ids';
        }
      });
      ```
       Now the response will look like:
       ```
      {
        author: {
          id: 1,
          blog_post_ids: [1, 2, 3]
        },
        blogPosts: [...]
      }
      ```
       @method keyForRelationshipIds
      @param modelName
      @public
     */

  }, {
    key: "keyForRelationshipIds",
    value: function keyForRelationshipIds(relationshipName) {
      return "".concat(this._container.inflector.singularize(camelize(relationshipName)), "Ids");
    }
    /**
      Like `keyForRelationshipIds`, but for `belongsTo` relationships.
       For example, if you're serializing a `blogPost` that sideloads one `author`,
      your `blogPost` JSON would include a `authorId` key:
       ```
      {
        blogPost: {
          id: 1,
          authorId: 1
        },
        author: ...
      }
      ```
       Overwrite `keyForForeignKey` to format this key:
       ```js
      // serializers/application.js
      export default Serializer.extend({
        keyForForeignKey(relationshipName) {
          return underscore(relationshipName) + '_id';
        }
      });
      ```
       Now the response will look like:
       ```js
      {
        blogPost: {
          id: 1,
          author_id: 1
        },
        author: ...
      }
      ```
       @method keyForForeignKey
      @param relationshipName
      @public
     */

  }, {
    key: "keyForForeignKey",
    value: function keyForForeignKey(relationshipName) {
      return "".concat(camelize(relationshipName), "Id");
    }
    /**
      Polymorphic relationships are represented with type-id pairs.
       Given the following model
       ```js
      Model.extend({
        commentable: belongsTo({ polymorphic: true })
      });
      ```
       the default Serializer would produce
       ```js
      {
        comment: {
          id: 1,
          commentableType: 'post',
          commentableId: '1'
        }
      }
      ```
       This hook controls how the `id` field (`commentableId` in the above example)
      is serialized. By default it camelizes the relationship and adds `Id` as a suffix.
       @method keyForPolymorphicForeignKeyId
      @param {String} relationshipName
      @return {String}
      @public
    */

  }, {
    key: "keyForPolymorphicForeignKeyId",
    value: function keyForPolymorphicForeignKeyId(relationshipName) {
      return "".concat(camelize(relationshipName), "Id");
    }
    /**
      Polymorphic relationships are represented with type-id pairs.
       Given the following model
       ```js
      Model.extend({
        commentable: belongsTo({ polymorphic: true })
      });
      ```
       the default Serializer would produce
       ```js
      {
        comment: {
          id: 1,
          commentableType: 'post',
          commentableId: '1'
        }
      }
      ```
       This hook controls how the `type` field (`commentableType` in the above example)
      is serialized. By default it camelizes the relationship and adds `Type` as a suffix.
       @method keyForPolymorphicForeignKeyType
      @param {String} relationshipName
      @return {String}
      @public
    */

  }, {
    key: "keyForPolymorphicForeignKeyType",
    value: function keyForPolymorphicForeignKeyType(relationshipName) {
      return "".concat(camelize(relationshipName), "Type");
    }
    /**
      @method isModel
      @param object
      @return {Boolean}
      @public
      @hide
     */

  }, {
    key: "isModel",
    value: function isModel(object) {
      return object instanceof Model;
    }
    /**
      @method isCollection
      @param object
      @return {Boolean}
      @public
      @hide
     */

  }, {
    key: "isCollection",
    value: function isCollection(object) {
      return object instanceof Collection || object instanceof PolymorphicCollection;
    }
    /**
      @method isModelOrCollection
      @param object
      @return {Boolean}
      @public
      @hide
     */

  }, {
    key: "isModelOrCollection",
    value: function isModelOrCollection(object) {
      return this.isModel(object) || this.isCollection(object);
    }
    /**
      @method serializerFor
      @param type
      @public
      @hide
     */

  }, {
    key: "serializerFor",
    value: function serializerFor(type) {
      return this.registry.serializerFor(type);
    }
  }, {
    key: "getAssociationKeys",
    value: function getAssociationKeys() {
      return isFunction(this.include) ? this.include(this.request, this.primaryResource) : this.include;
    }
  }, {
    key: "getKeysForEmbedded",
    value: function getKeysForEmbedded() {
      var _this5 = this;

      return this.getAssociationKeys().filter(function (k) {
        return _this5._embedFn(k);
      });
    }
  }, {
    key: "getKeysForIncluded",
    value: function getKeysForIncluded() {
      var _this6 = this;

      return this.getAssociationKeys().filter(function (k) {
        return !_this6._embedFn(k);
      });
    }
    /**
      A reference to the schema instance.
       Useful to reference registered schema information, for example in a Serializer's include hook to include all a resource's associations:
       ```js
      Serializer.extend({
        include(request, resource) {
          return Object.keys(this.schema.associationsFor(resource.modelName));
        }
      })
      ```
       @property
      @type {Object}
      @public
    */

  }, {
    key: "schema",
    get: function get() {
      return this.registry.schema;
    }
    /**
      Used to customize how a model's primary key is formatted in your JSON payload.
       By default, this is 'id'
       ```
      GET /authors/1
       {
        author: {
          id: '1',
          firstName: 'Link',
          lastName: 'The WoodElf'
        }
      }
      ```
       If your API expects a different primary key, you could write the following:
       ```js
      // serializers/application.js
      export default Serializer.extend({
        keyForId() {
          return 'authorId';
        }
      });
      ```
       Now the response would look like:
       ```
      {
        author: {
          authorId: '1',
          firstName: 'Link',
          lastName: 'The WoodElf'
        }
      }
      ```
       See the property `primaryKey` for a shorthand way of doing this on a model serializer
       @method keyForId
      @public
     */

  }, {
    key: "keyForId",
    value: function keyForId() {
      return this.primaryKey;
    }
    /**
      Used to customize how a model's primary key value is formatted in your JSON payload.
       By default, the primary key is a string
       ```
      GET /authors/1
       {
        author: {
          id: '1',
          firstName: 'Link',
          lastName: 'The WoodElf'
        }
      }
      ```
       If your API expects a integers, you could write the following:
       ```js
      // serializers/application.js
      export default Serializer.extend({
        valueForId(value) {
          return parseInt(value);
        }
      });
      ```
       Now the response would look like:
       ```
      {
        author: {
          authorId: 1,
          firstName: 'Link',
          lastName: 'The WoodElf'
        }
      }
      ```
       @method valueForId
      @param value
      @public
     */

  }, {
    key: "valueForId",
    value: function valueForId(value) {
      return value;
    }
    /**
      @method _formatAttributeKeys
      @param attrs
      @private
      @hide
     */

  }, {
    key: "_formatAttributeKeys",
    value: function _formatAttributeKeys(attrs) {
      var formattedAttrs = {};

      for (var key in attrs) {
        var formattedValue = attrs[key];

        if (key === "id") {
          formattedValue = this.valueForId(formattedValue);
        }

        var formattedKey = this.keyForAttribute(key);
        formattedAttrs[formattedKey] = formattedValue;
      }

      return formattedAttrs;
    }
  }, {
    key: "getCoalescedIds",
    value: function getCoalescedIds() {}
  }]);

  return Serializer;
}(); // Defaults


Serializer.prototype.include = [];
Serializer.prototype.root = true;
Serializer.prototype.embed = false;
Serializer.prototype.primaryKey = "id";
Serializer.prototype.serializeIds = "included"; // can be 'included', 'always', or 'never'

Serializer.extend = extend;

/**
  The JSONAPISerializer. Subclass of Serializer.

  @class JSONAPISerializer
  @constructor
  @public
 */

var JSONAPISerializer = /*#__PURE__*/function (_Serializer) {
  _inherits(JSONAPISerializer, _Serializer);

  var _super = _createSuper(JSONAPISerializer);

  function JSONAPISerializer() {
    var _this;

    _classCallCheck(this, JSONAPISerializer);

    _this = _super.apply(this, arguments);
    /**
      By default, JSON:API's linkage data is only added for relationships that are being included in the current request.
       That means given an `author` model with a `posts` relationship, a GET request to /authors/1 would return a JSON:API document with an empty `relationships` hash:
       ```js
      {
        data: {
          type: 'authors',
          id: '1',
          attributes: { ... }
        }
      }
      ```
       but a request to GET /authors/1?include=posts would have linkage data added (in addition to the included resources):
       ```js
      {
        data: {
          type: 'authors',
          id: '1',
          attributes: { ... },
          relationships: {
            data: [
              { type: 'posts', id: '1' },
              { type: 'posts', id: '2' },
              { type: 'posts', id: '3' }
            ]
          }
        },
        included: [ ... ]
      }
      ```
       To add the linkage data for all relationships, you could set `alwaysIncludeLinkageData` to `true`:
       ```js
      JSONAPISerializer.extend({
        alwaysIncludeLinkageData: true
      });
      ```
       Then, a GET to /authors/1 would respond with
       ```js
      {
        data: {
          type: 'authors',
          id: '1',
          attributes: { ... },
          relationships: {
            posts: {
              data: [
                { type: 'posts', id: '1' },
                { type: 'posts', id: '2' },
                { type: 'posts', id: '3' }
              ]
            }
          }
        }
      }
      ```
       even though the related `posts` are not included in the same document.
       You can also use the `links` method (on the Serializer base class) to add relationship links (which will always be added regardless of the relationship is being included document), or you could use `shouldIncludeLinkageData` for more granular control.
       For more background on the behavior of this API, see [this blog post](http://www.ember-cli-mirage.com/blog/changing-mirages-default-linkage-data-behavior-1475).
       @property alwaysIncludeLinkageData
      @type {Boolean}
      @public
    */

    _this.alwaysIncludeLinkageData = _this.alwaysIncludeLinkageData || undefined; // this is just here so I can add the doc comment. Better way?

    return _this;
  } // Don't think this is used?


  _createClass(JSONAPISerializer, [{
    key: "keyForModel",
    value: function keyForModel(modelName) {
      return dasherize(modelName);
    } // Don't think this is used?

  }, {
    key: "keyForCollection",
    value: function keyForCollection(modelName) {
      return dasherize(modelName);
    }
    /**
      Used to customize the key for an attribute. By default, compound attribute names are dasherized.
       For example, the JSON:API document for a `post` model with a `commentCount` attribute would be:
       ```js
      {
        data: {
          id: 1,
          type: 'posts',
          attributes: {
            'comment-count': 28
          }
        }
      }
      ```
       @method keyForAttribute
      @param {String} attr
      @return {String}
      @public
    */

  }, {
    key: "keyForAttribute",
    value: function keyForAttribute(attr) {
      return dasherize(attr);
    }
    /**
      Used to customize the key for a relationships. By default, compound relationship names are dasherized.
       For example, the JSON:API document for an `author` model with a `blogPosts` relationship would be:
       ```js
      {
        data: {
          id: 1,
          type: 'author',
          attributes: {
            ...
          },
          relationships: {
            'blog-posts': {
              ...
            }
          }
        }
      }
      ```
       @method keyForRelationship
      @param {String} key
      @return {String}
      @public
    */

  }, {
    key: "keyForRelationship",
    value: function keyForRelationship(key) {
      return dasherize(key);
    }
    /**
      Use this hook to add top-level `links` data to JSON:API resource objects. The argument is the model being serialized.
       ```js
      // serializers/author.js
      import { JSONAPISerializer } from 'miragejs';
       export default JSONAPISerializer.extend({
         links(author) {
          return {
            'posts': {
              related: `/api/authors/${author.id}/posts`
            }
          };
        }
       });
      ```
       @method links
      @param model
    */

  }, {
    key: "links",
    value: function links() {}
  }, {
    key: "getHashForPrimaryResource",
    value: function getHashForPrimaryResource(resource) {
      this._createRequestedIncludesGraph(resource);

      var resourceHash = this.getHashForResource(resource);
      var hashWithRoot = {
        data: resourceHash
      };
      var addToIncludes = this.getAddToIncludesForResource(resource);
      return [hashWithRoot, addToIncludes];
    }
  }, {
    key: "getHashForIncludedResource",
    value: function getHashForIncludedResource(resource) {
      var serializer = this.serializerFor(resource.modelName);
      var hash = serializer.getHashForResource(resource);
      var hashWithRoot = {
        included: this.isModel(resource) ? [hash] : hash
      };
      var addToIncludes = [];

      if (!this.hasQueryParamIncludes()) {
        addToIncludes = this.getAddToIncludesForResource(resource);
      }

      return [hashWithRoot, addToIncludes];
    }
  }, {
    key: "getHashForResource",
    value: function getHashForResource(resource) {
      var _this2 = this;

      var hash;

      if (this.isModel(resource)) {
        hash = this.getResourceObjectForModel(resource);
      } else {
        hash = resource.models.map(function (m) {
          return _this2.getResourceObjectForModel(m);
        });
      }

      return hash;
    }
    /*
      Returns a flat unique list of resources that need to be added to includes
    */

  }, {
    key: "getAddToIncludesForResource",
    value: function getAddToIncludesForResource(resource) {
      var relationshipPaths;

      if (this.hasQueryParamIncludes()) {
        relationshipPaths = this.getQueryParamIncludes();
      } else {
        var serializer = this.serializerFor(resource.modelName);
        relationshipPaths = serializer.getKeysForIncluded();
      }

      return this.getAddToIncludesForResourceAndPaths(resource, relationshipPaths);
    }
  }, {
    key: "getAddToIncludesForResourceAndPaths",
    value: function getAddToIncludesForResourceAndPaths(resource, relationshipPaths) {
      var _this3 = this;

      var includes = [];
      relationshipPaths.forEach(function (path) {
        var relationshipNames = path.split(".");

        var newIncludes = _this3.getIncludesForResourceAndPath.apply(_this3, [resource].concat(_toConsumableArray(relationshipNames)));

        includes.push(newIncludes);
      });
      return uniqBy(compact(flatten(includes)), function (m) {
        return m.toString();
      });
    }
  }, {
    key: "getIncludesForResourceAndPath",
    value: function getIncludesForResourceAndPath(resource) {
      var _this4 = this;

      for (var _len = arguments.length, names = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        names[_key - 1] = arguments[_key];
      }

      var nameForCurrentResource = camelize(names.shift());
      var includes = [];
      var modelsToAdd = [];

      if (this.isModel(resource)) {
        var relationship = resource[nameForCurrentResource];

        if (this.isModel(relationship)) {
          modelsToAdd = [relationship];
        } else if (this.isCollection(relationship)) {
          modelsToAdd = relationship.models;
        }
      } else {
        resource.models.forEach(function (model) {
          var relationship = model[nameForCurrentResource];

          if (_this4.isModel(relationship)) {
            modelsToAdd.push(relationship);
          } else if (_this4.isCollection(relationship)) {
            modelsToAdd = modelsToAdd.concat(relationship.models);
          }
        });
      }

      includes = includes.concat(modelsToAdd);

      if (names.length) {
        modelsToAdd.forEach(function (model) {
          includes = includes.concat(_this4.getIncludesForResourceAndPath.apply(_this4, [model].concat(names)));
        });
      }

      return includes;
    }
  }, {
    key: "getResourceObjectForModel",
    value: function getResourceObjectForModel(model) {
      var attrs = this._attrsForModel(model, true);

      delete attrs.id;
      var hash = {
        type: this.typeKeyForModel(model),
        id: model.id,
        attributes: attrs
      };
      return this._maybeAddRelationshipsToResourceObjectForModel(hash, model);
    }
  }, {
    key: "_maybeAddRelationshipsToResourceObjectForModel",
    value: function _maybeAddRelationshipsToResourceObjectForModel(hash, model) {
      var _this5 = this;

      var relationships = {};
      model.associationKeys.forEach(function (key) {
        var relationship = model[key];

        var relationshipKey = _this5.keyForRelationship(key);

        var relationshipHash = {};

        if (_this5.hasLinksForRelationship(model, key)) {
          var serializer = _this5.serializerFor(model.modelName);

          var links = serializer.links(model);
          relationshipHash.links = links[key];
        }

        if (_this5.alwaysIncludeLinkageData || _this5.shouldIncludeLinkageData(key, model) || _this5._relationshipIsIncludedForModel(key, model)) {
          var data = null;

          if (_this5.isModel(relationship)) {
            data = {
              type: _this5.typeKeyForModel(relationship),
              id: relationship.id
            };
          } else if (_this5.isCollection(relationship)) {
            data = relationship.models.map(function (model) {
              return {
                type: _this5.typeKeyForModel(model),
                id: model.id
              };
            });
          }

          relationshipHash.data = data;
        }

        if (!isEmpty(relationshipHash)) {
          relationships[relationshipKey] = relationshipHash;
        }
      });

      if (!isEmpty(relationships)) {
        hash.relationships = relationships;
      }

      return hash;
    }
  }, {
    key: "hasLinksForRelationship",
    value: function hasLinksForRelationship(model, relationshipKey) {
      var serializer = this.serializerFor(model.modelName);
      var links = serializer.links && serializer.links(model);
      return links && links[relationshipKey] != null;
    }
    /*
      This code (and a lot of this serializer) need to be re-worked according to
      the graph logic...
    */

  }, {
    key: "_relationshipIsIncludedForModel",
    value: function _relationshipIsIncludedForModel(relationshipKey, model) {
      if (this.hasQueryParamIncludes()) {
        var graph = this.request._includesGraph;

        var graphKey = this._graphKeyForModel(model); // Find the resource in the graph


        var graphResource; // Check primary data

        if (graph.data[graphKey]) {
          graphResource = graph.data[graphKey]; // Check includes
        } else if (graph.included[this._container.inflector.pluralize(model.modelName)]) {
          graphResource = graph.included[this._container.inflector.pluralize(model.modelName)][graphKey];
        } // If the model's in the graph, check if relationshipKey should be included


        return graphResource && graphResource.relationships && Object.prototype.hasOwnProperty.call(graphResource.relationships, dasherize(relationshipKey));
      } else {
        var relationshipPaths = this.getKeysForIncluded();
        return relationshipPaths.includes(relationshipKey);
      }
    }
    /*
      This is needed for _relationshipIsIncludedForModel - see the note there for
      more background.
       If/when we can refactor this serializer, the logic in this method would
      probably be the basis for the new overall json/graph creation.
    */

  }, {
    key: "_createRequestedIncludesGraph",
    value: function _createRequestedIncludesGraph(primaryResource) {
      var _this6 = this;
      var graph = {
        data: {}
      };

      if (this.isModel(primaryResource)) {
        var primaryResourceKey = this._graphKeyForModel(primaryResource);

        graph.data[primaryResourceKey] = {};

        this._addPrimaryModelToRequestedIncludesGraph(graph, primaryResource);
      } else if (this.isCollection(primaryResource)) {
        primaryResource.models.forEach(function (model) {
          var primaryResourceKey = _this6._graphKeyForModel(model);

          graph.data[primaryResourceKey] = {};

          _this6._addPrimaryModelToRequestedIncludesGraph(graph, model);
        });
      } // Hack :/ Need to think of a better palce to put this if
      // refactoring json:api serializer.


      this.request._includesGraph = graph;
    }
  }, {
    key: "_addPrimaryModelToRequestedIncludesGraph",
    value: function _addPrimaryModelToRequestedIncludesGraph(graph, model) {
      var _this7 = this;

      if (this.hasQueryParamIncludes()) {
        var graphKey = this._graphKeyForModel(model);

        this.getQueryParamIncludes().filter(function (item) {
          return !!item.trim();
        }).forEach(function (includesPath) {
          // includesPath is post.comments, for example
          graph.data[graphKey].relationships = graph.data[graphKey].relationships || {};
          var relationshipKeys = includesPath.split(".").map(dasherize);
          var relationshipKey = relationshipKeys[0];
          var graphRelationshipKey = relationshipKey;
          var normalizedRelationshipKey = camelize(relationshipKey);
          var hasAssociation = model.associationKeys.has(normalizedRelationshipKey);
          assert(hasAssociation, "You tried to include \"".concat(relationshipKey, "\" with ").concat(model, " but no association named \"").concat(normalizedRelationshipKey, "\" is defined on the model."));
          var relationship = model[normalizedRelationshipKey];
          var relationshipData;

          if (_this7.isModel(relationship)) {
            relationshipData = _this7._graphKeyForModel(relationship);
          } else if (_this7.isCollection(relationship)) {
            relationshipData = relationship.models.map(_this7._graphKeyForModel);
          } else {
            relationshipData = null;
          }

          graph.data[graphKey].relationships[graphRelationshipKey] = relationshipData;

          if (relationship) {
            _this7._addResourceToRequestedIncludesGraph(graph, relationship, relationshipKeys.slice(1));
          }
        });
      }
    }
  }, {
    key: "_addResourceToRequestedIncludesGraph",
    value: function _addResourceToRequestedIncludesGraph(graph, resource, relationshipNames) {
      var _this8 = this;

      graph.included = graph.included || {};
      var models = this.isCollection(resource) ? resource.models : [resource];
      models.forEach(function (model) {
        var collectionName = _this8._container.inflector.pluralize(model.modelName);

        graph.included[collectionName] = graph.included[collectionName] || {};

        _this8._addModelToRequestedIncludesGraph(graph, model, relationshipNames);
      });
    }
  }, {
    key: "_addModelToRequestedIncludesGraph",
    value: function _addModelToRequestedIncludesGraph(graph, model, relationshipNames) {
      var collectionName = this._container.inflector.pluralize(model.modelName);

      var resourceKey = this._graphKeyForModel(model);

      graph.included[collectionName][resourceKey] = graph.included[collectionName][resourceKey] || {};

      if (relationshipNames.length) {
        this._addResourceRelationshipsToRequestedIncludesGraph(graph, collectionName, resourceKey, model, relationshipNames);
      }
    }
    /*
      Lot of the same logic here from _addPrimaryModelToRequestedIncludesGraph, could refactor & share
    */

  }, {
    key: "_addResourceRelationshipsToRequestedIncludesGraph",
    value: function _addResourceRelationshipsToRequestedIncludesGraph(graph, collectionName, resourceKey, model, relationshipNames) {
      graph.included[collectionName][resourceKey].relationships = graph.included[collectionName][resourceKey].relationships || {};
      var relationshipName = relationshipNames[0];
      var relationship = model[camelize(relationshipName)];
      var relationshipData;

      if (this.isModel(relationship)) {
        relationshipData = this._graphKeyForModel(relationship);
      } else if (this.isCollection(relationship)) {
        relationshipData = relationship.models.map(this._graphKeyForModel);
      }

      graph.included[collectionName][resourceKey].relationships[relationshipName] = relationshipData;

      if (relationship) {
        this._addResourceToRequestedIncludesGraph(graph, relationship, relationshipNames.slice(1));
      }
    }
  }, {
    key: "_graphKeyForModel",
    value: function _graphKeyForModel(model) {
      return "".concat(model.modelName, ":").concat(model.id);
    }
  }, {
    key: "getQueryParamIncludes",
    value: function getQueryParamIncludes() {
      var includes = get(this, "request.queryParams.include");

      if (includes && !Array.isArray(includes)) {
        includes = includes.split(",");
      }

      return includes;
    }
  }, {
    key: "hasQueryParamIncludes",
    value: function hasQueryParamIncludes() {
      return !!this.getQueryParamIncludes();
    }
    /**
      Used to customize the `type` field of the document. By default, pluralizes and dasherizes the model's `modelName`.
       For example, the JSON:API document for a `blogPost` model would be:
       ```js
      {
        data: {
          id: 1,
          type: 'blog-posts'
        }
      }
      ```
       @method typeKeyForModel
      @param {Model} model
      @return {String}
      @public
    */

  }, {
    key: "typeKeyForModel",
    value: function typeKeyForModel(model) {
      return dasherize(this._container.inflector.pluralize(model.modelName));
    }
  }, {
    key: "getCoalescedIds",
    value: function getCoalescedIds(request) {
      var ids = request.queryParams && request.queryParams["filter[id]"];

      if (typeof ids === "string") {
        return ids.split(",");
      }

      return ids;
    }
    /**
      Allows for per-relationship inclusion of linkage data. Use this when `alwaysIncludeLinkageData` is not granular enough.
       ```js
      export default JSONAPISerializer.extend({
        shouldIncludeLinkageData(relationshipKey, model) {
          if (relationshipKey === 'author' || relationshipKey === 'ghostWriter') {
            return true;
          }
          return false;
        }
      });
      ```
       @method shouldIncludeLinkageData
      @param {String} relationshipKey
      @param {Model} model
      @return {Boolean}
      @public
    */

  }, {
    key: "shouldIncludeLinkageData",
    value: function shouldIncludeLinkageData(relationshipKey, model) {
      return false;
    }
  }]);

  return JSONAPISerializer;
}(Serializer);

JSONAPISerializer.prototype.alwaysIncludeLinkageData = false;

/**
 * @hide
 */

var SerializerRegistry = /*#__PURE__*/function () {
  function SerializerRegistry(schema) {
    var serializerMap = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, SerializerRegistry);

    this.schema = schema;
    this._serializerMap = serializerMap;
  }

  _createClass(SerializerRegistry, [{
    key: "normalize",
    value: function normalize(payload, modelName) {
      return this.serializerFor(modelName).normalize(payload);
    }
  }, {
    key: "serialize",
    value: function serialize(response, request) {
      var _this = this;

      this.request = request;

      if (this._isModelOrCollection(response)) {
        var serializer = this.serializerFor(response.modelName);
        return serializer.serialize(response, request);
      } else if (Array.isArray(response) && response.some(this._isCollection)) {
        return response.reduce(function (json, collection) {
          var serializer = _this.serializerFor(collection.modelName);

          if (serializer.embed) {
            json[_this._container.inflector.pluralize(collection.modelName)] = serializer.serialize(collection, request);
          } else {
            json = Object.assign(json, serializer.serialize(collection, request));
          }

          return json;
        }, {});
      } else {
        return response;
      }
    }
  }, {
    key: "serializerFor",
    value: function serializerFor(type) {
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref$explicit = _ref.explicit,
          explicit = _ref$explicit === void 0 ? false : _ref$explicit;

      var SerializerForResponse = type && this._serializerMap && this._serializerMap[camelize(type)];

      if (explicit) {
        assert(!!SerializerForResponse, "You passed in ".concat(type, " as an explicit serializer type but that serializer doesn't exist."));
      } else {
        SerializerForResponse = SerializerForResponse || this._serializerMap.application || Serializer;
        assert(!SerializerForResponse || SerializerForResponse.prototype.embed || SerializerForResponse.prototype.root || new SerializerForResponse() instanceof JSONAPISerializer, "You cannot have a serializer that sideloads (embed: false) and disables the root (root: false).");
      }

      return new SerializerForResponse(this, type, this.request);
    }
  }, {
    key: "_isModel",
    value: function _isModel(object) {
      return object instanceof Model;
    }
  }, {
    key: "_isCollection",
    value: function _isCollection(object) {
      return object instanceof Collection || object instanceof PolymorphicCollection;
    }
  }, {
    key: "_isModelOrCollection",
    value: function _isModelOrCollection(object) {
      return this._isModel(object) || this._isCollection(object);
    }
  }, {
    key: "registerSerializers",
    value: function registerSerializers(newSerializerMaps) {
      var currentSerializerMap = this._serializerMap || {};
      this._serializerMap = Object.assign(currentSerializerMap, newSerializerMaps);
    }
  }, {
    key: "getCoalescedIds",
    value: function getCoalescedIds(request, modelName) {
      return this.serializerFor(modelName).getCoalescedIds(request);
    }
  }]);

  return SerializerRegistry;
}();

var collectionNameCache = {};
var internalCollectionNameCache = {};
var modelNameCache = {};
/**
  The primary use of the `Schema` class is to use it to find Models and Collections via the `Model` class methods.

  The `Schema` is most often accessed via the first parameter to a route handler:

  ```js
  this.get('posts', schema => {
    return schema.posts.where({ isAdmin: false });
  });
  ```

  It is also available from the `.schema` property of a `server` instance:

  ```js
  server.schema.users.create({ name: 'Yehuda' });
  ```

  To work with the Model or Collection returned from one of the methods below, refer to the instance methods in the API docs for the `Model` and `Collection` classes.

  @class Schema
  @constructor
  @public
 */

var Schema = /*#__PURE__*/function () {
  function Schema(db) {
    var modelsMap = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Schema);

    assert(db, "A schema requires a db");
    /**
      Returns Mirage's database. See the `Db` docs for the db's API.
       @property db
      @type {Object}
      @public
    */

    this.db = db;
    this._registry = {};
    this._dependentAssociations = {
      polymorphic: []
    };
    this.registerModels(modelsMap);
    this.isSaving = {}; // a hash of models that are being saved, used to avoid cycles
  }
  /**
    @method registerModels
    @param hash
    @public
    @hide
   */


  _createClass(Schema, [{
    key: "registerModels",
    value: function registerModels() {
      var _this = this;

      var hash = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      forIn(hash, function (model, key) {
        _this.registerModel(key, hash[key]);
      });
    }
    /**
      @method registerModel
      @param type
      @param ModelClass
      @public
      @hide
     */

  }, {
    key: "registerModel",
    value: function registerModel(type, ModelClass) {
      var _this2 = this;

      var camelizedModelName = camelize(type);
      var modelName = dasherize(camelizedModelName); // Avoid mutating original class, because we may want to reuse it across many tests

      ModelClass = ModelClass.extend(); // Store model & fks in registry
      // TODO: don't think this is needed anymore

      this._registry[camelizedModelName] = this._registry[camelizedModelName] || {
        "class": null,
        foreignKeys: []
      }; // we may have created this key before, if another model added fks to it

      this._registry[camelizedModelName]["class"] = ModelClass; // TODO: set here, remove from model#constructor

      ModelClass.prototype._schema = this;
      ModelClass.prototype.modelName = modelName; // Set up associations

      ModelClass.prototype.hasManyAssociations = {}; // a registry of the model's hasMany associations. Key is key from model definition, value is association instance itself

      ModelClass.prototype.hasManyAssociationFks = {}; // a lookup table to get the hasMany association by foreignKey

      ModelClass.prototype.belongsToAssociations = {}; // a registry of the model's belongsTo associations. Key is key from model definition, value is association instance itself

      ModelClass.prototype.belongsToAssociationFks = {}; // a lookup table to get the belongsTo association by foreignKey

      ModelClass.prototype.associationKeys = new Set(); // ex: address.user, user.addresses

      ModelClass.prototype.associationIdKeys = new Set(); // ex: address.user_id, user.address_ids

      ModelClass.prototype.dependentAssociations = []; // a registry of associations that depend on this model, needed for deletion cleanup.

      var fksAddedFromThisModel = {};

      for (var associationProperty in ModelClass.prototype) {
        if (ModelClass.prototype[associationProperty] instanceof Association) {
          var association = ModelClass.prototype[associationProperty];
          association.name = associationProperty;
          association.modelName = association.modelName || this.toModelName(associationProperty);
          association.ownerModelName = modelName;
          association.setSchema(this); // Update the registry with this association's foreign keys. This is
          // essentially our "db migration", since we must know about the fks.

          var _association$getForei = association.getForeignKeyArray(),
              _association$getForei2 = _slicedToArray(_association$getForei, 2),
              fkHolder = _association$getForei2[0],
              fk = _association$getForei2[1];

          fksAddedFromThisModel[fkHolder] = fksAddedFromThisModel[fkHolder] || [];
          assert(!fksAddedFromThisModel[fkHolder].includes(fk), "Your '".concat(type, "' model definition has multiple possible inverse relationships of type '").concat(fkHolder, "'. Please use explicit inverses."));
          fksAddedFromThisModel[fkHolder].push(fk);

          this._addForeignKeyToRegistry(fkHolder, fk); // Augment the Model's class with any methods added by this association


          association.addMethodsToModelClass(ModelClass, associationProperty);
        }
      } // Create a db collection for this model, if doesn't exist


      var collection = this.toCollectionName(modelName);

      if (!this.db[collection]) {
        this.db.createCollection(collection);
      } // Create the entity methods


      this[collection] = {
        camelizedModelName: camelizedModelName,
        "new": function _new(attrs) {
          return _this2["new"](camelizedModelName, attrs);
        },
        create: function create(attrs) {
          return _this2.create(camelizedModelName, attrs);
        },
        all: function all(attrs) {
          return _this2.all(camelizedModelName, attrs);
        },
        find: function find(attrs) {
          return _this2.find(camelizedModelName, attrs);
        },
        findBy: function findBy(attrs) {
          return _this2.findBy(camelizedModelName, attrs);
        },
        findOrCreateBy: function findOrCreateBy(attrs) {
          return _this2.findOrCreateBy(camelizedModelName, attrs);
        },
        where: function where(attrs) {
          return _this2.where(camelizedModelName, attrs);
        },
        none: function none(attrs) {
          return _this2.none(camelizedModelName, attrs);
        },
        first: function first(attrs) {
          return _this2.first(camelizedModelName, attrs);
        }
      };
      return this;
    }
    /**
      @method modelFor
      @param type
      @public
      @hide
     */

  }, {
    key: "modelFor",
    value: function modelFor(type) {
      return this._registry[type];
    }
    /**
      Create a new unsaved model instance with attributes *attrs*.
       ```js
      let post = blogPosts.new({ title: 'Lorem ipsum' });
      post.title;   // Lorem ipsum
      post.id;      // null
      post.isNew(); // true
      ```
       @method new
      @param type
      @param attrs
      @public
     */

  }, {
    key: "new",
    value: function _new(type, attrs) {
      return this._instantiateModel(dasherize(type), attrs);
    }
    /**
      Create a new model instance with attributes *attrs*, and insert it into the database.
       ```js
      let post = blogPosts.create({title: 'Lorem ipsum'});
      post.title;   // Lorem ipsum
      post.id;      // 1
      post.isNew(); // false
      ```
       @method create
      @param type
      @param attrs
      @public
     */

  }, {
    key: "create",
    value: function create(type, attrs) {
      return this["new"](type, attrs).save();
    }
    /**
      Return all models in the database.
       ```js
      let posts = blogPosts.all();
      // [post:1, post:2, ...]
      ```
       @method all
      @param type
      @public
     */

  }, {
    key: "all",
    value: function all(type) {
      var collection = this.collectionForType(type);
      return this._hydrate(collection, dasherize(type));
    }
    /**
      Return an empty collection of type `type`.
       @method none
      @param type
      @public
     */

  }, {
    key: "none",
    value: function none(type) {
      return this._hydrate([], dasherize(type));
    }
    /**
      Return one or many models in the database by id.
       ```js
      let post = blogPosts.find(1);
      let posts = blogPosts.find([1, 3, 4]);
      ```
       @method find
      @param type
      @param ids
      @public
     */

  }, {
    key: "find",
    value: function find(type, ids) {
      var collection = this.collectionForType(type);
      var records = collection.find(ids);

      if (Array.isArray(ids)) {
        assert(records.length === ids.length, "Couldn't find all ".concat(this._container.inflector.pluralize(type), " with ids: (").concat(ids.join(","), ") (found ").concat(records.length, " results, but was looking for ").concat(ids.length, ")"));
      }

      return this._hydrate(records, dasherize(type));
    }
    /**
      Returns the first model in the database that matches the key-value pairs in `attrs`. Note that a string comparison is used.
       ```js
      let post = blogPosts.findBy({ published: true });
      let post = blogPosts.findBy({ authorId: 1, published: false });
      let post = blogPosts.findBy({ author: janeSmith, featured: true });
      ```
       This will return `null` if the schema doesn't have any matching record.
       A predicate function can also be used to find a match.
       ```js
      let longPost = blogPosts.findBy((post) => post.body.length > 1000);
      ```
       @method findBy
      @param type
      @param attributesOrPredicate
      @public
     */

  }, {
    key: "findBy",
    value: function findBy(type, query) {
      var collection = this.collectionForType(type);
      var record = collection.findBy(query);
      return this._hydrate(record, dasherize(type));
    }
    /**
      Returns the first model in the database that matches the key-value pairs in `attrs`, or creates a record with the attributes if one is not found.
       ```js
      // Find the first published blog post, or create a new one.
      let post = blogPosts.findOrCreateBy({ published: true });
      ```
       @method findOrCreateBy
      @param type
      @param attributeName
      @public
     */

  }, {
    key: "findOrCreateBy",
    value: function findOrCreateBy(type, attrs) {
      var collection = this.collectionForType(type);
      var record = collection.findBy(attrs);
      var model;

      if (!record) {
        model = this.create(type, attrs);
      } else {
        model = this._hydrate(record, dasherize(type));
      }

      return model;
    }
    /**
      Return an ORM/Collection, which represents an array of models from the database matching `query`.
       If `query` is an object, its key-value pairs will be compared against records using string comparison.
       `query` can also be a compare function.
       ```js
      let posts = blogPosts.where({ published: true });
      let posts = blogPosts.where(post => post.published === true);
      ```
       @method where
      @param type
      @param query
      @public
     */

  }, {
    key: "where",
    value: function where(type, query) {
      var collection = this.collectionForType(type);
      var records = collection.where(query);
      return this._hydrate(records, dasherize(type));
    }
    /**
      Returns the first model in the database.
       ```js
      let post = blogPosts.first();
      ```
       N.B. This will return `null` if the schema doesn't contain any records.
       @method first
      @param type
      @public
     */

  }, {
    key: "first",
    value: function first(type) {
      var collection = this.collectionForType(type);
      var record = collection[0];
      return this._hydrate(record, dasherize(type));
    }
    /**
      @method modelClassFor
      @param modelName
      @public
      @hide
     */

  }, {
    key: "modelClassFor",
    value: function modelClassFor(modelName) {
      var model = this._registry[camelize(modelName)];

      assert(model, "Model not registered: ".concat(modelName));
      return model["class"].prototype;
    }
    /*
      This method updates the dependentAssociations registry, which is used to
      keep track of which models depend on a given association. It's used when
      deleting models - their dependents need to be looked up and foreign keys
      updated.
       For example,
           schema = {
            post: Model.extend(),
            comment: Model.extend({
              post: belongsTo()
            })
          };
           comment1.post = post1;
          ...
          post1.destroy()
       Deleting this post should clear out comment1's foreign key.
       Polymorphic associations can have _any_ other model as a dependent, so we
      handle them separately.
    */

  }, {
    key: "addDependentAssociation",
    value: function addDependentAssociation(association, modelName) {
      if (association.isPolymorphic) {
        this._dependentAssociations.polymorphic.push(association);
      } else {
        this._dependentAssociations[modelName] = this._dependentAssociations[modelName] || [];

        this._dependentAssociations[modelName].push(association);
      }
    }
  }, {
    key: "dependentAssociationsFor",
    value: function dependentAssociationsFor(modelName) {
      var directDependents = this._dependentAssociations[modelName] || [];
      var polymorphicAssociations = this._dependentAssociations.polymorphic || [];
      return directDependents.concat(polymorphicAssociations);
    }
    /**
      Returns an object containing the associations registered for the model of the given _modelName_.
       For example, given this configuration
      
      ```js
      import { createServer, Model, hasMany, belongsTo } from 'miragejs'
       let server = createServer({
        models: {
          user: Model,
          article: Model.extend({
            fineAuthor: belongsTo("user"),
            comments: hasMany()
          }),
          comment: Model
        }
      })
      ```
       each of the following would return empty objects
       ```js
      server.schema.associationsFor('user')
      // {}
      server.schema.associationsFor('comment')
      // {}
      ```
       but the associations for the `article` would return
       ```js
      server.schema.associationsFor('article')
       // {
      //   fineAuthor: BelongsToAssociation,
      //   comments: HasManyAssociation
      // }
      ```
       Check out the docs on the Association class to see what fields are available for each association.
       @method associationsFor
      @param {String} modelName
      @return {Object}
      @public
    */

  }, {
    key: "associationsFor",
    value: function associationsFor(modelName) {
      var modelClass = this.modelClassFor(modelName);
      return Object.assign({}, modelClass.belongsToAssociations, modelClass.hasManyAssociations);
    }
  }, {
    key: "hasModelForModelName",
    value: function hasModelForModelName(modelName) {
      return this.modelFor(camelize(modelName));
    }
    /*
      Private methods
    */

    /**
      @method collectionForType
      @param type
      @private
      @hide
     */

  }, {
    key: "collectionForType",
    value: function collectionForType(type) {
      var collection = this.toCollectionName(type);
      assert(this.db[collection], "You're trying to find model(s) of type ".concat(type, " but this collection doesn't exist in the database."));
      return this.db[collection];
    }
  }, {
    key: "toCollectionName",
    value: function toCollectionName(type) {
      if (typeof collectionNameCache[type] !== "string") {
        var modelName = dasherize(type);
        var collectionName = camelize(this._container.inflector.pluralize(modelName));
        collectionNameCache[type] = collectionName;
      }

      return collectionNameCache[type];
    } // This is to get at the underlying Db collection. Poorly named... need to
    // refactor to DbTable or something.

  }, {
    key: "toInternalCollectionName",
    value: function toInternalCollectionName(type) {
      if (typeof internalCollectionNameCache[type] !== "string") {
        var internalCollectionName = "_".concat(this.toCollectionName(type));
        internalCollectionNameCache[type] = internalCollectionName;
      }

      return internalCollectionNameCache[type];
    }
  }, {
    key: "toModelName",
    value: function toModelName(type) {
      if (typeof modelNameCache[type] !== "string") {
        var dasherized = dasherize(type);

        var modelName = this._container.inflector.singularize(dasherized);

        modelNameCache[type] = modelName;
      }

      return modelNameCache[type];
    }
    /**
      @method _addForeignKeyToRegistry
      @param type
      @param fk
      @private
      @hide
     */

  }, {
    key: "_addForeignKeyToRegistry",
    value: function _addForeignKeyToRegistry(type, fk) {
      this._registry[type] = this._registry[type] || {
        "class": null,
        foreignKeys: []
      };
      var fks = this._registry[type].foreignKeys;

      if (!fks.includes(fk)) {
        fks.push(fk);
      }
    }
    /**
      @method _instantiateModel
      @param modelName
      @param attrs
      @private
      @hide
     */

  }, {
    key: "_instantiateModel",
    value: function _instantiateModel(modelName, attrs) {
      var ModelClass = this._modelFor(modelName);

      var fks = this._foreignKeysFor(modelName);

      return new ModelClass(this, modelName, attrs, fks);
    }
    /**
      @method _modelFor
      @param modelName
      @private
      @hide
     */

  }, {
    key: "_modelFor",
    value: function _modelFor(modelName) {
      return this._registry[camelize(modelName)]["class"];
    }
    /**
      @method _foreignKeysFor
      @param modelName
      @private
      @hide
     */

  }, {
    key: "_foreignKeysFor",
    value: function _foreignKeysFor(modelName) {
      return this._registry[camelize(modelName)].foreignKeys;
    }
    /**
      Takes a record and returns a model, or an array of records
      and returns a collection.
     *
      @method _hydrate
      @param records
      @param modelName
      @private
      @hide
     */

  }, {
    key: "_hydrate",
    value: function _hydrate(records, modelName) {
      if (Array.isArray(records)) {
        var models = records.map(function (record) {
          return this._instantiateModel(modelName, record);
        }, this);
        return new Collection(modelName, models);
      } else if (records) {
        return this._instantiateModel(modelName, records);
      } else {
        return null;
      }
    }
  }]);

  return Schema;
}();

var classes = {
  Db: Db,
  Association: Association,
  RouteHandler: RouteHandler,
  BaseRouteHandler: BaseRouteHandler,
  Serializer: Serializer,
  SerializerRegistry: SerializerRegistry,
  Schema: Schema
};
var defaultInflector$1 = {
  singularize: singularize,
  pluralize: pluralize
};
/**
  Lightweight DI container for customizable objects that are needed by
  deeply nested classes.

  @class Container
  @hide
 */

var Container = /*#__PURE__*/function () {
  function Container() {
    _classCallCheck(this, Container);

    this.inflector = defaultInflector$1;
  }

  _createClass(Container, [{
    key: "register",
    value: function register(key, value) {
      this[key] = value;
    }
  }, {
    key: "create",
    value: function create(className) {
      var Class = classes[className];
      Class.prototype._container = this;

      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return _construct(Class, args);
    }
  }]);

  return Container;
}();
/**
  These are side effects. We give each class a default container so it can be
  easily unit tested.

  We should remove these once we have test coverage and can refactor to a proper
  DI system.
*/


var defaultContainer = new Container();
Db.prototype._container = defaultContainer;
Association.prototype._container = defaultContainer;
BaseRouteHandler.prototype._container = defaultContainer;
RouteHandler.prototype._container = defaultContainer;
Serializer.prototype._container = defaultContainer;
SerializerRegistry.prototype._container = defaultContainer;
Schema.prototype._container = defaultContainer;

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

var defaultPassthroughs = ["http://localhost:0/chromecheckurl", // mobile chrome
"http://localhost:30820/socket.io", // electron
function (request) {
  return /.+\.hot-update.json$/.test(request.url);
}];
var defaultRouteOptions = {
  coalesce: false,
  timing: undefined
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
  if (!option || _typeof(option) !== "object") {
    return false;
  }

  var allOptions = Object.keys(defaultRouteOptions);
  var optionKeys = Object.keys(option);

  for (var i = 0; i < optionKeys.length; i++) {
    var key = optionKeys[i];

    if (allOptions.indexOf(key) > -1) {
      return true;
    }
  }

  return false;
}
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
  var _args$splice = args.splice(-1),
      _args$splice2 = _slicedToArray(_args$splice, 1),
      lastArg = _args$splice2[0];

  if (isOption(lastArg)) {
    lastArg = assign({}, defaultRouteOptions, lastArg);
  } else {
    args.push(lastArg);
    lastArg = defaultRouteOptions;
  }

  var t = 2 - args.length;

  while (t-- > 0) {
    args.push(undefined);
  }

  args.push(lastArg);
  return args;
}

var PretenderConfig = /*#__PURE__*/function () {
  function PretenderConfig() {
    _classCallCheck(this, PretenderConfig);

    _defineProperty(this, "urlPrefix", void 0);

    _defineProperty(this, "namespace", void 0);

    _defineProperty(this, "timing", void 0);

    _defineProperty(this, "passthroughChecks", void 0);

    _defineProperty(this, "pretender", void 0);

    _defineProperty(this, "mirageServer", void 0);

    _defineProperty(this, "trackRequests", void 0);
  }

  _createClass(PretenderConfig, [{
    key: "create",
    value: function create(mirageServer, config) {
      var _this = this;

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
      [["get"], ["post"], ["put"], ["delete", "del"], ["patch"], ["head"], ["options"]].forEach(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            verb = _ref2[0],
            alias = _ref2[1];

        _this[verb] = function (path) {
          var _this$pretender;

          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }

          var _extractRouteArgument = extractRouteArguments(args),
              _extractRouteArgument2 = _slicedToArray(_extractRouteArgument, 3),
              rawHandler = _extractRouteArgument2[0],
              customizedCode = _extractRouteArgument2[1],
              options = _extractRouteArgument2[2];

          var handler = mirageServer.registerRouteHandler(verb, path, rawHandler, customizedCode, options);

          var fullPath = _this._getFullPath(path);

          var timing = options.timing !== undefined ? options.timing : function () {
            return _this.timing;
          };
          return (_this$pretender = _this.pretender) === null || _this$pretender === void 0 ? void 0 : _this$pretender[verb](fullPath, handler, timing);
        };

        mirageServer[verb] = _this[verb];

        if (alias) {
          _this[alias] = _this[verb];
          mirageServer[alias] = _this[verb];
        }
      });
    }
  }, {
    key: "config",
    value: function config(_config) {
      var _ref3, _config$timing;

      var useDefaultPassthroughs = typeof _config.useDefaultPassthroughs !== "undefined" ? _config.useDefaultPassthroughs : true;

      if (useDefaultPassthroughs) {
        this._configureDefaultPassthroughs();
      }

      var didOverridePretenderConfig = _config.trackRequests !== undefined && _config.trackRequests !== this.trackRequests;
      assert(!didOverridePretenderConfig, "You cannot modify Pretender's request tracking once the server is created");
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

      this.timing = (_ref3 = (_config$timing = _config.timing) !== null && _config$timing !== void 0 ? _config$timing : this.timing) !== null && _ref3 !== void 0 ? _ref3 : 400;
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

      this.urlPrefix = this.urlPrefix || _config.urlPrefix || "";
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

      this.namespace = this.namespace || _config.namespace || "";
    }
    /**
     *
     * @private
     * @hide
     */

  }, {
    key: "_configureDefaultPassthroughs",
    value: function _configureDefaultPassthroughs() {
      var _this2 = this;

      defaultPassthroughs.forEach(function (passthroughUrl) {
        _this2.passthrough(passthroughUrl);
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

  }, {
    key: "_create",
    value: function _create(mirageServer, config) {
      if (typeof window !== "undefined") {
        this.trackRequests = config.trackRequests || false;
        return new Pretender(function () {
          this.passthroughRequest = function (verb, path, request) {
            if (mirageServer.shouldLog()) {
              console.log("Mirage: Passthrough request for ".concat(verb.toUpperCase(), " ").concat(request.url));
            }
          };

          this.handledRequest = function (verb, path, request) {
            if (mirageServer.shouldLog()) {
              console.groupCollapsed("Mirage: [".concat(request.status, "] ").concat(verb.toUpperCase(), " ").concat(request.url));
              var requestBody = request.requestBody,
                  responseText = request.responseText;
              var loggedRequest, loggedResponse;

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

          var originalCheckPassthrough = this.checkPassthrough;

          this.checkPassthrough = function (request) {
            var shouldPassthrough = mirageServer.passthroughChecks.some(function (passthroughCheck) {
              return passthroughCheck(request);
            });

            if (shouldPassthrough) {
              var url = request.url.includes("?") ? request.url.substr(0, request.url.indexOf("?")) : request.url;
              this[request.method.toLowerCase()](url, this.passthrough);
            }

            return originalCheckPassthrough.apply(this, arguments);
          };

          this.unhandledRequest = function (verb, path) {
            path = decodeURI(path);
            var namespaceError = "";

            if (this.namespace === "") {
              namespaceError = "There is no existing namespace defined. Please define one";
            } else {
              namespaceError = "The existing namespace is ".concat(this.namespace);
            }

            assert("Your app tried to ".concat(verb, " '").concat(path, "', but there was no route defined to handle this request. Define a route for this endpoint in your routes() config. Did you forget to define a namespace? ").concat(namespaceError));
          };
        }, {
          trackRequests: this.trackRequests
        });
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

  }, {
    key: "passthrough",
    value: function passthrough() {
      var _this3 = this;

      for (var _len2 = arguments.length, paths = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        paths[_key2] = arguments[_key2];
      }

      // this only works in browser-like environments for now. in node users will have to configure
      // their own interceptor if they are using one.
      if (typeof window !== "undefined") {
        var verbs = ["get", "post", "put", "delete", "patch", "options", "head"];
        var lastArg = paths[paths.length - 1];

        if (paths.length === 0) {
          paths = ["/**", "/"];
        } else if (paths.length > 1 && Array.isArray(lastArg)) {
          verbs = paths.pop();
        }

        paths.forEach(function (path) {
          if (typeof path === "function") {
            _this3.passthroughChecks.push(path);
          } else {
            verbs.forEach(function (verb) {
              var fullPath = _this3._getFullPath(path);

              _this3.pretender[verb](fullPath, _this3.pretender.passthrough);
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

  }, {
    key: "_getFullPath",
    value: function _getFullPath(path) {
      path = path[0] === "/" ? path.slice(1) : path;
      var fullPath = "";
      var urlPrefix = this.urlPrefix ? this.urlPrefix.trim() : "";
      var namespace = ""; // if there is a urlPrefix and a namespace

      if (this.urlPrefix && this.namespace) {
        if (this.namespace[0] === "/" && this.namespace[this.namespace.length - 1] === "/") {
          namespace = this.namespace.substring(0, this.namespace.length - 1).substring(1);
        }

        if (this.namespace[0] === "/" && this.namespace[this.namespace.length - 1] !== "/") {
          namespace = this.namespace.substring(1);
        }

        if (this.namespace[0] !== "/" && this.namespace[this.namespace.length - 1] === "/") {
          namespace = this.namespace.substring(0, this.namespace.length - 1);
        }

        if (this.namespace[0] !== "/" && this.namespace[this.namespace.length - 1] !== "/") {
          namespace = this.namespace;
        }
      } // if there is a namespace and no urlPrefix


      if (this.namespace && !this.urlPrefix) {
        if (this.namespace[0] === "/" && this.namespace[this.namespace.length - 1] === "/") {
          namespace = this.namespace.substring(0, this.namespace.length - 1);
        }

        if (this.namespace[0] === "/" && this.namespace[this.namespace.length - 1] !== "/") {
          namespace = this.namespace;
        }

        if (this.namespace[0] !== "/" && this.namespace[this.namespace.length - 1] === "/") {
          var namespaceSub = this.namespace.substring(0, this.namespace.length - 1);
          namespace = "/".concat(namespaceSub);
        }

        if (this.namespace[0] !== "/" && this.namespace[this.namespace.length - 1] !== "/") {
          namespace = "/".concat(this.namespace);
        }
      } // if no namespace


      if (!this.namespace) {
        namespace = "";
      } // check to see if path is a FQDN. if so, ignore any urlPrefix/namespace that was set


      if (/^https?:\/\//.test(path)) {
        fullPath += path;
      } else {
        // otherwise, if there is a urlPrefix, use that as the beginning of the path
        if (urlPrefix.length) {
          fullPath += urlPrefix[urlPrefix.length - 1] === "/" ? urlPrefix : "".concat(urlPrefix, "/");
        } // add the namespace to the path


        fullPath += namespace; // add a trailing slash to the path if it doesn't already contain one

        if (fullPath[fullPath.length - 1] !== "/") {
          fullPath += "/";
        } // finally add the configured path


        fullPath += path; // if we're making a same-origin request, ensure a / is prepended and
        // dedup any double slashes

        if (!/^https?:\/\//.test(fullPath)) {
          fullPath = "/".concat(fullPath);
          fullPath = fullPath.replace(/\/+/g, "/");
        }
      }

      return fullPath;
    }
  }, {
    key: "start",
    value: function start() {// unneeded for pretender implementation
    }
  }, {
    key: "shutdown",
    value: function shutdown() {
      this.pretender.shutdown();
    }
  }]);

  return PretenderConfig;
}();

var isPluralForModelCache = {};
var defaultInflector = {
  singularize: singularize,
  pluralize: pluralize
};
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

function createServer(options) {
  return new Server(options);
}
/**
  The Mirage server.

  Note that `this` within your `routes` function refers to the server instance, which is the same instance that `server` refers to in your tests.

  @class Server
  @public
*/

var Server = /*#__PURE__*/function () {
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
  function Server() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Server);

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
  } // todo deprecate following


  _createClass(Server, [{
    key: "namespace",
    get: function get() {
      return this.interceptor.namespace;
    },
    set: function set(value) {
      this.interceptor.namespace = value;
    } // todo deprecate following

  }, {
    key: "urlPrefix",
    get: function get() {
      return this.interceptor.urlPrefix;
    },
    set: function set(value) {
      this.interceptor.urlPrefix = value;
    } // todo deprecate following

  }, {
    key: "timing",
    get: function get() {
      return this.interceptor.timing;
    },
    set: function set(value) {
      this.interceptor.timing = value;
    } // todo deprecate following

  }, {
    key: "passthroughChecks",
    get: function get() {
      return this.interceptor.passthroughChecks;
    },
    set: function set(value) {
      this.interceptor.passthroughChecks = value;
    }
  }, {
    key: "config",
    value: function config() {
      var _this$interceptor$sta, _this$interceptor;

      var _config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      if (!_config.interceptor) {
        _config.interceptor = new PretenderConfig();
      }

      if (this.interceptor) {
        this.interceptor.config(_config);
      } else {
        this.interceptor = _config.interceptor;
        this.interceptor.create(this, _config);
      }

      var didOverrideConfig = _config.environment && this.environment && this.environment !== _config.environment;
      assert(!didOverrideConfig, "You cannot modify Mirage's environment once the server is created");
      this.environment = _config.environment || this.environment || "development";

      if (_config.routes) {
        assert(!_config.baseConfig, "The routes option is an alias for the baseConfig option. You can't pass both options into your server definition.");
        _config.baseConfig = _config.routes;
      }

      if (_config.seeds) {
        assert(!_config.scenarios, "The seeds option is an alias for the scenarios.default option. You can't pass both options into your server definition.");
        _config.scenarios = {
          "default": _config.seeds
        };
      }

      this._config = _config;
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

      this.inflector = _config.inflector || defaultInflector;

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


      this.logging = _config.logging !== undefined ? this.logging : undefined;
      this.testConfig = this.testConfig || undefined;
      this.trackRequests = _config.trackRequests;

      if (this.db) {
        this.db.registerIdentityManagers(_config.identityManagers);
      } else {
        this.db = this._container.create("Db", undefined, _config.identityManagers);
      }

      if (this.schema) {
        this.schema.registerModels(_config.models);
        this.serializerOrRegistry.registerSerializers(_config.serializers || {});
      } else {
        this.schema = this._container.create("Schema", this.db, _config.models);
        this.serializerOrRegistry = this._container.create("SerializerRegistry", this.schema, _config.serializers);
      }

      var hasFactories = this._hasModulesOfType(_config, "factories");

      var hasDefaultScenario = _config.scenarios && Object.prototype.hasOwnProperty.call(_config.scenarios, "default");

      if (_config.baseConfig) {
        this.loadConfig(_config.baseConfig);
      }

      if (this.isTest()) {
        this.loadConfig(_config.testConfig);

        if (typeof window !== "undefined") {
          window.server = this; // TODO: Better way to inject server into test env
        }
      }

      if (this.isTest() && hasFactories) {
        this.loadFactories(_config.factories);
      } else if (!this.isTest() && hasDefaultScenario) {
        this.loadFactories(_config.factories);

        _config.scenarios["default"](this);
      } else {
        this.loadFixtures();
      }

      (_this$interceptor$sta = (_this$interceptor = this.interceptor).start) === null || _this$interceptor$sta === void 0 ? void 0 : _this$interceptor$sta.call(_this$interceptor);
    }
    /**
     * Determines if the current environment is the testing environment.
     *
     * @method isTest
     * @return {Boolean} True if the environment is 'test', false otherwise.
     * @public
     * @hide
     */

  }, {
    key: "isTest",
    value: function isTest() {
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

  }, {
    key: "shouldLog",
    value: function shouldLog() {
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

  }, {
    key: "loadConfig",
    value: function loadConfig(config) {
      config === null || config === void 0 ? void 0 : config.call(this);
      this.timing = this.isTest() ? 0 : this.timing || 0;
    } // TODO deprecate this in favor of direct call

  }, {
    key: "passthrough",
    value: function passthrough() {
      var _this$interceptor$pas, _this$interceptor2;

      for (var _len = arguments.length, paths = new Array(_len), _key = 0; _key < _len; _key++) {
        paths[_key] = arguments[_key];
      }

      (_this$interceptor$pas = (_this$interceptor2 = this.interceptor).passthrough) === null || _this$interceptor$pas === void 0 ? void 0 : _this$interceptor$pas.call.apply(_this$interceptor$pas, [_this$interceptor2].concat(paths));
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

  }, {
    key: "loadFixtures",
    value: function loadFixtures() {
      var fixtures = this._config.fixtures;

      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      if (args.length) {
        var camelizedArgs = args.map(camelize);
        var missingKeys = camelizedArgs.filter(function (key) {
          return !fixtures[key];
        });

        if (missingKeys.length) {
          throw new Error("Fixtures not found: ".concat(missingKeys.join(", ")));
        }

        fixtures = pick.apply(void 0, [fixtures].concat(_toConsumableArray(camelizedArgs)));
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

  }, {
    key: "loadFactories",
    value: function loadFactories() {
      var _this = this;

      var factoryMap = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      // Store a reference to the factories
      var currentFactoryMap = this._factoryMap || {};
      this._factoryMap = assign(currentFactoryMap, factoryMap); // Create a collection for each factory

      Object.keys(factoryMap).forEach(function (type) {
        var collectionName = _this.schema.toCollectionName(type);

        _this.db.createCollection(collectionName);
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

  }, {
    key: "factoryFor",
    value: function factoryFor(type) {
      var camelizedType = camelize(type);

      if (this._factoryMap && this._factoryMap[camelizedType]) {
        return this._factoryMap[camelizedType];
      }
    }
  }, {
    key: "build",
    value: function build(type) {
      for (var _len3 = arguments.length, traitsAndOverrides = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        traitsAndOverrides[_key3 - 1] = arguments[_key3];
      }

      var traits = traitsAndOverrides.filter(function (arg) {
        return arg && typeof arg === "string";
      });
      var overrides = find(traitsAndOverrides, function (arg) {
        return isPlainObject(arg);
      });
      var camelizedType = camelize(type); // Store sequence for factory type as instance variable

      this.factorySequences = this.factorySequences || {};
      this.factorySequences[camelizedType] = this.factorySequences[camelizedType] + 1 || 0;
      var OriginalFactory = this.factoryFor(type);

      if (OriginalFactory) {
        OriginalFactory = OriginalFactory.extend({});
        var attrs = OriginalFactory.attrs || {};

        this._validateTraits(traits, OriginalFactory, type);

        var mergedExtensions = this._mergeExtensions(attrs, traits, overrides);

        this._mapAssociationsFromAttributes(type, attrs, overrides);

        this._mapAssociationsFromAttributes(type, mergedExtensions);

        var Factory = OriginalFactory.extend(mergedExtensions);
        var factory = new Factory();
        var sequence = this.factorySequences[camelizedType];
        return factory.build(sequence);
      } else {
        return overrides;
      }
    }
  }, {
    key: "buildList",
    value: function buildList(type, amount) {
      assert(isInteger(amount), "second argument has to be an integer, you passed: ".concat(_typeof(amount)));
      var list = [];

      for (var _len4 = arguments.length, traitsAndOverrides = new Array(_len4 > 2 ? _len4 - 2 : 0), _key4 = 2; _key4 < _len4; _key4++) {
        traitsAndOverrides[_key4 - 2] = arguments[_key4];
      }

      var buildArgs = [type].concat(traitsAndOverrides);

      for (var i = 0; i < amount; i++) {
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

  }, {
    key: "create",
    value: function create(type) {
      var _this2 = this;

      assert(this._modelOrFactoryExistsForType(type), "You called server.create('".concat(type, "') but no model or factory was found. Make sure you're passing in the singularized version of the model or factory name.")); // When there is a Model defined, we should return an instance
      // of it instead of returning the bare attributes.

      for (var _len5 = arguments.length, options = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
        options[_key5 - 1] = arguments[_key5];
      }

      var traits = options.filter(function (arg) {
        return arg && typeof arg === "string";
      });
      var overrides = find(options, function (arg) {
        return isPlainObject(arg);
      });
      var collectionFromCreateList = find(options, function (arg) {
        return arg && Array.isArray(arg);
      });
      var attrs = this.build.apply(this, [type].concat(_toConsumableArray(traits), [overrides]));
      var modelOrRecord;

      if (this.schema && this.schema[this.schema.toCollectionName(type)]) {
        var modelClass = this.schema[this.schema.toCollectionName(type)];
        modelOrRecord = modelClass.create(attrs);
      } else {
        var collection, collectionName;

        if (collectionFromCreateList) {
          collection = collectionFromCreateList;
        } else {
          collectionName = this.schema ? this.schema.toInternalCollectionName(type) : "_".concat(this.inflector.pluralize(type));
          collection = this.db[collectionName];
        }

        assert(collection, "You called server.create('".concat(type, "') but no model or factory was found."));
        modelOrRecord = collection.insert(attrs);
      }

      var OriginalFactory = this.factoryFor(type);

      if (OriginalFactory) {
        OriginalFactory.extractAfterCreateCallbacks({
          traits: traits
        }).forEach(function (afterCreate) {
          afterCreate(modelOrRecord, _this2);
        });
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

  }, {
    key: "createList",
    value: function createList(type, amount) {
      assert(this._modelOrFactoryExistsForType(type), "You called server.createList('".concat(type, "') but no model or factory was found. Make sure you're passing in the singularized version of the model or factory name."));
      assert(isInteger(amount), "second argument has to be an integer, you passed: ".concat(_typeof(amount)));
      var list = [];
      var collectionName = this.schema ? this.schema.toInternalCollectionName(type) : "_".concat(this.inflector.pluralize(type));
      var collection = this.db[collectionName];

      for (var _len6 = arguments.length, traitsAndOverrides = new Array(_len6 > 2 ? _len6 - 2 : 0), _key6 = 2; _key6 < _len6; _key6++) {
        traitsAndOverrides[_key6 - 2] = arguments[_key6];
      }

      var createArguments = [type].concat(traitsAndOverrides, [collection]);

      for (var i = 0; i < amount; i++) {
        list.push(this.create.apply(this, createArguments));
      }

      return list;
    }
    /**
      Shutdown the server and stop intercepting network requests.
       @method shutdown
      @public
    */

  }, {
    key: "shutdown",
    value: function shutdown() {
      if (typeof window !== "undefined") {
        this.interceptor.shutdown();
      }

      if (typeof window !== "undefined" && this.environment === "test") {
        window.server = undefined;
      }
    }
  }, {
    key: "resource",
    value: function resource(resourceName) {
      var _this3 = this;

      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          only = _ref.only,
          except = _ref.except,
          path = _ref.path;

      resourceName = this.inflector.pluralize(resourceName);
      path = path || "/".concat(resourceName);
      only = only || [];
      except = except || [];

      if (only.length > 0 && except.length > 0) {
        throw "cannot use both :only and :except options";
      }

      var actionsMethodsAndsPathsMappings = {
        index: {
          methods: ["get"],
          path: "".concat(path)
        },
        show: {
          methods: ["get"],
          path: "".concat(path, "/:id")
        },
        create: {
          methods: ["post"],
          path: "".concat(path)
        },
        update: {
          methods: ["put", "patch"],
          path: "".concat(path, "/:id")
        },
        "delete": {
          methods: ["del"],
          path: "".concat(path, "/:id")
        }
      };
      var allActions = Object.keys(actionsMethodsAndsPathsMappings);
      var actions = only.length > 0 && only || except.length > 0 && allActions.filter(function (action) {
        return except.indexOf(action) === -1;
      }) || allActions;
      actions.forEach(function (action) {
        var methodsWithPath = actionsMethodsAndsPathsMappings[action];
        methodsWithPath.methods.forEach(function (method) {
          return path === resourceName ? _this3[method](methodsWithPath.path) : _this3[method](methodsWithPath.path, resourceName);
        });
      });
    }
  }, {
    key: "_serialize",
    value: function _serialize(body) {
      if (typeof body === "string") {
        return body;
      } else {
        return JSON.stringify(body);
      }
    }
  }, {
    key: "registerRouteHandler",
    value: function registerRouteHandler(verb, path, rawHandler, customizedCode, options) {
      var _this4 = this;

      var middleware = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : this.middleware;

      var routeHandler = this._container.create("RouteHandler", {
        schema: this.schema,
        verb: verb,
        rawHandler: rawHandler,
        customizedCode: customizedCode,
        options: options,
        path: path,
        serializerOrRegistry: this.serializerOrRegistry,
        middleware: middleware
      });

      return function (request) {
        return routeHandler.handle(request).then(function (mirageResponse) {
          var _mirageResponse = _slicedToArray(mirageResponse, 3),
              code = _mirageResponse[0],
              headers = _mirageResponse[1],
              response = _mirageResponse[2];

          return [code, headers, _this4._serialize(response)];
        });
      };
    }
    /**
     *
     * @private
     * @hide
     */

  }, {
    key: "_hasModulesOfType",
    value: function _hasModulesOfType(modules, type) {
      var modulesOfType = modules[type];
      return modulesOfType ? Object.keys(modulesOfType).length > 0 : false;
    }
    /**
     *
     * @private
     * @hide
     */

  }, {
    key: "_typeIsPluralForModel",
    value: function _typeIsPluralForModel(typeOrCollectionName) {
      if (typeof isPluralForModelCache[typeOrCollectionName] !== "boolean") {
        var modelOrFactoryExists = this._modelOrFactoryExistsForTypeOrCollectionName(typeOrCollectionName);

        var isPlural = typeOrCollectionName === this.inflector.pluralize(typeOrCollectionName);
        var isUncountable = this.inflector.singularize(typeOrCollectionName) === this.inflector.pluralize(typeOrCollectionName);
        var isPluralForModel = isPlural && !isUncountable && modelOrFactoryExists;
        isPluralForModelCache[typeOrCollectionName] = isPluralForModel;
      }

      return isPluralForModelCache[typeOrCollectionName];
    }
    /**
     *
     * @private
     * @hide
     */

  }, {
    key: "_modelOrFactoryExistsForType",
    value: function _modelOrFactoryExistsForType(type) {
      var modelExists = this.schema && this.schema.modelFor(camelize(type));
      var dbCollectionExists = this.db[this.schema.toInternalCollectionName(type)];
      return (modelExists || dbCollectionExists) && !this._typeIsPluralForModel(type);
    }
    /**
     *
     * @private
     * @hide
     */

  }, {
    key: "_modelOrFactoryExistsForTypeOrCollectionName",
    value: function _modelOrFactoryExistsForTypeOrCollectionName(typeOrCollectionName) {
      var modelExists = this.schema && this.schema.modelFor(camelize(typeOrCollectionName));
      var dbCollectionExists = this.db[this.schema.toInternalCollectionName(typeOrCollectionName)];
      return modelExists || dbCollectionExists;
    }
    /**
     *
     * @private
     * @hide
     */

  }, {
    key: "_validateTraits",
    value: function _validateTraits(traits, factory, type) {
      traits.forEach(function (traitName) {
        if (!factory.isTrait(traitName)) {
          throw new Error("'".concat(traitName, "' trait is not registered in '").concat(type, "' factory"));
        }
      });
    }
    /**
     *
     * @private
     * @hide
     */

  }, {
    key: "_mergeExtensions",
    value: function _mergeExtensions(attrs, traits, overrides) {
      var allExtensions = traits.map(function (traitName) {
        return attrs[traitName].extension;
      });
      allExtensions.push(overrides || {});
      return allExtensions.reduce(function (accum, extension) {
        return assign(accum, extension);
      }, {});
    }
    /**
     *
     * @private
     * @hide
     */

  }, {
    key: "_mapAssociationsFromAttributes",
    value: function _mapAssociationsFromAttributes(modelName, attributes) {
      var _this5 = this;

      var overrides = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      Object.keys(attributes || {}).filter(function (attr) {
        return isAssociation(attributes[attr]);
      }).forEach(function (attr) {
        var modelClass = _this5.schema.modelClassFor(modelName);

        var association = modelClass.associationFor(attr);
        assert(association && association instanceof BelongsTo, "You're using the `association` factory helper on the '".concat(attr, "' attribute of your ").concat(modelName, " factory, but that attribute is not a `belongsTo` association."));
        var isSelfReferentialBelongsTo = association && association instanceof BelongsTo && association.modelName === modelName;
        assert(!isSelfReferentialBelongsTo, "You're using the association() helper on your ".concat(modelName, " factory for ").concat(attr, ", which is a belongsTo self-referential relationship. You can't do this as it will lead to infinite recursion. You can move the helper inside of a trait and use it selectively."));
        var isPolymorphic = association && association.opts && association.opts.polymorphic;
        assert(!isPolymorphic, "You're using the association() helper on your ".concat(modelName, " factory for ").concat(attr, ", which is a polymorphic relationship. This is not currently supported."));
        var factoryAssociation = attributes[attr];
        var foreignKey = "".concat(camelize(attr), "Id");

        if (!overrides[attr]) {
          attributes[foreignKey] = _this5.create.apply(_this5, [association.modelName].concat(_toConsumableArray(factoryAssociation.traitsAndOverrides))).id;
        }

        delete attributes[attr];
      });
    }
  }]);

  return Server;
}();

var ActiveModelSerializer = Serializer.extend({
  serializeIds: "always",
  normalizeIds: true,
  keyForModel: function keyForModel(type) {
    return underscore(type);
  },
  keyForAttribute: function keyForAttribute(attr) {
    attr = Serializer.prototype.keyForAttribute.apply(this, arguments);
    return underscore(attr);
  },
  keyForRelationship: function keyForRelationship(type) {
    return this._container.inflector.pluralize(underscore(type));
  },
  keyForEmbeddedRelationship: function keyForEmbeddedRelationship(attributeName) {
    return underscore(attributeName);
  },
  keyForRelationshipIds: function keyForRelationshipIds(type) {
    return "".concat(underscore(this._container.inflector.singularize(type)), "_ids");
  },
  keyForForeignKey: function keyForForeignKey(relationshipName) {
    return "".concat(underscore(relationshipName), "_id");
  },
  keyForPolymorphicForeignKeyId: function keyForPolymorphicForeignKeyId(relationshipName) {
    return "".concat(underscore(relationshipName), "_id");
  },
  keyForPolymorphicForeignKeyType: function keyForPolymorphicForeignKeyType(relationshipName) {
    return "".concat(underscore(relationshipName), "_type");
  },
  normalize: function normalize(payload) {
    var _this = this;

    var type = Object.keys(payload)[0];
    var attrs = payload[type];
    var modelName = camelize(type);
    var modelClass = this.schema.modelClassFor(modelName);
    var belongsToAssociations = modelClass.belongsToAssociations,
        hasManyAssociations = modelClass.hasManyAssociations;
    var belongsToKeys = Object.keys(belongsToAssociations);
    var hasManyKeys = Object.keys(hasManyAssociations);

    if (this.primaryKey !== "id") {
      attrs.id = attrs[this.primaryKey];
      delete attrs[this.primaryKey];
    }

    var jsonApiPayload = {
      data: {
        type: this._container.inflector.pluralize(type),
        attributes: {}
      }
    };

    if (attrs.id) {
      jsonApiPayload.data.id = attrs.id;
    }

    var relationships = {};
    Object.keys(attrs).forEach(function (key) {
      if (key !== "id") {
        if (_this.normalizeIds) {
          if (belongsToKeys.includes(key)) {
            var association = belongsToAssociations[key];
            var associationModel = association.modelName;
            relationships[dasherize(key)] = {
              data: {
                type: associationModel,
                id: attrs[key]
              }
            };
          } else if (hasManyKeys.includes(key)) {
            var _association = hasManyAssociations[key];
            var _associationModel = _association.modelName;
            var data = attrs[key].map(function (id) {
              return {
                type: _associationModel,
                id: id
              };
            });
            relationships[dasherize(key)] = {
              data: data
            };
          } else {
            jsonApiPayload.data.attributes[dasherize(key)] = attrs[key];
          }
        } else {
          jsonApiPayload.data.attributes[dasherize(key)] = attrs[key];
        }
      }
    });

    if (Object.keys(relationships).length) {
      jsonApiPayload.data.relationships = relationships;
    }

    return jsonApiPayload;
  },
  getCoalescedIds: function getCoalescedIds(request) {
    return request.queryParams && request.queryParams.ids;
  }
});

var restSerializer = ActiveModelSerializer.extend({
  serializeIds: "always",
  keyForModel: function keyForModel(type) {
    return camelize(type);
  },
  keyForAttribute: function keyForAttribute(attr) {
    attr = ActiveModelSerializer.prototype.keyForAttribute.apply(this, arguments);
    return camelize(attr);
  },
  keyForRelationship: function keyForRelationship(type) {
    return camelize(this._container.inflector.pluralize(type));
  },
  keyForEmbeddedRelationship: function keyForEmbeddedRelationship(attributeName) {
    return camelize(attributeName);
  },
  keyForRelationshipIds: function keyForRelationshipIds(type) {
    return camelize(this._container.inflector.pluralize(type));
  },
  keyForForeignKey: function keyForForeignKey(relationshipName) {
    return camelize(this._container.inflector.singularize(relationshipName));
  },
  getCoalescedIds: function getCoalescedIds(request) {
    return request.queryParams && request.queryParams.ids;
  }
});

/**
  UUID generator

  @hide
*/
function uuid () {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === "x" ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
}

/**
  @hide
*/

function hasMany() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return _construct(HasMany, args);
}
/**
  @hide
*/


function belongsTo() {
  for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  return _construct(BelongsTo, args);
}
var index = {
  Factory: Factory,
  Response: Response,
  hasMany: hasMany,
  belongsTo: belongsTo
};

export { ActiveModelSerializer, Collection, Factory, IdentityManager, JSONAPISerializer, Model, PretenderConfig as PretenderInterceptor, Response, restSerializer as RestSerializer, Serializer, Server, Db as _Db, DbCollection as _DbCollection, RouteHandler as _RouteHandler, SerializerRegistry as _SerializerRegistry, assert as _assert, Association as _ormAssociationsAssociation, BelongsTo as _ormAssociationsBelongsTo, HasMany as _ormAssociationsHasMany, PolymorphicCollection as _ormPolymorphicCollection, Schema as _ormSchema, BaseRouteHandler as _routeHandlersBase, FunctionRouteHandler as _routeHandlersFunction, ObjectRouteHandler as _routeHandlersObject, BaseShorthandRouteHandler as _routeHandlersShorthandsBase, DeleteShorthandRouteHandler as _routeHandlersShorthandsDelete, GetShorthandRouteHandler as _routeHandlersShorthandsGet, HeadShorthandRouteHandler as _routeHandlersShorthandsHead, PostShorthandRouteHandler as _routeHandlersShorthandsPost, PutShorthandRouteHandler as _routeHandlersShorthandsPut, extend as _utilsExtend, camelize as _utilsInflectorCamelize, capitalize as _utilsInflectorCapitalize, dasherize as _utilsInflectorDasherize, underscore as _utilsInflectorUnderscore, isAssociation as _utilsIsAssociation, referenceSort as _utilsReferenceSort, uuid as _utilsUuid, association, belongsTo, createServer, index as default, hasMany, trait };
//# sourceMappingURL=mirage-esm.js.map
