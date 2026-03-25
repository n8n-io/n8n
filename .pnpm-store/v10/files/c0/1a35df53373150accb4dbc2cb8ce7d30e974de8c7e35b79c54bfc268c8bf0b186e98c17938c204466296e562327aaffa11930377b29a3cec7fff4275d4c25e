import Association from "./association";
import Collection from "../collection";
import PolymorphicCollection from "../polymorphic-collection";
import compact from "lodash/compact";
import { capitalize, camelize } from "../../utils/inflector";
import assert from "@lib/assert";

const identifierCache = {};

/**
 * @class HasMany
 * @extends Association
 * @constructor
 * @public
 * @hide
 */
export default class HasMany extends Association {
  get identifier() {
    if (typeof identifierCache[this.name] !== "string") {
      const identifier = `${camelize(
        this._container.inflector.singularize(this.name)
      )}Ids`;

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
      const foreignKey = `${this._container.inflector.singularize(
        camelize(this.name)
      )}Ids`;

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
    let associationHash = { [key]: this };

    modelPrototype.hasManyAssociations = Object.assign(
      modelPrototype.hasManyAssociations,
      associationHash
    );

    // update hasManyAssociationFks
    Object.keys(modelPrototype.hasManyAssociations).forEach((key) => {
      const value = modelPrototype.hasManyAssociations[key];
      modelPrototype.hasManyAssociationFks[value.getForeignKey()] = value;
    });

    // Add to target's dependent associations array
    this.schema.addDependentAssociation(this, this.modelName);

    // TODO: look how this is used. Are these necessary, seems like they could be gotten from the above?
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
            ids = tempChildren.models.map((model) => ({
              type: model.modelName,
              id: model.id,
            }));
          } else {
            ids = tempChildren.models.map((model) => model.id);
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
          assert(
            Array.isArray(ids),
            `You must pass an array in when setting ${foreignKey} on ${this}`
          );

          if (association.isPolymorphic) {
            assert(
              ids.every((el) => {
                return (
                  typeof el === "object" &&
                  typeof el.type !== undefined &&
                  typeof el.id !== undefined
                );
              }),
              `You must pass in an array of polymorphic identifiers (objects of shape { type, id }) when setting ${foreignKey} on ${this}`
            );

            let models = ids.map(({ type, id }) => {
              return association.schema[
                association.schema.toCollectionName(type)
              ].find(id);
            });
            tempChildren = new PolymorphicCollection(models);
          } else {
            tempChildren =
              association.schema[
                association.schema.toCollectionName(association.modelName)
              ].find(ids);
          }
        }

        this[key] = tempChildren;
      },
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
              let models = polymorphicIds.map(({ type, id }) => {
                return association.schema[
                  association.schema.toCollectionName(type)
                ].find(id);
              });

              collection = new PolymorphicCollection(models);
            } else {
              collection = new PolymorphicCollection(association.modelName);
            }
          } else {
            if (this[foreignKey]) {
              collection = association.schema[
                association.schema.toCollectionName(association.modelName)
              ].find(this[foreignKey]);
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
        if (
          models instanceof Collection ||
          models instanceof PolymorphicCollection
        ) {
          models = models.models;
        }

        models = models ? compact(models) : [];
        this._tempAssociations = this._tempAssociations || {};

        let collection;
        if (association.isPolymorphic) {
          collection = new PolymorphicCollection(models);
        } else {
          collection = new Collection(association.modelName, models);
        }
        this._tempAssociations[key] = collection;

        models.forEach((model) => {
          if (model.hasInverseFor(association)) {
            let inverse = model.inverseFor(association);

            model.associate(this, inverse);
          }
        });
      },
    });

    /*
      object.newChild
        - creates a new unsaved associated child
    */
    modelPrototype[
      `new${capitalize(
        camelize(this._container.inflector.singularize(association.name))
      )}`
    ] = function (...args) {
      let modelName, attrs;
      if (association.isPolymorphic) {
        modelName = args[0];
        attrs = args[1];
      } else {
        modelName = association.modelName;
        attrs = args[0];
      }

      let child =
        association.schema[association.schema.toCollectionName(modelName)].new(
          attrs
        );
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
    modelPrototype[
      `create${capitalize(
        camelize(this._container.inflector.singularize(association.name))
      )}`
    ] = function (...args) {
      let modelName, attrs;
      if (association.isPolymorphic) {
        modelName = args[0];
        attrs = args[1];
      } else {
        modelName = association.modelName;
        attrs = args[0];
      }

      let child =
        association.schema[
          association.schema.toCollectionName(modelName)
        ].create(attrs);
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
      fk = { type: model.modelName, id: model.id };
    } else {
      fk = model.id;
    }

    let dependents = this.schema[this.schema.toCollectionName(owner)].where(
      (potentialOwner) => {
        let currentIds = potentialOwner[this.getForeignKey()];

        // Need this check because currentIds could be null
        return (
          currentIds &&
          currentIds.find((id) => {
            if (typeof id === "object") {
              return id.type === fk.type && id.id === fk.id;
            } else {
              return id === fk;
            }
          })
        );
      }
    );

    dependents.models.forEach((dependent) => {
      dependent.disassociate(model, this);
      dependent.save();
    });
  }
}
