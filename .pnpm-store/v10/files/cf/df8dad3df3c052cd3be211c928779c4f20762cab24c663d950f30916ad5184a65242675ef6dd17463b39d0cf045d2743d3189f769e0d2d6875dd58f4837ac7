import type { Options, ParserOptions } from "./options.js";
import { getNewOptions } from "./options.js";
import type { JSONSchema, SchemaCallback } from "./types";

// I really dislike this function and the way it's written. It's not clear what it's doing, and it's way too flexible
// In the future, I'd like to deprecate the api and accept only named parameters in index.ts
export interface NormalizedArguments<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>> {
  path: string;
  schema: S;
  options: O & Options<S>;
  callback: SchemaCallback<S>;
}
/**
 * Normalizes the given arguments, accounting for optional args.
 */
export function normalizeArgs<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  _args: Partial<IArguments>,
): NormalizedArguments<S, O> {
  let path;
  let schema;
  let options: Options<S> & O;
  let callback;
  const args = Array.prototype.slice.call(_args) as any[];

  if (typeof args[args.length - 1] === "function") {
    // The last parameter is a callback function
    callback = args.pop();
  }

  if (typeof args[0] === "string") {
    // The first parameter is the path
    path = args[0];
    if (typeof args[2] === "object") {
      // The second parameter is the schema, and the third parameter is the options
      schema = args[1];
      options = args[2];
    } else {
      // The second parameter is the options
      schema = undefined;
      options = args[1];
    }
  } else {
    // The first parameter is the schema
    path = "";
    schema = args[0];
    options = args[1];
  }

  try {
    options = getNewOptions<S, O>(options);
  } catch (e) {
    console.error(`JSON Schema Ref Parser: Error normalizing options: ${e}`);
  }

  if (!options.mutateInputSchema && typeof schema === "object") {
    // Make a deep clone of the schema, so that we don't alter the original object
    schema = JSON.parse(JSON.stringify(schema));
  }

  return {
    path,
    schema,
    options,
    callback,
  };
}

export default normalizeArgs;
