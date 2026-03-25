# Change log for amqplib

## v0.10.6
- Replace references to the old squaremo/amqp.name repo with ones to amqp-node/amqplib
- Use a frame_max of 131072 by default for RabbitMQ 4.1.0 compatibility

## Changes in v0.10.5

    git log v0.10.4..v0.10.5

- Removed readable stream - See https://github.com/amqp-node/amqplib/issues/729
- Added support for unsigned integers - See https://github.com/amqp-node/amqplib/pull/773
- Committed protocol definitions - See https://github.com/amqp-node/amqplib/commit/0a87ee480311633cff41e43350a90cb3c1221506

## Changes in v0.10.4

- Improve stream example as per https://github.com/amqp-node/amqplib/issues/722
- Added support for RabbitMQ's connection update-secret operation. See https://github.com/amqp-node/amqplib/issues/755

## Changes in v0.10.3

    git log v0.10.2..v0.10.3

- Use @acuminous/bitsyntax fork. See https://github.com/amqp-node/amqplib/issues/453

## Changes in v0.10.2

    git log v0.10.1..v0.10.2

- Use Buffer.allocUnsafe when sending messages to improve performance ([PR
  695](https://github.com/amqp-node/amqplib/pull/695), thank you
  @chkimes and @Uzlopak)

## Changes in v0.10.1

    git log v0.10.0..v0.10.1

 * Allow servername to be specified via socket options as discussed in
   [issue 697](https://github.com/squaremo/amqp.node/issues/697)

## Changes in v0.10.0

    git log v0.9.1..v0.10.0

 * Use Native promises ([PR
   689](https://github.com/amqp-node/amqplib/pull/689), thank you
   @mohd-akram and @kibertoad)

## Changes in v0.9.1

    git log v0.9.0..v0.9.1

 * Assorted readme changes
 * Use Array.prototype.push.apply instead of concat in Mux ([PR
   658](https://github.com/squaremo/amqp.node/pull/658), thank you
   @Uzlopak and @kibertoad)
 * Use Map instead of Object for BaseChannel.consumers ([PR
   660](https://github.com/squaremo/amqp.node/pull/660), thank you
   @Uzlopak)
 * Delete consumer callback after cancellation to free memory ([PR
   659](https://github.com/squaremo/amqp.node/pull/659), thank you
   @Uzlopak and @kibertoad)


## Changes in v0.9.0

    git log v0.8.0..v0.9.0

 * Update mocha and replace the deprecated istanbul with nyc ([PR
   681](https://github.com/squaremo/amqp.node/pull/681)
 * Update url-parse ([PR
   675](https://github.com/squaremo/amqp.node/pull/675), thank you
   @suhail-n and @kibertoad)
 * fix: done called twice on invalid options ([PR
   667](https://github.com/squaremo/amqp.node/pull/667), thank you
   @luddd3 and @kibertoad)
 * Close connection to server on connect errors ([PR
   647](https://github.com/squaremo/amqp.node/pull/647), thank you
   @luddd3 and @kibertoad)
 * Modernise channel_model.js ([PR
   635](https://github.com/squaremo/amqp.node/pull/635), thank you
   @kibertoad and @jimmywarting)
 * Bring package-lock.json up to date ([PR
   653](https://github.com/squaremo/amqp.node/pull/653)
 * Update url-parse ([PR
   652](https://github.com/squaremo/amqp.node/pull/652), thank you
   @giorgioatanasov and @buffolander)
 * Modernise channel_model.js ([PR
   651](https://github.com/squaremo/amqp.node/pull/651), thank you
   for the review @kibertoad)
 * Modernise bitset.js ([PR
   634](https://github.com/squaremo/amqp.node/pull/634), thank you
   @kibertoad and @jimmywarting)
 * :warning: Drop CI for node versions below 10 ([PR
   631](https://github.com/squaremo/amqp.node/pull/631), thank you
   for the review @kibertoad)
 * Replace safe-buffer dependency with native buffers ([PR
   628](https://github.com/squaremo/amqp.node/pull/628), thank you
   @kibertoad and @jimmywarting)

## Changes in v0.8.0

    git log v0.7.1..v0.8.0

 * :warning: Support for NodeJS prior to v10 is dropped :warning: ([PR
   615](https://github.com/squaremo/amqp.node/pull/615), thank you
   @xamgore and everyone who helped there)
 * Use hostname as TLS servername, to help with using servers behind
   load balancers ([PR
   567](https://github.com/squaremo/amqp.node/pull/567), thanks to
   @carlhoerberg and commenters)

## Changes in v0.7.1

    git log v0.7.0..v0.7.1

 * Update url-parse (and others) ([PR
   607](https://github.com/squaremo/amqp.node/pull/545), thanks
   @ThomasGawlitza)

## Changes in v0.7.0

    git log v0.6.0..v0.7.0

 * Extend support to Node.js v15
 * Fix use of stream.write in tests

## Changes in v0.6.0

    git log v0.5.6..v0.6.0

 * Extend support to Node.js v14

## Changes in v0.5.6

    git log v0.5.5..v0.5.6

 * Increase size of encoding space for message headers, to fit e.g.,
   JWT ([PR 545](https://github.com/squaremo/amqp.node/pull/545));
   thanks @twatson83
 * Switch to a non-deprecated UUID module ([PR
   528](https://github.com/squaremo/amqp.node/pull/528)); thanks to
   @StrayBird-ATSH
 * Fix a bug in multiplexing that caused an assertion to fail ([PR
   503](https://github.com/squaremo/amqp.node/pull/503)); thanks
   @johanneswuerbach

## Changes in v0.5.5

    git log v0.5.3..v0.5.5

**NB** this includes a minor but possibly breaking change: after [PR
498](https://github.com/squaremo/amqp.node/pull/498), all confirmation
promises still unresolved will be rejected when their associated
channel is closed.

 * Generate defs in `npm prepare` rather than `npm prepublish` so that
  e.g., amqplib can be installed via git ([part of PR
  498](https://github.com/squaremo/amqp.node/pull/498))
 * Reject all pending confirmations when the channel is closed ([PR
  498](https://github.com/squaremo/amqp.node/pull/498)); thanks
  @johanneswuerbach
 * Update supported NodeJS versions in package.json ([PR
   525](https://github.com/squaremo/amqp.node/pull/525)); thanks
   @tingwai

## (Deprecated v0.5.4)

This release was mistakenly published without the generated file
`./defs.js`. It has been deprecated in favour of v0.5.5.

## Changes in v0.5.3

    git log v0.5.2..v0.5.3

 * Bump bitsyntax to remove some `Buffer` misuse deprecation notices
 ([PR 480])(https://github.com/squaremo/amqp.node/pull/480)
 * Test on node 11.1
  ([PR 473])(https://github.com/squaremo/amqp.node/pull/464); thanks
  @kibertoad
 * Updated various dependencies
 * Support queue mode during assertQueue
   ([PR 464])(https://github.com/squaremo/amqp.node/pull/464); thanks
   @JoeTheFkingFrypan
 * Expose serverProperties in the connection object
   ([PR 452])(https://github.com/squaremo/amqp.node/pull/452); thanks
   @jfromaniello
 * Test on Node 10
   ([PR 454])(https://github.com/squaremo/amqp.node/pull/454); thanks
   @kibertoad
 * Support amqplain credentials
   ([PR 451])(https://github.com/squaremo/amqp.node/pull/451); thanks
   @jfromaniello
 * Decorate channel errors with methodId and classId
   ([PR 447])(https://github.com/squaremo/amqp.node/pull/447); thanks
   @MitMaro
 * Resolve issues caused by Node 10 `readable` changes
   ([PR 442])(https://github.com/squaremo/amqp.node/pull/442)
 * Bump uglify to 2.6.x and node to 9.1 due to nodejs/node#16781.
   ([PR 439])(https://github.com/squaremo/amqp.node/pull/439)
 * Updated README with more modern Buffer syntax
   ([PR 438](https://github.com/squaremo/amqp.node/pull/438); thanks
   @ravshansbox
 * Support overflow option to assert queue
   ([PR 436])(https://github.com/squaremo/amqp.node/pull/436); thanks
   to @honestserpent
 * Replace instances of keyword `await`
   ([PR 396])(https://github.com/squaremo/amqp.node/pull/396),
   as discussed in
   [issue 235](https://github.com/squaremo/amqp.node/issues/235)
 * Use 3rd party url for better decoding of username/password
   ([PR 395])(https://github.com/squaremo/amqp.node/pull/395),
   as discussed in
   [issue 385](https://github.com/squaremo/amqp.node/issues/385))

## Changes in v0.5.2

    git log v0.5.1..v0.5.2

 * Increase encoding buffer to accommodate large header values
   ([PR 367](https://github.com/squaremo/amqp.node/pull/367))
 * Bring code up to date with new Buffer interface
   ([PR 350](https://github.com/squaremo/amqp.node/pull/350))
 * Fix dangling connection problem
   ([PR 340](https://github.com/squaremo/amqp.node/pull/340))
 * Clear up URL credentials parsing
   ([PR 330](https://github.com/squaremo/amqp.node/pull/330))
 * Allow connection params to be suppied in object
   ([PR 304](https://github.com/squaremo/amqp.node/pull/304))
 * Support explicit numeric types in field tables (e.g., headers)
   ([PR 389](https://github.com/squaremo/amqp.node/pull/389), from a
   suggestion in
   [issue 358](https://github.com/squaremo/amqp.node/issues/358))

Thank you to all contributors, of PRs, issues and comments.

## Changes in v0.5.1

    git log v0.5.0..v0.5.1

 * Fix mistake in closeBecause
   ([PR 298](https://github.com/squaremo/amqp.node/pull/298); thanks
   to @lholznagel and others who reported the issue, and to @nfantone
   for the rapid fix)

## Changes in v0.5.0

    git log v0.4.2..v0.5.0

 * Port to use bluebird rather than when.js
   ([PR 295](https://github.com/squaremo/amqp.node/pull/295); thanks
   to @nfantone, and special mention to @myndzi for #158)
 * Fixed a problem with using `channel.get` in the callback model
   ([PR 283](https://github.com/squaremo/amqp.node/pull/283); good
   catch, @shanksauce)
 * Added an example that uses generators (thanks @rudijs)
 * Fixed a link in the comments relating to heartbeats (thanks
   @tapickell)

## Changes in v0.4.2

   git log v0.4.1..v0.4.2

 * Better documentation and examples
 * Replace uses of ES6 keyword 'await'

## Changes in v0.4.1

   git log v0.4.0..v0.4.1

 * Tested in Node.JS 0.8 through 4.2 and 5.5
 * Emit an error with the 'close' event if server-initiated

## Changes in v0.4.0

   git log v0.3.2..v0.4.0

 * Tested on Node.JS 0.8 through 4.0 (and intervening io.js releases)
 * Change meaning of 'b' fields in tables to match RabbitMQ (and AMQP
   specification)
 * Can now pass an object in place of connection URL
   ([PR 159](https://github.com/squaremo/amqp.node/pull/159); thanks
   to @ben-page)
 * Operator-initiated connection close no longer results in 'error'
   event
   ([issue 110](https://github.com/squaremo/amqp.node/issues/110))
 * Channel and Connection errors have now a `.code` field with the
   AMQP reply-code, which may help distinguish error cases
   ([PR 150](https://github.com/squaremo/amqp.node/pull/150); thanks
   to @hippich)
 * Connection.close will resolve to an error if the connection is
   already closed
   ([issue 181](https://github.com/squaremo/amqp.node/issues/181))
 * Connection establishment will resolve with an error if the
   TCP-level connection or the handshake times out
   ([PR 169](https://github.com/squaremo/amqp.node/pull/169); thanks
   to @zweifisch and @RoCat, who both submitted fixes)
 * Add the `maxPriority` option as an alias for the `'x-max-priority'`
   queue argument
   ([PR 180](https://github.com/squaremo/amqp.node/pull/180); thanks
   to @ebardes)

## Changes in v0.3.2 (since v0.3.1)

   git log v0.3.1..v0.3.2

 * Make the engine specification more flexible to admit io.js releases

## Changes in v0.3.1 (since v0.3.0)

   git log v0.3.0..v0.3.1

### Fixes

 * Fail in the right way when a channel cannot be allocated [issue
 129](https://github.com/squaremo/amqp.node/issues/129)
 * Make `waitForConfirms` work properly in callback API [PR
   116](https://github.com/squaremo/amqp.node/pull/116)

### Enhancements

 * Two new options while connecting:
   [timeout](https://github.com/squaremo/amqp.node/pull/118) and [keep
   alive](https://github.com/squaremo/amqp.node/pull/125) (thanks to
   @rexxars and @jcrugzz respectively)

## Changes in v0.3.0 (since v0.2.1)

   git log v0.2.1..v0.3.0

### Enhancements

 * Allow additional client properties to be set for a connection
   [Issue 98](https://github.com/squaremo/amqp.node/issues/98) and
   [PR 80](https://github.com/squaremo/amqp.node/pull/80)
 * New method in channel API to wait for all unconfirmed messages
   [Issue 89](https://github.com/squaremo/amqp.node/issues/89)
 * Now supports RabbitMQ's `EXTERNAL` authentication plugin
   [Issue 105](https://github.com/squaremo/amqp.node/issues/105)

## Changes in v0.2.1 (since v0.2.0)

### Fixes

 * Do tuning negotation properly [PR
   84](https://github.com/squaremo/amqp.node/pull/84)

## Changes in v0.2.0 (since v0.1.3)

    git log v0.1.3..v0.2.0

### Fixes

 * Correctly deal with missing fields (issue 48)

### Enhancements

 * Added a callback-oriented API, parallel to the existing,
   promise-oriented API.
 * The response to assertExchange now contains the exchange name,
   analagous to assertQueue (issue 49)
 * The channel method `prefetch` now has a global flag, to be
   [compatible with newer RabbitMQ][rabbitmq-prefetch-global].

## Changes in v0.1.3 (since v0.1.2)

    git log v0.1.2..v0.1.3

### Enhancements

 * Add support in the API for using Basic.Reject rather than
   Basic.Nack, the latter of which is a RabbitMQ extension and not in
   older versions of RabbitMQ.

## Changes in v0.1.2 (since v0.1.1)

    git log v0.1.1..v0.1.2

### Fixes

 * Restore support for publishing zero-length messages

### Enhancements

 * Recognise [authentication failures][rabbitmq-auth-failure]
 * An option to set TCP_NODELAY on connection sockets

## Changes in v0.1.1 (since v0.1.0)

    git log v0.1.0..v0.1.1

### Fixes

 * Safer frame construction, no longer relies on allocating a large,
   fixed-size buffer and hoping it's big enough
 * The ports of RabbitMQ tutorials now avoid a race between publishing
   and closing the connection

### Enhancements

 * Support for RabbitMQ's consumer priority extension
 * Support for RabbitMQ's connnection.blocked extension
 * Better write speed from batching frames for small messages
 * Other minor efficiency gains in method encoding and decoding
 * Channel and connection state errors (e.g., trying to write when
   closed) include a stack trace from when they moved to that state
 * The `arguments` table, passed as an option to some methods, can
   include fields in its prototype chain
 * Provide the more accurately named `persistent` as a near equivalent
   of `deliveryMode`

## Changes in v0.1.0 (since v0.0.2)

    git log v0.0.2..v0.1.0

### Breaking changes

 * Consumer callbacks are invoked with `null` if the consumer is
   cancelled (see
   [RabbitMQ's consumer cancel notification][rabbitmq-consumer-cancel])
 * In confirm channels, instead of `#publish` and `#sendToQueue`
   returning promises, they return a boolean as for normal channels,
   and take a Node.JS-style `function (err, ok)` callback for the
   server ack or nack

### Fixes

 * Overlapping channel and connection close frames are dealt with
   gracefully
 * Exceptions thrown in consumer callbacks are raised as `'error'`
   events
 * Zero-size messages are handled
 * Avoid monkey-patching `Buffer`, and eschew
   `require('util')._extend`

### Enhancements

 * Channels now behave like `Writable` streams with regard to `#publish`
   and `#sendToQueue`, returning a boolean from those methods and
   emitting `'drain'`
 * Connections now multiplex frames from channels fairly
 * Low-level channel machinery is now fully callback-based


[rabbitmq-consumer-cancel]: http://www.rabbitmq.com/consumer-cancel.html
[rabbitmq-auth-failure]: http://www.rabbitmq.com/auth-notification.html
[rabbitmq-prefetch-global]: http://www.rabbitmq.com/consumer-prefetch.html
