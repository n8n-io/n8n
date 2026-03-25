export interface Options {
	/**
	Count [ambiguous width characters](https://www.unicode.org/reports/tr11/#Ambiguous) as having narrow width (count of 1) instead of wide width (count of 2).

	@default true
	*/
	readonly ambiguousIsNarrow: boolean;
}

/**
Get the visual width of a string - the number of columns required to display it.

Some Unicode characters are [fullwidth](https://en.wikipedia.org/wiki/Halfwidth_and_fullwidth_forms) and use double the normal width. [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) are stripped and doesn't affect the width.

@example
```
import stringWidth from 'string-width';

stringWidth('a');
//=> 1

stringWidth('古');
//=> 2

stringWidth('\u001B[1m古\u001B[22m');
//=> 2
```
*/
export default function stringWidth(string: string, options?: Options): number;
