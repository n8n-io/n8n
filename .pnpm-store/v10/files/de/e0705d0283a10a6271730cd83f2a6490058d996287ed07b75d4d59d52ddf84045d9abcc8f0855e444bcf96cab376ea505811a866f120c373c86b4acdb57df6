'use strict'

const { webidl } = require('../fetch/webidl')
const { kEnumerableProperty } = require('../../core/util')
const { kConstruct } = require('../../core/symbols')
const { MessagePort } = require('node:worker_threads')

/**
 * @see https://html.spec.whatwg.org/multipage/comms.html#messageevent
 */
class MessageEvent extends Event {
  #eventInit

  constructor (type, eventInitDict = {}) {
    if (type === kConstruct) {
      super(arguments[1], arguments[2])
      webidl.util.markAsUncloneable(this)
      return
    }

    const prefix = 'MessageEvent constructor'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    type = webidl.converters.DOMString(type, prefix, 'type')
    eventInitDict = webidl.converters.MessageEventInit(eventInitDict, prefix, 'eventInitDict')

    super(type, eventInitDict)

    this.#eventInit = eventInitDict
    webidl.util.markAsUncloneable(this)
  }

  get data () {
    webidl.brandCheck(this, MessageEvent)

    return this.#eventInit.data
  }

  get origin () {
    webidl.brandCheck(this, MessageEvent)

    return this.#eventInit.origin
  }

  get lastEventId () {
    webidl.brandCheck(this, MessageEvent)

    return this.#eventInit.lastEventId
  }

  get source () {
    webidl.brandCheck(this, MessageEvent)

    return this.#eventInit.source
  }

  get ports () {
    webidl.brandCheck(this, MessageEvent)

    if (!Object.isFrozen(this.#eventInit.ports)) {
      Object.freeze(this.#eventInit.ports)
    }

    return this.#eventInit.ports
  }

  initMessageEvent (
    type,
    bubbles = false,
    cancelable = false,
    data = null,
    origin = '',
    lastEventId = '',
    source = null,
    ports = []
  ) {
    webidl.brandCheck(this, MessageEvent)

    webidl.argumentLengthCheck(arguments, 1, 'MessageEvent.initMessageEvent')

    return new MessageEvent(type, {
      bubbles, cancelable, data, origin, lastEventId, source, ports
    })
  }

  static createFastMessageEvent (type, init) {
    const messageEvent = new MessageEvent(kConstruct, type, init)
    messageEvent.#eventInit = init
    messageEvent.#eventInit.data ??= null
    messageEvent.#eventInit.origin ??= ''
    messageEvent.#eventInit.lastEventId ??= ''
    messageEvent.#eventInit.source ??= null
    messageEvent.#eventInit.ports ??= []
    return messageEvent
  }
}

const { createFastMessageEvent } = MessageEvent
delete MessageEvent.createFastMessageEvent

/**
 * @see https://websockets.spec.whatwg.org/#the-closeevent-interface
 */
class CloseEvent extends Event {
  #eventInit

  constructor (type, eventInitDict = {}) {
    const prefix = 'CloseEvent constructor'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    type = webidl.converters.DOMString(type, prefix, 'type')
    eventInitDict = webidl.converters.CloseEventInit(eventInitDict)

    super(type, eventInitDict)

    this.#eventInit = eventInitDict
    webidl.util.markAsUncloneable(this)
  }

  get wasClean () {
    webidl.brandCheck(this, CloseEvent)

    return this.#eventInit.wasClean
  }

  get code () {
    webidl.brandCheck(this, CloseEvent)

    return this.#eventInit.code
  }

  get reason () {
    webidl.brandCheck(this, CloseEvent)

    return this.#eventInit.reason
  }
}

// https://html.spec.whatwg.org/multipage/webappapis.html#the-errorevent-interface
class ErrorEvent extends Event {
  #eventInit

  constructor (type, eventInitDict) {
    const prefix = 'ErrorEvent constructor'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    super(type, eventInitDict)
    webidl.util.markAsUncloneable(this)

    type = webidl.converters.DOMString(type, prefix, 'type')
    eventInitDict = webidl.converters.ErrorEventInit(eventInitDict ?? {})

    this.#eventInit = eventInitDict
  }

  get message () {
    webidl.brandCheck(this, ErrorEvent)

    return this.#eventInit.message
  }

  get filename () {
    webidl.brandCheck(this, ErrorEvent)

    return this.#eventInit.filename
  }

  get lineno () {
    webidl.brandCheck(this, ErrorEvent)

    return this.#eventInit.lineno
  }

  get colno () {
    webidl.brandCheck(this, ErrorEvent)

    return this.#eventInit.colno
  }

  get error () {
    webidl.brandCheck(this, ErrorEvent)

    return this.#eventInit.error
  }
}

Object.defineProperties(MessageEvent.prototype, {
  [Symbol.toStringTag]: {
    value: 'MessageEvent',
    configurable: true
  },
  data: kEnumerableProperty,
  origin: kEnumerableProperty,
  lastEventId: kEnumerableProperty,
  source: kEnumerableProperty,
  ports: kEnumerableProperty,
  initMessageEvent: kEnumerableProperty
})

Object.defineProperties(CloseEvent.prototype, {
  [Symbol.toStringTag]: {
    value: 'CloseEvent',
    configurable: true
  },
  reason: kEnumerableProperty,
  code: kEnumerableProperty,
  wasClean: kEnumerableProperty
})

Object.defineProperties(ErrorEvent.prototype, {
  [Symbol.toStringTag]: {
    value: 'ErrorEvent',
    configurable: true
  },
  message: kEnumerableProperty,
  filename: kEnumerableProperty,
  lineno: kEnumerableProperty,
  colno: kEnumerableProperty,
  error: kEnumerableProperty
})

webidl.converters.MessagePort = webidl.interfaceConverter(MessagePort)

webidl.converters['sequence<MessagePort>'] = webidl.sequenceConverter(
  webidl.converters.MessagePort
)

const eventInit = [
  {
    key: 'bubbles',
    converter: webidl.converters.boolean,
    defaultValue: () => false
  },
  {
    key: 'cancelable',
    converter: webidl.converters.boolean,
    defaultValue: () => false
  },
  {
    key: 'composed',
    converter: webidl.converters.boolean,
    defaultValue: () => false
  }
]

webidl.converters.MessageEventInit = webidl.dictionaryConverter([
  ...eventInit,
  {
    key: 'data',
    converter: webidl.converters.any,
    defaultValue: () => null
  },
  {
    key: 'origin',
    converter: webidl.converters.USVString,
    defaultValue: () => ''
  },
  {
    key: 'lastEventId',
    converter: webidl.converters.DOMString,
    defaultValue: () => ''
  },
  {
    key: 'source',
    // Node doesn't implement WindowProxy or ServiceWorker, so the only
    // valid value for source is a MessagePort.
    converter: webidl.nullableConverter(webidl.converters.MessagePort),
    defaultValue: () => null
  },
  {
    key: 'ports',
    converter: webidl.converters['sequence<MessagePort>'],
    defaultValue: () => new Array(0)
  }
])

webidl.converters.CloseEventInit = webidl.dictionaryConverter([
  ...eventInit,
  {
    key: 'wasClean',
    converter: webidl.converters.boolean,
    defaultValue: () => false
  },
  {
    key: 'code',
    converter: webidl.converters['unsigned short'],
    defaultValue: () => 0
  },
  {
    key: 'reason',
    converter: webidl.converters.USVString,
    defaultValue: () => ''
  }
])

webidl.converters.ErrorEventInit = webidl.dictionaryConverter([
  ...eventInit,
  {
    key: 'message',
    converter: webidl.converters.DOMString,
    defaultValue: () => ''
  },
  {
    key: 'filename',
    converter: webidl.converters.USVString,
    defaultValue: () => ''
  },
  {
    key: 'lineno',
    converter: webidl.converters['unsigned long'],
    defaultValue: () => 0
  },
  {
    key: 'colno',
    converter: webidl.converters['unsigned long'],
    defaultValue: () => 0
  },
  {
    key: 'error',
    converter: webidl.converters.any
  }
])

module.exports = {
  MessageEvent,
  CloseEvent,
  ErrorEvent,
  createFastMessageEvent
}
