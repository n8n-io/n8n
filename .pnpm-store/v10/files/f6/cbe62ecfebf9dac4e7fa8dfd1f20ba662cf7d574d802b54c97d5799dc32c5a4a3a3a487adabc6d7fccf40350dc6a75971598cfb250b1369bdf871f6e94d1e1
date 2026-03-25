import {
  actions
} from "../_browser-chunks/chunk-EUVGDK4H.js";
import {
  PARAM_KEY
} from "../_browser-chunks/chunk-6XWLIJQL.js";
import "../_browser-chunks/chunk-A242L54C.js";

// src/actions/decorator.ts
import { makeDecorator, useEffect } from "storybook/preview-api";
var delegateEventSplitter = /^(\S+)\s*(.*)$/, isIE = Element != null && !Element.prototype.matches, matchesMethod = isIE ? "msMatchesSelector" : "matches", hasMatchInAncestry = (element, selector) => {
  if (element[matchesMethod](selector))
    return !0;
  let parent = element.parentElement;
  return parent ? hasMatchInAncestry(parent, selector) : !1;
}, createHandlers = (actionsFn, ...handles) => {
  let actionsObject = actionsFn(...handles);
  return Object.entries(actionsObject).map(([key, action]) => {
    let [_, eventName, selector] = key.match(delegateEventSplitter) || [];
    return {
      eventName,
      handler: (e) => {
        (!selector || hasMatchInAncestry(e.target, selector)) && action(e);
      }
    };
  });
}, applyEventHandlers = (actionsFn, ...handles) => {
  let root = typeof globalThis.document < "u" && globalThis.document.getElementById("storybook-root");
  useEffect(() => {
    if (root) {
      let handlers = createHandlers(actionsFn, ...handles);
      return handlers.forEach(({ eventName, handler }) => root.addEventListener(eventName, handler)), () => handlers.forEach(({ eventName, handler }) => root.removeEventListener(eventName, handler));
    }
  }, [root, actionsFn, handles]);
}, withActions = makeDecorator({
  name: "withActions",
  parameterName: PARAM_KEY,
  skipIfNoParametersOrOptions: !0,
  wrapper: (getStory, context, { parameters }) => (parameters?.handles && applyEventHandlers(actions, ...parameters.handles), getStory(context))
});
export {
  withActions
};
