# sourcemap-codec

Encode/decode the `mappings` property of a [sourcemap](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit).


## Why?

Sourcemaps are difficult to generate and manipulate, because the `mappings` property – the part that actually links the generated code back to the original source – is encoded using an obscure method called [Variable-length quantity](https://en.wikipedia.org/wiki/Variable-length_quantity). On top of that, each segment in the mapping contains offsets rather than absolute indices, which means that you can't look at a segment in isolation – you have to understand the whole sourcemap.

This package makes the process slightly easier.


## Installation

```bash
npm install sourcemap-codec
```


## Usage

```js
import { encode, decode } from 'sourcemap-codec';

var decoded = decode( ';EAEEA,EAAE,EAAC,CAAE;ECQY,UACC' );

assert.deepEqual( decoded, [
	// the first line (of the generated code) has no mappings,
	// as shown by the starting semi-colon (which separates lines)
	[],

	// the second line contains four (comma-separated) segments
	[
		// segments are encoded as you'd expect:
		// [ generatedCodeColumn, sourceIndex, sourceCodeLine, sourceCodeColumn, nameIndex ]

		// i.e. the first segment begins at column 2, and maps back to the second column
		// of the second line (both zero-based) of the 0th source, and uses the 0th
		// name in the `map.names` array
		[ 2, 0, 2, 2, 0 ],

		// the remaining segments are 4-length rather than 5-length,
		// because they don't map a name
		[ 4, 0, 2, 4 ],
		[ 6, 0, 2, 5 ],
		[ 7, 0, 2, 7 ]
	],

	// the final line contains two segments
	[
		[ 2, 1, 10, 19 ],
		[ 12, 1, 11, 20 ]
	]
]);

var encoded = encode( decoded );
assert.equal( encoded, ';EAEEA,EAAE,EAAC,CAAE;ECQY,UACC' );
```


# License

MIT
