/**
Get the real length of a string - by correctly counting astral symbols and ignoring [ansi escape codes](https://github.com/sindresorhus/strip-ansi).

`String#length` erroneously counts [astral symbols](https://web.archive.org/web/20150721114550/http://www.tlg.uci.edu/~opoudjis/unicode/unicode_astral.html) as two characters.

@example
```
import stringLength = require('string-length');

'🐴'.length;
//=> 2

stringLength('🐴');
//=> 1

stringLength('\u001B[1municorn\u001B[22m');
//=> 7
```
*/
declare function stringLength(string: string): number;

export = stringLength;
