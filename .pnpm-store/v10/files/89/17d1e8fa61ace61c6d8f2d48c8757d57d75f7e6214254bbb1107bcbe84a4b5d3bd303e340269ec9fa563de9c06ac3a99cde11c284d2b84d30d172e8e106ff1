import { SerializedFields } from "./map_keys.js";

//#region ../langchain-core/dist/load/serializable.d.ts
//#region src/load/serializable.d.ts
interface BaseSerialized<T extends string> {
  lc: number;
  type: T;
  id: string[];
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  graph?: Record<string, any>;
}
interface SerializedConstructor extends BaseSerialized<"constructor"> {
  kwargs: SerializedFields;
}
interface SerializedSecret extends BaseSerialized<"secret"> {}
interface SerializedNotImplemented extends BaseSerialized<"not_implemented"> {}
type Serialized = SerializedConstructor | SerializedSecret | SerializedNotImplemented;
/**
 * Get a unique name for the module, rather than parent class implementations.
 * Should not be subclassed, subclass lc_name above instead.
 */

interface SerializableInterface {
  get lc_id(): string[];
}
declare abstract class Serializable implements SerializableInterface {
  lc_serializable: boolean;
  lc_kwargs: SerializedFields;
  /**
   * A path to the module that contains the class, eg. ["langchain", "llms"]
   * Usually should be the same as the entrypoint the class is exported from.
   */
  abstract lc_namespace: string[];
  /**
   * The name of the serializable. Override to provide an alias or
   * to preserve the serialized module name in minified environments.
   *
   * Implemented as a static method to support loading logic.
   */
  static lc_name(): string;
  /**
   * The final serialized identifier for the module.
   */
  get lc_id(): string[];
  /**
   * A map of secrets, which will be omitted from serialization.
   * Keys are paths to the secret in constructor args, e.g. "foo.bar.baz".
   * Values are the secret ids, which will be used when deserializing.
   */
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  /**
   * A map of additional attributes to merge with constructor args.
   * Keys are the attribute names, e.g. "foo".
   * Values are the attribute values, which will be serialized.
   * These attributes need to be accepted by the constructor as arguments.
   */
  get lc_attributes(): SerializedFields | undefined;
  /**
   * A map of aliases for constructor args.
   * Keys are the attribute names, e.g. "foo".
   * Values are the alias that will replace the key in serialization.
   * This is used to eg. make argument names match Python.
   */
  get lc_aliases(): {
    [key: string]: string;
  } | undefined;
  /**
   * A manual list of keys that should be serialized.
   * If not overridden, all fields passed into the constructor will be serialized.
   */
  get lc_serializable_keys(): string[] | undefined;
  constructor(kwargs?: SerializedFields, ..._args: never[]);
  toJSON(): Serialized;
  toJSONNotImplemented(): SerializedNotImplemented;
}
//#endregion
//#endregion
export { Serializable };
//# sourceMappingURL=serializable.d.ts.map