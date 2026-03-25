import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  toEstree
} from "./chunk-DSBSHG6H.js";
import "./chunk-DRM3MJ7Y.js";

// ../node_modules/@storybook/docs-mdx/dist/index.js
var getAttr = (elt, what) => elt.attributes.find((n) => n.type === "JSXAttribute" && n.name.name === what), getAttrValue = (elt, what) => getAttr(elt, what)?.value, getAttrLiteral = (elt, what) => {
  let attrValue = getAttrValue(elt, what);
  if (attrValue) {
    if (attrValue.type === "Literal")
      return attrValue.value;
    throw new Error(`Expected string literal ${what}, received ${attrValue.type}`);
  }
}, getOf = (elt, varToImport) => {
  let ofAttrValue = getAttrValue(elt, "of");
  if (ofAttrValue)
    if (ofAttrValue.type === "JSXExpressionContainer") {
      let of = ofAttrValue.expression;
      if (of?.type === "Identifier") {
        let importName = varToImport[of.name];
        if (importName)
          return importName;
        throw new Error(`Unknown identifier ${of.name}`);
      } else
        throw new Error(`Expected identifier, received ${of.type}`);
    } else
      throw new Error(`Expected JSX expression, received ${ofAttrValue.type}`);
}, getTags = (elt) => {
  let tagsAttr = getAttr(elt, "tags");
  if (!tagsAttr)
    return;
  let tagsContainer = tagsAttr.value;
  if (tagsContainer.type === "JSXExpressionContainer") {
    let tagsArray = tagsContainer.expression;
    if (tagsArray.type === "ArrayExpression")
      return tagsArray.elements.map((tag) => {
        if (tag.type === "Literal" && typeof tag.value == "string")
          return tag.value;
        throw new Error(`Expected string literal tag, received ${tag.type}`);
      });
    throw new Error(`Expected tags array, received ${tagsArray.type}`);
  } else
    throw new Error(`Expected JSX expression tags, received ${tagsContainer.type}`);
}, getIsTemplate = (elt) => {
  let isTemplateAttr = getAttr(elt, "isTemplate");
  if (!isTemplateAttr)
    return !1;
  let isTemplate = isTemplateAttr.value;
  if (isTemplate == null)
    return !0;
  if (isTemplate.type === "JSXExpressionContainer") {
    let expression = isTemplate.expression;
    if (expression.type === "Literal" && typeof expression.value == "boolean")
      return expression.value;
    throw new Error(`Expected boolean isTemplate, received ${typeof expression.value}`);
  } else
    throw new Error(`Expected expression isTemplate, received ${isTemplate.type}`);
}, extractTitle = (root, varToImport) => {
  let result = { title: void 0, of: void 0, name: void 0, isTemplate: !1 }, fragments = root.body.filter(
    (child) => child.type === "ExpressionStatement" && child.expression.type === "JSXFragment"
  );
  if (fragments.length > 1)
    throw new Error("duplicate contents");
  return fragments.length === 0 || fragments[0].expression.children.forEach((child) => {
    if (child.type === "JSXElement") {
      let { openingElement } = child;
      if (openingElement.name.name === "Meta") {
        if (result.title || result.name || result.of)
          throw new Error("Meta can only be declared once");
        result.title = getAttrLiteral(openingElement, "title"), result.name = getAttrLiteral(openingElement, "name"), result.of = getOf(openingElement, varToImport), result.isTemplate = getIsTemplate(openingElement), result.metaTags = getTags(openingElement);
      }
    } else if (child.type !== "JSXExpressionContainer")
      throw new Error(`Unexpected JSX child: ${child.type}`);
  }), result;
}, extractImports = (root) => {
  let varToImport = {};
  return root.body.forEach((child) => {
    if (child.type === "ImportDeclaration") {
      let { source, specifiers } = child;
      if (source.type === "Literal")
        specifiers.forEach((s) => {
          varToImport[s.local.name] = source.value.toString();
        });
      else
        throw new Error("MDX: unexpected import source");
    }
  }), varToImport;
}, plugin = (store) => (root) => {
  let estree = toEstree(root), varToImport = extractImports(estree), { title, of, name, isTemplate, metaTags } = extractTitle(estree, varToImport);
  return store.title = title, store.of = of, store.name = name, store.isTemplate = isTemplate, store.metaTags = metaTags, store.imports = Array.from(new Set(Object.values(varToImport))), root;
}, analyze = async (code) => {
  let store = {
    title: void 0,
    of: void 0,
    name: void 0,
    isTemplate: !1,
    metaTags: void 0,
    imports: void 0
  }, { compile } = await import("./mdx-N42X6CFJ-LY7LEJHJ.js");
  await compile(code, {
    rehypePlugins: [[plugin, store]]
  });
  let { title, of, name, isTemplate, metaTags, imports = [] } = store;
  return { title, of, name, isTemplate, metaTags, imports };
};
export {
  analyze,
  extractImports,
  plugin
};
