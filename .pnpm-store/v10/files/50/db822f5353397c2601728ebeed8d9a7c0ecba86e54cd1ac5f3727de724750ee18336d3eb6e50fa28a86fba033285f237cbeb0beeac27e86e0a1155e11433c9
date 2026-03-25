/**
Strip the final [newline character](https://en.wikipedia.org/wiki/Newline) from a string or Uint8Array.

@returns The input without any final newline.

@example
```
import stripFinalNewline from 'strip-final-newline';

stripFinalNewline('foo\nbar\n\n');
//=> 'foo\nbar\n'

const uint8Array = new TextEncoder().encode('foo\nbar\n\n')
new TextDecoder().decode(stripFinalNewline(uint8Array));
//=> 'foo\nbar\n'
```
*/
export default function stripFinalNewline<T extends string | Uint8Array>(input: T): T;
