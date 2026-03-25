"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_commands = require("./commands");
function generateCommandHelp(command) {
  const args = [];
  const shape = command.args ? command.args.shape : {};
  for (const [name, schema] of Object.entries(shape)) {
    const zodSchema = schema;
    const description = zodSchema.description ?? "";
    args.push({ name, description });
  }
  const lines = [
    `playwright-cli ${command.name} ${Object.keys(shape).map((k) => `<${k}>`).join(" ")}`,
    "",
    command.description,
    ""
  ];
  if (args.length) {
    lines.push("Arguments:");
    lines.push(...args.map(({ name, description }) => `  <${name}>	${description}`));
  }
  if (command.options) {
    lines.push("Options:");
    const optionsShape = command.options.shape;
    for (const [name, schema] of Object.entries(optionsShape)) {
      const zodSchema = schema;
      const description = (zodSchema.description ?? "").toLowerCase();
      lines.push(`  --${name}	${description}`);
    }
  }
  return lines.join("\n");
}
function generateHelp() {
  const lines = [];
  lines.push("Usage: playwright-cli <command> [options]");
  lines.push("Commands:");
  for (const command of Object.values(import_commands.commands))
    lines.push("  " + generateHelpEntry(command));
  return lines.join("\n");
}
function generateHelpEntry(command) {
  const args = [];
  const shape = command.args.shape;
  for (const [name, schema] of Object.entries(shape)) {
    const zodSchema = schema;
    const description = zodSchema.description ?? "";
    args.push({ name, description });
  }
  const prefix = `${command.name} ${Object.keys(shape).map((k) => `<${k}>`).join(" ")}`;
  const suffix = command.description.toLowerCase();
  const padding = " ".repeat(Math.max(1, 40 - prefix.length));
  return prefix + padding + suffix;
}
async function main() {
  const help = {
    global: generateHelp(),
    commands: Object.fromEntries(
      Object.entries(import_commands.commands).map(([name, command]) => [name, generateCommandHelp(command)])
    )
  };
  const fileName = import_path.default.resolve(__dirname, "help.json").replace("lib", "src");
  console.log("Writing ", import_path.default.relative(process.cwd(), fileName));
  await import_fs.default.promises.writeFile(fileName, JSON.stringify(help, null, 2));
}
void main();
