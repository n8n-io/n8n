import Association from "./association";
import { capitalize, camelize } from "../../utils/inflector";
import assert from "../../assert";

const identifierCache = {};

/**
 * The belongsTo association adds a fk to the owner of the association
 *
 * @class BelongsTo
 * @extends Association
 * @constructor
 * @public
 * @hide
 */
export default class BelongsTo extends Association {
  get identifier() {
    if (typeof identifierCache[this.name] !== "string") {
      const identifier = `${camelize(this.name)}Id`;

      identifierCache[this.name] = identifier;
    }

    return identifierCache[this.name];
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
    if (typeof identifierCache[this.name] !== "string") {
      const foreignKey = `${camelize(this.name)}Id`;

      identifierCache[this.name] = foreignKey;
    }

    return identifierCache[this.name];
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
    let associationHash = { [key]: this };

    modelPrototype.belongsToAssociations = Object.assign(
      modelPrototype.belongsToAssociations,
      associationHash
    );

    // update belongsToAssociationFks
    Object.keys(modelPrototype.belongsToAssociations).forEach((key) => {
      const value = modelPrototype.belongsToAssociations[key];
      modelPrototype.belongsToAssociationFks[value.getForeignKey()] = value;
    });

    // Add to target's dependent associations array
    this.schema.addDependentAssociation(this, this.modelName);

    // TODO: look how this is used. Are these necessary, seems like they could be gotten from the above?
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
              id = { id: tempParent.id, type: tempParent.modelName };
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
            assert(
              typeof id === "object",
              `You're setting an ID on the polymorphic association '${association.name}' but you didn't pass in an object. Polymorphic IDs need to be in the form { type, id }.`
            );
            tempParent = association.schema[
              association.schema.toCollectionName(id.type)
            ].find(id.id);
          } else {
            tempParent =
              association.schema[
                association.schema.toCollectionName(association.modelName)
              ].find(id);
            assert(
              tempParent,
              `Couldn't find ${association.modelName} with id = ${id}`
            );
          }
        }

        this[key] = tempParent;
      },
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
            model = association.schema[
              association.schema.toCollectionName(foreignKeyId.type)
            ].find(foreignKeyId.id);
          } else {
            model =
              association.schema[
                association.schema.toCollectionName(association.modelName)
              ].find(foreignKeyId);
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
      },
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

      let parent =
        association.schema[association.schema.toCollectionName(modelName)].new(
          attrs
        );

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

      let parent =
        association.schema[
          association.schema.toCollectionName(modelName)
        ].create(attrs);

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
      fk = { type: model.modelName, id: model.id };
    } else {
      fk = model.id;
    }

    let dependents = this.schema[this.schema.toCollectionName(owner)].where(
      (potentialOwner) => {
        let id = potentialOwner[this.getForeignKey()];

        if (!id) {
          return false;
        }

        if (typeof id === "object") {
          return id.type === fk.type && id.id === fk.id;
        } else {
          return id === fk;
        }
      }
    );

    dependents.models.forEach((dependent) => {
      dependent.disassociate(model, this);
      dependent.save();
    });
  }
}
