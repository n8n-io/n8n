import invokeMap from "lodash/invokeMap";
import isEqual from "lodash/isEqual";

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
export default class PolymorphicCollection {
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
    invokeMap(this.models, "update", ...args);

    return this;
  }

  /**
   * Destroys the db record for all models in the collection.
   * @method destroy
   * @return this
   * @public
   */
  destroy() {
    invokeMap(this.models, "destroy");

    return this;
  }

  /**
   * Saves all models in the collection.
   * @method save
   * @return this
   * @public
   */
  save() {
    invokeMap(this.models, "save");

    return this;
  }

  /**
   * Reloads each model in the collection.
   * @method reload
   * @return this
   * @public
   */
  reload() {
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
    let match = this.models.find((m) => isEqual(m.attrs, model.attrs));
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
    return this.models.some((m) => isEqual(m.attrs, model.attrs));
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
    return `collection:${this.modelName}(${this.models
      .map((m) => m.id)
      .join(",")})`;
  }
}
