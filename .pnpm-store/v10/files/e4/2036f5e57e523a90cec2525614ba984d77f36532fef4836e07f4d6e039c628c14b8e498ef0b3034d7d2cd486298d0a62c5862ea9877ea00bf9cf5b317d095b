import ActiveModelSerializer from "./active-model-serializer";
import { camelize } from "../utils/inflector";

export default ActiveModelSerializer.extend({
  serializeIds: "always",

  keyForModel(type) {
    return camelize(type);
  },

  keyForAttribute(attr) {
    attr = ActiveModelSerializer.prototype.keyForAttribute.apply(
      this,
      arguments
    );
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
  },
});
