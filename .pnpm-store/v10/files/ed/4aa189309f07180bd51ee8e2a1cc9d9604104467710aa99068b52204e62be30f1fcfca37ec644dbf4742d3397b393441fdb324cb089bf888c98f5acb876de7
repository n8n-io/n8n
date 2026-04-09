# 物件與記錄類型工具 / Object & Record Type Utilities

## 概述 / Overview

提供物件類型的選擇、覆寫、合併、唯讀/可寫屬性等操作工具。

Provides object type manipulation utilities including selection, overwrite, merge, readonly/writable properties, and more.

## 來源 / Source

- [`lib/type/record.ts`](../lib/type/record.ts)
- [`lib/helper/record.ts`](../lib/helper/record.ts)
- [`lib/helper/readonly.ts`](../lib/helper/readonly.ts)
- [`lib/type/record/readonly.ts`](../lib/type/record/readonly.ts)
- [`lib/type/record/partial.ts`](../lib/type/record/partial.ts)
- [`lib/type/record/empty.ts`](../lib/type/record/empty.ts)

---

## 類型列表 / Type List

### ITSOverwrite

**覆寫物件類型的屬性**

用 U 中的屬性覆寫 T 中的同名屬性。

```typescript
interface A1 { s: string }
type A2 = ITSOverwrite<A1, { s: number }>;
// type A2 = { s: number }
```

---

### ITSMergeBoth

**合併兩個物件類型，處理衝突屬性**

```typescript
type Test1 = { id: number, code: string }
type Test2 = { id: string, code: number }
type Test3 = ITSMergeBoth<Test1, Test2>
// type Test3 = { id: string | number; code: string | number }
```

---

### ITSRequiredPick

**選擇指定鍵並設為必填**

```typescript
interface User { name?: string; age?: number; email?: string; }
type RequiredName = ITSRequiredPick<User, 'name'>;
// type RequiredName = { name: string; age?: number; email?: string; }
```

---

### ITSPartialPick

**選擇指定鍵並設為可選**

```typescript
interface User { name: string; age: number; email: string; }
type PartialName = ITSPartialPick<User, 'name'>;
// type PartialName = { name?: string; age: number; email: string; }
```

---

### ITSRequireAtLeastOne

**確保物件至少具有指定的鍵集合中的一個**

```typescript
interface User { name?: string; age?: number; }
type AtLeastOne = ITSRequireAtLeastOne<User, 'name' | 'age'>;
// 需要至少提供 name 或 age 其中一個
```

---

### ITSRequireOnlyOne

**確保物件只能具有指定的鍵集合中的其中一個（互斥）**

```typescript
interface User { name?: string; age?: number; }
type OnlyOne = ITSRequireOnlyOne<User, 'name' | 'age'>;
// 只能提供 name 或 age 其中一個，不能同時提供
```

---

### ITSReadonlyPartial

**將類型的所有屬性設為唯讀且可選**

```typescript
interface User { name: string; age: number; }
type ReadonlyPartialUser = ITSReadonlyPartial<User>;
// { readonly name?: string; readonly age?: number; }
```

---

### ITSWriteable

**將類型的所有屬性設為可讀寫**

```typescript
interface User { readonly name: string; readonly age: number; }
type WritableUser = ITSWriteable<User>;
// { name: string; age: number; }
```

---

### ITSWriteablePick

**將指定屬性設為可讀寫**

```typescript
interface User { readonly name: string; readonly age: number; readonly email: string; }
type PartialWritable = ITSWriteablePick<User, 'name' | 'age'>;
// { name: string; age: number; readonly email?: string; }
```

---

### ITSReadonlyPick

**將指定屬性設為唯讀**

```typescript
interface User { name: string; age: number; }
type ReadonlyPartial = ITSReadonlyPick<User, 'name'>;
// { readonly name: string; age?: number; }
```

---

### ITSKeyOfRecordExtractReadonly

**取得物件的唯讀鍵集合**

```typescript
interface Todo {
  readonly title: string
  readonly description: string
  completed: boolean
}
type Keys = ITSKeyOfRecordExtractReadonly<Todo>
// expected to be "title" | "description"
```

---

### ITSOmitIndexSignatures

**移除索引簽名**

```typescript
interface WithIndex {
  name: string;
  [key: string]: any;
}
type WithoutIndex = ITSOmitIndexSignatures<WithIndex>;
// type WithoutIndex = { name: string }
```

---

### ITSEmptyRecord

**空記錄類型**

```typescript
type Empty = ITSEmptyRecord;
// type Empty = Record<PropertyKey, never>
```

---

## 使用範例 / Usage Examples

### 覆寫屬性

```typescript
import { ITSOverwrite } from 'ts-type';

interface Config {
  host: string;
  port: number;
}

type UpdatedConfig = ITSOverwrite<Config, { port: string }>;
// { host: string; port: string }
```

### 合併物件

```typescript
import { ITSMergeBoth } from 'ts-type';

type A = { x: number; y: string };
type B = { y: number; z: boolean };
type Merged = ITSMergeBoth<A, B>;
// { x: number; y: string | number; z: boolean }
```

### 互斥鍵

```typescript
import { ITSRequireOnlyOne } from 'ts-type';

interface Contact {
  phone?: string;
  email?: string;
  address?: string;
}

// 只能選擇一種聯繫方式
type ContactMethod = ITSRequireOnlyOne<Contact, 'phone' | 'email' | 'address'>;

// 有效
const contact1: ContactMethod = { phone: '1234567890' };
const contact2: ContactMethod = { email: 'test@example.com' };

// 無效 - 不能同時提供多個
// const contact3: ContactMethod = { phone: '123', email: 'test@example.com' }; // Error!
```
