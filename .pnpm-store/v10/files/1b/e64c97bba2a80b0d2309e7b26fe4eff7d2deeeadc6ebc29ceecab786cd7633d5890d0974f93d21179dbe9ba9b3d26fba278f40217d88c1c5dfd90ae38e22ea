# 函數類型工具 / Function Type Utilities

## 概述 / Overview

提供函數類型的操作工具，包括覆寫返回值類型、this 類型等功能。

Provides utilities for manipulating function types, including overwriting return types, this types, and more.

## 來源 / Source

- [`lib/helper.ts`](../lib/helper.ts)
- [`lib/helper/overwrite.ts`](../lib/helper/overwrite.ts)
- [`lib/helper/intersection.ts`](../lib/helper/intersection.ts)

---

## 類型列表 / Type List

### ITSOverwriteReturnType

**複製當前函數的參數並返回新的值類型**

不支援函數重載。

```typescript
declare function f(a: number): number;
declare let c: ITSOverwriteReturnType<typeof f, string>;
// c = (a: number) => string
```

---

### ITSWrapFunctionPromiseLike

**將函數包裝為返回 PromiseLike 的版本**

```typescript
declare function fetchUser(id: number): User;
type AsyncFetchUser = ITSWrapFunctionPromiseLike<typeof fetchUser>;
// type AsyncFetchUser = (id: number) => PromiseLike<User>
```

---

### ITSWrapFunctionPromise

**將函數包裝為返回 Promise 的版本**

```typescript
declare function fetchUser(id: number): User;
type AsyncFetchUser = ITSWrapFunctionPromise<typeof fetchUser>;
// type AsyncFetchUser = (id: number) => Promise<User>
```

---

### ITSOverwriteThisFunction

**覆寫函數的 this 類型**

```typescript
interface IThis {
  name: string;
}

declare function greet(this: IThis, message: string): string;

declare let modifiedGreet: ITSOverwriteThisFunction<number, typeof greet>;
// type = (this: number, message: string) => string
```

---

### ITSExtendsOf

**擴展類型檢查：從 T 中提取屬於 U 的部分**

已棄用，請使用 `Extract` 取代。

```typescript
@deprecated
type Extracted = ITSExtendsOf<string | number, string>;
// type Extracted = string
```

---

### ITSUnionToIntersection

**將聯集類型轉換為交集類型**

```typescript
type FunctionUnion = (() => void) | ((p: string) => void);
type FunctionIntersection = ITSUnionToIntersection<FunctionUnion>;
// type FunctionIntersection = (() => void) & ((p: string) => void)
```

---

## 使用範例 / Usage Examples

### 覆寫函數返回值

```typescript
import { ITSOverwriteReturnType } from 'ts-type';

function add(a: number, b: number): number {
  return a + b;
}

// 將返回值從 number 改為 string
type StringAdder = ITSOverwriteReturnType<typeof add, string>;
// (a: number, b: number) => string

const stringAdder: StringAdder = (a, b) => `${a + b}`;
console.log(stringAdder(1, 2)); // "3"
```

### 包裝函數為 Async

```typescript
import { ITSWrapFunctionPromise } from 'ts-type';

function processData(data: string): ProcessedData {
  return { processed: data.toUpperCase() };
}

// 包裝為返回 Promise 的版本
type AsyncProcessData = ITSWrapFunctionPromise<typeof processData>;
// (data: string) => Promise<ProcessedData>

const asyncProcessor: AsyncProcessData = async (data) => {
  return { processed: data.toUpperCase() };
};
```

### 覆寫 this 類型

```typescript
import { ITSOverwriteThisFunction } from 'ts-type';

const person = {
  name: 'John',
  greet(this: { name: string }) {
    return `Hello, ${this.name}!`;
  }
};

// 將 this 類型從 { name: string } 改為 number
type ModifiedGreet = ITSOverwriteThisFunction<number, typeof person.greet>;

const modified: ModifiedGreet = function() {
  // this 現在是 number 類型
  return `Value: ${this}`;
};
```
