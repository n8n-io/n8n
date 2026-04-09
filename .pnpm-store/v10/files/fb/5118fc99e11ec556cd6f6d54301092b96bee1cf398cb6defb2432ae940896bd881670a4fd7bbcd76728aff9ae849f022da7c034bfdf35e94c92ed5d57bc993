# Promise 類型工具 / Promise Type Utilities

## 概述 / Overview

提供 Promise 相關的類型操作工具，包括延遲物件類型、Promise 結果類型等。

Provides Promise-related type manipulation utilities, including deferred object types, Promise result types, and more.

## 來源 / Source

- [`lib/helper/promise.ts`](../lib/helper/promise.ts)
- [`lib/type/promise.ts`](../lib/type/promise.ts)

---

## 類型列表 / Type List

### ITSAwaitedLazy

**解析類型：遞迴解析 PromiseLike 類型**

```typescript
type Resolved = ITSAwaitedLazy<Promise<Promise<string>>>;
// type Resolved = string
```

---

### ITSAwaitedReturnType

**取得函數返回值的解析類型**

```typescript
async function fetchUser(): Promise<User> {
  return { name: 'John', age: 30 };
}

type UserType = ITSAwaitedReturnType<typeof fetchUser>;
// type UserType = User
```

---

### ITSDeferred

**延遲物件類型：將物件的所有屬性包裝為 Promise**

保持相同的屬性名稱，但將值類型包裝為 Promise。

```typescript
interface User {
  id: number;
  name: string;
}

type DeferredUser = ITSDeferred<User>;
// type DeferredUser = { id: Promise<number>; name: Promise<string>; }
```

---

### ITSPromiseFulfilledResult

**Promise 解決結果介面**

表示 Promise 已成功解決。

```typescript
const fulfilled: ITSPromiseFulfilledResult<string> = {
  status: "fulfilled",
  value: "success"
};
```

---

### ITSPromiseRejectedResult

**Promise 拒絕結果介面**

表示 Promise 被拒絕。

```typescript
const rejected: ITSPromiseRejectedResult<Error> = {
  status: "rejected",
  reason: new Error("failed")
};
```

---

### ITSPromiseSettledResult

**Promise settled 結果類型**

解決或拒絕結果的聯合類型。

```typescript
type Result = ITSPromiseSettledResult<string>;
// type Result = ITSPromiseFulfilledResult<string> | ITSPromiseRejectedResult
```

---

## 使用範例 / Usage Examples

### 使用 ITSAwaitedReturnType

```typescript
import { ITSAwaitedReturnType } from 'ts-type';

async function getData(): Promise<{ id: number; name: string }> {
  return { id: 1, name: 'Test' };
}

// 取得 Promise 解析後的類型
type DataType = ITSAwaitedReturnType<typeof getData>;
// type DataType = { id: number; name: string }
```

### 使用 ITSDeferred

```typescript
import { ITSDeferred } from 'ts-type';

interface User {
  id: number;
  name: string;
  email: string;
}

// 將所有屬性轉為 Promise
type DeferredUser = ITSDeferred<User>;

const user: DeferredUser = {
  id: Promise.resolve(1),
  name: Promise.resolve('John'),
  email: Promise.resolve('john@example.com')
};

// 使用時需要 await
async function getName(user: DeferredUser): Promise<string> {
  return await user.name;
}
```

### 使用 ITSPromiseSettledResult

```typescript
import { ITSPromiseSettledResult } from 'ts-type';

const promises = [
  Promise.resolve('成功'),
  Promise.reject(new Error('失敗'))
];

async function handleAll(results: ITSPromiseSettledResult<string>[]) {
  for (const result of results) {
    if (result.status === 'fulfilled') {
      console.log(`成功: ${result.value}`);
    } else {
      console.log(`失敗: ${result.reason}`);
    }
  }
}
```
