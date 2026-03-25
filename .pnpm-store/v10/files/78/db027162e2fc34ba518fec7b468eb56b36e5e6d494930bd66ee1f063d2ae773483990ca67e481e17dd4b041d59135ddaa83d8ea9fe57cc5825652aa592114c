# crlf-normalize

> Detect and Normalize the newline characters

`npm install crlf-normalize`

## demo

```ts
import { crlf, chkcrlf, LF, CRLF, CR } from 'crlf-normalize';

let text = 'foo\r\nbar\nbaz\r';

console.log([
	crlf(text, LF),
	crlf(text, CRLF),
	crlf(text, CR),
]);

console.log(chkcrlf(text));

/*
[ 'foo\nbar\nbaz\n', 'foo\r\nbar\r\nbaz\r\n', 'foo\rbar\rbaz\r' ]
{ lf: true, crlf: true, cr: true }
*/
```

### crlf_unicode_normalize(text: string, newline: string = LF)

```ts
function crlf_unicode_normalize(text: string, newline: string = LF): string
{
	const ln3 = newline + newline + newline;
	const ln2 = newline + newline;

	return text
		.replace(/\u000C/g, ln3)
		.replace(/\u2028/g, newline)
		.replace(/\u2029/g, ln2)
	;
}
```
