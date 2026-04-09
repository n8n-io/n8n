/**
Strip leading whitespace from each line in a string.

The line with the least number of leading whitespace, ignoring empty lines, determines the number to remove.

@example
```
import stripIndent from 'strip-indent';

const string = '\tunicorn\n\t\tcake';
//	unicorn
//		cake

stripIndent(string);
//unicorn
//	cake
```
*/
export default function stripIndent(string: string): string;

/**
Strip leading whitespace from each line in a string and remove surrounding blank lines.

The line with the least number of leading whitespace, ignoring empty lines, determines the number to remove.
Leading and trailing lines that contain only whitespace are removed.

Useful for template literals and multi-line strings where you want clean boundaries.

@example
```
import {dedent} from 'strip-indent';

dedent(`
	unicorn
		cake
`);
//unicorn
//	cake
```
*/
export function dedent(string: string): string;
