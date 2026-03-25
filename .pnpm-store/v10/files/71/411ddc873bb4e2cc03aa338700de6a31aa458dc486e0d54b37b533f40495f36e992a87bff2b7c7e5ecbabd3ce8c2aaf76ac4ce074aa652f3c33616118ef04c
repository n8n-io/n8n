import path from "node:path";
import { getStaticValue } from "@eslint-community/eslint-utils";
import {
  getMetaDocsProperty,
  getRuleInfo,
  insertProperty,
  isUndefinedIdentifier
} from "../utils.js";
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "require rules to implement a `meta.docs.url` property",
      category: "Rules",
      recommended: false,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-docs-url.md"
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "A pattern to enforce rule's document URL. It replaces `{{name}}` placeholder by each rule name. The rule name is the basename of each rule file. Omitting this allows any URL."
          }
        },
        additionalProperties: false
      }
    ],
    defaultOptions: [{}],
    messages: {
      mismatch: "`meta.docs.url` property must be `{{expectedUrl}}`.",
      missing: "`meta.docs.url` property is missing.",
      wrongType: "`meta.docs.url` property must be a string."
    }
  },
  /**
   * Creates AST event handlers for require-meta-docs-url.
   * @param context - The rule context.
   * @returns AST event handlers.
   */
  create(context) {
    const options = context.options[0] || {};
    const filename = context.filename;
    const ruleName = filename === "<input>" ? void 0 : path.basename(filename, path.extname(filename));
    const expectedUrl = !options.pattern || !ruleName ? void 0 : options.pattern.replaceAll(/{{\s*name\s*}}/g, ruleName);
    function isExpectedUrl(url) {
      return Boolean(
        typeof url === "string" && (expectedUrl === void 0 || url === expectedUrl)
      );
    }
    const sourceCode = context.sourceCode;
    const ruleInfo = getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }
    return {
      Program(ast) {
        const scope = sourceCode.getScope(ast);
        const { scopeManager } = sourceCode;
        const {
          docsNode,
          metaNode,
          metaPropertyNode: urlPropNode
        } = getMetaDocsProperty("url", ruleInfo, scopeManager);
        const staticValue = urlPropNode ? getStaticValue(urlPropNode.value, scope) : void 0;
        if (urlPropNode && !staticValue) {
          return;
        }
        if (staticValue && typeof staticValue.value === "string" && isExpectedUrl(staticValue.value)) {
          return;
        }
        context.report({
          node: urlPropNode && urlPropNode.value || docsNode && docsNode.value || metaNode || ruleInfo.create,
          // eslint-disable-next-line unicorn/no-negated-condition -- actually more clear like this
          messageId: !urlPropNode ? "missing" : (
            // eslint-disable-next-line unicorn/no-nested-ternary,unicorn/no-negated-condition -- this is fine for now
            !expectedUrl ? "wrongType" : (
              /* otherwise */
              "mismatch"
            )
          ),
          data: {
            expectedUrl
          },
          fix(fixer) {
            if (!expectedUrl) {
              return null;
            }
            const urlString = JSON.stringify(expectedUrl);
            if (urlPropNode) {
              if (urlPropNode.value.type === "Literal" || isUndefinedIdentifier(urlPropNode.value)) {
                return fixer.replaceText(urlPropNode.value, urlString);
              }
            } else if (docsNode && docsNode.value.type === "ObjectExpression") {
              return insertProperty(
                fixer,
                docsNode.value,
                `url: ${urlString}`,
                sourceCode
              );
            } else if (!docsNode && metaNode && metaNode.type === "ObjectExpression") {
              return insertProperty(
                fixer,
                metaNode,
                `docs: {
url: ${urlString}
}`,
                sourceCode
              );
            }
            return null;
          }
        });
      }
    };
  }
};
var require_meta_docs_url_default = rule;
export {
  require_meta_docs_url_default as default
};
