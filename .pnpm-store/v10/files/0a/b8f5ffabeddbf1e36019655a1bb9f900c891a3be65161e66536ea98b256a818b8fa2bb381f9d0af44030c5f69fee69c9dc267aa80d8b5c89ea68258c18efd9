# Controlling Flow: callbacks are easy

## What's actually hard?

- Doing a bunch of things in a specific order.
- Knowing when stuff is done.
- Handling failures.
- Breaking up functionality into parts (avoid nested inline callbacks)


## Common Mistakes

- Abandoning convention and consistency.
- Putting all callbacks inline.
- Using libraries without grokking them.
- Trying to make async code look sync.

## Define Conventions

- Two kinds of functions: *actors* take action, *callbacks* get results.
- Essentially the continuation pattern. Resulting code *looks* similar
  to fibers, but is *much* simpler to implement.
- Node works this way in the lowlevel APIs already, and it's very ﬂexible.

## Callbacks

- Simple responders
- Must always be prepared to handle errors, that's why it's the first argument.
- Often inline anonymous, but not always.
- Can trap and call other callbacks with modified data, or pass errors upwards.

## Actors

- Last argument is a callback.
- If any error occurs, and can't be handled, pass it to the callback and return.
- Must not throw. Return value ignored.
- return x ==> return cb(null, x)
- throw er ==> return cb(er)

```javascript
// return true if a path is either
// a symlink or a directory.
function isLinkOrDir (path, cb) {
  fs.lstat(path, function (er, s) {
    if (er) return cb(er)
    return cb(null, s.isDirectory() || s.isSymbolicLink())
  })
}
```

# asyncMap

## Usecases

- I have a list of 10 files, and need to read all of them, and then continue when they're all done.
- I have a dozen URLs, and need to fetch them all, and then continue when they're all done.
- I have 4 connected users, and need to send a message to all of them, and then continue when that's done.
- I have a list of n things, and I need to dosomething with all of them, in parallel, and get the results once they're all complete.


## Solution

```javascript
var asyncMap = require("slide").asyncMap
function writeFiles (files, what, cb) {
  asyncMap(files, function (f, cb) {
    fs.writeFile(f, what, cb)
  }, cb)
}
writeFiles([my, file, list], "foo", cb)
```

# chain

## Usecases

- I have to do a bunch of things, in order. Get db credentials out of a file,
  read the data from the db, write that data to another file.
- If anything fails, do not continue.
- I still have to provide an array of functions, which is a lot of boilerplate,
  and a pita if your functions take args like

```javascript
function (cb) {
  blah(a, b, c, cb)
}
```

- Results are discarded, which is a bit lame.
- No way to branch.

## Solution

- reduces boilerplate by converting an array of [fn, args] to an actor
  that takes no arguments (except cb)
- A bit like Function#bind, but tailored for our use-case.
- bindActor(obj, "method", a, b, c)
- bindActor(fn, a, b, c)
- bindActor(obj, fn, a, b, c)
- branching, skipping over falsey arguments

```javascript
chain([
  doThing && [thing, a, b, c]
, isFoo && [doFoo, "foo"]
, subChain && [chain, [one, two]]
], cb)
```

- tracking results: results are stored in an optional array passed as argument,
  last result is always in results[results.length - 1].
- treat chain.first and chain.last as placeholders for the first/last
  result up until that point.


## Non-trivial example

- Read number files in a directory
- Add the results together
- Ping a web service with the result
- Write the response to a file
- Delete the number files

```javascript
var chain = require("slide").chain
function myProgram (cb) {
  var res = [], last = chain.last, first = chain.first
  chain([
    [fs, "readdir", "the-directory"]
  , [readFiles, "the-directory", last]
  , [sum, last]
  , [ping, "POST", "example.com", 80, "/foo", last]
  , [fs, "writeFile", "result.txt", last]
  , [rmFiles, "./the-directory", first]
  ], res, cb)
}
```

# Conclusion: Convention Profits

- Consistent API from top to bottom.
- Sneak in at any point to inject functionality. Testable, reusable, ...
- When ruby and python users whine, you can smile condescendingly.
