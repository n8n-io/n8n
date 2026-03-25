import assert from "../../assert";
import BaseShorthandRouteHandler from "./base";
import Response from "../../response";
import { camelize } from "../../utils/inflector";

/**
 * @hide
 */
export default class GetShorthandRouteHandler extends BaseShorthandRouteHandler {
  /*
    Retrieve a model/collection from the db.

    Examples:
      this.get('/contacts', 'contact');
      this.get('/contacts/:id', 'contact');
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
        return model;
      }
    } else if (this.options.coalesce) {
      let ids = this.serializerOrRegistry.getCoalescedIds(
        request,
        camelizedModelName
      );
      if (ids) {
        return modelClass.find(ids);
      }
    }
    return modelClass.all();
  }

  /*
    Retrieve an array of collections from the db.

    Ex: this.get('/home', ['contacts', 'pictures']);
  */
  handleArrayShorthand(request, modelClasses) {
    let keys = this.shorthand;
    let id = this._getIdForRequest(request);

    /*
    If the first key is singular and we have an id param in
    the request, we're dealing with the version of the shorthand
    that has a parent model and several has-many relationships.
    We throw an error, because the serializer is the appropriate
    place for this now.
    */
    assert(
      !id || this._container.inflector.singularize(keys[0]) !== keys[0],
      `It looks like you're using the "Single record with
      related records" version of the array shorthand, in addition to opting
      in to the model layer. This shorthand was made when there was no
      serializer layer. Now that you're using models, please ensure your
      relationships are defined, and create a serializer for the parent
      model, adding the relationships there.`
    );

    return modelClasses.map((modelClass) => modelClass.all());
  }
}
