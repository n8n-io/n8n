import assert from "../../assert";
import BaseShorthandRouteHandler from "./base";
import { camelize } from "../../utils/inflector";
import Response from "../../response";

/**
 * @hide
 */
export default class DeleteShorthandRouteHandler extends BaseShorthandRouteHandler {
  /*
    Remove the model from the db of type *camelizedModelName*.

    This would remove the user with id :id:
      Ex: this.del('/contacts/:id', 'user');
  */
  handleStringShorthand(request, modelClass) {
    let modelName = this.shorthand;
    let camelizedModelName = camelize(modelName);
    assert(
      modelClass,
      `The route handler for ${request.url} is trying to access the ${camelizedModelName} model, but that model doesn't exist.`
    );

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
    let childTypes = modelClasses
      .slice(1)
      .map((modelClass) =>
        this._container.inflector.pluralize(modelClass.camelizedModelName)
      );

    // Delete related children
    childTypes.forEach((type) => parent[type].destroy());
    parent.destroy();
  }
}
