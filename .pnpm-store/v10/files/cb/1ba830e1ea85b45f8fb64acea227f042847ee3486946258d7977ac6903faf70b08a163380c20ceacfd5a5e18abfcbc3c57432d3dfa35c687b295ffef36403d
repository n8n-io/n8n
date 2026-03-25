import { c as createRule, r as isDOMComponent, w as getPropName, i as isSingleLine } from '../utils.js';
import '@typescript-eslint/types';
import '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

function isCallbackPropName(name) {
  return /^on[A-Z]/.test(name);
}
const messages = {
  listIsEmpty: "A customized reserved first list must not be empty",
  listReservedPropsFirst: "Reserved props must be listed before all other props",
  listReservedPropsLast: "Reserved props must be listed after all other props",
  listCallbacksLast: "Callbacks must be listed after all other props",
  listShorthandFirst: "Shorthand props must be listed before all other props",
  listShorthandLast: "Shorthand props must be listed after all other props",
  listMultilineFirst: "Multiline props must be listed before all other props",
  listMultilineLast: "Multiline props must be listed after all other props",
  sortPropsByAlpha: "Props should be sorted alphabetically"
};
const RESERVED_PROPS_LIST = [
  "children",
  "dangerouslySetInnerHTML",
  "key",
  "ref"
];
function getReservedPropIndex(name, list) {
  return list.indexOf(name.split(":")[0]);
}
let attributeMap;
function shouldSortToEnd(node) {
  const attr = attributeMap.get(node);
  return !!attr && !!attr.hasComment;
}
function contextCompare(a, b, options) {
  let aProp = getPropName(a);
  let bProp = getPropName(b);
  const aPropNamespace = aProp.split(":")[0];
  const bPropNamespace = bProp.split(":")[0];
  const aSortToEnd = shouldSortToEnd(a);
  const bSortToEnd = shouldSortToEnd(b);
  if (aSortToEnd && !bSortToEnd)
    return 1;
  if (!aSortToEnd && bSortToEnd)
    return -1;
  if (options.reservedFirst) {
    const aIndex = getReservedPropIndex(aProp, options.reservedList);
    const bIndex = getReservedPropIndex(bProp, options.reservedList);
    if (aIndex > -1 && bIndex === -1)
      return -1;
    if (aIndex === -1 && bIndex > -1)
      return 1;
    if (aIndex > -1 && bIndex > -1 && aPropNamespace !== bPropNamespace)
      return aIndex > bIndex ? 1 : -1;
  }
  if (options.reservedLast.length > 0) {
    const aLastIndex = getReservedPropIndex(aProp, options.reservedLast);
    const bLastIndex = getReservedPropIndex(bProp, options.reservedLast);
    if (aLastIndex > -1 && bLastIndex === -1)
      return 1;
    if (aLastIndex === -1 && bLastIndex > -1)
      return -1;
    if (aLastIndex > -1 && bLastIndex > -1 && aPropNamespace !== bPropNamespace)
      return aLastIndex > bLastIndex ? -1 : 1;
  }
  if (options.callbacksLast) {
    const aIsCallback = isCallbackPropName(aProp);
    const bIsCallback = isCallbackPropName(bProp);
    if (aIsCallback && !bIsCallback)
      return 1;
    if (!aIsCallback && bIsCallback)
      return -1;
  }
  if (options.shorthandFirst || options.shorthandLast) {
    const shorthandSign = options.shorthandFirst ? -1 : 1;
    if (!a.value && b.value)
      return shorthandSign;
    if (a.value && !b.value)
      return -shorthandSign;
  }
  if (options.multiline !== "ignore") {
    const multilineSign = options.multiline === "first" ? -1 : 1;
    const aIsMultiline = !isSingleLine(a);
    const bIsMultiline = !isSingleLine(b);
    if (aIsMultiline && !bIsMultiline)
      return multilineSign;
    if (!aIsMultiline && bIsMultiline)
      return -multilineSign;
  }
  if (options.noSortAlphabetically)
    return 0;
  const actualLocale = options.locale === "auto" ? void 0 : options.locale;
  if (options.ignoreCase) {
    aProp = aProp.toLowerCase();
    bProp = bProp.toLowerCase();
    return aProp.localeCompare(bProp, actualLocale);
  }
  if (aProp === bProp)
    return 0;
  if (options.locale === "auto")
    return aProp < bProp ? -1 : 1;
  return aProp.localeCompare(bProp, actualLocale);
}
function getGroupsOfSortableAttributes(attributes, context) {
  const sourceCode = context.sourceCode;
  const sortableAttributeGroups = [];
  let groupCount = 0;
  function addtoSortableAttributeGroups(attribute) {
    sortableAttributeGroups[groupCount - 1].push(attribute);
  }
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    const nextAttribute = attributes[i + 1];
    const attributeline = attribute.loc.start.line;
    let comment = [];
    try {
      comment = sourceCode.getCommentsAfter(attribute);
    } catch {
    }
    const lastAttr = attributes[i - 1];
    const attrIsSpread = attribute.type === "JSXSpreadAttribute";
    if (!lastAttr || lastAttr.type === "JSXSpreadAttribute" && !attrIsSpread) {
      groupCount += 1;
      sortableAttributeGroups[groupCount - 1] = [];
    }
    if (!attrIsSpread) {
      if (comment.length === 0) {
        attributeMap.set(attribute, { end: attribute.range[1], hasComment: false });
        addtoSortableAttributeGroups(attribute);
      } else {
        const firstComment = comment[0];
        const commentline = firstComment.loc.start.line;
        if (comment.length === 1) {
          if (attributeline + 1 === commentline && nextAttribute) {
            attributeMap.set(attribute, { end: nextAttribute.range[1], hasComment: true });
            addtoSortableAttributeGroups(attribute);
            i += 1;
          } else if (attributeline === commentline) {
            if (firstComment.type === "Block" && nextAttribute) {
              attributeMap.set(attribute, { end: nextAttribute.range[1], hasComment: true });
              i += 1;
            } else if (firstComment.type === "Block") {
              attributeMap.set(attribute, { end: firstComment.range[1], hasComment: true });
            } else {
              attributeMap.set(attribute, { end: firstComment.range[1], hasComment: false });
            }
            addtoSortableAttributeGroups(attribute);
          }
        } else if (comment.length > 1 && attributeline + 1 === comment[1].loc.start.line && nextAttribute) {
          const commentNextAttribute = sourceCode.getCommentsAfter(nextAttribute);
          attributeMap.set(attribute, { end: nextAttribute.range[1], hasComment: true });
          if (commentNextAttribute.length === 1 && nextAttribute.loc.start.line === commentNextAttribute[0].loc.start.line) {
            attributeMap.set(attribute, { end: commentNextAttribute[0].range[1], hasComment: true });
          }
          addtoSortableAttributeGroups(attribute);
          i += 1;
        }
      }
    }
  }
  return sortableAttributeGroups;
}
function generateFixerFunction(node, context, reservedList) {
  const sourceCode = context.sourceCode;
  const attributes = node.attributes.slice(0);
  const configuration = context.options[0] || {};
  const ignoreCase = configuration.ignoreCase || false;
  const callbacksLast = configuration.callbacksLast || false;
  const shorthandFirst = configuration.shorthandFirst || false;
  const shorthandLast = configuration.shorthandLast || false;
  const multiline = configuration.multiline || "ignore";
  const noSortAlphabetically = configuration.noSortAlphabetically || false;
  const reservedFirst = configuration.reservedFirst || false;
  const reservedLast = configuration.reservedLast || [];
  const locale = configuration.locale || "auto";
  const options = {
    ignoreCase,
    callbacksLast,
    shorthandFirst,
    shorthandLast,
    multiline,
    noSortAlphabetically,
    reservedFirst,
    reservedList,
    reservedLast,
    locale
  };
  const sortableAttributeGroups = getGroupsOfSortableAttributes(attributes, context);
  const sortedAttributeGroups = sortableAttributeGroups.slice(0).map((group) => [...group].sort((a, b) => contextCompare(a, b, options)));
  return function fixFunction(fixer) {
    const fixers = [];
    let source = sourceCode.getText();
    sortableAttributeGroups.forEach((sortableGroup, ii) => {
      sortableGroup.forEach((attr, jj) => {
        const sortedAttr = sortedAttributeGroups[ii][jj];
        const sortedAttrText = source.slice(sortedAttr.range[0], attributeMap.get(sortedAttr).end);
        fixers.push({
          range: [attr.range[0], attributeMap.get(attr).end],
          text: sortedAttrText
        });
      });
    });
    fixers.sort((a, b) => b.range[0] - a.range[0]);
    const firstFixer = fixers[0];
    const lastFixer = fixers[fixers.length - 1];
    const rangeStart = lastFixer ? lastFixer.range[0] : 0;
    const rangeEnd = firstFixer ? firstFixer.range[1] : -0;
    fixers.forEach((fix) => {
      source = `${source.slice(0, fix.range[0])}${fix.text}${source.slice(fix.range[1])}`;
    });
    return fixer.replaceTextRange([rangeStart, rangeEnd], source.slice(rangeStart, rangeEnd));
  };
}
function validateReservedFirstConfig(context, reservedFirst) {
  if (reservedFirst) {
    if (Array.isArray(reservedFirst)) {
      if (reservedFirst.length === 0) {
        return function Report(decl) {
          context.report({
            node: decl,
            messageId: "listIsEmpty"
          });
        };
      }
    }
  }
}
const reportedNodeAttributes = /* @__PURE__ */ new WeakMap();
function reportNodeAttribute(nodeAttribute, errorType, node, context, reservedList) {
  const errors = reportedNodeAttributes.get(nodeAttribute) || [];
  if (errors.includes(errorType))
    return;
  errors.push(errorType);
  reportedNodeAttributes.set(nodeAttribute, errors);
  context.report({
    node: nodeAttribute.name ?? "",
    messageId: errorType,
    fix: generateFixerFunction(node, context, reservedList)
  });
}
var jsxSortProps = createRule({
  name: "jsx-sort-props",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce props alphabetical sorting"
    },
    fixable: "code",
    messages,
    schema: [{
      type: "object",
      properties: {
        // Whether callbacks (prefixed with "on") should be listed at the very end,
        // after all other props. Supersedes shorthandLast.
        callbacksLast: {
          type: "boolean"
        },
        // Whether shorthand properties (without a value) should be listed first
        shorthandFirst: {
          type: "boolean"
        },
        // Whether shorthand properties (without a value) should be listed last
        shorthandLast: {
          type: "boolean"
        },
        // Whether multiline properties should be listed first or last
        multiline: {
          type: "string",
          enum: ["ignore", "first", "last"],
          default: "ignore"
        },
        ignoreCase: {
          type: "boolean"
        },
        // Whether alphabetical sorting should be enforced
        noSortAlphabetically: {
          type: "boolean"
        },
        reservedFirst: {
          oneOf: [
            {
              type: "array",
              items: {
                type: "string"
              }
            },
            {
              type: "boolean"
            }
          ]
        },
        reservedLast: {
          type: "array",
          items: {
            type: "string"
          }
        },
        locale: {
          type: "string",
          default: "auto"
        }
      },
      additionalProperties: false
    }]
  },
  create(context) {
    const configuration = context.options[0] || {};
    const ignoreCase = configuration.ignoreCase || false;
    const callbacksLast = configuration.callbacksLast || false;
    const shorthandFirst = configuration.shorthandFirst || false;
    const shorthandLast = configuration.shorthandLast || false;
    const multiline = configuration.multiline || "ignore";
    const noSortAlphabetically = configuration.noSortAlphabetically || false;
    const reservedFirst = configuration.reservedFirst || false;
    const reservedFirstError = validateReservedFirstConfig(context, reservedFirst);
    const reservedList = Array.isArray(reservedFirst) ? reservedFirst : RESERVED_PROPS_LIST;
    const reservedLastList = configuration.reservedLast || [];
    const locale = configuration.locale || "auto";
    return {
      Program() {
        attributeMap = /* @__PURE__ */ new WeakMap();
      },
      JSXOpeningElement(node) {
        const nodeReservedList = reservedFirst && !isDOMComponent(node) ? reservedList.filter((prop) => prop !== "dangerouslySetInnerHTML") : reservedList;
        node.attributes.reduce((memo, decl, idx, attrs) => {
          if (decl.type === "JSXSpreadAttribute")
            return attrs[idx + 1];
          let previousPropName = getPropName(memo);
          let currentPropName = getPropName(decl);
          const previousReservedNamespace = previousPropName.split(":")[0];
          const currentReservedNamespace = currentPropName.split(":")[0];
          const previousValue = memo.value;
          const currentValue = decl.value;
          const previousIsCallback = isCallbackPropName(previousPropName);
          const currentIsCallback = isCallbackPropName(currentPropName);
          if (ignoreCase) {
            previousPropName = previousPropName.toLowerCase();
            currentPropName = currentPropName.toLowerCase();
          }
          if (reservedFirst) {
            if (reservedFirstError) {
              reservedFirstError(decl);
              return memo;
            }
            const previousReservedIndex = getReservedPropIndex(previousPropName, nodeReservedList);
            const currentReservedIndex = getReservedPropIndex(currentPropName, nodeReservedList);
            if (previousReservedIndex > -1 && currentReservedIndex === -1)
              return decl;
            if (reservedFirst !== true && previousReservedIndex > currentReservedIndex || previousReservedIndex === -1 && currentReservedIndex > -1) {
              reportNodeAttribute(decl, "listReservedPropsFirst", node, context, nodeReservedList);
              return memo;
            }
            if (previousReservedIndex > -1 && currentReservedIndex > -1 && currentReservedIndex > previousReservedIndex && previousReservedNamespace !== currentReservedNamespace) {
              return decl;
            }
          }
          if (reservedLastList.length > 0) {
            const previousReservedIndex = getReservedPropIndex(previousPropName, reservedLastList);
            const currentReservedIndex = getReservedPropIndex(currentPropName, reservedLastList);
            if (previousReservedIndex === -1 && currentReservedIndex > -1)
              return decl;
            if (previousReservedIndex < currentReservedIndex || previousReservedIndex > -1 && currentReservedIndex === -1) {
              reportNodeAttribute(decl, "listReservedPropsLast", node, context, nodeReservedList);
              return memo;
            }
            if (previousReservedIndex > -1 && currentReservedIndex > -1 && currentReservedIndex > previousReservedIndex && previousReservedNamespace !== currentReservedNamespace) {
              return decl;
            }
          }
          if (callbacksLast) {
            if (!previousIsCallback && currentIsCallback) {
              return decl;
            }
            if (previousIsCallback && !currentIsCallback) {
              reportNodeAttribute(memo, "listCallbacksLast", node, context, nodeReservedList);
              return memo;
            }
          }
          if (shorthandFirst) {
            if (currentValue && !previousValue)
              return decl;
            if (!currentValue && previousValue) {
              reportNodeAttribute(decl, "listShorthandFirst", node, context, nodeReservedList);
              return memo;
            }
          }
          if (shorthandLast) {
            if (!currentValue && previousValue)
              return decl;
            if (currentValue && !previousValue) {
              reportNodeAttribute(memo, "listShorthandLast", node, context, nodeReservedList);
              return memo;
            }
          }
          const previousIsMultiline = !isSingleLine(memo);
          const currentIsMultiline = !isSingleLine(decl);
          if (multiline === "first") {
            if (previousIsMultiline && !currentIsMultiline) {
              return decl;
            }
            if (!previousIsMultiline && currentIsMultiline) {
              reportNodeAttribute(decl, "listMultilineFirst", node, context, nodeReservedList);
              return memo;
            }
          } else if (multiline === "last") {
            if (!previousIsMultiline && currentIsMultiline) {
              return decl;
            }
            if (previousIsMultiline && !currentIsMultiline) {
              reportNodeAttribute(memo, "listMultilineLast", node, context, nodeReservedList);
              return memo;
            }
          }
          if (!noSortAlphabetically && (ignoreCase || locale !== "auto" ? previousPropName.localeCompare(currentPropName, locale === "auto" ? void 0 : locale) > 0 : previousPropName > currentPropName)) {
            reportNodeAttribute(decl, "sortPropsByAlpha", node, context, nodeReservedList);
            return memo;
          }
          return decl;
        }, node.attributes[0]);
      }
    };
  }
});

export { jsxSortProps as default };
