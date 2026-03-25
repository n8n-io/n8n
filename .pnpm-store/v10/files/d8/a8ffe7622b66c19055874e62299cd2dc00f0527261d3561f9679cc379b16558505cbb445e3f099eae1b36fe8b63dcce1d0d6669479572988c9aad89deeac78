import {expectType} from 'tsd'
import {defineComponent} from 'vue'
import {render, fireEvent, screen, waitFor} from '.'

declare const elem: Element

const SomeComponent = defineComponent({
  name: 'SomeComponent',
  props: {
    foo: {type: Number, default: 0},
    bar: {type: String, default: '0'},
  },
})

export async function testRender() {
  const utils = render({template: '<div />'})

  // single queries
  expectType<HTMLElement>(utils.getByText('foo'))
  expectType<HTMLElement | null>(utils.queryByText('foo'))
  expectType<HTMLElement>(await utils.findByText('foo'))

  // multiple queries
  expectType<HTMLElement[]>(utils.getAllByText('bar'))
  expectType<HTMLElement[]>(utils.queryAllByText('bar'))
  expectType<HTMLElement[]>(await utils.findAllByText('bar'))

  // helpers
  const {container, baseElement, unmount, debug, rerender} = utils

  expectType<void>(await rerender({a: 1}))

  expectType<void>(debug())
  expectType<void>(debug(container))
  expectType<void>(debug([elem, elem], 100, {highlight: false}))

  expectType<void>(unmount())

  expectType<Element>(container)
  expectType<Element>(baseElement)
}

export function testRenderOptions() {
  const container = document.createElement('div')
  const baseElement = document.createElement('div')
  const options = {container, baseElement}
  render({template: 'div'}, options)
}

export async function testFireEvent() {
  const {container} = render({template: 'button'})
  expectType<void>(await fireEvent.click(container))
  expectType<void>(await fireEvent.touch(elem))
}

export async function testScreen() {
  render({template: 'button'})

  expectType<HTMLElement>(await screen.findByRole('button'))
}

export async function testWaitFor() {
  const {container} = render({template: 'button'})
  expectType<void>(await fireEvent.update(container))
  expectType<void>(await waitFor(() => {}))
}

export function testOptions() {
  render(SomeComponent, {
    attrs: {a: 1},
    props: {foo: 1},
    data: () => ({b: 2}),
    slots: {
      default: '<div />',
      footer: '<div />',
    },
    global: {
      config: {isCustomElement: _ => true},
      plugins: [],
    },
    baseElement: document.createElement('div'),
    container: document.createElement('div'),
  })
}

export function testEmitted() {
  const {emitted} = render(SomeComponent)
  expectType<unknown[]>(emitted().foo)
  expectType<unknown[]>(emitted('foo'))
}

/*
eslint
  testing-library/prefer-explicit-assert: "off",
  testing-library/no-wait-for-empty-callback: "off",
  testing-library/no-debugging-utils: "off",
  testing-library/prefer-screen-queries: "off",
  @typescript-eslint/unbound-method: "off",
  @typescript-eslint/no-invalid-void-type: "off"
*/
