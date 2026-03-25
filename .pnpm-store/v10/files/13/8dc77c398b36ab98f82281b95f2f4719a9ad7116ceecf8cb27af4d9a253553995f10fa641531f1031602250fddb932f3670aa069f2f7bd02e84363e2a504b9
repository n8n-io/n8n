let vendor = require('./vendor')
let Declaration = require('./declaration')
let Resolution = require('./resolution')
let Transition = require('./transition')
let Processor = require('./processor')
let Supports = require('./supports')
let Browsers = require('./browsers')
let Selector = require('./selector')
let AtRule = require('./at-rule')
let Value = require('./value')
let utils = require('./utils')
let hackFullscreen = require('./hacks/fullscreen')
let hackPlaceholder = require('./hacks/placeholder')
let hackPlaceholderShown = require('./hacks/placeholder-shown')
let hackFileSelectorButton = require('./hacks/file-selector-button')
let hackFlex = require('./hacks/flex')
let hackOrder = require('./hacks/order')
let hackFilter = require('./hacks/filter')
let hackGridEnd = require('./hacks/grid-end')
let hackAnimation = require('./hacks/animation')
let hackFlexFlow = require('./hacks/flex-flow')
let hackFlexGrow = require('./hacks/flex-grow')
let hackFlexWrap = require('./hacks/flex-wrap')
let hackGridArea = require('./hacks/grid-area')
let hackPlaceSelf = require('./hacks/place-self')
let hackGridStart = require('./hacks/grid-start')
let hackAlignSelf = require('./hacks/align-self')
let hackAppearance = require('./hacks/appearance')
let hackFlexBasis = require('./hacks/flex-basis')
let hackMaskBorder = require('./hacks/mask-border')
let hackMaskComposite = require('./hacks/mask-composite')
let hackAlignItems = require('./hacks/align-items')
let hackUserSelect = require('./hacks/user-select')
let hackFlexShrink = require('./hacks/flex-shrink')
let hackBreakProps = require('./hacks/break-props')
let hackWritingMode = require('./hacks/writing-mode')
let hackBorderImage = require('./hacks/border-image')
let hackAlignContent = require('./hacks/align-content')
let hackBorderRadius = require('./hacks/border-radius')
let hackBlockLogical = require('./hacks/block-logical')
let hackGridTemplate = require('./hacks/grid-template')
let hackInlineLogical = require('./hacks/inline-logical')
let hackGridRowAlign = require('./hacks/grid-row-align')
let hackTransformDecl = require('./hacks/transform-decl')
let hackFlexDirection = require('./hacks/flex-direction')
let hackImageRendering = require('./hacks/image-rendering')
let hackBackdropFilter = require('./hacks/backdrop-filter')
let hackBackgroundClip = require('./hacks/background-clip')
let hackTextDecoration = require('./hacks/text-decoration')
let hackJustifyContent = require('./hacks/justify-content')
let hackBackgroundSize = require('./hacks/background-size')
let hackGridRowColumn = require('./hacks/grid-row-column')
let hackGridRowsColumns = require('./hacks/grid-rows-columns')
let hackGridColumnAlign = require('./hacks/grid-column-align')
let hackPrintColorAdjust = require('./hacks/print-color-adjust')
let hackOverscrollBehavior = require('./hacks/overscroll-behavior')
let hackGridTemplateAreas = require('./hacks/grid-template-areas')
let hackTextEmphasisPosition = require('./hacks/text-emphasis-position')
let hackTextDecorationSkipInk = require('./hacks/text-decoration-skip-ink')
let hackGradient = require('./hacks/gradient')
let hackIntrinsic = require('./hacks/intrinsic')
let hackPixelated = require('./hacks/pixelated')
let hackImageSet = require('./hacks/image-set')
let hackCrossFade = require('./hacks/cross-fade')
let hackDisplayFlex = require('./hacks/display-flex')
let hackDisplayGrid = require('./hacks/display-grid')
let hackFilterValue = require('./hacks/filter-value')
let hackAutofill = require('./hacks/autofill')

Selector.hack(hackAutofill)
Selector.hack(hackFullscreen)
Selector.hack(hackPlaceholder)
Selector.hack(hackPlaceholderShown)
Selector.hack(hackFileSelectorButton)
Declaration.hack(hackFlex)
Declaration.hack(hackOrder)
Declaration.hack(hackFilter)
Declaration.hack(hackGridEnd)
Declaration.hack(hackAnimation)
Declaration.hack(hackFlexFlow)
Declaration.hack(hackFlexGrow)
Declaration.hack(hackFlexWrap)
Declaration.hack(hackGridArea)
Declaration.hack(hackPlaceSelf)
Declaration.hack(hackGridStart)
Declaration.hack(hackAlignSelf)
Declaration.hack(hackAppearance)
Declaration.hack(hackFlexBasis)
Declaration.hack(hackMaskBorder)
Declaration.hack(hackMaskComposite)
Declaration.hack(hackAlignItems)
Declaration.hack(hackUserSelect)
Declaration.hack(hackFlexShrink)
Declaration.hack(hackBreakProps)
Declaration.hack(hackWritingMode)
Declaration.hack(hackBorderImage)
Declaration.hack(hackAlignContent)
Declaration.hack(hackBorderRadius)
Declaration.hack(hackBlockLogical)
Declaration.hack(hackGridTemplate)
Declaration.hack(hackInlineLogical)
Declaration.hack(hackGridRowAlign)
Declaration.hack(hackTransformDecl)
Declaration.hack(hackFlexDirection)
Declaration.hack(hackImageRendering)
Declaration.hack(hackBackdropFilter)
Declaration.hack(hackBackgroundClip)
Declaration.hack(hackTextDecoration)
Declaration.hack(hackJustifyContent)
Declaration.hack(hackBackgroundSize)
Declaration.hack(hackGridRowColumn)
Declaration.hack(hackGridRowsColumns)
Declaration.hack(hackGridColumnAlign)
Declaration.hack(hackOverscrollBehavior)
Declaration.hack(hackGridTemplateAreas)
Declaration.hack(hackPrintColorAdjust)
Declaration.hack(hackTextEmphasisPosition)
Declaration.hack(hackTextDecorationSkipInk)
Value.hack(hackGradient)
Value.hack(hackIntrinsic)
Value.hack(hackPixelated)
Value.hack(hackImageSet)
Value.hack(hackCrossFade)
Value.hack(hackDisplayFlex)
Value.hack(hackDisplayGrid)
Value.hack(hackFilterValue)

let declsCache = new Map()

class Prefixes {
  constructor(data, browsers, options = {}) {
    this.data = data
    this.browsers = browsers
    this.options = options
    ;[this.add, this.remove] = this.preprocess(this.select(this.data))
    this.transition = new Transition(this)
    this.processor = new Processor(this)
  }

  /**
   * Return clone instance to remove all prefixes
   */
  cleaner() {
    if (this.cleanerCache) {
      return this.cleanerCache
    }

    if (this.browsers.selected.length) {
      let empty = new Browsers(this.browsers.data, [])
      this.cleanerCache = new Prefixes(this.data, empty, this.options)
    } else {
      return this
    }

    return this.cleanerCache
  }

  /**
   * Declaration loader with caching
   */
  decl(prop) {
    if (!declsCache.has(prop)) {
      declsCache.set(prop, Declaration.load(prop))
    }

    return declsCache.get(prop)
  }

  /**
   * Group declaration by unprefixed property to check them
   */
  group(decl) {
    let rule = decl.parent
    let index = rule.index(decl)
    let { length } = rule.nodes
    let unprefixed = this.unprefixed(decl.prop)

    let checker = (step, callback) => {
      index += step
      while (index >= 0 && index < length) {
        let other = rule.nodes[index]
        if (other.type === 'decl') {
          if (step === -1 && other.prop === unprefixed) {
            if (!Browsers.withPrefix(other.value)) {
              break
            }
          }

          if (this.unprefixed(other.prop) !== unprefixed) {
            break
          } else if (callback(other) === true) {
            return true
          }

          if (step === +1 && other.prop === unprefixed) {
            if (!Browsers.withPrefix(other.value)) {
              break
            }
          }
        }

        index += step
      }
      return false
    }

    return {
      down(callback) {
        return checker(+1, callback)
      },
      up(callback) {
        return checker(-1, callback)
      }
    }
  }

  /**
   * Normalize prefix for remover
   */
  normalize(prop) {
    return this.decl(prop).normalize(prop)
  }

  /**
   * Return prefixed version of property
   */
  prefixed(prop, prefix) {
    prop = vendor.unprefixed(prop)
    return this.decl(prop).prefixed(prop, prefix)
  }

  /**
   * Cache prefixes data to fast CSS processing
   */
  preprocess(selected) {
    let add = {
      '@supports': new Supports(Prefixes, this),
      'selectors': []
    }
    for (let name in selected.add) {
      let prefixes = selected.add[name]
      if (name === '@keyframes' || name === '@viewport') {
        add[name] = new AtRule(name, prefixes, this)
      } else if (name === '@resolution') {
        add[name] = new Resolution(name, prefixes, this)
      } else if (this.data[name].selector) {
        add.selectors.push(Selector.load(name, prefixes, this))
      } else {
        let props = this.data[name].props

        if (props) {
          let value = Value.load(name, prefixes, this)
          for (let prop of props) {
            if (!add[prop]) {
              add[prop] = { values: [] }
            }
            add[prop].values.push(value)
          }
        } else {
          let values = (add[name] && add[name].values) || []
          add[name] = Declaration.load(name, prefixes, this)
          add[name].values = values
        }
      }
    }

    let remove = { selectors: [] }
    for (let name in selected.remove) {
      let prefixes = selected.remove[name]
      if (this.data[name].selector) {
        let selector = Selector.load(name, prefixes)
        for (let prefix of prefixes) {
          remove.selectors.push(selector.old(prefix))
        }
      } else if (name === '@keyframes' || name === '@viewport') {
        for (let prefix of prefixes) {
          let prefixed = `@${prefix}${name.slice(1)}`
          remove[prefixed] = { remove: true }
        }
      } else if (name === '@resolution') {
        remove[name] = new Resolution(name, prefixes, this)
      } else {
        let props = this.data[name].props
        if (props) {
          let value = Value.load(name, [], this)
          for (let prefix of prefixes) {
            let old = value.old(prefix)
            if (old) {
              for (let prop of props) {
                if (!remove[prop]) {
                  remove[prop] = {}
                }
                if (!remove[prop].values) {
                  remove[prop].values = []
                }
                remove[prop].values.push(old)
              }
            }
          }
        } else {
          for (let p of prefixes) {
            let olds = this.decl(name).old(name, p)
            if (name === 'align-self') {
              let a = add[name] && add[name].prefixes
              if (a) {
                if (p === '-webkit- 2009' && a.includes('-webkit-')) {
                  continue
                } else if (p === '-webkit-' && a.includes('-webkit- 2009')) {
                  continue
                }
              }
            }
            for (let prefixed of olds) {
              if (!remove[prefixed]) {
                remove[prefixed] = {}
              }
              remove[prefixed].remove = true
            }
          }
        }
      }
    }

    return [add, remove]
  }

  /**
   * Select prefixes from data, which is necessary for selected browsers
   */
  select(list) {
    let selected = { add: {}, remove: {} }

    for (let name in list) {
      let data = list[name]
      let add = data.browsers.map(i => {
        let params = i.split(' ')
        return {
          browser: `${params[0]} ${params[1]}`,
          note: params[2]
        }
      })

      let notes = add
        .filter(i => i.note)
        .map(i => `${this.browsers.prefix(i.browser)} ${i.note}`)
      notes = utils.uniq(notes)

      add = add
        .filter(i => this.browsers.isSelected(i.browser))
        .map(i => {
          let prefix = this.browsers.prefix(i.browser)
          if (i.note) {
            return `${prefix} ${i.note}`
          } else {
            return prefix
          }
        })
      add = this.sort(utils.uniq(add))

      if (this.options.flexbox === 'no-2009') {
        add = add.filter(i => !i.includes('2009'))
      }

      let all = data.browsers.map(i => this.browsers.prefix(i))
      if (data.mistakes) {
        all = all.concat(data.mistakes)
      }
      all = all.concat(notes)
      all = utils.uniq(all)

      if (add.length) {
        selected.add[name] = add
        if (add.length < all.length) {
          selected.remove[name] = all.filter(i => !add.includes(i))
        }
      } else {
        selected.remove[name] = all
      }
    }

    return selected
  }

  /**
   * Sort vendor prefixes
   */
  sort(prefixes) {
    return prefixes.sort((a, b) => {
      let aLength = utils.removeNote(a).length
      let bLength = utils.removeNote(b).length

      if (aLength === bLength) {
        return b.length - a.length
      } else {
        return bLength - aLength
      }
    })
  }

  /**
   * Return unprefixed version of property
   */
  unprefixed(prop) {
    let value = this.normalize(vendor.unprefixed(prop))
    if (value === 'flex-direction') {
      value = 'flex-flow'
    }
    return value
  }

  /**
   * Return values, which must be prefixed in selected property
   */
  values(type, prop) {
    let data = this[type]

    let global = data['*'] && data['*'].values
    let values = data[prop] && data[prop].values

    if (global && values) {
      return utils.uniq(global.concat(values))
    } else {
      return global || values || []
    }
  }
}

module.exports = Prefixes
