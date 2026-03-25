'use strict';

/**
 * @typedef {import('css-tree').Rule} CsstreeRule
 * @typedef {import('./types').Specificity} Specificity
 * @typedef {import('./types').Stylesheet} Stylesheet
 * @typedef {import('./types').StylesheetRule} StylesheetRule
 * @typedef {import('./types').StylesheetDeclaration} StylesheetDeclaration
 * @typedef {import('./types').ComputedStyles} ComputedStyles
 * @typedef {import('./types').XastRoot} XastRoot
 * @typedef {import('./types').XastElement} XastElement
 * @typedef {import('./types').XastParent} XastParent
 * @typedef {import('./types').XastChild} XastChild
 */

const csstree = require('css-tree');
const csswhat = require('css-what');
const {
  syntax: { specificity },
} = require('csso');
const { visit, matches } = require('./xast.js');
const {
  attrsGroups,
  inheritableAttrs,
  presentationNonInheritableGroupAttrs,
} = require('../plugins/_collections.js');

// @ts-ignore not defined in @types/csstree
const csstreeWalkSkip = csstree.walk.skip;

/**
 * @type {(ruleNode: CsstreeRule, dynamic: boolean) => StylesheetRule[]}
 */
const parseRule = (ruleNode, dynamic) => {
  /**
   * @type {StylesheetDeclaration[]}
   */
  const declarations = [];
  // collect declarations
  ruleNode.block.children.forEach((cssNode) => {
    if (cssNode.type === 'Declaration') {
      declarations.push({
        name: cssNode.property,
        value: csstree.generate(cssNode.value),
        important: cssNode.important === true,
      });
    }
  });

  /** @type {StylesheetRule[]} */
  const rules = [];
  csstree.walk(ruleNode.prelude, (node) => {
    if (node.type === 'Selector') {
      const newNode = csstree.clone(node);
      let hasPseudoClasses = false;
      csstree.walk(newNode, (pseudoClassNode, item, list) => {
        if (pseudoClassNode.type === 'PseudoClassSelector') {
          hasPseudoClasses = true;
          list.remove(item);
        }
      });
      rules.push({
        specificity: specificity(node),
        dynamic: hasPseudoClasses || dynamic,
        // compute specificity from original node to consider pseudo classes
        selector: csstree.generate(newNode),
        declarations,
      });
    }
  });

  return rules;
};

/**
 * @type {(css: string, dynamic: boolean) => StylesheetRule[]}
 */
const parseStylesheet = (css, dynamic) => {
  /** @type {StylesheetRule[]} */
  const rules = [];
  const ast = csstree.parse(css, {
    parseValue: false,
    parseAtrulePrelude: false,
  });
  csstree.walk(ast, (cssNode) => {
    if (cssNode.type === 'Rule') {
      rules.push(...parseRule(cssNode, dynamic || false));
      return csstreeWalkSkip;
    }
    if (cssNode.type === 'Atrule') {
      if (
        cssNode.name === 'keyframes' ||
        cssNode.name === '-webkit-keyframes'
      ) {
        return csstreeWalkSkip;
      }
      csstree.walk(cssNode, (ruleNode) => {
        if (ruleNode.type === 'Rule') {
          rules.push(...parseRule(ruleNode, dynamic || true));
          return csstreeWalkSkip;
        }
      });
      return csstreeWalkSkip;
    }
  });
  return rules;
};

/**
 * @type {(css: string) => StylesheetDeclaration[]}
 */
const parseStyleDeclarations = (css) => {
  /** @type {StylesheetDeclaration[]} */
  const declarations = [];
  const ast = csstree.parse(css, {
    context: 'declarationList',
    parseValue: false,
  });
  csstree.walk(ast, (cssNode) => {
    if (cssNode.type === 'Declaration') {
      declarations.push({
        name: cssNode.property,
        value: csstree.generate(cssNode.value),
        important: cssNode.important === true,
      });
    }
  });
  return declarations;
};

/**
 * @param {Stylesheet} stylesheet
 * @param {XastElement} node
 * @returns {ComputedStyles}
 */
const computeOwnStyle = (stylesheet, node) => {
  /** @type {ComputedStyles} */
  const computedStyle = {};
  const importantStyles = new Map();

  // collect attributes
  for (const [name, value] of Object.entries(node.attributes)) {
    if (attrsGroups.presentation.has(name)) {
      computedStyle[name] = { type: 'static', inherited: false, value };
      importantStyles.set(name, false);
    }
  }

  // collect matching rules
  for (const { selector, declarations, dynamic } of stylesheet.rules) {
    if (matches(node, selector)) {
      for (const { name, value, important } of declarations) {
        const computed = computedStyle[name];
        if (computed && computed.type === 'dynamic') {
          continue;
        }
        if (dynamic) {
          computedStyle[name] = { type: 'dynamic', inherited: false };
          continue;
        }
        if (
          computed == null ||
          important === true ||
          importantStyles.get(name) === false
        ) {
          computedStyle[name] = { type: 'static', inherited: false, value };
          importantStyles.set(name, important);
        }
      }
    }
  }

  // collect inline styles
  const styleDeclarations =
    node.attributes.style == null
      ? []
      : parseStyleDeclarations(node.attributes.style);
  for (const { name, value, important } of styleDeclarations) {
    const computed = computedStyle[name];
    if (computed && computed.type === 'dynamic') {
      continue;
    }
    if (
      computed == null ||
      important === true ||
      importantStyles.get(name) === false
    ) {
      computedStyle[name] = { type: 'static', inherited: false, value };
      importantStyles.set(name, important);
    }
  }

  return computedStyle;
};

/**
 * Compares selector specificities.
 * Derived from https://github.com/keeganstreet/specificity/blob/8757133ddd2ed0163f120900047ff0f92760b536/specificity.js#L207
 *
 * @param {Specificity} a
 * @param {Specificity} b
 * @returns {number}
 */
const compareSpecificity = (a, b) => {
  for (let i = 0; i < 4; i += 1) {
    if (a[i] < b[i]) {
      return -1;
    } else if (a[i] > b[i]) {
      return 1;
    }
  }

  return 0;
};
exports.compareSpecificity = compareSpecificity;

/**
 * @type {(root: XastRoot) => Stylesheet}
 */
const collectStylesheet = (root) => {
  /** @type {StylesheetRule[]} */
  const rules = [];
  /** @type {Map<XastElement, XastParent>} */
  const parents = new Map();

  visit(root, {
    element: {
      enter: (node, parentNode) => {
        parents.set(node, parentNode);

        if (node.name !== 'style') {
          return;
        }

        if (
          node.attributes.type == null ||
          node.attributes.type === '' ||
          node.attributes.type === 'text/css'
        ) {
          const dynamic =
            node.attributes.media != null && node.attributes.media !== 'all';

          for (const child of node.children) {
            if (child.type === 'text' || child.type === 'cdata') {
              rules.push(...parseStylesheet(child.value, dynamic));
            }
          }
        }
      },
    },
  });
  // sort by selectors specificity
  rules.sort((a, b) => compareSpecificity(a.specificity, b.specificity));
  return { rules, parents };
};
exports.collectStylesheet = collectStylesheet;

/**
 * @param {Stylesheet} stylesheet
 * @param {XastElement} node
 * @returns {ComputedStyles}
 */
const computeStyle = (stylesheet, node) => {
  const { parents } = stylesheet;
  const computedStyles = computeOwnStyle(stylesheet, node);
  let parent = parents.get(node);
  while (parent != null && parent.type !== 'root') {
    const inheritedStyles = computeOwnStyle(stylesheet, parent);
    for (const [name, computed] of Object.entries(inheritedStyles)) {
      if (
        computedStyles[name] == null &&
        inheritableAttrs.has(name) &&
        !presentationNonInheritableGroupAttrs.has(name)
      ) {
        computedStyles[name] = { ...computed, inherited: true };
      }
    }
    parent = parents.get(parent);
  }
  return computedStyles;
};
exports.computeStyle = computeStyle;

/**
 * Determines if the CSS selector includes or traverses the given attribute.
 *
 * Classes and IDs are generated as attribute selectors, so you can check for
 * if a `.class` or `#id` is included by passing `name=class` or `name=id`
 * respectively.
 *
 * @param {csstree.ListItem<csstree.CssNode>|string} selector
 * @param {string} name
 * @param {?string} value
 * @param {boolean} traversed
 * @returns {boolean}
 */
const includesAttrSelector = (
  selector,
  name,
  value = null,
  traversed = false,
) => {
  const selectors =
    typeof selector === 'string'
      ? csswhat.parse(selector)
      : csswhat.parse(csstree.generate(selector.data));

  for (const subselector of selectors) {
    const hasAttrSelector = subselector.some((segment, index) => {
      if (traversed) {
        if (index === subselector.length - 1) {
          return false;
        }

        const isNextTraversal = csswhat.isTraversal(subselector[index + 1]);

        if (!isNextTraversal) {
          return false;
        }
      }

      if (segment.type !== 'attribute' || segment.name !== name) {
        return false;
      }

      return value == null ? true : segment.value === value;
    });

    if (hasAttrSelector) {
      return true;
    }
  }

  return false;
};
exports.includesAttrSelector = includesAttrSelector;
