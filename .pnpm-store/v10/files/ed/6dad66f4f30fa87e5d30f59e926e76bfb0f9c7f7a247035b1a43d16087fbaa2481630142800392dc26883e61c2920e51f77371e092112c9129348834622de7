import assert from "../../assert";
import BaseShorthandRouteHandler from "./base";
import Response from "../../response";
import { camelize } from "../../utils/inflector";

/**
 * @hide
 */
export default class HeadShorthandRouteHandler extends BaseShorthandRouteHandler {
  /*
    Retrieve a model/collection from the db.

    Examples:
      this.head('/contacts', 'contact');
      this.head('/contacts/:id', 'contact');
  */
  handleStringShorthand(request, modelClass) {
    let modelName = this.shorthand;
    let camelizedModelName = camelize(modelName);

    assert(
      modelClass,
      `The route handler for ${request.url} is trying to access the ${camelizedModelName} model, but that model doesn't exist.`
    );

    let id = this._getIdForRequest(request);
    if (id) {
      let model = modelClass.find(id);
      if (!model) {
        return new Response(404);
      } else {
        return new Response(204);
      }
    } else if (
      this.options.coalesce &&
      request.queryParams &&
      request.queryParams.ids
    ) {
      let model = modelClass.find(request.queryParams.ids);

      if (!model) {
        return new Response(404);
      } else {
        return new Response(204);
      }
    } else {
      return new Response(204);
    }
  }
}
