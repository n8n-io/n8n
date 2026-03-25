"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var md_exports = {};
__export(md_exports, {
  transformMDToTS: () => transformMDToTS
});
module.exports = __toCommonJS(md_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utilsBundle = require("../utilsBundle");
var import_babelBundle = require("./babelBundle");
function transformMDToTS(code, filename) {
  const parsed = parseSpec(code, filename);
  let fixtures = resolveFixtures(filename, parsed.props.find((prop) => prop[0] === "fixtures")?.[1]);
  const seed = parsed.props.find((prop) => prop[0] === "seed")?.[1];
  if (seed) {
    const seedFile = import_path.default.resolve(import_path.default.dirname(filename), seed.text);
    const seedContents = import_fs.default.readFileSync(seedFile, "utf-8");
    const parsedSeed = parseSpec(seedContents, seedFile);
    if (parsedSeed.tests.length !== 1)
      throw new Error(`while parsing ${seedFile}: seed file must contain exactly one test`);
    if (parsedSeed.tests[0].props.length)
      throw new Error(`while parsing ${seedFile}: seed test must not have properties`);
    for (const test of parsed.tests)
      test.lines = parsedSeed.tests[0].lines.concat(test.lines);
    const seedFixtures = resolveFixtures(seedFile, parsedSeed.props.find((prop) => prop[0] === "fixtures")?.[1]);
    if (seedFixtures && fixtures)
      throw new Error(`while parsing ${filename}: either seed or test can specify fixtures, but not both`);
    fixtures ??= seedFixtures;
  }
  const map = new import_babelBundle.genMapping.GenMapping({});
  const lines = [];
  const addLine = (line) => {
    lines.push(line.text);
    if (line.source) {
      import_babelBundle.genMapping.addMapping(map, {
        generated: { line: lines.length, column: 0 },
        source: line.source.filename,
        original: { line: line.source.line, column: line.source.column - 1 }
      });
    }
  };
  if (fixtures)
    addLine({ text: `import { test, expect } from ${escapeString(import_path.default.relative(import_path.default.dirname(filename), fixtures.text))};`, source: fixtures.source });
  else
    addLine({ text: `import { test, expect } from '@playwright/test';` });
  addLine({ text: `test.describe(${escapeString(parsed.describe.text)}, () => {`, source: parsed.describe.source });
  for (const test of parsed.tests) {
    const tags = [];
    const annotations = [];
    for (const [key, value] of test.props) {
      if (key === "tag") {
        tags.push(...value.text.split(" ").map((s) => s.trim()).filter((s) => !!s));
      } else if (key === "annotation") {
        if (!value.text.includes("="))
          throw new Error(`while parsing ${filename}: annotation must be in format "type=description", found "${value}"`);
        const [type, description] = value.text.split("=").map((s) => s.trim());
        annotations.push({ type, description });
      }
    }
    let props = "";
    if (tags.length || annotations.length) {
      props = "{ ";
      if (tags.length)
        props += `tag: [${tags.map((tag) => escapeString(tag)).join(", ")}], `;
      if (annotations.length)
        props += `annotation: [${annotations.map((a) => `{ type: ${escapeString(a.type)}, description: ${escapeString(a.description)} }`).join(", ")}], `;
      props += "}, ";
    }
    addLine({ text: `  test(${escapeString(test.title.text)}, ${props}async ({ page, agent }) => {`, source: test.title.source });
    for (const line of test.lines)
      addLine({ text: "    " + line.text, source: line.source });
    addLine({ text: `  });`, source: test.title.source });
  }
  addLine({ text: `});`, source: parsed.describe.source });
  addLine({ text: `` });
  const encodedMap = import_babelBundle.genMapping.toEncodedMap(map);
  const result = lines.join("\n");
  return { code: result, map: encodedMap };
}
function resolveFixtures(filename, prop) {
  if (!prop)
    return;
  return { text: import_path.default.resolve(import_path.default.dirname(filename), prop.text), source: prop.source };
}
function escapeString(s) {
  return `'` + s.replace(/\n/g, " ").replace(/'/g, `\\'`) + `'`;
}
function parsingError(filename, node, message) {
  const position = node?.position?.start ? ` at ${node.position.start.line}:${node.position.start.column}` : "";
  return new Error(`while parsing ${filename}${position}: ${message}`);
}
function asText(filename, node, errorMessage, skipChild) {
  let children = node.children.filter((child) => child !== skipChild);
  while (children.length === 1 && children[0].type === "paragraph")
    children = children[0].children;
  if (children.length !== 1 || children[0].type !== "text")
    throw parsingError(filename, node, errorMessage);
  return { text: children[0].value, source: node.position ? { filename, line: node.position.start.line, column: node.position.start.column } : void 0 };
}
function parseSpec(content, filename) {
  const root = (0, import_utilsBundle.parseMarkdown)(content);
  const props = [];
  const children = [...root.children];
  const describeNode = children[0];
  children.shift();
  if (describeNode?.type !== "heading" || describeNode.depth !== 2)
    throw parsingError(filename, describeNode, `describe title must be ##`);
  const describe = asText(filename, describeNode, `describe title must be ##`);
  if (children[0]?.type === "list") {
    parseProps(filename, children[0], props);
    children.shift();
  }
  const tests = [];
  while (children.length) {
    let nextIndex = children.findIndex((n, i) => i > 0 && n.type === "heading" && n.depth === 3);
    if (nextIndex === -1)
      nextIndex = children.length;
    const testNodes = children.splice(0, nextIndex);
    tests.push(parseTest(filename, testNodes));
  }
  return { describe, tests, props };
}
function parseProp(filename, node, props) {
  const propText = asText(filename, node, `property must be a list item without children`);
  const match = propText.text.match(/^([^:]+):(.*)$/);
  if (!match)
    throw parsingError(filename, node, `property must be in format "key: value"`);
  props.push([match[1].trim(), { text: match[2].trim(), source: propText.source }]);
}
function parseProps(filename, node, props) {
  for (const prop of node.children || []) {
    if (prop.type !== "listItem")
      throw parsingError(filename, prop, `property must be a list item without children`);
    parseProp(filename, prop, props);
  }
}
function parseTest(filename, nodes) {
  const titleNode = nodes[0];
  nodes.shift();
  if (titleNode.type !== "heading" || titleNode.depth !== 3)
    throw parsingError(filename, titleNode, `test title must be ###`);
  const title = asText(filename, titleNode, `test title must be ###`);
  const props = [];
  let handlingProps = true;
  const lines = [];
  const visit = (node, indent) => {
    if (node.type === "list") {
      for (const child of node.children)
        visit(child, indent);
      return;
    }
    if (node.type === "listItem") {
      const listItem = node;
      const lastChild = listItem.children[listItem.children.length - 1];
      if (lastChild?.type === "code") {
        handlingProps = false;
        const { text, source } = asText(filename, listItem, `code step must be a list item with a single code block`, lastChild);
        lines.push({ text: `${indent}await test.step(${escapeString(text)}, async () => {`, source });
        for (const [index, code] of lastChild.value.split("\n").entries())
          lines.push({ text: indent + "  " + code, source: lastChild.position ? { filename, line: lastChild.position.start.line + 1 + index, column: lastChild.position.start.column } : void 0 });
        lines.push({ text: `${indent}});`, source });
      } else {
        const { text, source } = asText(filename, listItem, `step must contain a single instruction`, lastChild?.type === "list" ? lastChild : void 0);
        let isGroup = false;
        if (handlingProps && lastChild?.type !== "list" && ["tag:", "annotation:"].some((prefix) => text.startsWith(prefix))) {
          parseProp(filename, listItem, props);
        } else if (text.startsWith("group:")) {
          isGroup = true;
          lines.push({ text: `${indent}await test.step(${escapeString(text.substring("group:".length).trim())}, async () => {`, source });
        } else if (text.startsWith("expect:")) {
          handlingProps = false;
          const assertion = text.substring("expect:".length).trim();
          lines.push({ text: `${indent}await agent.expect(${escapeString(assertion)});`, source });
        } else if (!text.startsWith("//")) {
          handlingProps = false;
          lines.push({ text: `${indent}await agent.perform(${escapeString(text)});`, source });
        }
        if (lastChild?.type === "list")
          visit(lastChild, indent + (isGroup ? "  " : ""));
        if (isGroup)
          lines.push({ text: `${indent}});`, source });
      }
    } else {
      throw parsingError(filename, node, `test step must be a markdown list item`);
    }
  };
  for (const node of nodes)
    visit(node, "");
  return { title, lines, props };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  transformMDToTS
});
