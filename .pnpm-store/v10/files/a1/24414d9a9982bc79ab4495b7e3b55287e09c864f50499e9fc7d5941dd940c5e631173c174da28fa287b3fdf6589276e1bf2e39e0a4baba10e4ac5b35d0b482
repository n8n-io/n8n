# 基礎類型 / Base Types

## 概述 / Overview

提供常用的基礎類型別名和工具類型，這些類型是整個庫的建構基礎。

Provides commonly used base type aliases and utility types that form the building blocks of the entire library.

## 來源 / Source

- [`lib/type/base.ts`](../lib/type/base.ts)
- [`lib/generic.ts`](../lib/generic.ts)

---

## 類型列表 / Type List

### ITSArrayListMaybeReadonly

**陣列類型：可讀寫陣列或唯讀陣列**

```typescript
type StringList = ITSArrayListMaybeReadonly<string>;
// type StringList = string[] | readonly string[]
```

---

### ITSKeys

**鍵的類型：符號、字串或數字**

```typescript
type Keys = ITSKeys;
// type Keys = symbol | string | number
```

---

### ITSConstructorLike

**建構函數類型**

```typescript
type MyConstructor = ITSConstructorLike<MyClass>;
// type MyConstructor = new (...args: any) => MyClass
```

---

### ITSValueOrArray

**值或陣列：單一值或其陣列**

```typescript
type StringOrArray = ITSValueOrArray<string>;
// type StringOrArray = string | string[]
```

---

### ITSValueOrArrayMaybeReadonly

**值或可能唯讀的陣列**

```typescript
type StringOrList = ITSValueOrArrayMaybeReadonly<string>;
// type StringOrList = string | string[] | readonly string[]
```

---

### ITSPropertyKey

**屬性鍵類型：字串或符號**

```typescript
type PropKey = ITSPropertyKey;
// type PropKey = string | symbol
```

---

### ITSAnyFunction

**任意函數類型**

```typescript
type AnyFunc = ITSAnyFunction;
// type AnyFunc = (...args: any[]) => any
```

---

### ITSBasicPrimitive

**基本原始類型：數字、字串或布林值**

```typescript
type Primitive = ITSBasicPrimitive;
// type Primitive = number | string | boolean
```

---

### ITSNullPrimitive

**可為空的原始類型：null 或 undefined**

```typescript
type Nullish = ITSNullPrimitive;
// type Nullish = null | undefined
```

---

## 泛型工具 / Generic Utilities

### ITSTypeFunction

**類型函數：返回指定類型的函數**

```typescript
type MyTypeFunc = ITSTypeFunction<string>;
// type MyTypeFunc = (...args: any[]) => string
```

---

### ITSMapLike

**類似 Map 的介面定義**

```typescript
interface MyMap extends ITSMapLike<string, number> {
  get(key: string): number | undefined;
  has(key: string): boolean;
}
```

---

### ITSSetLike

**類似 Set 的介面定義**

```typescript
interface MySet extends ITSSetLike<string> {
  has(value: string): boolean;
}
```

---

### ITSResolvable

**可解析的類型：支援直接值或 PromiseLike**

```typescript
type AsyncValue = ITSResolvable<string>;
// type AsyncValue = string | PromiseLike<string>
```

---

### ITSArrayLikeWriteable

**可寫入的類陣列介面**

```typescript
interface MyArrayLike extends ITSArrayLikeWriteable<string> {
  readonly length: number;
  [n: number]: string;
}
```

---

## 迭代器類型 / Iterator Types

### ITSIterator

**Iterator 類型**

```typescript
const iterator: ITSIterator<string> = {
  next() { return { done: false, value: 'test' }; }
};
```

---

### ITSIteratorResult

**IteratorResult 類型**

```typescript
const result: ITSIteratorResult<string> = { done: false, value: 'test' };
```

---

## Proxy 類型 / Proxy Types

### ITSProxify

**將物件的屬性包裝為 Proxy**

將每個屬性轉換為具有 getter 和 setter 的物件。

```typescript
interface User { name: string; age: number; }
type ProxifiedUser = ITSProxify<User>;
// type ProxifiedUser = {
//   name: { get(): string; set(v: string): void };
//   age: { get(): number; set(v: number): void };
// }
```
