import Model from "./orm/model";
import Collection from "./orm/collection";
import PolymorphicCollection from "./orm/polymorphic-collection";
import Serializer from "./serializer";
import JsonApiSerializer from "./serializers/json-api-serializer";
import { camelize } from "./utils/inflector";
import assert from "./assert";

/**
 * @hide
 */
export default class SerializerRegistry {
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
          json[this._container.inflector.pluralize(collection.modelName)] =
            serializer.serialize(collection, request);
        } else {
          json = Object.assign(json, serializer.serialize(collection, request));
        }

        return json;
      }, {});
    } else {
      return response;
    }
  }

  serializerFor(type, { explicit = false } = {}) {
    let SerializerForResponse =
      type && this._serializerMap && this._serializerMap[camelize(type)];

    if (explicit) {
      assert(
        !!SerializerForResponse,
        `You passed in ${type} as an explicit serializer type but that serializer doesn't exist.`
      );
    } else {
      SerializerForResponse =
        SerializerForResponse || this._serializerMap.application || Serializer;

      assert(
        !SerializerForResponse ||
          SerializerForResponse.prototype.embed ||
          SerializerForResponse.prototype.root ||
          new SerializerForResponse() instanceof JsonApiSerializer,
        "You cannot have a serializer that sideloads (embed: false) and disables the root (root: false)."
      );
    }

    return new SerializerForResponse(this, type, this.request);
  }

  _isModel(object) {
    return object instanceof Model;
  }

  _isCollection(object) {
    return (
      object instanceof Collection || object instanceof PolymorphicCollection
    );
  }

  _isModelOrCollection(object) {
    return this._isModel(object) || this._isCollection(object);
  }

  registerSerializers(newSerializerMaps) {
    let currentSerializerMap = this._serializerMap || {};
    this._serializerMap = Object.assign(
      currentSerializerMap,
      newSerializerMaps
    );
  }

  getCoalescedIds(request, modelName) {
    return this.serializerFor(modelName).getCoalescedIds(request);
  }
}
