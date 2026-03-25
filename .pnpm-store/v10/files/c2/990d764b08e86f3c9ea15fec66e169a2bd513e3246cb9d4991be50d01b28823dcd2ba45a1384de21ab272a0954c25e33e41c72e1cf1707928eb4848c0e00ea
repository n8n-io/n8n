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
var helpGenerator_exports = {};
__export(helpGenerator_exports, {
  generateHelp: () => generateHelp,
  generateHelpJSON: () => generateHelpJSON,
  generateReadme: () => generateReadme
});
module.exports = __toCommonJS(helpGenerator_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_commands = require("./commands");
function commandArgs(command) {
  const args = [];
  const shape = command.args ? command.args.shape : {};
  for (const [name, schema] of Object.entries(shape)) {
    const zodSchema = schema;
    const description = zodSchema.description ?? "";
    args.push({ name, description, optional: zodSchema.safeParse(void 0).success });
  }
  return args;
}
function commandArgsText(args) {
  return args.map((a) => a.optional ? `[${a.name}]` : `<${a.name}>`).join(" ");
}
function generateCommandHelp(command) {
  const args = commandArgs(command);
  const lines = [
    `playwright-cli ${command.name} ${commandArgsText(args)}`,
    "",
    command.description,
    ""
  ];
  if (args.length) {
    lines.push("Arguments:");
    lines.push(...args.map((a) => formatWithGap(`  ${a.optional ? `[${a.name}]` : `<${a.name}>`}`, a.description.toLowerCase())));
  }
  if (command.options) {
    lines.push("Options:");
    const optionsShape = command.options.shape;
    for (const [name, schema] of Object.entries(optionsShape)) {
      const zodSchema = schema;
      const description = (zodSchema.description ?? "").toLowerCase();
      lines.push(formatWithGap(`  --${name}`, description));
    }
  }
  return lines.join("\n");
}
const categories = [
  { name: "core", title: "Core" },
  { name: "navigation", title: "Navigation" },
  { name: "keyboard", title: "Keyboard" },
  { name: "mouse", title: "Mouse" },
  { name: "export", title: "Save as" },
  { name: "tabs", title: "Tabs" },
  { name: "storage", title: "Storage" },
  { name: "network", title: "Network" },
  { name: "devtools", title: "DevTools" },
  { name: "install", title: "Install" },
  { name: "config", title: "Configuration" },
  { name: "browsers", title: "Browser sessions" }
];
function generateHelp() {
  const lines = [];
  lines.push("Usage: playwright-cli <command> [args] [options]");
  lines.push("Usage: playwright-cli -s=<session> <command> [args] [options]");
  const commandsByCategory = /* @__PURE__ */ new Map();
  for (const c of categories)
    commandsByCategory.set(c.name, []);
  for (const command of Object.values(import_commands.commands)) {
    if (command.hidden)
      continue;
    commandsByCategory.get(command.category).push(command);
  }
  for (const c of categories) {
    const cc = commandsByCategory.get(c.name);
    if (!cc.length)
      continue;
    lines.push(`
${c.title}:`);
    for (const command of cc)
      lines.push(generateHelpEntry(command));
  }
  lines.push("\nGlobal options:");
  lines.push(formatWithGap("  --help [command]", "print help"));
  lines.push(formatWithGap("  --version", "print version"));
  return lines.join("\n");
}
function generateReadme() {
  const lines = [];
  lines.push("\n## Commands");
  const commandsByCategory = /* @__PURE__ */ new Map();
  for (const c of categories)
    commandsByCategory.set(c.name, []);
  for (const command of Object.values(import_commands.commands))
    commandsByCategory.get(command.category).push(command);
  for (const c of categories) {
    const cc = commandsByCategory.get(c.name);
    if (!cc.length)
      continue;
    lines.push(`
### ${c.title}
`);
    lines.push("```bash");
    for (const command of cc)
      lines.push(generateReadmeEntry(command));
    lines.push("```");
  }
  return lines.join("\n");
}
function generateHelpEntry(command) {
  const args = commandArgs(command);
  const prefix = `  ${command.name} ${commandArgsText(args)}`;
  const suffix = command.description.toLowerCase();
  return formatWithGap(prefix, suffix);
}
function generateReadmeEntry(command) {
  const args = commandArgs(command);
  const prefix = `playwright-cli ${command.name} ${commandArgsText(args)}`;
  const suffix = "# " + command.description.toLowerCase();
  return formatWithGap(prefix, suffix, 40);
}
function unwrapZodType(schema) {
  if ("unwrap" in schema && typeof schema.unwrap === "function")
    return unwrapZodType(schema.unwrap());
  return schema;
}
function generateHelpJSON() {
  const booleanOptions = /* @__PURE__ */ new Set();
  for (const command of Object.values(import_commands.commands)) {
    if (!command.options)
      continue;
    const optionsShape = command.options.shape;
    for (const [name, schema] of Object.entries(optionsShape)) {
      const innerSchema = unwrapZodType(schema);
      if (innerSchema instanceof import_mcpBundle.z.ZodBoolean)
        booleanOptions.add(name);
    }
  }
  const help = {
    global: generateHelp(),
    commands: Object.fromEntries(
      Object.entries(import_commands.commands).map(([name, command]) => [name, generateCommandHelp(command)])
    ),
    booleanOptions: [...booleanOptions]
  };
  return help;
}
function formatWithGap(prefix, text, threshold = 30) {
  const indent = Math.max(1, threshold - prefix.length);
  return prefix + " ".repeat(indent) + text;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateHelp,
  generateHelpJSON,
  generateReadme
});
