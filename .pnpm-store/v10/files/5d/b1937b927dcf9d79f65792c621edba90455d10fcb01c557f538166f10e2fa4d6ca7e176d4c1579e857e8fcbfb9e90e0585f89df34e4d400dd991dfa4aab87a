// src/rules/predicates.ts
var commaFilter = { filter: (token) => token.value === "," };
var includeCommentsFilter = { includeComments: true };
function makePredicate(isImport, addFixer) {
  return (problem, context) => {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const { parent } = problem.node ?? // typescript-eslint >= 7.8 sets a range instead of a node
    sourceCode.getNodeByRangeIndex(sourceCode.getIndexFromLoc(problem.loc.start));
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
export {
  src_default as default
};
