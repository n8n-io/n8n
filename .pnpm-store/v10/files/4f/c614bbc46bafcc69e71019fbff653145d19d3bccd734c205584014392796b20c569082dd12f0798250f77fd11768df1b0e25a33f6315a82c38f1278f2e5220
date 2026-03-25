"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// node_modules/.pnpm/tsup@8.2.4_jiti@1.21.6_postcss@8.4.40_typescript@5.6.2/node_modules/tsup/assets/cjs_shims.js
var getImportMetaUrl = () => typeof document === "undefined" ? new URL(`file:${__filename}`).href : document.currentScript && document.currentScript.src || new URL("main.js", document.baseURI).href;
var importMetaUrl = /* @__PURE__ */ getImportMetaUrl();

// src/rules/predicates.ts
var commaFilter = { filter: (token) => token.value === "," };
var includeCommentsFilter = { includeComments: true };
function makePredicate(isImport, addFixer) {
  return (problem, context) => {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const { parent } = _nullishCoalesce(problem.node, () => ( // typescript-eslint >= 7.8 sets a range instead of a node
    sourceCode.getNodeByRangeIndex(sourceCode.getIndexFromLoc(problem.loc.start))));
    return parent ? /^Import(|Default|Namespace)Specifier$/.test(parent.type) == isImport ? Object.assign(problem, _optionalChain([addFixer, 'optionalCall', _2 => _2(parent, sourceCode)])) : false : isImport ? false : problem;
  };
}
var unusedVarsPredicate = makePredicate(false);
var unusedImportsPredicate = makePredicate(true, (parent, sourceCode) => ({
  fix(fixer) {
    const grandParent = parent.parent;
    if (!grandParent) {
      return null;
    }
    if (grandParent.specifiers.length === 1) {
      const nextToken = sourceCode.getTokenAfter(grandParent, includeCommentsFilter);
      const newLinesBetween = nextToken ? nextToken.loc.start.line - grandParent.loc.start.line : 0;
      const endOfReplaceRange = nextToken ? nextToken.range[0] : grandParent.range[1];
      const count = Math.max(0, newLinesBetween - 1);
      return [
        fixer.remove(grandParent),
        fixer.replaceTextRange(
          [grandParent.range[1], endOfReplaceRange],
          "\n".repeat(count)
        )
      ];
    }
    if (parent !== grandParent.specifiers[grandParent.specifiers.length - 1]) {
      const comma = sourceCode.getTokenAfter(parent, commaFilter);
      const prevNode = sourceCode.getTokenBefore(parent);
      return [
        fixer.removeRange([prevNode.range[1], parent.range[0]]),
        fixer.remove(parent),
        fixer.remove(comma)
      ];
    }
    if (grandParent.specifiers.filter((specifier) => specifier.type === "ImportSpecifier").length === 1) {
      const start = sourceCode.getTokenBefore(parent, commaFilter);
      const end = sourceCode.getTokenAfter(parent, {
        filter: (token) => token.value === "}"
      });
      return fixer.removeRange([start.range[0], end.range[1]]);
    }
    return fixer.removeRange([
      sourceCode.getTokenBefore(parent, commaFilter).range[0],
      parent.range[1]
    ]);
  }
}));
function createRuleWithPredicate(name, baseRule, predicate) {
  return {
    ...baseRule,
    meta: {
      ...baseRule.meta,
      fixable: "code",
      docs: {
        ..._optionalChain([baseRule, 'access', _3 => _3.meta, 'optionalAccess', _4 => _4.docs]),
        url: `https://github.com/sweepline/eslint-plugin-unused-imports/blob/master/docs/rules/${name}.md`
      }
    },
    create(context) {
      return baseRule.create(
        Object.create(context, {
          report: {
            enumerable: true,
            value(problem) {
              const result = predicate(problem, context);
              if (result) {
                context.report(result);
              }
            }
          }
        })
      );
    }
  };
}

// src/rules/load-rule.ts
var _module = require('module');
var rule;
var require2 = _module.createRequire.call(void 0, importMetaUrl);
function getBaseRule() {
  if (!rule) {
    try {
      const tslint = require2("@typescript-eslint/eslint-plugin");
      rule = tslint.rules["no-unused-vars"];
    } catch (_) {
      rule = getESLintBaseRule();
    }
  }
  return rule;
}
function getESLintBaseRule() {
  const eslint = require2("eslint");
  return new eslint.Linter({ configType: "eslintrc" }).getRules().get("no-unused-vars");
}

// src/rules/no-unused-vars.ts
var no_unused_vars_default = createRuleWithPredicate("no-unused-vars", getBaseRule(), unusedVarsPredicate);

// src/rules/no-unused-imports.ts
var no_unused_imports_default = createRuleWithPredicate("no-unused-imports", getBaseRule(), unusedImportsPredicate);

// src/index.ts
var plugin = {
  meta: {
    name: "unused-imports"
  },
  rules: {
    "no-unused-vars": no_unused_vars_default,
    "no-unused-imports": no_unused_imports_default
  }
};
var src_default = plugin;


exports.default = src_default;

module.exports = exports.default;
