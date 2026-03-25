# array-hyper-unique

    Get unique values of an array. Really, like deeply unique.

[API](index.d.ts)

1. this module base on [arr-unique](https://www.npmjs.com/package/arr-unique)
2. but rewrite to typescript and bug fix
3. also add option control
4. see [_data.ts](test/_data.ts) and [test.test.ts](test/test.test.ts) or [lib.chk.ts](test/lib.chk.ts)

```json5
{ 'array-hyper-unique': { success: 15, fail: 0, error: 0 },
  'array-unique-deep': { success: 11, fail: 4, error: 0 },
  'array-uniq': { success: 7, fail: 8, error: 0 },
  'just-unique': { success: 7, fail: 8, error: 0 },
  'arr-unique': { success: 7, fail: 8, error: 0 },
  'lodash.uniq': { success: 7, fail: 8, error: 0 },
  'array-unique': { success: 6, fail: 9, error: 0 },
  '@arr/unique': { success: 6, fail: 9, error: 0 },
  'tfk-unique-array': { success: 5, fail: 6, error: 4 } }
```

## demo

[demo.ts](test/demo.ts)

```ts
import { array_unique, default as lazy_unique } from 'array-hyper-unique';

_testIt([
		1,
		0,
		true,
		undefined,
		null,
		false,
		['a', 'b', 'c'],
		['a', 'b', 'c'],
		['a', 'c', 'b'],
		{ a: { b: 2 } },
		{ a: { b: 2 } },
		{ a: { b: 3 } },
		{ a: { b: undefined } },
		{ a: {  } },
		{ a: { b: 3, c: undefined } },
	])
;

_testIt(
	[{a: {b: 2}}, {a: {b: 2}}, {a: {b: 3}}],
);

_testIt(
	[1, 2, 3, 3],
);

_testIt(
	[['a', 'b', 'c'], ['a', 'b', 'c'],],
);

function _testIt(data)
{
	let actual = array_unique(data);

	let actual2;

	if (Array.isArray(data))
	{
		actual2 = lazy_unique(...data);
	}
	else
	{
		actual2 = lazy_unique(data);
	}

	console.log(`========= input =========`);

	console.dir(data);

	console.log(`--------- array_unique ---------`);
	console.dir(actual);

	console.log(`--------- lazy_unique ---------`);
	console.dir(actual2);
}
```

```ts
========= input =========
[ 1,
  0,
  true,
  undefined,
  null,
  false,
  [ 'a', 'b', 'c' ],
  [ 'a', 'b', 'c' ],
  [ 'a', 'c', 'b' ],
  { a: { b: 2 } },
  { a: { b: 2 } },
  { a: { b: 3 } },
  { a: { b: undefined } },
  { a: {} },
  { a: { b: 3, c: undefined } } ]
--------- array_unique ---------
[ 1,
  0,
  true,
  undefined,
  null,
  false,
  [ 'a', 'b', 'c' ],
  [ 'a', 'c', 'b' ],
  { a: { b: 2 } },
  { a: { b: 3 } },
  { a: { b: undefined } },
  { a: {} },
  { a: { b: 3, c: undefined } } ]
--------- lazy_unique ---------
[ 1,
  0,
  true,
  undefined,
  null,
  false,
  [ 'a', 'b', 'c' ],
  [ 'a', 'c', 'b' ],
  { a: { b: 2 } },
  { a: { b: 3 } },
  { a: { b: undefined } },
  { a: {} },
  { a: { b: 3, c: undefined } } ]
========= input =========
[ { a: { b: 2 } }, { a: { b: 2 } }, { a: { b: 3 } } ]
--------- array_unique ---------
[ { a: { b: 2 } }, { a: { b: 3 } } ]
--------- lazy_unique ---------
[ { a: { b: 2 } }, { a: { b: 3 } } ]
========= input =========
[ 1, 2, 3, 3 ]
--------- array_unique ---------
[ 1, 2, 3 ]
--------- lazy_unique ---------
[ 1, 2, 3 ]
========= input =========
[ [ 'a', 'b', 'c' ], [ 'a', 'b', 'c' ] ]
--------- array_unique ---------
[ [ 'a', 'b', 'c' ] ]
--------- lazy_unique ---------
[ [ 'a', 'b', 'c' ] ]
```

## options

```ts
array_unique(arr_input, {
	checker(element, array, arr_new, arr_old)
	{
		let bool: boolean;
		
		// do equal check
		
		return bool;
	},
	
	// overwrite source array
	overwrite: true,
})
```

## diff with other module

[lib.chk.ts](test/lib.chk.ts)

```
[LOG] main mixin test
--------------
[SUCCESS] array-hyper-unique
[FAIL] array-uniq
[FAIL] array-unique
[FAIL] @arr/unique
[ERROR] tfk-unique-array Unexpected token u in JSON at position 0
[FAIL] just-unique
[FAIL] arr-unique
[FAIL] array-unique-deep
[FAIL] lodash.uniq


[LOG] object
--------------
[SUCCESS] array-hyper-unique
[FAIL] array-uniq
[FAIL] array-unique
[FAIL] @arr/unique
[SUCCESS] tfk-unique-array
[FAIL] just-unique
[SUCCESS] arr-unique
[SUCCESS] array-unique-deep
[FAIL] lodash.uniq


[LOG] number
--------------
[SUCCESS] array-hyper-unique
[SUCCESS] array-uniq
[SUCCESS] array-unique
[SUCCESS] @arr/unique
[SUCCESS] tfk-unique-array
[SUCCESS] just-unique
[SUCCESS] arr-unique
[SUCCESS] array-unique-deep
[SUCCESS] lodash.uniq


[LOG] number 2
--------------
[SUCCESS] array-hyper-unique
[SUCCESS] array-uniq
[FAIL] array-unique
[FAIL] @arr/unique
[FAIL] tfk-unique-array
[SUCCESS] just-unique
[FAIL] arr-unique
[SUCCESS] array-unique-deep
[SUCCESS] lodash.uniq


[LOG] string
--------------
[SUCCESS] array-hyper-unique
[SUCCESS] array-uniq
[SUCCESS] array-unique
[SUCCESS] @arr/unique
[SUCCESS] tfk-unique-array
[SUCCESS] just-unique
[SUCCESS] arr-unique
[SUCCESS] array-unique-deep
[SUCCESS] lodash.uniq


[LOG] string[]
--------------
[SUCCESS] array-hyper-unique
[FAIL] array-uniq
[FAIL] array-unique
[FAIL] @arr/unique
[SUCCESS] tfk-unique-array
[FAIL] just-unique
[FAIL] arr-unique
[SUCCESS] array-unique-deep
[FAIL] lodash.uniq


[LOG] RegExp
--------------
[SUCCESS] array-hyper-unique
[FAIL] array-uniq
[FAIL] array-unique
[FAIL] @arr/unique
[FAIL] tfk-unique-array
[FAIL] just-unique
[FAIL] arr-unique
[SUCCESS] array-unique-deep
[FAIL] lodash.uniq


[LOG] boolean
--------------
[SUCCESS] array-hyper-unique
[SUCCESS] array-uniq
[SUCCESS] array-unique
[SUCCESS] @arr/unique
[SUCCESS] tfk-unique-array
[SUCCESS] just-unique
[SUCCESS] arr-unique
[SUCCESS] array-unique-deep
[SUCCESS] lodash.uniq


[LOG] boolean 2
--------------
[SUCCESS] array-hyper-unique
[SUCCESS] array-uniq
[SUCCESS] array-unique
[SUCCESS] @arr/unique
[ERROR] tfk-unique-array Unexpected token u in JSON at position 0
[SUCCESS] just-unique
[FAIL] arr-unique
[SUCCESS] array-unique-deep
[SUCCESS] lodash.uniq


[LOG] Map
--------------
[SUCCESS] array-hyper-unique
[FAIL] array-uniq
[FAIL] array-unique
[FAIL] @arr/unique
[FAIL] tfk-unique-array
[FAIL] just-unique
[SUCCESS] arr-unique
[SUCCESS] array-unique-deep
[FAIL] lodash.uniq


[LOG] function
--------------
[SUCCESS] array-hyper-unique
[SUCCESS] array-uniq
[SUCCESS] array-unique
[SUCCESS] @arr/unique
[ERROR] tfk-unique-array Unexpected token u in JSON at position 0
[SUCCESS] just-unique
[SUCCESS] arr-unique
[FAIL] array-unique-deep
[SUCCESS] lodash.uniq


[LOG] function 2
--------------
[SUCCESS] array-hyper-unique
[FAIL] array-uniq
[FAIL] array-unique
[FAIL] @arr/unique
[ERROR] tfk-unique-array Unexpected token u in JSON at position 0
[FAIL] just-unique
[SUCCESS] arr-unique
[FAIL] array-unique-deep
[FAIL] lodash.uniq


[LOG] Buffer
--------------
[SUCCESS] array-hyper-unique
[FAIL] array-uniq
[FAIL] array-unique
[FAIL] @arr/unique
[FAIL] tfk-unique-array
[FAIL] just-unique
[FAIL] arr-unique
[SUCCESS] array-unique-deep
[FAIL] lodash.uniq


[LOG] ArrayBuffer
--------------
[SUCCESS] array-hyper-unique
[SUCCESS] array-uniq
[SUCCESS] array-unique
[SUCCESS] @arr/unique
[FAIL] tfk-unique-array
[SUCCESS] just-unique
[FAIL] arr-unique
[FAIL] array-unique-deep
[SUCCESS] lodash.uniq


[LOG] Buffer & ArrayBuffer
--------------
[SUCCESS] array-hyper-unique
[FAIL] array-uniq
[FAIL] array-unique
[FAIL] @arr/unique
[FAIL] tfk-unique-array
[FAIL] just-unique
[FAIL] arr-unique
[SUCCESS] array-unique-deep
[FAIL] lodash.uniq


```

---

```js
{
  'array-hyper-unique': { success: 15, fail: 0, error: 0 },
  'array-unique-deep': { success: 11, fail: 4, error: 0 },
  'array-uniq': { success: 7, fail: 8, error: 0 },
  'just-unique': { success: 7, fail: 8, error: 0 },
  'arr-unique': { success: 7, fail: 8, error: 0 },
  'lodash.uniq': { success: 7, fail: 8, error: 0 },
  'array-unique': { success: 6, fail: 9, error: 0 },
  '@arr/unique': { success: 6, fail: 9, error: 0 },
  'tfk-unique-array': { success: 5, fail: 6, error: 4 }
}
```
