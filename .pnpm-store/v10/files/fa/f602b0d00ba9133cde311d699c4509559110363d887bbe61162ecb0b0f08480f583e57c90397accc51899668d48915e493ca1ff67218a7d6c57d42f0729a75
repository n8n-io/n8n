/**
Escape a string for use in HTML.

Escapes the following characters in the given `string` argument: `&` `<` `>` `"` `'`.

@example
```
import {htmlEscape} from 'escape-goat';

htmlEscape('🦄 & 🐐');
//=> '🦄 &amp; 🐐'

htmlEscape('Hello <em>World</em>');
//=> 'Hello &lt;em&gt;World&lt;/em&gt;'
```
*/
export function htmlEscape(string: string): string;

/**
Unescape an HTML string to use as a plain string.

Unescapes the following HTML entities in the given `htmlString` argument: `&amp;` `&lt;` `&gt;` `&quot;` `&#39;`.

@example
```
import {htmlUnescape} from 'escape-goat';

htmlUnescape('🦄 &amp; 🐐');
//=> '🦄 & 🐐'
```
*/
export function htmlUnescape(htmlString: string): string;

/**
[Tagged template literal](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Template_literals#Tagged_template_literals) that escapes interpolated values.

@example
```
import {htmlEscape} from 'escape-goat';

const url = 'https://sindresorhus.com?x="🦄"';

htmlEscape`<a href="${url}">Unicorn</a>`;
//=> '<a href="https://sindresorhus.com?x=&quot;🦄&quot;">Unicorn</a>'
```
*/
export function htmlEscape(template: TemplateStringsArray, ...substitutions: readonly unknown[]): string;

/**
[Tagged template literal](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Template_literals#Tagged_template_literals) that unescapes interpolated values.

@example
```
import {htmlUnescape} from 'escape-goat';

const escapedUrl = 'https://sindresorhus.com?x=&quot;🦄&quot;';

htmlUnescape`URL from HTML: ${url}`;
//=> 'URL from HTML: https://sindresorhus.com?x="🦄"'
```
*/
export function htmlUnescape(template: TemplateStringsArray, ...substitutions: readonly unknown[]): string;
