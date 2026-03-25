import assert from "../../assert";
import BaseShorthandRouteHandler from "./base";
import { camelize } from "../../utils/inflector";

/**
 * @hide
 */
export default class PostShorthandRouteHandler extends BaseShorthandRouteHandler {
  /*
    Push a new model of type *camelizedModelName* to the db.

    For example, this will push a 'user':
      this.post('/contacts', 'user');
  */

  handleStringShorthand(request, modelClass) {
    let modelName = this.shorthand;
    let camelizedModelName = camelize(modelName);
    assert(
      modelClass,
      `The route handler for ${request.url} is trying to access the ${camelizedModelName} model, but that model doesn't exist.`
    );

    let attrs = this._getAttrsForRequest(
      request,
      modelClass.camelizedModelName
    );
    return modelClass.create(attrs);
  }
}
