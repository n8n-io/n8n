// Minimum TypeScript Version: 4.2

/*
 * Inspired by Dan Freeman
 * https://github.com/dfreeman/
 *
 * Source: https://gist.github.com/dfreeman/33fc80164c0ad91d5e9480a94aa6454c#file-tests-model-ts
 */
declare module "miragejs" {
  import {
    FactoryDefinition,
    ModelDefinition,
    BelongsTo,
    HasMany,
  } from "miragejs/-types";
  import IdentityManager from "miragejs/identity-manager";
  export { IdentityManager };
  export { Server, createServer } from "miragejs/server";
  export { Registry, Instantiate, ModelInstance } from "miragejs/-types";
  export {
    Serializer,
    ActiveModelSerializer,
    JSONAPISerializer,
    RestSerializer,
  } from "miragejs/serializer";

  /**
   * A fake HTTP request
   */
  export class Request {
    /** The request body, if defined */
    readonly requestBody: string;

    /** The URL of the request */
    readonly url: string;

    /** Any headers associated with the request, with downcased names */
    readonly requestHeaders: Record<string, string>;

    /** Any parameter specified via dynamic route segments */
    readonly params: Record<string, string>;

    /** Any query parameters associated with the request */
    readonly queryParams: Record<string, string[] | string | null | undefined>;
  }

  /**
   * A fake HTTP response. May be returned from a Mirage route
   * handler for finer-grained control over the response behavior.
   */
  export class Response {
    /**
     * @param code The HTTP status code for this response
     * @param headers Any custom headers to set in this response
     * @param body Data to send in the response body
     */
    constructor(
      code: number,
      headers?: Record<string, string>,
      body?: string | {}
    );

    toRackResponse(): [
      number,
      Record<string, string> | undefined,
      string | {} | undefined
    ];
  }

  /**
   * The base definition for Mirage models.
   *
   * Use `Model.extend({ ... })` to define a model's relationships
   * (via `belongsTo()` and `hasMany()`) and any static default
   * attribute values.
   */
  export const Model: ModelDefinition;

  /**
   * The base definition for Mirage factories.
   *
   * Use `Factory.extend({ ... })` to define methods that
   * will generate default attribute values when `server.create`
   * or the corresponding `schema` method is called for this
   * type.
   */
  export const Factory: FactoryDefinition;

  /**
   * A collection of zero or more Mirage model instances.
   */
  export class Collection<T> {
    /** The number of models in the collection. */
    length: number;

    /** The dasherized model name this Collection represents. */
    modelName: string;

    /** The underlying plain JavaScript array of Models in this Collection. */
    models: T[];

    /** Adds a model to this collection. */
    add(model: T): Collection<T>;

    /** Destroys the db record for all models in the collection. */
    destroy(): Collection<T>;

    /** Returns a new Collection with its models filtered according to the provided callback function. */
    filter(f: (value: T, index: number, models: T[]) => unknown): Collection<T>;

    /** Checks if the Collection includes the given model. */
    includes(model: T): boolean;

    /** Modifies the Collection by merging the models from another collection. */
    mergeCollection(collection: Collection<T>): Collection<T>;

    /** Reloads each model in the collection. */
    reload(): Collection<T>;

    /** Removes a model from this collection. */
    remove(model: T): Collection<T>;

    /** Saves all models in the collection. */
    save(): Collection<T>;

    /** Returns a new Collection with a subset of its models selected from begin to end. */
    slice(begin: number, end: number): Collection<T>;

    /** Returns a new Collection with its models sorted according to the provided compare function. */
    sort(f: (a: T, b: T) => number): Collection<T>;

    /** Updates each model in the collection, and immediately persists all changes to the db. */
    update<K extends keyof T>(key: K, val: T[K]): Collection<T>;
  }

  export interface RelationshipOptions {
    inverse?: string | null;
    polymorphic?: boolean;
  }

  /** Declares a one-to-one relationship to another Mirage model type. */
  export function belongsTo<K extends string>(
    key?: K,
    options?: RelationshipOptions
  ): BelongsTo<K>;
  export function belongsTo<K extends string>(
    options?: RelationshipOptions
  ): BelongsTo<K>;

  /** Declares a one-to-many relationship to another Mirage model type. */
  export function hasMany<K extends string>(
    key?: K,
    options?: RelationshipOptions
  ): HasMany<K>;
  export function hasMany<K extends string>(
    options?: RelationshipOptions
  ): HasMany<K>;
}

declare module "miragejs/-types" {
  import { Collection, Response } from "miragejs";

  /* A 1:1 relationship between models */
  export class BelongsTo<Name extends string> {
    private name: Name;
  }

  /* A 1:many relationship between models */
  export class HasMany<Name extends string> {
    private name: Name;
  }

  // Captures the result of a `Model.extend()` call
  interface ModelDefinition<Data extends {} = {}> {
    extend<NewData>(data: NewData): ModelDefinition<Assign<Data, NewData>>;
  }

  // Captures the result of a `Factory.extend()` call
  interface FactoryDefinition<Data extends {} = {}> {
    extend<NewData>(
      data: WithFactoryMethods<NewData>
    ): FactoryDefinition<Assign<Data, FlattenFactoryMethods<NewData>>>;
  }

  type WithFactoryMethods<T> = {
    [K in keyof T]: T[K] | ((n: number) => T[K]);
  };

  // Extract factory method return values from a factory definition
  type FlattenFactoryMethods<T> = {
    [K in keyof T]: T[K] extends (n: number) => infer V ? V : T[K];
  };

  /**
   * Given a registry and the name of one of the models defined in it,
   * returns the type of that model as instantiated by Mirage.
   */
  export type Instantiate<
    Registry,
    ModelName extends keyof Registry
  > = ModelInstance<
    {
      // Splitting and rejoining on `ModelName` ensures that unions distribute
      // properly, so that `Instantiate<Reg, 'foo' | 'bar'>` expands out like
      // `Instantiate<Reg, 'foo'> | Instantiate<Reg, 'bar'>` rather than something
      // that only has the intersection of `foo` and `bar`'s keys.
      [Model in ModelName]: {
        [Key in keyof Registry[Model]]: InstantiateValue<
          Registry,
          Registry[Model][Key]
        >;
      };
    }[ModelName]
  >;

  // Given a registry and value type, checks whether that type represents
  // if Mirage relationship. If so, returns the corresponding model or
  // collection type from the registry; otherwise returns the type unchanged.
  type InstantiateValue<Registry, T> = T extends BelongsTo<infer ModelName>
    ? InstantiateIfDefined<Registry, ModelName> | null
    : T extends HasMany<infer ModelName>
    ? Collection<InstantiateIfDefined<Registry, ModelName>>
    : T;

  // Returns the instantiated type of the given model if it exists in the
  // given registry, or `unknown` otherwise.
  type InstantiateIfDefined<Registry, ModelName> =
    ModelName extends keyof Registry
      ? Instantiate<Registry, ModelName>
      : unknown;

  // The type-level equivalent of `Object.assign`
  type Assign<T, U> = U & Omit<T, keyof U>;

  // Extracts model definition info for the given key, if a corresponding model is defined
  type ExtractModelData<Models, K> = K extends keyof Models
    ? Models[K] extends ModelDefinition<infer Data>
      ? Data
      : {}
    : {};

  // Extracts factory definition info for the given key, if a corresponding factory is defined
  type ExtractFactoryData<Factories, K> = K extends keyof Factories
    ? Factories[K] extends FactoryDefinition<infer Data>
      ? FlattenFactoryMethods<Data>
      : {}
    : {};

  /**
   * Models all available information about a given set of model and
   * factory definitions, determining the behavior of ORM methods on
   * a `Server` and its corresponding `Schema` instance.
   */
  export type Registry<
    Models extends AnyModels,
    Factories extends AnyFactories
  > = {
    [K in keyof Models | keyof Factories]: ExtractModelData<Models, K> &
      ExtractFactoryData<Factories, K>;
  };

  export type AnyModels = Record<string, ModelDefinition>;
  export type AnyFactories = Record<string, FactoryDefinition>;

  /** A marker type for easily constraining type parameters that must be shaped like a Registry */
  export type AnyRegistry = Registry<AnyModels, AnyFactories>;

  type MaybePromise<T> = T | PromiseLike<T>;
  type ValidResponse =
    | Record<PropertyKey, any>
    | number
    | string
    | boolean
    | null;
  export type AnyResponse = MaybePromise<
    ModelInstance | Response | ValidResponse | ValidResponse[]
  >;

  type CollectionOrListValue<Value> = Value extends Collection<
    infer ElementType
  >
    ? ElementType[] | Collection<ElementType>
    : Value;

  /** Convert any Collection<ElementType> to ElementType[] | Collection<ElementType> */
  type CollectionOrList<Data extends {} = {}> = {
    [K in keyof Data]: CollectionOrListValue<Data[K]>;
  };

  /** Represents the type of an instantiated Mirage model.  */
  export type ModelInstance<Data extends {} = {}> = Data & {
    id?: string;
    attrs: Data;
    modelName: string;

    /** Persists any updates on this model back to the Mirage database. */
    save(): void;

    /** Updates and immediately persists a single or multiple attr(s) on this model. */
    update<K extends keyof Data>(
      key: K,
      value: CollectionOrListValue<Data[K]>
    ): void;
    update(changes: Partial<CollectionOrList<Data>>): void;

    /** Removes this model from the Mirage database. */
    destroy(): void;

    /** Reloads this model's data from the Mirage database. */
    reload(): void;
  };
}

declare module "miragejs/server" {
  import { Request, Registry as MirageRegistry } from "miragejs";
  import {
    AnyRegistry,
    AnyModels,
    AnyFactories,
    AnyResponse,
    Instantiate,
  } from "miragejs/-types";

  import Db from "miragejs/db";
  import IdentityManager from "miragejs/identity-manager";
  import Schema from "miragejs/orm/schema";
  import PretenderServer from "pretender";

  /**
   * Possible HTTP verbs
   * @see https://github.com/pretenderjs/pretender/blob/master/index.d.ts#L13
   **/
  type HTTPVerb =
    | "get"
    | "put"
    | "post"
    | "patch"
    | "delete"
    | "options"
    | "head";
  type PassthroughArg = ((request: Request) => any) | string;
  type PassthroughVerbs = HTTPVerb[];

  /** A callback that will be invoked when a given Mirage route is hit. */
  export type RouteHandler<
    Registry extends AnyRegistry,
    Response extends AnyResponse = AnyResponse
  > = (schema: Schema<Registry>, request: Request) => Response;

  export type Middleware<
    Registry extends AnyRegistry,
    Response extends AnyResponse = AnyResponse
  > = (
    schema: Schema<Registry>,
    request: Request,
    next?: (request?: Request) => Response
  ) => Response;

  export interface HandlerOptions {
    /** A number of ms to artificially delay responses to this route. */
    timing?: number;
  }

  type ShorthandOptions = "index" | "show" | "create" | "update" | "delete";

  export interface ResourceOptions {
    /** Whitelist of shorthand options */
    only?: ShorthandOptions[];
    /** Exclude list of shorthand options */
    except?: ShorthandOptions[];
    /** Shorthand route path */
    path?: string;
  }

  export interface ServerConfig<
    Models extends AnyModels,
    Factories extends AnyFactories
  > {
    urlPrefix?: string;
    fixtures?: any;
    namespace?: string;
    timing?: number;
    environment?: string;
    trackRequests?: boolean;
    useDefaultPassthroughs?: boolean;
    logging?: boolean;

    seeds?: (server: Server<MirageRegistry<Models, Factories>>) => void;
    scenarios?: (server: Server<MirageRegistry<Models, Factories>>) => void;

    routes?: (this: Server<MirageRegistry<Models, Factories>>) => void;
    baseConfig?: (this: Server<MirageRegistry<Models, Factories>>) => void;
    testConfig?: (this: Server<MirageRegistry<Models, Factories>>) => void;

    inflector?: object;
    identityManagers?: {
      [modelName in keyof Models]?: typeof IdentityManager;
    } & { application?: typeof IdentityManager };
    models?: Models;
    serializers?: any;
    factories?: Factories;

    pretender?: PretenderServer;
  }

  /**
   * Starts up a Mirage server with the given configuration.
   */
  export function createServer<
    Models extends AnyModels,
    Factories extends AnyFactories
  >(
    config: ServerConfig<Models, Factories>
  ): Server<MirageRegistry<Models, Factories>>;

  export class Server<Registry extends AnyRegistry = AnyRegistry> {
    constructor(options?: ServerConfig<AnyModels, AnyFactories>);

    /** The underlying in-memory database instance for this server. */
    readonly db: Db;

    /** An interface to the Mirage ORM that allows for querying and creating records. */
    readonly schema: Schema<Registry>;

    /** Creates a model of the given type. */
    readonly create: Schema<Registry>["create"];

    /** Whether or not Mirage should log all requests/response cycles. */
    logging: boolean;

    /** A default number of ms to artificially delay responses for all routes. */
    timing: number;

    /** A default prefix applied to all subsequent route definitions. */
    namespace: string;

    /**
     * A set of middleware applied to subsequent route definitions.
     *
     * Usage:
     * ```js
     *   // Example middleware which randomly returns a
     *   // 500 response:
     *   function random500() {
     *     return (schema, req, next) => {
     *       return (Math.random() > 0.7)
     *         ? new Response(500, {}, 'no')
     *         : next();
     *     }
     *   }
     *
     *   // Routes which use the middleware defined above:
     *   routes() {
     *     this.middleware = [
     *       random500(),
     *       // ...
     *     ]
     *
     *     server.get('/users', (schema, req) => {
     *       return new Response(204, {}, null);
     *     });
     *   }
     * ```
     */
    middleware: Middleware<Registry, Response>[];

    /** Sets a string to prefix all route handler URLs with. */
    urlPrefix: string;

    /** Actual Pretender instance */
    pretender: PretenderServer;

    /** Creates multiple models of the given type. */
    createList<
      K extends keyof Registry,
      Init extends Instantiate<Registry, K>,
      Data extends Partial<Init>
    >(modelName: K, count: number, data?: Data): Array<Init & Data>;

    /** Handle a GET request to the given path. */
    get<Response extends AnyResponse>(
      path: string,
      handler?: RouteHandler<Registry, Response>,
      options?: HandlerOptions
    ): void;

    /** Handle a POST request to the given path. */
    post<Response extends AnyResponse>(
      path: string,
      handler?: RouteHandler<Registry, Response>,
      options?: HandlerOptions
    ): void;

    /** Handle a PUT request to the given path. */
    put<Response extends AnyResponse>(
      path: string,
      handler?: RouteHandler<Registry, Response>,
      options?: HandlerOptions
    ): void;

    /** Handle a PATCH request to the given path. */
    patch<Response extends AnyResponse>(
      path: string,
      handler?: RouteHandler<Registry, Response>,
      options?: HandlerOptions
    ): void;

    /** Handle an OPTIONS request to the given path. */
    options<Response extends AnyResponse>(
      path: string,
      handler?: RouteHandler<Registry, Response>,
      options?: HandlerOptions
    ): void;

    /** Handle a DELETE request to the given path. */
    del<Response extends AnyResponse>(
      path: string,
      handler?: RouteHandler<Registry, Response>,
      options?: HandlerOptions
    ): void;

    delete<Response extends AnyResponse>(
      path: string,
      handler?: RouteHandler<Registry, Response>,
      options?: HandlerOptions
    ): void;

    /** Handle a HEAD request to the given path. */
    head<Response extends AnyResponse>(
      path: string,
      handler?: RouteHandler<Registry, Response>,
      options?: HandlerOptions
    ): void;

    /** Define multiple shorthands for a given resource */
    resource<K extends keyof Registry>(
      modelName: K,
      options?: ResourceOptions
    ): void;

    /** Pass through one or more URLs to make real requests. */
    passthrough(...urls: PassthroughArg[]): void;
    passthrough(
      ...args: [PassthroughArg, ...PassthroughArg[], PassthroughVerbs]
    ): void;

    /** Load all available fixture data matching the given name(s). */
    loadFixtures(...names: string[]): void;

    seeds(server: Server): void;

    routes(): void;

    /** Shutdown the server and stop intercepting network requests. */
    shutdown(): void;
  }
}

declare module "miragejs/db" {
  import DbCollection from "miragejs/db-collection";
  import IdentityManager from "miragejs/identity-manager";

  type DbLookup = {
    [key: string]: ReturnType<DbCollection["all"]> & Omit<DbCollection, "all">;
  };

  class DbClass {
    constructor(initialData: [], identityManagers?: IdentityManager[]);

    createCollection(name: string, initialData?: any[]): void;
    dump(): void;
    emptyData(): void;
    loadData(data: any): void;
  }

  /** The in-memory database containing all currently active data keyed by collection name. */
  export type Db = DbClass & DbLookup;
  export const Db: Db;
  export default Db;
}

declare module "miragejs/db-collection" {
  import IdentityManager from "miragejs/identity-manager";
  export default class DbCollection {
    constructor(
      name: string,
      initialData: any[],
      identityManager?: IdentityManager
    );

    /** Returns a copy of the data, to prevent inadvertent data manipulation. */
    all(): any[];

    /** Returns a single record from the `collection` if `ids` is a single id, or an array of records if `ids` is an array of ids. */
    find(id: number | string | number[] | string[]): any;

    /** Returns the first model from `collection` that matches the key-value pairs in the `query` object. */
    findBy(query: object): any;

    /** Finds the first record matching the provided _query_ in `collection`, or creates a new record using a merge of the `query` and optional `attributesForCreate`. */
    firstOrCreate(query: object, attributesForCreate?: object): any;

    /** Inserts `data` into the collection. `data` can be a single object or an array of objects. */
    insert(data: any): any;

    /** Removes one or more records in *collection*. */
    remove(target?: object | number | string): void;

    /** Updates one or more records in the collection. */
    update(target: object | number | string, attrs?: object): any;

    /** Returns an array of models from `collection` that match the key-value pairs in the `query` object. */
    where(query: object): any;
  }
}

declare module "miragejs/identity-manager" {
  /** An IdentityManager is a class that's responsible for generating unique identifiers. You can define a custom identity manager for your entire application, as well as on a per-model basis. */
  export default class IdentityManager {
    constructor();

    get?(): number;

    /** Registers `uniqueIdentifier` as used. */
    set(uniqueIdentifier: string | number): void;

    inc?(): number;

    /**  Returns the next unique identifier. */
    fetch(): string;

    /** Resets the identity manager, marking all unique identifiers as available. */
    reset(): void;
  }
}

declare module "miragejs/orm/schema" {
  import { Collection } from "miragejs";
  import { AnyRegistry, Instantiate } from "miragejs/-types";
  import Db from "miragejs/db";

  type ModelInitializer<Data> = {
    [K in keyof Data]: Data[K] extends Collection<infer M>
      ? Collection<M> | M[]
      : Data[K];
  };

  /**
   * An interface to the Mirage ORM that allows for querying and creating records.
   */
  export default class Schema<Registry extends AnyRegistry> {
    /** Mirage's in-memory database */
    readonly db: Db;

    /**
     * Creates a model of the given type.
     * @param modelName The type of model to instantiate
     * @param data Optional initial values for model attributes/relationships
     */
    create<
      K extends keyof Registry,
      Init extends Instantiate<Registry, K>,
      Data extends Partial<ModelInitializer<Init>>
    >(
      modelName: K,
      data?: Data
    ): Init & {
      [K in keyof Init & keyof Data]: Exclude<Init[K], undefined | null>;
    };

    /** Locates one or more existing models of the given type by ID(s). */
    find<K extends keyof Registry>(
      type: K,
      id: string
    ): Instantiate<Registry, K> | null;
    find<K extends keyof Registry>(
      type: K,
      ids: string[]
    ): Collection<Instantiate<Registry, K>>;

    /** Locates an existing model of the given type by attribute value(s), if one exists. */
    findBy<K extends keyof Registry>(
      type: K,
      attributes: Partial<Instantiate<Registry, K>>
    ): Instantiate<Registry, K> | null;

    findBy<K extends keyof Registry>(
      type: K,
      predicate: (instance: Instantiate<Registry, K>) => boolean
    ): Instantiate<Registry, K> | null;

    /** Locates an existing model of the given type by attribute value(s), creating one if it doesn't exist. */
    findOrCreateBy<K extends keyof Registry>(
      type: K,
      attributes: Partial<Instantiate<Registry, K>>
    ): Instantiate<Registry, K>;

    /** Locates an existing model of the given type by attribute value(s), if one exists. */
    where<K extends keyof Registry>(
      type: K,
      attributes:
        | Partial<Instantiate<Registry, K>>
        | ((item: Instantiate<Registry, K>) => unknown)
    ): Collection<Instantiate<Registry, K>>;

    /** Returns a collection of all known records of the given type */
    all<K extends keyof Registry>(
      type: K
    ): Collection<Instantiate<Registry, K>>;

    /** Returns an empty collection of the given type */
    none<K extends keyof Registry>(
      type: K
    ): Collection<Instantiate<Registry, K>>;

    /** Returns the first model instance found of the given type */
    first<K extends keyof Registry>(type: K): Instantiate<Registry, K> | null;
  }
}

declare module "miragejs/serializer" {
  import Schema from "miragejs/orm/schema";

  interface SerializerInterface {
    schema?: Schema<any>;
    attrs?: any;
    embed?: boolean | ((key: string) => boolean);
    root?: any;
    serializeIds?: any;
    include?: any;
    keyForAttribute?(attr: any): any;
    keyForCollection?(modelName: any): any;
    keyForEmbeddedRelationship?(attributeName: any): any;
    keyForForeignKey?(relationshipName: any): any;
    keyForModel?(modelName: any): any;
    keyForPolymorphicForeignKeyId?(relationshipName: string): string;
    keyForPolymorphicForeignKeyType?(relationshipName: string): string;
    keyForRelationship?(modelName: any): any;
    keyForRelationshipIds?(modelName: any): any;
    normalize?(json: any): any;
    serialize?(primaryResource: any, request: any): any;
    extend?(param?: SerializerInterface): SerializerInterface;
  }

  class Serializer implements SerializerInterface {
    static extend(param?: SerializerInterface | {}): SerializerInterface | {};
  }

  interface JSONAPISerializerInterface extends SerializerInterface {
    alwaysIncludeLinkageData?: boolean;

    links?(model: any): any;
    shouldIncludeLinkageData?(relationshipKey: string, model: any): boolean;
    typeKeyForModel?(model: any): string;
  }

  class JSONAPISerializer
    extends Serializer
    implements JSONAPISerializerInterface
  {
    static extend(
      param?: JSONAPISerializerInterface | {}
    ): JSONAPISerializerInterface;
  }

  class ActiveModelSerializer extends Serializer {}
  class RestSerializer extends Serializer {}
}
