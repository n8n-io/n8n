// src/actions/append.ts
import { readFileSync } from "fs";

// src/actions/read.ts
function readLine(line, task) {
  const trimmed = line.trim();
  if (!trimmed) {
    return task;
  }
  const section = /^\[([^=]+)]$/.exec(trimmed);
  const property = !section && /^([^#=]+)(={0,1})(.*)$/.exec(trimmed);
  if (section) {
    task.section = section[1];
  } else if (property) {
    const currentSection = task.section ? `${task.section}.` : "";
    task.properties.set(currentSection + property[1].trim(), property[3].trim());
  }
  return task;
}
function read(input, task) {
  return String(input).split("\n").reduce(
    (task2, line) => {
      return readLine(line, task2);
    },
    { ...task, section: "" }
  );
}

// src/actions/append.ts
function newTask() {
  return { section: "", properties: /* @__PURE__ */ new Map() };
}
function append(sourceFile, encoding, task = newTask()) {
  if (!sourceFile) {
    return task;
  }
  const file = readFileSync(sourceFile, encoding);
  return read(file, task);
}

// src/actions/save.ts
import { open } from "fs/promises";
async function save(destFile, props) {
  let pointer = null;
  try {
    pointer = await open(destFile, "w");
    for (const line of props) {
      await pointer.writeFile(`${line}
`, "utf8");
    }
  } finally {
    await pointer?.close();
  }
}

// src/bind-to-express.ts
import { dirname, resolve, sep } from "path";
import { exists, FOLDER } from "@kwsites/file-exists";
import { mkdirp } from "mkdirp";
function expressBasePath(basePath) {
  return resolve(basePath || process.cwd(), "./") + sep;
}
function bindToExpress(reader, app, basePath, makePaths) {
  for (const [key, value] of reader.entries()) {
    if (value && /\.(path|dir)$/.test(key)) {
      const resolvedValue = resolve(basePath, value);
      reader.set(key, resolvedValue);
      try {
        const directoryPath = /dir$/.test(key) ? resolvedValue : dirname(resolvedValue);
        if (makePaths) {
          mkdirp.sync(directoryPath);
        } else if (!exists(directoryPath, FOLDER)) {
          throw new Error("Path is not a directory that already exists");
        }
      } catch {
        throw new Error(`Unable to create directory ${value}`);
      }
    }
    app.set(key, reader.get(key));
    if (/^browser\./.test(key) && app.locals) {
      app.locals[key.substr(8)] = reader.get(key);
    }
  }
  app.set("properties", reader);
  return reader;
}

// src/parse-value.ts
function parseValue(input) {
  const parsedValue = String(input).trim();
  switch (parsedValue) {
    case "undefined":
    case "null":
      return null;
    case (!isNaN(parsedValue) && !!parsedValue && parsedValue):
      return +parsedValue;
    case "false":
    case "true":
      return parsedValue === "true";
    default: {
      const replacements = { "\\n": "\n", "\\r": "\r", "\\t": "	" };
      return parsedValue.replace(/\\[nrt]/g, (key) => replacements[key]);
    }
  }
}

// src/get-by-root.ts
function getByRoot(store, root = "") {
  return Object.fromEntries(parsedEntries(store, `${root}.`));
}
function* parsedEntries(store, prefix = "") {
  for (const [storeKey, storeValue] of store.entries()) {
    const key = parsedKey(storeKey, prefix);
    if (key) {
      yield [key, parseValue(storeValue)];
    }
  }
}
function parsedKey(key, prefix) {
  if (!prefix) {
    return key;
  }
  if (key.startsWith(prefix)) {
    return key.substring(prefix.length);
  }
}

// src/output.ts
function output(properties, allowDuplicateSections, saveSections) {
  if (!allowDuplicateSections) {
    properties = collapseSections(properties);
  }
  return saveSections ? generatePropertiesWithSections(properties) : generatePropertiesWithoutSections(properties);
}
function* generatePropertiesWithoutSections(properties) {
  for (const [key, value] of properties.entries()) {
    yield `${key}=${value}`;
  }
}
function* generatePropertiesWithSections(properties) {
  let section = null;
  for (let [key, value] of properties.entries()) {
    const [prefix, ...tokens] = key.split(".");
    if (tokens.length) {
      if (section !== prefix) {
        section = prefix;
        yield `[${section}]`;
      }
      key = tokens.join(".");
    } else {
      section = null;
    }
    yield `${key}=${value}`;
  }
}
function collapseSections(properties) {
  const sections = /* @__PURE__ */ new Map();
  for (const [key, value] of properties.entries()) {
    const [section] = key.split(".");
    const map = sections.get(section) ?? [];
    map.push([key, value]);
    sections.set(section, map);
  }
  return new Map(Array.from(sections.values()).flat());
}

// src/properties-path.ts
function addLeaf(branch, leaf, key) {
  branch.leaves.set(leaf, key);
  if (Object.hasOwn(branch.branches, leaf)) {
    branch.branches[leaf].dual = true;
  }
}
function addBranch(branch, token) {
  const next = branch.branches[token] ??= childBranch(branch, token);
  if (branch.leaves.has(token)) {
    next.dual = true;
  }
  return next;
}
function childBranch(parent, child = "") {
  return {
    dual: false,
    leaves: /* @__PURE__ */ new Map(),
    branches: /* @__PURE__ */ Object.create(null),
    path: (parent?.path ? `${parent.path}.` : "") + child,
    parent
  };
}
function pathLayers(map) {
  const paths = childBranch(null);
  for (const key of map.keys()) {
    const tokens = key.split(".");
    const leaf = tokens.pop();
    const path = tokens.reduce((branch, token) => addBranch(branch, token), paths);
    addLeaf(path, leaf, key);
  }
  return paths;
}
function memoize(fn) {
  const cache = /* @__PURE__ */ new Map();
  return (key) => {
    if (!cache.has(key)) {
      cache.set(key, fn(key));
    }
    return cache.get(key);
  };
}
function propertiesPath(map) {
  const shape = pathLayers(map);
  const value = (layer, key) => {
    if (!key) {
      return map.get(layer.path);
    }
    const leaf = layer.leaves.get(key);
    const branch = Object.hasOwn(layer.branches, key);
    if (branch) {
      return make(layer.branches[key]);
    }
    return typeof leaf === "string" ? map.get(leaf) : void 0;
  };
  const make = memoize((layer) => {
    const ownKeys = /* @__PURE__ */ new Set([...layer.leaves.keys(), ...Object.keys(layer.branches)]);
    const target = Object.defineProperties(
      /* @__PURE__ */ Object.create(null),
      Object.fromEntries(
        [...ownKeys].map((name) => [
          name,
          {
            configurable: false,
            enumerable: true,
            get() {
              return value(layer, name);
            }
          }
        ])
      )
    );
    if (layer.dual) {
      Object.defineProperty(target, "", {
        configurable: false,
        enumerable: true,
        get() {
          return value(layer, "");
        }
      });
    }
    return target;
  });
  return make(shape);
}

// src/reader.ts
var createPropertiesReader = ({
  sourceFile,
  encoding = "utf-8",
  allowDuplicateSections = false,
  saveSections = true
} = {}) => {
  const store = append(sourceFile, encoding);
  function entries(options = {}) {
    return options.parsed === true ? parsedEntries(store.properties) : store.properties.entries();
  }
  const instance = {
    get length() {
      return store.properties.size;
    },
    append(sourceFile2, enc = encoding) {
      append(sourceFile2, enc, store);
      return instance;
    },
    clone() {
      const next = createPropertiesReader({ allowDuplicateSections, encoding, saveSections });
      for (const [key, value] of store.properties.entries()) {
        next.set(key, value);
      }
      return next;
    },
    bindToExpress(app, basePath, makePaths = false) {
      return bindToExpress(instance, app, expressBasePath(basePath), makePaths);
    },
    each(fn, scope) {
      for (const [key, value] of store.properties.entries()) {
        fn.call(scope || instance, key, value);
      }
      return instance;
    },
    entries,
    get(key) {
      return parseValue(store.properties.get(key));
    },
    getAllProperties() {
      return Object.fromEntries(store.properties.entries());
    },
    getByRoot(root) {
      return getByRoot(store.properties, root);
    },
    getRaw(key) {
      return store.properties.has(key) ? store.properties.get(key) : null;
    },
    out() {
      return output(store.properties, allowDuplicateSections, saveSections);
    },
    path() {
      return propertiesPath(store.properties);
    },
    read(input) {
      read(typeof input === "string" ? input : input.toString(encoding), store);
      return instance;
    },
    save(destFile) {
      return save(destFile, instance.out());
    },
    set(key, value) {
      store.properties.set(key, String(value));
      return instance;
    }
  };
  return instance;
};

// src/index.ts
var index_default = createPropertiesReader;
var propertiesReader = createPropertiesReader;
export {
  bindToExpress,
  index_default as default,
  expressBasePath,
  propertiesReader
};
//# sourceMappingURL=index.mjs.map