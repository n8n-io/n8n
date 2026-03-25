import $Ref from "./ref.js";
import Pointer from "./pointer.js";
import * as url from "./util/url.js";
import type $Refs from "./refs.js";
import type $RefParser from "./index";
import type { ParserOptions } from "./index";
import type { JSONSchema } from "./index";

export interface InventoryEntry {
  $ref: any;
  parent: any;
  key: any;
  pathFromRoot: any;
  depth: any;
  file: any;
  hash: any;
  value: any;
  circular: any;
  extended: any;
  external: any;
  indirections: any;
}
/**
 * Bundles all external JSON references into the main JSON schema, thus resulting in a schema that
 * only has *internal* references, not any *external* references.
 * This method mutates the JSON schema object, adding new references and re-mapping existing ones.
 *
 * @param parser
 * @param options
 */
function bundle<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  parser: $RefParser<S, O>,
  options: O,
) {
  // console.log('Bundling $ref pointers in %s', parser.$refs._root$Ref.path);

  // Build an inventory of all $ref pointers in the JSON Schema
  const inventory: InventoryEntry[] = [];
  crawl<S, O>(parser, "schema", parser.$refs._root$Ref.path + "#", "#", 0, inventory, parser.$refs, options);

  // Remap all $ref pointers
  remap(inventory);
}

/**
 * Recursively crawls the given value, and inventories all JSON references.
 *
 * @param parent - The object containing the value to crawl. If the value is not an object or array, it will be ignored.
 * @param key - The property key of `parent` to be crawled
 * @param path - The full path of the property being crawled, possibly with a JSON Pointer in the hash
 * @param pathFromRoot - The path of the property being crawled, from the schema root
 * @param indirections
 * @param inventory - An array of already-inventoried $ref pointers
 * @param $refs
 * @param options
 */
function crawl<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  parent: object | $RefParser<S, O>,
  key: string | null,
  path: string,
  pathFromRoot: string,
  indirections: number,
  inventory: InventoryEntry[],
  $refs: $Refs<S, O>,
  options: O,
) {
  const obj = key === null ? parent : parent[key as keyof typeof parent];

  if (obj && typeof obj === "object" && !ArrayBuffer.isView(obj)) {
    if ($Ref.isAllowed$Ref(obj)) {
      inventory$Ref(parent, key, path, pathFromRoot, indirections, inventory, $refs, options);
    } else {
      // Crawl the object in a specific order that's optimized for bundling.
      // This is important because it determines how `pathFromRoot` gets built,
      // which later determines which keys get dereferenced and which ones get remapped
      const keys = Object.keys(obj).sort((a, b) => {
        // Most people will expect references to be bundled into the the "definitions" property,
        // so we always crawl that property first, if it exists.
        if (a === "definitions" || a === "$defs") {
          return -1;
        } else if (b === "definitions" || b === "$defs") {
          return 1;
        } else {
          // Otherwise, crawl the keys based on their length.
          // This produces the shortest possible bundled references
          return a.length - b.length;
        }
      }) as (keyof typeof obj)[];

      for (const key of keys) {
        const keyPath = Pointer.join(path, key);
        const keyPathFromRoot = Pointer.join(pathFromRoot, key);
        const value = obj[key];

        if ($Ref.isAllowed$Ref(value)) {
          inventory$Ref(obj, key, path, keyPathFromRoot, indirections, inventory, $refs, options);
        } else {
          crawl(obj, key, keyPath, keyPathFromRoot, indirections, inventory, $refs, options);
        }
      }
    }
  }
}

/**
 * Inventories the given JSON Reference (i.e. records detailed information about it so we can
 * optimize all $refs in the schema), and then crawls the resolved value.
 *
 * @param $refParent - The object that contains a JSON Reference as one of its keys
 * @param $refKey - The key in `$refParent` that is a JSON Reference
 * @param path - The full path of the JSON Reference at `$refKey`, possibly with a JSON Pointer in the hash
 * @param indirections - unknown
 * @param pathFromRoot - The path of the JSON Reference at `$refKey`, from the schema root
 * @param inventory - An array of already-inventoried $ref pointers
 * @param $refs
 * @param options
 */
function inventory$Ref<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  $refParent: any,
  $refKey: string | null,
  path: string,
  pathFromRoot: string,
  indirections: number,
  inventory: InventoryEntry[],
  $refs: $Refs<S, O>,
  options: O,
) {
  const $ref = $refKey === null ? $refParent : $refParent[$refKey];
  const $refPath = url.resolve(path, $ref.$ref);
  const pointer = $refs._resolve($refPath, pathFromRoot, options);
  if (pointer === null) {
    return;
  }
  const parsed = Pointer.parse(pathFromRoot);
  const depth = parsed.length;
  const file = url.stripHash(pointer.path);
  const hash = url.getHash(pointer.path);
  const external = file !== $refs._root$Ref.path;
  const extended = $Ref.isExtended$Ref($ref);
  indirections += pointer.indirections;

  const existingEntry = findInInventory(inventory, $refParent, $refKey);
  if (existingEntry) {
    // This $Ref has already been inventoried, so we don't need to process it again
    if (depth < existingEntry.depth || indirections < existingEntry.indirections) {
      removeFromInventory(inventory, existingEntry);
    } else {
      return;
    }
  }

  inventory.push({
    $ref, // The JSON Reference (e.g. {$ref: string})
    parent: $refParent, // The object that contains this $ref pointer
    key: $refKey, // The key in `parent` that is the $ref pointer
    pathFromRoot, // The path to the $ref pointer, from the JSON Schema root
    depth, // How far from the JSON Schema root is this $ref pointer?
    file, // The file that the $ref pointer resolves to
    hash, // The hash within `file` that the $ref pointer resolves to
    value: pointer.value, // The resolved value of the $ref pointer
    circular: pointer.circular, // Is this $ref pointer DIRECTLY circular? (i.e. it references itself)
    extended, // Does this $ref extend its resolved value? (i.e. it has extra properties, in addition to "$ref")
    external, // Does this $ref pointer point to a file other than the main JSON Schema file?
    indirections, // The number of indirect references that were traversed to resolve the value
  });

  // Recursively crawl the resolved value
  if (!existingEntry || external) {
    crawl(pointer.value, null, pointer.path, pathFromRoot, indirections + 1, inventory, $refs, options);
  }
}

/**
 * Re-maps every $ref pointer, so that they're all relative to the root of the JSON Schema.
 * Each referenced value is dereferenced EXACTLY ONCE.  All subsequent references to the same
 * value are re-mapped to point to the first reference.
 *
 * @example: {
 *    first: { $ref: somefile.json#/some/part },
 *    second: { $ref: somefile.json#/another/part },
 *    third: { $ref: somefile.json },
 *    fourth: { $ref: somefile.json#/some/part/sub/part }
 *  }
 *
 * In this example, there are four references to the same file, but since the third reference points
 * to the ENTIRE file, that's the only one we need to dereference.  The other three can just be
 * remapped to point inside the third one.
 *
 * On the other hand, if the third reference DIDN'T exist, then the first and second would both need
 * to be dereferenced, since they point to different parts of the file. The fourth reference does NOT
 * need to be dereferenced, because it can be remapped to point inside the first one.
 *
 * @param inventory
 */
function remap(inventory: InventoryEntry[]) {
  // Group & sort all the $ref pointers, so they're in the order that we need to dereference/remap them
  inventory.sort((a: InventoryEntry, b: InventoryEntry) => {
    if (a.file !== b.file) {
      // Group all the $refs that point to the same file
      return a.file < b.file ? -1 : +1;
    } else if (a.hash !== b.hash) {
      // Group all the $refs that point to the same part of the file
      return a.hash < b.hash ? -1 : +1;
    } else if (a.circular !== b.circular) {
      // If the $ref points to itself, then sort it higher than other $refs that point to this $ref
      return a.circular ? -1 : +1;
    } else if (a.extended !== b.extended) {
      // If the $ref extends the resolved value, then sort it lower than other $refs that don't extend the value
      return a.extended ? +1 : -1;
    } else if (a.indirections !== b.indirections) {
      // Sort direct references higher than indirect references
      return a.indirections - b.indirections;
    } else if (a.depth !== b.depth) {
      // Sort $refs by how close they are to the JSON Schema root
      return a.depth - b.depth;
    } else {
      // Determine how far each $ref is from the "definitions" property.
      // Most people will expect references to be bundled into the the "definitions" property if possible.
      const aDefinitionsIndex = Math.max(
        a.pathFromRoot.lastIndexOf("/definitions"),
        a.pathFromRoot.lastIndexOf("/$defs"),
      );
      const bDefinitionsIndex = Math.max(
        b.pathFromRoot.lastIndexOf("/definitions"),
        b.pathFromRoot.lastIndexOf("/$defs"),
      );

      if (aDefinitionsIndex !== bDefinitionsIndex) {
        // Give higher priority to the $ref that's closer to the "definitions" property
        return bDefinitionsIndex - aDefinitionsIndex;
      } else {
        // All else is equal, so use the shorter path, which will produce the shortest possible reference
        return a.pathFromRoot.length - b.pathFromRoot.length;
      }
    }
  });

  let file, hash, pathFromRoot;
  for (const entry of inventory) {
    // console.log('Re-mapping $ref pointer "%s" at %s', entry.$ref.$ref, entry.pathFromRoot);

    if (!entry.external) {
      // This $ref already resolves to the main JSON Schema file
      entry.$ref.$ref = entry.hash;
    } else if (entry.file === file && entry.hash === hash) {
      // This $ref points to the same value as the prevous $ref, so remap it to the same path
      entry.$ref.$ref = pathFromRoot;
    } else if (entry.file === file && entry.hash.indexOf(hash + "/") === 0) {
      // This $ref points to a sub-value of the prevous $ref, so remap it beneath that path
      entry.$ref.$ref = Pointer.join(pathFromRoot, Pointer.parse(entry.hash.replace(hash, "#")));
    } else {
      // We've moved to a new file or new hash
      file = entry.file;
      hash = entry.hash;
      pathFromRoot = entry.pathFromRoot;

      // This is the first $ref to point to this value, so dereference the value.
      // Any other $refs that point to the same value will point to this $ref instead
      entry.$ref = entry.parent[entry.key] = $Ref.dereference(entry.$ref, entry.value);

      if (entry.circular) {
        // This $ref points to itself
        entry.$ref.$ref = entry.pathFromRoot;
      }
    }
  }

  // we want to ensure that any $refs that point to another $ref are remapped to point to the final value
  // let hadChange = true;
  // while (hadChange) {
  //   hadChange = false;
  //   for (const entry of inventory) {
  //     if (entry.$ref && typeof entry.$ref === "object" && "$ref" in entry.$ref) {
  //       const resolved = inventory.find((e: InventoryEntry) => e.pathFromRoot === entry.$ref.$ref);
  //       if (resolved) {
  //         const resolvedPointsToAnotherRef =
  //           resolved.$ref && typeof resolved.$ref === "object" && "$ref" in resolved.$ref;
  //         if (resolvedPointsToAnotherRef && entry.$ref.$ref !== resolved.$ref.$ref) {
  //           // console.log('Re-mapping $ref pointer "%s" at %s', entry.$ref.$ref, entry.pathFromRoot);
  //           entry.$ref.$ref = resolved.$ref.$ref;
  //           hadChange = true;
  //         }
  //       }
  //     }
  //   }
  // }
}

/**
 * TODO
 */
function findInInventory(inventory: InventoryEntry[], $refParent: any, $refKey: any) {
  for (const existingEntry of inventory) {
    if (existingEntry && existingEntry.parent === $refParent && existingEntry.key === $refKey) {
      return existingEntry;
    }
  }
  return undefined;
}

function removeFromInventory(inventory: InventoryEntry[], entry: any) {
  const index = inventory.indexOf(entry);
  inventory.splice(index, 1);
}
export default bundle;
