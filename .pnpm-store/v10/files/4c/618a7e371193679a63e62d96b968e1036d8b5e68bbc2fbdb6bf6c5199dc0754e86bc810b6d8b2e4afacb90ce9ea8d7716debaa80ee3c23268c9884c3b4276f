import Serializer from "../serializer";
import { dasherize, camelize } from "../utils/inflector";
import assert from "../assert";
import get from "lodash/get";
import flatten from "lodash/flatten";
import compact from "lodash/compact";
import uniqBy from "lodash/uniqBy";
import isEmpty from "lodash/isEmpty";
/**
  The JSONAPISerializer. Subclass of Serializer.

  @class JSONAPISerializer
  @constructor
  @public
 */
class JSONAPISerializer extends Serializer {
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
  }

  // Don't think this is used?
  keyForModel(modelName) {
    return dasherize(modelName);
  }

  // Don't think this is used?
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
    let hashWithRoot = { data: resourceHash };
    let addToIncludes = this.getAddToIncludesForResource(resource);

    return [hashWithRoot, addToIncludes];
  }

  getHashForIncludedResource(resource) {
    let serializer = this.serializerFor(resource.modelName);
    let hash = serializer.getHashForResource(resource);
    let hashWithRoot = { included: this.isModel(resource) ? [hash] : hash };
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
      hash = resource.models.map((m) => this.getResourceObjectForModel(m));
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

    return this.getAddToIncludesForResourceAndPaths(
      resource,
      relationshipPaths
    );
  }

  getAddToIncludesForResourceAndPaths(resource, relationshipPaths) {
    let includes = [];

    relationshipPaths.forEach((path) => {
      let relationshipNames = path.split(".");

      let newIncludes = this.getIncludesForResourceAndPath(
        resource,
        ...relationshipNames
      );
      includes.push(newIncludes);
    });

    return uniqBy(compact(flatten(includes)), (m) => m.toString());
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
      resource.models.forEach((model) => {
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
      modelsToAdd.forEach((model) => {
        includes = includes.concat(
          this.getIncludesForResourceAndPath(model, ...names)
        );
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
      attributes: attrs,
    };

    return this._maybeAddRelationshipsToResourceObjectForModel(hash, model);
  }

  _maybeAddRelationshipsToResourceObjectForModel(hash, model) {
    const relationships = {};

    model.associationKeys.forEach((key) => {
      let relationship = model[key];
      let relationshipKey = this.keyForRelationship(key);
      let relationshipHash = {};

      if (this.hasLinksForRelationship(model, key)) {
        let serializer = this.serializerFor(model.modelName);
        let links = serializer.links(model);
        relationshipHash.links = links[key];
      }

      if (
        this.alwaysIncludeLinkageData ||
        this.shouldIncludeLinkageData(key, model) ||
        this._relationshipIsIncludedForModel(key, model)
      ) {
        let data = null;
        if (this.isModel(relationship)) {
          data = {
            type: this.typeKeyForModel(relationship),
            id: relationship.id,
          };
        } else if (this.isCollection(relationship)) {
          data = relationship.models.map((model) => {
            return {
              type: this.typeKeyForModel(model),
              id: model.id,
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
      let graphKey = this._graphKeyForModel(model);

      // Find the resource in the graph
      let graphResource;

      // Check primary data
      if (graph.data[graphKey]) {
        graphResource = graph.data[graphKey];

        // Check includes
      } else if (
        graph.included[this._container.inflector.pluralize(model.modelName)]
      ) {
        graphResource =
          graph.included[this._container.inflector.pluralize(model.modelName)][
            graphKey
          ];
      }

      // If the model's in the graph, check if relationshipKey should be included
      return (
        graphResource &&
        graphResource.relationships &&
        Object.prototype.hasOwnProperty.call(
          graphResource.relationships,
          dasherize(relationshipKey)
        )
      );
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
      data: {},
    };

    if (this.isModel(primaryResource)) {
      let primaryResourceKey = this._graphKeyForModel(primaryResource);
      graph.data[primaryResourceKey] = {};

      this._addPrimaryModelToRequestedIncludesGraph(graph, primaryResource);
    } else if (this.isCollection(primaryResource)) {
      primaryResource.models.forEach((model) => {
        let primaryResourceKey = this._graphKeyForModel(model);
        graph.data[primaryResourceKey] = {};

        this._addPrimaryModelToRequestedIncludesGraph(graph, model);
      });
    }

    // Hack :/ Need to think of a better palce to put this if
    // refactoring json:api serializer.
    this.request._includesGraph = graph;
  }

  _addPrimaryModelToRequestedIncludesGraph(graph, model) {
    if (this.hasQueryParamIncludes()) {
      let graphKey = this._graphKeyForModel(model);

      this.getQueryParamIncludes()
        .filter((item) => !!item.trim())
        .forEach((includesPath) => {
          // includesPath is post.comments, for example
          graph.data[graphKey].relationships =
            graph.data[graphKey].relationships || {};

          let relationshipKeys = includesPath.split(".").map(dasherize);
          let relationshipKey = relationshipKeys[0];
          let graphRelationshipKey = relationshipKey;
          let normalizedRelationshipKey = camelize(relationshipKey);
          let hasAssociation = model.associationKeys.has(
            normalizedRelationshipKey
          );

          assert(
            hasAssociation,
            `You tried to include "${relationshipKey}" with ${model} but no association named "${normalizedRelationshipKey}" is defined on the model.`
          );

          let relationship = model[normalizedRelationshipKey];
          let relationshipData;

          if (this.isModel(relationship)) {
            relationshipData = this._graphKeyForModel(relationship);
          } else if (this.isCollection(relationship)) {
            relationshipData = relationship.models.map(this._graphKeyForModel);
          } else {
            relationshipData = null;
          }

          graph.data[graphKey].relationships[graphRelationshipKey] =
            relationshipData;

          if (relationship) {
            this._addResourceToRequestedIncludesGraph(
              graph,
              relationship,
              relationshipKeys.slice(1)
            );
          }
        });
    }
  }

  _addResourceToRequestedIncludesGraph(graph, resource, relationshipNames) {
    graph.included = graph.included || {};

    let models = this.isCollection(resource) ? resource.models : [resource];

    models.forEach((model) => {
      let collectionName = this._container.inflector.pluralize(model.modelName);
      graph.included[collectionName] = graph.included[collectionName] || {};

      this._addModelToRequestedIncludesGraph(graph, model, relationshipNames);
    });
  }

  _addModelToRequestedIncludesGraph(graph, model, relationshipNames) {
    let collectionName = this._container.inflector.pluralize(model.modelName);
    let resourceKey = this._graphKeyForModel(model);
    graph.included[collectionName][resourceKey] =
      graph.included[collectionName][resourceKey] || {};

    if (relationshipNames.length) {
      this._addResourceRelationshipsToRequestedIncludesGraph(
        graph,
        collectionName,
        resourceKey,
        model,
        relationshipNames
      );
    }
  }

  /*
    Lot of the same logic here from _addPrimaryModelToRequestedIncludesGraph, could refactor & share
  */
  _addResourceRelationshipsToRequestedIncludesGraph(
    graph,
    collectionName,
    resourceKey,
    model,
    relationshipNames
  ) {
    graph.included[collectionName][resourceKey].relationships =
      graph.included[collectionName][resourceKey].relationships || {};

    let relationshipName = relationshipNames[0];
    let relationship = model[camelize(relationshipName)];
    let relationshipData;

    if (this.isModel(relationship)) {
      relationshipData = this._graphKeyForModel(relationship);
    } else if (this.isCollection(relationship)) {
      relationshipData = relationship.models.map(this._graphKeyForModel);
    }
    graph.included[collectionName][resourceKey].relationships[
      relationshipName
    ] = relationshipData;

    if (relationship) {
      this._addResourceToRequestedIncludesGraph(
        graph,
        relationship,
        relationshipNames.slice(1)
      );
    }
  }

  _graphKeyForModel(model) {
    return `${model.modelName}:${model.id}`;
  }

  getQueryParamIncludes() {
    let includes = get(this, "request.queryParams.include");

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

export default JSONAPISerializer;
