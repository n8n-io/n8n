import { Duplex } from "readable-stream";
import {
  BufferList as BL,
  BufferListConstructor,
  BufferListAcceptedTypes,
} from "./BufferList";

type BufferListStreamInit =
  | ((err: Error, buffer: Buffer) => void)
  | BufferListAcceptedTypes;

interface BufferListStreamConstructor {
  new (initData?: BufferListStreamInit): BufferListStream;
  (callback?: BufferListStreamInit): BufferListStream;

  /**
   * Determines if the passed object is a BufferList. It will return true
   * if the passed object is an instance of BufferList or BufferListStream
   * and false otherwise.
   *
   * N.B. this won't return true for BufferList or BufferListStream instances
   * created by versions of this library before this static method was added.
   *
   * @param other
   */

  isBufferList(other: unknown): boolean;

  /**
   * Rexporting BufferList and BufferListStream to fix
   * issue with require/commonjs import and "export = " below.
   */

  BufferList: BufferListConstructor;
  BufferListStream: BufferListStreamConstructor;
}

interface BufferListStream extends Duplex, BL {
  prototype: BufferListStream & BL;
}

/**
 * BufferListStream is a Node Duplex Stream, so it can be read from
 * and written to like a standard Node stream. You can also pipe()
 * to and from a BufferListStream instance.
 *
 * The constructor takes an optional callback, if supplied, the
 * callback will be called with an error argument followed by a
 * reference to the bl instance, when bl.end() is called
 * (i.e. from a piped stream).
 *
 * This is a convenient method of collecting the entire contents of
 * a stream, particularly when the stream is chunky, such as a network
 * stream.
 *
 * Normally, no arguments are required for the constructor, but you can
 * initialise the list by passing in a single Buffer object or an array
 * of Buffer object.
 *
 * `new` is not strictly required, if you don't instantiate a new object,
 * it will be done automatically for you so you can create a new instance
 * simply with:
 *
 * ```js
 * const { BufferListStream } = require('bl');
 * const bl = BufferListStream();
 *
 * // equivalent to:
 *
 * const { BufferListStream } = require('bl');
 * const bl = new BufferListStream();
 * ```
 *
 * N.B. For backwards compatibility reasons, BufferListStream is the default
 * export when you `require('bl')`:
 *
 * ```js
 * const { BufferListStream } = require('bl')
 *
 * // equivalent to:
 *
 * const BufferListStream = require('bl')
 * ```
 */

declare const BufferListStream: BufferListStreamConstructor;

export = BufferListStream;
