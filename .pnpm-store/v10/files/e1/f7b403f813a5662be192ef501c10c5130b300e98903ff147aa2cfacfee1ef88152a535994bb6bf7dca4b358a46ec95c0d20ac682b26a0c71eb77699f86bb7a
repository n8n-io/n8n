# immediate [![Build Status](https://travis-ci.org/calvinmetcalf/immediate.svg?branch=master)](https://travis-ci.org/calvinmetcalf/immediate)

```
npm install immediate --save
```

then

```js
var immediate = require("immediate");

immediate(function () {
  // this will run soon
});

immediate(function (arg1, arg2) {
  // get your args like in iojs
}, thing1, thing2);
```

## Introduction

**immediate** is a microtask library, decended from [NobleJS's setImmediate](https://github.com/NobleJS/setImmediate), but including ideas from [Cujo's When](https://github.com/cujojs/when) and [RSVP][RSVP].

immediate takes the tricks from setImmedate and RSVP and combines them with the schedualer inspired (vaugly) by whens.

Note versions 2.6.5 and earlier were strictly speaking a 'macrotask' library not a microtask one, [see this for the difference](https://github.com/YuzuJS/setImmediate#macrotasks-and-microtasks), if you need a macrotask library, [I got you covered](https://github.com/calvinmetcalf/macrotask).

Several new features were added in versions 3.1.0 and 3.2.0 to maintain parity with
process.nextTick, but the 3.0.x series is still being kept up to date if you just need
the small barebones version.


## The Tricks

### `process.nextTick`

Note that we check for *actual* Node.js environments, not emulated ones like those produced by browserify or similar.

### `MutationObserver`

This is what [RSVP][RSVP] uses, it's very fast, details on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver).


### `MessageChannel`

Unfortunately, `postMessage` has completely different semantics inside web workers, and so cannot be used there. So we
turn to [`MessageChannel`][MessageChannel], which has worse browser support, but does work inside a web worker.

### `<script> onreadystatechange`

For our last trick, we pull something out to make things fast in Internet Explorer versions 6 through 8: namely,
creating a `<script>` element and firing our calls in its `onreadystatechange` event. This does execute in a future
turn of the event loop, and is also faster than `setTimeout(…, 0)`, so hey, why not?

## Tricks we don't use

### `setImmediate`
We avoid this process.nextTick in node is better suited to our needs and in Internet Explorer 10 there is a broken version of setImmediate we avoid using this.


In Node.js, do

```
npm install immediate
```

then

```js
var immediate = require("immediate");
```


## Reference and Reading

 * [Efficient Script Yielding W3C Editor's Draft][spec]
 * [W3C mailing list post introducing the specification][list-post]
 * [IE Test Drive demo][ie-demo]
 * [Introductory blog post by Nicholas C. Zakas][ncz]
 * I wrote a couple blog pots on this, [part 1][my-blog-1] and [part 2][my-blog-2]

[RSVP]: https://github.com/tildeio/rsvp.js
[spec]: https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/setImmediate/Overview.html
[list-post]: http://lists.w3.org/Archives/Public/public-web-perf/2011Jun/0100.html
[ie-demo]: http://ie.microsoft.com/testdrive/Performance/setImmediateSorting/Default.html
[ncz]: http://www.nczonline.net/blog/2011/09/19/script-yielding-with-setimmediate/
[nextTick]: http://nodejs.org/docs/v0.8.16/api/process.html#process_process_nexttick_callback
[postMessage]: http://www.whatwg.org/specs/web-apps/current-work/multipage/web-messaging.html#posting-messages
[MessageChannel]: http://www.whatwg.org/specs/web-apps/current-work/multipage/web-messaging.html#channel-messaging
[cross-browser-demo]: http://calvinmetcalf.github.io/setImmediate-shim-demo
[my-blog-1]:http://calvinmetcalf.com/post/61672207151/setimmediate-etc
[my-blog-2]:http://calvinmetcalf.com/post/61761231881/javascript-schedulers
