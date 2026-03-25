"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var performTools_exports = {};
__export(performTools_exports, {
  default: () => performTools_default
});
module.exports = __toCommonJS(performTools_exports);
var import_mcpBundle = require("../../mcpBundle");
var import_tool = require("./tool");
const navigateSchema = import_mcpBundle.z.object({
  url: import_mcpBundle.z.string().describe("URL to navigate to")
});
const navigate = (0, import_tool.defineTool)({
  schema: {
    name: "browser_navigate",
    title: "Navigate to URL",
    description: "Navigate to a URL",
    inputSchema: navigateSchema
  },
  handle: async (progress, context, params) => {
    return await context.runActionNoWait(progress, {
      method: "navigate",
      url: params.url
    });
  }
});
const snapshot = (0, import_tool.defineTool)({
  schema: {
    name: "browser_snapshot",
    title: "Page snapshot",
    description: "Capture accessibility snapshot of the current page, this is better than screenshot",
    inputSchema: import_mcpBundle.z.object({})
  },
  handle: async (progress, context, params) => {
    return await context.snapshotResult(progress);
  }
});
const elementSchema = import_mcpBundle.z.object({
  element: import_mcpBundle.z.string().describe("Human-readable element description used to obtain permission to interact with the element"),
  ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot")
});
const clickSchema = elementSchema.extend({
  doubleClick: import_mcpBundle.z.boolean().optional().describe("Whether to perform a double click instead of a single click"),
  button: import_mcpBundle.z.enum(["left", "right", "middle"]).optional().describe("Button to click, defaults to left"),
  modifiers: import_mcpBundle.z.array(import_mcpBundle.z.enum(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"])).optional().describe("Modifier keys to press")
});
const click = (0, import_tool.defineTool)({
  schema: {
    name: "browser_click",
    title: "Click",
    description: "Perform click on a web page",
    inputSchema: clickSchema
  },
  handle: async (progress, context, params) => {
    const [selector] = await context.refSelectors(progress, [params]);
    return await context.runActionAndWait(progress, {
      method: "click",
      selector,
      button: params.button,
      modifiers: params.modifiers,
      clickCount: params.doubleClick ? 2 : void 0
    });
  }
});
const drag = (0, import_tool.defineTool)({
  schema: {
    name: "browser_drag",
    title: "Drag mouse",
    description: "Perform drag and drop between two elements",
    inputSchema: import_mcpBundle.z.object({
      startElement: import_mcpBundle.z.string().describe("Human-readable source element description used to obtain the permission to interact with the element"),
      startRef: import_mcpBundle.z.string().describe("Exact source element reference from the page snapshot"),
      endElement: import_mcpBundle.z.string().describe("Human-readable target element description used to obtain the permission to interact with the element"),
      endRef: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot")
    })
  },
  handle: async (progress, context, params) => {
    const [sourceSelector, targetSelector] = await context.refSelectors(progress, [
      { ref: params.startRef, element: params.startElement },
      { ref: params.endRef, element: params.endElement }
    ]);
    return await context.runActionAndWait(progress, {
      method: "drag",
      sourceSelector,
      targetSelector
    });
  }
});
const hoverSchema = elementSchema.extend({
  modifiers: import_mcpBundle.z.array(import_mcpBundle.z.enum(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"])).optional().describe("Modifier keys to press")
});
const hover = (0, import_tool.defineTool)({
  schema: {
    name: "browser_hover",
    title: "Hover mouse",
    description: "Hover over element on page",
    inputSchema: hoverSchema
  },
  handle: async (progress, context, params) => {
    const [selector] = await context.refSelectors(progress, [params]);
    return await context.runActionAndWait(progress, {
      method: "hover",
      selector,
      modifiers: params.modifiers
    });
  }
});
const selectOptionSchema = elementSchema.extend({
  values: import_mcpBundle.z.array(import_mcpBundle.z.string()).describe("Array of values to select in the dropdown. This can be a single value or multiple values.")
});
const selectOption = (0, import_tool.defineTool)({
  schema: {
    name: "browser_select_option",
    title: "Select option",
    description: "Select an option in a dropdown",
    inputSchema: selectOptionSchema
  },
  handle: async (progress, context, params) => {
    const [selector] = await context.refSelectors(progress, [params]);
    return await context.runActionAndWait(progress, {
      method: "selectOption",
      selector,
      labels: params.values
    });
  }
});
const pressKey = (0, import_tool.defineTool)({
  schema: {
    name: "browser_press_key",
    title: "Press a key",
    description: "Press a key on the keyboard",
    inputSchema: import_mcpBundle.z.object({
      key: import_mcpBundle.z.string().describe("Name of the key to press or a character to generate, such as `ArrowLeft` or `a`"),
      modifiers: import_mcpBundle.z.array(import_mcpBundle.z.enum(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"])).optional().describe("Modifier keys to press")
    })
  },
  handle: async (progress, context, params) => {
    return await context.runActionAndWait(progress, {
      method: "pressKey",
      key: params.modifiers ? [...params.modifiers, params.key].join("+") : params.key
    });
  }
});
const typeSchema = elementSchema.extend({
  text: import_mcpBundle.z.string().describe("Text to type into the element"),
  submit: import_mcpBundle.z.boolean().optional().describe("Whether to submit entered text (press Enter after)"),
  slowly: import_mcpBundle.z.boolean().optional().describe("Whether to type one character at a time. Useful for triggering key handlers in the page. By default entire text is filled in at once.")
});
const type = (0, import_tool.defineTool)({
  schema: {
    name: "browser_type",
    title: "Type text",
    description: "Type text into editable element",
    inputSchema: typeSchema
  },
  handle: async (progress, context, params) => {
    const [selector] = await context.refSelectors(progress, [params]);
    if (params.slowly) {
      return await context.runActionAndWait(progress, {
        method: "pressSequentially",
        selector,
        text: params.text,
        submit: params.submit
      });
    } else {
      return await context.runActionAndWait(progress, {
        method: "fill",
        selector,
        text: params.text,
        submit: params.submit
      });
    }
  }
});
const fillForm = (0, import_tool.defineTool)({
  schema: {
    name: "browser_fill_form",
    title: "Fill form",
    description: "Fill multiple form fields. Always use this tool when you can fill more than one field at a time.",
    inputSchema: import_mcpBundle.z.object({
      fields: import_mcpBundle.z.array(import_mcpBundle.z.object({
        name: import_mcpBundle.z.string().describe("Human-readable field name"),
        type: import_mcpBundle.z.enum(["textbox", "checkbox", "radio", "combobox", "slider"]).describe("Type of the field"),
        ref: import_mcpBundle.z.string().describe("Exact target field reference from the page snapshot"),
        value: import_mcpBundle.z.string().describe("Value to fill in the field. If the field is a checkbox, the value should be `true` or `false`. If the field is a combobox, the value should be the text of the option.")
      })).describe("Fields to fill in")
    })
  },
  handle: async (progress, context, params) => {
    const actions = [];
    for (const field of params.fields) {
      const [selector] = await context.refSelectors(progress, [{ ref: field.ref, element: field.name }]);
      if (field.type === "textbox" || field.type === "slider") {
        actions.push({
          method: "fill",
          selector,
          text: field.value
        });
      } else if (field.type === "checkbox" || field.type === "radio") {
        actions.push({
          method: "setChecked",
          selector,
          checked: field.value === "true"
        });
      } else if (field.type === "combobox") {
        actions.push({
          method: "selectOption",
          selector,
          labels: [field.value]
        });
      }
    }
    return await context.runActionsAndWait(progress, actions);
  }
});
const setCheckedSchema = elementSchema.extend({
  checked: import_mcpBundle.z.boolean().describe("Whether to check the checkbox")
});
const setChecked = (0, import_tool.defineTool)({
  schema: {
    name: "browser_set_checked",
    title: "Set checked",
    description: "Set the checked state of a checkbox",
    inputSchema: setCheckedSchema
  },
  handle: async (progress, context, params) => {
    const [selector] = await context.refSelectors(progress, [params]);
    return await context.runActionAndWait(progress, {
      method: "setChecked",
      selector,
      checked: params.checked
    });
  }
});
var performTools_default = [
  navigate,
  snapshot,
  click,
  drag,
  hover,
  selectOption,
  pressKey,
  type,
  fillForm,
  setChecked
];
