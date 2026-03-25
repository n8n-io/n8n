import { singularize, pluralize } from "inflected";
import Db from "./db";
import Association from "./orm/associations/association";
import RouteHandler from "./route-handler";
import BaseRouteHandler from "./route-handlers/base";
import Serializer from "./serializer";
import SerializerRegistry from "./serializer-registry";
import Schema from "./orm/schema";

const classes = {
  Db,
  Association,
  RouteHandler,
  BaseRouteHandler,
  Serializer,
  SerializerRegistry,
  Schema,
};

let defaultInflector = { singularize, pluralize };

/**
  Lightweight DI container for customizable objects that are needed by
  deeply nested classes.

  @class Container
  @hide
 */
class Container {
  constructor() {
    this.inflector = defaultInflector;
  }

  register(key, value) {
    this[key] = value;
  }

  create(className, ...args) {
    let Class = classes[className];
    Class.prototype._container = this;

    return new Class(...args);
  }
}

/**
  These are side effects. We give each class a default container so it can be
  easily unit tested.

  We should remove these once we have test coverage and can refactor to a proper
  DI system.
*/
let defaultContainer = new Container();

Db.prototype._container = defaultContainer;
Association.prototype._container = defaultContainer;
BaseRouteHandler.prototype._container = defaultContainer;
RouteHandler.prototype._container = defaultContainer;
Serializer.prototype._container = defaultContainer;
SerializerRegistry.prototype._container = defaultContainer;
Schema.prototype._container = defaultContainer;

export default Container;
