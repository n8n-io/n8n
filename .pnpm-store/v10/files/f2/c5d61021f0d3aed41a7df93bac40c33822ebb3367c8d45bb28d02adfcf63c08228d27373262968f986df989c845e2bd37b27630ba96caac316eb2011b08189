/* eslint-env browser */

/**
 * Utility module to work with the DOM.
 *
 * @module dom
 */

import * as pair from './pair.js'
import * as map from './map.js'
import * as $ from './schema.js'

/* c8 ignore start */
/**
 * @type {Document}
 */
export const doc = /** @type {Document} */ (typeof document !== 'undefined' ? document : {})

/**
 * @param {string} name
 * @return {HTMLElement}
 */
export const createElement = name => doc.createElement(name)

/**
 * @return {DocumentFragment}
 */
export const createDocumentFragment = () => doc.createDocumentFragment()

/**
 * @type {$.Schema<DocumentFragment>}
 */
export const $fragment = $.$custom(el => el.nodeType === DOCUMENT_FRAGMENT_NODE)

/**
 * @param {string} text
 * @return {Text}
 */
export const createTextNode = text => doc.createTextNode(text)

export const domParser = /** @type {DOMParser} */ (typeof DOMParser !== 'undefined' ? new DOMParser() : null)

/**
 * @param {HTMLElement} el
 * @param {string} name
 * @param {Object} opts
 */
export const emitCustomEvent = (el, name, opts) => el.dispatchEvent(new CustomEvent(name, opts))

/**
 * @param {Element} el
 * @param {Array<pair.Pair<string,string|boolean>>} attrs Array of key-value pairs
 * @return {Element}
 */
export const setAttributes = (el, attrs) => {
  pair.forEach(attrs, (key, value) => {
    if (value === false) {
      el.removeAttribute(key)
    } else if (value === true) {
      el.setAttribute(key, '')
    } else {
      // @ts-ignore
      el.setAttribute(key, value)
    }
  })
  return el
}

/**
 * @param {Element} el
 * @param {Map<string, string>} attrs Array of key-value pairs
 * @return {Element}
 */
export const setAttributesMap = (el, attrs) => {
  attrs.forEach((value, key) => { el.setAttribute(key, value) })
  return el
}

/**
 * @param {Array<Node>|HTMLCollection} children
 * @return {DocumentFragment}
 */
export const fragment = children => {
  const fragment = createDocumentFragment()
  for (let i = 0; i < children.length; i++) {
    appendChild(fragment, children[i])
  }
  return fragment
}

/**
 * @param {Element} parent
 * @param {Array<Node>} nodes
 * @return {Element}
 */
export const append = (parent, nodes) => {
  appendChild(parent, fragment(nodes))
  return parent
}

/**
 * @param {HTMLElement} el
 */
export const remove = el => el.remove()

/**
 * @param {EventTarget} el
 * @param {string} name
 * @param {EventListener} f
 */
export const addEventListener = (el, name, f) => el.addEventListener(name, f)

/**
 * @param {EventTarget} el
 * @param {string} name
 * @param {EventListener} f
 */
export const removeEventListener = (el, name, f) => el.removeEventListener(name, f)

/**
 * @param {Node} node
 * @param {Array<pair.Pair<string,EventListener>>} listeners
 * @return {Node}
 */
export const addEventListeners = (node, listeners) => {
  pair.forEach(listeners, (name, f) => addEventListener(node, name, f))
  return node
}

/**
 * @param {Node} node
 * @param {Array<pair.Pair<string,EventListener>>} listeners
 * @return {Node}
 */
export const removeEventListeners = (node, listeners) => {
  pair.forEach(listeners, (name, f) => removeEventListener(node, name, f))
  return node
}

/**
 * @param {string} name
 * @param {Array<pair.Pair<string,string>|pair.Pair<string,boolean>>} attrs Array of key-value pairs
 * @param {Array<Node>} children
 * @return {Element}
 */
export const element = (name, attrs = [], children = []) =>
  append(setAttributes(createElement(name), attrs), children)

/**
 * @type {$.Schema<Element>}
 */
export const $element = $.$custom(el => el.nodeType === ELEMENT_NODE)

/**
 * @param {number} width
 * @param {number} height
 */
export const canvas = (width, height) => {
  const c = /** @type {HTMLCanvasElement} */ (createElement('canvas'))
  c.height = height
  c.width = width
  return c
}

/**
 * @param {string} t
 * @return {Text}
 */
export const text = createTextNode

/**
 * @type {$.Schema<Text>}
 */
export const $text = $.$custom(el => el.nodeType === TEXT_NODE)

/**
 * @param {pair.Pair<string,string>} pair
 */
export const pairToStyleString = pair => `${pair.left}:${pair.right};`

/**
 * @param {Array<pair.Pair<string,string>>} pairs
 * @return {string}
 */
export const pairsToStyleString = pairs => pairs.map(pairToStyleString).join('')

/**
 * @param {Map<string,string>} m
 * @return {string}
 */
export const mapToStyleString = m => map.map(m, (value, key) => `${key}:${value};`).join('')

/**
 * @todo should always query on a dom element
 *
 * @param {HTMLElement|ShadowRoot} el
 * @param {string} query
 * @return {HTMLElement | null}
 */
export const querySelector = (el, query) => el.querySelector(query)

/**
 * @param {HTMLElement|ShadowRoot} el
 * @param {string} query
 * @return {NodeListOf<HTMLElement>}
 */
export const querySelectorAll = (el, query) => el.querySelectorAll(query)

/**
 * @param {string} id
 * @return {HTMLElement}
 */
export const getElementById = id => /** @type {HTMLElement} */ (doc.getElementById(id))

/**
 * @param {string} html
 * @return {HTMLElement}
 */
const _parse = html => domParser.parseFromString(`<html><body>${html}</body></html>`, 'text/html').body

/**
 * @param {string} html
 * @return {DocumentFragment}
 */
export const parseFragment = html => fragment(/** @type {any} */ (_parse(html).childNodes))

/**
 * @param {string} html
 * @return {HTMLElement}
 */
export const parseElement = html => /** @type HTMLElement */ (_parse(html).firstElementChild)

/**
 * @param {HTMLElement} oldEl
 * @param {HTMLElement|DocumentFragment} newEl
 */
export const replaceWith = (oldEl, newEl) => oldEl.replaceWith(newEl)

/**
 * @param {HTMLElement} parent
 * @param {HTMLElement} el
 * @param {Node|null} ref
 * @return {HTMLElement}
 */
export const insertBefore = (parent, el, ref) => parent.insertBefore(el, ref)

/**
 * @param {Node} parent
 * @param {Node} child
 * @return {Node}
 */
export const appendChild = (parent, child) => parent.appendChild(child)

export const ELEMENT_NODE = doc.ELEMENT_NODE
export const TEXT_NODE = doc.TEXT_NODE
export const CDATA_SECTION_NODE = doc.CDATA_SECTION_NODE
export const COMMENT_NODE = doc.COMMENT_NODE
export const DOCUMENT_NODE = doc.DOCUMENT_NODE
export const DOCUMENT_TYPE_NODE = doc.DOCUMENT_TYPE_NODE
export const DOCUMENT_FRAGMENT_NODE = doc.DOCUMENT_FRAGMENT_NODE

/**
 * @type {$.Schema<Node>}
 */
export const $node = $.$custom(el => el.nodeType === DOCUMENT_NODE)

/**
 * @param {any} node
 * @param {number} type
 */
export const checkNodeType = (node, type) => node.nodeType === type

/**
 * @param {Node} parent
 * @param {HTMLElement} child
 */
export const isParentOf = (parent, child) => {
  let p = child.parentNode
  while (p && p !== parent) {
    p = p.parentNode
  }
  return p === parent
}
/* c8 ignore stop */
