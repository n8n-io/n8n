/**
* @vue/compiler-dom v3.5.26
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var compilerCore = require('@vue/compiler-core');
var shared = require('@vue/shared');

const V_MODEL_RADIO = /* @__PURE__ */ Symbol(`vModelRadio` );
const V_MODEL_CHECKBOX = /* @__PURE__ */ Symbol(
  `vModelCheckbox` 
);
const V_MODEL_TEXT = /* @__PURE__ */ Symbol(`vModelText` );
const V_MODEL_SELECT = /* @__PURE__ */ Symbol(
  `vModelSelect` 
);
const V_MODEL_DYNAMIC = /* @__PURE__ */ Symbol(
  `vModelDynamic` 
);
const V_ON_WITH_MODIFIERS = /* @__PURE__ */ Symbol(
  `vOnModifiersGuard` 
);
const V_ON_WITH_KEYS = /* @__PURE__ */ Symbol(
  `vOnKeysGuard` 
);
const V_SHOW = /* @__PURE__ */ Symbol(`vShow` );
const TRANSITION = /* @__PURE__ */ Symbol(`Transition` );
const TRANSITION_GROUP = /* @__PURE__ */ Symbol(
  `TransitionGroup` 
);
compilerCore.registerRuntimeHelpers({
  [V_MODEL_RADIO]: `vModelRadio`,
  [V_MODEL_CHECKBOX]: `vModelCheckbox`,
  [V_MODEL_TEXT]: `vModelText`,
  [V_MODEL_SELECT]: `vModelSelect`,
  [V_MODEL_DYNAMIC]: `vModelDynamic`,
  [V_ON_WITH_MODIFIERS]: `withModifiers`,
  [V_ON_WITH_KEYS]: `withKeys`,
  [V_SHOW]: `vShow`,
  [TRANSITION]: `Transition`,
  [TRANSITION_GROUP]: `TransitionGroup`
});

const parserOptions = {
  parseMode: "html",
  isVoidTag: shared.isVoidTag,
  isNativeTag: (tag) => shared.isHTMLTag(tag) || shared.isSVGTag(tag) || shared.isMathMLTag(tag),
  isPreTag: (tag) => tag === "pre",
  isIgnoreNewlineTag: (tag) => tag === "pre" || tag === "textarea",
  decodeEntities: void 0,
  isBuiltInComponent: (tag) => {
    if (tag === "Transition" || tag === "transition") {
      return TRANSITION;
    } else if (tag === "TransitionGroup" || tag === "transition-group") {
      return TRANSITION_GROUP;
    }
  },
  // https://html.spec.whatwg.org/multipage/parsing.html#tree-construction-dispatcher
  getNamespace(tag, parent, rootNamespace) {
    let ns = parent ? parent.ns : rootNamespace;
    if (parent && ns === 2) {
      if (parent.tag === "annotation-xml") {
        if (tag === "svg") {
          return 1;
        }
        if (parent.props.some(
          (a) => a.type === 6 && a.name === "encoding" && a.value != null && (a.value.content === "text/html" || a.value.content === "application/xhtml+xml")
        )) {
          ns = 0;
        }
      } else if (/^m(?:[ions]|text)$/.test(parent.tag) && tag !== "mglyph" && tag !== "malignmark") {
        ns = 0;
      }
    } else if (parent && ns === 1) {
      if (parent.tag === "foreignObject" || parent.tag === "desc" || parent.tag === "title") {
        ns = 0;
      }
    }
    if (ns === 0) {
      if (tag === "svg") {
        return 1;
      }
      if (tag === "math") {
        return 2;
      }
    }
    return ns;
  }
};

const transformStyle = (node) => {
  if (node.type === 1) {
    node.props.forEach((p, i) => {
      if (p.type === 6 && p.name === "style" && p.value) {
        node.props[i] = {
          type: 7,
          name: `bind`,
          arg: compilerCore.createSimpleExpression(`style`, true, p.loc),
          exp: parseInlineCSS(p.value.content, p.loc),
          modifiers: [],
          loc: p.loc
        };
      }
    });
  }
};
const parseInlineCSS = (cssText, loc) => {
  const normalized = shared.parseStringStyle(cssText);
  return compilerCore.createSimpleExpression(
    JSON.stringify(normalized),
    false,
    loc,
    3
  );
};

function createDOMCompilerError(code, loc) {
  return compilerCore.createCompilerError(
    code,
    loc,
    DOMErrorMessages 
  );
}
const DOMErrorCodes = {
  "X_V_HTML_NO_EXPRESSION": 54,
  "54": "X_V_HTML_NO_EXPRESSION",
  "X_V_HTML_WITH_CHILDREN": 55,
  "55": "X_V_HTML_WITH_CHILDREN",
  "X_V_TEXT_NO_EXPRESSION": 56,
  "56": "X_V_TEXT_NO_EXPRESSION",
  "X_V_TEXT_WITH_CHILDREN": 57,
  "57": "X_V_TEXT_WITH_CHILDREN",
  "X_V_MODEL_ON_INVALID_ELEMENT": 58,
  "58": "X_V_MODEL_ON_INVALID_ELEMENT",
  "X_V_MODEL_ARG_ON_ELEMENT": 59,
  "59": "X_V_MODEL_ARG_ON_ELEMENT",
  "X_V_MODEL_ON_FILE_INPUT_ELEMENT": 60,
  "60": "X_V_MODEL_ON_FILE_INPUT_ELEMENT",
  "X_V_MODEL_UNNECESSARY_VALUE": 61,
  "61": "X_V_MODEL_UNNECESSARY_VALUE",
  "X_V_SHOW_NO_EXPRESSION": 62,
  "62": "X_V_SHOW_NO_EXPRESSION",
  "X_TRANSITION_INVALID_CHILDREN": 63,
  "63": "X_TRANSITION_INVALID_CHILDREN",
  "X_IGNORED_SIDE_EFFECT_TAG": 64,
  "64": "X_IGNORED_SIDE_EFFECT_TAG",
  "__EXTEND_POINT__": 65,
  "65": "__EXTEND_POINT__"
};
const DOMErrorMessages = {
  [54]: `v-html is missing expression.`,
  [55]: `v-html will override element children.`,
  [56]: `v-text is missing expression.`,
  [57]: `v-text will override element children.`,
  [58]: `v-model can only be used on <input>, <textarea> and <select> elements.`,
  [59]: `v-model argument is not supported on plain elements.`,
  [60]: `v-model cannot be used on file inputs since they are read-only. Use a v-on:change listener instead.`,
  [61]: `Unnecessary value binding used alongside v-model. It will interfere with v-model's behavior.`,
  [62]: `v-show is missing expression.`,
  [63]: `<Transition> expects exactly one child element or component.`,
  [64]: `Tags with side effect (<script> and <style>) are ignored in client component templates.`
};

const transformVHtml = (dir, node, context) => {
  const { exp, loc } = dir;
  if (!exp) {
    context.onError(
      createDOMCompilerError(54, loc)
    );
  }
  if (node.children.length) {
    context.onError(
      createDOMCompilerError(55, loc)
    );
    node.children.length = 0;
  }
  return {
    props: [
      compilerCore.createObjectProperty(
        compilerCore.createSimpleExpression(`innerHTML`, true, loc),
        exp || compilerCore.createSimpleExpression("", true)
      )
    ]
  };
};

const transformVText = (dir, node, context) => {
  const { exp, loc } = dir;
  if (!exp) {
    context.onError(
      createDOMCompilerError(56, loc)
    );
  }
  if (node.children.length) {
    context.onError(
      createDOMCompilerError(57, loc)
    );
    node.children.length = 0;
  }
  return {
    props: [
      compilerCore.createObjectProperty(
        compilerCore.createSimpleExpression(`textContent`, true),
        exp ? compilerCore.getConstantType(exp, context) > 0 ? exp : compilerCore.createCallExpression(
          context.helperString(compilerCore.TO_DISPLAY_STRING),
          [exp],
          loc
        ) : compilerCore.createSimpleExpression("", true)
      )
    ]
  };
};

const transformModel = (dir, node, context) => {
  const baseResult = compilerCore.transformModel(dir, node, context);
  if (!baseResult.props.length || node.tagType === 1) {
    return baseResult;
  }
  if (dir.arg) {
    context.onError(
      createDOMCompilerError(
        59,
        dir.arg.loc
      )
    );
  }
  function checkDuplicatedValue() {
    const value = compilerCore.findDir(node, "bind");
    if (value && compilerCore.isStaticArgOf(value.arg, "value")) {
      context.onError(
        createDOMCompilerError(
          61,
          value.loc
        )
      );
    }
  }
  const { tag } = node;
  const isCustomElement = context.isCustomElement(tag);
  if (tag === "input" || tag === "textarea" || tag === "select" || isCustomElement) {
    let directiveToUse = V_MODEL_TEXT;
    let isInvalidType = false;
    if (tag === "input" || isCustomElement) {
      const type = compilerCore.findProp(node, `type`);
      if (type) {
        if (type.type === 7) {
          directiveToUse = V_MODEL_DYNAMIC;
        } else if (type.value) {
          switch (type.value.content) {
            case "radio":
              directiveToUse = V_MODEL_RADIO;
              break;
            case "checkbox":
              directiveToUse = V_MODEL_CHECKBOX;
              break;
            case "file":
              isInvalidType = true;
              context.onError(
                createDOMCompilerError(
                  60,
                  dir.loc
                )
              );
              break;
            default:
              checkDuplicatedValue();
              break;
          }
        }
      } else if (compilerCore.hasDynamicKeyVBind(node)) {
        directiveToUse = V_MODEL_DYNAMIC;
      } else {
        checkDuplicatedValue();
      }
    } else if (tag === "select") {
      directiveToUse = V_MODEL_SELECT;
    } else {
      checkDuplicatedValue();
    }
    if (!isInvalidType) {
      baseResult.needRuntime = context.helper(directiveToUse);
    }
  } else {
    context.onError(
      createDOMCompilerError(
        58,
        dir.loc
      )
    );
  }
  baseResult.props = baseResult.props.filter(
    (p) => !(p.key.type === 4 && p.key.content === "modelValue")
  );
  return baseResult;
};

const isEventOptionModifier = /* @__PURE__ */ shared.makeMap(`passive,once,capture`);
const isNonKeyModifier = /* @__PURE__ */ shared.makeMap(
  // event propagation management
  `stop,prevent,self,ctrl,shift,alt,meta,exact,middle`
);
const maybeKeyModifier = /* @__PURE__ */ shared.makeMap("left,right");
const isKeyboardEvent = /* @__PURE__ */ shared.makeMap(`onkeyup,onkeydown,onkeypress`);
const resolveModifiers = (key, modifiers, context, loc) => {
  const keyModifiers = [];
  const nonKeyModifiers = [];
  const eventOptionModifiers = [];
  for (let i = 0; i < modifiers.length; i++) {
    const modifier = modifiers[i].content;
    if (modifier === "native" && compilerCore.checkCompatEnabled(
      "COMPILER_V_ON_NATIVE",
      context,
      loc
    )) {
      eventOptionModifiers.push(modifier);
    } else if (isEventOptionModifier(modifier)) {
      eventOptionModifiers.push(modifier);
    } else {
      if (maybeKeyModifier(modifier)) {
        if (compilerCore.isStaticExp(key)) {
          if (isKeyboardEvent(key.content.toLowerCase())) {
            keyModifiers.push(modifier);
          } else {
            nonKeyModifiers.push(modifier);
          }
        } else {
          keyModifiers.push(modifier);
          nonKeyModifiers.push(modifier);
        }
      } else {
        if (isNonKeyModifier(modifier)) {
          nonKeyModifiers.push(modifier);
        } else {
          keyModifiers.push(modifier);
        }
      }
    }
  }
  return {
    keyModifiers,
    nonKeyModifiers,
    eventOptionModifiers
  };
};
const transformClick = (key, event) => {
  const isStaticClick = compilerCore.isStaticExp(key) && key.content.toLowerCase() === "onclick";
  return isStaticClick ? compilerCore.createSimpleExpression(event, true) : key.type !== 4 ? compilerCore.createCompoundExpression([
    `(`,
    key,
    `) === "onClick" ? "${event}" : (`,
    key,
    `)`
  ]) : key;
};
const transformOn = (dir, node, context) => {
  return compilerCore.transformOn(dir, node, context, (baseResult) => {
    const { modifiers } = dir;
    if (!modifiers.length) return baseResult;
    let { key, value: handlerExp } = baseResult.props[0];
    const { keyModifiers, nonKeyModifiers, eventOptionModifiers } = resolveModifiers(key, modifiers, context, dir.loc);
    if (nonKeyModifiers.includes("right")) {
      key = transformClick(key, `onContextmenu`);
    }
    if (nonKeyModifiers.includes("middle")) {
      key = transformClick(key, `onMouseup`);
    }
    if (nonKeyModifiers.length) {
      handlerExp = compilerCore.createCallExpression(context.helper(V_ON_WITH_MODIFIERS), [
        handlerExp,
        JSON.stringify(nonKeyModifiers)
      ]);
    }
    if (keyModifiers.length && // if event name is dynamic, always wrap with keys guard
    (!compilerCore.isStaticExp(key) || isKeyboardEvent(key.content.toLowerCase()))) {
      handlerExp = compilerCore.createCallExpression(context.helper(V_ON_WITH_KEYS), [
        handlerExp,
        JSON.stringify(keyModifiers)
      ]);
    }
    if (eventOptionModifiers.length) {
      const modifierPostfix = eventOptionModifiers.map(shared.capitalize).join("");
      key = compilerCore.isStaticExp(key) ? compilerCore.createSimpleExpression(`${key.content}${modifierPostfix}`, true) : compilerCore.createCompoundExpression([`(`, key, `) + "${modifierPostfix}"`]);
    }
    return {
      props: [compilerCore.createObjectProperty(key, handlerExp)]
    };
  });
};

const transformShow = (dir, node, context) => {
  const { exp, loc } = dir;
  if (!exp) {
    context.onError(
      createDOMCompilerError(62, loc)
    );
  }
  return {
    props: [],
    needRuntime: context.helper(V_SHOW)
  };
};

const transformTransition = (node, context) => {
  if (node.type === 1 && node.tagType === 1) {
    const component = context.isBuiltInComponent(node.tag);
    if (component === TRANSITION) {
      return () => {
        if (!node.children.length) {
          return;
        }
        if (hasMultipleChildren(node)) {
          context.onError(
            createDOMCompilerError(
              63,
              {
                start: node.children[0].loc.start,
                end: node.children[node.children.length - 1].loc.end,
                source: ""
              }
            )
          );
        }
        const child = node.children[0];
        if (child.type === 1) {
          for (const p of child.props) {
            if (p.type === 7 && p.name === "show") {
              node.props.push({
                type: 6,
                name: "persisted",
                nameLoc: node.loc,
                value: void 0,
                loc: node.loc
              });
            }
          }
        }
      };
    }
  }
};
function hasMultipleChildren(node) {
  const children = node.children = node.children.filter(
    (c) => !compilerCore.isCommentOrWhitespace(c)
  );
  const child = children[0];
  return children.length !== 1 || child.type === 11 || child.type === 9 && child.branches.some(hasMultipleChildren);
}

const expReplaceRE = /__VUE_EXP_START__(.*?)__VUE_EXP_END__/g;
const stringifyStatic = (children, context, parent) => {
  if (context.scopes.vSlot > 0) {
    return;
  }
  const isParentCached = parent.type === 1 && parent.codegenNode && parent.codegenNode.type === 13 && parent.codegenNode.children && !shared.isArray(parent.codegenNode.children) && parent.codegenNode.children.type === 20;
  let nc = 0;
  let ec = 0;
  const currentChunk = [];
  const stringifyCurrentChunk = (currentIndex) => {
    if (nc >= 20 || ec >= 5) {
      const staticCall = compilerCore.createCallExpression(context.helper(compilerCore.CREATE_STATIC), [
        JSON.stringify(
          currentChunk.map((node) => stringifyNode(node, context)).join("")
        ).replace(expReplaceRE, `" + $1 + "`),
        // the 2nd argument indicates the number of DOM nodes this static vnode
        // will insert / hydrate
        String(currentChunk.length)
      ]);
      const deleteCount = currentChunk.length - 1;
      if (isParentCached) {
        children.splice(
          currentIndex - currentChunk.length,
          currentChunk.length,
          // @ts-expect-error
          staticCall
        );
      } else {
        currentChunk[0].codegenNode.value = staticCall;
        if (currentChunk.length > 1) {
          children.splice(currentIndex - currentChunk.length + 1, deleteCount);
          const cacheIndex = context.cached.indexOf(
            currentChunk[currentChunk.length - 1].codegenNode
          );
          if (cacheIndex > -1) {
            for (let i2 = cacheIndex; i2 < context.cached.length; i2++) {
              const c = context.cached[i2];
              if (c) c.index -= deleteCount;
            }
            context.cached.splice(cacheIndex - deleteCount + 1, deleteCount);
          }
        }
      }
      return deleteCount;
    }
    return 0;
  };
  let i = 0;
  for (; i < children.length; i++) {
    const child = children[i];
    const isCached = isParentCached || getCachedNode(child);
    if (isCached) {
      const result = analyzeNode(child);
      if (result) {
        nc += result[0];
        ec += result[1];
        currentChunk.push(child);
        continue;
      }
    }
    i -= stringifyCurrentChunk(i);
    nc = 0;
    ec = 0;
    currentChunk.length = 0;
  }
  stringifyCurrentChunk(i);
};
const getCachedNode = (node) => {
  if ((node.type === 1 && node.tagType === 0 || node.type === 12) && node.codegenNode && node.codegenNode.type === 20) {
    return node.codegenNode;
  }
};
const dataAriaRE = /^(?:data|aria)-/;
const isStringifiableAttr = (name, ns) => {
  return (ns === 0 ? shared.isKnownHtmlAttr(name) : ns === 1 ? shared.isKnownSvgAttr(name) : ns === 2 ? shared.isKnownMathMLAttr(name) : false) || dataAriaRE.test(name);
};
const isNonStringifiable = /* @__PURE__ */ shared.makeMap(
  `caption,thead,tr,th,tbody,td,tfoot,colgroup,col`
);
function analyzeNode(node) {
  if (node.type === 1 && isNonStringifiable(node.tag)) {
    return false;
  }
  if (node.type === 1 && compilerCore.findDir(node, "once", true)) {
    return false;
  }
  if (node.type === 12) {
    return [1, 0];
  }
  let nc = 1;
  let ec = node.props.length > 0 ? 1 : 0;
  let bailed = false;
  const bail = () => {
    bailed = true;
    return false;
  };
  function walk(node2) {
    const isOptionTag = node2.tag === "option" && node2.ns === 0;
    for (let i = 0; i < node2.props.length; i++) {
      const p = node2.props[i];
      if (p.type === 6 && !isStringifiableAttr(p.name, node2.ns)) {
        return bail();
      }
      if (p.type === 7 && p.name === "bind") {
        if (p.arg && (p.arg.type === 8 || p.arg.isStatic && !isStringifiableAttr(p.arg.content, node2.ns))) {
          return bail();
        }
        if (p.exp && (p.exp.type === 8 || p.exp.constType < 3)) {
          return bail();
        }
        if (isOptionTag && compilerCore.isStaticArgOf(p.arg, "value") && p.exp && !p.exp.isStatic) {
          return bail();
        }
      }
    }
    for (let i = 0; i < node2.children.length; i++) {
      nc++;
      const child = node2.children[i];
      if (child.type === 1) {
        if (child.props.length > 0) {
          ec++;
        }
        walk(child);
        if (bailed) {
          return false;
        }
      }
    }
    return true;
  }
  return walk(node) ? [nc, ec] : false;
}
function stringifyNode(node, context) {
  if (shared.isString(node)) {
    return node;
  }
  if (shared.isSymbol(node)) {
    return ``;
  }
  switch (node.type) {
    case 1:
      return stringifyElement(node, context);
    case 2:
      return shared.escapeHtml(node.content);
    case 3:
      return `<!--${shared.escapeHtml(node.content)}-->`;
    case 5:
      return shared.escapeHtml(shared.toDisplayString(evaluateConstant(node.content)));
    case 8:
      return shared.escapeHtml(evaluateConstant(node));
    case 12:
      return stringifyNode(node.content, context);
    default:
      return "";
  }
}
function stringifyElement(node, context) {
  let res = `<${node.tag}`;
  let innerHTML = "";
  for (let i = 0; i < node.props.length; i++) {
    const p = node.props[i];
    if (p.type === 6) {
      res += ` ${p.name}`;
      if (p.value) {
        res += `="${shared.escapeHtml(p.value.content)}"`;
      }
    } else if (p.type === 7) {
      if (p.name === "bind") {
        const exp = p.exp;
        if (exp.content[0] === "_") {
          res += ` ${p.arg.content}="__VUE_EXP_START__${exp.content}__VUE_EXP_END__"`;
          continue;
        }
        if (shared.isBooleanAttr(p.arg.content) && exp.content === "false") {
          continue;
        }
        let evaluated = evaluateConstant(exp);
        if (evaluated != null) {
          const arg = p.arg && p.arg.content;
          if (arg === "class") {
            evaluated = shared.normalizeClass(evaluated);
          } else if (arg === "style") {
            evaluated = shared.stringifyStyle(shared.normalizeStyle(evaluated));
          }
          res += ` ${p.arg.content}="${shared.escapeHtml(
            evaluated
          )}"`;
        }
      } else if (p.name === "html") {
        innerHTML = evaluateConstant(p.exp);
      } else if (p.name === "text") {
        innerHTML = shared.escapeHtml(
          shared.toDisplayString(evaluateConstant(p.exp))
        );
      }
    }
  }
  if (context.scopeId) {
    res += ` ${context.scopeId}`;
  }
  res += `>`;
  if (innerHTML) {
    res += innerHTML;
  } else {
    for (let i = 0; i < node.children.length; i++) {
      res += stringifyNode(node.children[i], context);
    }
  }
  if (!shared.isVoidTag(node.tag)) {
    res += `</${node.tag}>`;
  }
  return res;
}
function evaluateConstant(exp) {
  if (exp.type === 4) {
    return new Function(`return (${exp.content})`)();
  } else {
    let res = ``;
    exp.children.forEach((c) => {
      if (shared.isString(c) || shared.isSymbol(c)) {
        return;
      }
      if (c.type === 2) {
        res += c.content;
      } else if (c.type === 5) {
        res += shared.toDisplayString(evaluateConstant(c.content));
      } else {
        res += evaluateConstant(c);
      }
    });
    return res;
  }
}

const ignoreSideEffectTags = (node, context) => {
  if (node.type === 1 && node.tagType === 0 && (node.tag === "script" || node.tag === "style")) {
    context.onError(
      createDOMCompilerError(
        64,
        node.loc
      )
    );
    context.removeNode();
  }
};

function isValidHTMLNesting(parent, child) {
  if (parent === "template") {
    return true;
  }
  if (parent in onlyValidChildren) {
    return onlyValidChildren[parent].has(child);
  }
  if (child in onlyValidParents) {
    return onlyValidParents[child].has(parent);
  }
  if (parent in knownInvalidChildren) {
    if (knownInvalidChildren[parent].has(child)) return false;
  }
  if (child in knownInvalidParents) {
    if (knownInvalidParents[child].has(parent)) return false;
  }
  return true;
}
const headings = /* @__PURE__ */ new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const emptySet = /* @__PURE__ */ new Set([]);
const onlyValidChildren = {
  head: /* @__PURE__ */ new Set([
    "base",
    "basefront",
    "bgsound",
    "link",
    "meta",
    "title",
    "noscript",
    "noframes",
    "style",
    "script",
    "template"
  ]),
  optgroup: /* @__PURE__ */ new Set(["option"]),
  select: /* @__PURE__ */ new Set(["optgroup", "option", "hr"]),
  // table
  table: /* @__PURE__ */ new Set(["caption", "colgroup", "tbody", "tfoot", "thead"]),
  tr: /* @__PURE__ */ new Set(["td", "th"]),
  colgroup: /* @__PURE__ */ new Set(["col"]),
  tbody: /* @__PURE__ */ new Set(["tr"]),
  thead: /* @__PURE__ */ new Set(["tr"]),
  tfoot: /* @__PURE__ */ new Set(["tr"]),
  // these elements can not have any children elements
  script: emptySet,
  iframe: emptySet,
  option: emptySet,
  textarea: emptySet,
  style: emptySet,
  title: emptySet
};
const onlyValidParents = {
  // sections
  html: emptySet,
  body: /* @__PURE__ */ new Set(["html"]),
  head: /* @__PURE__ */ new Set(["html"]),
  // table
  td: /* @__PURE__ */ new Set(["tr"]),
  colgroup: /* @__PURE__ */ new Set(["table"]),
  caption: /* @__PURE__ */ new Set(["table"]),
  tbody: /* @__PURE__ */ new Set(["table"]),
  tfoot: /* @__PURE__ */ new Set(["table"]),
  col: /* @__PURE__ */ new Set(["colgroup"]),
  th: /* @__PURE__ */ new Set(["tr"]),
  thead: /* @__PURE__ */ new Set(["table"]),
  tr: /* @__PURE__ */ new Set(["tbody", "thead", "tfoot"]),
  // data list
  dd: /* @__PURE__ */ new Set(["dl", "div"]),
  dt: /* @__PURE__ */ new Set(["dl", "div"]),
  // other
  figcaption: /* @__PURE__ */ new Set(["figure"]),
  // li: new Set(["ul", "ol"]),
  summary: /* @__PURE__ */ new Set(["details"]),
  area: /* @__PURE__ */ new Set(["map"])
};
const knownInvalidChildren = {
  p: /* @__PURE__ */ new Set([
    "address",
    "article",
    "aside",
    "blockquote",
    "center",
    "details",
    "dialog",
    "dir",
    "div",
    "dl",
    "fieldset",
    "figure",
    "footer",
    "form",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hgroup",
    "hr",
    "li",
    "main",
    "nav",
    "menu",
    "ol",
    "p",
    "pre",
    "section",
    "table",
    "ul"
  ]),
  svg: /* @__PURE__ */ new Set([
    "b",
    "blockquote",
    "br",
    "code",
    "dd",
    "div",
    "dl",
    "dt",
    "em",
    "embed",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "menu",
    "meta",
    "ol",
    "p",
    "pre",
    "ruby",
    "s",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "u",
    "ul",
    "var"
  ])
};
const knownInvalidParents = {
  a: /* @__PURE__ */ new Set(["a"]),
  button: /* @__PURE__ */ new Set(["button"]),
  dd: /* @__PURE__ */ new Set(["dd", "dt"]),
  dt: /* @__PURE__ */ new Set(["dd", "dt"]),
  form: /* @__PURE__ */ new Set(["form"]),
  li: /* @__PURE__ */ new Set(["li"]),
  h1: headings,
  h2: headings,
  h3: headings,
  h4: headings,
  h5: headings,
  h6: headings
};

const validateHtmlNesting = (node, context) => {
  if (node.type === 1 && node.tagType === 0 && context.parent && context.parent.type === 1 && context.parent.tagType === 0 && !isValidHTMLNesting(context.parent.tag, node.tag)) {
    const error = new SyntaxError(
      `<${node.tag}> cannot be child of <${context.parent.tag}>, according to HTML specifications. This can cause hydration errors or potentially disrupt future functionality.`
    );
    error.loc = node.loc;
    context.onWarn(error);
  }
};

const DOMNodeTransforms = [
  transformStyle,
  ...[transformTransition, validateHtmlNesting] 
];
const DOMDirectiveTransforms = {
  cloak: compilerCore.noopDirectiveTransform,
  html: transformVHtml,
  text: transformVText,
  model: transformModel,
  // override compiler-core
  on: transformOn,
  // override compiler-core
  show: transformShow
};
function compile(src, options = {}) {
  return compilerCore.baseCompile(
    src,
    shared.extend({}, parserOptions, options, {
      nodeTransforms: [
        // ignore <script> and <tag>
        // this is not put inside DOMNodeTransforms because that list is used
        // by compiler-ssr to generate vnode fallback branches
        ignoreSideEffectTags,
        ...DOMNodeTransforms,
        ...options.nodeTransforms || []
      ],
      directiveTransforms: shared.extend(
        {},
        DOMDirectiveTransforms,
        options.directiveTransforms || {}
      ),
      transformHoist: stringifyStatic
    })
  );
}
function parse(template, options = {}) {
  return compilerCore.baseParse(template, shared.extend({}, parserOptions, options));
}

exports.DOMDirectiveTransforms = DOMDirectiveTransforms;
exports.DOMErrorCodes = DOMErrorCodes;
exports.DOMErrorMessages = DOMErrorMessages;
exports.DOMNodeTransforms = DOMNodeTransforms;
exports.TRANSITION = TRANSITION;
exports.TRANSITION_GROUP = TRANSITION_GROUP;
exports.V_MODEL_CHECKBOX = V_MODEL_CHECKBOX;
exports.V_MODEL_DYNAMIC = V_MODEL_DYNAMIC;
exports.V_MODEL_RADIO = V_MODEL_RADIO;
exports.V_MODEL_SELECT = V_MODEL_SELECT;
exports.V_MODEL_TEXT = V_MODEL_TEXT;
exports.V_ON_WITH_KEYS = V_ON_WITH_KEYS;
exports.V_ON_WITH_MODIFIERS = V_ON_WITH_MODIFIERS;
exports.V_SHOW = V_SHOW;
exports.compile = compile;
exports.createDOMCompilerError = createDOMCompilerError;
exports.parse = parse;
exports.parserOptions = parserOptions;
exports.transformStyle = transformStyle;
Object.keys(compilerCore).forEach(function (k) {
  if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = compilerCore[k];
});
