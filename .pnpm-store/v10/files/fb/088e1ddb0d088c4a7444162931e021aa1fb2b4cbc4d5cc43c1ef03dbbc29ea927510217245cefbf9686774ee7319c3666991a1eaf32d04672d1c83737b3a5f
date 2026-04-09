// src/rules/predicates.ts
var commaFilter = { filter: (token) => token.value === "," };
var includeCommentsFilter = { includeComments: true };
function isUsedInJSDoc(identifierName, sourceCode) {
  const comments = sourceCode.getAllComments();
  const jsdocPattern = new RegExp(
    // {@link Name} or @see Name
    `(?:@(?:link|linkcode|linkplain|see)\\s+${identifierName}\\b)|(?:\\{@(?:link|linkcode|linkplain)\\s+${identifierName}\\b\\})|(?:[@{](?:type|typedef|param|returns?|template|augments|extends|implements)\\s+[^}]*\\b${identifierName}\\b)`
  );
  return comments.some((comment) => {
    if (comment.type !== "Block") {
      return false;
    }
    return jsdocPattern.test(comment.value);
  });
}
function makePredicate(isImport, addFixer) {
  return (problem, context) => {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const node = problem.node ?? // typescript-eslint >= 7.8 sets a range instead of a node
    sourceCode.getNodeByRangeIndex(sourceCode.getIndexFromLoc(problem.loc.start));
    const { parent } = node;
    if (parent && /^Import(|Default|Namespace)Specifier$/.test(parent.type) && isImport) {
      const identifierName = node.name;
      if (identifierName && isUsedInJSDoc(identifierName, sourceCode)) {
        return false;
      }
    }
    return parent ? /^Import(|Default|Namespace)Specifier$/.test(parent.type) == isImport ? Object.assign(problem, addFixer?.(parent, sourceCode)) : false : isImport ? false : problem;
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
        ...baseRule.meta?.docs,
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
import { createRequire } from "module";
var rule;
var require2 = createRequire(import.meta.url);
function getBaseRule() {
  if (!rule) {
    rule = getRuleFromTSLintPlugin() ?? getRuleFromTSLint() ?? getESLintBaseRule();
  }
  return rule;
}
function getRuleFromTSLintPlugin() {
  try {
    const tslintPlugin = require2("@typescript-eslint/eslint-plugin");
    return tslintPlugin.rules["no-unused-vars"];
  } catch (_) {
    return null;
  }
}
function getRuleFromTSLint() {
  try {
    const tslint = require2("typescript-eslint");
    return tslint.plugin.rules["no-unused-vars"];
  } catch (_) {
    return null;
  }
}
function getESLintBaseRule() {
  try {
    const eslint = require2("eslint");
    return new eslint.Linter({ configType: "eslintrc" }).getRules().get("no-unused-vars");
  } catch {
    const eslint_USE_AT_YOUR_OWN_RISK = require2("eslint/use-at-your-own-risk");
    if ("builtinRules" in eslint_USE_AT_YOUR_OWN_RISK && eslint_USE_AT_YOUR_OWN_RISK.builtinRules instanceof Map) {
      return eslint_USE_AT_YOUR_OWN_RISK.builtinRules.get("no-unused-vars");
    }
    throw new TypeError("[eslint-plugin-unused-imports] Cannot load 'no-unused-vars' rule from ESLint. This is most likely due to a breaking change in ESLint's internal API. Please report this issue to 'eslint-plugin-unused-imports'.");
  }
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
var index_default = plugin;
export {
  index_default as default
};
