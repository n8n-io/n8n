import assert from "../../assert";
import BaseShorthandRouteHandler from "./base";
import { camelize } from "../../utils/inflector";
import Response from "../../response";

/**
 * @hide
 */
export default class PutShorthandRouteHandler extends BaseShorthandRouteHandler {
  /*
    Update an object from the db, specifying the type.

      this.put('/contacts/:id', 'user');
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

    let attrs = this._getAttrsForRequest(
      request,
      modelClass.camelizedModelName
    );

    return model.update(attrs);
  }
}
