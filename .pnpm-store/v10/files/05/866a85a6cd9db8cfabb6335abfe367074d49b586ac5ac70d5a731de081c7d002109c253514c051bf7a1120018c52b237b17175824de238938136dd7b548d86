import {
  EVENT_ID
} from "./chunk-6XWLIJQL.js";

// src/actions/runtime/configureActions.ts
var config = {
  depth: 10,
  clearOnStoryChange: !0,
  limit: 50
}, configureActions = (options = {}) => {
  Object.assign(config, options);
};

// src/actions/runtime/action.ts
import { ImplicitActionsDuringRendering } from "storybook/internal/preview-errors";
import { global } from "@storybook/global";
import { addons } from "storybook/preview-api";
var findProto = (obj, callback) => {
  let proto = Object.getPrototypeOf(obj);
  return !proto || callback(proto) ? proto : findProto(proto, callback);
}, isReactSyntheticEvent = (e) => !!(typeof e == "object" && e && findProto(e, (proto) => /^Synthetic(?:Base)?Event$/.test(proto.constructor.name)) && typeof e.persist == "function"), serializeArg = (a) => {
  if (isReactSyntheticEvent(a)) {
    let e = Object.create(
      a.constructor.prototype,
      Object.getOwnPropertyDescriptors(a)
    );
    e.persist();
    let viewDescriptor = Object.getOwnPropertyDescriptor(e, "view"), view = viewDescriptor?.value;
    return typeof view == "object" && view?.constructor.name === "Window" && Object.defineProperty(e, "view", {
      ...viewDescriptor,
      value: Object.create(view.constructor.prototype)
    }), e;
  }
  return a;
};
function action(name, options = {}) {
  let actionOptions = {
    ...config,
    ...options
  }, handler = function(...args) {
    if (options.implicit) {
      let storyRenderer = ("__STORYBOOK_PREVIEW__" in global ? global.__STORYBOOK_PREVIEW__ : void 0)?.storyRenders.find(
        (render) => render.phase === "playing" || render.phase === "rendering"
      );
      if (storyRenderer) {
        let deprecated = !globalThis?.FEATURES?.disallowImplicitActionsInRenderV8, error = new ImplicitActionsDuringRendering({
          phase: storyRenderer.phase,
          name,
          deprecated
        });
        if (deprecated)
          console.warn(error);
        else
          throw error;
      }
    }
    let channel = addons.getChannel(), id = Date.now().toString(36) + Math.random().toString(36).substring(2), minDepth = 5, serializedArgs = args.map(serializeArg), normalizedArgs = args.length > 1 ? serializedArgs : serializedArgs[0], actionDisplayToEmit = {
      id,
      count: 0,
      data: { name, args: normalizedArgs },
      options: {
        ...actionOptions,
        maxDepth: minDepth + (actionOptions.depth || 3)
      }
    };
    channel.emit(EVENT_ID, actionDisplayToEmit);
  };
  return handler.isAction = !0, handler.implicit = options.implicit, handler;
}

// src/actions/runtime/actions.ts
var actions = (...args) => {
  let options = config, names = args;
  names.length === 1 && Array.isArray(names[0]) && ([names] = names), names.length !== 1 && typeof names[names.length - 1] != "string" && (options = {
    ...config,
    ...names.pop()
  });
  let namesObject = names[0];
  (names.length !== 1 || typeof namesObject == "string") && (namesObject = {}, names.forEach((name) => {
    namesObject[name] = name;
  }));
  let actionsObject = {};
  return Object.keys(namesObject).forEach((name) => {
    actionsObject[name] = action(namesObject[name], options);
  }), actionsObject;
};

export {
  config,
  configureActions,
  action,
  actions
};
