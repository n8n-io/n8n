commist
=======

Build command line application with multiple commands the easy way.
To be used with [minimist](http://npm.im/minimist).

```js
'use strict'

const program = require('commist')()
const result = program
  .register('abcd', function(args) {
    console.log('just do', args)
  })
  .register({ command: 'restore', equals: true }, function(args) {
    console.log('restore', args)
  })
  .register('args', function(args) {
    args = minimist(args)
    console.log('just do', args)
  })
  .register('abcde code', function(args) {
    console.log('doing something', args)
  })
  .register('another command', function(args) {
    console.log('anothering', args)
  })
  .parse(process.argv.splice(2))

if (result) {
  console.log('no command called, args', result)
}
```

To handle `async` operations, use `parseAsync` instead,
which let you await on registered commands execution.

```js
'use strict'

const program = require('commist')()

const result = await program
  .register('abcd', async function(args) {
    await executeCommand(args)
    await doOtherStuff()
  })
  .parseAsync(process.argv.splice(2))

if (result) {
  console.log('no command called, args', result)
}
```

When calling _commist_ programs, you can abbreviate down to three char
words. In the above example, these are valid commands:

```
node example.js abc
node example.js abc cod
node example.js anot comm
```

Moreover, little spelling mistakes are corrected too:

```
node example.js abcs cod
```

If you want that the command must be strict equals, you can register the
command with the json configuration:

```js
  program.register({ command: 'restore', strict: true }, function(args) {
    console.log('restore', args)
  })
```

If you want to limit the maximum levenshtein distance of your commands,
you can use `maxDistance: 2`:

```js
const program = require('commist')()
const minimist = require('minimist')

const result = program
  .register('abcd', function(args) {
    console.log('just do', args)
  })
  .register({ command: 'restore', equals: true }, function(args) {
    console.log('restore', args)
  })
  .register('args', function(args) {
    args = minimist(args)
    console.log('just do', args)
  })
  .register('abcde code', function(args) {
    console.log('doing something', args)
  })
  .register('another command', function(args) {
    console.log('anothering', args)
  })
  .parse(process.argv.splice(2))

if (result) {
  console.log('no command called, args', result)
}
```

License
-------

MIT
