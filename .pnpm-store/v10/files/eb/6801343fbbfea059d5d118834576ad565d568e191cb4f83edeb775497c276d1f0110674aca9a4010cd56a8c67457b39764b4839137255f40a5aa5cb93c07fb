import Model from "./orm/model";
import Collection from "./orm/collection";
import PolymorphicCollection from "./orm/polymorphic-collection";
import extend from "./utils/extend";
import { camelize } from "./utils/inflector";
import assert from "./assert";
import isFunction from "lodash/isFunction";
import isEmpty from "lodash/isEmpty";
import get from "lodash/get";
import flatten from "lodash/flatten";
import compact from "lodash/compact";
import uniqBy from "lodash/uniqBy";

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
    this._embedFn = isFunction(this.embed) ? this.embed : () => !!this.embed;

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
  serialize(primaryResource /* , request */) {
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
    if (!primaryResource && isEmpty(toInclude)) {
      return json;
    } else if (primaryResource) {
      let [resourceHash, newIncludes] =
        this.getHashForPrimaryResource(primaryResource);
      let newDidSerialize = this.isCollection(primaryResource)
        ? primaryResource.models
        : [primaryResource];

      return this.buildPayload(
        undefined,
        newIncludes,
        newDidSerialize,
        resourceHash
      );
    } else {
      let nextIncludedResource = toInclude.shift();
      let [resourceHash, newIncludes] =
        this.getHashForIncludedResource(nextIncludedResource);

      let newToInclude = newIncludes
        .filter((resource) => {
          return !didSerialize
            .map((m) => m.toString())
            .includes(resource.toString());
        })
        .concat(toInclude);
      let newDidSerialize = (
        this.isCollection(nextIncludedResource)
          ? nextIncludedResource.models
          : [nextIncludedResource]
      ).concat(didSerialize);
      let newJson = this.mergePayloads(json, resourceHash);

      return this.buildPayload(
        undefined,
        newToInclude,
        newDidSerialize,
        newJson
      );
    }
  }

  getHashForPrimaryResource(resource) {
    let [hash, addToIncludes] = this.getHashForResource(resource);
    let hashWithRoot;

    if (this.root) {
      assert(
        !(resource instanceof PolymorphicCollection),
        `The base Serializer class cannot serialize a top-level PolymorphicCollection when root is true, since PolymorphicCollections have no type.`
      );

      let serializer = this.serializerFor(resource.modelName);
      let rootKey = serializer.keyForResource(resource);
      hashWithRoot = { [rootKey]: hash };
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
      let [hash, newModels] = serializer.getHashForResource(resource);

      // Included resources always have a root, and are always pushed to an array.
      let rootKey = serializer.keyForRelationship(resource.modelName);
      hashWithRoot = Array.isArray(hash)
        ? { [rootKey]: hash }
        : { [rootKey]: [hash] };
      addToIncludes = newModels;
    }

    return [hashWithRoot, addToIncludes];
  }

  getHashForResource(
    resource,
    removeForeignKeys = false,
    didSerialize = {},
    lookupSerializer = false
  ) {
    let serializer = this;
    let hash;

    // PolymorphicCollection lacks a modelName, but is dealt with in the map
    // by looking up the serializer on a per-model basis
    if (lookupSerializer && resource.modelName) {
      serializer = this.serializerFor(resource.modelName);
    }

    if (this.isModel(resource)) {
      hash = serializer._hashForModel(
        resource,
        removeForeignKeys,
        didSerialize
      );
    } else {
      hash = resource.models.map((m) => {
        let modelSerializer = serializer;

        if (!modelSerializer) {
          // Can't get here if lookupSerializer is false, so look it up
          modelSerializer = this.serializerFor(m.modelName);
        }

        return modelSerializer._hashForModel(
          m,
          removeForeignKeys,
          didSerialize
        );
      });
    }

    let addToIncludes = uniqBy(
      compact(
        flatten(
          serializer.getKeysForIncluded().map((key) => {
            if (this.isCollection(resource)) {
              return resource.models.map((m) => m[key]);
            } else {
              return resource[key];
            }
          })
        )
      ),
      (m) => m.toString()
    );

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
      newJson[resourceHashKey] = json[resourceHashKey].concat(
        resourceHash[resourceHashKey]
      );
    } else {
      newJson = Object.assign(json, resourceHash);
    }

    return newJson;
  }

  keyForResource(resource) {
    let { modelName } = resource;
    return this.isModel(resource)
      ? this.keyForModel(modelName)
      : this.keyForCollection(modelName);
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
      model.fks.forEach((fk) => {
        delete attrs[fk];
      });
    }

    if (this.embed) {
      let newDidSerialize = Object.assign({}, didSerialize);
      newDidSerialize[model.modelName] = newDidSerialize[model.modelName] || {};
      newDidSerialize[model.modelName][model.id] = true;

      this.getKeysForEmbedded().forEach((key) => {
        let associatedResource = model[key];
        if (
          associatedResource &&
          !get(
            newDidSerialize,
            `${associatedResource.modelName}.${associatedResource.id}`
          )
        ) {
          let [associatedResourceHash] = this.getHashForResource(
            associatedResource,
            true,
            newDidSerialize,
            true
          );
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
    }

    // Remove fks
    model.fks.forEach((key) => delete attrs[key]);

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
      [...model.associationKeys]
        .filter((key) => !this._embedFn(key))
        .forEach((key) => {
          let resource = model[key];
          let association = model.associationFor(key);

          if (this.isCollection(resource)) {
            let formattedKey = this.keyForRelationshipIds(key);
            newHash[formattedKey] =
              model[`${this._container.inflector.singularize(key)}Ids`];
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
      this.getKeysForIncluded().forEach((key) => {
        let resource = model[key];
        let association = model.associationFor(key);

        if (this.isCollection(resource)) {
          let formattedKey = this.keyForRelationshipIds(key);

          newHash[formattedKey] =
            model[`${this._container.inflector.singularize(key)}Ids`];
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
    return `${this._container.inflector.singularize(
      camelize(relationshipName)
    )}Ids`;
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
    return object instanceof Model;
  }

  /**
    @method isCollection
    @param object
    @return {Boolean}
    @public
    @hide
   */
  isCollection(object) {
    return (
      object instanceof Collection || object instanceof PolymorphicCollection
    );
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
    return isFunction(this.include)
      ? this.include(this.request, this.primaryResource)
      : this.include;
  }

  getKeysForEmbedded() {
    return this.getAssociationKeys().filter((k) => this._embedFn(k));
  }

  getKeysForIncluded() {
    return this.getAssociationKeys().filter((k) => !this._embedFn(k));
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

  getCoalescedIds(/* request */) {}
}

// Defaults
Serializer.prototype.include = [];
Serializer.prototype.root = true;
Serializer.prototype.embed = false;
Serializer.prototype.primaryKey = "id";
Serializer.prototype.serializeIds = "included"; // can be 'included', 'always', or 'never'

Serializer.extend = extend;

export default Serializer;
