# propagate

[![npm](https://img.shields.io/npm/v/nock.svg?style=flat-square)][npmjs]
[![Build Status](https://img.shields.io/travis/nock/propagate/master.svg?style=flat-square)][build]
[![Coverage](https://img.shields.io/coveralls/github/nock/propagate.svg?style=flat-square)][coverage]

[npmjs]: https://www.npmjs.com/package/propagate
[build]: https://travis-ci.org/nock/propagate
[coverage]: https://coveralls.io/github/nock/propagate

Propagate events from one event emitter into another.

## Install

```bash
$ npm install propagate
```

## Propagate

```javascript
var ee1 = new EventEmitter()
var ee2 = new EventEmitter()
propagate(ee1, ee2)

ee2.on('event', function(a, b) {
  console.log('got propagated event', a, b)
})

ee1.emit('event', 'a', 'b')
```

## Unpropagate

You can unpropagate by ending the propagation like this:

```javascript
var ee1 = new EventEmitter()
var ee2 = new EventEmitter()
var p = propagate(ee1, ee2)

// ...

p.end()
```

## Only propagate certain events:

```javascript
var ee1 = new EventEmitter()
var ee2 = new EventEmitter()
var p = propagate(['event1', 'event2'], ee1, ee2)
```

## Propagate certain events as other events:

```javascript
var ee1 = new EventEmitter()
var ee2 = new EventEmitter()
var p = propagate(
  {
    event1: 'other-event1',
    event2: 'other-event2',
  },
  ee1,
  ee2
)
```

# License

MIT
