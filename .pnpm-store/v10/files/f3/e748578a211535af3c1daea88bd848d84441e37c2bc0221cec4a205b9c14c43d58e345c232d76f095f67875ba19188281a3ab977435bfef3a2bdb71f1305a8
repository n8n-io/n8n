'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var isPlainObject = require('lodash/isPlainObject');
var isFunction = require('lodash/isFunction');
var mapValues = require('lodash/mapValues');
var uniq = require('lodash/uniq');
var flatten = require('lodash/flatten');
var inflected = require('inflected');
var lowerFirst = require('lodash/lowerFirst');
var isEqual = require('lodash/isEqual');
var map = require('lodash/map');
var cloneDeep = require('lodash/cloneDeep');
var invokeMap = require('lodash/invokeMap');
var compact = require('lodash/compact');
var has = require('lodash/has');
var values = require('lodash/values');
var isEmpty = require('lodash/isEmpty');
var get = require('lodash/get');
var uniqBy = require('lodash/uniqBy');
var forIn = require('lodash/forIn');
var pick = require('lodash/pick');
var assign = require('lodash/assign');
var find = require('lodash/find');
var isInteger = require('lodash/isInteger');
require('@miragejs/pretender-node-polyfill/before');
var Pretender = require('pretender');
require('@miragejs/pretender-node-polyfill/after');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var isPlainObject__default = /*#__PURE__*/_interopDefaultLegacy(isPlainObject);
var isFunction__default = /*#__PURE__*/_interopDefaultLegacy(isFunction);
var mapValues__default = /*#__PURE__*/_interopDefaultLegacy(mapValues);
var uniq__default = /*#__PURE__*/_interopDefaultLegacy(uniq);
var flatten__default = /*#__PURE__*/_interopDefaultLegacy(flatten);
var lowerFirst__default = /*#__PURE__*/_interopDefaultLegacy(lowerFirst);
var isEqual__default = /*#__PURE__*/_interopDefaultLegacy(isEqual);
var map__default = /*#__PURE__*/_interopDefaultLegacy(map);
var cloneDeep__default = /*#__PURE__*/_interopDefaultLegacy(cloneDeep);
var invokeMap__default = /*#__PURE__*/_interopDefaultLegacy(invokeMap);
var compact__default = /*#__PURE__*/_interopDefaultLegacy(compact);
var has__default = /*#__PURE__*/_interopDefaultLegacy(has);
var values__default = /*#__PURE__*/_interopDefaultLegacy(values);
var isEmpty__default = /*#__PURE__*/_interopDefaultLegacy(isEmpty);
var get__default = /*#__PURE__*/_interopDefaultLegacy(get);
var uniqBy__default = /*#__PURE__*/_interopDefaultLegacy(uniqBy);
var forIn__default = /*#__PURE__*/_interopDefaultLegacy(forIn);
var pick__default = /*#__PURE__*/_interopDefaultLegacy(pick);
var assign__default = /*#__PURE__*/_interopDefaultLegacy(assign);
var find__default = /*#__PURE__*/_interopDefaultLegacy(find);
var isInteger__default = /*#__PURE__*/_interopDefaultLegacy(isInteger);
var Pretender__default = /*#__PURE__*/_interopDefaultLegacy(Pretender);

// jscs:disable disallowVar, requireArrayDestructuring
/**
  @hide
*/

function referenceSort (edges) {
  let nodes = uniq__default["default"](flatten__default["default"](edges));
  let cursor = nodes.length;
  let sorted = new Array(cursor);
  let visited = {};
  let i = cursor;

  let visit = function (node, i, predecessors) {
    if (predecessors.indexOf(node) >= 0) {
      throw new Error(`Cyclic dependency in properties ${JSON.stringify(predecessors)}`);
    }

    if (visited[i]) {
      return;
    } else {
      visited[i] = true;
    }

    let outgoing = edges.filter(function (edge) {
      return edge && edge[0] === node;
    });
    i = outgoing.length;

    if (i) {
      let preds = predecessors.concat(node);

      do {
        let pair = outgoing[--i];
        let child = pair[1];

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

let Factory = function () {
  this.build = function (sequence) {
    let object = {};
    let topLevelAttrs = Object.assign({}, this.attrs);
    delete topLevelAttrs.afterCreate;
    Object.keys(topLevelAttrs).forEach(attr => {
      if (Factory.isTrait.call(this, attr)) {
        delete topLevelAttrs[attr];
      }
    });
    let keys = sortAttrs(topLevelAttrs, sequence);
    keys.forEach(function (key) {
      let buildAttrs, buildSingleValue;

      buildAttrs = function (attrs) {
        return mapValues__default["default"](attrs, buildSingleValue);
      };

      buildSingleValue = value => {
        if (Array.isArray(value)) {
          return value.map(buildSingleValue);
        } else if (isPlainObject__default["default"](value)) {
          return buildAttrs(value);
        } else if (isFunction__default["default"](value)) {
          return value.call(topLevelAttrs, sequence);
        } else {
          return value;
        }
      };

      let value = topLevelAttrs[key];

      if (isFunction__default["default"](value)) {
        object[key] = value.call(object, sequence);
      } else {
        object[key] = buildSingleValue(value);
      }
    });
    return object;
  };
};

Factory.extend = function (attrs) {
  // Merge the new attributes with existing ones. If conflict, new ones win.
  let newAttrs = Object.assign({}, this.attrs, attrs);

  let Subclass = function () {
    this.attrs = newAttrs;
    Factory.call(this);
  }; // Copy extend


  Subclass.extend = Factory.extend;
  Subclass.extractAfterCreateCallbacks = Factory.extractAfterCreateCallbacks;
  Subclass.isTrait = Factory.isTrait; // Store a reference on the class for future subclasses

  Subclass.attrs = newAttrs;
  return Subclass;
};

Factory.extractAfterCreateCallbacks = function ({
  traits
} = {}) {
  let afterCreateCallbacks = [];
  let attrs = this.attrs || {};
  let traitCandidates;

  if (attrs.afterCreate) {
    afterCreateCallbacks.push(attrs.afterCreate);
  }

  if (Array.isArray(traits)) {
    traitCandidates = traits;
  } else {
    traitCandidates = Object.keys(attrs);
  }

  traitCandidates.filter(attr => {
    return this.isTrait(attr) && attrs[attr].extension.afterCreate;
  }).forEach(attr => {
    afterCreateCallbacks.push(attrs[attr].extension.afterCreate);
  });
  return afterCreateCallbacks;
};

Factory.isTrait = function (attrName) {
  let {
    attrs
  } = this;
  return isPlainObject__default["default"](attrs[attrName]) && attrs[attrName].__isTrait__ === true;
};

function sortAttrs(attrs, sequence) {
  let Temp = function () {};

  let obj = new Temp();
  let refs = [];
  let property;
  Object.keys(attrs).forEach(function (key) {
    let value;
    Object.defineProperty(obj.constructor.prototype, key, {
      get() {
        refs.push([property, key]);
        return value;
      },

      set(newValue) {
        value = newValue;
      },

      enumerable: false,
      configurable: true
    });
  });
  Object.keys(attrs).forEach(function (key) {
    let value = attrs[key];

    if (typeof value !== "function") {
      obj[key] = value;
    }
  });
  Object.keys(attrs).forEach(function (key) {
    let value = attrs[key];
    property = key;

    if (typeof value === "function") {
      obj[key] = value.call(obj, sequence);
    }

    refs.push([key]);
  });
  return referenceSort(refs);
}
/**
 * @hide
 */


var Factory$1 = Factory;

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


class IdentityManager {
  constructor() {
    this._nextId = 1;
    this._ids = {};
  }
  /**
    @method get
    @hide
    @private
  */


  get() {
    return this._nextId;
  }
  /**
    Registers `uniqueIdentifier` as used.
     This method should throw is `uniqueIdentifier` has already been taken.
     @method set
    @param {String|Number} uniqueIdentifier
    @public
  */


  set(uniqueIdentifier) {
    if (this._ids[uniqueIdentifier]) {
      throw new Error(`Attempting to use the ID ${uniqueIdentifier}, but it's already been used`);
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


  inc() {
    let nextValue = this.get() + 1;
    this._nextId = nextValue;
    return nextValue;
  }
  /**
    Returns the next unique identifier.
     @method fetch
    @return {String} Unique identifier
    @public
  */


  fetch() {
    let id = this.get();
    this._ids[id] = true;
    this.inc();
    return id.toString();
  }
  /**
    Resets the identity manager, marking all unique identifiers as available.
     @method reset
    @public
  */


  reset() {
    this._nextId = 1;
    this._ids = {};
  }

}

var IdentityManager$1 = IdentityManager;

/**
  @hide
*/
let association = function (...traitsAndOverrides) {
  let __isAssociation__ = true;
  return {
    __isAssociation__,
    traitsAndOverrides
  };
};

var association$1 = association;

let trait = function (extension) {
  let __isTrait__ = true;
  return {
    extension,
    __isTrait__
  };
};
/**
  @hide
*/


var trait$1 = trait;

const warn = console.warn; // eslint-disable-line no-console

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

class Response {
  constructor(code, headers = {}, data) {
    this.code = code;
    this.headers = headers; // Default data for "undefined 204" responses to empty string (no content)

    if (code === 204) {
      if (data !== undefined && data !== "") {
        warn(`Mirage: One of your route handlers is returning a custom
          204 Response that has data, but this is a violation of the HTTP spec
          and could lead to unexpected behavior. 204 responses should have no
          content (an empty string) as their body.`);
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

  toRackResponse() {
    return [this.code, this.headers, this.data];
  }

}

const camelizeCache = {};
const dasherizeCache = {};
const underscoreCache = {};
const capitalizeCache = {};
/**
 * @param {String} word
 * @hide
 */

function camelize(word) {
  if (typeof camelizeCache[word] !== "string") {
    let camelizedWord = inflected.camelize(underscore(word), false);
    /*
     The `ember-inflector` package's version of camelize lower-cases the first
     word after a slash, e.g.
          camelize('my-things/nice-watch'); // 'myThings/niceWatch'
      The `inflected` package doesn't, so we make that change here to not break
     existing functionality. (This affects the name of the schema collections.)
    */


    const camelized = camelizedWord.split("/").map(lowerFirst__default["default"]).join("/");
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
    const dasherized = inflected.dasherize(underscore(word));

    dasherizeCache[word] = dasherized;
  }

  return dasherizeCache[word];
}
function underscore(word) {
  if (typeof underscoreCache[word] !== "string") {
    const underscored = inflected.underscore(word);

    underscoreCache[word] = underscored;
  }

  return underscoreCache[word];
}
function capitalize(word) {
  if (typeof capitalizeCache[word] !== "string") {
    const capitalized = inflected.capitalize(word);

    capitalizeCache[word] = capitalized;
  }

  return capitalizeCache[word];
}

/**
  @hide
*/

function isAssociation (object) {
  return isPlainObject__default["default"](object) && object.__isAssociation__ === true;
}

/* eslint no-console: 0 */
let errorProps = ["description", "fileName", "lineNumber", "message", "name", "number", "stack"];
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
  let tmp = Error(message);

  if (stack) {
    tmp.stack = stack;
  }

  for (let idx = 0; idx < errorProps.length; idx++) {
    let prop = errorProps[idx];

    if (["description", "message", "stack"].indexOf(prop) > -1) {
      this[prop] = `Mirage: ${tmp[prop]}`;
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

class Association {
  constructor(modelName, opts) {
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

    if (typeof modelName === "object") {
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


  setSchema(schema) {
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


  isReflexive() {
    let isExplicitReflexive = !!(this.modelName === this.ownerModelName && this.opts.inverse);
    let isImplicitReflexive = !!(this.opts.inverse === undefined && this.ownerModelName === this.modelName);
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


  get isPolymorphic() {
    return this.opts.polymorphic;
  }
  /**
    Returns either the string `"hasMany"` or `"belongsTo"`, based on the association type.
  
    @accessor
    @type {String}
    @public
   */


  get type() {
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


  get foreignKey() {
    return this.getForeignKey();
  }
  /**
    @hide
  */


  get identifier() {
    throw new Error("Subclasses of Association must implement a getter for identifier");
  }

}

const identifierCache$1 = {};
/**
 * The belongsTo association adds a fk to the owner of the association
 *
 * @class BelongsTo
 * @extends Association
 * @constructor
 * @public
 * @hide
 */

class BelongsTo extends Association {
  get identifier() {
    if (typeof identifierCache$1[this.name] !== "string") {
      const identifier = `${camelize(this.name)}Id`;
      identifierCache$1[this.name] = identifier;
    }

    return identifierCache$1[this.name];
  }

  get type() {
    return "belongsTo";
  }
  /**
   * @method getForeignKeyArray
   * @return {Array} Array of camelized name of the model owning the association
   * and foreign key for the association
   * @public
   */


  getForeignKeyArray() {
    return [camelize(this.ownerModelName), this.getForeignKey()];
  }
  /**
   * @method getForeignKey
   * @return {String} Foreign key for the association
   * @public
   */


  getForeignKey() {
    // we reuse identifierCache because it's the same logic as get identifier
    if (typeof identifierCache$1[this.name] !== "string") {
      const foreignKey = `${camelize(this.name)}Id`;
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


  addMethodsToModelClass(ModelClass, key) {
    let modelPrototype = ModelClass.prototype;
    let association = this;
    let foreignKey = this.getForeignKey();
    let associationHash = {
      [key]: this
    };
    modelPrototype.belongsToAssociations = Object.assign(modelPrototype.belongsToAssociations, associationHash); // update belongsToAssociationFks

    Object.keys(modelPrototype.belongsToAssociations).forEach(key => {
      const value = modelPrototype.belongsToAssociations[key];
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
      get() {
        this._tempAssociations = this._tempAssociations || {};
        let tempParent = this._tempAssociations[key];
        let id;

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
      set(id) {
        let tempParent;

        if (id === null) {
          tempParent = null;
        } else if (id !== undefined) {
          if (association.isPolymorphic) {
            assert(typeof id === "object", `You're setting an ID on the polymorphic association '${association.name}' but you didn't pass in an object. Polymorphic IDs need to be in the form { type, id }.`);
            tempParent = association.schema[association.schema.toCollectionName(id.type)].find(id.id);
          } else {
            tempParent = association.schema[association.schema.toCollectionName(association.modelName)].find(id);
            assert(tempParent, `Couldn't find ${association.modelName} with id = ${id}`);
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
      get() {
        this._tempAssociations = this._tempAssociations || {};
        let tempParent = this._tempAssociations[key];
        let foreignKeyId = this[foreignKey];
        let model = null;

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
      set(model) {
        this._tempAssociations = this._tempAssociations || {};
        this._tempAssociations[key] = model;

        if (model && model.hasInverseFor(association)) {
          let inverse = model.inverseFor(association);
          model.associate(this, inverse);
        }
      }

    });
    /*
      object.newParent
        - creates a new unsaved associated parent
       TODO: document polymorphic
    */

    modelPrototype[`new${capitalize(key)}`] = function (...args) {
      let modelName, attrs;

      if (association.isPolymorphic) {
        modelName = args[0];
        attrs = args[1];
      } else {
        modelName = association.modelName;
        attrs = args[0];
      }

      let parent = association.schema[association.schema.toCollectionName(modelName)].new(attrs);
      this[key] = parent;
      return parent;
    };
    /*
      object.createParent
        - creates a new saved associated parent, and immediately persists both models
       TODO: document polymorphic
    */


    modelPrototype[`create${capitalize(key)}`] = function (...args) {
      let modelName, attrs;

      if (association.isPolymorphic) {
        modelName = args[0];
        attrs = args[1];
      } else {
        modelName = association.modelName;
        attrs = args[0];
      }

      let parent = association.schema[association.schema.toCollectionName(modelName)].create(attrs);
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


  disassociateAllDependentsFromTarget(model) {
    let owner = this.ownerModelName;
    let fk;

    if (this.isPolymorphic) {
      fk = {
        type: model.modelName,
        id: model.id
      };
    } else {
      fk = model.id;
    }

    let dependents = this.schema[this.schema.toCollectionName(owner)].where(potentialOwner => {
      let id = potentialOwner[this.getForeignKey()];

      if (!id) {
        return false;
      }

      if (typeof id === "object") {
        return id.type === fk.type && id.id === fk.id;
      } else {
        return id === fk;
      }
    });
    dependents.models.forEach(dependent => {
      dependent.disassociate(model, this);
      dependent.save();
    });
  }

}

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


class DbCollection {
  constructor(name, initialData, IdentityManager) {
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


  all() {
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


  insert(data) {
    if (!Array.isArray(data)) {
      return this._insertRecord(data);
    } else {
      return map__default["default"](data, attrs => this._insertRecord(attrs));
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


  find(ids) {
    if (Array.isArray(ids)) {
      let records = this._findRecords(ids).filter(Boolean).map(duplicate); // Return a copy


      return records;
    } else {
      let record = this._findRecord(ids);

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


  findBy(query) {
    let record = this._findRecordBy(query);

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


  where(query) {
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


  firstOrCreate(query, attributesForCreate = {}) {
    let queryResult = this.where(query);
    let [record] = queryResult;

    if (record) {
      return record;
    } else {
      let mergedAttributes = Object.assign(attributesForCreate, query);
      let createdRecord = this.insert(mergedAttributes);
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


  update(target, attrs) {
    let records;

    if (typeof attrs === "undefined") {
      attrs = target;
      let changedRecords = [];

      this._records.forEach(record => {
        let oldRecord = Object.assign({}, record);

        this._updateRecord(record, attrs);

        if (!isEqual__default["default"](oldRecord, record)) {
          changedRecords.push(record);
        }
      });

      return changedRecords;
    } else if (typeof target === "number" || typeof target === "string") {
      let id = target;

      let record = this._findRecord(id);

      this._updateRecord(record, attrs);

      return record;
    } else if (Array.isArray(target)) {
      let ids = target;
      records = this._findRecords(ids);
      records.forEach(record => {
        this._updateRecord(record, attrs);
      });
      return records;
    } else if (typeof target === "object") {
      let query = target;
      records = this._findRecordsWhere(query);
      records.forEach(record => {
        this._updateRecord(record, attrs);
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


  remove(target) {
    let records;

    if (typeof target === "undefined") {
      this._records = [];
      this.identityManager.reset();
    } else if (typeof target === "number" || typeof target === "string") {
      let record = this._findRecord(target);

      let index = this._records.indexOf(record);

      this._records.splice(index, 1);
    } else if (Array.isArray(target)) {
      records = this._findRecords(target);
      records.forEach(record => {
        let index = this._records.indexOf(record);

        this._records.splice(index, 1);
      });
    } else if (typeof target === "object") {
      records = this._findRecordsWhere(target);
      records.forEach(record => {
        let index = this._records.indexOf(record);

        this._records.splice(index, 1);
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


  _findRecord(id) {
    id = id.toString();
    return this._records.find(obj => obj.id === id);
  }
  /**
    @method _findRecordBy
    @param query
    @private
    @hide
   */


  _findRecordBy(query) {
    return this._findRecordsWhere(query)[0];
  }
  /**
    @method _findRecords
    @param ids
    @private
    @hide
   */


  _findRecords(ids) {
    return ids.map(this._findRecord, this);
  }
  /**
    @method _findRecordsWhere
    @param query
    @private
    @hide
   */


  _findRecordsWhere(query) {
    let records = this._records;

    function defaultQueryFunction(record) {
      let keys = Object.keys(query);
      return keys.every(function (key) {
        return String(record[key]) === String(query[key]);
      });
    }

    let queryFunction = typeof query === "object" ? defaultQueryFunction : query;
    return records.filter(queryFunction);
  }
  /**
    @method _insertRecord
    @param data
    @private
    @hide
   */


  _insertRecord(data) {
    let attrs = duplicate(data);

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


  _updateRecord(record, attrs) {
    let targetId = attrs && Object.prototype.hasOwnProperty.call(attrs, "id") ? attrs.id.toString() : null;
    let currentId = record.id;

    if (targetId && currentId !== targetId) {
      throw new Error("Updating the ID of a record is not permitted");
    }

    for (let attr in attrs) {
      if (attr === "id") {
        continue;
      }

      record[attr] = attrs[attr];
    }
  }

}

var DbCollection$1 = DbCollection;

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

class Db {
  constructor(initialData, identityManagers) {
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


  loadData(data) {
    for (let key in data) {
      this.createCollection(key, cloneDeep__default["default"](data[key]));
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


  dump() {
    return this._collections.reduce((data, collection) => {
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


  createCollection(name, initialData) {
    if (!this[name]) {
      let IdentityManager = this.identityManagerFor(name);
      let newCollection = new DbCollection$1(name, initialData, IdentityManager); // Public API has a convenient array interface. It comes at the cost of
      // returning a copy of all records to avoid accidental mutations.

      Object.defineProperty(this, name, {
        get() {
          let recordsCopy = newCollection.all();
          ["insert", "find", "findBy", "where", "update", "remove", "firstOrCreate"].forEach(function (method) {
            recordsCopy[method] = function () {
              return newCollection[method](...arguments);
            };
          });
          return recordsCopy;
        }

      }); // Private API does not have the array interface. This means internally, only
      // db-collection methods can be used. This is so records aren't copied redundantly
      // internally, which leads to accidental O(n^2) operations (e.g., createList).

      Object.defineProperty(this, `_${name}`, {
        get() {
          let recordsCopy = [];
          ["insert", "find", "findBy", "where", "update", "remove", "firstOrCreate"].forEach(function (method) {
            recordsCopy[method] = function () {
              return newCollection[method](...arguments);
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


  createCollections(...collections) {
    collections.forEach(c => this.createCollection(c));
  }
  /**
    Removes all data from Mirage's database.
     @method emptyData
    @public
   */


  emptyData() {
    this._collections.forEach(c => c.remove());
  }
  /**
    @method identityManagerFor
    @param name
    @public
    @hide
   */


  identityManagerFor(name) {
    return this._identityManagers[this._container.inflector.singularize(name)] || this._identityManagers.application || IdentityManager$1;
  }
  /**
    @method registerIdentityManagers
    @public
    @hide
   */


  registerIdentityManagers(identityManagers) {
    this._identityManagers = identityManagers || {};
  }

}

var Db$1 = Db;

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

class Collection {
  constructor(modelName, models = []) {
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


  get length() {
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


  update(...args) {
    invokeMap__default["default"](this.models, "update", ...args);
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


  save() {
    invokeMap__default["default"](this.models, "save");
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


  reload() {
    invokeMap__default["default"](this.models, "reload");
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


  destroy() {
    invokeMap__default["default"](this.models, "destroy");
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


  add(model) {
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


  remove(model) {
    let match = this.models.find(m => m.toString() === model.toString());

    if (match) {
      let i = this.models.indexOf(match);
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


  includes(model) {
    return this.models.some(m => m.toString() === model.toString());
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


  filter(f) {
    let filteredModels = this.models.filter(f);
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


  sort(f) {
    let sortedModels = this.models.concat().sort(f);
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


  slice(...args) {
    let slicedModels = this.models.slice(...args);
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


  mergeCollection(collection) {
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


  toString() {
    return `collection:${this.modelName}(${this.models.map(m => m.id).join(",")})`;
  }

}

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

class PolymorphicCollection {
  constructor(models = []) {
    this.models = models;
  }
  /**
   * Number of models in the collection.
   *
   * @property length
   * @type Number
   * @public
   */


  get length() {
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


  update(...args) {
    invokeMap__default["default"](this.models, "update", ...args);
    return this;
  }
  /**
   * Destroys the db record for all models in the collection.
   * @method destroy
   * @return this
   * @public
   */


  destroy() {
    invokeMap__default["default"](this.models, "destroy");
    return this;
  }
  /**
   * Saves all models in the collection.
   * @method save
   * @return this
   * @public
   */


  save() {
    invokeMap__default["default"](this.models, "save");
    return this;
  }
  /**
   * Reloads each model in the collection.
   * @method reload
   * @return this
   * @public
   */


  reload() {
    invokeMap__default["default"](this.models, "reload");
    return this;
  }
  /**
   * Adds a model to this collection
   *
   * @method add
   * @return this
   * @public
   */


  add(model) {
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


  remove(model) {
    let match = this.models.find(m => isEqual__default["default"](m.attrs, model.attrs));

    if (match) {
      let i = this.models.indexOf(match);
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


  includes(model) {
    return this.models.some(m => isEqual__default["default"](m.attrs, model.attrs));
  }
  /**
   * @method filter
   * @param f
   * @return {Collection}
   * @public
   */


  filter(f) {
    let filteredModels = this.models.filter(f);
    return new PolymorphicCollection(filteredModels);
  }
  /**
   * @method sort
   * @param f
   * @return {Collection}
   * @public
   */


  sort(f) {
    let sortedModels = this.models.concat().sort(f);
    return new PolymorphicCollection(sortedModels);
  }
  /**
   * @method slice
   * @param {Integer} begin
   * @param {Integer} end
   * @return {Collection}
   * @public
   */


  slice(...args) {
    let slicedModels = this.models.slice(...args);
    return new PolymorphicCollection(slicedModels);
  }
  /**
   * @method mergeCollection
   * @param collection
   * @return this
   * @public
   */


  mergeCollection(collection) {
    this.models = this.models.concat(collection.models);
    return this;
  }
  /**
   * Simple string representation of the collection and id.
   * @method toString
   * @return {String}
   * @public
   */


  toString() {
    return `collection:${this.modelName}(${this.models.map(m => m.id).join(",")})`;
  }

}

const identifierCache = {};
/**
 * @class HasMany
 * @extends Association
 * @constructor
 * @public
 * @hide
 */

class HasMany extends Association {
  get identifier() {
    if (typeof identifierCache[this.name] !== "string") {
      const identifier = `${camelize(this._container.inflector.singularize(this.name))}Ids`;
      identifierCache[this.name] = identifier;
    }

    return identifierCache[this.name];
  }

  get type() {
    return "hasMany";
  }
  /**
   * @method getForeignKeyArray
   * @return {Array} Array of camelized model name of associated objects
   * and foreign key for the object owning the association
   * @public
   */


  getForeignKeyArray() {
    return [camelize(this.ownerModelName), this.getForeignKey()];
  }
  /**
   * @method getForeignKey
   * @return {String} Foreign key for the object owning the association
   * @public
   */


  getForeignKey() {
    // we reuse identifierCache because it's the same logic as get identifier
    if (typeof identifierCache[this.name] !== "string") {
      const foreignKey = `${this._container.inflector.singularize(camelize(this.name))}Ids`;
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


  addMethodsToModelClass(ModelClass, key) {
    let modelPrototype = ModelClass.prototype;
    let association = this;
    let foreignKey = this.getForeignKey();
    let associationHash = {
      [key]: this
    };
    modelPrototype.hasManyAssociations = Object.assign(modelPrototype.hasManyAssociations, associationHash); // update hasManyAssociationFks

    Object.keys(modelPrototype.hasManyAssociations).forEach(key => {
      const value = modelPrototype.hasManyAssociations[key];
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
      get() {
        this._tempAssociations = this._tempAssociations || {};
        let tempChildren = this._tempAssociations[key];
        let ids = [];

        if (tempChildren) {
          if (association.isPolymorphic) {
            ids = tempChildren.models.map(model => ({
              type: model.modelName,
              id: model.id
            }));
          } else {
            ids = tempChildren.models.map(model => model.id);
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
      set(ids) {
        let tempChildren;

        if (ids === null) {
          tempChildren = [];
        } else if (ids !== undefined) {
          assert(Array.isArray(ids), `You must pass an array in when setting ${foreignKey} on ${this}`);

          if (association.isPolymorphic) {
            assert(ids.every(el => {
              return typeof el === "object" && typeof el.type !== undefined && typeof el.id !== undefined;
            }), `You must pass in an array of polymorphic identifiers (objects of shape { type, id }) when setting ${foreignKey} on ${this}`);
            let models = ids.map(({
              type,
              id
            }) => {
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
      get() {
        this._tempAssociations = this._tempAssociations || {};
        let collection = null;

        if (this._tempAssociations[key]) {
          collection = this._tempAssociations[key];
        } else {
          if (association.isPolymorphic) {
            if (this[foreignKey]) {
              let polymorphicIds = this[foreignKey];
              let models = polymorphicIds.map(({
                type,
                id
              }) => {
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
      set(models) {
        if (models instanceof Collection || models instanceof PolymorphicCollection) {
          models = models.models;
        }

        models = models ? compact__default["default"](models) : [];
        this._tempAssociations = this._tempAssociations || {};
        let collection;

        if (association.isPolymorphic) {
          collection = new PolymorphicCollection(models);
        } else {
          collection = new Collection(association.modelName, models);
        }

        this._tempAssociations[key] = collection;
        models.forEach(model => {
          if (model.hasInverseFor(association)) {
            let inverse = model.inverseFor(association);
            model.associate(this, inverse);
          }
        });
      }

    });
    /*
      object.newChild
        - creates a new unsaved associated child
    */

    modelPrototype[`new${capitalize(camelize(this._container.inflector.singularize(association.name)))}`] = function (...args) {
      let modelName, attrs;

      if (association.isPolymorphic) {
        modelName = args[0];
        attrs = args[1];
      } else {
        modelName = association.modelName;
        attrs = args[0];
      }

      let child = association.schema[association.schema.toCollectionName(modelName)].new(attrs);
      let children = this[key].models;
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


    modelPrototype[`create${capitalize(camelize(this._container.inflector.singularize(association.name)))}`] = function (...args) {
      let modelName, attrs;

      if (association.isPolymorphic) {
        modelName = args[0];
        attrs = args[1];
      } else {
        modelName = association.modelName;
        attrs = args[0];
      }

      let child = association.schema[association.schema.toCollectionName(modelName)].create(attrs);
      let children = this[key].models;
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


  disassociateAllDependentsFromTarget(model) {
    let owner = this.ownerModelName;
    let fk;

    if (this.isPolymorphic) {
      fk = {
        type: model.modelName,
        id: model.id
      };
    } else {
      fk = model.id;
    }

    let dependents = this.schema[this.schema.toCollectionName(owner)].where(potentialOwner => {
      let currentIds = potentialOwner[this.getForeignKey()]; // Need this check because currentIds could be null

      return currentIds && currentIds.find(id => {
        if (typeof id === "object") {
          return id.type === fk.type && id.id === fk.id;
        } else {
          return id === fk;
        }
      });
    });
    dependents.models.forEach(dependent => {
      dependent.disassociate(model, this);
      dependent.save();
    });
  }

}

const pathModelClassCache = {};
/**
  @hide
*/

class BaseRouteHandler {
  getModelClassFromPath(fullPath) {
    if (!fullPath) {
      return;
    }

    if (typeof pathModelClassCache[fullPath] !== "string") {
      let path = fullPath.split("/");
      let lastPath;

      for (let i = path.length - 1; i >= 0; i--) {
        const segment = path[i];

        if (segment.length && segment[0] !== ":") {
          lastPath = segment;
          break;
        }
      }

      pathModelClassCache[fullPath] = dasherize(camelize(this._container.inflector.singularize(lastPath)));
    }

    return pathModelClassCache[fullPath];
  }

  _getIdForRequest(request, jsonApiDoc) {
    let id;

    if (request && request.params && request.params.id) {
      id = request.params.id;
    } else if (jsonApiDoc && jsonApiDoc.data && jsonApiDoc.data.id) {
      id = jsonApiDoc.data.id;
    }

    return id;
  }

  _getJsonApiDocForRequest(request, modelName) {
    let body;

    if (request && request.requestBody) {
      body = JSON.parse(request.requestBody);
    }

    return this.serializerOrRegistry.normalize(body, modelName);
  }

  _getAttrsForRequest(request, modelName) {
    let json = this._getJsonApiDocForRequest(request, modelName);

    let id = this._getIdForRequest(request, json);

    let attrs = {};
    assert(json.data && (json.data.attributes || json.data.type || json.data.relationships), `You're using a shorthand or #normalizedRequestAttrs, but your serializer's normalize function did not return a valid JSON:API document. Consult the docs for the normalize hook on the Serializer class.`);

    if (json.data.attributes) {
      attrs = Object.keys(json.data.attributes).reduce((sum, key) => {
        sum[camelize(key)] = json.data.attributes[key];
        return sum;
      }, {});
    }

    if (json.data.relationships) {
      Object.keys(json.data.relationships).forEach(relationshipName => {
        let relationship = json.data.relationships[relationshipName];
        let modelClass = this.schema.modelClassFor(modelName);
        let association = modelClass.associationFor(camelize(relationshipName));
        let valueForRelationship;
        assert(association, `You're passing the relationship '${relationshipName}' to the '${modelName}' model via a ${request.method} to '${request.url}', but you did not define the '${relationshipName}' association on the '${modelName}' model.`);

        if (association.isPolymorphic) {
          valueForRelationship = relationship.data;
        } else if (association instanceof HasMany) {
          valueForRelationship = relationship.data && relationship.data.map(rel => rel.id);
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

  _getAttrsForFormRequest({
    requestBody
  }) {
    let attrs;
    let urlEncodedParts = [];
    assert(requestBody && typeof requestBody === "string", `You're using the helper method #normalizedFormData, but the request body is empty or not a valid url encoded string.`);
    urlEncodedParts = requestBody.split("&");
    attrs = urlEncodedParts.reduce((a, urlEncodedPart) => {
      let [key, value] = urlEncodedPart.split("=");
      a[key] = decodeURIComponent(value.replace(/\+/g, " "));
      return a;
    }, {});
    return attrs;
  }

}

/**
 * @hide
 */

class FunctionRouteHandler extends BaseRouteHandler {
  constructor(schema, serializerOrRegistry, userFunction, path, server) {
    super(server);
    this.schema = schema;
    this.serializerOrRegistry = serializerOrRegistry;
    this.userFunction = userFunction;
    this.path = path;
  }

  handle(request) {
    return this.userFunction(this.schema, request);
  }

  setRequest(request) {
    this.request = request;
  }

  serialize(response, serializerType) {
    let serializer;

    if (serializerType) {
      serializer = this.serializerOrRegistry.serializerFor(serializerType, {
        explicit: true
      });
    } else {
      serializer = this.serializerOrRegistry;
    }

    return serializer.serialize(response, this.request);
  }

  normalizedRequestAttrs(modelName = null) {
    let {
      path,
      request,
      request: {
        requestHeaders
      }
    } = this;
    let attrs;
    let lowerCaseHeaders = {};

    for (let header in requestHeaders) {
      lowerCaseHeaders[header.toLowerCase()] = requestHeaders[header];
    }

    if (/x-www-form-urlencoded/.test(lowerCaseHeaders["content-type"])) {
      attrs = this._getAttrsForFormRequest(request);
    } else {
      if (modelName) {
        assert(dasherize(modelName) === modelName, `You called normalizedRequestAttrs('${modelName}'), but normalizedRequestAttrs was intended to be used with the dasherized version of the model type. Please change this to normalizedRequestAttrs('${dasherize(modelName)}').`);
      } else {
        modelName = this.getModelClassFromPath(path);
      }

      assert(this.schema.hasModelForModelName(modelName), `You're using a shorthand or the #normalizedRequestAttrs helper but the detected model of '${modelName}' does not exist. You might need to pass in the correct modelName as the first argument to #normalizedRequestAttrs.`);
      attrs = this._getAttrsForRequest(request, modelName);
    }

    return attrs;
  }

}

/**
 * @hide
 */
class ObjectRouteHandler {
  constructor(schema, serializerOrRegistry, object) {
    this.schema = schema;
    this.serializerOrRegistry = serializerOrRegistry;
    this.object = object;
  }

  handle() {
    return this.object;
  }

}

/**
  @hide
*/

class BaseShorthandRouteHandler extends BaseRouteHandler {
  constructor(schema, serializerOrRegistry, shorthand, path, options = {}) {
    super();
    shorthand = shorthand || this.getModelClassFromPath(path);
    this.schema = schema;
    this.serializerOrRegistry = serializerOrRegistry;
    this.shorthand = shorthand;
    this.options = options;
    let type = Array.isArray(shorthand) ? "array" : typeof shorthand;

    if (type === "string") {
      let modelClass = this.schema[this.schema.toCollectionName(shorthand)];

      this.handle = request => {
        return this.handleStringShorthand(request, modelClass);
      };
    } else if (type === "array") {
      let modelClasses = shorthand.map(modelName => this.schema[this.schema.toCollectionName(modelName)]);

      this.handle = request => {
        return this.handleArrayShorthand(request, modelClasses);
      };
    }
  } // handleStringShorthand() {
  //
  // }
  //
  // handleArrayShorthand() {
  //
  // }


}

/**
 * @hide
 */

class GetShorthandRouteHandler extends BaseShorthandRouteHandler {
  /*
    Retrieve a model/collection from the db.
     Examples:
      this.get('/contacts', 'contact');
      this.get('/contacts/:id', 'contact');
  */
  handleStringShorthand(request, modelClass) {
    let modelName = this.shorthand;
    let camelizedModelName = camelize(modelName);
    assert(modelClass, `The route handler for ${request.url} is trying to access the ${camelizedModelName} model, but that model doesn't exist.`);

    let id = this._getIdForRequest(request);

    if (id) {
      let model = modelClass.find(id);

      if (!model) {
        return new Response(404);
      } else {
        return model;
      }
    } else if (this.options.coalesce) {
      let ids = this.serializerOrRegistry.getCoalescedIds(request, camelizedModelName);

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


  handleArrayShorthand(request, modelClasses) {
    let keys = this.shorthand;

    let id = this._getIdForRequest(request);
    /*
    If the first key is singular and we have an id param in
    the request, we're dealing with the version of the shorthand
    that has a parent model and several has-many relationships.
    We throw an error, because the serializer is the appropriate
    place for this now.
    */


    assert(!id || this._container.inflector.singularize(keys[0]) !== keys[0], `It looks like you're using the "Single record with
      related records" version of the array shorthand, in addition to opting
      in to the model layer. This shorthand was made when there was no
      serializer layer. Now that you're using models, please ensure your
      relationships are defined, and create a serializer for the parent
      model, adding the relationships there.`);
    return modelClasses.map(modelClass => modelClass.all());
  }

}

/**
 * @hide
 */

class PostShorthandRouteHandler extends BaseShorthandRouteHandler {
  /*
    Push a new model of type *camelizedModelName* to the db.
     For example, this will push a 'user':
      this.post('/contacts', 'user');
  */
  handleStringShorthand(request, modelClass) {
    let modelName = this.shorthand;
    let camelizedModelName = camelize(modelName);
    assert(modelClass, `The route handler for ${request.url} is trying to access the ${camelizedModelName} model, but that model doesn't exist.`);

    let attrs = this._getAttrsForRequest(request, modelClass.camelizedModelName);

    return modelClass.create(attrs);
  }

}

/**
 * @hide
 */

class PutShorthandRouteHandler extends BaseShorthandRouteHandler {
  /*
    Update an object from the db, specifying the type.
       this.put('/contacts/:id', 'user');
  */
  handleStringShorthand(request, modelClass) {
    let modelName = this.shorthand;
    let camelizedModelName = camelize(modelName);
    assert(modelClass, `The route handler for ${request.url} is trying to access the ${camelizedModelName} model, but that model doesn't exist.`);

    let id = this._getIdForRequest(request);

    let model = modelClass.find(id);

    if (!model) {
      return new Response(404);
    }

    let attrs = this._getAttrsForRequest(request, modelClass.camelizedModelName);

    return model.update(attrs);
  }

}

/**
 * @hide
 */

class DeleteShorthandRouteHandler extends BaseShorthandRouteHandler {
  /*
    Remove the model from the db of type *camelizedModelName*.
     This would remove the user with id :id:
      Ex: this.del('/contacts/:id', 'user');
  */
  handleStringShorthand(request, modelClass) {
    let modelName = this.shorthand;
    let camelizedModelName = camelize(modelName);
    assert(modelClass, `The route handler for ${request.url} is trying to access the ${camelizedModelName} model, but that model doesn't exist.`);

    let id = this._getIdForRequest(request);

    let model = modelClass.find(id);

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


  handleArrayShorthand(request, modelClasses) {
    let id = this._getIdForRequest(request);

    let parent = modelClasses[0].find(id);
    let childTypes = modelClasses.slice(1).map(modelClass => this._container.inflector.pluralize(modelClass.camelizedModelName)); // Delete related children

    childTypes.forEach(type => parent[type].destroy());
    parent.destroy();
  }

}

/**
 * @hide
 */

class HeadShorthandRouteHandler extends BaseShorthandRouteHandler {
  /*
    Retrieve a model/collection from the db.
     Examples:
      this.head('/contacts', 'contact');
      this.head('/contacts/:id', 'contact');
  */
  handleStringShorthand(request, modelClass) {
    let modelName = this.shorthand;
    let camelizedModelName = camelize(modelName);
    assert(modelClass, `The route handler for ${request.url} is trying to access the ${camelizedModelName} model, but that model doesn't exist.`);

    let id = this._getIdForRequest(request);

    if (id) {
      let model = modelClass.find(id);

      if (!model) {
        return new Response(404);
      } else {
        return new Response(204);
      }
    } else if (this.options.coalesce && request.queryParams && request.queryParams.ids) {
      let model = modelClass.find(request.queryParams.ids);

      if (!model) {
        return new Response(404);
      } else {
        return new Response(204);
      }
    } else {
      return new Response(204);
    }
  }

}

const DEFAULT_CODES = {
  get: 200,
  put: 204,
  post: 201,
  delete: 204
};

function createHandler({
  verb,
  schema,
  serializerOrRegistry,
  path,
  rawHandler,
  options,
  middleware
}) {
  let handler;
  let args = [schema, serializerOrRegistry, rawHandler, path, options, middleware];
  let type = typeof rawHandler;

  if (type === "function") {
    handler = new FunctionRouteHandler(...args);
  } else if (type === "object" && rawHandler) {
    handler = new ObjectRouteHandler(...args);
  } else if (verb === "get") {
    handler = new GetShorthandRouteHandler(...args);
  } else if (verb === "post") {
    handler = new PostShorthandRouteHandler(...args);
  } else if (verb === "put" || verb === "patch") {
    handler = new PutShorthandRouteHandler(...args);
  } else if (verb === "delete") {
    handler = new DeleteShorthandRouteHandler(...args);
  } else if (verb === "head") {
    handler = new HeadShorthandRouteHandler(...args);
  }

  return handler;
}
/**
 * @hide
 */


class RouteHandler {
  constructor({
    schema,
    verb,
    rawHandler,
    customizedCode,
    options,
    path,
    serializerOrRegistry,
    middleware
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
      options
    });
  }

  handle(request) {
    return this._getMirageResponseForRequest(request, this.middleware).then(mirageResponse => this.serialize(mirageResponse, request)).then(serializedMirageResponse => {
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
      if (this.handler instanceof FunctionRouteHandler) {
        this.handler.setRequest(request);
      }

      result = this.handleWithMiddleware(request, [...middleware, (_, req) => this.handler.handle(req)]);
    } catch (e) {
      if (e instanceof MirageError) {
        result = new Response(500, {}, e);
      } else {
        let message = e.message || e;
        result = new Response(500, {}, {
          message,
          stack: `Mirage: Your ${request.method} handler for the url ${request.url} threw an error:\n\n${e.stack || e}`
        });
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
      Promise.resolve(result).then(response => {
        if (response instanceof Response) {
          mirageResponse = result;
        } else {
          let code = this._getCodeForResponse(response);

          mirageResponse = new Response(code, {}, response);
        }

        resolve(mirageResponse);
      }).catch(reject);
    });
  }

  _getCodeForResponse(response) {
    let code;

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

  serialize(mirageResponse, request) {
    mirageResponse.data = this.serializerOrRegistry.serialize(mirageResponse.data, request);
    return mirageResponse;
  }

}

/**
  @hide
*/

function extend(protoProps, staticProps) {
  class Child extends this {
    constructor(...args) {
      super(...args); // The constructor function for the new subclass is optionally defined by you
      // in your `extend` definition

      if (protoProps && has__default["default"](protoProps, "constructor")) {
        protoProps.constructor.call(this, ...args);
      }
    }

  } // Add static properties to the constructor function, if supplied.


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

class Model {
  // TODO: schema and modelName now set statically at registration, need to remove

  /*
    Notes:
   - We need to pass in modelName, because models are created with
    .extend and anonymous functions, so you cannot use
    reflection to find the name of the constructor.
  */
  constructor(schema, modelName, attrs, fks) {
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

    this.fks.forEach(fk => {
      this.attrs[fk] = attrs[fk] !== undefined ? attrs[fk] : null;
    });
    Object.keys(attrs).forEach(name => {
      const value = attrs[name];

      this._validateAttr(name, value);

      this._setupAttr(name, value);

      this._setupRelationship(name, value);
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


  save() {
    let collection = this._schema.toInternalCollectionName(this.modelName);

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


  update(key, val) {
    let attrs;

    if (key == null) {
      return this;
    }

    if (typeof key === "object") {
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


  destroy() {
    if (this.isSaved()) {
      this._disassociateFromDependents();

      let collection = this._schema.toInternalCollectionName(this.modelName);

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


  isNew() {
    let hasDbRecord = false;
    let hasId = this.attrs.id !== undefined && this.attrs.id !== null;

    if (hasId) {
      let collectionName = this._schema.toInternalCollectionName(this.modelName);

      let record = this._schema.db[collectionName].find(this.attrs.id);

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


  isSaved() {
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


  reload() {
    if (this.id) {
      let collection = this._schema.toInternalCollectionName(this.modelName);

      let attrs = this._schema.db[collection].find(this.id);

      Object.keys(attrs).filter(function (attr) {
        return attr !== "id";
      }).forEach(function (attr) {
        this.attrs[attr] = attrs[attr];
      }, this);
    } // Clear temp associations


    this._tempAssociations = {};
    return this;
  }

  toJSON() {
    return { ...this.attrs
    };
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


  get associations() {
    return this._schema.associationsFor(this.modelName);
  }
  /**
    Returns the association for the given key
     @method associationFor
    @param key
    @public
    @hide
   */


  associationFor(key) {
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


  inverseFor(association) {
    return this._explicitInverseFor(association) || this._implicitInverseFor(association);
  }
  /**
    Finds the inverse for an association that explicity defines it's inverse
     @private
    @hide
  */


  _explicitInverseFor(association) {
    this._checkForMultipleExplicitInverses(association);

    let associations = this._schema.associationsFor(this.modelName);

    let inverse = association.opts.inverse;
    let candidate = inverse ? associations[inverse] : null;
    let matchingPolymorphic = candidate && candidate.isPolymorphic;
    let matchingInverse = candidate && candidate.modelName === association.ownerModelName;
    let candidateInverse = candidate && candidate.opts.inverse;

    if (candidateInverse && candidate.opts.inverse !== association.name) {
      assert(false, `You specified an inverse of ${inverse} for ${association.name}, but it does not match ${candidate.modelName} ${candidate.name}'s inverse`);
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


  _checkForMultipleExplicitInverses(association) {
    let associations = this._schema.associationsFor(this.modelName);

    let matchingExplicitInverses = Object.keys(associations).filter(key => {
      let candidate = associations[key];
      let modelMatches = association.ownerModelName === candidate.modelName;
      let inverseKeyMatches = association.name === candidate.opts.inverse;
      return modelMatches && inverseKeyMatches;
    });
    assert(matchingExplicitInverses.length <= 1, `The ${this.modelName} model has defined multiple explicit inverse associations for the ${association.ownerModelName}.${association.name} association.`);
  }
  /**
    Finds if there is an inverse for an association that does not
    explicitly define one.
     @private
    @hide
  */


  _implicitInverseFor(association) {
    let associations = this._schema.associationsFor(this.modelName);

    let modelName = association.ownerModelName;
    return values__default["default"](associations).filter(candidate => candidate.modelName === modelName).reduce((inverse, candidate) => {
      let candidateInverse = candidate.opts.inverse;
      let candidateIsImplicitInverse = candidateInverse === undefined;
      let candidateIsExplicitInverse = candidateInverse === association.name;
      let candidateMatches = candidateIsImplicitInverse || candidateIsExplicitInverse;

      if (candidateMatches) {
        // Need to move this check to compile-time init
        assert(!inverse, `The ${this.modelName} model has multiple possible inverse associations for the ${association.ownerModelName}.${association.name} association.`);
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


  hasInverseFor(association) {
    return !!this.inverseFor(association);
  }
  /**
    Used to check if models match each other. If models are saved, we check model type
    and id, since they could have other non-persisted properties that are different.
     @public
    @hide
  */


  alreadyAssociatedWith(model, association) {
    let associatedModelOrCollection = this[association.name];

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

  associate(model, association) {
    if (this.alreadyAssociatedWith(model, association)) {
      return;
    }

    let {
      name
    } = association;

    if (association instanceof HasMany) {
      if (!this[name].includes(model)) {
        this[name].add(model);
      }
    } else {
      this[name] = model;
    }
  }

  disassociate(model, association) {
    let fk = association.getForeignKey();

    if (association instanceof HasMany) {
      let i;

      if (association.isPolymorphic) {
        let found = this[fk].find(({
          type,
          id
        }) => type === model.modelName && id === model.id);
        i = found && this[fk].indexOf(found);
      } else {
        i = this[fk].map(key => key.toString()).indexOf(model.id.toString());
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


  get isSaving() {
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


  _setupAttr(attr, value) {
    const isAssociation = this.associationKeys.has(attr) || this.associationIdKeys.has(attr);

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


  _definePlainAttribute(attr) {
    // Ensure the property hasn't already been defined
    let existingProperty = Object.getOwnPropertyDescriptor(this, attr);

    if (existingProperty && existingProperty.get) {
      return;
    } // Ensure the attribute is on the attrs hash


    if (!Object.prototype.hasOwnProperty.call(this.attrs, attr)) {
      this.attrs[attr] = null;
    } // Define the getter/setter


    Object.defineProperty(this, attr, {
      get() {
        return this.attrs[attr];
      },

      set(val) {
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


  _setupRelationship(attr, value) {
    const isFk = this.associationIdKeys.has(attr) || this.fks.includes(attr);
    const isAssociation = this.associationKeys.has(attr);

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


  _validateAttr(key, value) {
    // Verify attr passed in for associations is actually an association
    {
      if (this.associationKeys.has(key)) {
        let association = this.associationFor(key);
        let isNull = value === null;

        if (association instanceof HasMany) {
          let isCollection = value instanceof Collection || value instanceof PolymorphicCollection;
          let isArrayOfModels = Array.isArray(value) && value.every(item => item instanceof Model);
          assert(isCollection || isArrayOfModels || isNull, `You're trying to create a ${this.modelName} model and you passed in "${value}" under the ${key} key, but that key is a HasMany relationship. You must pass in a Collection, PolymorphicCollection, array of Models, or null.`);
        } else if (association instanceof BelongsTo) {
          assert(value instanceof Model || isNull, `You're trying to create a ${this.modelName} model and you passed in "${value}" under the ${key} key, but that key is a BelongsTo relationship. You must pass in a Model or null.`);
        }
      }
    } // Verify attrs passed in for association foreign keys are actually fks

    {
      if (this.associationIdKeys.has(key)) {
        if (key.endsWith("Ids")) {
          let isArray = Array.isArray(value);
          let isNull = value === null;
          assert(isArray || isNull, `You're trying to create a ${this.modelName} model and you passed in "${value}" under the ${key} key, but that key is a foreign key for a HasMany relationship. You must pass in an array of ids or null.`);
        }
      }
    } // Verify no undefined associations are passed in

    {
      let isModelOrCollection = value instanceof Model || value instanceof Collection || value instanceof PolymorphicCollection;
      let isArrayOfModels = Array.isArray(value) && value.length && value.every(item => item instanceof Model);

      if (isModelOrCollection || isArrayOfModels) {
        let modelOrCollection = value;
        assert(this.associationKeys.has(key), `You're trying to create a ${this.modelName} model and you passed in a ${modelOrCollection.toString()} under the ${key} key, but you haven't defined that key as an association on your model.`);
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


  _validateForeignKeyExistsInDatabase(foreignKeyName, foreignKeys) {
    if (Array.isArray(foreignKeys)) {
      let association = this.hasManyAssociationFks[foreignKeyName];
      let found;

      if (association.isPolymorphic) {
        found = foreignKeys.map(({
          type,
          id
        }) => {
          return this._schema.db[this._schema.toInternalCollectionName(type)].find(id);
        });
        found = compact__default["default"](found);
      } else {
        found = this._schema.db[this._schema.toInternalCollectionName(association.modelName)].find(foreignKeys);
      }

      let foreignKeyLabel = association.isPolymorphic ? foreignKeys.map(fk => `${fk.type}:${fk.id}`).join(",") : foreignKeys;
      assert(found.length === foreignKeys.length, `You're instantiating a ${this.modelName} that has a ${foreignKeyName} of ${foreignKeyLabel}, but some of those records don't exist in the database.`);
    } else {
      let association = this.belongsToAssociationFks[foreignKeyName];
      let found;

      if (association.isPolymorphic) {
        found = this._schema.db[this._schema.toInternalCollectionName(foreignKeys.type)].find(foreignKeys.id);
      } else {
        found = this._schema.db[this._schema.toInternalCollectionName(association.modelName)].find(foreignKeys);
      }

      let foreignKeyLabel = association.isPolymorphic ? `${foreignKeys.type}:${foreignKeys.id}` : foreignKeys;
      assert(found, `You're instantiating a ${this.modelName} that has a ${foreignKeyName} of ${foreignKeyLabel}, but that record doesn't exist in the database.`);
    }
  }
  /**
    Update associated children when saving a collection
   *
    @method _saveAssociations
    @private
    @hide
   */


  _saveAssociations() {
    this._saveBelongsToAssociations();

    this._saveHasManyAssociations();
  }

  _saveBelongsToAssociations() {
    values__default["default"](this.belongsToAssociations).forEach(association => {
      this._disassociateFromOldInverses(association);

      this._saveNewAssociates(association);

      this._associateWithNewInverses(association);
    });
  }

  _saveHasManyAssociations() {
    values__default["default"](this.hasManyAssociations).forEach(association => {
      this._disassociateFromOldInverses(association);

      this._saveNewAssociates(association);

      this._associateWithNewInverses(association);
    });
  }

  _disassociateFromOldInverses(association) {
    if (association instanceof HasMany) {
      this._disassociateFromHasManyInverses(association);
    } else if (association instanceof BelongsTo) {
      this._disassociateFromBelongsToInverse(association);
    }
  } // Disassociate currently persisted models that are no longer associated


  _disassociateFromHasManyInverses(association) {
    let fk = association.getForeignKey();
    let tempAssociation = this._tempAssociations && this._tempAssociations[association.name];
    let associateIds = this.attrs[fk];

    if (tempAssociation && associateIds) {
      let models;

      if (association.isPolymorphic) {
        models = associateIds.map(({
          type,
          id
        }) => {
          return this._schema[this._schema.toCollectionName(type)].find(id);
        });
      } else {
        // TODO: prob should initialize hasMany fks with []
        models = this._schema[this._schema.toCollectionName(association.modelName)].find(associateIds || []).models;
      }

      models.filter(associate => // filter out models that are already being saved
      !associate.isSaving && // filter out models that will still be associated
      !tempAssociation.includes(associate) && associate.hasInverseFor(association)).forEach(associate => {
        let inverse = associate.inverseFor(association);
        associate.disassociate(this, inverse);
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


  _disassociateFromBelongsToInverse(association) {
    let fk = association.getForeignKey();
    let tempAssociation = this._tempAssociations && this._tempAssociations[association.name];
    let associateId = this.attrs[fk];

    if (tempAssociation !== undefined && associateId) {
      let associate;

      if (association.isPolymorphic) {
        associate = this._schema[this._schema.toCollectionName(associateId.type)].find(associateId.id);
      } else {
        associate = this._schema[this._schema.toCollectionName(association.modelName)].find(associateId);
      }

      if (associate.hasInverseFor(association)) {
        let inverse = associate.inverseFor(association);
        associate.disassociate(this, inverse);

        associate._updateInDb(associate.attrs);
      }
    }
  } // Find all other models that depend on me and update their foreign keys


  _disassociateFromDependents() {
    this._schema.dependentAssociationsFor(this.modelName).forEach(association => {
      association.disassociateAllDependentsFromTarget(this);
    });
  }

  _saveNewAssociates(association) {
    let fk = association.getForeignKey();
    let tempAssociate = this._tempAssociations && this._tempAssociations[association.name];

    if (tempAssociate !== undefined) {
      this.__isSavingNewChildren = true;
      delete this._tempAssociations[association.name];

      if (tempAssociate instanceof Collection) {
        tempAssociate.models.filter(model => !model.isSaving).forEach(child => {
          child.save();
        });

        this._updateInDb({
          [fk]: tempAssociate.models.map(child => child.id)
        });
      } else if (tempAssociate instanceof PolymorphicCollection) {
        tempAssociate.models.filter(model => !model.isSaving).forEach(child => {
          child.save();
        });

        this._updateInDb({
          [fk]: tempAssociate.models.map(child => {
            return {
              type: child.modelName,
              id: child.id
            };
          })
        });
      } else {
        // Clearing the association
        if (tempAssociate === null) {
          this._updateInDb({
            [fk]: null
          }); // Self-referential

        } else if (this.equals(tempAssociate)) {
          this._updateInDb({
            [fk]: this.id
          }); // Non-self-referential

        } else if (!tempAssociate.isSaving) {
          // Save the tempAssociate and update the local reference
          tempAssociate.save();

          this._syncTempAssociations(tempAssociate);

          let fkValue;

          if (association.isPolymorphic) {
            fkValue = {
              id: tempAssociate.id,
              type: tempAssociate.modelName
            };
          } else {
            fkValue = tempAssociate.id;
          }

          this._updateInDb({
            [fk]: fkValue
          });
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


  _associateWithNewInverses(association) {
    if (!this.__isSavingNewChildren) {
      let modelOrCollection = this[association.name];

      if (modelOrCollection instanceof Model) {
        this._associateModelWithInverse(modelOrCollection, association);
      } else if (modelOrCollection instanceof Collection || modelOrCollection instanceof PolymorphicCollection) {
        modelOrCollection.models.forEach(model => {
          this._associateModelWithInverse(model, association);
        });
      }

      delete this._tempAssociations[association.name];
    }
  }

  _associateModelWithInverse(model, association) {
    if (model.hasInverseFor(association)) {
      let inverse = model.inverseFor(association);
      let inverseFk = inverse.getForeignKey();
      let ownerId = this.id;

      if (inverse instanceof BelongsTo) {
        let newId;

        if (inverse.isPolymorphic) {
          newId = {
            type: this.modelName,
            id: ownerId
          };
        } else {
          newId = ownerId;
        }

        this._schema.db[this._schema.toInternalCollectionName(model.modelName)].update(model.id, {
          [inverseFk]: newId
        });
      } else {
        let inverseCollection = this._schema.db[this._schema.toInternalCollectionName(model.modelName)];

        let currentIdsForInverse = inverseCollection.find(model.id)[inverse.getForeignKey()] || [];
        let newIdsForInverse = Object.assign([], currentIdsForInverse);
        let newId, alreadyAssociatedWith;

        if (inverse.isPolymorphic) {
          newId = {
            type: this.modelName,
            id: ownerId
          };
          alreadyAssociatedWith = newIdsForInverse.some(key => key.type == this.modelName && key.id == ownerId);
        } else {
          newId = ownerId;
          alreadyAssociatedWith = newIdsForInverse.includes(ownerId);
        }

        if (!alreadyAssociatedWith) {
          newIdsForInverse.push(newId);
        }

        inverseCollection.update(model.id, {
          [inverseFk]: newIdsForInverse
        });
      }
    }
  } // Used to update data directly, since #save and #update can retrigger saves,
  // which can cause cycles with associations.


  _updateInDb(attrs) {
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


  _syncTempAssociations(tempAssociate) {
    Object.keys(this._tempAssociations).forEach(key => {
      if (this._tempAssociations[key] && this._tempAssociations[key].toString() === tempAssociate.toString()) {
        this._tempAssociations[key] = tempAssociate;
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


  toString() {
    let idLabel = this.id ? `(${this.id})` : "";
    return `model:${this.modelName}${idLabel}`;
  }
  /**
    Checks the equality of this model and the passed-in model
   *
    @method equals
    @return boolean
    @public
    @hide
   */


  equals(model) {
    return this.toString() === model.toString();
  }

}

Model.extend = extend;

Model.findBelongsToAssociation = function (associationType) {
  return this.prototype.belongsToAssociations[associationType];
};

var Model$1 = Model;

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

class Serializer {
  constructor(registry, type, request = {}) {
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

    this._embedFn = isFunction__default["default"](this.embed) ? this.embed : () => !!this.embed;
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


  serialize(primaryResource
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


  normalize(json) {
    return json;
  }

  buildPayload(primaryResource, toInclude, didSerialize, json) {
    if (!primaryResource && isEmpty__default["default"](toInclude)) {
      return json;
    } else if (primaryResource) {
      let [resourceHash, newIncludes] = this.getHashForPrimaryResource(primaryResource);
      let newDidSerialize = this.isCollection(primaryResource) ? primaryResource.models : [primaryResource];
      return this.buildPayload(undefined, newIncludes, newDidSerialize, resourceHash);
    } else {
      let nextIncludedResource = toInclude.shift();
      let [resourceHash, newIncludes] = this.getHashForIncludedResource(nextIncludedResource);
      let newToInclude = newIncludes.filter(resource => {
        return !didSerialize.map(m => m.toString()).includes(resource.toString());
      }).concat(toInclude);
      let newDidSerialize = (this.isCollection(nextIncludedResource) ? nextIncludedResource.models : [nextIncludedResource]).concat(didSerialize);
      let newJson = this.mergePayloads(json, resourceHash);
      return this.buildPayload(undefined, newToInclude, newDidSerialize, newJson);
    }
  }

  getHashForPrimaryResource(resource) {
    let [hash, addToIncludes] = this.getHashForResource(resource);
    let hashWithRoot;

    if (this.root) {
      assert(!(resource instanceof PolymorphicCollection), `The base Serializer class cannot serialize a top-level PolymorphicCollection when root is true, since PolymorphicCollections have no type.`);
      let serializer = this.serializerFor(resource.modelName);
      let rootKey = serializer.keyForResource(resource);
      hashWithRoot = {
        [rootKey]: hash
      };
    } else {
      hashWithRoot = hash;
    }

    return [hashWithRoot, addToIncludes];
  }

  getHashForIncludedResource(resource) {
    let hashWithRoot, addToIncludes;

    if (resource instanceof PolymorphicCollection) {
      hashWithRoot = {};
      addToIncludes = resource.models;
    } else {
      let serializer = this.serializerFor(resource.modelName);
      let [hash, newModels] = serializer.getHashForResource(resource); // Included resources always have a root, and are always pushed to an array.

      let rootKey = serializer.keyForRelationship(resource.modelName);
      hashWithRoot = Array.isArray(hash) ? {
        [rootKey]: hash
      } : {
        [rootKey]: [hash]
      };
      addToIncludes = newModels;
    }

    return [hashWithRoot, addToIncludes];
  }

  getHashForResource(resource, removeForeignKeys = false, didSerialize = {}, lookupSerializer = false) {
    let serializer = this;
    let hash; // PolymorphicCollection lacks a modelName, but is dealt with in the map
    // by looking up the serializer on a per-model basis

    if (lookupSerializer && resource.modelName) {
      serializer = this.serializerFor(resource.modelName);
    }

    if (this.isModel(resource)) {
      hash = serializer._hashForModel(resource, removeForeignKeys, didSerialize);
    } else {
      hash = resource.models.map(m => {
        let modelSerializer = serializer;

        if (!modelSerializer) {
          // Can't get here if lookupSerializer is false, so look it up
          modelSerializer = this.serializerFor(m.modelName);
        }

        return modelSerializer._hashForModel(m, removeForeignKeys, didSerialize);
      });
    }

    let addToIncludes = uniqBy__default["default"](compact__default["default"](flatten__default["default"](serializer.getKeysForIncluded().map(key => {
      if (this.isCollection(resource)) {
        return resource.models.map(m => m[key]);
      } else {
        return resource[key];
      }
    }))), m => m.toString());
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


  mergePayloads(json, resourceHash) {
    let newJson;
    let [resourceHashKey] = Object.keys(resourceHash);

    if (json[resourceHashKey]) {
      newJson = json;
      newJson[resourceHashKey] = json[resourceHashKey].concat(resourceHash[resourceHashKey]);
    } else {
      newJson = Object.assign(json, resourceHash);
    }

    return newJson;
  }

  keyForResource(resource) {
    let {
      modelName
    } = resource;
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


  keyForModel(modelName) {
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


  keyForCollection(modelName) {
    return this._container.inflector.pluralize(this.keyForModel(modelName));
  }

  _hashForModel(model, removeForeignKeys, didSerialize = {}) {
    let attrs = this._attrsForModel(model);

    if (removeForeignKeys) {
      model.fks.forEach(fk => {
        delete attrs[fk];
      });
    }

    if (this.embed) {
      let newDidSerialize = Object.assign({}, didSerialize);
      newDidSerialize[model.modelName] = newDidSerialize[model.modelName] || {};
      newDidSerialize[model.modelName][model.id] = true;
      this.getKeysForEmbedded().forEach(key => {
        let associatedResource = model[key];

        if (associatedResource && !get__default["default"](newDidSerialize, `${associatedResource.modelName}.${associatedResource.id}`)) {
          let [associatedResourceHash] = this.getHashForResource(associatedResource, true, newDidSerialize, true);
          let formattedKey = this.keyForEmbeddedRelationship(key);
          attrs[formattedKey] = associatedResourceHash;

          if (this.isModel(associatedResource)) {
            let fk = `${camelize(key)}Id`;
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


  _attrsForModel(model) {
    let attrs = {};

    if (this.attrs) {
      attrs = this.attrs.reduce((memo, attr) => {
        memo[attr] = model[attr];
        return memo;
      }, {});
    } else {
      attrs = Object.assign(attrs, model.attrs);
    } // Remove fks


    model.fks.forEach(key => delete attrs[key]);
    return this._formatAttributeKeys(attrs);
  }
  /**
    @method _maybeAddAssociationIds
    @param model
    @param attrs
    @private
    @hide
   */


  _maybeAddAssociationIds(model, attrs) {
    let newHash = Object.assign({}, attrs);

    if (this.serializeIds === "always") {
      [...model.associationKeys].filter(key => !this._embedFn(key)).forEach(key => {
        let resource = model[key];
        let association = model.associationFor(key);

        if (this.isCollection(resource)) {
          let formattedKey = this.keyForRelationshipIds(key);
          newHash[formattedKey] = model[`${this._container.inflector.singularize(key)}Ids`];
        } else if (this.isModel(resource) && association.isPolymorphic) {
          let formattedTypeKey = this.keyForPolymorphicForeignKeyType(key);
          let formattedIdKey = this.keyForPolymorphicForeignKeyId(key);
          newHash[formattedTypeKey] = model[`${key}Id`].type;
          newHash[formattedIdKey] = model[`${key}Id`].id;
        } else if (resource) {
          let formattedKey = this.keyForForeignKey(key);
          newHash[formattedKey] = model[`${key}Id`];
        }
      });
    } else if (this.serializeIds === "included") {
      this.getKeysForIncluded().forEach(key => {
        let resource = model[key];
        let association = model.associationFor(key);

        if (this.isCollection(resource)) {
          let formattedKey = this.keyForRelationshipIds(key);
          newHash[formattedKey] = model[`${this._container.inflector.singularize(key)}Ids`];
        } else if (this.isModel(resource) && association.isPolymorphic) {
          let formattedTypeKey = this.keyForPolymorphicForeignKeyType(key);
          let formattedIdKey = this.keyForPolymorphicForeignKeyId(key);
          newHash[formattedTypeKey] = model[`${key}Id`].type;
          newHash[formattedIdKey] = model[`${key}Id`].id;
        } else if (this.isModel(resource)) {
          let formattedKey = this.keyForForeignKey(key);
          newHash[formattedKey] = model[`${key}Id`];
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


  keyForAttribute(attr) {
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


  keyForRelationship(modelName) {
    return camelize(this._container.inflector.pluralize(modelName));
  }
  /**
    Like `keyForRelationship`, but for embedded relationships.
     @method keyForEmbeddedRelationship
    @param attributeName
    @public
   */


  keyForEmbeddedRelationship(attributeName) {
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


  keyForRelationshipIds(relationshipName) {
    return `${this._container.inflector.singularize(camelize(relationshipName))}Ids`;
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


  keyForForeignKey(relationshipName) {
    return `${camelize(relationshipName)}Id`;
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


  keyForPolymorphicForeignKeyId(relationshipName) {
    return `${camelize(relationshipName)}Id`;
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


  keyForPolymorphicForeignKeyType(relationshipName) {
    return `${camelize(relationshipName)}Type`;
  }
  /**
    @method isModel
    @param object
    @return {Boolean}
    @public
    @hide
   */


  isModel(object) {
    return object instanceof Model$1;
  }
  /**
    @method isCollection
    @param object
    @return {Boolean}
    @public
    @hide
   */


  isCollection(object) {
    return object instanceof Collection || object instanceof PolymorphicCollection;
  }
  /**
    @method isModelOrCollection
    @param object
    @return {Boolean}
    @public
    @hide
   */


  isModelOrCollection(object) {
    return this.isModel(object) || this.isCollection(object);
  }
  /**
    @method serializerFor
    @param type
    @public
    @hide
   */


  serializerFor(type) {
    return this.registry.serializerFor(type);
  }

  getAssociationKeys() {
    return isFunction__default["default"](this.include) ? this.include(this.request, this.primaryResource) : this.include;
  }

  getKeysForEmbedded() {
    return this.getAssociationKeys().filter(k => this._embedFn(k));
  }

  getKeysForIncluded() {
    return this.getAssociationKeys().filter(k => !this._embedFn(k));
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


  get schema() {
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


  keyForId() {
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


  valueForId(value) {
    return value;
  }
  /**
    @method _formatAttributeKeys
    @param attrs
    @private
    @hide
   */


  _formatAttributeKeys(attrs) {
    let formattedAttrs = {};

    for (let key in attrs) {
      let formattedValue = attrs[key];

      if (key === "id") {
        formattedValue = this.valueForId(formattedValue);
      }

      let formattedKey = this.keyForAttribute(key);
      formattedAttrs[formattedKey] = formattedValue;
    }

    return formattedAttrs;
  }

  getCoalescedIds() {}

} // Defaults


Serializer.prototype.include = [];
Serializer.prototype.root = true;
Serializer.prototype.embed = false;
Serializer.prototype.primaryKey = "id";
Serializer.prototype.serializeIds = "included"; // can be 'included', 'always', or 'never'

Serializer.extend = extend;
var Serializer$1 = Serializer;

/**
  The JSONAPISerializer. Subclass of Serializer.

  @class JSONAPISerializer
  @constructor
  @public
 */

class JSONAPISerializer extends Serializer$1 {
  constructor() {
    super(...arguments);
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

    this.alwaysIncludeLinkageData = this.alwaysIncludeLinkageData || undefined; // this is just here so I can add the doc comment. Better way?
  } // Don't think this is used?


  keyForModel(modelName) {
    return dasherize(modelName);
  } // Don't think this is used?


  keyForCollection(modelName) {
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


  keyForAttribute(attr) {
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


  keyForRelationship(key) {
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


  links() {}

  getHashForPrimaryResource(resource) {
    this._createRequestedIncludesGraph(resource);

    let resourceHash = this.getHashForResource(resource);
    let hashWithRoot = {
      data: resourceHash
    };
    let addToIncludes = this.getAddToIncludesForResource(resource);
    return [hashWithRoot, addToIncludes];
  }

  getHashForIncludedResource(resource) {
    let serializer = this.serializerFor(resource.modelName);
    let hash = serializer.getHashForResource(resource);
    let hashWithRoot = {
      included: this.isModel(resource) ? [hash] : hash
    };
    let addToIncludes = [];

    if (!this.hasQueryParamIncludes()) {
      addToIncludes = this.getAddToIncludesForResource(resource);
    }

    return [hashWithRoot, addToIncludes];
  }

  getHashForResource(resource) {
    let hash;

    if (this.isModel(resource)) {
      hash = this.getResourceObjectForModel(resource);
    } else {
      hash = resource.models.map(m => this.getResourceObjectForModel(m));
    }

    return hash;
  }
  /*
    Returns a flat unique list of resources that need to be added to includes
  */


  getAddToIncludesForResource(resource) {
    let relationshipPaths;

    if (this.hasQueryParamIncludes()) {
      relationshipPaths = this.getQueryParamIncludes();
    } else {
      let serializer = this.serializerFor(resource.modelName);
      relationshipPaths = serializer.getKeysForIncluded();
    }

    return this.getAddToIncludesForResourceAndPaths(resource, relationshipPaths);
  }

  getAddToIncludesForResourceAndPaths(resource, relationshipPaths) {
    let includes = [];
    relationshipPaths.forEach(path => {
      let relationshipNames = path.split(".");
      let newIncludes = this.getIncludesForResourceAndPath(resource, ...relationshipNames);
      includes.push(newIncludes);
    });
    return uniqBy__default["default"](compact__default["default"](flatten__default["default"](includes)), m => m.toString());
  }

  getIncludesForResourceAndPath(resource, ...names) {
    let nameForCurrentResource = camelize(names.shift());
    let includes = [];
    let modelsToAdd = [];

    if (this.isModel(resource)) {
      let relationship = resource[nameForCurrentResource];

      if (this.isModel(relationship)) {
        modelsToAdd = [relationship];
      } else if (this.isCollection(relationship)) {
        modelsToAdd = relationship.models;
      }
    } else {
      resource.models.forEach(model => {
        let relationship = model[nameForCurrentResource];

        if (this.isModel(relationship)) {
          modelsToAdd.push(relationship);
        } else if (this.isCollection(relationship)) {
          modelsToAdd = modelsToAdd.concat(relationship.models);
        }
      });
    }

    includes = includes.concat(modelsToAdd);

    if (names.length) {
      modelsToAdd.forEach(model => {
        includes = includes.concat(this.getIncludesForResourceAndPath(model, ...names));
      });
    }

    return includes;
  }

  getResourceObjectForModel(model) {
    let attrs = this._attrsForModel(model, true);

    delete attrs.id;
    let hash = {
      type: this.typeKeyForModel(model),
      id: model.id,
      attributes: attrs
    };
    return this._maybeAddRelationshipsToResourceObjectForModel(hash, model);
  }

  _maybeAddRelationshipsToResourceObjectForModel(hash, model) {
    const relationships = {};
    model.associationKeys.forEach(key => {
      let relationship = model[key];
      let relationshipKey = this.keyForRelationship(key);
      let relationshipHash = {};

      if (this.hasLinksForRelationship(model, key)) {
        let serializer = this.serializerFor(model.modelName);
        let links = serializer.links(model);
        relationshipHash.links = links[key];
      }

      if (this.alwaysIncludeLinkageData || this.shouldIncludeLinkageData(key, model) || this._relationshipIsIncludedForModel(key, model)) {
        let data = null;

        if (this.isModel(relationship)) {
          data = {
            type: this.typeKeyForModel(relationship),
            id: relationship.id
          };
        } else if (this.isCollection(relationship)) {
          data = relationship.models.map(model => {
            return {
              type: this.typeKeyForModel(model),
              id: model.id
            };
          });
        }

        relationshipHash.data = data;
      }

      if (!isEmpty__default["default"](relationshipHash)) {
        relationships[relationshipKey] = relationshipHash;
      }
    });

    if (!isEmpty__default["default"](relationships)) {
      hash.relationships = relationships;
    }

    return hash;
  }

  hasLinksForRelationship(model, relationshipKey) {
    let serializer = this.serializerFor(model.modelName);
    let links = serializer.links && serializer.links(model);
    return links && links[relationshipKey] != null;
  }
  /*
    This code (and a lot of this serializer) need to be re-worked according to
    the graph logic...
  */


  _relationshipIsIncludedForModel(relationshipKey, model) {
    if (this.hasQueryParamIncludes()) {
      let graph = this.request._includesGraph;

      let graphKey = this._graphKeyForModel(model); // Find the resource in the graph


      let graphResource; // Check primary data

      if (graph.data[graphKey]) {
        graphResource = graph.data[graphKey]; // Check includes
      } else if (graph.included[this._container.inflector.pluralize(model.modelName)]) {
        graphResource = graph.included[this._container.inflector.pluralize(model.modelName)][graphKey];
      } // If the model's in the graph, check if relationshipKey should be included


      return graphResource && graphResource.relationships && Object.prototype.hasOwnProperty.call(graphResource.relationships, dasherize(relationshipKey));
    } else {
      let relationshipPaths = this.getKeysForIncluded();
      return relationshipPaths.includes(relationshipKey);
    }
  }
  /*
    This is needed for _relationshipIsIncludedForModel - see the note there for
    more background.
     If/when we can refactor this serializer, the logic in this method would
    probably be the basis for the new overall json/graph creation.
  */


  _createRequestedIncludesGraph(primaryResource, secondaryResource = null) {
    let graph = {
      data: {}
    };

    if (this.isModel(primaryResource)) {
      let primaryResourceKey = this._graphKeyForModel(primaryResource);

      graph.data[primaryResourceKey] = {};

      this._addPrimaryModelToRequestedIncludesGraph(graph, primaryResource);
    } else if (this.isCollection(primaryResource)) {
      primaryResource.models.forEach(model => {
        let primaryResourceKey = this._graphKeyForModel(model);

        graph.data[primaryResourceKey] = {};

        this._addPrimaryModelToRequestedIncludesGraph(graph, model);
      });
    } // Hack :/ Need to think of a better palce to put this if
    // refactoring json:api serializer.


    this.request._includesGraph = graph;
  }

  _addPrimaryModelToRequestedIncludesGraph(graph, model) {
    if (this.hasQueryParamIncludes()) {
      let graphKey = this._graphKeyForModel(model);

      this.getQueryParamIncludes().filter(item => !!item.trim()).forEach(includesPath => {
        // includesPath is post.comments, for example
        graph.data[graphKey].relationships = graph.data[graphKey].relationships || {};
        let relationshipKeys = includesPath.split(".").map(dasherize);
        let relationshipKey = relationshipKeys[0];
        let graphRelationshipKey = relationshipKey;
        let normalizedRelationshipKey = camelize(relationshipKey);
        let hasAssociation = model.associationKeys.has(normalizedRelationshipKey);
        assert(hasAssociation, `You tried to include "${relationshipKey}" with ${model} but no association named "${normalizedRelationshipKey}" is defined on the model.`);
        let relationship = model[normalizedRelationshipKey];
        let relationshipData;

        if (this.isModel(relationship)) {
          relationshipData = this._graphKeyForModel(relationship);
        } else if (this.isCollection(relationship)) {
          relationshipData = relationship.models.map(this._graphKeyForModel);
        } else {
          relationshipData = null;
        }

        graph.data[graphKey].relationships[graphRelationshipKey] = relationshipData;

        if (relationship) {
          this._addResourceToRequestedIncludesGraph(graph, relationship, relationshipKeys.slice(1));
        }
      });
    }
  }

  _addResourceToRequestedIncludesGraph(graph, resource, relationshipNames) {
    graph.included = graph.included || {};
    let models = this.isCollection(resource) ? resource.models : [resource];
    models.forEach(model => {
      let collectionName = this._container.inflector.pluralize(model.modelName);

      graph.included[collectionName] = graph.included[collectionName] || {};

      this._addModelToRequestedIncludesGraph(graph, model, relationshipNames);
    });
  }

  _addModelToRequestedIncludesGraph(graph, model, relationshipNames) {
    let collectionName = this._container.inflector.pluralize(model.modelName);

    let resourceKey = this._graphKeyForModel(model);

    graph.included[collectionName][resourceKey] = graph.included[collectionName][resourceKey] || {};

    if (relationshipNames.length) {
      this._addResourceRelationshipsToRequestedIncludesGraph(graph, collectionName, resourceKey, model, relationshipNames);
    }
  }
  /*
    Lot of the same logic here from _addPrimaryModelToRequestedIncludesGraph, could refactor & share
  */


  _addResourceRelationshipsToRequestedIncludesGraph(graph, collectionName, resourceKey, model, relationshipNames) {
    graph.included[collectionName][resourceKey].relationships = graph.included[collectionName][resourceKey].relationships || {};
    let relationshipName = relationshipNames[0];
    let relationship = model[camelize(relationshipName)];
    let relationshipData;

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

  _graphKeyForModel(model) {
    return `${model.modelName}:${model.id}`;
  }

  getQueryParamIncludes() {
    let includes = get__default["default"](this, "request.queryParams.include");

    if (includes && !Array.isArray(includes)) {
      includes = includes.split(",");
    }

    return includes;
  }

  hasQueryParamIncludes() {
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


  typeKeyForModel(model) {
    return dasherize(this._container.inflector.pluralize(model.modelName));
  }

  getCoalescedIds(request) {
    let ids = request.queryParams && request.queryParams["filter[id]"];

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


  shouldIncludeLinkageData(relationshipKey, model) {
    return false;
  }

}

JSONAPISerializer.prototype.alwaysIncludeLinkageData = false;
var JsonApiSerializer = JSONAPISerializer;

/**
 * @hide
 */

class SerializerRegistry {
  constructor(schema, serializerMap = {}, server) {
    this.schema = schema;
    this._serializerMap = serializerMap;
  }

  normalize(payload, modelName) {
    return this.serializerFor(modelName).normalize(payload);
  }

  serialize(response, request) {
    this.request = request;

    if (this._isModelOrCollection(response)) {
      let serializer = this.serializerFor(response.modelName);
      return serializer.serialize(response, request);
    } else if (Array.isArray(response) && response.some(this._isCollection)) {
      return response.reduce((json, collection) => {
        let serializer = this.serializerFor(collection.modelName);

        if (serializer.embed) {
          json[this._container.inflector.pluralize(collection.modelName)] = serializer.serialize(collection, request);
        } else {
          json = Object.assign(json, serializer.serialize(collection, request));
        }

        return json;
      }, {});
    } else {
      return response;
    }
  }

  serializerFor(type, {
    explicit = false
  } = {}) {
    let SerializerForResponse = type && this._serializerMap && this._serializerMap[camelize(type)];

    if (explicit) {
      assert(!!SerializerForResponse, `You passed in ${type} as an explicit serializer type but that serializer doesn't exist.`);
    } else {
      SerializerForResponse = SerializerForResponse || this._serializerMap.application || Serializer$1;
      assert(!SerializerForResponse || SerializerForResponse.prototype.embed || SerializerForResponse.prototype.root || new SerializerForResponse() instanceof JsonApiSerializer, "You cannot have a serializer that sideloads (embed: false) and disables the root (root: false).");
    }

    return new SerializerForResponse(this, type, this.request);
  }

  _isModel(object) {
    return object instanceof Model$1;
  }

  _isCollection(object) {
    return object instanceof Collection || object instanceof PolymorphicCollection;
  }

  _isModelOrCollection(object) {
    return this._isModel(object) || this._isCollection(object);
  }

  registerSerializers(newSerializerMaps) {
    let currentSerializerMap = this._serializerMap || {};
    this._serializerMap = Object.assign(currentSerializerMap, newSerializerMaps);
  }

  getCoalescedIds(request, modelName) {
    return this.serializerFor(modelName).getCoalescedIds(request);
  }

}

const collectionNameCache = {};
const internalCollectionNameCache = {};
const modelNameCache = {};
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

class Schema {
  constructor(db, modelsMap = {}) {
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


  registerModels(hash = {}) {
    forIn__default["default"](hash, (model, key) => {
      this.registerModel(key, hash[key]);
    });
  }
  /**
    @method registerModel
    @param type
    @param ModelClass
    @public
    @hide
   */


  registerModel(type, ModelClass) {
    let camelizedModelName = camelize(type);
    let modelName = dasherize(camelizedModelName); // Avoid mutating original class, because we may want to reuse it across many tests

    ModelClass = ModelClass.extend(); // Store model & fks in registry
    // TODO: don't think this is needed anymore

    this._registry[camelizedModelName] = this._registry[camelizedModelName] || {
      class: null,
      foreignKeys: []
    }; // we may have created this key before, if another model added fks to it

    this._registry[camelizedModelName].class = ModelClass; // TODO: set here, remove from model#constructor

    ModelClass.prototype._schema = this;
    ModelClass.prototype.modelName = modelName; // Set up associations

    ModelClass.prototype.hasManyAssociations = {}; // a registry of the model's hasMany associations. Key is key from model definition, value is association instance itself

    ModelClass.prototype.hasManyAssociationFks = {}; // a lookup table to get the hasMany association by foreignKey

    ModelClass.prototype.belongsToAssociations = {}; // a registry of the model's belongsTo associations. Key is key from model definition, value is association instance itself

    ModelClass.prototype.belongsToAssociationFks = {}; // a lookup table to get the belongsTo association by foreignKey

    ModelClass.prototype.associationKeys = new Set(); // ex: address.user, user.addresses

    ModelClass.prototype.associationIdKeys = new Set(); // ex: address.user_id, user.address_ids

    ModelClass.prototype.dependentAssociations = []; // a registry of associations that depend on this model, needed for deletion cleanup.

    let fksAddedFromThisModel = {};

    for (let associationProperty in ModelClass.prototype) {
      if (ModelClass.prototype[associationProperty] instanceof Association) {
        let association = ModelClass.prototype[associationProperty];
        association.name = associationProperty;
        association.modelName = association.modelName || this.toModelName(associationProperty);
        association.ownerModelName = modelName;
        association.setSchema(this); // Update the registry with this association's foreign keys. This is
        // essentially our "db migration", since we must know about the fks.

        let [fkHolder, fk] = association.getForeignKeyArray();
        fksAddedFromThisModel[fkHolder] = fksAddedFromThisModel[fkHolder] || [];
        assert(!fksAddedFromThisModel[fkHolder].includes(fk), `Your '${type}' model definition has multiple possible inverse relationships of type '${fkHolder}'. Please use explicit inverses.`);
        fksAddedFromThisModel[fkHolder].push(fk);

        this._addForeignKeyToRegistry(fkHolder, fk); // Augment the Model's class with any methods added by this association


        association.addMethodsToModelClass(ModelClass, associationProperty);
      }
    } // Create a db collection for this model, if doesn't exist


    let collection = this.toCollectionName(modelName);

    if (!this.db[collection]) {
      this.db.createCollection(collection);
    } // Create the entity methods


    this[collection] = {
      camelizedModelName,
      new: attrs => this.new(camelizedModelName, attrs),
      create: attrs => this.create(camelizedModelName, attrs),
      all: attrs => this.all(camelizedModelName, attrs),
      find: attrs => this.find(camelizedModelName, attrs),
      findBy: attrs => this.findBy(camelizedModelName, attrs),
      findOrCreateBy: attrs => this.findOrCreateBy(camelizedModelName, attrs),
      where: attrs => this.where(camelizedModelName, attrs),
      none: attrs => this.none(camelizedModelName, attrs),
      first: attrs => this.first(camelizedModelName, attrs)
    };
    return this;
  }
  /**
    @method modelFor
    @param type
    @public
    @hide
   */


  modelFor(type) {
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


  new(type, attrs) {
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


  create(type, attrs) {
    return this.new(type, attrs).save();
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


  all(type) {
    let collection = this.collectionForType(type);
    return this._hydrate(collection, dasherize(type));
  }
  /**
    Return an empty collection of type `type`.
     @method none
    @param type
    @public
   */


  none(type) {
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


  find(type, ids) {
    let collection = this.collectionForType(type);
    let records = collection.find(ids);

    if (Array.isArray(ids)) {
      assert(records.length === ids.length, `Couldn't find all ${this._container.inflector.pluralize(type)} with ids: (${ids.join(",")}) (found ${records.length} results, but was looking for ${ids.length})`);
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


  findBy(type, query) {
    let collection = this.collectionForType(type);
    let record = collection.findBy(query);
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


  findOrCreateBy(type, attrs) {
    let collection = this.collectionForType(type);
    let record = collection.findBy(attrs);
    let model;

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


  where(type, query) {
    let collection = this.collectionForType(type);
    let records = collection.where(query);
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


  first(type) {
    let collection = this.collectionForType(type);
    let record = collection[0];
    return this._hydrate(record, dasherize(type));
  }
  /**
    @method modelClassFor
    @param modelName
    @public
    @hide
   */


  modelClassFor(modelName) {
    let model = this._registry[camelize(modelName)];

    assert(model, `Model not registered: ${modelName}`);
    return model.class.prototype;
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


  addDependentAssociation(association, modelName) {
    if (association.isPolymorphic) {
      this._dependentAssociations.polymorphic.push(association);
    } else {
      this._dependentAssociations[modelName] = this._dependentAssociations[modelName] || [];

      this._dependentAssociations[modelName].push(association);
    }
  }

  dependentAssociationsFor(modelName) {
    let directDependents = this._dependentAssociations[modelName] || [];
    let polymorphicAssociations = this._dependentAssociations.polymorphic || [];
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


  associationsFor(modelName) {
    let modelClass = this.modelClassFor(modelName);
    return Object.assign({}, modelClass.belongsToAssociations, modelClass.hasManyAssociations);
  }

  hasModelForModelName(modelName) {
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


  collectionForType(type) {
    let collection = this.toCollectionName(type);
    assert(this.db[collection], `You're trying to find model(s) of type ${type} but this collection doesn't exist in the database.`);
    return this.db[collection];
  }

  toCollectionName(type) {
    if (typeof collectionNameCache[type] !== "string") {
      let modelName = dasherize(type);
      const collectionName = camelize(this._container.inflector.pluralize(modelName));
      collectionNameCache[type] = collectionName;
    }

    return collectionNameCache[type];
  } // This is to get at the underlying Db collection. Poorly named... need to
  // refactor to DbTable or something.


  toInternalCollectionName(type) {
    if (typeof internalCollectionNameCache[type] !== "string") {
      const internalCollectionName = `_${this.toCollectionName(type)}`;
      internalCollectionNameCache[type] = internalCollectionName;
    }

    return internalCollectionNameCache[type];
  }

  toModelName(type) {
    if (typeof modelNameCache[type] !== "string") {
      let dasherized = dasherize(type);

      const modelName = this._container.inflector.singularize(dasherized);

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


  _addForeignKeyToRegistry(type, fk) {
    this._registry[type] = this._registry[type] || {
      class: null,
      foreignKeys: []
    };
    let fks = this._registry[type].foreignKeys;

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


  _instantiateModel(modelName, attrs) {
    let ModelClass = this._modelFor(modelName);

    let fks = this._foreignKeysFor(modelName);

    return new ModelClass(this, modelName, attrs, fks);
  }
  /**
    @method _modelFor
    @param modelName
    @private
    @hide
   */


  _modelFor(modelName) {
    return this._registry[camelize(modelName)].class;
  }
  /**
    @method _foreignKeysFor
    @param modelName
    @private
    @hide
   */


  _foreignKeysFor(modelName) {
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


  _hydrate(records, modelName) {
    if (Array.isArray(records)) {
      let models = records.map(function (record) {
        return this._instantiateModel(modelName, record);
      }, this);
      return new Collection(modelName, models);
    } else if (records) {
      return this._instantiateModel(modelName, records);
    } else {
      return null;
    }
  }

}

const classes = {
  Db: Db$1,
  Association,
  RouteHandler,
  BaseRouteHandler,
  Serializer: Serializer$1,
  SerializerRegistry,
  Schema
};
let defaultInflector$1 = {
  singularize: inflected.singularize,
  pluralize: inflected.pluralize
};
/**
  Lightweight DI container for customizable objects that are needed by
  deeply nested classes.

  @class Container
  @hide
 */

class Container {
  constructor() {
    this.inflector = defaultInflector$1;
  }

  register(key, value) {
    this[key] = value;
  }

  create(className, ...args) {
    let Class = classes[className];
    Class.prototype._container = this;
    return new Class(...args);
  }

}
/**
  These are side effects. We give each class a default container so it can be
  easily unit tested.

  We should remove these once we have test coverage and can refactor to a proper
  DI system.
*/


let defaultContainer = new Container();
Db$1.prototype._container = defaultContainer;
Association.prototype._container = defaultContainer;
BaseRouteHandler.prototype._container = defaultContainer;
RouteHandler.prototype._container = defaultContainer;
Serializer$1.prototype._container = defaultContainer;
SerializerRegistry.prototype._container = defaultContainer;
Schema.prototype._container = defaultContainer;
var Container$1 = Container;

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

const defaultPassthroughs = ["http://localhost:0/chromecheckurl", // mobile chrome
"http://localhost:30820/socket.io", // electron
request => {
  return /.+\.hot-update.json$/.test(request.url);
}];
const defaultRouteOptions = {
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
    lastArg = assign__default["default"]({}, defaultRouteOptions, lastArg);
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

class PretenderConfig {
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
    [["get"], ["post"], ["put"], ["delete", "del"], ["patch"], ["head"], ["options"]].forEach(([verb, alias]) => {
      this[verb] = (path, ...args) => {
        var _this$pretender;

        let [rawHandler, customizedCode, options] = extractRouteArguments(args);
        let handler = mirageServer.registerRouteHandler(verb, path, rawHandler, customizedCode, options);

        let fullPath = this._getFullPath(path);

        let timing = options.timing !== undefined ? options.timing : () => this.timing;
        return (_this$pretender = this.pretender) === null || _this$pretender === void 0 ? void 0 : _this$pretender[verb](fullPath, handler, timing);
      };

      mirageServer[verb] = this[verb];

      if (alias) {
        this[alias] = this[verb];
        mirageServer[alias] = this[verb];
      }
    });
  }

  config(config) {
    let useDefaultPassthroughs = typeof config.useDefaultPassthroughs !== "undefined" ? config.useDefaultPassthroughs : true;

    if (useDefaultPassthroughs) {
      this._configureDefaultPassthroughs();
    }

    let didOverridePretenderConfig = config.trackRequests !== undefined && config.trackRequests !== this.trackRequests;
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
    defaultPassthroughs.forEach(passthroughUrl => {
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
      return new Pretender__default["default"](function () {
        this.passthroughRequest = function (verb, path, request) {
          if (mirageServer.shouldLog()) {
            console.log(`Mirage: Passthrough request for ${verb.toUpperCase()} ${request.url}`);
          }
        };

        this.handledRequest = function (verb, path, request) {
          if (mirageServer.shouldLog()) {
            console.groupCollapsed(`Mirage: [${request.status}] ${verb.toUpperCase()} ${request.url}`);
            let {
              requestBody,
              responseText
            } = request;
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
          let shouldPassthrough = mirageServer.passthroughChecks.some(passthroughCheck => passthroughCheck(request));

          if (shouldPassthrough) {
            let url = request.url.includes("?") ? request.url.substr(0, request.url.indexOf("?")) : request.url;
            this[request.method.toLowerCase()](url, this.passthrough);
          }

          return originalCheckPassthrough.apply(this, arguments);
        };

        this.unhandledRequest = function (verb, path) {
          path = decodeURI(path);
          let namespaceError = "";

          if (this.namespace === "") {
            namespaceError = "There is no existing namespace defined. Please define one";
          } else {
            namespaceError = `The existing namespace is ${this.namespace}`;
          }

          assert(`Your app tried to ${verb} '${path}', but there was no route defined to handle this request. Define a route for this endpoint in your routes() config. Did you forget to define a namespace? ${namespaceError}`);
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

      paths.forEach(path => {
        if (typeof path === "function") {
          this.passthroughChecks.push(path);
        } else {
          verbs.forEach(verb => {
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
    let namespace = ""; // if there is a urlPrefix and a namespace

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
        let namespaceSub = this.namespace.substring(0, this.namespace.length - 1);
        namespace = `/${namespaceSub}`;
      }

      if (this.namespace[0] !== "/" && this.namespace[this.namespace.length - 1] !== "/") {
        namespace = `/${this.namespace}`;
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
        fullPath += urlPrefix[urlPrefix.length - 1] === "/" ? urlPrefix : `${urlPrefix}/`;
      } // add the namespace to the path


      fullPath += namespace; // add a trailing slash to the path if it doesn't already contain one

      if (fullPath[fullPath.length - 1] !== "/") {
        fullPath += "/";
      } // finally add the configured path


      fullPath += path; // if we're making a same-origin request, ensure a / is prepended and
      // dedup any double slashes

      if (!/^https?:\/\//.test(fullPath)) {
        fullPath = `/${fullPath}`;
        fullPath = fullPath.replace(/\/+/g, "/");
      }
    }

    return fullPath;
  }

  start() {// unneeded for pretender implementation
  }

  shutdown() {
    this.pretender.shutdown();
  }

}

/* eslint no-console: 0 */
const isPluralForModelCache = {};
const defaultInflector = {
  singularize: inflected.singularize,
  pluralize: inflected.pluralize
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

class Server {
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
    this._container = new Container$1();
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


  get namespace() {
    return this.interceptor.namespace;
  }

  set namespace(value) {
    this.interceptor.namespace = value;
  } // todo deprecate following


  get urlPrefix() {
    return this.interceptor.urlPrefix;
  }

  set urlPrefix(value) {
    this.interceptor.urlPrefix = value;
  } // todo deprecate following


  get timing() {
    return this.interceptor.timing;
  }

  set timing(value) {
    this.interceptor.timing = value;
  } // todo deprecate following


  get passthroughChecks() {
    return this.interceptor.passthroughChecks;
  }

  set passthroughChecks(value) {
    this.interceptor.passthroughChecks = value;
  }

  config(config = {}) {
    var _this$interceptor$sta, _this$interceptor;

    if (!config.interceptor) {
      config.interceptor = new PretenderConfig();
    }

    if (this.interceptor) {
      this.interceptor.config(config);
    } else {
      this.interceptor = config.interceptor;
      this.interceptor.create(this, config);
    }

    let didOverrideConfig = config.environment && this.environment && this.environment !== config.environment;
    assert(!didOverrideConfig, "You cannot modify Mirage's environment once the server is created");
    this.environment = config.environment || this.environment || "development";

    if (config.routes) {
      assert(!config.baseConfig, "The routes option is an alias for the baseConfig option. You can't pass both options into your server definition.");
      config.baseConfig = config.routes;
    }

    if (config.seeds) {
      assert(!config.scenarios, "The seeds option is an alias for the scenarios.default option. You can't pass both options into your server definition.");
      config.scenarios = {
        default: config.seeds
      };
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
      this.db = this._container.create("Db", undefined, config.identityManagers);
    }

    if (this.schema) {
      this.schema.registerModels(config.models);
      this.serializerOrRegistry.registerSerializers(config.serializers || {});
    } else {
      this.schema = this._container.create("Schema", this.db, config.models);
      this.serializerOrRegistry = this._container.create("SerializerRegistry", this.schema, config.serializers);
    }

    let hasFactories = this._hasModulesOfType(config, "factories");

    let hasDefaultScenario = config.scenarios && Object.prototype.hasOwnProperty.call(config.scenarios, "default");

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
    config === null || config === void 0 ? void 0 : config.call(this);
    this.timing = this.isTest() ? 0 : this.timing || 0;
  } // TODO deprecate this in favor of direct call


  passthrough(...paths) {
    var _this$interceptor$pas, _this$interceptor2;

    (_this$interceptor$pas = (_this$interceptor2 = this.interceptor).passthrough) === null || _this$interceptor$pas === void 0 ? void 0 : _this$interceptor$pas.call(_this$interceptor2, ...paths);
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
    let {
      fixtures
    } = this._config;

    if (args.length) {
      let camelizedArgs = args.map(camelize);
      let missingKeys = camelizedArgs.filter(key => !fixtures[key]);

      if (missingKeys.length) {
        throw new Error(`Fixtures not found: ${missingKeys.join(", ")}`);
      }

      fixtures = pick__default["default"](fixtures, ...camelizedArgs);
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
    this._factoryMap = assign__default["default"](currentFactoryMap, factoryMap); // Create a collection for each factory

    Object.keys(factoryMap).forEach(type => {
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
    let traits = traitsAndOverrides.filter(arg => arg && typeof arg === "string");
    let overrides = find__default["default"](traitsAndOverrides, arg => isPlainObject__default["default"](arg));
    let camelizedType = camelize(type); // Store sequence for factory type as instance variable

    this.factorySequences = this.factorySequences || {};
    this.factorySequences[camelizedType] = this.factorySequences[camelizedType] + 1 || 0;
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
    assert(isInteger__default["default"](amount), `second argument has to be an integer, you passed: ${typeof amount}`);
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
    assert(this._modelOrFactoryExistsForType(type), `You called server.create('${type}') but no model or factory was found. Make sure you're passing in the singularized version of the model or factory name.`); // When there is a Model defined, we should return an instance
    // of it instead of returning the bare attributes.

    let traits = options.filter(arg => arg && typeof arg === "string");
    let overrides = find__default["default"](options, arg => isPlainObject__default["default"](arg));
    let collectionFromCreateList = find__default["default"](options, arg => arg && Array.isArray(arg));
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
        collectionName = this.schema ? this.schema.toInternalCollectionName(type) : `_${this.inflector.pluralize(type)}`;
        collection = this.db[collectionName];
      }

      assert(collection, `You called server.create('${type}') but no model or factory was found.`);
      modelOrRecord = collection.insert(attrs);
    }

    let OriginalFactory = this.factoryFor(type);

    if (OriginalFactory) {
      OriginalFactory.extractAfterCreateCallbacks({
        traits
      }).forEach(afterCreate => {
        afterCreate(modelOrRecord, this);
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


  createList(type, amount, ...traitsAndOverrides) {
    assert(this._modelOrFactoryExistsForType(type), `You called server.createList('${type}') but no model or factory was found. Make sure you're passing in the singularized version of the model or factory name.`);
    assert(isInteger__default["default"](amount), `second argument has to be an integer, you passed: ${typeof amount}`);
    let list = [];
    let collectionName = this.schema ? this.schema.toInternalCollectionName(type) : `_${this.inflector.pluralize(type)}`;
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

  resource(resourceName, {
    only,
    except,
    path
  } = {}) {
    resourceName = this.inflector.pluralize(resourceName);
    path = path || `/${resourceName}`;
    only = only || [];
    except = except || [];

    if (only.length > 0 && except.length > 0) {
      throw "cannot use both :only and :except options";
    }

    let actionsMethodsAndsPathsMappings = {
      index: {
        methods: ["get"],
        path: `${path}`
      },
      show: {
        methods: ["get"],
        path: `${path}/:id`
      },
      create: {
        methods: ["post"],
        path: `${path}`
      },
      update: {
        methods: ["put", "patch"],
        path: `${path}/:id`
      },
      delete: {
        methods: ["del"],
        path: `${path}/:id`
      }
    };
    let allActions = Object.keys(actionsMethodsAndsPathsMappings);
    let actions = only.length > 0 && only || except.length > 0 && allActions.filter(action => except.indexOf(action) === -1) || allActions;
    actions.forEach(action => {
      let methodsWithPath = actionsMethodsAndsPathsMappings[action];
      methodsWithPath.methods.forEach(method => {
        return path === resourceName ? this[method](methodsWithPath.path) : this[method](methodsWithPath.path, resourceName);
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

  registerRouteHandler(verb, path, rawHandler, customizedCode, options, middleware = this.middleware) {
    let routeHandler = this._container.create("RouteHandler", {
      schema: this.schema,
      verb,
      rawHandler,
      customizedCode,
      options,
      path,
      serializerOrRegistry: this.serializerOrRegistry,
      middleware
    });

    return request => {
      return routeHandler.handle(request).then(mirageResponse => {
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
      let modelOrFactoryExists = this._modelOrFactoryExistsForTypeOrCollectionName(typeOrCollectionName);

      let isPlural = typeOrCollectionName === this.inflector.pluralize(typeOrCollectionName);
      let isUncountable = this.inflector.singularize(typeOrCollectionName) === this.inflector.pluralize(typeOrCollectionName);
      const isPluralForModel = isPlural && !isUncountable && modelOrFactoryExists;
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
    let dbCollectionExists = this.db[this.schema.toInternalCollectionName(type)];
    return (modelExists || dbCollectionExists) && !this._typeIsPluralForModel(type);
  }
  /**
   *
   * @private
   * @hide
   */


  _modelOrFactoryExistsForTypeOrCollectionName(typeOrCollectionName) {
    let modelExists = this.schema && this.schema.modelFor(camelize(typeOrCollectionName));
    let dbCollectionExists = this.db[this.schema.toInternalCollectionName(typeOrCollectionName)];
    return modelExists || dbCollectionExists;
  }
  /**
   *
   * @private
   * @hide
   */


  _validateTraits(traits, factory, type) {
    traits.forEach(traitName => {
      if (!factory.isTrait(traitName)) {
        throw new Error(`'${traitName}' trait is not registered in '${type}' factory`);
      }
    });
  }
  /**
   *
   * @private
   * @hide
   */


  _mergeExtensions(attrs, traits, overrides) {
    let allExtensions = traits.map(traitName => {
      return attrs[traitName].extension;
    });
    allExtensions.push(overrides || {});
    return allExtensions.reduce((accum, extension) => {
      return assign__default["default"](accum, extension);
    }, {});
  }
  /**
   *
   * @private
   * @hide
   */


  _mapAssociationsFromAttributes(modelName, attributes, overrides = {}) {
    Object.keys(attributes || {}).filter(attr => {
      return isAssociation(attributes[attr]);
    }).forEach(attr => {
      let modelClass = this.schema.modelClassFor(modelName);
      let association = modelClass.associationFor(attr);
      assert(association && association instanceof BelongsTo, `You're using the \`association\` factory helper on the '${attr}' attribute of your ${modelName} factory, but that attribute is not a \`belongsTo\` association.`);
      let isSelfReferentialBelongsTo = association && association instanceof BelongsTo && association.modelName === modelName;
      assert(!isSelfReferentialBelongsTo, `You're using the association() helper on your ${modelName} factory for ${attr}, which is a belongsTo self-referential relationship. You can't do this as it will lead to infinite recursion. You can move the helper inside of a trait and use it selectively.`);
      let isPolymorphic = association && association.opts && association.opts.polymorphic;
      assert(!isPolymorphic, `You're using the association() helper on your ${modelName} factory for ${attr}, which is a polymorphic relationship. This is not currently supported.`);
      let factoryAssociation = attributes[attr];
      let foreignKey = `${camelize(attr)}Id`;

      if (!overrides[attr]) {
        attributes[foreignKey] = this.create(association.modelName, ...factoryAssociation.traitsAndOverrides).id;
      }

      delete attributes[attr];
    });
  }

}

var ActiveModelSerializer = Serializer$1.extend({
  serializeIds: "always",
  normalizeIds: true,

  keyForModel(type) {
    return underscore(type);
  },

  keyForAttribute(attr) {
    attr = Serializer$1.prototype.keyForAttribute.apply(this, arguments);
    return underscore(attr);
  },

  keyForRelationship(type) {
    return this._container.inflector.pluralize(underscore(type));
  },

  keyForEmbeddedRelationship(attributeName) {
    return underscore(attributeName);
  },

  keyForRelationshipIds(type) {
    return `${underscore(this._container.inflector.singularize(type))}_ids`;
  },

  keyForForeignKey(relationshipName) {
    return `${underscore(relationshipName)}_id`;
  },

  keyForPolymorphicForeignKeyId(relationshipName) {
    return `${underscore(relationshipName)}_id`;
  },

  keyForPolymorphicForeignKeyType(relationshipName) {
    return `${underscore(relationshipName)}_type`;
  },

  normalize(payload) {
    let type = Object.keys(payload)[0];
    let attrs = payload[type];
    let modelName = camelize(type);
    let modelClass = this.schema.modelClassFor(modelName);
    let {
      belongsToAssociations,
      hasManyAssociations
    } = modelClass;
    let belongsToKeys = Object.keys(belongsToAssociations);
    let hasManyKeys = Object.keys(hasManyAssociations);

    if (this.primaryKey !== "id") {
      attrs.id = attrs[this.primaryKey];
      delete attrs[this.primaryKey];
    }

    let jsonApiPayload = {
      data: {
        type: this._container.inflector.pluralize(type),
        attributes: {}
      }
    };

    if (attrs.id) {
      jsonApiPayload.data.id = attrs.id;
    }

    let relationships = {};
    Object.keys(attrs).forEach(key => {
      if (key !== "id") {
        if (this.normalizeIds) {
          if (belongsToKeys.includes(key)) {
            let association = belongsToAssociations[key];
            let associationModel = association.modelName;
            relationships[dasherize(key)] = {
              data: {
                type: associationModel,
                id: attrs[key]
              }
            };
          } else if (hasManyKeys.includes(key)) {
            let association = hasManyAssociations[key];
            let associationModel = association.modelName;
            let data = attrs[key].map(id => {
              return {
                type: associationModel,
                id
              };
            });
            relationships[dasherize(key)] = {
              data
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

  getCoalescedIds(request) {
    return request.queryParams && request.queryParams.ids;
  }

});

var restSerializer = ActiveModelSerializer.extend({
  serializeIds: "always",

  keyForModel(type) {
    return camelize(type);
  },

  keyForAttribute(attr) {
    attr = ActiveModelSerializer.prototype.keyForAttribute.apply(this, arguments);
    return camelize(attr);
  },

  keyForRelationship(type) {
    return camelize(this._container.inflector.pluralize(type));
  },

  keyForEmbeddedRelationship(attributeName) {
    return camelize(attributeName);
  },

  keyForRelationshipIds(type) {
    return camelize(this._container.inflector.pluralize(type));
  },

  keyForForeignKey(relationshipName) {
    return camelize(this._container.inflector.singularize(relationshipName));
  },

  getCoalescedIds(request) {
    return request.queryParams && request.queryParams.ids;
  }

});

/**
  UUID generator

  @hide
*/
function uuid () {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = Math.random() * 16 | 0;
    let v = c === "x" ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
}

/**
  @hide
*/

function hasMany(...args) {
  return new HasMany(...args);
}
/**
  @hide
*/


function belongsTo(...args) {
  return new BelongsTo(...args);
}
var index = {
  Factory: Factory$1,
  Response,
  hasMany,
  belongsTo
};

exports.ActiveModelSerializer = ActiveModelSerializer;
exports.Collection = Collection;
exports.Factory = Factory$1;
exports.IdentityManager = IdentityManager$1;
exports.JSONAPISerializer = JsonApiSerializer;
exports.Model = Model$1;
exports.PretenderInterceptor = PretenderConfig;
exports.Response = Response;
exports.RestSerializer = restSerializer;
exports.Serializer = Serializer$1;
exports.Server = Server;
exports._Db = Db$1;
exports._DbCollection = DbCollection$1;
exports._RouteHandler = RouteHandler;
exports._SerializerRegistry = SerializerRegistry;
exports._assert = assert;
exports._ormAssociationsAssociation = Association;
exports._ormAssociationsBelongsTo = BelongsTo;
exports._ormAssociationsHasMany = HasMany;
exports._ormPolymorphicCollection = PolymorphicCollection;
exports._ormSchema = Schema;
exports._routeHandlersBase = BaseRouteHandler;
exports._routeHandlersFunction = FunctionRouteHandler;
exports._routeHandlersObject = ObjectRouteHandler;
exports._routeHandlersShorthandsBase = BaseShorthandRouteHandler;
exports._routeHandlersShorthandsDelete = DeleteShorthandRouteHandler;
exports._routeHandlersShorthandsGet = GetShorthandRouteHandler;
exports._routeHandlersShorthandsHead = HeadShorthandRouteHandler;
exports._routeHandlersShorthandsPost = PostShorthandRouteHandler;
exports._routeHandlersShorthandsPut = PutShorthandRouteHandler;
exports._utilsExtend = extend;
exports._utilsInflectorCamelize = camelize;
exports._utilsInflectorCapitalize = capitalize;
exports._utilsInflectorDasherize = dasherize;
exports._utilsInflectorUnderscore = underscore;
exports._utilsIsAssociation = isAssociation;
exports._utilsReferenceSort = referenceSort;
exports._utilsUuid = uuid;
exports.association = association$1;
exports.belongsTo = belongsTo;
exports.createServer = createServer;
exports["default"] = index;
exports.hasMany = hasMany;
exports.trait = trait$1;
//# sourceMappingURL=mirage-cjs.js.map
