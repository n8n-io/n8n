# 陣列與元組類型工具 / Array & Tuple Type Utilities

## 概述 / Overview

提供陣列和元組類型的操作工具，包括唯讀/可讀寫轉換、元素類型提取等。

Provides array and tuple type manipulation utilities, including readonly/writable conversion, element type extraction, and more.

## 來源 / Source

- [`lib/helper/key-value.ts`](../lib/helper/key-value.ts)
- [`lib/helper/array/readonly.ts`](../lib/helper/array/readonly.ts)
- [`lib/helper/tuple.ts`](../lib/helper/tuple.ts)
- [`lib/type/tuple/empty.ts`](../lib/type/tuple/empty.ts)

---

## 類型列表 / Type List

### ITSValueOfArray

**陣列的元素類型**

從陣列類型中提取元素類型，支援唯讀陣列和可讀寫陣列。

```typescript
type ArrayElement = ITSValueOfArray<string[]>;
// type ArrayElement = string

type ReadonlyArrayElement = ITSValueOfArray<readonly string[]>;
// type ReadonlyArrayElement = string
```

---

### ITSValueOfArrayLike

**類陣列的元素類型**

從類陣列物件中提取元素類型。

```typescript
type ArrayLikeElement = ITSValueOfArrayLike<ArrayLike<string>>;
// type ArrayLikeElement = string
```

---

### ITSToReadonlyArray

**將可讀寫陣列轉換為唯讀陣列**

```typescript
type Writable = [1, 2, 3];
type Readonly = ITSToReadonlyArray<Writable>;
// type Readonly = readonly [1, 2, 3]
```

---

### ITSToWriteableArray

**將唯讀陣列轉換為可讀寫陣列**

```typescript
type Readonly = readonly [1, 2, 3];
type Writable = ITSToWriteableArray<Readonly>;
// type Writable = [1, 2, 3]
```

---

### ITSReadonlyToWriteableArray

**將唯讀陣列轉換為可讀寫陣列**

```typescript
type ReadonlyArray = readonly [1, 2, 3];
type WritableArray = ITSReadonlyToWriteableArray<ReadonlyArray>;
// type WritableArray = [1, 2, 3]
```

---

### ITSTupleKeys

**取得元組的數字索引鍵**

```typescript
type Keys = ITSTupleKeys<[string, string, string]>;
// type Keys = "0" | "1" | "2"
```

---

### ITSEmptyTuple

**空元組類型**

```typescript
type Empty = ITSEmptyTuple;
// type Empty = [] | readonly []
```

---

### ITSKeyOfArray

**取得陣列類型的數字索引鍵**

```typescript
type ArrayKeys = ITSKeyOfArray<string[]>;
// type ArrayKeys = number | `${number}`
```

---

## 使用範例 / Usage Examples

### 提取陣列元素類型

```typescript
import { ITSValueOfArray } from 'ts-type';

type StringArray = string[];
type Element = ITSValueOfArray<StringArray>;
// Element = string
```

### 陣列互轉

```typescript
import { ITSToReadonlyArray, ITSToWriteableArray } from 'ts-type';

// 可讀寫轉唯讀
const writableArr: number[] = [1, 2, 3];
type ReadonlyArr = ITSToReadonlyArray<typeof writableArr>;
// type ReadonlyArr = readonly number[]

// 唯讀轉可讀寫
const readonlyArr: readonly number[] = [1, 2, 3];
type WritableArr = ITSToWriteableArray<typeof readonlyArr>;
// type WritableArr = number[]
```

### 處理元組

```typescript
import { ITSTupleKeys } from 'ts-type';

type Person = [string, number, boolean];
type Keys = ITSTupleKeys<Person>;
// Keys = "0" | "1" | "2"

// 取得對應的值
type FirstName = Person[0]; // string
type Age = Person[1];       // number
type IsActive = Person[2]; // boolean
```
