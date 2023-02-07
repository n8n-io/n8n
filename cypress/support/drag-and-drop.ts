/// <reference types="cypress" />

// Modified version of "@4tw/cypress-drag-drop"
// Changes:
// 1. Omit dataTransfer to stop the UI from throwing an error
// 2. Skip `dropped` check which only works if the same element is used for drag and drop
function omit(object = {}, keys = []) {
  return Object.entries(object).reduce((accum, [key, value]) => (key in keys ? accum : { ...accum, [key]: value }), {})
}

function isAttached(element) {
  return !!element.closest('html')
}

const DragSimulator = {
  MAX_TRIES: 5,
  DELAY_INTERVAL_MS: 10,
  counter: 0,
  targetElement: null,
  rectsEqual(r1, r2) {
    return r1.top === r2.top && r1.right === r2.right && r1.bottom === r2.bottom && r1.left === r2.left
  },
  createDefaultOptions(options) {
    const commonOptions = omit(options, ['source', 'target'])
    const source = { ...commonOptions, ...options.source }
    const target = { ...commonOptions, ...options.target }
    return { source, target }
  },
  get dropped() {
    const currentSourcePosition = this.source.getBoundingClientRect()
    return !this.rectsEqual(this.initialSourcePosition, currentSourcePosition)
  },
  get hasTriesLeft() {
    return this.counter < this.MAX_TRIES
  },
  set target(target) {
    this.targetElement = target
  },
  get target() {
    return cy.wrap(this.targetElement)
  },
  dragstart(clientPosition = {}) {
    return cy
      .wrap(this.source)
      .trigger('pointerdown', {
        which: 1,
        button: 0,
        ...clientPosition,
        eventConstructor: 'PointerEvent',
        ...this.options.source,
      })
      .trigger('mousedown', {
        which: 1,
        button: 0,
        ...clientPosition,
        eventConstructor: 'MouseEvent',
        ...this.options.source,
      })
      .trigger('dragstart', { eventConstructor: 'DragEvent', ...this.options.source })
  },
  drop(clientPosition = {}) {
    return this.target
      .trigger('drop', {
        ...this.options.target,
      })
      .then(() => {
        if (isAttached(this.targetElement)) {
          this.target
            .trigger('mouseup', {
              which: 1,
              button: 0,
              ...clientPosition,
              eventConstructor: 'MouseEvent',
              ...this.options.target,
            })
            .then(() => {
              if (isAttached(this.targetElement)) {
                this.target.trigger('pointerup', {
                  which: 1,
                  button: 0,
                  ...clientPosition,
                  eventConstructor: 'PointerEvent',
                  ...this.options.target,
                })
              }
            })
        }
      })
  },
  dragover(clientPosition = {}) {
    if (!this.counter) {
      this.counter += 1
      return this.target
        .trigger('dragover', {
          ...this.options.target,
        })
        .trigger('mousemove', {
          ...this.options.target,
          ...clientPosition,
          eventConstructor: 'MouseEvent',
        })
        .trigger('pointermove', {
          ...this.options.target,
          ...clientPosition,
          eventConstructor: 'PointerEvent',
        })
        .wait(this.DELAY_INTERVAL_MS)
        .then(() => this.dragover(clientPosition))
    }
		return true
  },
  init(source, target, options = {}) {
    this.options = this.createDefaultOptions(options)
    this.counter = 0
    this.source = source.get(0)
    this.initialSourcePosition = this.source.getBoundingClientRect()
    return cy.get(target).then((targetWrapper) => {
      this.target = targetWrapper.get(0)
    })
  },
  drag(sourceWrapper, targetSelector, options) {
    this.init(sourceWrapper, targetSelector, options)
      .then(() => this.dragstart())
      .then(() => this.dragover())
      .then((success) => {
        if (success) {
          return this.drop().then(() => true)
        } else {
          return false
        }
      })
  },
  move(sourceWrapper: Cypress.Chainable<Element>, options) {
    const { deltaX, deltaY } = options
    const { top, left } = sourceWrapper.offset()
    const finalCoords = { clientX: left + deltaX, clientY: top + deltaY }
    console.log("🚀 ~ file: drag-and-drop.ts:137 ~ move ~ sourceWrapper.offset", sourceWrapper.offset)
    this.init(sourceWrapper, sourceWrapper, options)
      .then(() => this.dragstart({ clientX: left, clientY: top }))
      .then(() => this.dragover(finalCoords))
      .then(() => this.drop(finalCoords))
  },
}

function addChildCommand(name, command) {
  Cypress.Commands.add(name, { prevSubject: 'element' }, (...args) => command(...args))
}

addChildCommand('drag', DragSimulator.drag.bind(DragSimulator))
addChildCommand('move', DragSimulator.move.bind(DragSimulator))
