import {
  __export
} from "./chunk-4BE7D4DS.js";

// src/entry-preview.ts
var entry_preview_exports = {};
__export(entry_preview_exports, {
  applyDecorators: () => decorateStory,
  argTypesEnhancers: () => argTypesEnhancers,
  mount: () => mount,
  parameters: () => parameters,
  render: () => render,
  renderToCanvas: () => renderToCanvas
});
import { enhanceArgTypes, extractComponentDescription } from "storybook/internal/docs-tools";

// src/extractArgTypes.ts
import {
  convert,
  extractComponentProps,
  hasDocgen
} from "storybook/internal/docs-tools";
var ARG_TYPE_SECTIONS = ["props", "events", "slots", "exposed", "expose"], extractArgTypes = (component) => {
  if (!hasDocgen(component))
    return null;
  let usedDocgenPlugin = "exposed" in component.__docgenInfo ? "vue-component-meta" : "vue-docgen-api", argTypes = {};
  return ARG_TYPE_SECTIONS.forEach((section) => {
    extractComponentProps(component, section).forEach((extractedProp) => {
      let argType;
      if (usedDocgenPlugin === "vue-docgen-api") {
        let docgenInfo = extractedProp.docgenInfo;
        argType = extractFromVueDocgenApi(docgenInfo, section, extractedProp);
      } else {
        let docgenInfo = extractedProp.docgenInfo;
        argType = extractFromVueComponentMeta(docgenInfo, section);
      }
      if (!argType || argTypes[argType.name])
        return;
      ["events", "expose", "exposed"].includes(section) && (argType.control = { disable: !0 }), argTypes[argType.name] = argType;
    });
  }), argTypes;
}, extractFromVueDocgenApi = (docgenInfo, section, extractedProp) => {
  let type, sbType;
  if (section === "events" && (type = docgenInfo.type?.names.join(), sbType = { name: "other", value: type ?? "", required: !1 }), section === "slots") {
    let slotBindings = docgenInfo.bindings?.filter((binding) => !!binding.name).map((binding) => `${binding.name}: ${binding.type?.name ?? "unknown"}`).join("; ");
    type = slotBindings ? `{ ${slotBindings} }` : void 0, sbType = { name: "other", value: type ?? "", required: !1 };
  }
  if (section === "props") {
    let propInfo = docgenInfo;
    if (type = propInfo.type?.name, sbType = extractedProp ? convert(extractedProp.docgenInfo) : { name: "other", value: type }, propInfo.type && "elements" in propInfo.type && Array.isArray(propInfo.type.elements) && propInfo.type.elements.length > 0) {
      let elements = propInfo.type.elements.map((i) => i.name);
      type === "Array" && (type = `${elements.length === 1 ? elements[0] : `(${elements.join(" | ")})`}[]`), type === "union" ? type = elements.join(" | ") : type === "intersection" && (type = elements.join(" & "));
    }
  }
  let required = "required" in docgenInfo ? docgenInfo.required ?? !1 : !1;
  return {
    name: docgenInfo.name,
    description: docgenInfo.description,
    type: sbType ? { ...sbType, required } : { name: "other", value: type ?? "" },
    table: {
      type: type ? { summary: type } : void 0,
      defaultValue: extractedProp?.propDef.defaultValue ?? void 0,
      jsDocTags: extractedProp?.propDef.jsDocTags,
      category: section
    }
  };
}, extractFromVueComponentMeta = (docgenInfo, section) => {
  if ("global" in docgenInfo && docgenInfo.global)
    return;
  let tableType = { summary: docgenInfo.type.replace(" | undefined", "") };
  if (section === "props") {
    let propInfo = docgenInfo, defaultValue = propInfo.default ? { summary: propInfo.default } : void 0;
    return {
      name: propInfo.name,
      description: formatDescriptionWithTags(propInfo.description, propInfo.tags),
      defaultValue,
      type: convertVueComponentMetaProp(propInfo),
      table: {
        type: tableType,
        defaultValue,
        category: section
      }
    };
  } else
    return {
      name: docgenInfo.name,
      description: "description" in docgenInfo ? docgenInfo.description : "",
      type: { name: "other", value: docgenInfo.type },
      table: { type: tableType, category: section }
    };
}, convertVueComponentMetaProp = (propInfo) => {
  let schema = propInfo.schema, required = propInfo.required, fallbackSbType = { name: "other", value: propInfo.type, required }, KNOWN_SCHEMAS = ["string", "number", "function", "boolean", "symbol"];
  if (typeof schema == "string")
    return KNOWN_SCHEMAS.includes(schema) ? { name: schema, required } : fallbackSbType;
  switch (schema.kind) {
    case "enum": {
      let definedSchemas = schema.schema?.filter((item) => item !== "undefined") ?? [];
      return isBooleanSchema(definedSchemas) ? { name: "boolean", required } : isLiteralUnionSchema(definedSchemas) || isEnumSchema(definedSchemas) ? { name: "enum", value: definedSchemas.map((literal) => literal.replace(/"/g, "")), required } : definedSchemas.length === 1 ? convertVueComponentMetaProp({
        schema: definedSchemas[0],
        type: propInfo.type,
        required
      }) : (definedSchemas.length > 2 && definedSchemas.includes("true") && definedSchemas.includes("false") && (definedSchemas = definedSchemas.filter((i) => i !== "true" && i !== "false"), definedSchemas.push("boolean")), {
        name: "union",
        value: definedSchemas.map((i) => convertVueComponentMetaProp(typeof i == "object" ? {
          schema: i,
          type: i.type,
          required: !1
        } : { schema: i, type: i, required: !1 })),
        required
      });
    }
    case "array": {
      let definedSchemas = schema.schema?.filter((item) => item !== "undefined") ?? [];
      return definedSchemas.length === 0 ? fallbackSbType : definedSchemas.length === 1 ? {
        name: "array",
        value: convertVueComponentMetaProp({
          schema: definedSchemas[0],
          type: propInfo.type,
          required: !1
        }),
        required
      } : {
        name: "union",
        value: definedSchemas.map((i) => convertVueComponentMetaProp(typeof i == "object" ? {
          schema: i,
          type: i.type,
          required: !1
        } : { schema: i, type: i, required: !1 })),
        required
      };
    }
    case "object":
      return {
        name: "object",
        // while Storybook generates simple JSON object controls, nested schemas don't have specialized controls
        // so we don't need to recursively map the object schema here
        value: {},
        required
      };
    default:
      return fallbackSbType;
  }
}, formatDescriptionWithTags = (description, tags) => !tags?.length || !description ? description ?? "" : `${tags.map((tag) => `@${tag.name}: ${tag.text}`).join("<br>")}<br><br>${description}`, isLiteralUnionSchema = (schemas) => schemas.every(
  (schema) => typeof schema == "string" && schema.startsWith('"') && schema.endsWith('"')
), isEnumSchema = (schemas) => schemas.every((schema) => typeof schema == "string" && schema.includes(".")), isBooleanSchema = (schemas) => schemas.length === 2 && schemas.includes("true") && schemas.includes("false");

// src/render.ts
import { createApp, h, isReactive, isVNode, reactive } from "vue";
var render = (props, context) => {
  let { id, component: Component } = context;
  if (!Component)
    throw new Error(
      `Unable to render story ${id} as the component annotation is missing from the default export`
    );
  return () => h(Component, props, getSlots(props, context));
}, setup = (fn) => {
  globalThis.PLUGINS_SETUP_FUNCTIONS ??= /* @__PURE__ */ new Set(), globalThis.PLUGINS_SETUP_FUNCTIONS.add(fn);
}, runSetupFunctions = async (app, storyContext) => {
  globalThis && globalThis.PLUGINS_SETUP_FUNCTIONS && await Promise.all([...globalThis.PLUGINS_SETUP_FUNCTIONS].map((fn) => fn(app, storyContext)));
}, map = /* @__PURE__ */ new Map();
async function renderToCanvas({ storyFn, forceRemount, showMain, showException, storyContext, id }, canvasElement) {
  let existingApp = map.get(canvasElement);
  if (existingApp && !forceRemount) {
    let element = storyFn(), args = getArgs(element, storyContext);
    return updateArgs(existingApp.reactiveArgs, args), () => {
      teardown(existingApp.vueApp, canvasElement);
    };
  }
  existingApp && forceRemount && teardown(existingApp.vueApp, canvasElement);
  let vueApp = createApp({
    setup() {
      storyContext.args = reactive(storyContext.args);
      let rootElement = storyFn(), args = getArgs(rootElement, storyContext), appState = {
        vueApp,
        reactiveArgs: reactive(args)
      };
      return map.set(canvasElement, appState), () => h(rootElement);
    }
  });
  return vueApp.config.errorHandler = (e, instance, info) => {
    window.__STORYBOOK_PREVIEW__?.storyRenders.some(
      (renderer) => renderer.id === id && renderer.phase === "playing"
    ) ? setTimeout(() => {
      throw e;
    }, 0) : showException(e);
  }, await runSetupFunctions(vueApp, storyContext), vueApp.mount(canvasElement), showMain(), () => {
    teardown(vueApp, canvasElement);
  };
}
function getSlots(props, context) {
  let { argTypes } = context, slots = Object.entries(props).filter(([key]) => argTypes[key]?.table?.category === "slots").map(([key, value]) => [key, typeof value == "function" ? value : () => value]);
  return Object.fromEntries(slots);
}
function getArgs(element, storyContext) {
  return element.props && isVNode(element) ? element.props : storyContext.args;
}
function updateArgs(reactiveArgs, nextArgs) {
  if (Object.keys(nextArgs).length === 0)
    return;
  let currentArgs = isReactive(reactiveArgs) ? reactiveArgs : reactive(reactiveArgs);
  Object.keys(currentArgs).forEach((key) => {
    key in nextArgs || delete currentArgs[key];
  }), Object.assign(currentArgs, nextArgs);
}
function teardown(storybookApp, canvasElement) {
  storybookApp?.unmount(), map.has(canvasElement) && map.delete(canvasElement);
}

// src/decorateStory.ts
import { sanitizeStoryContextUpdate } from "storybook/preview-api";
import { h as h2 } from "vue";
function normalizeFunctionalComponent(options) {
  return typeof options == "function" ? { render: options, name: options.name } : options;
}
function prepare(rawStory, innerStory) {
  let story = rawStory;
  return story === null ? null : typeof story == "function" ? story : innerStory ? {
    // Normalize so we can always spread an object
    ...normalizeFunctionalComponent(story),
    components: { ...story.components || {}, story: innerStory }
  } : {
    render() {
      return h2(story);
    }
  };
}
function decorateStory(storyFn, decorators) {
  return decorators.reduce(
    (decorated, decorator) => (context) => {
      let story, decoratedStory = decorator((update) => {
        let sanitizedUpdate = sanitizeStoryContextUpdate(update);
        return update && (sanitizedUpdate.args = Object.assign(context.args, sanitizedUpdate.args)), story = decorated({ ...context, ...sanitizedUpdate }), story;
      }, context);
      return story || (story = decorated(context)), decoratedStory === story ? story : prepare(decoratedStory, () => h2(story));
    },
    (context) => prepare(storyFn(context))
  );
}

// src/mount.ts
import { h as h3 } from "vue";
var mount = (context) => async (Component, options) => (Component && (context.originalStoryFn = () => () => h3(Component, options?.props, options?.slots)), await context.renderToCanvas(), context.canvas);

// src/entry-preview.ts
var parameters = {
  renderer: "vue3",
  docs: {
    story: { inline: !0 },
    extractArgTypes,
    extractComponentDescription
  }
}, argTypesEnhancers = [enhanceArgTypes];

export {
  render,
  setup,
  renderToCanvas,
  decorateStory,
  mount,
  parameters,
  argTypesEnhancers,
  entry_preview_exports
};
