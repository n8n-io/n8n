/* eslint-env browser */

/**
 * Web components.
 *
 * @module component
 */

import * as dom from './dom.js'
import * as diff from './diff.js'
import * as object from './object.js'
import * as json from './json.js'
import * as string from './string.js'
import * as array from './array.js'
import * as number from './number.js'
import * as func from './function.js'

/**
 * @type {CustomElementRegistry}
 */
export const registry = customElements

/**
 * @param {string} name
 * @param {any} constr
 * @param {ElementDefinitionOptions} [opts]
 */
export const define = (name, constr, opts) => registry.define(name, constr, opts)

/**
 * @param {string} name
 * @return {Promise<CustomElementConstructor>}
 */
export const whenDefined = name => registry.whenDefined(name)

const upgradedEventName = 'upgraded'
const connectedEventName = 'connected'
const disconnectedEventName = 'disconnected'

/**
 * @template S
 */
export class Lib0Component extends HTMLElement {
  /**
   * @param {S} [state]
   */
  constructor (state) {
    super()
    /**
     * @type {S|null}
     */
    this.state = /** @type {any} */ (state)
    /**
     * @type {any}
     */
    this._internal = {}
  }

  /**
   * @param {S} _state
   * @param {boolean} [_forceStateUpdate] Force that the state is rerendered even if state didn't change
   */
  setState (_state, _forceStateUpdate = true) {}

  /**
    * @param {any} _stateUpdate
    */
  updateState (_stateUpdate) { }
}

/**
 * @param {any} val
 * @param {"json"|"string"|"number"} type
 * @return {string}
 */
const encodeAttrVal = (val, type) => {
  if (type === 'json') {
    val = json.stringify(val)
  }
  return val + ''
}

/**
 * @param {any} val
 * @param {"json"|"string"|"number"|"bool"} type
 * @return {any}
 */
const parseAttrVal = (val, type) => {
  switch (type) {
    case 'json':
      return json.parse(val)
    case 'number':
      return Number.parseFloat(val)
    case 'string':
      return val
    case 'bool':
      return val != null
    default:
      return null
  }
}

/**
 * @template S
 * @typedef {Object} CONF
 * @property {string?} [CONF.template] Template for the shadow dom.
 * @property {string} [CONF.style] shadow dom style. Is only used when
 * `CONF.template` is defined
 * @property {S} [CONF.state] Initial component state.
 * @property {function(S,S|null,Lib0Component<S>):void} [CONF.onStateChange] Called when
 * the state changes.
 * @property {Object<string,function(any, any):Object>} [CONF.childStates] maps from
 * CSS-selector to transformer function. The first element that matches the
 * CSS-selector receives state updates via the transformer function.
 * @property {Object<string,"json"|"number"|"string"|"bool">} [CONF.attrs]
 * attrs-keys and state-keys should be camelCase, but the DOM uses kebap-case. I.e.
 * `attrs = { myAttr: 4 }` is represeted as `<my-elem my-attr="4" />` in the DOM
 * @property {Object<string, function(CustomEvent, Lib0Component<any>):boolean|void>} [CONF.listeners] Maps from dom-event-name
 * to event listener.
 * @property {function(S, S, Lib0Component<S>):Object<string,string>} [CONF.slots] Fill slots
 * automatically when state changes. Maps from slot-name to slot-html.
 */

/**
 * @template T
 * @param {string} name
 * @param {CONF<T>} cnf
 * @return {typeof Lib0Component}
 */
export const createComponent = (name, { template, style = '', state: defaultState, onStateChange = () => {}, childStates = { }, attrs = {}, listeners = {}, slots = () => ({}) }) => {
  /**
   * Maps from camelCase attribute name to kebap-case attribute name.
   * @type {Object<string,string>}
   */
  const normalizedAttrs = {}
  for (const key in attrs) {
    normalizedAttrs[string.fromCamelCase(key, '-')] = key
  }
  const templateElement = template
    ? /** @type {HTMLTemplateElement} */ (dom.parseElement(`
      <template>
        <style>${style}</style>
        ${template}
      </template>
      `))
    : null

  class _Lib0Component extends HTMLElement {
    /**
     * @param {T} [state]
     */
    constructor (state) {
      super()
      /**
       * @type {Array<{d:Lib0Component<T>, s:function(any, any):Object}>}
       */
      this._childStates = []
      /**
       * @type {Object<string,string>}
       */
      this._slots = {}
      this._init = false
      /**
       * @type {any}
       */
      this._internal = {}
      /**
       * @type {any}
       */
      this.state = state || null
      this.connected = false
      // init shadow dom
      if (templateElement) {
        const shadow = /** @type {ShadowRoot} */ (this.attachShadow({ mode: 'open' }))
        shadow.appendChild(templateElement.content.cloneNode(true))
        // fill child states
        for (const key in childStates) {
          this._childStates.push({
            d: /** @type {Lib0Component<T>} */ (dom.querySelector(/** @type {any} */ (shadow), key)),
            s: childStates[key]
          })
        }
      }
      dom.emitCustomEvent(this, upgradedEventName, { bubbles: true })
    }

    connectedCallback () {
      this.connected = true
      if (!this._init) {
        this._init = true
        const shadow = this.shadowRoot
        if (shadow) {
          dom.addEventListener(shadow, upgradedEventName, event => {
            this.setState(this.state, true)
            event.stopPropagation()
          })
        }
        /**
         * @type {Object<string, any>}
         */
        const startState = this.state || object.assign({}, defaultState)
        if (attrs) {
          for (const key in attrs) {
            const normalizedKey = string.fromCamelCase(key, '-')
            const val = parseAttrVal(this.getAttribute(normalizedKey), attrs[key])
            if (val) {
              startState[key] = val
            }
          }
        }
        // add event listeners
        for (const key in listeners) {
          dom.addEventListener(shadow || this, key, event => {
            if (listeners[key](/** @type {CustomEvent} */ (event), this) !== false) {
              event.stopPropagation()
              event.preventDefault()
              return false
            }
          })
        }
        // first setState call
        this.state = null
        this.setState(startState)
      }
      dom.emitCustomEvent(/** @type {any} */ (this.shadowRoot || this), connectedEventName, { bubbles: true })
    }

    disconnectedCallback () {
      this.connected = false
      dom.emitCustomEvent(/** @type {any} */ (this.shadowRoot || this), disconnectedEventName, { bubbles: true })
      this.setState(null)
    }

    static get observedAttributes () {
      return object.keys(normalizedAttrs)
    }

    /**
     * @param {string} name
     * @param {string} oldVal
     * @param {string} newVal
     *
     * @private
     */
    attributeChangedCallback (name, oldVal, newVal) {
      const curState = /** @type {any} */ (this.state)
      const camelAttrName = normalizedAttrs[name]
      const type = attrs[camelAttrName]
      const parsedVal = parseAttrVal(newVal, type)
      if (curState && (type !== 'json' || json.stringify(curState[camelAttrName]) !== newVal) && curState[camelAttrName] !== parsedVal && !number.isNaN(parsedVal)) {
        this.updateState({ [camelAttrName]: parsedVal })
      }
    }

    /**
     * @param {any} stateUpdate
     */
    updateState (stateUpdate) {
      this.setState(object.assign({}, this.state, stateUpdate))
    }

    /**
     * @param {any} state
     */
    setState (state, forceStateUpdates = false) {
      const prevState = this.state
      this.state = state
      if (this._init && (!func.equalityFlat(state, prevState) || forceStateUpdates)) {
        // fill slots
        if (state) {
          const slotElems = slots(state, prevState, this)
          for (const key in slotElems) {
            const slotContent = slotElems[key]
            if (this._slots[key] !== slotContent) {
              this._slots[key] = slotContent
              const currentSlots = /** @type {Array<any>} */ (key !== 'default' ? array.from(dom.querySelectorAll(this, `[slot="${key}"]`)) : array.from(this.childNodes).filter(/** @param {any} child */ child => !dom.checkNodeType(child, dom.ELEMENT_NODE) || !child.hasAttribute('slot')))
              currentSlots.slice(1).map(dom.remove)
              const nextSlot = dom.parseFragment(slotContent)
              if (key !== 'default') {
                array.from(nextSlot.children).forEach(c => c.setAttribute('slot', key))
              }
              if (currentSlots.length > 0) {
                dom.replaceWith(currentSlots[0], nextSlot)
              } else {
                dom.appendChild(this, nextSlot)
              }
            }
          }
        }
        onStateChange(state, prevState, this)
        if (state != null) {
          this._childStates.forEach(cnf => {
            const d = cnf.d
            if (d.updateState) {
              d.updateState(cnf.s(state, this))
            }
          })
        }
        for (const key in attrs) {
          const normalizedKey = string.fromCamelCase(key, '-')
          if (state == null) {
            this.removeAttribute(normalizedKey)
          } else {
            const stateVal = state[key]
            const attrsType = attrs[key]
            if (!prevState || prevState[key] !== stateVal) {
              if (attrsType === 'bool') {
                if (stateVal) {
                  this.setAttribute(normalizedKey, '')
                } else {
                  this.removeAttribute(normalizedKey)
                }
              } else if (stateVal == null && (attrsType === 'string' || attrsType === 'number')) {
                this.removeAttribute(normalizedKey)
              } else {
                this.setAttribute(normalizedKey, encodeAttrVal(stateVal, attrsType))
              }
            }
          }
        }
      }
    }
  }
  define(name, _Lib0Component)
  // @ts-ignore
  return _Lib0Component
}

/**
 * @param {function} definer function that defines a component when executed
 */
export const createComponentDefiner = definer => {
  /**
   * @type {any}
   */
  let defined = null
  return () => {
    if (!defined) {
      defined = definer()
    }
    return defined
  }
}

export const defineListComponent = createComponentDefiner(() => {
  const ListItem = createComponent('lib0-list-item', {
    template: '<slot name="content"></slot>',
    slots: state => ({
      content: `<div>${state}</div>`
    })
  })
  return createComponent('lib0-list', {
    state: { list: /** @type {Array<string>} */ ([]), Item: ListItem },
    onStateChange: (state, prevState, component) => {
      if (state == null) {
        return
      }
      const { list = /** @type {Array<any>} */ ([]), Item = ListItem } = state
      // @todo deep compare here by providing another parameter to simpleDiffArray
      let { index, remove, insert } = diff.simpleDiffArray(prevState ? prevState.list : [], list, func.equalityFlat)
      if (remove === 0 && insert.length === 0) {
        return
      }
      let child = /** @type {Lib0Component<any>} */ (component.firstChild)
      while (index-- > 0) {
        child = /** @type {Lib0Component<any>} */ (child.nextElementSibling)
      }
      let insertStart = 0
      while (insertStart < insert.length && remove-- > 0) {
        // update existing state
        child.setState(insert[insertStart++])
        child = /** @type {Lib0Component<any>} */ (child.nextElementSibling)
      }
      while (remove-- > 0) {
        // remove remaining
        const prevChild = child
        child = /** @type {Lib0Component<any>} */ (child.nextElementSibling)
        component.removeChild(prevChild)
      }
      // insert remaining
      component.insertBefore(dom.fragment(insert.slice(insertStart).map(/** @param {any} insState */ insState => {
        const el = new Item()
        el.setState(insState)
        return el
      })), child)
    }
  })
})

export const defineLazyLoadingComponent = createComponentDefiner(() => createComponent('lib0-lazy', {
  state: /** @type {{component:null|String,import:null|function():Promise<any>,state:null|object}} */ ({
    component: null, import: null, state: null
  }),
  attrs: {
    component: 'string'
  },
  onStateChange: ({ component, state, import: getImport }, prevState, componentEl) => {
    if (component !== null) {
      if (getImport) {
        getImport()
      }
      if (!prevState || component !== prevState.component) {
        const el = /** @type {any} */ (dom.createElement(component))
        componentEl.innerHTML = ''
        componentEl.insertBefore(el, null)
      }
      const el = /** @type {any} */ (componentEl.firstElementChild)
      // @todo generalize setting state and check if setState is defined
      if (el.setState) {
        el.setState(state)
      }
    }
  }
}))
