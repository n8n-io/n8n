/**
 * Metadata is information about a particular RPC call (such as authentication
 * details) in the form of a list of key-value pairs, where the keys are strings
 * and the values are strings or binary data.
 */
export type Metadata = {
  /**
   * Sets the value of a metadata with a given key.
   *
   * The value must be binary if and only if the key ends with '-bin'.
   *
   * Multiple string metadata values are always joined to a single string with
   * a comma. It is not recommended to use multiple binary metadata values
   * either, because some gRPC implementations may not support it.
   */
  set<Key extends string>(
    key: Key,
    value: MetadataValue<Key> | Array<MetadataValue<Key>>,
  ): Metadata;
  /**
   * Appends the value to an array of metadata with a given key.
   *
   * The value must be binary if and only if the key ends with '-bin'.
   *
   * Multiple string metadata values are always joined to a single string with
   * a comma. It is not recommended to use multiple binary metadata values
   * either, because some gRPC implementations may not support it.
   */
  append<Key extends string>(key: Key, value: MetadataValue<Key>): Metadata;
  /**
   * Clears all values of a metadata with a given key.
   */
  delete(key: string): void;
  /**
   * Returns the value of a metadata with a given key.
   *
   * If there are multiple binary values, the first one is returned.
   *
   * Multiple string metadata values are always joined to a single string with
   * a comma. It is not recommended to use multiple binary metadata values
   * either, because some gRPC implementations may not support it.
   */
  get<Key extends string>(key: Key): MetadataValue<Key> | undefined;
  /**
   * Returns an array of all the values of a metadata with a given key.
   *
   * Multiple string metadata values are always joined to a single string with
   * a comma. It is not recommended to use multiple binary metadata values
   * either, because some gRPC implementations may not support it.
   */
  getAll<Key extends string>(key: Key): Array<MetadataValue<Key>>;
  /**
   * Checks whether there is at least one value of a metadata with a given key.
   */
  has(key: string): boolean;
  [Symbol.iterator](): IterableIterator<[string, Array<string | Uint8Array>]>;
};

export type MetadataValue<Key extends string> = string extends Key
  ? string | Uint8Array
  : Lowercase<Key> extends `${string}-bin`
  ? Uint8Array
  : string;

export type MetadataInit =
  | Metadata
  | Iterable<[string, string | Uint8Array | Array<string | Uint8Array>]>
  | Record<string, string | Uint8Array | Array<string | Uint8Array>>;

export type MetadataConstructor = {
  new (init?: MetadataInit): Metadata;
  (init?: MetadataInit): Metadata;
};

export const Metadata = function Metadata(init?: MetadataInit): Metadata {
  const data = new Map<string, Array<string | Uint8Array>>();

  const metadata = {
    set(key: string, value: string | Uint8Array | Array<string | Uint8Array>) {
      key = normalizeKey(key);

      if (Array.isArray(value)) {
        if (value.length === 0) {
          data.delete(key);
        } else {
          for (const item of value) {
            validate(key, item);
          }

          data.set(key, key.endsWith('-bin') ? value : [value.join(', ')]);
        }
      } else {
        validate(key, value);

        data.set(key, [value]);
      }

      return metadata;
    },

    append(key: string, value: string | Uint8Array) {
      key = normalizeKey(key);

      validate(key, value);

      let values = data.get(key);

      if (values == null) {
        values = [];
        data.set(key, values);
      }

      values.push(value);

      if (!key.endsWith('-bin')) {
        data.set(key, [values.join(', ')]);
      }

      return metadata;
    },

    delete(key: string) {
      key = normalizeKey(key);

      data.delete(key);
    },

    get<Key extends string>(key: string): MetadataValue<Key> | undefined {
      key = normalizeKey(key);

      return data.get(key)?.[0] as MetadataValue<Key> | undefined;
    },

    getAll<Key extends string>(key: string): Array<MetadataValue<Key>> {
      key = normalizeKey(key);

      return (data.get(key) ?? []) as Array<MetadataValue<Key>>;
    },

    has(key: string) {
      key = normalizeKey(key);

      return data.has(key);
    },

    [Symbol.iterator]() {
      return data[Symbol.iterator]();
    },
  };

  if (init != null) {
    const entries = isIterable(init) ? init : Object.entries(init);

    for (const [key, value] of entries) {
      metadata.set(key, value);
    }
  }

  return metadata;
} as MetadataConstructor;

function normalizeKey(key: string): string {
  return key.toLowerCase();
}

function validate(key: string, value: string | Uint8Array): void {
  if (!/^[0-9a-z_.-]+$/.test(key)) {
    throw new Error(`Metadata key '${key}' contains illegal characters`);
  }

  if (key.endsWith('-bin')) {
    if (!(value instanceof Uint8Array)) {
      throw new Error(
        `Metadata key '${key}' ends with '-bin', thus it must have binary value`,
      );
    }
  } else {
    if (typeof value !== 'string') {
      throw new Error(
        `Metadata key '${key}' doesn't end with '-bin', thus it must have string value`,
      );
    }

    if (!/^[ -~]*$/.test(value)) {
      throw new Error(
        `Metadata value '${value}' of key '${key}' contains illegal characters`,
      );
    }
  }
}

function isIterable(value: object): value is Iterable<unknown> {
  return Symbol.iterator in value;
}
