import {
  isTestEnvironment,
  pauseAnimations,
  waitForAnimations
} from "./chunk-IPA5A322.js";
import {
  require_main
} from "./chunk-3OXGAGBE.js";
import {
  SNIPPET_RENDERED,
  combineParameters
} from "./chunk-VYJQ7RU5.js";
import {
  isEqual
} from "./chunk-3IAH5M2U.js";
import {
  invariant
} from "./chunk-AS2HQEYC.js";
import {
  require_ansi_to_html
} from "./chunk-YKE5S47A.js";
import {
  mapValues,
  pickBy
} from "./chunk-AIOS4NGK.js";
import {
  isPlainObject
} from "./chunk-GFLS4VP3.js";
import {
  require_memoizerific
} from "./chunk-WJYERY3R.js";
import {
  dedent
} from "./chunk-JP7NCOJX.js";
import {
  __toESM
} from "./chunk-A242L54C.js";

// src/preview-api/modules/addons/main.ts
import { global } from "@storybook/global";

// src/preview-api/modules/addons/storybook-channel-mock.ts
import { Channel } from "storybook/internal/channels";
function mockChannel() {
  let transport = {
    setHandler: () => {
    },
    send: () => {
    }
  };
  return new Channel({ transport });
}

// src/preview-api/modules/addons/main.ts
var AddonStore = class {
  constructor() {
    this.getChannel = () => {
      if (!this.channel) {
        let channel = mockChannel();
        return this.setChannel(channel), channel;
      }
      return this.channel;
    };
    this.ready = () => this.promise;
    this.hasChannel = () => !!this.channel;
    this.setChannel = (channel) => {
      this.channel = channel, this.resolve();
    };
    this.promise = new Promise((res) => {
      this.resolve = () => res(this.getChannel());
    });
  }
}, KEY = "__STORYBOOK_ADDONS_PREVIEW";
function getAddonsStore() {
  return global[KEY] || (global[KEY] = new AddonStore()), global[KEY];
}
var addons = getAddonsStore();

// src/preview-api/modules/addons/hooks.ts
import { logger } from "storybook/internal/client-logger";
import {
  FORCE_RE_RENDER,
  RESET_STORY_ARGS,
  STORY_RENDERED,
  UPDATE_GLOBALS,
  UPDATE_STORY_ARGS
} from "storybook/internal/core-events";
import { global as global2 } from "@storybook/global";
var HooksContext = class {
  constructor() {
    this.hookListsMap = void 0;
    this.mountedDecorators = void 0;
    this.prevMountedDecorators = void 0;
    this.currentHooks = void 0;
    this.nextHookIndex = void 0;
    this.currentPhase = void 0;
    this.currentEffects = void 0;
    this.prevEffects = void 0;
    this.currentDecoratorName = void 0;
    this.hasUpdates = void 0;
    this.currentContext = void 0;
    this.renderListener = (storyId) => {
      storyId === this.currentContext?.id && (this.triggerEffects(), this.currentContext = null, this.removeRenderListeners());
    };
    this.init();
  }
  init() {
    this.hookListsMap = /* @__PURE__ */ new WeakMap(), this.mountedDecorators = /* @__PURE__ */ new Set(), this.prevMountedDecorators = /* @__PURE__ */ new Set(), this.currentHooks = [], this.nextHookIndex = 0, this.currentPhase = "NONE", this.currentEffects = [], this.prevEffects = [], this.currentDecoratorName = null, this.hasUpdates = !1, this.currentContext = null;
  }
  clean() {
    this.prevEffects.forEach((effect) => {
      effect.destroy && effect.destroy();
    }), this.init(), this.removeRenderListeners();
  }
  getNextHook() {
    let hook = this.currentHooks[this.nextHookIndex];
    return this.nextHookIndex += 1, hook;
  }
  triggerEffects() {
    this.prevEffects.forEach((effect) => {
      !this.currentEffects.includes(effect) && effect.destroy && effect.destroy();
    }), this.currentEffects.forEach((effect) => {
      this.prevEffects.includes(effect) || (effect.destroy = effect.create());
    }), this.prevEffects = this.currentEffects, this.currentEffects = [];
  }
  addRenderListeners() {
    this.removeRenderListeners(), addons.getChannel().on(STORY_RENDERED, this.renderListener);
  }
  removeRenderListeners() {
    addons.getChannel().removeListener(STORY_RENDERED, this.renderListener);
  }
};
function hookify(fn) {
  let hookified = (...args) => {
    let { hooks } = typeof args[0] == "function" ? args[1] : args[0], prevPhase = hooks.currentPhase, prevHooks = hooks.currentHooks, prevNextHookIndex = hooks.nextHookIndex, prevDecoratorName = hooks.currentDecoratorName;
    hooks.currentDecoratorName = fn.name, hooks.prevMountedDecorators.has(fn) ? (hooks.currentPhase = "UPDATE", hooks.currentHooks = hooks.hookListsMap.get(fn) || []) : (hooks.currentPhase = "MOUNT", hooks.currentHooks = [], hooks.hookListsMap.set(fn, hooks.currentHooks), hooks.prevMountedDecorators.add(fn)), hooks.nextHookIndex = 0;
    let prevContext = global2.STORYBOOK_HOOKS_CONTEXT;
    global2.STORYBOOK_HOOKS_CONTEXT = hooks;
    let result = fn(...args);
    if (global2.STORYBOOK_HOOKS_CONTEXT = prevContext, hooks.currentPhase === "UPDATE" && hooks.getNextHook() != null)
      throw new Error(
        "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."
      );
    return hooks.currentPhase = prevPhase, hooks.currentHooks = prevHooks, hooks.nextHookIndex = prevNextHookIndex, hooks.currentDecoratorName = prevDecoratorName, result;
  };
  return hookified.originalFn = fn, hookified;
}
var numberOfRenders = 0, RENDER_LIMIT = 25, applyHooks = (applyDecorators) => (storyFn, decorators) => {
  let decorated = applyDecorators(
    hookify(storyFn),
    decorators.map((decorator) => hookify(decorator))
  );
  return (context) => {
    let { hooks } = context;
    hooks.prevMountedDecorators ??= /* @__PURE__ */ new Set(), hooks.mountedDecorators = /* @__PURE__ */ new Set([storyFn, ...decorators]), hooks.currentContext = context, hooks.hasUpdates = !1;
    let result = decorated(context);
    for (numberOfRenders = 1; hooks.hasUpdates; )
      if (hooks.hasUpdates = !1, hooks.currentEffects = [], result = decorated(context), numberOfRenders += 1, numberOfRenders > RENDER_LIMIT)
        throw new Error(
          "Too many re-renders. Storybook limits the number of renders to prevent an infinite loop."
        );
    return hooks.addRenderListeners(), result;
  };
}, areDepsEqual = (deps, nextDeps) => deps.length === nextDeps.length && deps.every((dep, i) => dep === nextDeps[i]), invalidHooksError = () => new Error("Storybook preview hooks can only be called inside decorators and story functions.");
function getHooksContextOrNull() {
  return global2.STORYBOOK_HOOKS_CONTEXT || null;
}
function getHooksContextOrThrow() {
  let hooks = getHooksContextOrNull();
  if (hooks == null)
    throw invalidHooksError();
  return hooks;
}
function useHook(name, callback, deps) {
  let hooks = getHooksContextOrThrow();
  if (hooks.currentPhase === "MOUNT") {
    deps != null && !Array.isArray(deps) && logger.warn(
      `${name} received a final argument that is not an array (instead, received ${deps}). When specified, the final argument must be an array.`
    );
    let hook = { name, deps };
    return hooks.currentHooks.push(hook), callback(hook), hook;
  }
  if (hooks.currentPhase === "UPDATE") {
    let hook = hooks.getNextHook();
    if (hook == null)
      throw new Error("Rendered more hooks than during the previous render.");
    return hook.name !== name && logger.warn(
      `Storybook has detected a change in the order of Hooks${hooks.currentDecoratorName ? ` called by ${hooks.currentDecoratorName}` : ""}. This will lead to bugs and errors if not fixed.`
    ), deps != null && hook.deps == null && logger.warn(
      `${name} received a final argument during this render, but not during the previous render. Even though the final argument is optional, its type cannot change between renders.`
    ), deps != null && hook.deps != null && deps.length !== hook.deps.length && logger.warn(`The final argument passed to ${name} changed size between renders. The order and size of this array must remain constant.
Previous: ${hook.deps}
Incoming: ${deps}`), (deps == null || hook.deps == null || !areDepsEqual(deps, hook.deps)) && (callback(hook), hook.deps = deps), hook;
  }
  throw invalidHooksError();
}
function useMemoLike(name, nextCreate, deps) {
  let { memoizedState } = useHook(
    name,
    (hook) => {
      hook.memoizedState = nextCreate();
    },
    deps
  );
  return memoizedState;
}
function useMemo(nextCreate, deps) {
  return useMemoLike("useMemo", nextCreate, deps);
}
function useCallback(callback, deps) {
  return useMemoLike("useCallback", () => callback, deps);
}
function useRefLike(name, initialValue) {
  return useMemoLike(name, () => ({ current: initialValue }), []);
}
function useRef(initialValue) {
  return useRefLike("useRef", initialValue);
}
function triggerUpdate() {
  let hooks = getHooksContextOrNull();
  if (hooks != null && hooks.currentPhase !== "NONE")
    hooks.hasUpdates = !0;
  else
    try {
      addons.getChannel().emit(FORCE_RE_RENDER);
    } catch {
      logger.warn("State updates of Storybook preview hooks work only in browser");
    }
}
function useStateLike(name, initialState) {
  let stateRef = useRefLike(
    name,
    // @ts-expect-error S type should never be function, but there's no way to tell that to TypeScript
    typeof initialState == "function" ? initialState() : initialState
  ), setState = (update) => {
    stateRef.current = typeof update == "function" ? update(stateRef.current) : update, triggerUpdate();
  };
  return [stateRef.current, setState];
}
function useState(initialState) {
  return useStateLike("useState", initialState);
}
function useReducer(reducer, initialArg, init) {
  let initialState = init != null ? () => init(initialArg) : initialArg, [state, setState] = useStateLike("useReducer", initialState);
  return [state, (action) => setState((prevState) => reducer(prevState, action))];
}
function useEffect(create, deps) {
  let hooks = getHooksContextOrThrow(), effect = useMemoLike("useEffect", () => ({ create }), deps);
  hooks.currentEffects.includes(effect) || hooks.currentEffects.push(effect);
}
function useChannel(eventMap, deps = []) {
  let channel = addons.getChannel();
  return useEffect(() => (Object.entries(eventMap).forEach(([type, listener]) => channel.on(type, listener)), () => {
    Object.entries(eventMap).forEach(
      ([type, listener]) => channel.removeListener(type, listener)
    );
  }), [...Object.keys(eventMap), ...deps]), useCallback(channel.emit.bind(channel), [channel]);
}
function useStoryContext() {
  let { currentContext } = getHooksContextOrThrow();
  if (currentContext == null)
    throw invalidHooksError();
  return currentContext;
}
function useParameter(parameterKey, defaultValue) {
  let { parameters } = useStoryContext();
  if (parameterKey)
    return parameters[parameterKey] ?? defaultValue;
}
function useArgs() {
  let channel = addons.getChannel(), { id: storyId, args } = useStoryContext(), updateArgs = useCallback(
    (updatedArgs) => channel.emit(UPDATE_STORY_ARGS, { storyId, updatedArgs }),
    [channel, storyId]
  ), resetArgs = useCallback(
    (argNames) => channel.emit(RESET_STORY_ARGS, { storyId, argNames }),
    [channel, storyId]
  );
  return [args, updateArgs, resetArgs];
}
function useGlobals() {
  let channel = addons.getChannel(), { globals } = useStoryContext(), updateGlobals = useCallback(
    (newGlobals) => channel.emit(UPDATE_GLOBALS, { globals: newGlobals }),
    [channel]
  );
  return [globals, updateGlobals];
}

// src/preview-api/modules/addons/make-decorator.ts
var makeDecorator = ({
  name,
  parameterName,
  wrapper,
  skipIfNoParametersOrOptions = !1
}) => {
  let decorator = (options) => (storyFn, context) => {
    let parameters = context.parameters && context.parameters[parameterName];
    return parameters && parameters.disable || skipIfNoParametersOrOptions && !options && !parameters ? storyFn(context) : wrapper(storyFn, context, {
      options,
      parameters
    });
  };
  return (...args) => typeof args[0] == "function" ? decorator()(...args) : (...innerArgs) => {
    if (innerArgs.length > 1)
      return args.length > 1 ? decorator(args)(...innerArgs) : decorator(...args)(...innerArgs);
    throw new Error(
      `Passing stories directly into ${name}() is not allowed,
        instead use addDecorator(${name}) and pass options with the '${parameterName}' parameter`
    );
  };
};

// src/preview-api/modules/store/StoryStore.ts
import { getCoreAnnotations as getCoreAnnotations2 } from "storybook/internal/csf";
import {
  CalledExtractOnStoreError,
  MissingStoryFromCsfFileError
} from "storybook/internal/preview-errors";
var import_memoizerific2 = __toESM(require_memoizerific(), 1);

// src/preview-api/modules/store/args.ts
import { once } from "storybook/internal/client-logger";
var INCOMPATIBLE = Symbol("incompatible"), map = (arg, argType) => {
  let type = argType.type;
  if (arg == null || !type || argType.mapping)
    return arg;
  switch (type.name) {
    case "string":
      return String(arg);
    case "enum":
      return arg;
    case "number":
      return Number(arg);
    case "boolean":
      return String(arg) === "true";
    case "array":
      return !type.value || !Array.isArray(arg) ? INCOMPATIBLE : arg.reduce((acc, item, index) => {
        let mapped = map(item, { type: type.value });
        return mapped !== INCOMPATIBLE && (acc[index] = mapped), acc;
      }, new Array(arg.length));
    case "object":
      return typeof arg == "string" || typeof arg == "number" ? arg : !type.value || typeof arg != "object" ? INCOMPATIBLE : Object.entries(arg).reduce((acc, [key, val]) => {
        let mapped = map(val, { type: type.value[key] });
        return mapped === INCOMPATIBLE ? acc : Object.assign(acc, { [key]: mapped });
      }, {});
    case "other": {
      let isPrimitiveArg = typeof arg == "string" || typeof arg == "number" || typeof arg == "boolean";
      return type.value === "ReactNode" && isPrimitiveArg ? arg : INCOMPATIBLE;
    }
    default:
      return INCOMPATIBLE;
  }
}, mapArgsToTypes = (args, argTypes) => Object.entries(args).reduce((acc, [key, value]) => {
  if (!argTypes[key])
    return acc;
  let mapped = map(value, argTypes[key]);
  return mapped === INCOMPATIBLE ? acc : Object.assign(acc, { [key]: mapped });
}, {}), combineArgs = (value, update) => Array.isArray(value) && Array.isArray(update) ? update.reduce(
  (acc, upd, index) => (acc[index] = combineArgs(value[index], update[index]), acc),
  [...value]
).filter((v) => v !== void 0) : !isPlainObject(value) || !isPlainObject(update) ? update : Object.keys({ ...value, ...update }).reduce((acc, key) => {
  if (key in update) {
    let combined = combineArgs(value[key], update[key]);
    combined !== void 0 && (acc[key] = combined);
  } else
    acc[key] = value[key];
  return acc;
}, {}), validateOptions = (args, argTypes) => Object.entries(argTypes).reduce((acc, [key, { options }]) => {
  function allowArg() {
    return key in args && (acc[key] = args[key]), acc;
  }
  if (!options)
    return allowArg();
  if (!Array.isArray(options))
    return once.error(dedent`
        Invalid argType: '${key}.options' should be an array.

        More info: https://storybook.js.org/docs/api/arg-types?ref=error
      `), allowArg();
  if (options.some((opt) => opt && ["object", "function"].includes(typeof opt)))
    return once.error(dedent`
        Invalid argType: '${key}.options' should only contain primitives. Use a 'mapping' for complex values.

        More info: https://storybook.js.org/docs/writing-stories/args?ref=error#mapping-to-complex-arg-values
      `), allowArg();
  let isArray = Array.isArray(args[key]), invalidIndex = isArray && args[key].findIndex((val) => !options.includes(val)), isValidArray = isArray && invalidIndex === -1;
  if (args[key] === void 0 || options.includes(args[key]) || isValidArray)
    return allowArg();
  let field = isArray ? `${key}[${invalidIndex}]` : key, supportedOptions = options.map((opt) => typeof opt == "string" ? `'${opt}'` : String(opt)).join(", ");
  return once.warn(`Received illegal value for '${field}'. Supported options: ${supportedOptions}`), acc;
}, {}), DEEPLY_EQUAL = Symbol("Deeply equal"), deepDiff = (value, update) => {
  if (typeof value != typeof update)
    return update;
  if (isEqual(value, update))
    return DEEPLY_EQUAL;
  if (Array.isArray(value) && Array.isArray(update)) {
    let res = update.reduce((acc, upd, index) => {
      let diff = deepDiff(value[index], upd);
      return diff !== DEEPLY_EQUAL && (acc[index] = diff), acc;
    }, new Array(update.length));
    return update.length >= value.length ? res : res.concat(new Array(value.length - update.length).fill(void 0));
  }
  return isPlainObject(value) && isPlainObject(update) ? Object.keys({ ...value, ...update }).reduce((acc, key) => {
    let diff = deepDiff(value?.[key], update?.[key]);
    return diff === DEEPLY_EQUAL ? acc : Object.assign(acc, { [key]: diff });
  }, {}) : update;
}, UNTARGETED = "UNTARGETED";
function groupArgsByTarget({
  args,
  argTypes
}) {
  let groupedArgs = {};
  return Object.entries(args).forEach(([name, value]) => {
    let { target = UNTARGETED } = argTypes[name] || {};
    groupedArgs[target] = groupedArgs[target] || {}, groupedArgs[target][name] = value;
  }), groupedArgs;
}

// src/preview-api/modules/store/ArgsStore.ts
function deleteUndefined(obj) {
  return Object.keys(obj).forEach((key) => obj[key] === void 0 && delete obj[key]), obj;
}
var ArgsStore = class {
  constructor() {
    this.initialArgsByStoryId = {};
    this.argsByStoryId = {};
  }
  get(storyId) {
    if (!(storyId in this.argsByStoryId))
      throw new Error(`No args known for ${storyId} -- has it been rendered yet?`);
    return this.argsByStoryId[storyId];
  }
  setInitial(story) {
    if (!this.initialArgsByStoryId[story.id])
      this.initialArgsByStoryId[story.id] = story.initialArgs, this.argsByStoryId[story.id] = story.initialArgs;
    else if (this.initialArgsByStoryId[story.id] !== story.initialArgs) {
      let delta = deepDiff(this.initialArgsByStoryId[story.id], this.argsByStoryId[story.id]);
      this.initialArgsByStoryId[story.id] = story.initialArgs, this.argsByStoryId[story.id] = story.initialArgs, delta !== DEEPLY_EQUAL && this.updateFromDelta(story, delta);
    }
  }
  updateFromDelta(story, delta) {
    let validatedDelta = validateOptions(delta, story.argTypes);
    this.argsByStoryId[story.id] = combineArgs(this.argsByStoryId[story.id], validatedDelta);
  }
  updateFromPersisted(story, persisted) {
    let mappedPersisted = mapArgsToTypes(persisted, story.argTypes);
    return this.updateFromDelta(story, mappedPersisted);
  }
  update(storyId, argsUpdate) {
    if (!(storyId in this.argsByStoryId))
      throw new Error(`No args known for ${storyId} -- has it been rendered yet?`);
    this.argsByStoryId[storyId] = deleteUndefined({
      ...this.argsByStoryId[storyId],
      ...argsUpdate
    });
  }
};

// src/preview-api/modules/store/GlobalsStore.ts
import { logger as logger2 } from "storybook/internal/client-logger";

// src/preview-api/modules/store/csf/getValuesFromArgTypes.ts
var getValuesFromArgTypes = (argTypes = {}) => Object.entries(argTypes).reduce((acc, [arg, { defaultValue }]) => (typeof defaultValue < "u" && (acc[arg] = defaultValue), acc), {});

// src/preview-api/modules/store/GlobalsStore.ts
var GlobalsStore = class {
  constructor({
    globals = {},
    globalTypes = {}
  }) {
    this.set({ globals, globalTypes });
  }
  set({ globals = {}, globalTypes = {} }) {
    let delta = this.initialGlobals && deepDiff(this.initialGlobals, this.globals);
    this.allowedGlobalNames = /* @__PURE__ */ new Set([...Object.keys(globals), ...Object.keys(globalTypes)]);
    let defaultGlobals = getValuesFromArgTypes(globalTypes);
    this.initialGlobals = { ...defaultGlobals, ...globals }, this.globals = this.initialGlobals, delta && delta !== DEEPLY_EQUAL && this.updateFromPersisted(delta);
  }
  filterAllowedGlobals(globals) {
    return Object.entries(globals).reduce((acc, [key, value]) => (this.allowedGlobalNames.has(key) ? acc[key] = value : logger2.warn(
      `Attempted to set a global (${key}) that is not defined in initial globals or globalTypes`
    ), acc), {});
  }
  updateFromPersisted(persisted) {
    let allowedUrlGlobals = this.filterAllowedGlobals(persisted);
    this.globals = { ...this.globals, ...allowedUrlGlobals };
  }
  get() {
    return this.globals;
  }
  update(newGlobals) {
    this.globals = { ...this.globals, ...this.filterAllowedGlobals(newGlobals) };
    for (let key in newGlobals)
      newGlobals[key] === void 0 && (this.globals[key] = this.initialGlobals[key]);
  }
};

// src/preview-api/modules/store/StoryIndexStore.ts
var import_memoizerific = __toESM(require_memoizerific(), 1);
import { MissingStoryAfterHmrError } from "storybook/internal/preview-errors";
var getImportPathMap = (0, import_memoizerific.default)(1)(
  (entries) => Object.values(entries).reduce(
    (acc, entry) => (acc[entry.importPath] = acc[entry.importPath] || entry, acc),
    {}
  )
), StoryIndexStore = class {
  constructor({ entries } = { v: 5, entries: {} }) {
    this.entries = entries;
  }
  entryFromSpecifier(specifier) {
    let entries = Object.values(this.entries);
    if (specifier === "*")
      return entries[0];
    if (typeof specifier == "string")
      return this.entries[specifier] ? this.entries[specifier] : entries.find((entry) => entry.id.startsWith(specifier));
    let { name, title } = specifier;
    return entries.find((entry) => entry.name === name && entry.title === title);
  }
  storyIdToEntry(storyId) {
    let storyEntry = this.entries[storyId];
    if (!storyEntry)
      throw new MissingStoryAfterHmrError({ storyId });
    return storyEntry;
  }
  importPathToEntry(importPath) {
    return getImportPathMap(this.entries)[importPath];
  }
};

// src/preview-api/modules/store/csf/normalizeInputTypes.ts
var normalizeType = (type) => typeof type == "string" ? { name: type } : type, normalizeControl = (control) => typeof control == "string" ? { type: control } : control, normalizeInputType = (inputType, key) => {
  let { type, control, ...rest } = inputType, normalized = {
    name: key,
    ...rest
  };
  return type && (normalized.type = normalizeType(type)), control ? normalized.control = normalizeControl(control) : control === !1 && (normalized.control = { disable: !0 }), normalized;
}, normalizeInputTypes = (inputTypes) => mapValues(inputTypes, normalizeInputType);

// src/preview-api/modules/store/csf/normalizeStory.ts
import { deprecate, logger as logger3 } from "storybook/internal/client-logger";
import { storyNameFromExport, toId } from "storybook/internal/csf";

// src/preview-api/modules/store/csf/normalizeArrays.ts
var normalizeArrays = (array) => Array.isArray(array) ? array : array ? [array] : [];

// src/preview-api/modules/store/csf/normalizeStory.ts
var deprecatedStoryAnnotation = dedent`
CSF .story annotations deprecated; annotate story functions directly:
- StoryFn.story.name => StoryFn.storyName
- StoryFn.story.(parameters|decorators) => StoryFn.(parameters|decorators)
See https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#hoisted-csf-annotations for details and codemod.
`;
function normalizeStory(key, storyAnnotations, meta) {
  let storyObject = storyAnnotations, userStoryFn = typeof storyAnnotations == "function" ? storyAnnotations : null, { story } = storyObject;
  story && (logger3.debug("deprecated story", story), deprecate(deprecatedStoryAnnotation));
  let exportName = storyNameFromExport(key), name = typeof storyObject != "function" && storyObject.name || storyObject.storyName || story?.name || exportName, decorators = [
    ...normalizeArrays(storyObject.decorators),
    ...normalizeArrays(story?.decorators)
  ], parameters = { ...story?.parameters, ...storyObject.parameters }, args = { ...story?.args, ...storyObject.args }, argTypes = { ...story?.argTypes, ...storyObject.argTypes }, loaders = [...normalizeArrays(storyObject.loaders), ...normalizeArrays(story?.loaders)], beforeEach = [
    ...normalizeArrays(storyObject.beforeEach),
    ...normalizeArrays(story?.beforeEach)
  ], afterEach = [
    ...normalizeArrays(storyObject.afterEach),
    ...normalizeArrays(story?.afterEach)
  ], { render, play, tags = [], globals = {} } = storyObject, id = parameters.__id || toId(meta.id, exportName);
  return {
    moduleExport: storyAnnotations,
    id,
    name,
    tags,
    decorators,
    parameters,
    args,
    argTypes: normalizeInputTypes(argTypes),
    loaders,
    beforeEach,
    afterEach,
    globals,
    ...render && { render },
    ...userStoryFn && { userStoryFn },
    ...play && { play }
  };
}

// src/preview-api/modules/store/csf/processCSFFile.ts
import { logger as logger4 } from "storybook/internal/client-logger";
import { getStoryChildren, isExportStory, isStory, toTestId } from "storybook/internal/csf";

// src/preview-api/modules/store/csf/normalizeComponentAnnotations.ts
import { sanitize } from "storybook/internal/csf";
function normalizeComponentAnnotations(defaultExport, title = defaultExport.title, importPath) {
  let { id, argTypes } = defaultExport;
  return {
    id: sanitize(id || title),
    ...defaultExport,
    title,
    ...argTypes && { argTypes: normalizeInputTypes(argTypes) },
    parameters: {
      fileName: importPath,
      ...defaultExport.parameters
    }
  };
}

// src/preview-api/modules/store/csf/processCSFFile.ts
var checkGlobals = (parameters) => {
  let { globals, globalTypes } = parameters;
  (globals || globalTypes) && logger4.error(
    "Global args/argTypes can only be set globally",
    JSON.stringify({
      globals,
      globalTypes
    })
  );
}, checkStorySort = (parameters) => {
  let { options } = parameters;
  options?.storySort && logger4.error("The storySort option parameter can only be set globally");
}, checkDisallowedParameters = (parameters) => {
  parameters && (checkGlobals(parameters), checkStorySort(parameters));
};
function processCSFFile(moduleExports, importPath, title) {
  let { default: defaultExport, __namedExportsOrder, ...namedExports } = moduleExports, factoryStory = Object.values(namedExports).find((it) => isStory(it));
  if (factoryStory) {
    let meta2 = normalizeComponentAnnotations(factoryStory.meta.input, title, importPath);
    checkDisallowedParameters(meta2.parameters);
    let csfFile2 = { meta: meta2, stories: {}, moduleExports };
    return Object.keys(namedExports).forEach((key) => {
      if (isExportStory(key, meta2) && isStory(namedExports[key])) {
        let story = namedExports[key], storyMeta = normalizeStory(key, story.input, meta2);
        checkDisallowedParameters(storyMeta.parameters), csfFile2.stories[storyMeta.id] = storyMeta, getStoryChildren(story).forEach((child) => {
          let name = child.input.name, childId = toTestId(storyMeta.id, name);
          child.input.parameters ??= {}, child.input.parameters.__id = childId, csfFile2.stories[childId] = normalizeStory(name, child.input, meta2);
        });
      }
    }), csfFile2.projectAnnotations = factoryStory.meta.preview.composed, csfFile2;
  }
  let meta = normalizeComponentAnnotations(
    defaultExport,
    title,
    importPath
  );
  checkDisallowedParameters(meta.parameters);
  let csfFile = { meta, stories: {}, moduleExports };
  return Object.keys(namedExports).forEach((key) => {
    if (isExportStory(key, meta)) {
      let storyMeta = normalizeStory(key, namedExports[key], meta);
      checkDisallowedParameters(storyMeta.parameters), csfFile.stories[storyMeta.id] = storyMeta;
    }
  }), csfFile;
}

// src/preview-api/modules/store/csf/prepareStory.ts
import { combineTags, includeConditionalArg } from "storybook/internal/csf";
import { NoRenderFunctionError } from "storybook/internal/preview-errors";
import { global as global3 } from "@storybook/global";
import { global as globalThis2 } from "@storybook/global";

// src/preview-api/modules/preview-web/render/mount-utils.ts
function mountDestructured(playFunction) {
  return playFunction != null && getUsedProps(playFunction).includes("mount");
}
function getUsedProps(fn) {
  let match = fn.toString().match(/[^(]*\(([^)]*)/);
  if (!match)
    return [];
  let args = splitByComma(match[1]);
  if (!args.length)
    return [];
  let first = args[0];
  return first.startsWith("{") && first.endsWith("}") ? splitByComma(first.slice(1, -1).replace(/\s/g, "")).map((prop) => prop.replace(/:.*|=.*/g, "")) : [];
}
function splitByComma(s) {
  let result = [], stack = [], start = 0;
  for (let i = 0; i < s.length; i++)
    if (s[i] === "{" || s[i] === "[")
      stack.push(s[i] === "{" ? "}" : "]");
    else if (s[i] === stack[stack.length - 1])
      stack.pop();
    else if (!stack.length && s[i] === ",") {
      let token = s.substring(start, i).trim();
      token && result.push(token), start = i + 1;
    }
  let lastToken = s.substring(start).trim();
  return lastToken && result.push(lastToken), result;
}

// src/preview-api/modules/store/decorators.ts
function decorateStory(storyFn, decorator, bindWithContext) {
  let boundStoryFunction = bindWithContext(storyFn);
  return (context) => decorator(boundStoryFunction, context);
}
function sanitizeStoryContextUpdate({
  componentId,
  title,
  kind,
  id,
  name,
  story,
  parameters,
  initialArgs,
  argTypes,
  ...update
} = {}) {
  return update;
}
function defaultDecorateStory(storyFn, decorators) {
  let contextStore = {}, bindWithContext = (decoratedStoryFn) => (update) => {
    if (!contextStore.value)
      throw new Error("Decorated function called without init");
    return contextStore.value = {
      ...contextStore.value,
      ...sanitizeStoryContextUpdate(update)
    }, decoratedStoryFn(contextStore.value);
  }, decoratedWithContextStore = decorators.reduce(
    (story, decorator) => decorateStory(story, decorator, bindWithContext),
    storyFn
  );
  return (context) => (contextStore.value = context, decoratedWithContextStore(context));
}

// src/preview-api/modules/store/csf/prepareStory.ts
function prepareStory(storyAnnotations, componentAnnotations, projectAnnotations) {
  let { moduleExport, id, name } = storyAnnotations || {}, partialAnnotations = preparePartialAnnotations(
    storyAnnotations,
    componentAnnotations,
    projectAnnotations
  ), applyLoaders = async (context) => {
    let loaded = {};
    for (let loaders of [
      normalizeArrays(projectAnnotations.loaders),
      normalizeArrays(componentAnnotations.loaders),
      normalizeArrays(storyAnnotations.loaders)
    ]) {
      if (context.abortSignal.aborted)
        return loaded;
      let loadResults = await Promise.all(loaders.map((loader) => loader(context)));
      Object.assign(loaded, ...loadResults);
    }
    return loaded;
  }, applyBeforeEach = async (context) => {
    let cleanupCallbacks = new Array();
    for (let beforeEach of [
      ...normalizeArrays(projectAnnotations.beforeEach),
      ...normalizeArrays(componentAnnotations.beforeEach),
      ...normalizeArrays(storyAnnotations.beforeEach)
    ]) {
      if (context.abortSignal.aborted)
        return cleanupCallbacks;
      let cleanup = await beforeEach(context);
      cleanup && cleanupCallbacks.push(cleanup);
    }
    return cleanupCallbacks;
  }, applyAfterEach = async (context) => {
    let reversedFinalizers = [
      ...normalizeArrays(projectAnnotations.afterEach),
      ...normalizeArrays(componentAnnotations.afterEach),
      ...normalizeArrays(storyAnnotations.afterEach)
    ].reverse();
    for (let finalizer of reversedFinalizers) {
      if (context.abortSignal.aborted)
        return;
      await finalizer(context);
    }
  }, undecoratedStoryFn = (context) => context.originalStoryFn(context.args, context), { applyDecorators = defaultDecorateStory, runStep } = projectAnnotations, decorators = [
    ...normalizeArrays(storyAnnotations?.decorators),
    ...normalizeArrays(componentAnnotations?.decorators),
    ...normalizeArrays(projectAnnotations?.decorators)
  ], render = storyAnnotations?.userStoryFn || storyAnnotations?.render || componentAnnotations.render || projectAnnotations.render, decoratedStoryFn = applyHooks(applyDecorators)(undecoratedStoryFn, decorators), unboundStoryFn = (context) => decoratedStoryFn(context), playFunction = storyAnnotations?.play ?? componentAnnotations?.play, usesMount = mountDestructured(playFunction);
  if (!render && !usesMount)
    throw new NoRenderFunctionError({ id });
  let defaultMount = (context) => async () => (await context.renderToCanvas(), context.canvas), mount = storyAnnotations.mount ?? componentAnnotations.mount ?? projectAnnotations.mount ?? defaultMount, testingLibraryRender = projectAnnotations.testingLibraryRender;
  return {
    storyGlobals: {},
    ...partialAnnotations,
    moduleExport,
    id,
    name,
    story: name,
    originalStoryFn: render,
    undecoratedStoryFn,
    unboundStoryFn,
    applyLoaders,
    applyBeforeEach,
    applyAfterEach,
    playFunction,
    runStep,
    mount,
    testingLibraryRender,
    renderToCanvas: projectAnnotations.renderToCanvas,
    usesMount
  };
}
function prepareMeta(componentAnnotations, projectAnnotations, moduleExport) {
  return {
    ...preparePartialAnnotations(void 0, componentAnnotations, projectAnnotations),
    moduleExport
  };
}
function preparePartialAnnotations(storyAnnotations, componentAnnotations, projectAnnotations) {
  let defaultTags = ["dev", "test"], extraTags = globalThis2.DOCS_OPTIONS?.autodocs === !0 ? ["autodocs"] : [], overrideTags = storyAnnotations?.tags?.includes("test-fn") ? ["!autodocs"] : [], tags = combineTags(
    ...defaultTags,
    ...extraTags,
    ...projectAnnotations.tags ?? [],
    ...componentAnnotations.tags ?? [],
    ...overrideTags,
    ...storyAnnotations?.tags ?? []
  ), parameters = combineParameters(
    projectAnnotations.parameters,
    componentAnnotations.parameters,
    storyAnnotations?.parameters
  ), { argTypesEnhancers = [], argsEnhancers = [] } = projectAnnotations, passedArgTypes = combineParameters(
    projectAnnotations.argTypes,
    componentAnnotations.argTypes,
    storyAnnotations?.argTypes
  );
  if (storyAnnotations) {
    let render = storyAnnotations?.userStoryFn || storyAnnotations?.render || componentAnnotations.render || projectAnnotations.render;
    parameters.__isArgsStory = render && render.length > 0;
  }
  let passedArgs = {
    ...projectAnnotations.args,
    ...componentAnnotations.args,
    ...storyAnnotations?.args
  }, storyGlobals = {
    ...componentAnnotations.globals,
    ...storyAnnotations?.globals
  }, contextForEnhancers = {
    componentId: componentAnnotations.id,
    title: componentAnnotations.title,
    kind: componentAnnotations.title,
    // Back compat
    id: storyAnnotations?.id || componentAnnotations.id,
    // if there's no story name, we create a fake one since enhancers expect a name
    name: storyAnnotations?.name || "__meta",
    story: storyAnnotations?.name || "__meta",
    // Back compat
    component: componentAnnotations.component,
    subcomponents: componentAnnotations.subcomponents,
    tags,
    parameters,
    initialArgs: passedArgs,
    argTypes: passedArgTypes,
    storyGlobals
  };
  contextForEnhancers.argTypes = argTypesEnhancers.reduce(
    (accumulatedArgTypes, enhancer) => enhancer({ ...contextForEnhancers, argTypes: accumulatedArgTypes }),
    contextForEnhancers.argTypes
  );
  let initialArgsBeforeEnhancers = { ...passedArgs };
  contextForEnhancers.initialArgs = [...argsEnhancers].reduce(
    (accumulatedArgs, enhancer) => ({
      ...accumulatedArgs,
      ...enhancer({
        ...contextForEnhancers,
        initialArgs: accumulatedArgs
      })
    }),
    initialArgsBeforeEnhancers
  );
  let { name, story, ...withoutStoryIdentifiers } = contextForEnhancers;
  return withoutStoryIdentifiers;
}
function prepareContext(context) {
  let { args: unmappedArgs } = context, targetedContext = {
    ...context,
    allArgs: void 0,
    argsByTarget: void 0
  };
  if (global3.FEATURES?.argTypeTargetsV7) {
    let argsByTarget = groupArgsByTarget(context);
    targetedContext = {
      ...context,
      allArgs: context.args,
      argsByTarget,
      args: argsByTarget[UNTARGETED] || {}
    };
  }
  let mappedArgs = Object.entries(targetedContext.args).reduce((acc, [key, val]) => {
    if (!targetedContext.argTypes[key]?.mapping)
      return acc[key] = val, acc;
    let mappingFn = (originalValue) => {
      let mapping = targetedContext.argTypes[key].mapping;
      return mapping && originalValue in mapping ? mapping[originalValue] : originalValue;
    };
    return acc[key] = Array.isArray(val) ? val.map(mappingFn) : mappingFn(val), acc;
  }, {}), includedArgs = Object.entries(mappedArgs).reduce((acc, [key, val]) => {
    let argType = targetedContext.argTypes[key] || {};
    return includeConditionalArg(argType, mappedArgs, targetedContext.globals) && (acc[key] = val), acc;
  }, {});
  return { ...targetedContext, unmappedArgs, args: includedArgs };
}

// src/preview-api/modules/store/inferArgTypes.ts
import { logger as logger5 } from "storybook/internal/client-logger";
var inferType = (value, name, visited) => {
  let type = typeof value;
  switch (type) {
    case "boolean":
    case "string":
    case "number":
    case "function":
    case "symbol":
      return { name: type };
    default:
      break;
  }
  return value ? visited.has(value) ? (logger5.warn(dedent`
        We've detected a cycle in arg '${name}'. Args should be JSON-serializable.

        Consider using the mapping feature or fully custom args:
        - Mapping: https://storybook.js.org/docs/writing-stories/args#mapping-to-complex-arg-values
        - Custom args: https://storybook.js.org/docs/essentials/controls#fully-custom-args
      `), { name: "other", value: "cyclic object" }) : (visited.add(value), Array.isArray(value) ? { name: "array", value: value.length > 0 ? inferType(value[0], name, new Set(visited)) : { name: "other", value: "unknown" } } : { name: "object", value: mapValues(value, (field) => inferType(field, name, new Set(visited))) }) : { name: "object", value: {} };
}, inferArgTypes = (context) => {
  let { id, argTypes: userArgTypes = {}, initialArgs = {} } = context, argTypes = mapValues(initialArgs, (arg, key) => ({
    name: key,
    type: inferType(arg, `${id}.${key}`, /* @__PURE__ */ new Set())
  })), userArgTypesNames = mapValues(userArgTypes, (argType, key) => ({
    name: key
  }));
  return combineParameters(argTypes, userArgTypesNames, userArgTypes);
};
inferArgTypes.secondPass = !0;

// src/preview-api/modules/store/inferControls.ts
import { logger as logger6 } from "storybook/internal/client-logger";

// src/preview-api/modules/store/filterArgTypes.ts
var matches = (name, descriptor) => Array.isArray(descriptor) ? descriptor.includes(name) : name.match(descriptor), filterArgTypes = (argTypes, include, exclude) => !include && !exclude ? argTypes : argTypes && pickBy(argTypes, (argType, key) => {
  let name = argType.name || key.toString();
  return !!(!include || matches(name, include)) && (!exclude || !matches(name, exclude));
});

// src/preview-api/modules/store/inferControls.ts
var inferControl = (argType, name, matchers) => {
  let { type, options } = argType;
  if (type) {
    if (matchers.color && matchers.color.test(name)) {
      let controlType = type.name;
      if (controlType === "string")
        return { control: { type: "color" } };
      controlType !== "enum" && logger6.warn(
        `Addon controls: Control of type color only supports string, received "${controlType}" instead`
      );
    }
    if (matchers.date && matchers.date.test(name))
      return { control: { type: "date" } };
    switch (type.name) {
      case "array":
        return { control: { type: "object" } };
      case "boolean":
        return { control: { type: "boolean" } };
      case "string":
        return { control: { type: "text" } };
      case "number":
        return { control: { type: "number" } };
      case "enum": {
        let { value } = type;
        return { control: { type: value?.length <= 5 ? "radio" : "select" }, options: value };
      }
      case "function":
      case "symbol":
        return null;
      default:
        return { control: { type: options ? "select" : "object" } };
    }
  }
}, inferControls = (context) => {
  let {
    argTypes,
    parameters: { __isArgsStory, controls: { include = null, exclude = null, matchers = {} } = {} }
  } = context;
  if (!__isArgsStory)
    return argTypes;
  let filteredArgTypes = filterArgTypes(argTypes, include, exclude), withControls = mapValues(filteredArgTypes, (argType, name) => argType?.type && inferControl(argType, name.toString(), matchers));
  return combineParameters(withControls, filteredArgTypes);
};
inferControls.secondPass = !0;

// src/preview-api/modules/store/csf/normalizeProjectAnnotations.ts
function normalizeProjectAnnotations({
  argTypes,
  globalTypes,
  argTypesEnhancers,
  decorators,
  loaders,
  beforeEach,
  afterEach,
  initialGlobals,
  ...annotations
}) {
  return {
    ...argTypes && { argTypes: normalizeInputTypes(argTypes) },
    ...globalTypes && { globalTypes: normalizeInputTypes(globalTypes) },
    decorators: normalizeArrays(decorators),
    loaders: normalizeArrays(loaders),
    beforeEach: normalizeArrays(beforeEach),
    afterEach: normalizeArrays(afterEach),
    argTypesEnhancers: [
      ...argTypesEnhancers || [],
      inferArgTypes,
      // There's an architectural decision to be made regarding embedded addons in core:
      //
      // Option 1: Keep embedded addons but ensure consistency by moving addon-specific code
      // (like inferControls) to live alongside the addon code itself. This maintains the
      // concept of core addons while improving code organization.
      //
      // Option 2: Fully integrate these addons into core, potentially moving UI components
      // into the manager and treating them as core features rather than addons. This is a
      // bigger architectural change requiring careful consideration.
      //
      // For now, we're keeping inferControls here as we need time to properly evaluate
      // these options and their implications. Some features (like Angular's cleanArgsDecorator)
      // currently rely on this behavior.
      //
      // TODO: Make an architectural decision on the handling of core addons
      inferControls
    ],
    initialGlobals,
    ...annotations
  };
}

// src/preview-api/modules/store/csf/composeConfigs.ts
import { global as global4 } from "@storybook/global";

// src/preview-api/modules/store/csf/beforeAll.ts
var composeBeforeAllHooks = (hooks) => async () => {
  let cleanups2 = [];
  for (let hook of hooks) {
    let cleanup = await hook();
    cleanup && cleanups2.unshift(cleanup);
  }
  return async () => {
    for (let cleanup of cleanups2)
      await cleanup();
  };
};

// src/preview-api/modules/store/csf/stepRunners.ts
function composeStepRunners(stepRunners) {
  return async (label, play, playContext) => {
    await stepRunners.reduceRight(
      (innerPlay, stepRunner) => async () => stepRunner(label, innerPlay, playContext),
      async () => play(playContext)
    )();
  };
}

// src/preview-api/modules/store/csf/composeConfigs.ts
function getField(moduleExportList, field) {
  return moduleExportList.map((xs) => xs.default?.[field] ?? xs[field]).filter(Boolean);
}
function getArrayField(moduleExportList, field, options = {}) {
  return getField(moduleExportList, field).reduce((prev, cur) => {
    let normalized = normalizeArrays(cur);
    return options.reverseFileOrder ? [...normalized, ...prev] : [...prev, ...normalized];
  }, []);
}
function getObjectField(moduleExportList, field) {
  return Object.assign({}, ...getField(moduleExportList, field));
}
function getSingletonField(moduleExportList, field) {
  return getField(moduleExportList, field).pop();
}
function composeConfigs(moduleExportList) {
  let allArgTypeEnhancers = getArrayField(moduleExportList, "argTypesEnhancers"), stepRunners = getField(moduleExportList, "runStep"), beforeAllHooks = getArrayField(moduleExportList, "beforeAll");
  return {
    parameters: combineParameters(...getField(moduleExportList, "parameters")),
    decorators: getArrayField(moduleExportList, "decorators", {
      reverseFileOrder: !(global4.FEATURES?.legacyDecoratorFileOrder ?? !1)
    }),
    args: getObjectField(moduleExportList, "args"),
    argsEnhancers: getArrayField(moduleExportList, "argsEnhancers"),
    argTypes: getObjectField(moduleExportList, "argTypes"),
    argTypesEnhancers: [
      ...allArgTypeEnhancers.filter((e) => !e.secondPass),
      ...allArgTypeEnhancers.filter((e) => e.secondPass)
    ],
    initialGlobals: getObjectField(moduleExportList, "initialGlobals"),
    globalTypes: getObjectField(moduleExportList, "globalTypes"),
    loaders: getArrayField(moduleExportList, "loaders"),
    beforeAll: composeBeforeAllHooks(beforeAllHooks),
    beforeEach: getArrayField(moduleExportList, "beforeEach"),
    afterEach: getArrayField(moduleExportList, "afterEach"),
    render: getSingletonField(moduleExportList, "render"),
    renderToCanvas: getSingletonField(moduleExportList, "renderToCanvas"),
    applyDecorators: getSingletonField(moduleExportList, "applyDecorators"),
    runStep: composeStepRunners(stepRunners),
    tags: getArrayField(moduleExportList, "tags"),
    mount: getSingletonField(moduleExportList, "mount"),
    testingLibraryRender: getSingletonField(moduleExportList, "testingLibraryRender")
  };
}

// src/preview-api/modules/store/csf/portable-stories.ts
import { isExportStory as isExportStory2 } from "storybook/internal/csf";
import { getCoreAnnotations } from "storybook/internal/csf";
import { MountMustBeDestructuredError } from "storybook/internal/preview-errors";

// src/preview-api/modules/store/reporter-api.ts
var ReporterAPI = class {
  constructor() {
    this.reports = [];
  }
  async addReport(report) {
    this.reports.push(report);
  }
};

// src/preview-api/modules/store/csf/csf-factory-utils.ts
import { isMeta, isStory as isStory2 } from "storybook/internal/csf";
function getCsfFactoryAnnotations(story, meta, projectAnnotations) {
  return isStory2(story) ? {
    story: story.input,
    meta: story.meta.input,
    preview: story.meta.preview.composed
  } : { story, meta: isMeta(meta) ? meta.input : meta, preview: projectAnnotations };
}

// src/preview-api/modules/store/csf/portable-stories.ts
function setDefaultProjectAnnotations(_defaultProjectAnnotations) {
  globalThis.defaultProjectAnnotations = _defaultProjectAnnotations;
}
var DEFAULT_STORY_TITLE = "ComposedStory", DEFAULT_STORY_NAME = "Unnamed Story";
function extractAnnotation(annotation) {
  return annotation ? composeConfigs([annotation]) : {};
}
function setProjectAnnotations(projectAnnotations) {
  let annotations = Array.isArray(projectAnnotations) ? projectAnnotations : [projectAnnotations];
  return globalThis.globalProjectAnnotations = composeConfigs([
    ...getCoreAnnotations(),
    globalThis.defaultProjectAnnotations ?? {},
    composeConfigs(annotations.map(extractAnnotation))
  ]), globalThis.globalProjectAnnotations ?? {};
}
var cleanups = [];
function composeStory(storyAnnotations, componentAnnotations, projectAnnotations, defaultConfig, exportsName) {
  if (storyAnnotations === void 0)
    throw new Error("Expected a story but received undefined.");
  componentAnnotations.title = componentAnnotations.title ?? DEFAULT_STORY_TITLE;
  let normalizedComponentAnnotations = normalizeComponentAnnotations(componentAnnotations), storyName = exportsName || storyAnnotations.storyName || storyAnnotations.story?.name || storyAnnotations.name || DEFAULT_STORY_NAME, normalizedStory = normalizeStory(
    storyName,
    storyAnnotations,
    normalizedComponentAnnotations
  ), normalizedProjectAnnotations = normalizeProjectAnnotations(
    composeConfigs([
      defaultConfig ?? globalThis.globalProjectAnnotations ?? {},
      projectAnnotations ?? {}
    ])
  ), story = prepareStory(
    normalizedStory,
    normalizedComponentAnnotations,
    normalizedProjectAnnotations
  ), globals = {
    ...getValuesFromArgTypes(normalizedProjectAnnotations.globalTypes),
    ...normalizedProjectAnnotations.initialGlobals,
    ...story.storyGlobals
  }, reporting = new ReporterAPI(), initializeContext = () => {
    let context = prepareContext({
      hooks: new HooksContext(),
      globals,
      args: { ...story.initialArgs },
      viewMode: "story",
      reporting,
      loaded: {},
      abortSignal: new AbortController().signal,
      step: (label, play2) => story.runStep(label, play2, context),
      canvasElement: null,
      canvas: {},
      userEvent: {},
      globalTypes: normalizedProjectAnnotations.globalTypes,
      ...story,
      context: null,
      mount: null
    });
    return context.parameters.__isPortableStory = !0, context.context = context, story.renderToCanvas && (context.renderToCanvas = async () => {
      let unmount = await story.renderToCanvas?.(
        {
          componentId: story.componentId,
          title: story.title,
          id: story.id,
          name: story.name,
          tags: story.tags,
          showMain: () => {
          },
          showError: (error) => {
            throw new Error(`${error.title}
${error.description}`);
          },
          showException: (error) => {
            throw error;
          },
          forceRemount: !0,
          storyContext: context,
          storyFn: () => story.unboundStoryFn(context),
          unboundStoryFn: story.unboundStoryFn
        },
        context.canvasElement
      );
      unmount && cleanups.push(unmount);
    }), context.mount = story.mount(context), context;
  }, loadedContext, play = async (extraContext) => {
    let context = initializeContext();
    return context.canvasElement ??= globalThis?.document?.body, loadedContext && (context.loaded = loadedContext.loaded), Object.assign(context, extraContext), story.playFunction(context);
  }, run = (extraContext) => {
    let context = initializeContext();
    return Object.assign(context, extraContext), runStory(story, context);
  }, playFunction = story.playFunction ? play : void 0;
  return Object.assign(
    function(extraArgs) {
      let context = initializeContext();
      return loadedContext && (context.loaded = loadedContext.loaded), context.args = {
        ...context.initialArgs,
        ...extraArgs
      }, story.unboundStoryFn(context);
    },
    {
      id: story.id,
      storyName,
      load: async () => {
        for (let callback of [...cleanups].reverse())
          await callback();
        cleanups.length = 0;
        let context = initializeContext();
        context.loaded = await story.applyLoaders(context), cleanups.push(...(await story.applyBeforeEach(context)).filter(Boolean)), loadedContext = context;
      },
      globals,
      args: story.initialArgs,
      parameters: story.parameters,
      argTypes: story.argTypes,
      play: playFunction,
      run,
      reporting,
      tags: story.tags
    }
  );
}
var defaultComposeStory = (story, component, project, exportsName) => composeStory(story, component, project, {}, exportsName);
function composeStories(storiesImport, globalConfig, composeStoryFn = defaultComposeStory) {
  let { default: metaExport, __esModule, __namedExportsOrder, ...stories } = storiesImport, meta = metaExport;
  return Object.entries(stories).reduce(
    (storiesMap, [exportsName, story]) => {
      let { story: storyAnnotations, meta: componentAnnotations } = getCsfFactoryAnnotations(story);
      return !meta && componentAnnotations && (meta = componentAnnotations), isExportStory2(exportsName, meta) ? Object.assign(storiesMap, {
        [exportsName]: composeStoryFn(storyAnnotations, meta, globalConfig, exportsName)
      }) : storiesMap;
    },
    {}
  );
}
function createPlaywrightTest(baseTest) {
  return baseTest.extend({
    mount: async ({ mount, page }, use) => {
      await use(async (storyRef, ...restArgs) => {
        if (!("__pw_type" in storyRef) || "__pw_type" in storyRef && storyRef.__pw_type !== "jsx")
          throw new Error(dedent`
              Portable stories in Playwright CT only work when referencing JSX elements.
              Please use JSX format for your components such as:

              instead of:
              await mount(MyComponent, { props: { foo: 'bar' } })

              do:
              await mount(<MyComponent foo="bar"/>)

              More info: https://storybook.js.org/docs/api/portable-stories/portable-stories-playwright?ref=error
            `);
        let { props, ...storyRefWithoutProps } = storyRef;
        await page.evaluate(async (wrappedStoryRef) => {
          let unwrappedStoryRef = await globalThis.__pwUnwrapObject?.(wrappedStoryRef);
          return ("__pw_type" in unwrappedStoryRef ? unwrappedStoryRef.type : unwrappedStoryRef)?.load?.();
        }, storyRefWithoutProps);
        let mountResult = await mount(storyRef, ...restArgs);
        return await page.evaluate(async (wrappedStoryRef) => {
          let unwrappedStoryRef = await globalThis.__pwUnwrapObject?.(wrappedStoryRef), story = "__pw_type" in unwrappedStoryRef ? unwrappedStoryRef.type : unwrappedStoryRef, canvasElement = document.querySelector("#root");
          return story?.play?.({ canvasElement });
        }, storyRefWithoutProps), mountResult;
      });
    }
  });
}
async function runStory(story, context) {
  for (let callback of [...cleanups].reverse())
    await callback();
  if (cleanups.length = 0, !context.canvasElement) {
    let container = document.createElement("div");
    globalThis?.document?.body?.appendChild(container), context.canvasElement = container, cleanups.push(() => {
      globalThis?.document?.body?.contains(container) && globalThis?.document?.body?.removeChild(container);
    });
  }
  if (context.loaded = await story.applyLoaders(context), context.abortSignal.aborted)
    return;
  cleanups.push(...(await story.applyBeforeEach(context)).filter(Boolean));
  let playFunction = story.playFunction, isMountDestructured = story.usesMount;
  if (isMountDestructured || await context.mount(), context.abortSignal.aborted)
    return;
  playFunction && (isMountDestructured || (context.mount = async () => {
    throw new MountMustBeDestructuredError({ playFunction: playFunction.toString() });
  }), await playFunction(context));
  let cleanUp;
  isTestEnvironment() ? cleanUp = pauseAnimations() : await waitForAnimations(context.abortSignal), await story.applyAfterEach(context), await cleanUp?.();
}

// src/preview-api/modules/store/StoryStore.ts
var CSF_CACHE_SIZE = 1e3, STORY_CACHE_SIZE = 1e4, StoryStore = class {
  constructor(storyIndex, importFn, projectAnnotations) {
    this.importFn = importFn;
    this.storyIndex = new StoryIndexStore(storyIndex), this.projectAnnotations = normalizeProjectAnnotations(
      composeConfigs([...getCoreAnnotations2(), projectAnnotations])
    );
    let { initialGlobals, globalTypes } = this.projectAnnotations;
    this.args = new ArgsStore(), this.userGlobals = new GlobalsStore({ globals: initialGlobals, globalTypes }), this.hooks = {}, this.cleanupCallbacks = {}, this.processCSFFileWithCache = (0, import_memoizerific2.default)(CSF_CACHE_SIZE)(processCSFFile), this.prepareMetaWithCache = (0, import_memoizerific2.default)(CSF_CACHE_SIZE)(prepareMeta), this.prepareStoryWithCache = (0, import_memoizerific2.default)(STORY_CACHE_SIZE)(prepareStory);
  }
  setProjectAnnotations(projectAnnotations) {
    this.projectAnnotations = normalizeProjectAnnotations(projectAnnotations);
    let { initialGlobals, globalTypes } = projectAnnotations;
    this.userGlobals.set({ globals: initialGlobals, globalTypes });
  }
  // This means that one of the CSF files has changed.
  // If the `importFn` has changed, we will invalidate both caches.
  // If the `storyIndex` data has changed, we may or may not invalidate the caches, depending
  // on whether we've loaded the relevant files yet.
  async onStoriesChanged({
    importFn,
    storyIndex
  }) {
    importFn && (this.importFn = importFn), storyIndex && (this.storyIndex.entries = storyIndex.entries), this.cachedCSFFiles && await this.cacheAllCSFFiles();
  }
  // Get an entry from the index, waiting on initialization if necessary
  async storyIdToEntry(storyId) {
    return this.storyIndex.storyIdToEntry(storyId);
  }
  // To load a single CSF file to service a story we need to look up the importPath in the index
  async loadCSFFileByStoryId(storyId) {
    let { importPath, title } = this.storyIndex.storyIdToEntry(storyId), moduleExports = await this.importFn(importPath);
    return this.processCSFFileWithCache(moduleExports, importPath, title);
  }
  async loadAllCSFFiles() {
    let importPaths = {};
    return Object.entries(this.storyIndex.entries).forEach(([storyId, { importPath }]) => {
      importPaths[importPath] = storyId;
    }), (await Promise.all(
      Object.entries(importPaths).map(async ([importPath, storyId]) => ({
        importPath,
        csfFile: await this.loadCSFFileByStoryId(storyId)
      }))
    )).reduce(
      (acc, { importPath, csfFile }) => (acc[importPath] = csfFile, acc),
      {}
    );
  }
  async cacheAllCSFFiles() {
    this.cachedCSFFiles = await this.loadAllCSFFiles();
  }
  preparedMetaFromCSFFile({ csfFile }) {
    let componentAnnotations = csfFile.meta;
    return this.prepareMetaWithCache(
      componentAnnotations,
      this.projectAnnotations,
      csfFile.moduleExports.default
    );
  }
  // Load the CSF file for a story and prepare the story from it and the project annotations.
  async loadStory({ storyId }) {
    let csfFile = await this.loadCSFFileByStoryId(storyId);
    return this.storyFromCSFFile({ storyId, csfFile });
  }
  // This function is synchronous for convenience -- often times if you have a CSF file already
  // it is easier not to have to await `loadStory`.
  storyFromCSFFile({
    storyId,
    csfFile
  }) {
    let storyAnnotations = csfFile.stories[storyId];
    if (!storyAnnotations)
      throw new MissingStoryFromCsfFileError({ storyId });
    let componentAnnotations = csfFile.meta, story = this.prepareStoryWithCache(
      storyAnnotations,
      componentAnnotations,
      csfFile.projectAnnotations ?? this.projectAnnotations
    );
    return this.args.setInitial(story), this.hooks[story.id] = this.hooks[story.id] || new HooksContext(), story;
  }
  // If we have a CSF file we can get all the stories from it synchronously
  componentStoriesFromCSFFile({
    csfFile
  }) {
    return Object.keys(this.storyIndex.entries).filter((storyId) => !!csfFile.stories[storyId]).map((storyId) => this.storyFromCSFFile({ storyId, csfFile }));
  }
  async loadEntry(id) {
    let entry = await this.storyIdToEntry(id), storyImports = entry.type === "docs" ? entry.storiesImports : [], [entryExports, ...csfFiles] = await Promise.all([
      this.importFn(entry.importPath),
      ...storyImports.map((storyImportPath) => {
        let firstStoryEntry = this.storyIndex.importPathToEntry(storyImportPath);
        return this.loadCSFFileByStoryId(firstStoryEntry.id);
      })
    ]);
    return { entryExports, csfFiles };
  }
  // A prepared story does not include args, globals or hooks. These are stored in the story store
  // and updated separately to the (immutable) story.
  getStoryContext(story, { forceInitialArgs = !1 } = {}) {
    let userGlobals = this.userGlobals.get(), { initialGlobals } = this.userGlobals, reporting = new ReporterAPI();
    return prepareContext({
      ...story,
      args: forceInitialArgs ? story.initialArgs : this.args.get(story.id),
      initialGlobals,
      globalTypes: this.projectAnnotations.globalTypes,
      userGlobals,
      reporting,
      globals: {
        ...userGlobals,
        ...story.storyGlobals
      },
      hooks: this.hooks[story.id]
    });
  }
  addCleanupCallbacks(story, ...callbacks) {
    this.cleanupCallbacks[story.id] = (this.cleanupCallbacks[story.id] || []).concat(callbacks);
  }
  async cleanupStory(story) {
    this.hooks[story.id].clean();
    let callbacks = this.cleanupCallbacks[story.id];
    if (callbacks)
      for (let callback of [...callbacks].reverse())
        await callback();
    delete this.cleanupCallbacks[story.id];
  }
  extract(options = { includeDocsOnly: !1 }) {
    let { cachedCSFFiles } = this;
    if (console.log("extract: extracting stories", cachedCSFFiles), !cachedCSFFiles)
      throw new CalledExtractOnStoreError();
    let stories = Object.entries(this.storyIndex.entries).reduce(
      (acc, [storyId, entry]) => {
        if (entry.type === "docs")
          return acc;
        let csfFile = cachedCSFFiles[entry.importPath], story = this.storyFromCSFFile({ storyId, csfFile });
        return !options.includeDocsOnly && story.parameters.docsOnly || (acc[storyId] = Object.entries(story).reduce(
          (storyAcc, [key, value]) => key === "story" && entry.subtype === "test" ? { ...storyAcc, story: entry.parentName } : key === "moduleExport" || typeof value == "function" ? storyAcc : Array.isArray(value) ? Object.assign(storyAcc, { [key]: value.slice().sort() }) : Object.assign(storyAcc, { [key]: value }),
          {
            args: story.initialArgs,
            globals: {
              ...this.userGlobals.initialGlobals,
              ...this.userGlobals.globals,
              ...story.storyGlobals
            },
            storyId: entry.parent ? entry.parent : storyId
          }
        )), acc;
      },
      {}
    );
    return console.log("extract: stories", stories), stories;
  }
};

// src/preview-api/modules/store/autoTitle.ts
import { once as once2 } from "storybook/internal/client-logger";

// ../node_modules/slash/index.js
function slash(path) {
  return path.startsWith("\\\\?\\") ? path : path.replace(/\\/g, "/");
}

// src/preview-api/modules/store/autoTitle.ts
var sanitize2 = (parts) => {
  if (parts.length === 0)
    return parts;
  let last = parts[parts.length - 1], lastStripped = last?.replace(/(?:[.](?:story|stories))?([.][^.]+)$/i, "");
  if (parts.length === 1)
    return [lastStripped];
  let nextToLast = parts[parts.length - 2];
  return lastStripped && nextToLast && lastStripped.toLowerCase() === nextToLast.toLowerCase() ? [...parts.slice(0, -2), lastStripped] : lastStripped && (/^(story|stories)([.][^.]+)$/i.test(last) || /^index$/i.test(lastStripped)) ? parts.slice(0, -1) : [...parts.slice(0, -1), lastStripped];
};
function pathJoin(paths) {
  return paths.flatMap((p) => p.split("/")).filter(Boolean).join("/");
}
var userOrAutoTitleFromSpecifier = (fileName, entry, userTitle) => {
  let { directory, importPathMatcher, titlePrefix = "" } = entry || {};
  typeof fileName == "number" && once2.warn(dedent`
      CSF Auto-title received a numeric fileName. This typically happens when
      webpack is mis-configured in production mode. To force webpack to produce
      filenames, set optimization.moduleIds = "named" in your webpack config.
    `);
  let normalizedFileName = slash(String(fileName));
  if (importPathMatcher.exec(normalizedFileName)) {
    if (!userTitle) {
      let suffix = normalizedFileName.replace(directory, ""), parts = pathJoin([titlePrefix, suffix]).split("/");
      return parts = sanitize2(parts), parts.join("/");
    }
    return titlePrefix ? pathJoin([titlePrefix, userTitle]) : userTitle;
  }
}, userOrAutoTitle = (fileName, storiesEntries, userTitle) => {
  for (let i = 0; i < storiesEntries.length; i += 1) {
    let title = userOrAutoTitleFromSpecifier(fileName, storiesEntries[i], userTitle);
    if (title)
      return title;
  }
  return userTitle || void 0;
};

// src/preview-api/modules/store/storySort.ts
var STORY_KIND_PATH_SEPARATOR = /\s*\/\s*/, storySort = (options = {}) => (a, b) => {
  if (a.title === b.title && !options.includeNames)
    return 0;
  let method = options.method || "configure", order = options.order || [], storyTitleA = a.title.trim().split(STORY_KIND_PATH_SEPARATOR), storyTitleB = b.title.trim().split(STORY_KIND_PATH_SEPARATOR);
  options.includeNames && (storyTitleA.push(a.name), storyTitleB.push(b.name));
  let depth = 0;
  for (; storyTitleA[depth] || storyTitleB[depth]; ) {
    if (!storyTitleA[depth])
      return -1;
    if (!storyTitleB[depth])
      return 1;
    let nameA = storyTitleA[depth], nameB = storyTitleB[depth];
    if (nameA !== nameB) {
      let indexA = order.indexOf(nameA), indexB = order.indexOf(nameB), indexWildcard = order.indexOf("*");
      return indexA !== -1 || indexB !== -1 ? (indexA === -1 && (indexWildcard !== -1 ? indexA = indexWildcard : indexA = order.length), indexB === -1 && (indexWildcard !== -1 ? indexB = indexWildcard : indexB = order.length), indexA - indexB) : method === "configure" ? 0 : nameA.localeCompare(nameB, options.locales ? options.locales : void 0, {
        numeric: !0,
        sensitivity: "accent"
      });
    }
    let index = order.indexOf(nameA);
    index === -1 && (index = order.indexOf("*")), order = index !== -1 && Array.isArray(order[index + 1]) ? order[index + 1] : [], depth += 1;
  }
  return 0;
};

// src/preview-api/modules/store/sortStories.ts
var sortStoriesCommon = (stories, storySortParameter, fileNameOrder) => {
  if (storySortParameter) {
    let sortFn;
    typeof storySortParameter == "function" ? sortFn = storySortParameter : sortFn = storySort(storySortParameter), stories.sort(sortFn);
  } else
    stories.sort(
      (s1, s2) => fileNameOrder.indexOf(s1.importPath) - fileNameOrder.indexOf(s2.importPath)
    );
  return stories;
}, sortStoriesV7 = (stories, storySortParameter, fileNameOrder) => {
  try {
    return sortStoriesCommon(stories, storySortParameter, fileNameOrder);
  } catch (err) {
    throw new Error(dedent`
    Error sorting stories with sort parameter ${storySortParameter}:

    > ${err.message}

    Are you using a V6-style sort function in V7 mode?

    More info: https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#v7-style-story-sort
  `);
  }
};

// src/preview-api/modules/preview-web/Preview.tsx
import { deprecate as deprecate2, logger as logger7 } from "storybook/internal/client-logger";
import {
  ARGTYPES_INFO_REQUEST,
  ARGTYPES_INFO_RESPONSE,
  CONFIG_ERROR,
  FORCE_REMOUNT,
  FORCE_RE_RENDER as FORCE_RE_RENDER2,
  GLOBALS_UPDATED,
  PREVIEW_INITIALIZED,
  RESET_STORY_ARGS as RESET_STORY_ARGS2,
  SET_GLOBALS,
  STORY_ARGS_UPDATED,
  STORY_HOT_UPDATED,
  STORY_INDEX_INVALIDATED,
  UPDATE_GLOBALS as UPDATE_GLOBALS2,
  UPDATE_STORY_ARGS as UPDATE_STORY_ARGS2
} from "storybook/internal/core-events";
import {
  CalledPreviewMethodBeforeInitializationError,
  MissingRenderToCanvasError,
  StoryIndexFetchError,
  StoryStoreAccessedBeforeInitializationError
} from "storybook/internal/preview-errors";
import { global as global5 } from "@storybook/global";

// src/preview-api/modules/preview-web/render/StoryRender.ts
import {
  PLAY_FUNCTION_THREW_EXCEPTION,
  STORY_FINISHED,
  STORY_RENDERED as STORY_RENDERED2,
  STORY_RENDER_PHASE_CHANGED,
  UNHANDLED_ERRORS_WHILE_PLAYING
} from "storybook/internal/core-events";
import {
  MountMustBeDestructuredError as MountMustBeDestructuredError2,
  NoStoryMountedError
} from "storybook/internal/preview-errors";

// src/preview-api/modules/preview-web/render/Render.ts
var PREPARE_ABORTED = new Error("prepareAborted");

// src/preview-api/modules/preview-web/render/StoryRender.ts
var { AbortController: AbortController2 } = globalThis;
function serializeError(error) {
  try {
    let { name = "Error", message = String(error), stack } = error;
    return { name, message, stack };
  } catch {
    return { name: "Error", message: String(error) };
  }
}
var StoryRender = class {
  constructor(channel, store, renderToScreen, callbacks, id, viewMode, renderOptions = { autoplay: !0, forceInitialArgs: !1 }, story) {
    this.channel = channel;
    this.store = store;
    this.renderToScreen = renderToScreen;
    this.callbacks = callbacks;
    this.id = id;
    this.viewMode = viewMode;
    this.renderOptions = renderOptions;
    this.type = "story";
    this.notYetRendered = !0;
    this.rerenderEnqueued = !1;
    this.disableKeyListeners = !1;
    this.teardownRender = () => {
    };
    this.torndown = !1;
    this.abortController = new AbortController2(), this.renderId = Date.now(), story && (this.story = story, this.phase = "preparing");
  }
  async runPhase(signal, phase, phaseFn) {
    this.phase = phase, this.channel.emit(STORY_RENDER_PHASE_CHANGED, {
      newPhase: this.phase,
      renderId: this.renderId,
      storyId: this.id
    }), phaseFn && (await phaseFn(), this.checkIfAborted(signal));
  }
  checkIfAborted(signal) {
    return signal.aborted && !["finished", "aborted", "errored"].includes(this.phase) && (this.phase = "aborted", this.channel.emit(STORY_RENDER_PHASE_CHANGED, {
      newPhase: this.phase,
      renderId: this.renderId,
      storyId: this.id
    })), signal.aborted;
  }
  async prepare() {
    if (await this.runPhase(this.abortController.signal, "preparing", async () => {
      this.story = await this.store.loadStory({ storyId: this.id });
    }), this.abortController.signal.aborted)
      throw await this.store.cleanupStory(this.story), PREPARE_ABORTED;
  }
  // The two story "renders" are equal and have both loaded the same story
  isEqual(other) {
    return !!(this.id === other.id && this.story && this.story === other.story);
  }
  isPreparing() {
    return ["preparing"].includes(this.phase);
  }
  isPending() {
    return ["loading", "beforeEach", "rendering", "playing", "afterEach"].includes(
      this.phase
    );
  }
  async renderToElement(canvasElement) {
    return this.canvasElement = canvasElement, this.render({ initial: !0, forceRemount: !0 });
  }
  storyContext() {
    if (!this.story)
      throw new Error("Cannot call storyContext before preparing");
    let { forceInitialArgs } = this.renderOptions;
    return this.store.getStoryContext(this.story, { forceInitialArgs });
  }
  async render({
    initial = !1,
    forceRemount = !1
  } = {}) {
    let { canvasElement } = this;
    if (!this.story)
      throw new Error("cannot render when not prepared");
    let story = this.story;
    if (!canvasElement)
      throw new Error("cannot render when canvasElement is unset");
    let {
      id,
      componentId,
      title,
      name,
      tags,
      applyLoaders,
      applyBeforeEach,
      applyAfterEach,
      unboundStoryFn,
      playFunction,
      runStep
    } = story;
    forceRemount && !initial && (this.cancelRender(), this.abortController = new AbortController2());
    let abortSignal = this.abortController.signal, mounted = !1, isMountDestructured = story.usesMount;
    try {
      let context = {
        ...this.storyContext(),
        viewMode: this.viewMode,
        abortSignal,
        canvasElement,
        loaded: {},
        step: (label, play) => runStep(label, play, context),
        context: null,
        canvas: {},
        userEvent: {},
        renderToCanvas: async () => {
          let teardown = await this.renderToScreen(renderContext, canvasElement);
          this.teardownRender = teardown || (() => {
          }), mounted = !0;
        },
        // The story provides (set in a renderer) a mount function that is a higher order function
        // (context) => (...args) => Canvas
        //
        // Before assigning it to the context, we resolve the context dependency,
        // so that a user can just call it as await mount(...args) in their play function.
        mount: async (...args) => {
          this.callbacks.showStoryDuringRender?.();
          let mountReturn = null;
          return await this.runPhase(abortSignal, "rendering", async () => {
            mountReturn = await story.mount(context)(...args);
          }), isMountDestructured && await this.runPhase(abortSignal, "playing"), mountReturn;
        }
      };
      context.context = context;
      let renderContext = {
        componentId,
        title,
        kind: title,
        id,
        name,
        story: name,
        tags,
        ...this.callbacks,
        showError: (error) => (this.phase = "errored", this.callbacks.showError(error)),
        showException: (error) => (this.phase = "errored", this.callbacks.showException(error)),
        forceRemount: forceRemount || this.notYetRendered,
        storyContext: context,
        storyFn: () => unboundStoryFn(context),
        unboundStoryFn
      };
      if (await this.runPhase(abortSignal, "loading", async () => {
        context.loaded = await applyLoaders(context);
      }), abortSignal.aborted)
        return;
      let cleanupCallbacks = await applyBeforeEach(context);
      if (this.store.addCleanupCallbacks(story, ...cleanupCallbacks), this.checkIfAborted(abortSignal) || (!mounted && !isMountDestructured && await context.mount(), this.notYetRendered = !1, abortSignal.aborted))
        return;
      let ignoreUnhandledErrors = this.story.parameters?.test?.dangerouslyIgnoreUnhandledErrors === !0, unhandledErrors = /* @__PURE__ */ new Set(), onError = (event) => {
        event.error && unhandledErrors.add(event.error);
      }, onUnhandledRejection = (event) => {
        event.reason && unhandledErrors.add(event.reason);
      };
      if (this.renderOptions.autoplay && forceRemount && playFunction && this.phase !== "errored") {
        window?.addEventListener?.("error", onError), window?.addEventListener?.("unhandledrejection", onUnhandledRejection), this.disableKeyListeners = !0;
        try {
          if (isMountDestructured ? await playFunction(context) : (context.mount = async () => {
            throw new MountMustBeDestructuredError2({ playFunction: playFunction.toString() });
          }, await this.runPhase(abortSignal, "playing", async () => playFunction(context))), !mounted)
            throw new NoStoryMountedError();
          this.checkIfAborted(abortSignal), !ignoreUnhandledErrors && unhandledErrors.size > 0 ? await this.runPhase(abortSignal, "errored") : await this.runPhase(abortSignal, "played");
        } catch (error) {
          if (this.callbacks.showStoryDuringRender?.(), await this.runPhase(abortSignal, "errored", async () => {
            this.channel.emit(PLAY_FUNCTION_THREW_EXCEPTION, serializeError(error));
          }), this.story.parameters.throwPlayFunctionExceptions !== !1)
            throw error;
          console.error(error);
        }
        if (!ignoreUnhandledErrors && unhandledErrors.size > 0 && this.channel.emit(
          UNHANDLED_ERRORS_WHILE_PLAYING,
          Array.from(unhandledErrors).map(serializeError)
        ), this.disableKeyListeners = !1, window?.removeEventListener?.("unhandledrejection", onUnhandledRejection), window?.removeEventListener?.("error", onError), abortSignal.aborted)
          return;
      }
      await this.runPhase(abortSignal, "completing", async () => {
        isTestEnvironment() ? this.store.addCleanupCallbacks(story, pauseAnimations()) : await waitForAnimations(abortSignal);
      }), await this.runPhase(abortSignal, "completed", async () => {
        this.channel.emit(STORY_RENDERED2, id);
      }), this.phase !== "errored" && await this.runPhase(abortSignal, "afterEach", async () => {
        await applyAfterEach(context);
      });
      let hasUnhandledErrors = !ignoreUnhandledErrors && unhandledErrors.size > 0, hasSomeReportsFailed = context.reporting.reports.some(
        (report) => report.status === "failed"
      ), hasStoryErrored = hasUnhandledErrors || hasSomeReportsFailed;
      await this.runPhase(
        abortSignal,
        "finished",
        async () => this.channel.emit(STORY_FINISHED, {
          storyId: id,
          status: hasStoryErrored ? "error" : "success",
          reporters: context.reporting.reports
        })
      );
    } catch (err) {
      this.phase = "errored", this.callbacks.showException(err), await this.runPhase(
        abortSignal,
        "finished",
        async () => this.channel.emit(STORY_FINISHED, {
          storyId: id,
          status: "error",
          reporters: []
        })
      );
    }
    this.rerenderEnqueued && (this.rerenderEnqueued = !1, this.render());
  }
  /**
   * Rerender the story. If the story is currently pending (loading/rendering), the rerender will be
   * enqueued, and will be executed after the current render is completed. Rerendering while playing
   * will not be enqueued, and will be executed immediately, to support rendering args changes while
   * playing.
   */
  async rerender() {
    if (this.isPending() && this.phase !== "playing")
      this.rerenderEnqueued = !0;
    else
      return this.render();
  }
  async remount() {
    return await this.teardown(), this.render({ forceRemount: !0 });
  }
  // If the story is torn down (either a new story is rendered or the docs page removes it)
  // we need to consider the fact that the initial render may not be finished
  // (possibly the loaders or the play function are still running). We use the controller
  // as a method to abort them, ASAP, but this is not foolproof as we cannot control what
  // happens inside the user's code.
  cancelRender() {
    this.abortController.abort();
  }
  cancelPlayFunction() {
    this.phase === "playing" && (this.abortController.abort(), this.runPhase(this.abortController.signal, "aborted"));
  }
  async teardown() {
    this.torndown = !0, this.cancelRender(), this.story && await this.store.cleanupStory(this.story);
    for (let i = 0; i < 3; i += 1) {
      if (!this.isPending()) {
        await this.teardownRender();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    window?.location?.reload?.(), await new Promise(() => {
    });
  }
};

// src/preview-api/modules/preview-web/Preview.tsx
var { fetch } = global5, STORY_INDEX_PATH = "./index.json", Preview = class {
  constructor(importFn, getProjectAnnotations, channel = addons.getChannel(), shouldInitialize = !0) {
    this.importFn = importFn;
    this.getProjectAnnotations = getProjectAnnotations;
    this.channel = channel;
    this.storyRenders = [];
    this.storeInitializationPromise = new Promise((resolve, reject) => {
      this.resolveStoreInitializationPromise = resolve, this.rejectStoreInitializationPromise = reject;
    }), shouldInitialize && this.initialize();
  }
  // Create a proxy object for `__STORYBOOK_STORY_STORE__` and `__STORYBOOK_PREVIEW__.storyStore`
  // That proxies through to the store once ready, and errors beforehand. This means we can set
  // `__STORYBOOK_STORY_STORE__ = __STORYBOOK_PREVIEW__.storyStore` without having to wait, and
  // similarly integrators can access the `storyStore` on the preview at any time, although
  // it is considered deprecated and we will no longer allow access in 9.0
  get storyStore() {
    return new Proxy(
      {},
      {
        get: (_, method) => {
          if (this.storyStoreValue)
            return deprecate2("Accessing the Story Store is deprecated and will be removed in 9.0"), this.storyStoreValue[method];
          throw new StoryStoreAccessedBeforeInitializationError();
        }
      }
    );
  }
  // INITIALIZATION
  async initialize() {
    this.setupListeners();
    try {
      let projectAnnotations = await this.getProjectAnnotationsOrRenderError();
      await this.runBeforeAllHook(projectAnnotations), await this.initializeWithProjectAnnotations(projectAnnotations);
      let userAgent = globalThis?.navigator?.userAgent;
      await this.channel.emit(PREVIEW_INITIALIZED, { userAgent });
    } catch (err) {
      this.rejectStoreInitializationPromise(err);
    }
  }
  ready() {
    return this.storeInitializationPromise;
  }
  setupListeners() {
    this.channel.on(STORY_INDEX_INVALIDATED, this.onStoryIndexChanged.bind(this)), this.channel.on(UPDATE_GLOBALS2, this.onUpdateGlobals.bind(this)), this.channel.on(UPDATE_STORY_ARGS2, this.onUpdateArgs.bind(this)), this.channel.on(ARGTYPES_INFO_REQUEST, this.onRequestArgTypesInfo.bind(this)), this.channel.on(RESET_STORY_ARGS2, this.onResetArgs.bind(this)), this.channel.on(FORCE_RE_RENDER2, this.onForceReRender.bind(this)), this.channel.on(FORCE_REMOUNT, this.onForceRemount.bind(this)), this.channel.on(STORY_HOT_UPDATED, this.onStoryHotUpdated.bind(this));
  }
  async getProjectAnnotationsOrRenderError() {
    try {
      let projectAnnotations = await this.getProjectAnnotations();
      if (this.renderToCanvas = projectAnnotations.renderToCanvas, !this.renderToCanvas)
        throw new MissingRenderToCanvasError();
      return projectAnnotations;
    } catch (err) {
      throw this.renderPreviewEntryError("Error reading preview.js:", err), err;
    }
  }
  // If initialization gets as far as project annotations, this function runs.
  async initializeWithProjectAnnotations(projectAnnotations) {
    this.projectAnnotationsBeforeInitialization = projectAnnotations;
    try {
      let storyIndex = await this.getStoryIndexFromServer();
      return this.initializeWithStoryIndex(storyIndex);
    } catch (err) {
      throw this.renderPreviewEntryError("Error loading story index:", err), err;
    }
  }
  async runBeforeAllHook(projectAnnotations) {
    try {
      await this.beforeAllCleanup?.(), this.beforeAllCleanup = await projectAnnotations.beforeAll?.();
    } catch (err) {
      throw this.renderPreviewEntryError("Error in beforeAll hook:", err), err;
    }
  }
  async getStoryIndexFromServer() {
    let result = await fetch(STORY_INDEX_PATH);
    if (result.status === 200)
      return result.json();
    throw new StoryIndexFetchError({ text: await result.text() });
  }
  // If initialization gets as far as the story index, this function runs.
  initializeWithStoryIndex(storyIndex) {
    if (!this.projectAnnotationsBeforeInitialization)
      throw new Error("Cannot call initializeWithStoryIndex until project annotations resolve");
    this.storyStoreValue = new StoryStore(
      storyIndex,
      this.importFn,
      this.projectAnnotationsBeforeInitialization
    ), delete this.projectAnnotationsBeforeInitialization, this.setInitialGlobals(), this.resolveStoreInitializationPromise();
  }
  async setInitialGlobals() {
    this.emitGlobals();
  }
  emitGlobals() {
    if (!this.storyStoreValue)
      throw new CalledPreviewMethodBeforeInitializationError({ methodName: "emitGlobals" });
    let payload = {
      globals: this.storyStoreValue.userGlobals.get() || {},
      globalTypes: this.storyStoreValue.projectAnnotations.globalTypes || {}
    };
    this.channel.emit(SET_GLOBALS, payload);
  }
  // EVENT HANDLERS
  // This happens when a config file gets reloaded
  async onGetProjectAnnotationsChanged({
    getProjectAnnotations
  }) {
    delete this.previewEntryError, this.getProjectAnnotations = getProjectAnnotations;
    let projectAnnotations = await this.getProjectAnnotationsOrRenderError();
    if (await this.runBeforeAllHook(projectAnnotations), !this.storyStoreValue) {
      await this.initializeWithProjectAnnotations(projectAnnotations);
      return;
    }
    this.storyStoreValue.setProjectAnnotations(projectAnnotations), this.emitGlobals();
  }
  async onStoryIndexChanged() {
    if (delete this.previewEntryError, !(!this.storyStoreValue && !this.projectAnnotationsBeforeInitialization))
      try {
        let storyIndex = await this.getStoryIndexFromServer();
        if (this.projectAnnotationsBeforeInitialization) {
          this.initializeWithStoryIndex(storyIndex);
          return;
        }
        await this.onStoriesChanged({ storyIndex });
      } catch (err) {
        throw this.renderPreviewEntryError("Error loading story index:", err), err;
      }
  }
  // This happens when a glob gets HMR-ed
  async onStoriesChanged({
    importFn,
    storyIndex
  }) {
    if (!this.storyStoreValue)
      throw new CalledPreviewMethodBeforeInitializationError({ methodName: "onStoriesChanged" });
    await this.storyStoreValue.onStoriesChanged({ importFn, storyIndex });
  }
  async onUpdateGlobals({
    globals: updatedGlobals,
    currentStory
  }) {
    if (this.storyStoreValue || await this.storeInitializationPromise, !this.storyStoreValue)
      throw new CalledPreviewMethodBeforeInitializationError({ methodName: "onUpdateGlobals" });
    if (this.storyStoreValue.userGlobals.update(updatedGlobals), currentStory) {
      let { initialGlobals, storyGlobals, userGlobals, globals } = this.storyStoreValue.getStoryContext(currentStory);
      this.channel.emit(GLOBALS_UPDATED, {
        initialGlobals,
        userGlobals,
        storyGlobals,
        globals
      });
    } else {
      let { initialGlobals, globals } = this.storyStoreValue.userGlobals;
      this.channel.emit(GLOBALS_UPDATED, {
        initialGlobals,
        userGlobals: globals,
        storyGlobals: {},
        globals
      });
    }
    await Promise.all(this.storyRenders.map((r) => r.rerender()));
  }
  async onUpdateArgs({ storyId, updatedArgs }) {
    if (!this.storyStoreValue)
      throw new CalledPreviewMethodBeforeInitializationError({ methodName: "onUpdateArgs" });
    this.storyStoreValue.args.update(storyId, updatedArgs), await Promise.all(
      this.storyRenders.filter((r) => r.id === storyId && !r.renderOptions.forceInitialArgs).map(
        (r) => (
          // We only run the play function, with in a force remount.
          // But when mount is destructured, the rendering happens inside of the play function.
          r.story && r.story.usesMount ? r.remount() : r.rerender()
        )
      )
    ), this.channel.emit(STORY_ARGS_UPDATED, {
      storyId,
      args: this.storyStoreValue.args.get(storyId)
    });
  }
  async onRequestArgTypesInfo({ id, payload }) {
    try {
      await this.storeInitializationPromise;
      let story = await this.storyStoreValue?.loadStory(payload);
      this.channel.emit(ARGTYPES_INFO_RESPONSE, {
        id,
        success: !0,
        payload: { argTypes: story?.argTypes || {} },
        error: null
      });
    } catch (e) {
      this.channel.emit(ARGTYPES_INFO_RESPONSE, {
        id,
        success: !1,
        error: e?.message
      });
    }
  }
  async onResetArgs({ storyId, argNames }) {
    if (!this.storyStoreValue)
      throw new CalledPreviewMethodBeforeInitializationError({ methodName: "onResetArgs" });
    let story = this.storyRenders.find((r) => r.id === storyId)?.story || await this.storyStoreValue.loadStory({ storyId }), updatedArgs = (argNames || [
      .../* @__PURE__ */ new Set([
        ...Object.keys(story.initialArgs),
        ...Object.keys(this.storyStoreValue.args.get(storyId))
      ])
    ]).reduce((acc, argName) => (acc[argName] = story.initialArgs[argName], acc), {});
    await this.onUpdateArgs({ storyId, updatedArgs });
  }
  // ForceReRender does not include a story id, so we simply must
  // re-render all stories in case they are relevant
  async onForceReRender() {
    await Promise.all(this.storyRenders.map((r) => r.rerender()));
  }
  async onForceRemount({ storyId }) {
    await Promise.all(this.storyRenders.filter((r) => r.id === storyId).map((r) => r.remount()));
  }
  async onStoryHotUpdated() {
    await Promise.all(this.storyRenders.map((r) => r.cancelPlayFunction()));
  }
  // Used by docs to render a story to a given element
  // Note this short-circuits the `prepare()` phase of the StoryRender,
  // main to be consistent with the previous behaviour. In the future,
  // we will change it to go ahead and load the story, which will end up being
  // "instant", although async.
  renderStoryToElement(story, element, callbacks, options) {
    if (!this.renderToCanvas || !this.storyStoreValue)
      throw new CalledPreviewMethodBeforeInitializationError({
        methodName: "renderStoryToElement"
      });
    let render = new StoryRender(
      this.channel,
      this.storyStoreValue,
      this.renderToCanvas,
      callbacks,
      story.id,
      "docs",
      options,
      story
    );
    return render.renderToElement(element), this.storyRenders.push(render), async () => {
      await this.teardownRender(render);
    };
  }
  async teardownRender(render, { viewModeChanged } = {}) {
    this.storyRenders = this.storyRenders.filter((r) => r !== render), await render?.teardown?.({ viewModeChanged });
  }
  // API
  async loadStory({ storyId }) {
    if (!this.storyStoreValue)
      throw new CalledPreviewMethodBeforeInitializationError({ methodName: "loadStory" });
    return this.storyStoreValue.loadStory({ storyId });
  }
  getStoryContext(story, { forceInitialArgs = !1 } = {}) {
    if (!this.storyStoreValue)
      throw new CalledPreviewMethodBeforeInitializationError({ methodName: "getStoryContext" });
    return this.storyStoreValue.getStoryContext(story, { forceInitialArgs });
  }
  async extract(options) {
    if (!this.storyStoreValue)
      throw new CalledPreviewMethodBeforeInitializationError({ methodName: "extract" });
    if (this.previewEntryError)
      throw this.previewEntryError;
    return await this.storyStoreValue.cacheAllCSFFiles(), this.storyStoreValue.extract(options);
  }
  // UTILITIES
  renderPreviewEntryError(reason, err) {
    this.previewEntryError = err, logger7.error(reason), logger7.error(err), this.channel.emit(CONFIG_ERROR, err);
  }
};

// src/preview-api/modules/preview-web/PreviewWeb.tsx
import { global as global8 } from "@storybook/global";

// src/preview-api/modules/preview-web/PreviewWithSelection.tsx
import { logger as logger8 } from "storybook/internal/client-logger";
import {
  CURRENT_STORY_WAS_SET,
  DOCS_PREPARED,
  GLOBALS_UPDATED as GLOBALS_UPDATED2,
  PRELOAD_ENTRIES,
  PREVIEW_KEYDOWN,
  SET_CURRENT_STORY,
  STORY_CHANGED,
  STORY_ERRORED,
  STORY_MISSING,
  STORY_PREPARED,
  STORY_RENDER_PHASE_CHANGED as STORY_RENDER_PHASE_CHANGED2,
  STORY_SPECIFIED,
  STORY_THREW_EXCEPTION,
  STORY_UNCHANGED,
  UPDATE_QUERY_PARAMS
} from "storybook/internal/core-events";
import {
  CalledPreviewMethodBeforeInitializationError as CalledPreviewMethodBeforeInitializationError2,
  EmptyIndexError,
  MdxFileWithNoCsfReferencesError,
  NoStoryMatchError
} from "storybook/internal/preview-errors";

// src/preview-api/modules/preview-web/render/CsfDocsRender.ts
import { DOCS_RENDERED } from "storybook/internal/core-events";

// src/preview-api/modules/preview-web/docs-context/DocsContext.ts
import { isStory as isStory3 } from "storybook/internal/csf";
var DocsContext = class {
  constructor(channel, store, renderStoryToElement, csfFiles) {
    this.channel = channel;
    this.store = store;
    this.renderStoryToElement = renderStoryToElement;
    this.storyIdByName = (storyName) => {
      let storyId = this.nameToStoryId.get(storyName);
      if (storyId)
        return storyId;
      throw new Error(`No story found with that name: ${storyName}`);
    };
    this.componentStories = () => this.componentStoriesValue;
    this.componentStoriesFromCSFFile = (csfFile) => this.store.componentStoriesFromCSFFile({ csfFile });
    this.storyById = (storyId) => {
      if (!storyId) {
        if (!this.primaryStory)
          throw new Error(
            "No primary story defined for docs entry. Did you forget to use `<Meta>`?"
          );
        return this.primaryStory;
      }
      let csfFile = this.storyIdToCSFFile.get(storyId);
      if (!csfFile)
        throw new Error(`Called \`storyById\` for story that was never loaded: ${storyId}`);
      return this.store.storyFromCSFFile({ storyId, csfFile });
    };
    this.getStoryContext = (story) => ({
      ...this.store.getStoryContext(story),
      loaded: {},
      viewMode: "docs"
    });
    this.loadStory = (id) => this.store.loadStory({ storyId: id });
    this.componentStoriesValue = [], this.storyIdToCSFFile = /* @__PURE__ */ new Map(), this.exportToStory = /* @__PURE__ */ new Map(), this.exportsToCSFFile = /* @__PURE__ */ new Map(), this.nameToStoryId = /* @__PURE__ */ new Map(), this.attachedCSFFiles = /* @__PURE__ */ new Set(), csfFiles.forEach((csfFile, index) => {
      this.referenceCSFFile(csfFile);
    });
  }
  // This docs entry references this CSF file and can synchronously load the stories, as well
  // as reference them by module export. If the CSF is part of the "component" stories, they
  // can also be referenced by name and are in the componentStories list.
  referenceCSFFile(csfFile) {
    this.exportsToCSFFile.set(csfFile.moduleExports, csfFile), this.exportsToCSFFile.set(csfFile.moduleExports.default, csfFile), this.store.componentStoriesFromCSFFile({ csfFile }).forEach((story) => {
      let annotation = csfFile.stories[story.id];
      this.storyIdToCSFFile.set(annotation.id, csfFile), this.exportToStory.set(annotation.moduleExport, story);
    });
  }
  attachCSFFile(csfFile) {
    if (!this.exportsToCSFFile.has(csfFile.moduleExports))
      throw new Error("Cannot attach a CSF file that has not been referenced");
    if (this.attachedCSFFiles.has(csfFile))
      return;
    this.attachedCSFFiles.add(csfFile), this.store.componentStoriesFromCSFFile({ csfFile }).forEach((story) => {
      this.nameToStoryId.set(story.name, story.id), this.componentStoriesValue.push(story), this.primaryStory || (this.primaryStory = story);
    });
  }
  referenceMeta(metaExports, attach) {
    let resolved = this.resolveModuleExport(metaExports);
    if (resolved.type !== "meta")
      throw new Error(
        "<Meta of={} /> must reference a CSF file module export or meta export. Did you mistakenly reference your component instead of your CSF file?"
      );
    attach && this.attachCSFFile(resolved.csfFile);
  }
  get projectAnnotations() {
    let { projectAnnotations } = this.store;
    if (!projectAnnotations)
      throw new Error("Can't get projectAnnotations from DocsContext before they are initialized");
    return projectAnnotations;
  }
  resolveAttachedModuleExportType(moduleExportType) {
    if (moduleExportType === "story") {
      if (!this.primaryStory)
        throw new Error(
          "No primary story attached to this docs file, did you forget to use <Meta of={} />?"
        );
      return { type: "story", story: this.primaryStory };
    }
    if (this.attachedCSFFiles.size === 0)
      throw new Error(
        "No CSF file attached to this docs file, did you forget to use <Meta of={} />?"
      );
    let firstAttachedCSFFile = Array.from(this.attachedCSFFiles)[0];
    if (moduleExportType === "meta")
      return { type: "meta", csfFile: firstAttachedCSFFile };
    let { component } = firstAttachedCSFFile.meta;
    if (!component)
      throw new Error(
        "Attached CSF file does not defined a component, did you forget to export one?"
      );
    return { type: "component", component };
  }
  resolveModuleExport(moduleExportOrType) {
    let csfFile = this.exportsToCSFFile.get(moduleExportOrType);
    if (!csfFile && moduleExportOrType && typeof moduleExportOrType == "object" && "default" in moduleExportOrType && (csfFile = this.exportsToCSFFile.get(moduleExportOrType.default)), csfFile)
      return { type: "meta", csfFile };
    let story = this.exportToStory.get(
      isStory3(moduleExportOrType) ? moduleExportOrType.input : moduleExportOrType
    );
    return story ? { type: "story", story } : { type: "component", component: moduleExportOrType };
  }
  resolveOf(moduleExportOrType, validTypes = []) {
    let resolved;
    if (["component", "meta", "story"].includes(moduleExportOrType)) {
      let type = moduleExportOrType;
      resolved = this.resolveAttachedModuleExportType(type);
    } else
      resolved = this.resolveModuleExport(moduleExportOrType);
    if (validTypes.length && !validTypes.includes(resolved.type)) {
      let prettyType = resolved.type === "component" ? "component or unknown" : resolved.type;
      throw new Error(dedent`Invalid value passed to the 'of' prop. The value was resolved to a '${prettyType}' type but the only types for this block are: ${validTypes.join(
        ", "
      )}.
        - Did you pass a component to the 'of' prop when the block only supports a story or a meta?
        - ... or vice versa?
        - Did you pass a story, CSF file or meta to the 'of' prop that is not indexed, ie. is not targeted by the 'stories' globs in the main configuration?`);
    }
    switch (resolved.type) {
      case "component":
        return {
          ...resolved,
          projectAnnotations: this.projectAnnotations
        };
      case "meta":
        return {
          ...resolved,
          preparedMeta: this.store.preparedMetaFromCSFFile({ csfFile: resolved.csfFile })
        };
      case "story":
      default:
        return resolved;
    }
  }
};

// src/preview-api/modules/preview-web/render/CsfDocsRender.ts
var CsfDocsRender = class {
  constructor(channel, store, entry, callbacks) {
    this.channel = channel;
    this.store = store;
    this.entry = entry;
    this.callbacks = callbacks;
    this.type = "docs";
    this.subtype = "csf";
    this.torndown = !1;
    this.disableKeyListeners = !1;
    this.preparing = !1;
    this.id = entry.id, this.renderId = Date.now();
  }
  isPreparing() {
    return this.preparing;
  }
  async prepare() {
    this.preparing = !0;
    let { entryExports, csfFiles = [] } = await this.store.loadEntry(this.id);
    if (this.torndown)
      throw PREPARE_ABORTED;
    let { importPath, title } = this.entry, primaryCsfFile = this.store.processCSFFileWithCache(
      entryExports,
      importPath,
      title
    ), primaryStoryId = Object.keys(primaryCsfFile.stories)[0];
    this.story = this.store.storyFromCSFFile({ storyId: primaryStoryId, csfFile: primaryCsfFile }), this.csfFiles = [primaryCsfFile, ...csfFiles], this.preparing = !1;
  }
  isEqual(other) {
    return !!(this.id === other.id && this.story && this.story === other.story);
  }
  docsContext(renderStoryToElement) {
    if (!this.csfFiles)
      throw new Error("Cannot render docs before preparing");
    let docsContext = new DocsContext(
      this.channel,
      this.store,
      renderStoryToElement,
      this.csfFiles
    );
    return this.csfFiles.forEach((csfFile) => docsContext.attachCSFFile(csfFile)), docsContext;
  }
  async renderToElement(canvasElement, renderStoryToElement) {
    if (!this.story || !this.csfFiles)
      throw new Error("Cannot render docs before preparing");
    let docsContext = this.docsContext(renderStoryToElement), { docs: docsParameter } = this.story.parameters || {};
    if (!docsParameter)
      throw new Error(
        "Cannot render a story in viewMode=docs if `@storybook/addon-docs` is not installed"
      );
    let renderer = await docsParameter.renderer(), { render } = renderer, renderDocs = async () => {
      try {
        await render(docsContext, docsParameter, canvasElement), this.channel.emit(DOCS_RENDERED, this.id);
      } catch (err) {
        this.callbacks.showException(err);
      }
    };
    return this.rerender = async () => renderDocs(), this.teardownRender = async ({ viewModeChanged }) => {
      !viewModeChanged || !canvasElement || renderer.unmount(canvasElement);
    }, renderDocs();
  }
  async teardown({ viewModeChanged } = {}) {
    this.teardownRender?.({ viewModeChanged }), this.torndown = !0;
  }
};

// src/preview-api/modules/preview-web/render/MdxDocsRender.ts
import { DOCS_RENDERED as DOCS_RENDERED2 } from "storybook/internal/core-events";
var MdxDocsRender = class {
  constructor(channel, store, entry, callbacks) {
    this.channel = channel;
    this.store = store;
    this.entry = entry;
    this.callbacks = callbacks;
    this.type = "docs";
    this.subtype = "mdx";
    this.torndown = !1;
    this.disableKeyListeners = !1;
    this.preparing = !1;
    this.id = entry.id, this.renderId = Date.now();
  }
  isPreparing() {
    return this.preparing;
  }
  async prepare() {
    this.preparing = !0;
    let { entryExports, csfFiles = [] } = await this.store.loadEntry(this.id);
    if (this.torndown)
      throw PREPARE_ABORTED;
    this.csfFiles = csfFiles, this.exports = entryExports, this.preparing = !1;
  }
  isEqual(other) {
    return !!(this.id === other.id && this.exports && this.exports === other.exports);
  }
  docsContext(renderStoryToElement) {
    if (!this.csfFiles)
      throw new Error("Cannot render docs before preparing");
    return new DocsContext(
      this.channel,
      this.store,
      renderStoryToElement,
      this.csfFiles
    );
  }
  async renderToElement(canvasElement, renderStoryToElement) {
    if (!this.exports || !this.csfFiles || !this.store.projectAnnotations)
      throw new Error("Cannot render docs before preparing");
    let docsContext = this.docsContext(renderStoryToElement), { docs } = this.store.projectAnnotations.parameters ?? {};
    if (!docs)
      throw new Error(
        "Cannot render a story in viewMode=docs if `@storybook/addon-docs` is not installed"
      );
    let docsParameter = { ...docs, page: this.exports.default }, renderer = await docs.renderer(), { render } = renderer, renderDocs = async () => {
      try {
        await render(docsContext, docsParameter, canvasElement), this.channel.emit(DOCS_RENDERED2, this.id);
      } catch (err) {
        this.callbacks.showException(err);
      }
    };
    return this.rerender = async () => renderDocs(), this.teardownRender = async ({ viewModeChanged } = {}) => {
      !viewModeChanged || !canvasElement || (renderer.unmount(canvasElement), this.torndown = !0);
    }, renderDocs();
  }
  async teardown({ viewModeChanged } = {}) {
    this.teardownRender?.({ viewModeChanged }), this.torndown = !0;
  }
};

// src/preview-api/modules/preview-web/PreviewWithSelection.tsx
var globalWindow = globalThis;
function focusInInput(event) {
  let target = event.composedPath && event.composedPath()[0] || event.target;
  return /input|textarea/i.test(target.tagName) || target.getAttribute("contenteditable") !== null;
}
var ATTACHED_MDX_TAG = "attached-mdx", UNATTACHED_MDX_TAG = "unattached-mdx";
function isMdxEntry({ tags }) {
  return tags?.includes(UNATTACHED_MDX_TAG) || tags?.includes(ATTACHED_MDX_TAG);
}
function isStoryRender(r) {
  return r.type === "story";
}
function isDocsRender(r) {
  return r.type === "docs";
}
function isCsfDocsRender(r) {
  return isDocsRender(r) && r.subtype === "csf";
}
var PreviewWithSelection = class extends Preview {
  constructor(importFn, getProjectAnnotations, selectionStore, view) {
    super(importFn, getProjectAnnotations, void 0, !1);
    this.importFn = importFn;
    this.getProjectAnnotations = getProjectAnnotations;
    this.selectionStore = selectionStore;
    this.view = view;
    this.initialize();
  }
  setupListeners() {
    super.setupListeners(), globalWindow.onkeydown = this.onKeydown.bind(this), this.channel.on(SET_CURRENT_STORY, this.onSetCurrentStory.bind(this)), this.channel.on(UPDATE_QUERY_PARAMS, this.onUpdateQueryParams.bind(this)), this.channel.on(PRELOAD_ENTRIES, this.onPreloadStories.bind(this));
  }
  async setInitialGlobals() {
    if (!this.storyStoreValue)
      throw new CalledPreviewMethodBeforeInitializationError2({ methodName: "setInitialGlobals" });
    let { globals } = this.selectionStore.selectionSpecifier || {};
    globals && this.storyStoreValue.userGlobals.updateFromPersisted(globals), this.emitGlobals();
  }
  // If initialization gets as far as the story index, this function runs.
  async initializeWithStoryIndex(storyIndex) {
    return await super.initializeWithStoryIndex(storyIndex), this.selectSpecifiedStory();
  }
  // Use the selection specifier to choose a story, then render it
  async selectSpecifiedStory() {
    if (!this.storyStoreValue)
      throw new CalledPreviewMethodBeforeInitializationError2({
        methodName: "selectSpecifiedStory"
      });
    if (this.selectionStore.selection) {
      await this.renderSelection();
      return;
    }
    if (!this.selectionStore.selectionSpecifier) {
      this.renderMissingStory();
      return;
    }
    let { storySpecifier, args } = this.selectionStore.selectionSpecifier, entry = this.storyStoreValue.storyIndex.entryFromSpecifier(storySpecifier);
    if (!entry) {
      storySpecifier === "*" ? this.renderStoryLoadingException(storySpecifier, new EmptyIndexError()) : this.renderStoryLoadingException(
        storySpecifier,
        new NoStoryMatchError({ storySpecifier: storySpecifier.toString() })
      );
      return;
    }
    let { id: storyId, type: viewMode } = entry;
    this.selectionStore.setSelection({ storyId, viewMode }), this.channel.emit(STORY_SPECIFIED, this.selectionStore.selection), this.channel.emit(CURRENT_STORY_WAS_SET, this.selectionStore.selection), await this.renderSelection({ persistedArgs: args });
  }
  // EVENT HANDLERS
  // This happens when a config file gets reloaded
  async onGetProjectAnnotationsChanged({
    getProjectAnnotations
  }) {
    await super.onGetProjectAnnotationsChanged({ getProjectAnnotations }), this.selectionStore.selection && this.renderSelection();
  }
  // This happens when a glob gets HMR-ed
  async onStoriesChanged({
    importFn,
    storyIndex
  }) {
    await super.onStoriesChanged({ importFn, storyIndex }), this.selectionStore.selection ? await this.renderSelection() : await this.selectSpecifiedStory();
  }
  onKeydown(event) {
    if (!this.storyRenders.find((r) => r.disableKeyListeners) && !focusInInput(event)) {
      let { altKey, ctrlKey, metaKey, shiftKey, key, code, keyCode } = event;
      this.channel.emit(PREVIEW_KEYDOWN, {
        event: { altKey, ctrlKey, metaKey, shiftKey, key, code, keyCode }
      });
    }
  }
  async onSetCurrentStory(selection) {
    this.selectionStore.setSelection({ viewMode: "story", ...selection }), await this.storeInitializationPromise, this.channel.emit(CURRENT_STORY_WAS_SET, this.selectionStore.selection), this.renderSelection();
  }
  onUpdateQueryParams(queryParams) {
    this.selectionStore.setQueryParams(queryParams);
  }
  async onUpdateGlobals({ globals }) {
    let currentStory = this.currentRender instanceof StoryRender && this.currentRender.story || void 0;
    super.onUpdateGlobals({ globals, currentStory }), (this.currentRender instanceof MdxDocsRender || this.currentRender instanceof CsfDocsRender) && await this.currentRender.rerender?.();
  }
  async onUpdateArgs({ storyId, updatedArgs }) {
    super.onUpdateArgs({ storyId, updatedArgs });
  }
  async onPreloadStories({ ids }) {
    await this.storeInitializationPromise, this.storyStoreValue && await Promise.allSettled(ids.map((id) => this.storyStoreValue?.loadEntry(id)));
  }
  // RENDERING
  // We can either have:
  // - a story selected in "story" viewMode,
  //     in which case we render it to the root element, OR
  // - a story selected in "docs" viewMode,
  //     in which case we render the docsPage for that story
  async renderSelection({ persistedArgs } = {}) {
    let { renderToCanvas } = this;
    if (!this.storyStoreValue || !renderToCanvas)
      throw new CalledPreviewMethodBeforeInitializationError2({ methodName: "renderSelection" });
    let { selection } = this.selectionStore;
    if (!selection)
      throw new Error("Cannot call renderSelection as no selection was made");
    let { storyId } = selection, entry;
    try {
      entry = await this.storyStoreValue.storyIdToEntry(storyId);
    } catch (err) {
      this.currentRender && await this.teardownRender(this.currentRender), this.renderStoryLoadingException(storyId, err);
      return;
    }
    let storyIdChanged = this.currentSelection?.storyId !== storyId, viewModeChanged = this.currentRender?.type !== entry.type;
    entry.type === "story" ? this.view.showPreparingStory({ immediate: viewModeChanged }) : this.view.showPreparingDocs({ immediate: viewModeChanged }), this.currentRender?.isPreparing() && await this.teardownRender(this.currentRender);
    let render;
    entry.type === "story" ? render = new StoryRender(
      this.channel,
      this.storyStoreValue,
      renderToCanvas,
      this.mainStoryCallbacks(storyId),
      storyId,
      "story"
    ) : isMdxEntry(entry) ? render = new MdxDocsRender(
      this.channel,
      this.storyStoreValue,
      entry,
      this.mainStoryCallbacks(storyId)
    ) : render = new CsfDocsRender(
      this.channel,
      this.storyStoreValue,
      entry,
      this.mainStoryCallbacks(storyId)
    );
    let lastSelection = this.currentSelection;
    this.currentSelection = selection;
    let lastRender = this.currentRender;
    this.currentRender = render;
    try {
      await render.prepare();
    } catch (err) {
      lastRender && await this.teardownRender(lastRender), err !== PREPARE_ABORTED && this.renderStoryLoadingException(storyId, err);
      return;
    }
    let implementationChanged = !storyIdChanged && lastRender && !render.isEqual(lastRender);
    if (persistedArgs && isStoryRender(render) && (invariant(!!render.story), this.storyStoreValue.args.updateFromPersisted(render.story, persistedArgs)), lastRender && !lastRender.torndown && !storyIdChanged && !implementationChanged && !viewModeChanged) {
      this.currentRender = lastRender, this.channel.emit(STORY_UNCHANGED, storyId), this.view.showMain();
      return;
    }
    if (lastRender && await this.teardownRender(lastRender, { viewModeChanged }), lastSelection && (storyIdChanged || viewModeChanged) && this.channel.emit(STORY_CHANGED, storyId), isStoryRender(render)) {
      invariant(!!render.story);
      let {
        parameters,
        initialArgs,
        argTypes,
        unmappedArgs,
        initialGlobals,
        userGlobals,
        storyGlobals,
        globals
      } = this.storyStoreValue.getStoryContext(render.story);
      this.channel.emit(STORY_PREPARED, {
        id: storyId,
        parameters,
        initialArgs,
        argTypes,
        args: unmappedArgs
      }), this.channel.emit(GLOBALS_UPDATED2, { userGlobals, storyGlobals, globals, initialGlobals });
    } else {
      let { parameters } = this.storyStoreValue.projectAnnotations, { initialGlobals, globals } = this.storyStoreValue.userGlobals;
      if (this.channel.emit(GLOBALS_UPDATED2, {
        globals,
        initialGlobals,
        storyGlobals: {},
        userGlobals: globals
      }), isCsfDocsRender(render) || render.entry.tags?.includes(ATTACHED_MDX_TAG)) {
        if (!render.csfFiles)
          throw new MdxFileWithNoCsfReferencesError({ storyId });
        ({ parameters } = this.storyStoreValue.preparedMetaFromCSFFile({
          csfFile: render.csfFiles[0]
        }));
      }
      this.channel.emit(DOCS_PREPARED, {
        id: storyId,
        parameters
      });
    }
    isStoryRender(render) ? (invariant(!!render.story), this.storyRenders.push(render), this.currentRender.renderToElement(
      this.view.prepareForStory(render.story)
    )) : this.currentRender.renderToElement(
      this.view.prepareForDocs(),
      // This argument is used for docs, which is currently only compatible with HTMLElements
      this.renderStoryToElement.bind(this)
    );
  }
  async teardownRender(render, { viewModeChanged = !1 } = {}) {
    this.storyRenders = this.storyRenders.filter((r) => r !== render), await render?.teardown?.({ viewModeChanged });
  }
  // UTILITIES
  mainStoryCallbacks(storyId) {
    return {
      showStoryDuringRender: () => this.view.showStoryDuringRender(),
      showMain: () => this.view.showMain(),
      showError: (err) => this.renderError(storyId, err),
      showException: (err) => this.renderException(storyId, err)
    };
  }
  renderPreviewEntryError(reason, err) {
    super.renderPreviewEntryError(reason, err), this.view.showErrorDisplay(err);
  }
  renderMissingStory() {
    this.view.showNoPreview(), this.channel.emit(STORY_MISSING);
  }
  renderStoryLoadingException(storySpecifier, err) {
    logger8.error(err), this.view.showErrorDisplay(err), this.channel.emit(STORY_MISSING, storySpecifier);
  }
  // renderException is used if we fail to render the story and it is uncaught by the app layer
  renderException(storyId, error) {
    let { name = "Error", message = String(error), stack } = error, renderId = this.currentRender?.renderId;
    this.channel.emit(STORY_THREW_EXCEPTION, { name, message, stack }), this.channel.emit(STORY_RENDER_PHASE_CHANGED2, { newPhase: "errored", renderId, storyId }), this.view.showErrorDisplay(error), logger8.error(`Error rendering story '${storyId}':`), logger8.error(error);
  }
  // renderError is used by the various app layers to inform the user they have done something
  // wrong -- for instance returned the wrong thing from a story
  renderError(storyId, { title, description }) {
    let renderId = this.currentRender?.renderId;
    this.channel.emit(STORY_ERRORED, { title, description }), this.channel.emit(STORY_RENDER_PHASE_CHANGED2, { newPhase: "errored", renderId, storyId }), this.view.showErrorDisplay({ message: title, stack: description }), logger8.error(`Error rendering story ${title}: ${description}`);
  }
};

// src/preview-api/modules/preview-web/UrlStore.ts
var import_picoquery2 = __toESM(require_main(), 1);
import { global as global6 } from "@storybook/global";

// src/preview-api/modules/preview-web/parseArgsParam.ts
import { once as once3 } from "storybook/internal/client-logger";
var import_picoquery = __toESM(require_main(), 1);
var VALIDATION_REGEXP = /^[a-zA-Z0-9 _-]*$/, NUMBER_REGEXP = /^-?[0-9]+(\.[0-9]+)?$/, HEX_REGEXP = /^#([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i, COLOR_REGEXP = /^(rgba?|hsla?)\(([0-9]{1,3}),\s?([0-9]{1,3})%?,\s?([0-9]{1,3})%?,?\s?([0-9](\.[0-9]{1,2})?)?\)$/i, validateArgs = (key = "", value) => key === null || key === "" || !VALIDATION_REGEXP.test(key) ? !1 : value == null || value instanceof Date || typeof value == "number" || typeof value == "boolean" ? !0 : typeof value == "string" ? VALIDATION_REGEXP.test(value) || NUMBER_REGEXP.test(value) || HEX_REGEXP.test(value) || COLOR_REGEXP.test(value) : Array.isArray(value) ? value.every((v) => validateArgs(key, v)) : isPlainObject(value) ? Object.entries(value).every(([k, v]) => validateArgs(k, v)) : !1, QUERY_OPTIONS = {
  delimiter: ";",
  // we're parsing a single query param
  nesting: !0,
  arrayRepeat: !0,
  arrayRepeatSyntax: "bracket",
  nestingSyntax: "js",
  // objects are encoded using dot notation
  valueDeserializer(str) {
    if (str.startsWith("!")) {
      if (str === "!undefined")
        return;
      if (str === "!null")
        return null;
      if (str === "!true")
        return !0;
      if (str === "!false")
        return !1;
      if (str.startsWith("!date(") && str.endsWith(")"))
        return new Date(str.replaceAll(" ", "+").slice(6, -1));
      if (str.startsWith("!hex(") && str.endsWith(")"))
        return `#${str.slice(5, -1)}`;
      let color = str.slice(1).match(COLOR_REGEXP);
      if (color)
        return str.startsWith("!rgba") || str.startsWith("!RGBA") ? `${color[1]}(${color[2]}, ${color[3]}, ${color[4]}, ${color[5]})` : str.startsWith("!hsla") || str.startsWith("!HSLA") ? `${color[1]}(${color[2]}, ${color[3]}%, ${color[4]}%, ${color[5]})` : str.startsWith("!rgb") || str.startsWith("!RGB") ? `${color[1]}(${color[2]}, ${color[3]}, ${color[4]})` : `${color[1]}(${color[2]}, ${color[3]}%, ${color[4]}%)`;
    }
    return NUMBER_REGEXP.test(str) ? Number(str) : str;
  }
}, parseArgsParam = (argsString) => {
  let parts = argsString.split(";").map((part) => part.replace("=", "~").replace(":", "="));
  return Object.entries((0, import_picoquery.parse)(parts.join(";"), QUERY_OPTIONS)).reduce((acc, [key, value]) => validateArgs(key, value) ? Object.assign(acc, { [key]: value }) : (once3.warn(dedent`
      Omitted potentially unsafe URL args.

      More info: https://storybook.js.org/docs/writing-stories/args#setting-args-through-the-url?ref=error
    `), acc), {});
};

// src/preview-api/modules/preview-web/UrlStore.ts
var { history, document: document2 } = global6;
function pathToId(path) {
  let match = (path || "").match(/^\/story\/(.+)/);
  if (!match)
    throw new Error(`Invalid path '${path}',  must start with '/story/'`);
  return match[1];
}
var getQueryString = ({
  selection,
  extraParams
}) => {
  let search = document2?.location.search.slice(1), { path, selectedKind, selectedStory, ...rest } = (0, import_picoquery2.parse)(search);
  return `?${(0, import_picoquery2.stringify)({
    ...rest,
    ...extraParams,
    ...selection && { id: selection.storyId, viewMode: selection.viewMode }
  })}`;
}, setPath = (selection) => {
  if (!selection)
    return;
  let query = getQueryString({ selection }), { hash = "" } = document2.location;
  document2.title = selection.storyId, history.replaceState({}, "", `${document2.location.pathname}${query}${hash}`);
}, isObject = (val) => val != null && typeof val == "object" && Array.isArray(val) === !1, getFirstString = (v) => {
  if (v !== void 0) {
    if (typeof v == "string")
      return v;
    if (Array.isArray(v))
      return getFirstString(v[0]);
    if (isObject(v))
      return getFirstString(
        Object.values(v).filter(Boolean)
      );
  }
}, getSelectionSpecifierFromPath = () => {
  if (typeof document2 < "u") {
    let queryStr = document2.location.search.slice(1), query = (0, import_picoquery2.parse)(queryStr), args = typeof query.args == "string" ? parseArgsParam(query.args) : void 0, globals = typeof query.globals == "string" ? parseArgsParam(query.globals) : void 0, viewMode = getFirstString(query.viewMode);
    if (typeof viewMode != "string" || !viewMode)
      viewMode = "story";
    else if (!viewMode.match(/docs|story/))
      return null;
    let path = getFirstString(query.path), storyId = path ? pathToId(path) : getFirstString(query.id);
    if (storyId)
      return { storySpecifier: storyId, args, globals, viewMode };
  }
  return null;
}, UrlStore = class {
  constructor() {
    this.selectionSpecifier = getSelectionSpecifierFromPath();
  }
  setSelection(selection) {
    this.selection = selection, setPath(this.selection);
  }
  setQueryParams(queryParams) {
    let query = getQueryString({ extraParams: queryParams }), { hash = "" } = document2.location;
    history.replaceState({}, "", `${document2.location.pathname}${query}${hash}`);
  }
};

// src/preview-api/modules/preview-web/WebView.ts
var import_ansi_to_html = __toESM(require_ansi_to_html(), 1), import_picoquery3 = __toESM(require_main(), 1);
import { logger as logger9 } from "storybook/internal/client-logger";
import { global as global7 } from "@storybook/global";
var { document: document3 } = global7, PREPARING_DELAY = 100, Mode = /* @__PURE__ */ ((Mode2) => (Mode2.MAIN = "MAIN", Mode2.NOPREVIEW = "NOPREVIEW", Mode2.PREPARING_STORY = "PREPARING_STORY", Mode2.PREPARING_DOCS = "PREPARING_DOCS", Mode2.ERROR = "ERROR", Mode2))(Mode || {}), classes = {
  PREPARING_STORY: "sb-show-preparing-story",
  PREPARING_DOCS: "sb-show-preparing-docs",
  MAIN: "sb-show-main",
  NOPREVIEW: "sb-show-nopreview",
  ERROR: "sb-show-errordisplay"
}, layoutClassMap = {
  centered: "sb-main-centered",
  fullscreen: "sb-main-fullscreen",
  padded: "sb-main-padded"
}, ansiConverter = new import_ansi_to_html.default({
  escapeXML: !0
}), WebView = class {
  constructor() {
    this.testing = !1;
    if (typeof document3 < "u") {
      let { __SPECIAL_TEST_PARAMETER__ } = (0, import_picoquery3.parse)(document3.location.search.slice(1));
      switch (__SPECIAL_TEST_PARAMETER__) {
        case "preparing-story": {
          this.showPreparingStory(), this.testing = !0;
          break;
        }
        case "preparing-docs": {
          this.showPreparingDocs(), this.testing = !0;
          break;
        }
        default:
      }
    }
  }
  // Get ready to render a story, returning the element to render to
  prepareForStory(story) {
    return this.showStory(), this.applyLayout(story.parameters.layout), document3.documentElement.scrollTop = 0, document3.documentElement.scrollLeft = 0, this.storyRoot();
  }
  storyRoot() {
    return document3.getElementById("storybook-root");
  }
  prepareForDocs() {
    return this.showMain(), this.showDocs(), this.applyLayout("fullscreen"), document3.documentElement.scrollTop = 0, document3.documentElement.scrollLeft = 0, this.docsRoot();
  }
  docsRoot() {
    return document3.getElementById("storybook-docs");
  }
  applyLayout(layout = "padded") {
    if (layout === "none") {
      document3.body.classList.remove(this.currentLayoutClass), this.currentLayoutClass = null;
      return;
    }
    this.checkIfLayoutExists(layout);
    let layoutClass = layoutClassMap[layout];
    document3.body.classList.remove(this.currentLayoutClass), document3.body.classList.add(layoutClass), this.currentLayoutClass = layoutClass;
  }
  checkIfLayoutExists(layout) {
    layoutClassMap[layout] || logger9.warn(
      dedent`
          The desired layout: ${layout} is not a valid option.
          The possible options are: ${Object.keys(layoutClassMap).join(", ")}, none.
        `
    );
  }
  showMode(mode) {
    clearTimeout(this.preparingTimeout), Object.keys(Mode).forEach((otherMode) => {
      otherMode === mode ? document3.body.classList.add(classes[otherMode]) : document3.body.classList.remove(classes[otherMode]);
    });
  }
  showErrorDisplay({ message = "", stack = "" }) {
    let header = message, detail = stack, parts = message.split(`
`);
    parts.length > 1 && ([header] = parts, detail = parts.slice(1).join(`
`).replace(/^\n/, "")), document3.getElementById("error-message").innerHTML = ansiConverter.toHtml(header), document3.getElementById("error-stack").innerHTML = ansiConverter.toHtml(detail), this.showMode("ERROR" /* ERROR */);
  }
  showNoPreview() {
    this.testing || (this.showMode("NOPREVIEW" /* NOPREVIEW */), this.storyRoot()?.setAttribute("hidden", "true"), this.docsRoot()?.setAttribute("hidden", "true"));
  }
  showPreparingStory({ immediate = !1 } = {}) {
    clearTimeout(this.preparingTimeout), immediate ? this.showMode("PREPARING_STORY" /* PREPARING_STORY */) : this.preparingTimeout = setTimeout(
      () => this.showMode("PREPARING_STORY" /* PREPARING_STORY */),
      PREPARING_DELAY
    );
  }
  showPreparingDocs({ immediate = !1 } = {}) {
    clearTimeout(this.preparingTimeout), immediate ? this.showMode("PREPARING_DOCS" /* PREPARING_DOCS */) : this.preparingTimeout = setTimeout(() => this.showMode("PREPARING_DOCS" /* PREPARING_DOCS */), PREPARING_DELAY);
  }
  showMain() {
    this.showMode("MAIN" /* MAIN */);
  }
  showDocs() {
    this.storyRoot().setAttribute("hidden", "true"), this.docsRoot().removeAttribute("hidden");
  }
  showStory() {
    this.docsRoot().setAttribute("hidden", "true"), this.storyRoot().removeAttribute("hidden");
  }
  showStoryDuringRender() {
    document3.body.classList.add(classes.MAIN);
  }
};

// src/preview-api/modules/preview-web/PreviewWeb.tsx
var PreviewWeb = class extends PreviewWithSelection {
  constructor(importFn, getProjectAnnotations) {
    super(importFn, getProjectAnnotations, new UrlStore(), new WebView());
    this.importFn = importFn;
    this.getProjectAnnotations = getProjectAnnotations;
    global8.__STORYBOOK_PREVIEW__ = this;
  }
};

// src/preview-api/modules/preview-web/simulate-pageload.ts
import { global as global9 } from "@storybook/global";
var { document: document4 } = global9, runScriptTypes = [
  "application/javascript",
  "application/ecmascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
  // Support modern javascript
  "module"
], SCRIPT = "script", SCRIPTS_ROOT_ID = "scripts-root";
function simulateDOMContentLoaded() {
  let DOMContentLoadedEvent = document4.createEvent("Event");
  DOMContentLoadedEvent.initEvent("DOMContentLoaded", !0, !0), document4.dispatchEvent(DOMContentLoadedEvent);
}
function insertScript($script, callback, $scriptRoot) {
  let scriptEl = document4.createElement("script");
  scriptEl.type = $script.type === "module" ? "module" : "text/javascript", $script.src ? (scriptEl.onload = callback, scriptEl.onerror = callback, scriptEl.src = $script.src) : scriptEl.textContent = $script.innerText, $scriptRoot ? $scriptRoot.appendChild(scriptEl) : document4.head.appendChild(scriptEl), $script.parentNode.removeChild($script), $script.src || callback();
}
function insertScriptsSequentially(scriptsToExecute, callback, index = 0) {
  scriptsToExecute[index](() => {
    index++, index === scriptsToExecute.length ? callback() : insertScriptsSequentially(scriptsToExecute, callback, index);
  });
}
function simulatePageLoad($container) {
  let $scriptsRoot = document4.getElementById(SCRIPTS_ROOT_ID);
  $scriptsRoot ? $scriptsRoot.innerHTML = "" : ($scriptsRoot = document4.createElement("div"), $scriptsRoot.id = SCRIPTS_ROOT_ID, document4.body.appendChild($scriptsRoot));
  let $scripts = Array.from($container.querySelectorAll(SCRIPT));
  if ($scripts.length) {
    let scriptsToExecute = [];
    $scripts.forEach(($script) => {
      let typeAttr = $script.getAttribute("type");
      (!typeAttr || runScriptTypes.includes(typeAttr)) && scriptsToExecute.push((callback) => insertScript($script, callback, $scriptsRoot));
    }), scriptsToExecute.length && insertScriptsSequentially(scriptsToExecute, simulateDOMContentLoaded, void 0);
  } else
    simulateDOMContentLoaded();
}

// src/preview-api/modules/preview-web/emitTransformCode.ts
async function emitTransformCode(source, context) {
  let transform = context.parameters?.docs?.source?.transform, { id, unmappedArgs } = context, transformed = transform && source ? transform?.(source, context) : source, result = transformed ? await transformed : void 0;
  addons.getChannel().emit(SNIPPET_RENDERED, {
    id,
    source: result,
    args: unmappedArgs
  });
}

export {
  mockChannel,
  addons,
  HooksContext,
  applyHooks,
  useMemo,
  useCallback,
  useRef,
  useState,
  useReducer,
  useEffect,
  useChannel,
  useStoryContext,
  useParameter,
  useArgs,
  useGlobals,
  makeDecorator,
  combineArgs,
  normalizeArrays,
  normalizeStory,
  mountDestructured,
  decorateStory,
  sanitizeStoryContextUpdate,
  defaultDecorateStory,
  prepareStory,
  prepareMeta,
  filterArgTypes,
  inferControls,
  normalizeProjectAnnotations,
  composeStepRunners,
  composeConfigs,
  ReporterAPI,
  getCsfFactoryAnnotations,
  setDefaultProjectAnnotations,
  setProjectAnnotations,
  composeStory,
  composeStories,
  createPlaywrightTest,
  StoryStore,
  userOrAutoTitleFromSpecifier,
  userOrAutoTitle,
  sortStoriesV7,
  Preview,
  DocsContext,
  PreviewWithSelection,
  UrlStore,
  WebView,
  PreviewWeb,
  simulateDOMContentLoaded,
  simulatePageLoad,
  emitTransformCode
};
