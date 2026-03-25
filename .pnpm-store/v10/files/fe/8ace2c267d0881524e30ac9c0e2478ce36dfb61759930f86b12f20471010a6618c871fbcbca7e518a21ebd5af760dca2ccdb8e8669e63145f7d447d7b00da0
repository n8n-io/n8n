'use strict';

var pair = require('./pair-ab022bc3.cjs');
var map = require('./map-24d263c0.cjs');
var schema = require('./schema.cjs');

/* eslint-env browser */

/* c8 ignore start */
/**
 * @type {Document}
 */
const doc = /** @type {Document} */ (typeof document !== 'undefined' ? document : {});

/**
 * @param {string} name
 * @return {HTMLElement}
 */
const createElement = name => doc.createElement(name);

/**
 * @return {DocumentFragment}
 */
const createDocumentFragment = () => doc.createDocumentFragment();

/**
 * @type {$.Schema<DocumentFragment>}
 */
const $fragment = schema.$custom(el => el.nodeType === DOCUMENT_FRAGMENT_NODE);

/**
 * @param {string} text
 * @return {Text}
 */
const createTextNode = text => doc.createTextNode(text);

const domParser = /** @type {DOMParser} */ (typeof DOMParser !== 'undefined' ? new DOMParser() : null);

/**
 * @param {HTMLElement} el
 * @param {string} name
 * @param {Object} opts
 */
const emitCustomEvent = (el, name, opts) => el.dispatchEvent(new CustomEvent(name, opts));

/**
 * @param {Element} el
 * @param {Array<pair.Pair<string,string|boolean>>} attrs Array of key-value pairs
 * @return {Element}
 */
const setAttributes = (el, attrs) => {
  pair.forEach(attrs, (key, value) => {
    if (value === false) {
      el.removeAttribute(key);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      // @ts-ignore
      el.setAttribute(key, value);
    }
  });
  return el
};

/**
 * @param {Element} el
 * @param {Map<string, string>} attrs Array of key-value pairs
 * @return {Element}
 */
const setAttributesMap = (el, attrs) => {
  attrs.forEach((value, key) => { el.setAttribute(key, value); });
  return el
};

/**
 * @param {Array<Node>|HTMLCollection} children
 * @return {DocumentFragment}
 */
const fragment = children => {
  const fragment = createDocumentFragment();
  for (let i = 0; i < children.length; i++) {
    appendChild(fragment, children[i]);
  }
  return fragment
};

/**
 * @param {Element} parent
 * @param {Array<Node>} nodes
 * @return {Element}
 */
const append = (parent, nodes) => {
  appendChild(parent, fragment(nodes));
  return parent
};

/**
 * @param {HTMLElement} el
 */
const remove = el => el.remove();

/**
 * @param {EventTarget} el
 * @param {string} name
 * @param {EventListener} f
 */
const addEventListener = (el, name, f) => el.addEventListener(name, f);

/**
 * @param {EventTarget} el
 * @param {string} name
 * @param {EventListener} f
 */
const removeEventListener = (el, name, f) => el.removeEventListener(name, f);

/**
 * @param {Node} node
 * @param {Array<pair.Pair<string,EventListener>>} listeners
 * @return {Node}
 */
const addEventListeners = (node, listeners) => {
  pair.forEach(listeners, (name, f) => addEventListener(node, name, f));
  return node
};

/**
 * @param {Node} node
 * @param {Array<pair.Pair<string,EventListener>>} listeners
 * @return {Node}
 */
const removeEventListeners = (node, listeners) => {
  pair.forEach(listeners, (name, f) => removeEventListener(node, name, f));
  return node
};

/**
 * @param {string} name
 * @param {Array<pair.Pair<string,string>|pair.Pair<string,boolean>>} attrs Array of key-value pairs
 * @param {Array<Node>} children
 * @return {Element}
 */
const element = (name, attrs = [], children = []) =>
  append(setAttributes(createElement(name), attrs), children);

/**
 * @type {$.Schema<Element>}
 */
const $element = schema.$custom(el => el.nodeType === ELEMENT_NODE);

/**
 * @param {number} width
 * @param {number} height
 */
const canvas = (width, height) => {
  const c = /** @type {HTMLCanvasElement} */ (createElement('canvas'));
  c.height = height;
  c.width = width;
  return c
};

/**
 * @param {string} t
 * @return {Text}
 */
const text = createTextNode;

/**
 * @type {$.Schema<Text>}
 */
const $text = schema.$custom(el => el.nodeType === TEXT_NODE);

/**
 * @param {pair.Pair<string,string>} pair
 */
const pairToStyleString = pair => `${pair.left}:${pair.right};`;

/**
 * @param {Array<pair.Pair<string,string>>} pairs
 * @return {string}
 */
const pairsToStyleString = pairs => pairs.map(pairToStyleString).join('');

/**
 * @param {Map<string,string>} m
 * @return {string}
 */
const mapToStyleString = m => map.map(m, (value, key) => `${key}:${value};`).join('');

/**
 * @todo should always query on a dom element
 *
 * @param {HTMLElement|ShadowRoot} el
 * @param {string} query
 * @return {HTMLElement | null}
 */
const querySelector = (el, query) => el.querySelector(query);

/**
 * @param {HTMLElement|ShadowRoot} el
 * @param {string} query
 * @return {NodeListOf<HTMLElement>}
 */
const querySelectorAll = (el, query) => el.querySelectorAll(query);

/**
 * @param {string} id
 * @return {HTMLElement}
 */
const getElementById = id => /** @type {HTMLElement} */ (doc.getElementById(id));

/**
 * @param {string} html
 * @return {HTMLElement}
 */
const _parse = html => domParser.parseFromString(`<html><body>${html}</body></html>`, 'text/html').body;

/**
 * @param {string} html
 * @return {DocumentFragment}
 */
const parseFragment = html => fragment(/** @type {any} */ (_parse(html).childNodes));

/**
 * @param {string} html
 * @return {HTMLElement}
 */
const parseElement = html => /** @type HTMLElement */ (_parse(html).firstElementChild);

/**
 * @param {HTMLElement} oldEl
 * @param {HTMLElement|DocumentFragment} newEl
 */
const replaceWith = (oldEl, newEl) => oldEl.replaceWith(newEl);

/**
 * @param {HTMLElement} parent
 * @param {HTMLElement} el
 * @param {Node|null} ref
 * @return {HTMLElement}
 */
const insertBefore = (parent, el, ref) => parent.insertBefore(el, ref);

/**
 * @param {Node} parent
 * @param {Node} child
 * @return {Node}
 */
const appendChild = (parent, child) => parent.appendChild(child);

const ELEMENT_NODE = doc.ELEMENT_NODE;
const TEXT_NODE = doc.TEXT_NODE;
const CDATA_SECTION_NODE = doc.CDATA_SECTION_NODE;
const COMMENT_NODE = doc.COMMENT_NODE;
const DOCUMENT_NODE = doc.DOCUMENT_NODE;
const DOCUMENT_TYPE_NODE = doc.DOCUMENT_TYPE_NODE;
const DOCUMENT_FRAGMENT_NODE = doc.DOCUMENT_FRAGMENT_NODE;

/**
 * @type {$.Schema<Node>}
 */
const $node = schema.$custom(el => el.nodeType === DOCUMENT_NODE);

/**
 * @param {any} node
 * @param {number} type
 */
const checkNodeType = (node, type) => node.nodeType === type;

/**
 * @param {Node} parent
 * @param {HTMLElement} child
 */
const isParentOf = (parent, child) => {
  let p = child.parentNode;
  while (p && p !== parent) {
    p = p.parentNode;
  }
  return p === parent
};
/* c8 ignore stop */

var dom = /*#__PURE__*/Object.freeze({
  __proto__: null,
  doc: doc,
  createElement: createElement,
  createDocumentFragment: createDocumentFragment,
  $fragment: $fragment,
  createTextNode: createTextNode,
  domParser: domParser,
  emitCustomEvent: emitCustomEvent,
  setAttributes: setAttributes,
  setAttributesMap: setAttributesMap,
  fragment: fragment,
  append: append,
  remove: remove,
  addEventListener: addEventListener,
  removeEventListener: removeEventListener,
  addEventListeners: addEventListeners,
  removeEventListeners: removeEventListeners,
  element: element,
  $element: $element,
  canvas: canvas,
  text: text,
  $text: $text,
  pairToStyleString: pairToStyleString,
  pairsToStyleString: pairsToStyleString,
  mapToStyleString: mapToStyleString,
  querySelector: querySelector,
  querySelectorAll: querySelectorAll,
  getElementById: getElementById,
  parseFragment: parseFragment,
  parseElement: parseElement,
  replaceWith: replaceWith,
  insertBefore: insertBefore,
  appendChild: appendChild,
  ELEMENT_NODE: ELEMENT_NODE,
  TEXT_NODE: TEXT_NODE,
  CDATA_SECTION_NODE: CDATA_SECTION_NODE,
  COMMENT_NODE: COMMENT_NODE,
  DOCUMENT_NODE: DOCUMENT_NODE,
  DOCUMENT_TYPE_NODE: DOCUMENT_TYPE_NODE,
  DOCUMENT_FRAGMENT_NODE: DOCUMENT_FRAGMENT_NODE,
  $node: $node,
  checkNodeType: checkNodeType,
  isParentOf: isParentOf
});

exports.$element = $element;
exports.$fragment = $fragment;
exports.$node = $node;
exports.$text = $text;
exports.CDATA_SECTION_NODE = CDATA_SECTION_NODE;
exports.COMMENT_NODE = COMMENT_NODE;
exports.DOCUMENT_FRAGMENT_NODE = DOCUMENT_FRAGMENT_NODE;
exports.DOCUMENT_NODE = DOCUMENT_NODE;
exports.DOCUMENT_TYPE_NODE = DOCUMENT_TYPE_NODE;
exports.ELEMENT_NODE = ELEMENT_NODE;
exports.TEXT_NODE = TEXT_NODE;
exports.addEventListener = addEventListener;
exports.addEventListeners = addEventListeners;
exports.append = append;
exports.appendChild = appendChild;
exports.canvas = canvas;
exports.checkNodeType = checkNodeType;
exports.createDocumentFragment = createDocumentFragment;
exports.createElement = createElement;
exports.createTextNode = createTextNode;
exports.doc = doc;
exports.dom = dom;
exports.domParser = domParser;
exports.element = element;
exports.emitCustomEvent = emitCustomEvent;
exports.fragment = fragment;
exports.getElementById = getElementById;
exports.insertBefore = insertBefore;
exports.isParentOf = isParentOf;
exports.mapToStyleString = mapToStyleString;
exports.pairToStyleString = pairToStyleString;
exports.pairsToStyleString = pairsToStyleString;
exports.parseElement = parseElement;
exports.parseFragment = parseFragment;
exports.querySelector = querySelector;
exports.querySelectorAll = querySelectorAll;
exports.remove = remove;
exports.removeEventListener = removeEventListener;
exports.removeEventListeners = removeEventListeners;
exports.replaceWith = replaceWith;
exports.setAttributes = setAttributes;
exports.setAttributesMap = setAttributesMap;
exports.text = text;
//# sourceMappingURL=dom-7e625b09.cjs.map
