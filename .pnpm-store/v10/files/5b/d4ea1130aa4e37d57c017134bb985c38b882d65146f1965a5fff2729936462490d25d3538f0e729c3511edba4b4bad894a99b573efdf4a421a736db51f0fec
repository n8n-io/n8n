import { camelize, dasherize } from "../utils/inflector";
import Association from "./associations/association";
import Collection from "./collection";
import assert from "../assert";
import forIn from "lodash/forIn";

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
export default class Schema {
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
    this._dependentAssociations = { polymorphic: [] };
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
    forIn(hash, (model, key) => {
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
    let modelName = dasherize(camelizedModelName);

    // Avoid mutating original class, because we may want to reuse it across many tests
    ModelClass = ModelClass.extend();

    // Store model & fks in registry
    // TODO: don't think this is needed anymore
    this._registry[camelizedModelName] = this._registry[camelizedModelName] || {
      class: null,
      foreignKeys: [],
    }; // we may have created this key before, if another model added fks to it
    this._registry[camelizedModelName].class = ModelClass;

    // TODO: set here, remove from model#constructor
    ModelClass.prototype._schema = this;
    ModelClass.prototype.modelName = modelName;
    // Set up associations
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
        association.modelName =
          association.modelName || this.toModelName(associationProperty);
        association.ownerModelName = modelName;
        association.setSchema(this);

        // Update the registry with this association's foreign keys. This is
        // essentially our "db migration", since we must know about the fks.
        let [fkHolder, fk] = association.getForeignKeyArray();

        fksAddedFromThisModel[fkHolder] = fksAddedFromThisModel[fkHolder] || [];
        assert(
          !fksAddedFromThisModel[fkHolder].includes(fk),
          `Your '${type}' model definition has multiple possible inverse relationships of type '${fkHolder}'. Please use explicit inverses.`
        );
        fksAddedFromThisModel[fkHolder].push(fk);

        this._addForeignKeyToRegistry(fkHolder, fk);

        // Augment the Model's class with any methods added by this association
        association.addMethodsToModelClass(ModelClass, associationProperty);
      }
    }

    // Create a db collection for this model, if doesn't exist
    let collection = this.toCollectionName(modelName);
    if (!this.db[collection]) {
      this.db.createCollection(collection);
    }

    // Create the entity methods
    this[collection] = {
      camelizedModelName,
      new: (attrs) => this.new(camelizedModelName, attrs),
      create: (attrs) => this.create(camelizedModelName, attrs),
      all: (attrs) => this.all(camelizedModelName, attrs),
      find: (attrs) => this.find(camelizedModelName, attrs),
      findBy: (attrs) => this.findBy(camelizedModelName, attrs),
      findOrCreateBy: (attrs) => this.findOrCreateBy(camelizedModelName, attrs),
      where: (attrs) => this.where(camelizedModelName, attrs),
      none: (attrs) => this.none(camelizedModelName, attrs),
      first: (attrs) => this.first(camelizedModelName, attrs),
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
      assert(
        records.length === ids.length,
        `Couldn't find all ${this._container.inflector.pluralize(
          type
        )} with ids: (${ids.join(",")}) (found ${
          records.length
        } results, but was looking for ${ids.length})`
      );
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
      this._dependentAssociations[modelName] =
        this._dependentAssociations[modelName] || [];
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

    return Object.assign(
      {},
      modelClass.belongsToAssociations,
      modelClass.hasManyAssociations
    );
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
    assert(
      this.db[collection],
      `You're trying to find model(s) of type ${type} but this collection doesn't exist in the database.`
    );

    return this.db[collection];
  }

  toCollectionName(type) {
    if (typeof collectionNameCache[type] !== "string") {
      let modelName = dasherize(type);

      const collectionName = camelize(
        this._container.inflector.pluralize(modelName)
      );

      collectionNameCache[type] = collectionName;
    }

    return collectionNameCache[type];
  }

  // This is to get at the underlying Db collection. Poorly named... need to
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
      foreignKeys: [],
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
