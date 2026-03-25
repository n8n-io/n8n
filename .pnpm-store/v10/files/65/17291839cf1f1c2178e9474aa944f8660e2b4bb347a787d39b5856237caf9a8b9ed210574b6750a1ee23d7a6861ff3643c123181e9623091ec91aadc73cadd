[![Build Status](https://secure.travis-ci.org/kriskowal/q.png?branch=master)](http://travis-ci.org/kriskowal/q)

<a href="http://promises-aplus.github.com/promises-spec">
    <img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png"
         align="right" alt="Promises/A+ logo" />
</a>

*:warning: This is Q version 2 and is experimental at this time. If you install
the latest Q from `npm`, you will get the latest from the [version 1][v1]
release train. You will get the lastet of version 2 if you use `npm install
q@~2`. Consult [CHANGES.md][] for details on what has changed*

*Among the significant differences in version 2, the source is CommonJS only and
versions suitable for use with AMD and plain `<script>` tags are built and
published for [download][] with each release.*

[v1]: https://github.com/kriskowal/q/tree/v1
[download]: http://q-releases.s3-website-us-west-1.amazonaws.com/
[CHANGES.md]: https://github.com/kriskowal/q/blob/v2/CHANGES.md

If a function cannot return a value or throw an exception without
blocking, it can return a promise instead.  A promise is an object
that represents the return value or the thrown exception that the
function may eventually provide.  A promise can also be used as a
proxy for a [remote object][Q-Connection] to overcome latency.

[Q-Connection]: https://github.com/kriskowal/q-connection


## Getting Started

The Q module can be loaded as:

-   A ``<script>`` tag (creating a ``Q`` global variable): ~2.5 KB minified and
    gzipped.  Download the latest of [version
    0.9](https://raw.github.com/kriskowal/q/v0.9/q.js)
-   A Node.js and CommonJS module, available in [npm](https://npmjs.org/) as
    the [q](https://npmjs.org/package/q) package
-   An AMD module.  [Download version
    0.9](https://raw.github.com/kriskowal/q/v0.9/q.js)
-   A [component](https://github.com/component/component) as ``microjs/q``
-   Using [bower](http://bower.io/) as ``q``
-   Using [NuGet](http://nuget.org/) as [Q](https://nuget.org/packages/q)

Q can exchange promises with jQuery, Dojo, When.js, WinJS, and more.

## Resources

Our [wiki][] contains a number of useful resources, including:

- A method-by-method [Q API reference][reference].
- A growing [examples gallery][examples], showing how Q can be used to make
  everything better. From XHR to database access to accessing the Flickr API,
  Q is there for you.
- There are many libraries that produce and consume Q promises for everything
  from file system/database access or RPC to templating. For a list of some of
  the more popular ones, see [Libraries][].
- If you want materials that introduce the promise concept generally, and the
  below tutorial isn't doing it for you, check out our collection of
  [presentations, blog posts, and podcasts][resources].
- A guide for those [coming from jQuery's `$.Deferred`][jquery].

We'd also love to have you join the Q-Continuum [mailing list][].

[wiki]: https://github.com/kriskowal/q/wiki
[reference]: https://github.com/kriskowal/q/wiki/API-Reference
[examples]: https://github.com/kriskowal/q/wiki/Examples-Gallery
[Libraries]: https://github.com/kriskowal/q/wiki/Libraries
[resources]: https://github.com/kriskowal/q/wiki/General-Promise-Resources
[jquery]: https://github.com/kriskowal/q/wiki/Coming-from-jQuery
[mailing list]: https://groups.google.com/forum/#!forum/q-continuum


## Introduction

There are many reasons to use promises.  The first reward is that
promises implicitly propagate errors and values downstream.  Consider
this synchronous solution to reading a file and parsing its content.

```javascript
var FS = require("fs");
var readJsonSync = function (path) {
    return JSON.parse(FS.readSync(path, "utf-8"));
};
```

The asynchronous analog would ideally look and behave exactly the same
*except* it would explicitly mark anywhere it might yield to other
tasks, which is to say, between calling and returning, and reading and
parsing.  Control flow constructs like `return`, `throw`, `if`, `for`,
`break` and `continue` would still work, except asynchronously.
Exceptions, such as the `SyntaxError` that `JSON.parse` might throw,
would propagate through the promise graph just as they do through the
synchronous stack.  Forbes Lindesay illustrates the way to this happy
ideal in his presentation, [“Promises and Generators”][PAG].

[PAG]: http://pag.forbeslindesay.co.uk/

```javascript
var FS = require("q-io/fs");
var readJsonPromise = Q.async(function *(path) {
    return JSON.parse(yield FS.read(path));
});
```

Explicitly marking yield points makes it possible for users to take
advantage of the invariant that they can arrange for a consistent
internal state between events, and be guaranteed that only they can
alter their state during an event.  Fibers and threads do not provide
this guarantee, so programmers must work with a heightened sense of
caution—their work may be interrupted and their state modified at any
function call boundary for fibers, or at *any time at all* with threads.

But even without generators, by using promises, we can at least get
exceptions to implicitly propagate asynchronously with very little
noise.

```javascript
var FS = require("q-io/fs");
function readJsonPromise(path) {
    return FS.read(path).then(JSON.parse);
}
```

Compare these solutions to the equivalent using bare callbacks.  It must
use an explicit `try` block to `catch` the exception that `JSON.parse`
might throw and must manually forward all errors to the subscriber.  It
also must take care not to call the subscriber inside the try block,
since this would catch errors thrown by `nodeback` and throw them back
at `nodeback` in the catch block.  In general, writing callback-based
functions that handle errors robustly is difficult and error-prone, and
even if you do it right, rather verbose.

```javascript
var FS = require("fs");
var readJsonWithNodebacks = function (path, nodeback) {
    FS.readFile(path, "utf-8", function (error, content) {
        var result;
        if (error) {
            return nodeback(error);
        }
        try {
            result = JSON.parse(result);
        } catch (error) {
            return nodeback(error);
        }
        nodeback(null, result);
    });
}
```

The second reward for using promises is that they implicitly guarantee
that interfaces you create will be strictly asynchronous.  Oliver
Steele’s [Minimizing Code Paths in Asynchronous Code][Steele] succinctly
captures the issue and Isaac Schlueter’s more recent treatise,
[Designing APIs for Asynchrony][Isaac], reframed the edict as “Do Not
Release Zalgo”.

[Steele]: http://blog.osteele.com/posts/2008/04/minimizing-code-paths-in-asychronous-code
[Isaac]: http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony

If you are using Q, you can cast any promise, even a [jQuery
“promise”][jQuery], into a well-behaved promise that will not call event
handlers until your event is done.

[jQuery]: https://github.com/kriskowal/q/wiki/Coming-from-jQuery

```javascript
var x = 10;
var part1 = Q($.ajax(...))
.then(function () {
    x = 20;
});
var part2 = Q($.ajax(...))
.then(function () {
    x = 30;
});
expect(x).toBe(10); // still, no matter what
```

Using promises also preserves the signatures of synchronous functions.
Continuation passing style is an “inversion of control”, where you pass
control forward instead of getting it back when a function returns.
Promises [un-invert][IOC] the inversion, cleanly separating the input
arguments from control flow arguments.  This simplifies the use and
creation of API’s, particularly variadic, rest and spread arguments.

[IOC]: http://www.slideshare.net/domenicdenicola/callbacks-promises-and-coroutines-oh-my-the-evolution-of-asynchronicity-in-javascript

Another point to using promises is that multiple subscribers can wait
for a result, and new subscribers can be added even after the result has
been published.  Consider how much simpler it would be to wait for
DOMContentLoaded with promises.  No need to worry about whether the
event has already passed.

```javascript
return document.ready.then(setup);
```

Promises go on to be a useful primitive for capturing the “causal graph”
of an asynchronous program, providing “long traces” that capture the
stacks from all the events that led to an exception.  Promises are also
useful as proxies for objects in other processes, pipelining messages
over any inter-process message channel.

The point of promises is that they have scouted the way ahead and will
help you avoid set-backs and dead-ends, from simple problems like
synchronizing local work, to more advanced problems [like distributed
robust secure escrow exchange][MarkM].

[MarkM]: http://scholar.google.com/citations?user=PuP2INoAAAAJ&hl=en&oi=ao


## Tutorial

Promises have a ``then`` method, which you can use to get the eventual
return value (fulfillment) or thrown exception (rejection).

```javascript
promiseMeSomething()
.then(function (value) {
}, function (reason) {
});
```

If ``promiseMeSomething`` returns a promise that gets fulfilled later
with a return value, the first function (the fulfillment handler) will be
called with the value.  However, if the ``promiseMeSomething`` function
gets rejected later by a thrown exception, the second function (the
rejection handler) will be called with the exception.

Note that resolution of a promise is always asynchronous: that is, the
fulfillment or rejection handler will always be called in the next turn of the
event loop (i.e. `process.nextTick` in Node). This gives you a nice
guarantee when mentally tracing the flow of your code, namely that
``then`` will always return before either handler is executed.

In this tutorial, we begin with how to consume and work with promises. We'll
talk about how to create them, and thus create functions like
`promiseMeSomething` that return promises, [below](#the-beginning).


### Propagation

The ``then`` method returns a promise, which in this example, I’m
assigning to ``outputPromise``.

```javascript
var outputPromise = getInputPromise()
.then(function (input) {
}, function (reason) {
});
```

The ``outputPromise`` variable becomes a new promise for the return
value of either handler.  Since a function can only either return a
value or throw an exception, only one handler will ever be called and it
will be responsible for resolving ``outputPromise``.

-   If you return a value in a handler, ``outputPromise`` will get
    fulfilled.

-   If you throw an exception in a handler, ``outputPromise`` will get
    rejected.

-   If you return a **promise** in a handler, ``outputPromise`` will
    “become” that promise.  Being able to become a new promise is useful
    for managing delays, combining results, or recovering from errors.

If the ``getInputPromise()`` promise gets rejected and you omit the
rejection handler, the **error** will go to ``outputPromise``:

```javascript
var outputPromise = getInputPromise()
.then(function (value) {
});
```

If the input promise gets fulfilled and you omit the fulfillment handler, the
**value** will go to ``outputPromise``:

```javascript
var outputPromise = getInputPromise()
.then(null, function (error) {
});
```

Q promises provide a ``fail`` shorthand for ``then`` when you are only
interested in handling the error:

```javascript
var outputPromise = getInputPromise()
.fail(function (error) {
});
```

If you are writing JavaScript for modern engines only or using
CoffeeScript, you may use `catch` instead of `fail`.

Promises also have a ``fin`` function that is like a ``finally`` clause.
The final handler gets called, with no arguments, when the promise
returned by ``getInputPromise()`` either returns a value or throws an
error.  The value returned or error thrown by ``getInputPromise()``
passes directly to ``outputPromise`` unless the final handler fails, and
may be delayed if the final handler returns a promise.

```javascript
var outputPromise = getInputPromise()
.fin(function () {
    // close files, database connections, stop servers, conclude tests
});
```

-   If the handler returns a value, the value is ignored
-   If the handler throws an error, the error passes to ``outputPromise``
-   If the handler returns a promise, ``outputPromise`` gets postponed.  The
    eventual value or error has the same effect as an immediate return
    value or thrown error: a value would be ignored, an error would be
    forwarded.

If you are writing JavaScript for modern engines only or using
CoffeeScript, you may use `finally` instead of `fin`.

### Chaining

There are two ways to chain promises.  You can chain promises either
inside or outside handlers.  The next two examples are equivalent.

```javascript
return getUsername()
.then(function (username) {
    return getUser(username)
    .then(function (user) {
        // if we get here without an error,
        // the value returned here
        // or the exception thrown here
        // resolves the promise returned
        // by the first line
    })
});
```

```javascript
return getUsername()
.then(function (username) {
    return getUser(username);
})
.then(function (user) {
    // if we get here without an error,
    // the value returned here
    // or the exception thrown here
    // resolves the promise returned
    // by the first line
});
```

The only difference is nesting.  It’s useful to nest handlers if you
need to capture multiple input values in your closure.

```javascript
function authenticate() {
    return getUsername()
    .then(function (username) {
        return getUser(username);
    })
    // chained because we will not need the user name in the next event
    .then(function (user) {
        return getPassword()
        // nested because we need both user and password next
        .then(function (password) {
            if (user.passwordHash !== hash(password)) {
                throw new Error("Can't authenticate");
            }
        });
    });
}
```


### Combination

You can turn an array of promises into a promise for the whole,
fulfilled array using ``all``.

```javascript
return Q.all([
    eventualAdd(2, 2),
    eventualAdd(10, 20)
]);
```

If you have a promise for an array, you can use ``spread`` as a
replacement for ``then``.  The ``spread`` function “spreads” the
values over the arguments of the fulfillment handler.  The rejection handler
will get called at the first sign of failure.  That is, whichever of
the received promises fails first gets handled by the rejection handler.

```javascript
function eventualAdd(a, b) {
    return Q.spread([a, b], function (a, b) {
        return a + b;
    })
}
```

But ``spread`` calls ``all`` initially, so you can skip it in chains.

```javascript
return getUsername()
.then(function (username) {
    return [username, getUser(username)];
})
.spread(function (username, user) {
});
```

The ``all`` function returns a promise for an array of values.  When this
promise is fulfilled, the array contains the fulfillment values of the original
promises, in the same order as those promises.  If one of the given promises
is rejected, the returned promise is immediately rejected, not waiting for the
rest of the batch.  If you want to wait for all of the promises to either be
fulfilled or rejected, you can use ``allSettled``.

```javascript
Q.allSettled(promises)
.then(function (results) {
    results.forEach(function (result) {
        if (result.state === "fulfilled") {
            var value = result.value;
        } else {
            var reason = result.reason;
        }
    });
});
```


### Sequences

If you have a number of promise-producing functions that need
to be run sequentially, you can of course do so manually:

```javascript
return foo(initialVal).then(bar).then(baz).then(qux);
```

However, if you want to run a dynamically constructed sequence of
functions, you'll want something like this:

```javascript
var funcs = [foo, bar, baz, qux];

var result = Q(initialVal);
funcs.forEach(function (f) {
    result = result.then(f);
});
return result;
```

You can make this slightly more compact using `reduce` (a
[method][reduce] of arrays introduced in ECMAScript 5):

[reduce]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce

```javascript
return funcs.reduce(function (soFar, f) {
    return soFar.then(f);
}, Q(initialVal));
```

Or, you could use the ultra-compact version:

```javascript
return funcs.reduce(Q.when, Q());
```

### Handling Errors

One sometimes-unintuive aspect of promises is that if you throw an
exception in the fulfillment handler, it will not be caught by the error
handler.

```javascript
return foo()
.then(function (value) {
    throw new Error("Can't bar.");
}, function (error) {
    // We only get here if "foo" fails
});
```

To see why this is, consider the parallel between promises and
``try``/``catch``. We are ``try``-ing to execute ``foo()``: the error
handler represents a ``catch`` for ``foo()``, while the fulfillment handler
represents code that happens *after* the ``try``/``catch`` block.
That code then needs its own ``try``/``catch`` block.

In terms of promises, this means chaining your rejection handler:

```javascript
return foo()
.then(function (value) {
    throw new Error("Can't bar.");
})
.fail(function (error) {
    // We get here with either foo's error or bar's error
});
```

### Progress Notification

It's possible for promises to report their progress, e.g. for tasks that take a
long time like a file upload. Not all promises will implement progress
notifications, but for those that do, you can consume the progress values using
a third parameter to ``then``:

```javascript
return uploadFile()
.then(function () {
    // Success uploading the file
}, function (err) {
    // There was an error, and we get the reason for error
}, function (progress) {
    // We get notified of the upload's progress as it is executed
});
```

Like `fail`, Q also provides a shorthand for progress callbacks
called `progress`:

```javascript
return uploadFile().progress(function (progress) {
    // We get notified of the upload's progress
});
```

### The End

When you get to the end of a chain of promises, you should either
return the last promise or end the chain.  Since handlers catch
errors, it’s an unfortunate pattern that the exceptions can go
unobserved.

So, either return it,

```javascript
return foo()
.then(function () {
    return "bar";
});
```

Or, end it.

```javascript
foo()
.then(function () {
    return "bar";
})
.done();
```

Ending a promise chain makes sure that, if an error doesn’t get
handled before the end, it will get rethrown and reported.

This is a stopgap. We are exploring ways to make unhandled errors
visible without any explicit handling.


### The Beginning

Everything above assumes you get a promise from somewhere else.  This
is the common case.  Every once in a while, you will need to create a
promise from scratch.

#### Using ``Q.fcall``

You can create a promise from a value using ``Q.fcall``.  This returns a
promise for 10.

```javascript
return Q.fcall(function () {
    return 10;
});
```

You can also use ``fcall`` to get a promise for an exception.

```javascript
return Q.fcall(function () {
    throw new Error("Can't do it");
});
```

As the name implies, ``fcall`` can call functions, or even promised
functions.  This uses the ``eventualAdd`` function above to add two
numbers.

```javascript
return Q.fcall(eventualAdd, 2, 2);
```


#### Using Deferreds

If you have to interface with asynchronous functions that are callback-based
instead of promise-based, Q provides a few shortcuts (like ``Q.nfcall`` and
friends). But much of the time, the solution will be to use *deferreds*.

```javascript
var deferred = Q.defer();
FS.readFile("foo.txt", "utf-8", function (error, text) {
    if (error) {
        deferred.reject(new Error(error));
    } else {
        deferred.resolve(text);
    }
});
return deferred.promise;
```

Note that a deferred can be resolved with a value or a promise.  The
``reject`` function is a shorthand for resolving with a rejected
promise.

```javascript
// this:
deferred.reject(new Error("Can't do it"));

// is shorthand for:
var rejection = Q.fcall(function () {
    throw new Error("Can't do it");
});
deferred.resolve(rejection);
```

This is a simplified implementation of ``Q.delay``.

```javascript
function delay(ms) {
    var deferred = Q.defer();
    setTimeout(deferred.resolve, ms);
    return deferred.promise;
}
```

This is a simplified implementation of ``Q.timeout``

```javascript
function timeout(promise, ms) {
    var deferred = Q.defer();
    Q.when(promise, deferred.resolve);
    delay(ms).then(function () {
        deferred.reject(new Error("Timed out"));
    });
    return deferred.promise;
}
```

Finally, you can send a progress notification to the promise with
``deferred.notify``.

For illustration, this is a wrapper for XML HTTP requests in the browser. Note
that a more [thorough][XHR] implementation would be in order in practice.

[XHR]: https://github.com/montagejs/mr/blob/71e8df99bb4f0584985accd6f2801ef3015b9763/browser.js#L29-L73

```javascript
function requestOkText(url) {
    var request = new XMLHttpRequest();
    var deferred = Q.defer();

    request.open("GET", url, true);
    request.onload = onload;
    request.onerror = onerror;
    request.onprogress = onprogress;
    request.send();

    function onload() {
        if (request.status === 200) {
            deferred.resolve(request.responseText);
        } else {
            deferred.reject(new Error("Status code was " + request.status));
        }
    }

    function onerror() {
        deferred.reject(new Error("Can't XHR " + JSON.stringify(url)));
    }

    function onprogress(event) {
        deferred.notify(event.loaded / event.total);
    }

    return deferred.promise;
}
```

Below is an example of how to use this ``requestOkText`` function:

```javascript
requestOkText("http://localhost:3000")
.then(function (responseText) {
    // If the HTTP response returns 200 OK, log the response text.
    console.log(responseText);
}, function (error) {
    // If there's an error or a non-200 status code, log the error.
    console.error(error);
}, function (progress) {
    // Log the progress as it comes in.
    console.log("Request progress: " + Math.round(progress * 100) + "%");
});
```

### The Middle

If you are using a function that may return a promise, but just might
return a value if it doesn’t need to defer, you can use the “static”
methods of the Q library.

The ``when`` function is the static equivalent for ``then``.

```javascript
return Q.when(valueOrPromise, function (value) {
}, function (error) {
});
```

All of the other methods on a promise have static analogs with the
same name.

The following are equivalent:

```javascript
return Q.all([a, b]);
```

```javascript
return Q.fcall(function () {
    return [a, b];
})
.all();
```

When working with promises provided by other libraries, you should
convert it to a Q promise.  Not all promise libraries make the same
guarantees as Q and certainly don’t provide all of the same methods.
Most libraries only provide a partially functional ``then`` method.
This thankfully is all we need to turn them into vibrant Q promises.

```javascript
return Q($.ajax(...))
.then(function () {
});
```

If there is any chance that the promise you receive is not a Q promise
as provided by your library, you should wrap it using a Q function.
You can even use ``Q.invoke`` as a shorthand.

```javascript
return Q.invoke($, 'ajax', ...)
.then(function () {
});
```


### Over the Wire

A promise can serve as a proxy for another object, even a remote
object.  There are methods that allow you to optimistically manipulate
properties or call functions.  All of these interactions return
promises, so they can be chained.

```
direct manipulation         using a promise as a proxy
--------------------------  -------------------------------
value.foo                   promise.get("foo")
value.foo = value           promise.put("foo", value)
delete value.foo            promise.del("foo")
value.foo(...args)          promise.post("foo", [args])
value.foo(...args)          promise.invoke("foo", ...args)
value(...args)              promise.fapply([args])
value(...args)              promise.fcall(...args)
```

If the promise is a proxy for a remote object, you can shave
round-trips by using these functions instead of ``then``.  To take
advantage of promises for remote objects, check out [Q-Connection][].

[Q-Connection]: https://github.com/kriskowal/q-connection

Even in the case of non-remote objects, these methods can be used as
shorthand for particularly-simple fulfillment handlers. For example, you
can replace

```javascript
return Q.fcall(function () {
    return [{ foo: "bar" }, { foo: "baz" }];
})
.then(function (value) {
    return value[0].foo;
});
```

with

```javascript
return Q.fcall(function () {
    return [{ foo: "bar" }, { foo: "baz" }];
})
.get(0)
.get("foo");
```


### Adapting Node

If you're working with functions that make use of the Node.js callback pattern,
where callbacks are in the form of `function(err, result)`, Q provides a few
useful utility functions for converting between them. The most straightforward
are probably `Q.nfcall` and `Q.nfapply` ("Node function call/apply") for calling
Node.js-style functions and getting back a promise:

```javascript
return Q.nfcall(FS.readFile, "foo.txt", "utf-8");
return Q.nfapply(FS.readFile, ["foo.txt", "utf-8"]);
```

If you are working with methods, instead of simple functions, you can easily
run in to the usual problems where passing a method to another function—like
`Q.nfcall`—"un-binds" the method from its owner. To avoid this, you can either
use `Function.prototype.bind` or some nice shortcut methods we provide:

```javascript
return Q.ninvoke(redisClient, "get", "user:1:id");
return Q.npost(redisClient, "get", ["user:1:id"]);
```

You can also create reusable wrappers with `Q.denodeify` or `Q.nbind`:

```javascript
var readFile = Q.denodeify(FS.readFile);
return readFile("foo.txt", "utf-8");

var redisClientGet = Q.nbind(redisClient.get, redisClient);
return redisClientGet("user:1:id");
```

Finally, if you're working with raw deferred objects, there is a
`makeNodeResolver` method on deferreds that can be handy:

```javascript
var deferred = Q.defer();
FS.readFile("foo.txt", "utf-8", deferred.makeNodeResolver());
return deferred.promise;
```

### Long Stack Traces

Q comes with optional support for “long stack traces,” wherein the `stack`
property of `Error` rejection reasons is rewritten to be traced along
asynchronous jumps instead of stopping at the most recent one. As an example:

```js
function theDepthsOfMyProgram() {
  Q.delay(100).done(function explode() {
    throw new Error("boo!");
  });
}

theDepthsOfMyProgram();
```

usually would give a rather unhelpful stack trace looking something like

```
Error: boo!
    at explode (/path/to/test.js:3:11)
    at _fulfilled (/path/to/test.js:q:54)
    at resolvedValue.promiseDispatch.done (/path/to/q.js:823:30)
    at makePromise.promise.promiseDispatch (/path/to/q.js:496:13)
    at pending (/path/to/q.js:397:39)
    at process.startup.processNextTick.process._tickCallback (node.js:244:9)
```

But, if you turn this feature on by setting

```js
Q.longStackSupport = true;
```

then the above code gives a nice stack trace to the tune of

```
Error: boo!
    at explode (/path/to/test.js:3:11)
From previous event:
    at theDepthsOfMyProgram (/path/to/test.js:2:16)
    at Object.<anonymous> (/path/to/test.js:7:1)
```

Note how you can see the the function that triggered the async operation in the
stack trace! This is very helpful for debugging, as otherwise you end up getting
only the first line, plus a bunch of Q internals, with no sign of where the
operation started.

This feature does come with somewhat-serious performance and memory overhead,
however. If you're working with lots of promises, or trying to scale a server
to many users, you should probably keep it off. But in development, go for it!

## License

Copyright 2009–2013 Kristopher Michael Kowal
MIT License (enclosed)

