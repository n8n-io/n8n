import Factory from "./factory";
import IdentityManager from "./identity-manager";
import association from "./association";
import trait from "./trait";
import Response from "./response";
import Server, { createServer } from "./server";
import Model from "./orm/model";
import Collection from "./orm/collection";
import Serializer from "./serializer";
import ActiveModelSerializer from "./serializers/active-model-serializer";
import JSONAPISerializer from "./serializers/json-api-serializer";
import RestSerializer from "./serializers/rest-serializer";
import HasMany from "./orm/associations/has-many";
import BelongsTo from "./orm/associations/belongs-to";

/*
  These are solely for ember-cli-mirage, a "privileged consumer", and should be
  removed once those import paths are dropped.
*/
import _assert from "./assert";
import _DbCollection from "./db-collection";
import _Db from "./db";
import _RouteHandler from "./route-handler";
import _SerializerRegistry from "./serializer-registry";
import _ormAssociationsAssociation from "./orm/associations/association";
import _ormAssociationsBelongsTo from "./orm/associations/belongs-to";
import _ormAssociationsHasMany from "./orm/associations/has-many";
import _ormPolymorphicCollection from "./orm/polymorphic-collection";
import _ormSchema from "./orm/schema";
import _routeHandlersShorthandsBase from "./route-handlers/shorthands/base";
import _routeHandlersShorthandsDelete from "./route-handlers/shorthands/delete";
import _routeHandlersShorthandsGet from "./route-handlers/shorthands/get";
import _routeHandlersShorthandsHead from "./route-handlers/shorthands/head";
import _routeHandlersShorthandsPost from "./route-handlers/shorthands/post";
import _routeHandlersShorthandsPut from "./route-handlers/shorthands/put";
import _routeHandlersBase from "./route-handlers/base";
import _routeHandlersFunction from "./route-handlers/function";
import _routeHandlersObject from "./route-handlers/object";
import _utilsExtend from "./utils/extend";
import {
  camelize as _utilsInflectorCamelize,
  dasherize as _utilsInflectorDasherize,
  underscore as _utilsInflectorUnderscore,
  capitalize as _utilsInflectorCapitalize,
} from "./utils/inflector";
import _utilsIsAssociation from "./utils/is-association";
import _utilsReferenceSort from "./utils/reference-sort";
import _utilsUuid from "./utils/uuid";

import PretenderInterceptor from "./mock-server/pretender-config";

/**
  @hide
*/
function hasMany(...args) {
  return new HasMany(...args);
}

/**
  @hide
*/
function belongsTo(...args) {
  return new BelongsTo(...args);
}

export {
  association,
  trait,
  Model,
  Collection,
  Serializer,
  ActiveModelSerializer,
  JSONAPISerializer,
  RestSerializer,
  hasMany,
  belongsTo,
  createServer,
  Server,
  Factory,
  IdentityManager,
  Response,
  _assert,
  _DbCollection,
  _Db,
  _RouteHandler,
  _SerializerRegistry,
  _ormAssociationsAssociation,
  _ormAssociationsBelongsTo,
  _ormAssociationsHasMany,
  _ormPolymorphicCollection,
  _ormSchema,
  _routeHandlersShorthandsBase,
  _routeHandlersShorthandsDelete,
  _routeHandlersShorthandsGet,
  _routeHandlersShorthandsHead,
  _routeHandlersShorthandsPost,
  _routeHandlersShorthandsPut,
  _routeHandlersBase,
  _routeHandlersFunction,
  _routeHandlersObject,
  _utilsExtend,
  _utilsInflectorCamelize,
  _utilsInflectorDasherize,
  _utilsInflectorUnderscore,
  _utilsInflectorCapitalize,
  _utilsIsAssociation,
  _utilsReferenceSort,
  _utilsUuid,
  PretenderInterceptor,
};

export default {
  Factory,
  Response,
  hasMany,
  belongsTo,
};
