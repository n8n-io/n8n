'use strict'

const { WebsocketFrameSend } = require('./frame')
const { opcodes, sendHints } = require('./constants')
const FixedQueue = require('../../dispatcher/fixed-queue')

/**
 * @typedef {object} SendQueueNode
 * @property {Promise<void> | null} promise
 * @property {((...args: any[]) => any)} callback
 * @property {Buffer | null} frame
 */

class SendQueue {
  /**
   * @type {FixedQueue}
   */
  #queue = new FixedQueue()

  /**
   * @type {boolean}
   */
  #running = false

  /** @type {import('node:net').Socket} */
  #socket

  constructor (socket) {
    this.#socket = socket
  }

  add (item, cb, hint) {
    if (hint !== sendHints.blob) {
      if (!this.#running) {
        // TODO(@tsctx): support fast-path for string on running
        if (hint === sendHints.text) {
          // special fast-path for string
          const { 0: head, 1: body } = WebsocketFrameSend.createFastTextFrame(item)
          this.#socket.cork()
          this.#socket.write(head)
          this.#socket.write(body, cb)
          this.#socket.uncork()
        } else {
          // direct writing
          this.#socket.write(createFrame(item, hint), cb)
        }
      } else {
        /** @type {SendQueueNode} */
        const node = {
          promise: null,
          callback: cb,
          frame: createFrame(item, hint)
        }
        this.#queue.push(node)
      }
      return
    }

    /** @type {SendQueueNode} */
    const node = {
      promise: item.arrayBuffer().then((ab) => {
        node.promise = null
        node.frame = createFrame(ab, hint)
      }),
      callback: cb,
      frame: null
    }

    this.#queue.push(node)

    if (!this.#running) {
      this.#run()
    }
  }

  async #run () {
    this.#running = true
    const queue = this.#queue
    while (!queue.isEmpty()) {
      const node = queue.shift()
      // wait pending promise
      if (node.promise !== null) {
        await node.promise
      }
      // write
      this.#socket.write(node.frame, node.callback)
      // cleanup
      node.callback = node.frame = null
    }
    this.#running = false
  }
}

function createFrame (data, hint) {
  return new WebsocketFrameSend(toBuffer(data, hint)).createFrame(hint === sendHints.text ? opcodes.TEXT : opcodes.BINARY)
}

function toBuffer (data, hint) {
  switch (hint) {
    case sendHints.text:
    case sendHints.typedArray:
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    case sendHints.arrayBuffer:
    case sendHints.blob:
      return new Uint8Array(data)
  }
}

module.exports = { SendQueue }
