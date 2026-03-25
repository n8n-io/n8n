import Serializer from "../serializer";
import { underscore, dasherize, camelize } from "../utils/inflector";

export default Serializer.extend({
  serializeIds: "always",
  normalizeIds: true,

  keyForModel(type) {
    return underscore(type);
  },

  keyForAttribute(attr) {
    attr = Serializer.prototype.keyForAttribute.apply(this, arguments);
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
    let { belongsToAssociations, hasManyAssociations } = modelClass;
    let belongsToKeys = Object.keys(belongsToAssociations);
    let hasManyKeys = Object.keys(hasManyAssociations);

    if (this.primaryKey !== "id") {
      attrs.id = attrs[this.primaryKey];
      delete attrs[this.primaryKey];
    }

    let jsonApiPayload = {
      data: {
        type: this._container.inflector.pluralize(type),
        attributes: {},
      },
    };
    if (attrs.id) {
      jsonApiPayload.data.id = attrs.id;
    }

    let relationships = {};

    Object.keys(attrs).forEach((key) => {
      if (key !== "id") {
        if (this.normalizeIds) {
          if (belongsToKeys.includes(key)) {
            let association = belongsToAssociations[key];
            let associationModel = association.modelName;
            relationships[dasherize(key)] = {
              data: {
                type: associationModel,
                id: attrs[key],
              },
            };
          } else if (hasManyKeys.includes(key)) {
            let association = hasManyAssociations[key];
            let associationModel = association.modelName;
            let data = attrs[key].map((id) => {
              return {
                type: associationModel,
                id,
              };
            });
            relationships[dasherize(key)] = { data };
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
  },
});
