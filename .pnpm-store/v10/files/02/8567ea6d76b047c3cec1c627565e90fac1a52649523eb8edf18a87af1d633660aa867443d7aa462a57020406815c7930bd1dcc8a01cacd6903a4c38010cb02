# array-hyper-unique

取得陣列唯一值，支援深度比較巢狀物件和陣列。/ Get unique values from array with deep comparison for nested objects and arrays.

[API](index.d.ts)

## 簡介 / Introduction

此模組基於 [arr-unique](https://www.npmjs.com/package/arr-unique) 進行開發。/
This module is based on [arr-unique](https://www.npmjs.com/package/arr-unique).

1. 重新使用 TypeScript 編寫並修復問題 / Rewrite to TypeScript and fix bugs
2. 增加選項控制 / Add option control
3. 詳細用法請參考 [_data.ts](test/_data.ts)、[test.test.ts](test/test.test.ts) 或 [lib.chk.ts](test/lib.chk.ts)

---

## 安裝 / Install

```bash
yarn add array-hyper-unique
yarn-tool add array-hyper-unique
yt add array-hyper-unique
```

## 應用情境 / Application Scenarios

1. **去除複雜物件重複項**: 處理巢狀物件和陣列的深度去重
2. **API 資料處理**: 清理 API 回傳的重複資料
3. **表單驗證**: 檢查使用者提交的重複選項
4. **資料合併**: 合併多個資料源並去除重複

## 效能比較 / Performance Comparison

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

## 示範 / Demo

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

## 選項 / Options

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

## 與其他模組的差異 / Differences from Other Modules

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

