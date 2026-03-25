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
var actions_exports = {};
__export(actions_exports, {
  cachedActionsSchema: () => cachedActionsSchema
});
module.exports = __toCommonJS(actions_exports);
var import_mcpBundle = require("../../mcpBundle");
const modifiersSchema = import_mcpBundle.z.array(
  import_mcpBundle.z.enum(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"])
);
const navigateActionSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("navigate"),
  url: import_mcpBundle.z.string()
});
const clickActionSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("click"),
  selector: import_mcpBundle.z.string(),
  button: import_mcpBundle.z.enum(["left", "right", "middle"]).optional(),
  clickCount: import_mcpBundle.z.number().optional(),
  modifiers: modifiersSchema.optional()
});
const dragActionSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("drag"),
  sourceSelector: import_mcpBundle.z.string(),
  targetSelector: import_mcpBundle.z.string()
});
const hoverActionSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("hover"),
  selector: import_mcpBundle.z.string(),
  modifiers: modifiersSchema.optional()
});
const selectOptionActionSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("selectOption"),
  selector: import_mcpBundle.z.string(),
  labels: import_mcpBundle.z.array(import_mcpBundle.z.string())
});
const pressActionSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("pressKey"),
  key: import_mcpBundle.z.string()
});
const pressSequentiallyActionSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("pressSequentially"),
  selector: import_mcpBundle.z.string(),
  text: import_mcpBundle.z.string(),
  submit: import_mcpBundle.z.boolean().optional()
});
const fillActionSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("fill"),
  selector: import_mcpBundle.z.string(),
  text: import_mcpBundle.z.string(),
  submit: import_mcpBundle.z.boolean().optional()
});
const setCheckedSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("setChecked"),
  selector: import_mcpBundle.z.string(),
  checked: import_mcpBundle.z.boolean()
});
const expectVisibleSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("expectVisible"),
  selector: import_mcpBundle.z.string(),
  isNot: import_mcpBundle.z.boolean().optional()
});
const expectValueSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("expectValue"),
  selector: import_mcpBundle.z.string(),
  type: import_mcpBundle.z.enum(["textbox", "checkbox", "radio", "combobox", "slider"]),
  value: import_mcpBundle.z.string(),
  isNot: import_mcpBundle.z.boolean().optional()
});
const expectAriaSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("expectAria"),
  template: import_mcpBundle.z.string(),
  isNot: import_mcpBundle.z.boolean().optional()
});
const expectURLSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("expectURL"),
  value: import_mcpBundle.z.string().optional(),
  regex: import_mcpBundle.z.string().optional(),
  isNot: import_mcpBundle.z.boolean().optional()
});
const expectTitleSchema = import_mcpBundle.z.object({
  method: import_mcpBundle.z.literal("expectTitle"),
  value: import_mcpBundle.z.string(),
  isNot: import_mcpBundle.z.boolean().optional()
});
const actionSchema = import_mcpBundle.z.discriminatedUnion("method", [
  navigateActionSchema,
  clickActionSchema,
  dragActionSchema,
  hoverActionSchema,
  selectOptionActionSchema,
  pressActionSchema,
  pressSequentiallyActionSchema,
  fillActionSchema,
  setCheckedSchema,
  expectVisibleSchema,
  expectValueSchema,
  expectAriaSchema,
  expectURLSchema,
  expectTitleSchema
]);
const actionWithCodeSchema = actionSchema.and(import_mcpBundle.z.object({
  code: import_mcpBundle.z.string()
}));
const cachedActionsSchema = import_mcpBundle.z.record(import_mcpBundle.z.string(), import_mcpBundle.z.object({
  actions: import_mcpBundle.z.array(actionWithCodeSchema)
}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cachedActionsSchema
});
