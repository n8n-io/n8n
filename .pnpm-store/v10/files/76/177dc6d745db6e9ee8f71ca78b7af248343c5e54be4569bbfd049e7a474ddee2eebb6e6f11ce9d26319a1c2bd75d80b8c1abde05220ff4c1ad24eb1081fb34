export interface Options {
	/**
	The string to use for the indent.

	@default ' '
	*/
	readonly indent?: string;

	/**
	Also indent empty lines.

	@default false
	*/
	readonly includeEmptyLines?: boolean;
}

/**
Indent each line in a string.

@param string - The string to indent.
@param count - How many times you want `options.indent` repeated. Default: `1`.

@example
```
import indentString from 'indent-string';

indentString('Unicorns\nRainbows', 4);
//=> '    Unicorns\n    Rainbows'

indentString('Unicorns\nRainbows', 4, {indent: '♥'});
//=> '♥♥♥♥Unicorns\n♥♥♥♥Rainbows'
```
*/
export default function indentString(
	string: string,
	count?: number,
	options?: Options
): string;
