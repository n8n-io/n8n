# 邏輯類型工具 / Logic Type Utilities

## 概述 / Overview

提供類型層級的邏輯判斷工具，包括檢測 any、never、union 等特殊類型。

Provides type-level logic detection utilities, including detecting special types like any, never, union, and more.

## 來源 / Source

- [`lib/logic/any.ts`](../lib/logic/any.ts)
- [`lib/logic/never.ts`](../lib/logic/never.ts)
- [`lib/logic/union/index.ts`](../lib/logic/union/index.ts)

---

## 類型列表 / Type List

### ITSLogicIsAny

**檢測類型是否為 any**

利用 any 與任何類型交叉都會得到 any 的特性來檢測。

```typescript
type Test1 = ITSLogicIsAny<any>;
// type Test1 = true

type Test2 = ITSLogicIsAny<string>;
// type Test2 = false
```

---

### ITSLogicNotAny

**檢測類型是否不為 any**

```typescript
type Test1 = ITSLogicNotAny<any>;
// type Test1 = false

type Test2 = ITSLogicNotAny<string>;
// type Test2 = true
```

---

### ITSLogicIsNever

**檢測類型是否為 never**

利用 never 是所有類型的子類型特性來檢測。

```typescript
type Test1 = ITSLogicIsNever<never>;
// type Test1 = true

type Test2 = ITSLogicIsNever<string>;
// type Test2 = false
```

---

### ITSLogicIsUnion

**檢測類型是否為聯合類型**

```typescript
type Test1 = ITSLogicIsUnion<string | number>;
// type Test1 = true

type Test2 = ITSLogicIsUnion<string>;
// type Test2 = false
```

---

### ITSLogicIsSingleNonUnion

**檢測類型是否為單一非聯合類型**

```typescript
type Test1 = ITSLogicIsSingleNonUnion01<string>;
// type Test1 = true

type Test2 = ITSLogicIsSingleNonUnion01<string | number>;
// type Test2 = false

type Test3 = ITSLogicIsSingleNonUnion01<any>;
// type Test3 = false
```

---

## 使用範例 / Usage Examples

### 檢測 Any 類型

```typescript
import { ITSLogicIsAny, ITSLogicNotAny } from 'ts-type';

// 檢測是否為 any
function isAny<T>(value: T): ITSLogicIsAny<T> {
  return true as any;
}

const anyResult = isAny('test');      // true
const stringResult = isAny('hello');  // false

// 檢測是否不為 any
function isNotAny<T>(value: T): ITSLogicNotAny<T> {
  return true as any;
}

const notAnyResult = isNotAny('test'); // true
const anyCheck = isNotAny<any>('test'); // false
```

### 條件類型中的應用

```typescript
import { ITSLogicIsAny } from 'ts-type';

type SafeReturn<T> = ITSLogicIsAny<T> extends true
  ? unknown
  : T;

type Result1 = SafeReturn<any>;      // unknown
type Result2 = SafeReturn<string>;   // string
type Result3 = SafeReturn<number>;   // number
```

### 防止 Any 類型

```typescript
import { ITSLogicIsAny } from 'ts-type';

function strictFunction<T extends string | number>(value: T): T {
  // 如果傳入 any，則回傳 never，防止錯誤使用
  type Check = ITSLogicIsAny<T>;
  if (Check extends true) {
    throw new Error('any type is not allowed');
  }
  return value;
}

// 正常工作
strictFunction('hello'); // "hello"
strictFunction(42);      // 42

// 編譯錯誤
// strictFunction(anyValue); // Error!
```
