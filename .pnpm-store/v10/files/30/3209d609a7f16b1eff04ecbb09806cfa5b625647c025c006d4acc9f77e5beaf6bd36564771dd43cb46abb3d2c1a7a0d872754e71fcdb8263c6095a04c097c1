import CJS_COMPAT_NODE_URL_pap6jbg8dm8 from 'node:url';
import CJS_COMPAT_NODE_PATH_pap6jbg8dm8 from 'node:path';
import CJS_COMPAT_NODE_MODULE_pap6jbg8dm8 from "node:module";

var __filename = CJS_COMPAT_NODE_URL_pap6jbg8dm8.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_pap6jbg8dm8.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_pap6jbg8dm8.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
  mod
));

// ../../node_modules/ts-dedent/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/ts-dedent/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.dedent = void 0;
    function dedent2(templ) {
      for (var values = [], _i = 1; _i < arguments.length; _i++)
        values[_i - 1] = arguments[_i];
      var strings = Array.from(typeof templ == "string" ? [templ] : templ);
      strings[strings.length - 1] = strings[strings.length - 1].replace(/\r?\n([\t ]*)$/, "");
      var indentLengths = strings.reduce(function(arr, str) {
        var matches = str.match(/\n([\t ]+|(?!\s).)/g);
        return matches ? arr.concat(matches.map(function(match) {
          var _a, _b;
          return (_b = (_a = match.match(/[\t ]/g)) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
        })) : arr;
      }, []);
      if (indentLengths.length) {
        var pattern_1 = new RegExp(`
[	 ]{` + Math.min.apply(Math, indentLengths) + "}", "g");
        strings = strings.map(function(str) {
          return str.replace(pattern_1, `
`);
        });
      }
      strings[0] = strings[0].replace(/^\r?\n/, "");
      var string = strings[0];
      return values.forEach(function(value, i) {
        var endentations = string.match(/(?:^|\n)( *)$/), endentation = endentations ? endentations[1] : "", indentedValue = value;
        typeof value == "string" && value.includes(`
`) && (indentedValue = String(value).split(`
`).map(function(str, i2) {
          return i2 === 0 ? str : "" + endentation + str;
        }).join(`
`)), string += indentedValue + strings[i + 1];
      }), string;
    }
    exports.dedent = dedent2;
    exports.default = dedent2;
  }
});

// src/configs/addon-interactions.ts
var addon_interactions_default = {
  plugins: ["storybook"],
  overrides: [
    {
      files: ["**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)", "**/*.story.@(ts|tsx|js|jsx|mjs|cjs)"],
      rules: {
        "react-hooks/rules-of-hooks": "off",
        "import/no-anonymous-default-export": "off",
        "storybook/await-interactions": "error",
        "storybook/context-in-play-function": "error",
        "storybook/use-storybook-expect": "error",
        "storybook/use-storybook-testing-library": "error"
      }
    },
    {
      files: [".storybook/main.@(js|cjs|mjs|ts)"],
      rules: {
        "storybook/no-uninstalled-addons": "error"
      }
    }
  ]
};

// src/configs/csf.ts
var csf_default = {
  plugins: ["storybook"],
  overrides: [
    {
      files: ["**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)", "**/*.story.@(ts|tsx|js|jsx|mjs|cjs)"],
      rules: {
        "react-hooks/rules-of-hooks": "off",
        "import/no-anonymous-default-export": "off",
        "storybook/csf-component": "warn",
        "storybook/default-exports": "error",
        "storybook/hierarchy-separator": "warn",
        "storybook/no-redundant-story-name": "warn",
        "storybook/story-exports": "error"
      }
    },
    {
      files: [".storybook/main.@(js|cjs|mjs|ts)"],
      rules: {
        "storybook/no-uninstalled-addons": "error"
      }
    }
  ]
};

// src/configs/csf-strict.ts
var csf_strict_default = {
  // This file is bundled in an index.js file at the root
  // so the reference is relative to the src directory
  extends: "./configs/csf",
  overrides: [
    {
      files: ["**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)", "**/*.story.@(ts|tsx|js|jsx|mjs|cjs)"],
      rules: {
        "react-hooks/rules-of-hooks": "off",
        "import/no-anonymous-default-export": "off",
        "storybook/no-stories-of": "error",
        "storybook/no-title-property-in-meta": "error"
      }
    }
  ]
};

// src/configs/flat/addon-interactions.ts
var addon_interactions_default2 = [
  {
    name: "storybook:addon-interactions:setup",
    plugins: {
      get storybook() {
        return index_default;
      }
    }
  },
  {
    name: "storybook:addon-interactions:stories-rules",
    files: ["**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)", "**/*.story.@(ts|tsx|js|jsx|mjs|cjs)"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "import/no-anonymous-default-export": "off",
      "storybook/await-interactions": "error",
      "storybook/context-in-play-function": "error",
      "storybook/use-storybook-expect": "error",
      "storybook/use-storybook-testing-library": "error"
    }
  },
  {
    name: "storybook:addon-interactions:main-rules",
    files: [".storybook/main.@(js|cjs|mjs|ts)"],
    rules: {
      "storybook/no-uninstalled-addons": "error"
    }
  }
];

// src/configs/flat/csf.ts
var csf_default2 = [
  {
    name: "storybook:csf:setup",
    plugins: {
      get storybook() {
        return index_default;
      }
    }
  },
  {
    name: "storybook:csf:stories-rules",
    files: ["**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)", "**/*.story.@(ts|tsx|js|jsx|mjs|cjs)"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "import/no-anonymous-default-export": "off",
      "storybook/csf-component": "warn",
      "storybook/default-exports": "error",
      "storybook/hierarchy-separator": "warn",
      "storybook/no-redundant-story-name": "warn",
      "storybook/story-exports": "error"
    }
  },
  {
    name: "storybook:csf:main-rules",
    files: [".storybook/main.@(js|cjs|mjs|ts)"],
    rules: {
      "storybook/no-uninstalled-addons": "error"
    }
  }
];

// src/configs/flat/csf-strict.ts
var csf_strict_default2 = [
  ...csf_default2,
  {
    name: "storybook:csf-strict:rules",
    files: ["**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)", "**/*.story.@(ts|tsx|js|jsx|mjs|cjs)"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "import/no-anonymous-default-export": "off",
      "storybook/no-stories-of": "error",
      "storybook/no-title-property-in-meta": "error"
    }
  }
];

// src/configs/flat/recommended.ts
var recommended_default = [
  {
    name: "storybook:recommended:setup",
    plugins: {
      get storybook() {
        return index_default;
      }
    }
  },
  {
    name: "storybook:recommended:stories-rules",
    files: ["**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)", "**/*.story.@(ts|tsx|js|jsx|mjs|cjs)"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "import/no-anonymous-default-export": "off",
      "storybook/await-interactions": "error",
      "storybook/context-in-play-function": "error",
      "storybook/default-exports": "error",
      "storybook/hierarchy-separator": "warn",
      "storybook/no-redundant-story-name": "warn",
      "storybook/no-renderer-packages": "error",
      "storybook/prefer-pascal-case": "warn",
      "storybook/story-exports": "error",
      "storybook/use-storybook-expect": "error",
      "storybook/use-storybook-testing-library": "error"
    }
  },
  {
    name: "storybook:recommended:main-rules",
    files: [".storybook/main.@(js|cjs|mjs|ts)"],
    rules: {
      "storybook/no-uninstalled-addons": "error"
    }
  }
];

// src/configs/recommended.ts
var recommended_default2 = {
  plugins: ["storybook"],
  overrides: [
    {
      files: ["**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)", "**/*.story.@(ts|tsx|js|jsx|mjs|cjs)"],
      rules: {
        "react-hooks/rules-of-hooks": "off",
        "import/no-anonymous-default-export": "off",
        "storybook/await-interactions": "error",
        "storybook/context-in-play-function": "error",
        "storybook/default-exports": "error",
        "storybook/hierarchy-separator": "warn",
        "storybook/no-redundant-story-name": "warn",
        "storybook/no-renderer-packages": "error",
        "storybook/prefer-pascal-case": "warn",
        "storybook/story-exports": "error",
        "storybook/use-storybook-expect": "error",
        "storybook/use-storybook-testing-library": "error"
      }
    },
    {
      files: [".storybook/main.@(js|cjs|mjs|ts)"],
      rules: {
        "storybook/no-uninstalled-addons": "error"
      }
    }
  ]
};

// src/utils/ast.ts
import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import { ASTUtils } from "@typescript-eslint/utils";
var isNodeOfType = (nodeType) => (node) => node?.type === nodeType, isAwaitExpression = isNodeOfType(AST_NODE_TYPES.AwaitExpression), isIdentifier = isNodeOfType(AST_NODE_TYPES.Identifier), isVariableDeclarator = isNodeOfType(AST_NODE_TYPES.VariableDeclarator), isArrayExpression = isNodeOfType(AST_NODE_TYPES.ArrayExpression), isArrowFunctionExpression = isNodeOfType(AST_NODE_TYPES.ArrowFunctionExpression), isBlockStatement = isNodeOfType(AST_NODE_TYPES.BlockStatement), isCallExpression = isNodeOfType(AST_NODE_TYPES.CallExpression), isExpressionStatement = isNodeOfType(AST_NODE_TYPES.ExpressionStatement), isVariableDeclaration = isNodeOfType(AST_NODE_TYPES.VariableDeclaration), isAssignmentExpression = isNodeOfType(AST_NODE_TYPES.AssignmentExpression), isSequenceExpression = isNodeOfType(AST_NODE_TYPES.SequenceExpression), isImportDeclaration = isNodeOfType(AST_NODE_TYPES.ImportDeclaration), isImportDefaultSpecifier = isNodeOfType(AST_NODE_TYPES.ImportDefaultSpecifier), isImportNamespaceSpecifier = isNodeOfType(AST_NODE_TYPES.ImportNamespaceSpecifier), isImportSpecifier = isNodeOfType(AST_NODE_TYPES.ImportSpecifier), isJSXAttribute = isNodeOfType(AST_NODE_TYPES.JSXAttribute), isLiteral = isNodeOfType(AST_NODE_TYPES.Literal), isMemberExpression = isNodeOfType(AST_NODE_TYPES.MemberExpression), isNewExpression = isNodeOfType(AST_NODE_TYPES.NewExpression), isObjectExpression = isNodeOfType(AST_NODE_TYPES.ObjectExpression), isObjectPattern = isNodeOfType(AST_NODE_TYPES.ObjectPattern), isProperty = isNodeOfType(AST_NODE_TYPES.Property), isSpreadElement = isNodeOfType(AST_NODE_TYPES.SpreadElement), isRestElement = isNodeOfType(AST_NODE_TYPES.RestElement), isReturnStatement = isNodeOfType(AST_NODE_TYPES.ReturnStatement), isFunctionDeclaration = isNodeOfType(AST_NODE_TYPES.FunctionDeclaration), isFunctionExpression = isNodeOfType(AST_NODE_TYPES.FunctionExpression), isProgram = isNodeOfType(AST_NODE_TYPES.Program), isTSTypeAliasDeclaration = isNodeOfType(AST_NODE_TYPES.TSTypeAliasDeclaration), isTSInterfaceDeclaration = isNodeOfType(AST_NODE_TYPES.TSInterfaceDeclaration), isTSAsExpression = isNodeOfType(AST_NODE_TYPES.TSAsExpression), isTSSatisfiesExpression = isNodeOfType(AST_NODE_TYPES.TSSatisfiesExpression), isTSNonNullExpression = isNodeOfType(AST_NODE_TYPES.TSNonNullExpression), isMetaProperty = isNodeOfType(AST_NODE_TYPES.MetaProperty);

// src/utils/create-storybook-rule.ts
import { ESLintUtils } from "@typescript-eslint/utils";

// src/utils/index.ts
import { isExportStory } from "storybook/internal/csf";
import { ASTUtils as ASTUtils2 } from "@typescript-eslint/utils";
var docsUrl = (ruleName) => `https://github.com/storybookjs/storybook/blob/next/code/lib/eslint-plugin/docs/rules/${ruleName}.md`, getMetaObjectExpression = (node, context) => {
  let meta = node.declaration, { sourceCode } = context;
  if (isIdentifier(meta)) {
    let scope = sourceCode.getScope ? sourceCode.getScope(node) : context.getScope(), variable = ASTUtils2.findVariable(scope, meta.name), decl = variable && variable.defs.find((def) => isVariableDeclarator(def.node));
    decl && isVariableDeclarator(decl.node) && (meta = decl.node.init);
  }
  return (isTSAsExpression(meta) || isTSSatisfiesExpression(meta)) && (meta = meta.expression), isObjectExpression(meta) ? meta : null;
}, getDescriptor = (metaDeclaration, propertyName) => {
  let property = metaDeclaration && metaDeclaration.properties.find(
    (p) => "key" in p && "name" in p.key && p.key.name === propertyName
  );
  if (!property || isSpreadElement(property))
    return;
  let { type } = property.value;
  switch (type) {
    case "ArrayExpression":
      return property.value.elements.map((t) => {
        if (t === null)
          throw new Error("Unexpected descriptor element: null");
        if (!["StringLiteral", "Literal"].includes(t.type))
          throw new Error(`Unexpected descriptor element: ${t.type}`);
        return t.value;
      });
    case "Literal":
    // @ts-expect-error TODO: Investigation needed. Type systems says, that "RegExpLiteral" does not exist
    case "RegExpLiteral":
      return property.value.value;
    default:
      throw new Error(`Unexpected descriptor: ${type}`);
  }
}, isValidStoryExport = (node, nonStoryExportsConfig) => isExportStory(node.name, nonStoryExportsConfig) && node.name !== "__namedExportsOrder", getAllNamedExports = (node) => {
  if (!node.declaration && node.specifiers)
    return node.specifiers.reduce((acc, specifier) => (isIdentifier(specifier.exported) && acc.push(specifier.exported), acc), []);
  let decl = node.declaration;
  if (isVariableDeclaration(decl)) {
    let declaration = decl.declarations[0];
    if (declaration) {
      let { id } = declaration;
      if (isIdentifier(id))
        return [id];
    }
  }
  return isFunctionDeclaration(decl) && isIdentifier(decl.id) ? [decl.id] : [];
};

// src/utils/create-storybook-rule.ts
function createStorybookRule({
  create,
  meta,
  ...remainingConfig
}) {
  return ESLintUtils.RuleCreator(docsUrl)({
    ...remainingConfig,
    create,
    meta: {
      ...meta,
      docs: {
        ...meta.docs
      },
      defaultOptions: remainingConfig.defaultOptions
    }
  });
}

// src/rules/await-interactions.ts
var await_interactions_default = createStorybookRule({
  name: "await-interactions",
  defaultOptions: [],
  meta: {
    severity: "error",
    docs: {
      description: "Interactions should be awaited",
      categories: ["addon-interactions" /* ADDON_INTERACTIONS */, "recommended" /* RECOMMENDED */]
    },
    messages: {
      interactionShouldBeAwaited: "Interaction should be awaited: {{method}}",
      fixSuggestion: "Add `await` to method"
    },
    type: "problem",
    fixable: "code",
    hasSuggestions: !0,
    schema: []
  },
  create(context) {
    let FUNCTIONS_TO_BE_AWAITED = [
      "waitFor",
      "waitForElementToBeRemoved",
      "wait",
      "waitForElement",
      "waitForDomChange",
      "userEvent",
      "play"
    ], getMethodThatShouldBeAwaited = (expr) => {
      let shouldAwait = (name) => FUNCTIONS_TO_BE_AWAITED.includes(name) || name.startsWith("findBy");
      return isArrowFunctionExpression(expr.parent) || isReturnStatement(expr.parent) ? null : isMemberExpression(expr.callee) && isIdentifier(expr.callee.object) && shouldAwait(expr.callee.object.name) ? expr.callee.object : isTSNonNullExpression(expr.callee) && isMemberExpression(expr.callee.expression) && isIdentifier(expr.callee.expression.property) && shouldAwait(expr.callee.expression.property.name) ? expr.callee.expression.property : isMemberExpression(expr.callee) && isIdentifier(expr.callee.property) && shouldAwait(expr.callee.property.name) || isMemberExpression(expr.callee) && isCallExpression(expr.callee.object) && isIdentifier(expr.callee.object.callee) && isIdentifier(expr.callee.property) && expr.callee.object.callee.name === "expect" ? expr.callee.property : isIdentifier(expr.callee) && shouldAwait(expr.callee.name) ? expr.callee : null;
    }, getClosestFunctionAncestor = (node) => {
      let parent = node.parent;
      if (!(!parent || isProgram(parent)))
        return isArrowFunctionExpression(parent) || isFunctionExpression(parent) || isFunctionDeclaration(parent) ? node.parent : getClosestFunctionAncestor(parent);
    }, isUserEventFromStorybookImported = (node) => (node.source.value === "@storybook/testing-library" || node.source.value === "@storybook/test") && node.specifiers.find(
      (spec) => isImportSpecifier(spec) && "name" in spec.imported && spec.imported.name === "userEvent" && spec.local.name === "userEvent"
    ) !== void 0, isExpectFromStorybookImported = (node) => (node.source.value === "@storybook/jest" || node.source.value === "@storybook/test") && node.specifiers.find(
      (spec) => isImportSpecifier(spec) && "name" in spec.imported && spec.imported.name === "expect"
    ) !== void 0, isImportedFromStorybook = !0, invocationsThatShouldBeAwaited = [];
    return {
      ImportDeclaration(node) {
        isImportedFromStorybook = isUserEventFromStorybookImported(node) || isExpectFromStorybookImported(node);
      },
      VariableDeclarator(node) {
        isImportedFromStorybook = isImportedFromStorybook && isIdentifier(node.id) && node.id.name !== "userEvent";
      },
      CallExpression(node) {
        let method = getMethodThatShouldBeAwaited(node);
        method && !isAwaitExpression(node.parent) && !isAwaitExpression(node.parent?.parent) && invocationsThatShouldBeAwaited.push({ node, method });
      },
      "Program:exit": function() {
        isImportedFromStorybook && invocationsThatShouldBeAwaited.length && invocationsThatShouldBeAwaited.forEach(({ node, method }) => {
          let parentFnNode = getClosestFunctionAncestor(node), parentFnNeedsAsync = parentFnNode && !("async" in parentFnNode && parentFnNode.async), fixFn = (fixer) => {
            let fixerResult = [fixer.insertTextBefore(node, "await ")];
            return parentFnNeedsAsync && fixerResult.push(fixer.insertTextBefore(parentFnNode, "async ")), fixerResult;
          };
          context.report({
            node,
            messageId: "interactionShouldBeAwaited",
            data: {
              method: method.name
            },
            fix: fixFn,
            suggest: [
              {
                messageId: "fixSuggestion",
                fix: fixFn
              }
            ]
          });
        });
      }
    };
  }
});

// src/rules/context-in-play-function.ts
var context_in_play_function_default = createStorybookRule({
  name: "context-in-play-function",
  defaultOptions: [],
  meta: {
    type: "problem",
    severity: "error",
    docs: {
      description: "Pass a context when invoking play function of another story",
      categories: ["recommended" /* RECOMMENDED */, "addon-interactions" /* ADDON_INTERACTIONS */]
    },
    messages: {
      passContextToPlayFunction: "Pass a context when invoking play function of another story"
    },
    fixable: void 0,
    schema: []
  },
  create(context) {
    let isPlayFunctionFromAnotherStory = (expr) => !!(isTSNonNullExpression(expr.callee) && isMemberExpression(expr.callee.expression) && isIdentifier(expr.callee.expression.property) && expr.callee.expression.property.name === "play" || isMemberExpression(expr.callee) && isIdentifier(expr.callee.property) && expr.callee.property.name === "play"), getParentParameterName = (node) => {
      if (!isArrowFunctionExpression(node))
        return node.parent ? getParentParameterName(node.parent) : void 0;
      if (node.params.length !== 0 && node.params.length >= 1) {
        let param = node.params[0];
        if (isIdentifier(param))
          return param.name;
        if (isObjectPattern(param)) {
          if (param.properties.find((prop) => prop.type === "Property" && prop.key.type === "Identifier" && prop.key.name === "context"))
            return "context";
          let restElement = param.properties.find(isRestElement);
          return !restElement || !isIdentifier(restElement.argument) ? void 0 : restElement.argument.name;
        }
      }
    }, isNotPassingContextCorrectly = (expr) => {
      let firstExpressionArgument = expr.arguments[0];
      if (!firstExpressionArgument)
        return !0;
      let contextVariableName = getParentParameterName(expr);
      return contextVariableName ? !(expr.arguments.length === 1 && isIdentifier(firstExpressionArgument) && firstExpressionArgument.name === contextVariableName || isObjectExpression(firstExpressionArgument) && firstExpressionArgument.properties.some((prop) => isSpreadElement(prop) && isIdentifier(prop.argument) && prop.argument.name === contextVariableName)) : !0;
    }, invocationsWithoutProperContext = [];
    return {
      CallExpression(node) {
        isPlayFunctionFromAnotherStory(node) && isNotPassingContextCorrectly(node) && invocationsWithoutProperContext.push(node);
      },
      "Program:exit": function() {
        invocationsWithoutProperContext.forEach((node) => {
          context.report({
            node,
            messageId: "passContextToPlayFunction"
          });
        });
      }
    };
  }
});

// src/rules/csf-component.ts
var csf_component_default = createStorybookRule({
  name: "csf-component",
  defaultOptions: [],
  meta: {
    type: "suggestion",
    severity: "warn",
    docs: {
      description: "The component property should be set",
      categories: ["csf" /* CSF */]
    },
    messages: {
      missingComponentProperty: "Missing component property."
    },
    schema: []
  },
  create(context) {
    return {
      ExportDefaultDeclaration(node) {
        let meta = getMetaObjectExpression(node, context);
        if (!meta)
          return null;
        meta.properties.find(
          (property) => !isSpreadElement(property) && "name" in property.key && property.key.name === "component"
        ) || context.report({
          node,
          messageId: "missingComponentProperty"
        });
      }
    };
  }
});

// src/rules/default-exports.ts
import path from "path";
var default_exports_default = createStorybookRule({
  name: "default-exports",
  defaultOptions: [],
  meta: {
    type: "problem",
    severity: "error",
    docs: {
      description: "Story files should have a default export",
      categories: ["csf" /* CSF */, "recommended" /* RECOMMENDED */]
    },
    messages: {
      shouldHaveDefaultExport: "The file should have a default export.",
      fixSuggestion: "Add default export"
    },
    fixable: "code",
    hasSuggestions: !0,
    schema: []
  },
  create(context) {
    let getComponentName = (node, filePath) => {
      let name = path.basename(filePath).split(".")[0];
      return node.body.find((stmt) => {
        if (isImportDeclaration(stmt) && isLiteral(stmt.source) && stmt.source.value.startsWith(`./${name}`))
          return !!stmt.specifiers.find(
            (spec) => isIdentifier(spec.local) && spec.local.name === name
          );
      }) ? name : null;
    }, hasDefaultExport = !1, isCsf4Style = !1, hasStoriesOfImport = !1;
    return {
      ImportSpecifier(node) {
        "name" in node.imported && node.imported.name === "storiesOf" && (hasStoriesOfImport = !0);
      },
      VariableDeclaration(node) {
        node.parent.type === "Program" && node.declarations.forEach((declaration) => {
          let init = declaration.init;
          if (init && init.type === "CallExpression") {
            let callee = init.callee;
            callee.type === "MemberExpression" && callee.property.type === "Identifier" && callee.property.name === "meta" && (isCsf4Style = !0);
          }
        });
      },
      ExportDefaultSpecifier: function() {
        hasDefaultExport = !0;
      },
      ExportDefaultDeclaration: function() {
        hasDefaultExport = !0;
      },
      "Program:exit": function(program) {
        if (!isCsf4Style && !hasDefaultExport && !hasStoriesOfImport) {
          let componentName = getComponentName(program, context.getFilename()), node = program.body.find((n) => !isImportDeclaration(n)) || program.body[0] || program, report = {
            node,
            messageId: "shouldHaveDefaultExport"
          }, fix = (fixer) => {
            let metaDeclaration = componentName ? `export default { component: ${componentName} }
` : `export default {}
`;
            return fixer.insertTextBefore(node, metaDeclaration);
          };
          context.report({
            ...report,
            fix,
            suggest: [
              {
                messageId: "fixSuggestion",
                fix
              }
            ]
          });
        }
      }
    };
  }
});

// src/rules/hierarchy-separator.ts
var hierarchy_separator_default = createStorybookRule({
  name: "hierarchy-separator",
  defaultOptions: [],
  meta: {
    type: "problem",
    fixable: "code",
    hasSuggestions: !0,
    severity: "warn",
    docs: {
      description: "Deprecated hierarchy separator in title property",
      categories: ["csf" /* CSF */, "recommended" /* RECOMMENDED */]
    },
    messages: {
      useCorrectSeparators: "Use correct separators",
      deprecatedHierarchySeparator: "Deprecated hierarchy separator in title property: {{metaTitle}}."
    },
    schema: []
  },
  create: function(context) {
    return {
      ExportDefaultDeclaration: function(node) {
        let meta = getMetaObjectExpression(node, context);
        if (!meta)
          return null;
        let titleNode = meta.properties.find(
          (prop) => !isSpreadElement(prop) && "name" in prop.key && prop.key?.name === "title"
        );
        if (!titleNode || !isLiteral(titleNode.value))
          return;
        let metaTitle = titleNode.value.raw || "";
        metaTitle.includes("|") && context.report({
          node: titleNode,
          messageId: "deprecatedHierarchySeparator",
          data: { metaTitle },
          // In case we want this to be auto fixed by --fix
          fix: function(fixer) {
            return fixer.replaceTextRange(titleNode.value.range, metaTitle.replace(/\|/g, "/"));
          },
          suggest: [
            {
              messageId: "useCorrectSeparators",
              fix: function(fixer) {
                return fixer.replaceTextRange(
                  titleNode.value.range,
                  metaTitle.replace(/\|/g, "/")
                );
              }
            }
          ]
        });
      }
    };
  }
});

// src/rules/meta-inline-properties.ts
var meta_inline_properties_default = createStorybookRule({
  name: "meta-inline-properties",
  defaultOptions: [{ csfVersion: 3 }],
  meta: {
    type: "problem",
    severity: "error",
    docs: {
      description: "Meta should only have inline properties",
      categories: ["csf" /* CSF */, "recommended" /* RECOMMENDED */],
      excludeFromConfig: !0
    },
    messages: {
      metaShouldHaveInlineProperties: "Meta should only have inline properties: {{property}}"
    },
    schema: [
      {
        type: "object",
        properties: {
          csfVersion: {
            type: "number"
          }
        },
        additionalProperties: !1
      }
    ]
  },
  create(context) {
    let isInline = (node) => node && typeof node == "object" && "value" in node ? node.value.type === "ObjectExpression" || node.value.type === "Literal" || node.value.type === "ArrayExpression" : !1;
    return {
      ExportDefaultDeclaration(node) {
        let meta = getMetaObjectExpression(node, context);
        if (!meta)
          return null;
        let ruleProperties = ["title", "args"], dynamicProperties = [];
        meta.properties.filter(
          (prop) => "key" in prop && "name" in prop.key && ruleProperties.includes(prop.key.name)
        ).forEach((metaNode) => {
          isInline(metaNode) || dynamicProperties.push(metaNode);
        }), dynamicProperties.length > 0 && dynamicProperties.forEach((propertyNode) => {
          context.report({
            node: propertyNode,
            messageId: "metaShouldHaveInlineProperties",
            data: {
              property: propertyNode.key?.name
            }
          });
        });
      }
    };
  }
});

// src/rules/meta-satisfies-type.ts
import { ASTUtils as ASTUtils3, AST_NODE_TYPES as AST_NODE_TYPES2 } from "@typescript-eslint/utils";
var meta_satisfies_type_default = createStorybookRule({
  name: "meta-satisfies-type",
  defaultOptions: [],
  meta: {
    type: "problem",
    fixable: "code",
    severity: "error",
    docs: {
      description: "Meta should use `satisfies Meta`",
      categories: [],
      excludeFromConfig: !0
    },
    messages: {
      metaShouldSatisfyType: "CSF Meta should use `satisfies` for type safety"
    },
    schema: []
  },
  create(context) {
    let sourceCode = context.getSourceCode(), getTextWithParentheses = (node) => {
      let beforeCount = 0, afterCount = 0;
      if (ASTUtils3.isParenthesized(node, sourceCode)) {
        let bodyOpeningParen = sourceCode.getTokenBefore(node, ASTUtils3.isOpeningParenToken), bodyClosingParen = sourceCode.getTokenAfter(node, ASTUtils3.isClosingParenToken);
        bodyOpeningParen && bodyClosingParen && (beforeCount = node.range[0] - bodyOpeningParen.range[0], afterCount = bodyClosingParen.range[1] - node.range[1]);
      }
      return sourceCode.getText(node, beforeCount, afterCount);
    }, getFixer = (meta) => {
      let { parent } = meta;
      if (parent)
        switch (parent.type) {
          // {} as Meta
          case AST_NODE_TYPES2.TSAsExpression:
            return (fixer) => [
              fixer.replaceText(parent, getTextWithParentheses(meta)),
              fixer.insertTextAfter(
                parent,
                ` satisfies ${getTextWithParentheses(parent.typeAnnotation)}`
              )
            ];
          // const meta: Meta = {}
          case AST_NODE_TYPES2.VariableDeclarator: {
            let { typeAnnotation } = parent.id;
            return typeAnnotation ? (fixer) => [
              fixer.remove(typeAnnotation),
              fixer.insertTextAfter(
                meta,
                ` satisfies ${getTextWithParentheses(typeAnnotation.typeAnnotation)}`
              )
            ] : void 0;
          }
          default:
            return;
        }
    };
    return {
      ExportDefaultDeclaration(node) {
        let meta = getMetaObjectExpression(node, context);
        if (!meta)
          return null;
        (!meta.parent || !isTSSatisfiesExpression(meta.parent)) && context.report({
          node: meta,
          messageId: "metaShouldSatisfyType",
          fix: getFixer(meta)
        });
      }
    };
  }
});

// src/rules/no-redundant-story-name.ts
import { storyNameFromExport } from "storybook/internal/csf";
var no_redundant_story_name_default = createStorybookRule({
  name: "no-redundant-story-name",
  defaultOptions: [],
  meta: {
    type: "suggestion",
    fixable: "code",
    hasSuggestions: !0,
    severity: "warn",
    docs: {
      description: "A story should not have a redundant name property",
      categories: ["csf" /* CSF */, "recommended" /* RECOMMENDED */]
    },
    messages: {
      removeRedundantName: "Remove redundant name",
      storyNameIsRedundant: "Named exports should not use the name annotation if it is redundant to the name that would be generated by the export name"
    },
    schema: []
  },
  create(context) {
    return {
      // CSF3
      ExportNamedDeclaration: function(node) {
        if (!node.declaration)
          return;
        let decl = node.declaration;
        if (isVariableDeclaration(decl)) {
          let declaration = decl.declarations[0];
          if (declaration == null)
            return;
          let { id, init } = declaration;
          if (isIdentifier(id) && isObjectExpression(init)) {
            let storyNameNode = init.properties.find(
              (prop) => isProperty(prop) && isIdentifier(prop.key) && (prop.key?.name === "name" || prop.key?.name === "storyName")
            );
            if (!storyNameNode)
              return;
            let { name } = id, resolvedStoryName = storyNameFromExport(name);
            !isSpreadElement(storyNameNode) && isLiteral(storyNameNode.value) && storyNameNode.value.value === resolvedStoryName && context.report({
              node: storyNameNode,
              messageId: "storyNameIsRedundant",
              suggest: [
                {
                  messageId: "removeRedundantName",
                  fix: function(fixer) {
                    return fixer.remove(storyNameNode);
                  }
                }
              ]
            });
          }
        }
      },
      // CSF2
      AssignmentExpression: function(node) {
        if (!isExpressionStatement(node.parent))
          return;
        let { left, right } = node;
        if ("property" in left && isIdentifier(left.property) && !isMetaProperty(left) && left.property.name === "storyName") {
          if (!("name" in left.object && "value" in right))
            return;
          let propertyName = left.object.name, propertyValue = right.value, resolvedStoryName = storyNameFromExport(propertyName);
          propertyValue === resolvedStoryName && context.report({
            node,
            messageId: "storyNameIsRedundant",
            suggest: [
              {
                messageId: "removeRedundantName",
                fix: function(fixer) {
                  return fixer.remove(node);
                }
              }
            ]
          });
        }
      }
    };
  }
});

// src/rules/no-renderer-packages.ts
var rendererToFrameworks = {
  "@storybook/html": ["@storybook/html-vite", "@storybook/html-webpack5"],
  "@storybook/preact": ["@storybook/preact-vite", "@storybook/preact-webpack5"],
  "@storybook/react": [
    "@storybook/nextjs",
    "@storybook/react-vite",
    "@storybook/nextjs-vite",
    "@storybook/react-webpack5",
    "@storybook/react-native-web-vite"
  ],
  "@storybook/server": ["@storybook/server-webpack5"],
  "@storybook/svelte": [
    "@storybook/svelte-vite",
    "@storybook/svelte-webpack5",
    "@storybook/sveltekit"
  ],
  "@storybook/vue3": ["@storybook/vue3-vite", "@storybook/vue3-webpack5"],
  "@storybook/web-components": [
    "@storybook/web-components-vite",
    "@storybook/web-components-webpack5"
  ]
}, no_renderer_packages_default = createStorybookRule({
  name: "no-renderer-packages",
  defaultOptions: [],
  meta: {
    type: "problem",
    severity: "error",
    docs: {
      description: "Do not import renderer packages directly in stories",
      categories: ["recommended" /* RECOMMENDED */]
    },
    schema: [],
    messages: {
      noRendererPackages: 'Do not import renderer package "{{rendererPackage}}" directly. Use a framework package instead (e.g. {{suggestions}}).'
    }
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        let packageName = node.source.value;
        if (typeof packageName == "string" && packageName in rendererToFrameworks) {
          let suggestions = rendererToFrameworks[packageName];
          context.report({
            node,
            messageId: "noRendererPackages",
            data: {
              rendererPackage: packageName,
              suggestions: suggestions.join(", ")
            }
          });
        }
      }
    };
  }
});

// src/rules/no-stories-of.ts
var no_stories_of_default = createStorybookRule({
  name: "no-stories-of",
  defaultOptions: [],
  meta: {
    type: "problem",
    severity: "error",
    docs: {
      description: "storiesOf is deprecated and should not be used",
      categories: ["csf-strict" /* CSF_STRICT */]
    },
    messages: {
      doNotUseStoriesOf: "storiesOf is deprecated and should not be used"
    },
    schema: []
  },
  create(context) {
    return {
      ImportSpecifier(node) {
        "name" in node.imported && node.imported.name === "storiesOf" && context.report({
          node,
          messageId: "doNotUseStoriesOf"
        });
      }
    };
  }
});

// src/rules/no-title-property-in-meta.ts
var no_title_property_in_meta_default = createStorybookRule({
  name: "no-title-property-in-meta",
  defaultOptions: [],
  meta: {
    type: "problem",
    fixable: "code",
    hasSuggestions: !0,
    severity: "error",
    docs: {
      description: "Do not define a title in meta",
      categories: ["csf-strict" /* CSF_STRICT */]
    },
    messages: {
      removeTitleInMeta: "Remove title property from meta",
      noTitleInMeta: "CSF3 does not need a title in meta"
    },
    schema: []
  },
  create: function(context) {
    return {
      ExportDefaultDeclaration: function(node) {
        let meta = getMetaObjectExpression(node, context);
        if (!meta)
          return null;
        let titleNode = meta.properties.find(
          (prop) => !isSpreadElement(prop) && "name" in prop.key && prop.key?.name === "title"
        );
        titleNode && context.report({
          node: titleNode,
          messageId: "noTitleInMeta",
          suggest: [
            {
              messageId: "removeTitleInMeta",
              fix(fixer) {
                let hasComma = context.getSourceCode().text.slice(
                  titleNode.range[0],
                  titleNode.range[1] + 1
                ).slice(-1) === ",", propertyRange = [
                  titleNode.range[0],
                  hasComma ? titleNode.range[1] + 1 : titleNode.range[1]
                ];
                return fixer.removeRange(propertyRange);
              }
            }
          ]
        });
      }
    };
  }
});

// src/rules/no-uninstalled-addons.ts
var import_ts_dedent = __toESM(require_dist(), 1);
import { readFileSync } from "fs";
import { relative, resolve, sep } from "path";
var no_uninstalled_addons_default = createStorybookRule({
  name: "no-uninstalled-addons",
  defaultOptions: [
    {
      packageJsonLocation: "",
      ignore: []
    }
  ],
  meta: {
    type: "problem",
    severity: "error",
    docs: {
      description: "This rule identifies storybook addons that are invalid because they are either not installed or contain a typo in their name.",
      categories: ["recommended" /* RECOMMENDED */]
    },
    messages: {
      addonIsNotInstalled: "The {{ addonName }} is not installed in {{packageJsonPath}}. Did you forget to install it or is your package.json in a different location?"
    },
    schema: [
      {
        type: "object",
        properties: {
          packageJsonLocation: {
            type: "string"
          },
          ignore: {
            type: "array",
            items: {
              type: "string"
            }
          }
        }
      }
    ]
  },
  create(context) {
    let { packageJsonLocation, ignore } = context.options.reduce(
      (acc, val) => ({
        packageJsonLocation: val.packageJsonLocation || acc.packageJsonLocation,
        ignore: val.ignore || acc.ignore
      }),
      { packageJsonLocation: "", ignore: [] }
    );
    function excludeNullable(item) {
      return !!item;
    }
    let mergeDepsWithDevDeps = (packageJson) => {
      let deps = Object.keys(packageJson.dependencies || {}), devDeps = Object.keys(packageJson.devDependencies || {});
      return [...deps, ...devDeps];
    }, isAddonInstalled = (addon, installedAddons) => {
      let addonName = addon.replace(/\.[mc]?js$/, "").replace(/\/register$/, "").replace(/\/preset$/, "");
      return installedAddons.includes(addonName);
    }, filterLocalAddons = (addon) => !((addonName) => addonName.startsWith(".") || addonName.startsWith("/") || // for local Windows files e.g. (C: F: D:)
    /\w:.*/.test(addonName) || addonName.startsWith("\\"))(addon), areThereAddonsNotInstalled = (addons, installedSbAddons) => {
      let result = addons.filter(filterLocalAddons).filter((addon) => !isAddonInstalled(addon, installedSbAddons) && !ignore.includes(addon)).map((addon) => ({ name: addon }));
      return result.length ? result : !1;
    }, getPackageJson = (path2) => {
      let packageJson = {
        devDependencies: {},
        dependencies: {}
      };
      try {
        let file = readFileSync(path2, "utf8"), parsedFile = JSON.parse(file);
        packageJson.dependencies = parsedFile.dependencies || {}, packageJson.devDependencies = parsedFile.devDependencies || {};
      } catch {
        throw new Error(
          import_ts_dedent.dedent`The provided path in your eslintrc.json - ${path2} is not a valid path to a package.json file or your package.json file is not in the same folder as ESLint is running from.

          Read more at: https://github.com/storybookjs/storybook/blob/next/code/lib/eslint-plugin/docs/rules/no-uninstalled-addons.md
          `
        );
      }
      return packageJson;
    }, extractAllAddonsFromTheStorybookConfig = (addonsExpression) => {
      if (addonsExpression?.elements) {
        let nodesWithAddons = addonsExpression.elements.map((elem) => isLiteral(elem) ? { value: elem.value, node: elem } : void 0).filter(excludeNullable), listOfAddonsInString = nodesWithAddons.map((elem) => elem.value), nodesWithAddonsInObj = addonsExpression.elements.map((elem) => isObjectExpression(elem) ? elem : { properties: [] }).map((elem) => {
          let property = elem.properties.find(
            (prop) => isProperty(prop) && isIdentifier(prop.key) && prop.key.name === "name"
          );
          return isLiteral(property?.value) ? { value: property.value.value, node: property.value } : void 0;
        }).filter(excludeNullable), listOfAddonsInObj = nodesWithAddonsInObj.map((elem) => elem.value), listOfAddons = [...listOfAddonsInString, ...listOfAddonsInObj], listOfAddonElements = [...nodesWithAddons, ...nodesWithAddonsInObj];
        return { listOfAddons, listOfAddonElements };
      }
      return { listOfAddons: [], listOfAddonElements: [] };
    };
    function reportUninstalledAddons(addonsProp) {
      let packageJsonPath = resolve(packageJsonLocation || "./package.json"), packageJsonObject;
      try {
        packageJsonObject = getPackageJson(packageJsonPath);
      } catch (e) {
        throw new Error(e);
      }
      let depsAndDevDeps = mergeDepsWithDevDeps(packageJsonObject), { listOfAddons, listOfAddonElements } = extractAllAddonsFromTheStorybookConfig(addonsProp), result = areThereAddonsNotInstalled(listOfAddons, depsAndDevDeps);
      if (result) {
        let elemsWithErrors = listOfAddonElements.filter(
          (elem) => !!result.find((addon) => addon.name === elem.value)
        ), currentPackageJsonPath = `${process.cwd().split(sep).pop()}${sep}${relative(process.cwd(), packageJsonLocation)}`;
        elemsWithErrors.forEach((elem) => {
          context.report({
            node: elem.node,
            messageId: "addonIsNotInstalled",
            data: {
              addonName: elem.value,
              packageJsonPath: currentPackageJsonPath
            }
          });
        });
      }
    }
    function findAddonsPropAndReport(node) {
      let addonsProp = node.properties.find(
        (prop) => isProperty(prop) && isIdentifier(prop.key) && prop.key.name === "addons"
      );
      addonsProp?.value && isArrayExpression(addonsProp.value) && reportUninstalledAddons(addonsProp.value);
    }
    return {
      AssignmentExpression: function(node) {
        isObjectExpression(node.right) && findAddonsPropAndReport(node.right);
      },
      ExportDefaultDeclaration: function(node) {
        let meta = getMetaObjectExpression(node, context);
        if (!meta)
          return null;
        findAddonsPropAndReport(meta);
      },
      ExportNamedDeclaration: function(node) {
        let addonsProp = isVariableDeclaration(node.declaration) && node.declaration.declarations.find(
          (decl) => isVariableDeclarator(decl) && isIdentifier(decl.id) && decl.id.name === "addons"
        );
        addonsProp && isArrayExpression(addonsProp.init) && reportUninstalledAddons(addonsProp.init);
      }
    };
  }
});

// src/rules/prefer-pascal-case.ts
import { isExportStory as isExportStory2 } from "storybook/internal/csf";
import { ASTUtils as ASTUtils4 } from "@typescript-eslint/utils";
var prefer_pascal_case_default = createStorybookRule({
  name: "prefer-pascal-case",
  defaultOptions: [],
  meta: {
    type: "suggestion",
    fixable: "code",
    hasSuggestions: !0,
    severity: "warn",
    docs: {
      description: "Stories should use PascalCase",
      categories: ["recommended" /* RECOMMENDED */]
    },
    messages: {
      convertToPascalCase: "Use pascal case",
      usePascalCase: "The story should use PascalCase notation: {{name}}"
    },
    schema: []
  },
  create(context) {
    let isPascalCase = (str) => /^[A-Z]+([a-z0-9]?)+/.test(str), toPascalCase = (str) => str.replace(new RegExp(/[-_]+/, "g"), " ").replace(new RegExp(/[^\w\s]/, "g"), "").replace(
      new RegExp(/\s+(.)(\w+)/, "g"),
      (_, $2, $3) => `${$2.toUpperCase() + $3.toLowerCase()}`
    ).replace(new RegExp(/\s/, "g"), "").replace(new RegExp(/\w/), (s) => s.toUpperCase()), getModuleScope = () => {
      let { sourceCode } = context;
      return sourceCode.getScope ? sourceCode.scopeManager?.scopes?.find(
        (scope) => scope.type === "module"
      ) : context.getScope().childScopes.find((scope) => scope.type === "module");
    }, checkAndReportError = (id, nonStoryExportsConfig2 = {}) => {
      let { name } = id;
      if (!isExportStory2(name, nonStoryExportsConfig2) || name === "__namedExportsOrder")
        return null;
      !name.startsWith("_") && !isPascalCase(name) && context.report({
        node: id,
        messageId: "usePascalCase",
        data: {
          name
        },
        suggest: [
          {
            messageId: "convertToPascalCase",
            *fix(fixer) {
              let suffix = context.getSourceCode().text.slice(id.range[0], id.range[1]).substring(name.length), pascal = toPascalCase(name);
              yield fixer.replaceTextRange(id.range, pascal + suffix);
              let scope = getModuleScope();
              if (scope) {
                let variable = ASTUtils4.findVariable(scope, name), referenceCount = variable?.references?.length || 0;
                for (let i = 0; i < referenceCount; i++) {
                  let ref = variable?.references[i];
                  ref && !ref.init && (yield fixer.replaceTextRange(ref.identifier.range, pascal));
                }
              }
            }
          }
        ]
      });
    }, meta, nonStoryExportsConfig, namedExports = [], hasStoriesOfImport = !1;
    return {
      ImportSpecifier(node) {
        "name" in node.imported && node.imported.name === "storiesOf" && (hasStoriesOfImport = !0);
      },
      ExportDefaultDeclaration: function(node) {
        if (meta = getMetaObjectExpression(node, context), meta)
          try {
            nonStoryExportsConfig = {
              excludeStories: getDescriptor(meta, "excludeStories"),
              includeStories: getDescriptor(meta, "includeStories")
            };
          } catch {
          }
      },
      ExportNamedDeclaration: function(node) {
        if (!node.declaration)
          return;
        let decl = node.declaration;
        if (isVariableDeclaration(decl)) {
          let declaration = decl.declarations[0];
          if (declaration == null)
            return;
          let { id } = declaration;
          isIdentifier(id) && namedExports.push(id);
        }
      },
      "Program:exit": function() {
        namedExports.length && !hasStoriesOfImport && namedExports.forEach((n) => checkAndReportError(n, nonStoryExportsConfig));
      }
    };
  }
});

// src/rules/story-exports.ts
var story_exports_default = createStorybookRule({
  name: "story-exports",
  defaultOptions: [],
  meta: {
    type: "problem",
    severity: "error",
    docs: {
      description: "A story file must contain at least one story export",
      categories: ["recommended" /* RECOMMENDED */, "csf" /* CSF */]
    },
    messages: {
      shouldHaveStoryExport: "The file should have at least one story export",
      shouldHaveStoryExportWithFilters: "The file should have at least one story export. Make sure the includeStories/excludeStories you defined are correct, otherwise Storybook will not use any stories for this file.",
      addStoryExport: "Add a story export"
    },
    fixable: void 0,
    // change to 'code' once we have autofixes
    schema: []
  },
  create(context) {
    let hasStoriesOfImport = !1, nonStoryExportsConfig = {}, meta, namedExports = [];
    return {
      ImportSpecifier(node) {
        "name" in node.imported && node.imported.name === "storiesOf" && (hasStoriesOfImport = !0);
      },
      ExportDefaultDeclaration: function(node) {
        if (meta = getMetaObjectExpression(node, context), meta)
          try {
            nonStoryExportsConfig = {
              excludeStories: getDescriptor(meta, "excludeStories"),
              includeStories: getDescriptor(meta, "includeStories")
            };
          } catch {
          }
      },
      ExportNamedDeclaration: function(node) {
        namedExports.push(...getAllNamedExports(node));
      },
      "Program:exit": function(program) {
        if (hasStoriesOfImport || !meta || namedExports.filter(
          (exp) => isValidStoryExport(exp, nonStoryExportsConfig)
        ).length)
          return;
        let node = program.body.find((n) => !isImportDeclaration(n)) || program.body[0] || program, hasFilter = nonStoryExportsConfig.includeStories || nonStoryExportsConfig.excludeStories, report = {
          node,
          messageId: hasFilter ? "shouldHaveStoryExportWithFilters" : "shouldHaveStoryExport"
          // fix,
        };
        context.report(report);
      }
    };
  }
});

// src/rules/use-storybook-expect.ts
var use_storybook_expect_default = createStorybookRule({
  name: "use-storybook-expect",
  defaultOptions: [],
  meta: {
    type: "suggestion",
    fixable: "code",
    schema: [],
    severity: "error",
    docs: {
      description: "Use expect from `@storybook/test`, `storybook/test` or `@storybook/jest`",
      categories: ["addon-interactions" /* ADDON_INTERACTIONS */, "recommended" /* RECOMMENDED */]
    },
    messages: {
      useExpectFromStorybook: "Do not use global expect directly in the story. You should import it from `@storybook/test` (preferrably) or `@storybook/jest` instead."
    }
  },
  create(context) {
    let isExpectFromStorybookImported = (node) => {
      let { value: packageName } = node.source;
      return (packageName === "@storybook/jest" || packageName === "@storybook/test" || packageName === "storybook/test") && node.specifiers.find(
        (spec) => isImportSpecifier(spec) && "name" in spec.imported && spec.imported.name === "expect"
      );
    }, isImportingFromStorybookExpect = !1, expectInvocations = [];
    return {
      ImportDeclaration(node) {
        isExpectFromStorybookImported(node) && (isImportingFromStorybookExpect = !0);
      },
      CallExpression(node) {
        if (!isIdentifier(node.callee))
          return null;
        node.callee.name === "expect" && expectInvocations.push(node.callee);
      },
      "Program:exit": function() {
        !isImportingFromStorybookExpect && expectInvocations.length && expectInvocations.forEach((node) => {
          context.report({
            node,
            messageId: "useExpectFromStorybook"
          });
        });
      }
    };
  }
});

// src/rules/use-storybook-testing-library.ts
var use_storybook_testing_library_default = createStorybookRule({
  name: "use-storybook-testing-library",
  defaultOptions: [],
  meta: {
    type: "suggestion",
    fixable: "code",
    hasSuggestions: !0,
    severity: "error",
    docs: {
      description: "Do not use testing-library directly on stories",
      categories: ["addon-interactions" /* ADDON_INTERACTIONS */, "recommended" /* RECOMMENDED */]
    },
    schema: [],
    messages: {
      updateImports: "Update imports",
      dontUseTestingLibraryDirectly: "Do not use `{{library}}` directly in the story. You should import the functions from `@storybook/test` (preferrably) or `@storybook/testing-library` instead."
    }
  },
  create(context) {
    let getRangeWithoutQuotes = (source) => [
      // Not sure how to improve this. If I use node.source.range
      // it will eat the quotes and we do not want to specify whether the quotes are single or double
      source.range[0] + 1,
      source.range[1] - 1
    ], hasDefaultImport = (specifiers) => specifiers.find((s) => isImportDefaultSpecifier(s)), getSpecifiers = (node) => {
      let { specifiers } = node;
      if (!specifiers[0])
        return null;
      let start = specifiers[0].range[0], previousSpecifier = specifiers[specifiers.length - 1];
      if (!previousSpecifier)
        return null;
      let end = previousSpecifier.range[1], fullText = context.getSourceCode().text, importEnd = node.range[1], closingBrace = fullText.indexOf("}", end - 1);
      closingBrace > -1 && closingBrace <= importEnd && (end = closingBrace + 1);
      let text = fullText.substring(start, end);
      return { range: [start, end], text };
    }, fixSpecifiers = (specifiersText) => `{ ${specifiersText.replace("{", "").replace("}", "").replace(/\s\s+/g, " ").trim()} }`;
    return {
      ImportDeclaration(node) {
        node.source.value.includes("@testing-library") && context.report({
          node,
          messageId: "dontUseTestingLibraryDirectly",
          data: {
            library: node.source.value
          },
          *fix(fixer) {
            if (yield fixer.replaceTextRange(
              getRangeWithoutQuotes(node.source),
              "@storybook/testing-library"
            ), hasDefaultImport(node.specifiers)) {
              let specifiers = getSpecifiers(node);
              if (specifiers) {
                let { range, text } = specifiers;
                yield fixer.replaceTextRange(range, fixSpecifiers(text));
              }
            }
          },
          suggest: [
            {
              messageId: "updateImports",
              *fix(fixer) {
                if (yield fixer.replaceTextRange(
                  getRangeWithoutQuotes(node.source),
                  "@storybook/testing-library"
                ), hasDefaultImport(node.specifiers)) {
                  let specifiers = getSpecifiers(node);
                  if (specifiers) {
                    let { range, text } = specifiers;
                    yield fixer.replaceTextRange(range, fixSpecifiers(text));
                  }
                }
              }
            }
          ]
        });
      }
    };
  }
});

// src/index.ts
var configs = {
  // eslintrc configs
  csf: csf_default,
  "csf-strict": csf_strict_default,
  "addon-interactions": addon_interactions_default,
  recommended: recommended_default2,
  // flat configs
  "flat/csf": csf_default2,
  "flat/csf-strict": csf_strict_default2,
  "flat/addon-interactions": addon_interactions_default2,
  "flat/recommended": recommended_default
}, rules = {
  "await-interactions": await_interactions_default,
  "context-in-play-function": context_in_play_function_default,
  "csf-component": csf_component_default,
  "default-exports": default_exports_default,
  "hierarchy-separator": hierarchy_separator_default,
  "meta-inline-properties": meta_inline_properties_default,
  "meta-satisfies-type": meta_satisfies_type_default,
  "no-redundant-story-name": no_redundant_story_name_default,
  "no-renderer-packages": no_renderer_packages_default,
  "no-stories-of": no_stories_of_default,
  "no-title-property-in-meta": no_title_property_in_meta_default,
  "no-uninstalled-addons": no_uninstalled_addons_default,
  "prefer-pascal-case": prefer_pascal_case_default,
  "story-exports": story_exports_default,
  "use-storybook-expect": use_storybook_expect_default,
  "use-storybook-testing-library": use_storybook_testing_library_default
}, index_default = {
  configs,
  rules
};
export {
  configs,
  index_default as default,
  rules
};
