/// <reference types="node" />

// See https://github.com/nodejs/undici/issues/1740

export type DOMException = typeof globalThis extends { DOMException: infer T }
 ? T
 : any

export type EventTarget = typeof globalThis extends { EventTarget: infer T }
  ? T
  : {
    addEventListener(
      type: string,
      listener: any,
      options?: any,
    ): void
    dispatchEvent(event: Event): boolean
    removeEventListener(
      type: string,
      listener: any,
      options?: any | boolean,
    ): void
  }

export type Event = typeof globalThis extends { Event: infer T }
  ? T
  : {
    readonly bubbles: boolean
    cancelBubble: () => void
    readonly cancelable: boolean
    readonly composed: boolean
    composedPath(): [EventTarget?]
    readonly currentTarget: EventTarget | null
    readonly defaultPrevented: boolean
    readonly eventPhase: 0 | 2
    readonly isTrusted: boolean
    preventDefault(): void
    returnValue: boolean
    readonly srcElement: EventTarget | null
    stopImmediatePropagation(): void
    stopPropagation(): void
    readonly target: EventTarget | null
    readonly timeStamp: number
    readonly type: string
  }

export interface EventInit {
  bubbles?: boolean
  cancelable?: boolean
  composed?: boolean
}

export interface EventListenerOptions {
  capture?: boolean
}

export interface AddEventListenerOptions extends EventListenerOptions {
  once?: boolean
  passive?: boolean
  signal?: AbortSignal
}

export type EventListenerOrEventListenerObject = EventListener | EventListenerObject

export interface EventListenerObject {
  handleEvent (object: Event): void
}

export interface EventListener {
  (evt: Event): void
}
