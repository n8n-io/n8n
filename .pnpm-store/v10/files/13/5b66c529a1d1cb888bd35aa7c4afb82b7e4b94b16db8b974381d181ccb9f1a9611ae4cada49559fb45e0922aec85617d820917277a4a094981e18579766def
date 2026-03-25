# strip-final-newline

> Strip the final [newline character](https://en.wikipedia.org/wiki/Newline) from a string or Uint8Array.

This can be useful when parsing the output of, for example, `ChildProcess#execFile()`, as [binaries usually output a newline at the end](https://stackoverflow.com/questions/729692/why-should-text-files-end-with-a-newline). You cannot use `stdout.trimEnd()` for this as it removes all trailing newlines and whitespaces at the end.

## Install

```sh
npm install strip-final-newline
```

## Usage

```js
import stripFinalNewline from 'strip-final-newline';

stripFinalNewline('foo\nbar\n\n');
//=> 'foo\nbar\n'

const uint8Array = new TextEncoder().encode('foo\nbar\n\n')
new TextDecoder().decode(stripFinalNewline(uint8Array));
//=> 'foo\nbar\n'
```

## Performance

When using an `Uint8Array`, the original value is referenced, not copied. This is much more efficient, requires almost no memory, and remains milliseconds fast even on very large inputs.

If you'd like to ensure that modifying the return value does not also modify the value passed as input, please use `.slice()`.

```js
const value = new TextDecoder().decode(stripFinalNewline(uint8Array).slice());
```
