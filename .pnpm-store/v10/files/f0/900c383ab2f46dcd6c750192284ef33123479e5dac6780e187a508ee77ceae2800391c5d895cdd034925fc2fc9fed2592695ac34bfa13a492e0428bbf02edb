import $Ref from "./ref.js";
import Pointer from "./pointer.js";
import { ono } from "@jsdevtools/ono";
import * as url from "./util/url.js";
import type $Refs from "./refs.js";
import type { DereferenceOptions, ParserOptions } from "./options.js";
import type { JSONSchema } from "./types";
import type $RefParser from "./index";
import { TimeoutError } from "./util/errors";

export default dereference;

/**
 * Crawls the JSON schema, finds all JSON references, and dereferences them.
 * This method mutates the JSON schema object, replacing JSON references with their resolved value.
 *
 * @param parser
 * @param options
 */
function dereference<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  parser: $RefParser<S, O>,
  options: O,
) {
  const start = Date.now();
  // console.log('Dereferencing $ref pointers in %s', parser.$refs._root$Ref.path);
  const dereferenced = crawl<S, O>(
    parser.schema,
    parser.$refs._root$Ref.path!,
    "#",
    new Set(),
    new Set(),
    new Map(),
    parser.$refs,
    options,
    start,
  );
  parser.$refs.circular = dereferenced.circular;
  parser.schema = dereferenced.value;
}

/**
 * Recursively crawls the given value, and dereferences any JSON references.
 *
 * @param obj - The value to crawl. If it's not an object or array, it will be ignored.
 * @param path - The full path of `obj`, possibly with a JSON Pointer in the hash
 * @param pathFromRoot - The path of `obj` from the schema root
 * @param parents - An array of the parent objects that have already been dereferenced
 * @param processedObjects - An array of all the objects that have already been processed
 * @param dereferencedCache - An map of all the dereferenced objects
 * @param $refs
 * @param options
 * @param startTime - The time when the dereferencing started
 * @returns
 */
function crawl<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  obj: any,
  path: string,
  pathFromRoot: string,
  parents: Set<any>,
  processedObjects: Set<any>,
  dereferencedCache: any,
  $refs: $Refs<S, O>,
  options: O,
  startTime: number,
) {
  let dereferenced;
  const result = {
    value: obj,
    circular: false,
  };

  checkDereferenceTimeout<S, O>(startTime, options);

  const derefOptions = (options.dereference || {}) as DereferenceOptions;
  const isExcludedPath = derefOptions.excludedPathMatcher || (() => false);

  if (derefOptions?.circular === "ignore" || !processedObjects.has(obj)) {
    if (obj && typeof obj === "object" && !ArrayBuffer.isView(obj) && !isExcludedPath(pathFromRoot)) {
      parents.add(obj);
      processedObjects.add(obj);

      if ($Ref.isAllowed$Ref(obj, options)) {
        dereferenced = dereference$Ref(
          obj,
          path,
          pathFromRoot,
          parents,
          processedObjects,
          dereferencedCache,
          $refs,
          options,
          startTime,
        );
        result.circular = dereferenced.circular;
        result.value = dereferenced.value;
      } else {
        for (const key of Object.keys(obj)) {
          checkDereferenceTimeout<S, O>(startTime, options);

          const keyPath = Pointer.join(path, key);
          const keyPathFromRoot = Pointer.join(pathFromRoot, key);

          if (isExcludedPath(keyPathFromRoot)) {
            continue;
          }

          const value = obj[key];
          let circular = false;

          if ($Ref.isAllowed$Ref(value, options)) {
            dereferenced = dereference$Ref(
              value,
              keyPath,
              keyPathFromRoot,
              parents,
              processedObjects,
              dereferencedCache,
              $refs,
              options,
              startTime,
            );
            circular = dereferenced.circular;
            // Avoid pointless mutations; breaks frozen objects to no profit
            if (obj[key] !== dereferenced.value) {
              // If we have properties we want to preserve from our dereferenced schema then we need
              // to copy them over to our new object.
              const preserved: Map<string, unknown> = new Map();
              if (derefOptions?.preservedProperties) {
                if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
                  derefOptions?.preservedProperties.forEach((prop) => {
                    if (prop in obj[key]) {
                      preserved.set(prop, obj[key][prop]);
                    }
                  });
                }
              }

              obj[key] = dereferenced.value;

              // If we have data to preserve and our dereferenced object is still an object then
              // we need copy back our preserved data into our dereferenced schema.
              if (derefOptions?.preservedProperties) {
                if (preserved.size && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
                  preserved.forEach((value, prop) => {
                    obj[key][prop] = value;
                  });
                }
              }

              derefOptions?.onDereference?.(value.$ref, obj[key], obj, key);
            }
          } else {
            if (!parents.has(value)) {
              dereferenced = crawl(
                value,
                keyPath,
                keyPathFromRoot,
                parents,
                processedObjects,
                dereferencedCache,
                $refs,
                options,
                startTime,
              );
              circular = dereferenced.circular;
              // Avoid pointless mutations; breaks frozen objects to no profit
              if (obj[key] !== dereferenced.value) {
                obj[key] = dereferenced.value;
              }
            } else {
              circular = foundCircularReference(keyPath, $refs, options);
            }
          }

          // Set the "isCircular" flag if this or any other property is circular
          result.circular = result.circular || circular;
        }
      }

      parents.delete(obj);
    }
  }

  return result;
}

/**
 * Dereferences the given JSON Reference, and then crawls the resulting value.
 *
 * @param $ref - The JSON Reference to resolve
 * @param path - The full path of `$ref`, possibly with a JSON Pointer in the hash
 * @param pathFromRoot - The path of `$ref` from the schema root
 * @param parents - An array of the parent objects that have already been dereferenced
 * @param processedObjects - An array of all the objects that have already been dereferenced
 * @param dereferencedCache - An map of all the dereferenced objects
 * @param $refs
 * @param options
 * @returns
 */
function dereference$Ref<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  $ref: any,
  path: string,
  pathFromRoot: string,
  parents: Set<any>,
  processedObjects: any,
  dereferencedCache: any,
  $refs: $Refs<S, O>,
  options: O,
  startTime: number,
) {
  const isExternalRef = $Ref.isExternal$Ref($ref);
  const shouldResolveOnCwd = isExternalRef && options?.dereference?.externalReferenceResolution === "root";
  const $refPath = url.resolve(shouldResolveOnCwd ? url.cwd() : path, $ref.$ref);

  const cache = dereferencedCache.get($refPath);

  if (cache) {
    // If the object we found is circular we can immediately return it because it would have been
    // cached with everything we need already and we don't need to re-process anything inside it.
    //
    // If the cached object however is _not_ circular and there are additional keys alongside our
    // `$ref` pointer here we should merge them back in and return that.
    if (!cache.circular) {
      const refKeys = Object.keys($ref);
      if (refKeys.length > 1) {
        const extraKeys = {};
        for (const key of refKeys) {
          if (key !== "$ref" && !(key in cache.value)) {
            // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            extraKeys[key] = $ref[key];
          }
        }
        return {
          circular: cache.circular,
          value: Object.assign({}, cache.value, extraKeys),
        };
      }

      return cache;
    }

    // If both our cached value and our incoming `$ref` are the same then we can return what we
    // got out of the cache, otherwise we should re-process this value. We need to do this because
    // the current dereference caching mechanism doesn't take into account that `$ref` are neither
    // unique or reference the same file.
    //
    // For example if `schema.yaml` references `definitions/child.yaml` and
    // `definitions/parent.yaml` references `child.yaml` then `$ref: 'child.yaml'` may get cached
    // for `definitions/child.yaml`, resulting in `schema.yaml` being having an invalid reference
    // to `child.yaml`.
    //
    // This check is not perfect and the design of the dereference caching mechanism needs a total
    // overhaul.
    if (typeof cache.value === "object" && "$ref" in cache.value && "$ref" in $ref) {
      if (cache.value.$ref === $ref.$ref) {
        return cache;
      } else {
        // no-op
      }
    } else {
      return cache;
    }
  }

  const pointer = $refs._resolve($refPath, path, options);

  if (pointer === null) {
    return {
      circular: false,
      value: null,
    };
  }

  // Check for circular references
  const directCircular = pointer.circular;
  let circular = directCircular || parents.has(pointer.value);
  if (circular) {
    foundCircularReference(path, $refs, options);
  }

  // Dereference the JSON reference
  let dereferencedValue = $Ref.dereference($ref, pointer.value);

  // Crawl the dereferenced value (unless it's circular)
  if (!circular) {
    // Determine if the dereferenced value is circular
    const dereferenced = crawl(
      dereferencedValue,
      pointer.path,
      pathFromRoot,
      parents,
      processedObjects,
      dereferencedCache,
      $refs,
      options,
      startTime,
    );
    circular = dereferenced.circular;
    dereferencedValue = dereferenced.value;
  }

  if (circular && !directCircular && options.dereference?.circular === "ignore") {
    // The user has chosen to "ignore" circular references, so don't change the value
    dereferencedValue = $ref;
  }

  if (directCircular) {
    // The pointer is a DIRECT circular reference (i.e. it references itself).
    // So replace the $ref path with the absolute path from the JSON Schema root
    dereferencedValue.$ref = pathFromRoot;
  }

  const dereferencedObject = {
    circular,
    value: dereferencedValue,
  };

  // only cache if no extra properties than $ref
  if (Object.keys($ref).length === 1) {
    dereferencedCache.set($refPath, dereferencedObject);
  }

  return dereferencedObject;
}

/**
 * Check if we've run past our allowed timeout and throw an error if we have.
 *
 * @param startTime - The time when the dereferencing started.
 * @param options
 */
function checkDereferenceTimeout<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  startTime: number,
  options: O,
): void {
  if (options && options.timeoutMs) {
    if (Date.now() - startTime > options.timeoutMs) {
      throw new TimeoutError(options.timeoutMs);
    }
  }
}

/**
 * Called when a circular reference is found.
 * It sets the {@link $Refs#circular} flag, executes the options.dereference.onCircular callback,
 * and throws an error if options.dereference.circular is false.
 *
 * @param keyPath - The JSON Reference path of the circular reference
 * @param $refs
 * @param options
 * @returns - always returns true, to indicate that a circular reference was found
 */
function foundCircularReference(keyPath: any, $refs: any, options: any) {
  $refs.circular = true;
  options?.dereference?.onCircular?.(keyPath);

  if (!options.dereference.circular) {
    throw ono.reference(`Circular $ref pointer found at ${keyPath}`);
  }
  return true;
}
