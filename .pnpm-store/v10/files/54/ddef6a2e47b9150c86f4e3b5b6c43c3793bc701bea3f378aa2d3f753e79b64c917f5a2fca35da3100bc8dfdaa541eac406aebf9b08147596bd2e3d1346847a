# 相同邏輯的不同實現 / Different Implementations of Same Logic

本文件記錄了功能相似但實現方式不同的類型，幫助開發者選擇適合的類型。

This document records types with similar functionality but different implementations, helping developers choose the appropriate type.

---

## 1. 互斥鍵 / Mutually Exclusive Keys

確保物件只能具有指定鍵集合中的其中一個。

### ITSPickOne

- **位置**: `lib/helper/record/pick-one.ts`
- **輸出**: 使用 `void` 作為其餘鍵的類型
- **特點**: 較舊的實現方式

**原始碼**:
```ts
export type ITSPickOne<T, Keys extends keyof T = keyof T> = {
    [K in Keys]: Record<K, T[K]> & ITSPartialRecord<Exclude<keyof T, K>, void>
}[Keys]
```

**範例**:
```ts
interface User { name?: string; age?: number; }
type OnlyOne = ITSPickOne<User, 'name' | 'age'>;
// 輸出結果：
// type OnlyOne = { name: string; age?: void; } | { age: number; name?: void; }

// 有效
const user1: OnlyOne = { name: 'John' };
const user2: OnlyOne = { age: 25 };

// 無效 - 不能同時提供多個
// const user3: OnlyOne = { name: 'John', age: 25 }; // Error!
```

### ITSRequireOnlyOne

- **位置**: `lib/type/record.ts`
- **輸出**: 使用 `never` 作為其餘鍵的類型
- **特點**: 推薦使用，`never` 類型更加嚴格

**原始碼**:
```ts
export type ITSRequireOnlyOne<T, Keys extends keyof T = keyof T> =
    Omit<T, Keys>
    & {
    [K in Keys]-?: ITSRequiredPick<T, K>
    & Partial<Record<Exclude<Keys, K>, never>>
}[Keys];
```

**範例**:
```ts
interface User { name?: string; age?: number; }
type OnlyOne = ITSRequireOnlyOne<User, 'name' | 'age'>;
// 輸出結果：
// type OnlyOne = { name: string; age?: never; } | { age: number; name?: never; }

// 有效
const user1: OnlyOne = { name: 'John' };
const user2: OnlyOne = { age: 25 };

// 無效 - 不能同時提供多個
// const user3: OnlyOne = { name: 'John', age: 25 }; // Error!
```

---

## 2. 部分鍵檢測 / Partial Key Detection

檢測物件中哪些鍵是可選的。

### ITSKeyIsPartialOfRecord

- **位置**: `lib/helper/record/partial.ts`
- **功能**: 檢測指定鍵是否為可選鍵

**原始碼**:
```ts
export type ITSKeyIsPartialOfRecord<T, K extends keyof T> = Omit<T, K> extends T ? K : never;
```

**範例**:
```ts
// 範例 1: age 是可選鍵
interface User { name: string; age?: number; }
type PartialKeys = ITSKeyIsPartialOfRecord<User, 'age'>;
// 輸出結果：type PartialKeys = "age"

// 範例 2: name 是必填鍵
type PartialKeys2 = ITSKeyIsPartialOfRecord<User, 'name'>;
// 輸出結果：type PartialKeys2 = never

// 範例 3: 檢測多個鍵
type PartialKeys3 = ITSKeyIsPartialOfRecord<User, 'name' | 'age'>;
// 輸出結果：type PartialKeys3 = "age"
```

### ITSPartialRecord

- **位置**: `lib/type/record/partial.ts`
- **功能**: 建立可選的記錄類型

**原始碼**:
```ts
export type ITSPartialRecord<K extends keyof any, T> = {
    [P in K]?: T;
};
```

**範例**:
```ts
// 範例 1: 基礎用法
type PartialUser = ITSPartialRecord<'name' | 'age', string>;
// 輸出結果：type PartialUser = { name?: string; age?: string; }

// 範例 2: 與具體鍵一起使用
interface Config { host: string; port: number; }
type PartialConfig = ITSPartialRecord<keyof Config, string>;
// 輸出結果：type PartialConfig = { host?: string; port?: string; }
```

### ITSRequireRecord

- **位置**: `lib/type/record/partial.ts`
- **功能**: 建立必填的記錄類型

**原始碼**:
```ts
export type ITSRequireRecord<K extends keyof any, T> = {
    [P in K]-?: T;
};
```

**範例**:
```ts
// 範例 1: 基礎用法
type RequiredUser = ITSRequireRecord<'name' | 'age', string>;
// 輸出結果：type RequiredUser = { name: string; age: string; }

// 範例 2: 數字類型
type RequiredAges = ITSRequireRecord<'age' | 'score', number>;
// 輸出結果：type RequiredAges = { age: number; score: number; }
```

---

## 3. 唯讀屬性操作 / Readonly Property Operations

### 類型級別 (Type-level) - 操作整個類型

**ITSReadonlyPartial** (`lib/helper/readonly.ts`)

**原始碼**:
```ts
export type ITSReadonlyPartial<T> = {
    readonly [P in keyof T]?: T[P]
};
```

**範例**:
```ts
interface User { name: string; age: number; }
type Result = ITSReadonlyPartial<User>;
// 輸出結果：type Result = { readonly name?: string; readonly age?: number; }
```

---

**ITSWriteable** (`lib/helper/readonly.ts`)

**原始碼**:
```ts
export type ITSWriteable<T> = ITSWriteablePick<T, keyof T>;
```

**範例**:
```ts
interface User { readonly name: string; readonly age: number; }
type Result = ITSWriteable<User>;
// 輸出結果：type Result = { name: string; age: number; }
```

---

**ITSReadonlyPick** (`lib/helper/readonly.ts`)

**原始碼**:
```ts
export type ITSReadonlyPick<T, K extends keyof T = keyof T> = {
    readonly [P in K]: T[P];
};
```

**範例**:
```ts
interface User { name: string; age: number; email: string; }
type Result = ITSReadonlyPick<User, 'name'>;
// 輸出結果：type Result = { readonly name: string; age: number; email: string; }
```

---

**ITSWriteablePick** (`lib/helper/readonly.ts`)

**原始碼**:
```ts
export type ITSWriteablePick<T, K extends keyof T = keyof T> = {
    -readonly [P in K]: T[P];
};
```

**範例**:
```ts
interface User { readonly name: string; readonly age: number; readonly email: string; }
type Result = ITSWriteablePick<User, 'name' | 'age'>;
// 輸出結果：type Result = { name: string; age: number; readonly email: string; }
```

---

**ITSReadonlyWith** (`lib/helper/readonly.ts`)

**原始碼**:
```ts
export type ITSReadonlyWith<T, K extends keyof T = keyof T> = Omit<T, K> & ITSReadonlyPick<T, K>;
```

**範例**:
```ts
interface User { name: string; age: number; email: string; }
type Result = ITSReadonlyWith<User, 'name' | 'age'>;
// 輸出結果：type Result = { readonly name: string; readonly age: number; email: string; }
```

---

**ITSWriteableWith** (`lib/helper/readonly.ts`)

**原始碼**:
```ts
export type ITSWriteableWith<T, K extends keyof T = keyof T> = Omit<T, K> & ITSWriteablePick<T, K>;
```

**範例**:
```ts
interface User { readonly name: string; readonly age: number; email: string; }
type Result = ITSWriteableWith<User, 'email'>;
// 輸出結果：type Result = { readonly name: string; readonly age: number; email: string; }
```

---

### 記錄級別 (Record-level) - 操作鍵集合

**ITSReadonlyRecord** (`lib/type/record/readonly.ts`)

**原始碼**:
```ts
export type ITSReadonlyRecord<K extends keyof any, T> = {
    readonly [P in K]: T;
};
```

**範例**:
```ts
type Result = ITSReadonlyRecord<'name' | 'age', string>;
// 輸出結果：type Result = { readonly name: string; readonly age: string; }
```

---

**ITSWriteableRecord** (`lib/type/record/readonly.ts`)

**原始碼**:
```ts
export type ITSWriteableRecord<K extends keyof any, T> = {
    -readonly [P in K]: T;
};
```

**範例**:
```ts
type Result = ITSWriteableRecord<'name' | 'age', string>;
// 輸出結果：type Result = { name: string; age: string; }
```

---

## 4. 必填/可選鍵選擇 / Required/Optional Key Pick

### ITSRequiredPick

- **位置**: `lib/type/record.ts`
- **功能**: 選擇指定鍵並設為必填

**原始碼**:
```ts
export type ITSRequiredPick<T, K extends keyof T = keyof T> = {
    [P in K]-?: T[P];
} & Omit<T, K>;
```

**範例**:
```ts
interface User { name?: string; age?: number; email?: string; }
type Result = ITSRequiredPick<User, 'name'>;
// 輸出結果：type Result = { name: string; age?: number; email?: string; }

// 多個鍵
type Result2 = ITSRequiredPick<User, 'name' | 'age'>;
// 輸出結果：type Result2 = { name: string; age: number; email?: string; }
```

---

### ITSPartialPick

- **位置**: `lib/type/record.ts`
- **功能**: 選擇指定鍵並設為可選

**原始碼**:
```ts
export type ITSPartialPick<T, K extends keyof T = keyof T> = {
    [P in K]?: T[P];
} & Omit<T, K>;
```

**範例**:
```ts
interface User { name: string; age: number; email: string; }
type Result = ITSPartialPick<User, 'name'>;
// 輸出結果：type Result = { name?: string; age: number; email: string; }

// 多個鍵
type Result2 = ITSPartialPick<User, 'name' | 'age'>;
// 輸出結果：type Result2 = { name?: string; age?: number; email: string; }
```

---

### ITSRequiredWith

- **位置**: `lib/type/record.ts`
- **功能**: 保留其他鍵的同時，將指定鍵設為必填

**原始碼**:
```ts
export type ITSRequiredWith<T, K extends keyof T> = Omit<T, K> & ITSRequiredPick<T, K>;
```

**範例**:
```ts
interface User { name?: string; age?: number; email?: string; }
type Result = ITSRequiredWith<User, 'name'>;
// 輸出結果：type Result = { name: string; age?: number; email?: string; }
```

---

### ITSPartialWith

- **位置**: `lib/type/record.ts`
- **功能**: 保留其他鍵的同時，將指定鍵設為可選

**原始碼**:
```ts
export type ITSPartialWith<T, K extends keyof T> = Omit<T, K> & ITSPartialPick<T, K>;
```

**範例**:
```ts
interface User { name: string; age: number; email: string; }
type Result = ITSPartialWith<User, 'name'>;
// 輸出結果：type Result = { name?: string; age: number; email: string; }
```

---

### ITSPickExtra

- **位置**: `lib/type/record.ts`
- **功能**: 部分必填、部分可選的鍵選擇

**原始碼**:
```ts
export type ITSPickExtra<T, RK extends keyof T, PK extends Exclude<keyof T, RK> = Exclude<keyof T, RK>> =
    ITSRequiredPick<T, RK> & ITSPartialPick<T, PK>;
```

**範例**:
```ts
interface User { name: string; age: number; email: string; }

// 必填 name，其餘可選
type Result = ITSPickExtra<User, 'name', 'age'>;
// 輸出結果：type Result = { name: string; age?: number; email?: string; }
```

---

### ITSPickExtra2

- **位置**: `lib/type/record.ts`
- **功能**: 部分必填、部分可選的鍵選擇（參數順序相反）

**原始碼**:
```ts
export type ITSPickExtra2<T, PK extends keyof T, RK extends Exclude<keyof T, PK> = Exclude<keyof T, PK>> =
    ITSRequiredPick<T, RK> & ITSPartialPick<T, PK>;
```

**範例**:
```ts
interface User { name: string; age: number; email: string; }

// 必填 age | email，其餘可選
type Result2 = ITSPickExtra2<User, 'age' | 'email'>;
// 輸出結果：type Result2 = { name?: string; age: number; email: number; }
```

---

## 5. 空類型 / Empty Types

### ITSEmptyRecord

- **位置**: `lib/type/record/empty.ts`
- **功能**: 建立空記錄類型

**原始碼**:
```ts
export type ITSEmptyRecord = Record<PropertyKey, never>;
```

**範例**:
```ts
type Empty = ITSEmptyRecord;
// 輸出結果：type Empty = Record<PropertyKey, never>

// 等價於
type Empty2 = { [key: string]: never };
```

---

### ITSEmptyRecordByKeys

- **位置**: `lib/type/record/empty.ts`
- **功能**: 建立具有指定鍵的空記錄

**原始碼**:
```ts
export type ITSEmptyRecordByKeys<K extends PropertyKey> = Record<K, never>;
```

**範例**:
```ts
type EmptyByKeys = ITSEmptyRecordByKeys<'a' | 'b'>;
// 輸出結果：type EmptyByKeys = { a: never; b: never; }
```

---

### ITSLogicIsEmptyRecord

- **位置**: `lib/logic/record/empty.ts`
- **功能**: 判斷類型是否為空記錄

**原始碼**:
```ts
export type ITSLogicIsEmptyRecord<T, Y = true, N = false> = T extends ITSEmptyRecord ? Y : N
```

**範例**:
```ts
type Result1 = ITSLogicIsEmptyRecord<Record<PropertyKey, never>>;
// 輸出結果：type Result1 = true

type Result2 = ITSLogicIsEmptyRecord<{ a: string }>;
// 輸出結果：type Result2 = false
```

---

### ITSEmptyTuple

- **位置**: `lib/type/tuple/empty.ts`
- **功能**: 空元組類型

**原始碼**:
```ts
export type ITSEmptyTuple = ITSArrayListMaybeReadonly<never>;
```

**範例**:
```ts
type Empty = ITSEmptyTuple;
// 輸出結果：type Empty = [] | readonly []
```

---

## 6. 列舉操作 / Enum Operations

### ITSEnumLike

- **位置**: `lib/type/record/enum.ts`
- **功能**: 定義列舉類型的基礎設施

**原始碼**:
```ts
export type ITSEnumLike<K extends string = string, V extends string | number = string | number> =
    ITSReadonlyRecord<K, V> | (V extends number ? ITSNumberEnumLikeReverse<K, Exclude<V, string>> : ITSEnumLikeReverseExcludeNumber);
```

**範例**:
```ts
// 字串列舉
enum EnumString { A = 'a', B = 'b' }
type T1 = ITSEnumLike<EnumString>;
// 輸出結果：type T1 = ...

// 數字列舉
enum EnumNumber { A = 1, B = 2 }
type T2 = ITSNumberEnumLike<EnumNumber>;
// 輸出結果：type T2 = ...
```

---

### ITSExcludeEnumValue

- **位置**: `lib/helper/record/enum.ts`
- **功能**: 從列舉類型中排除指定值

**原始碼**:
```ts
export type ITSExcludeEnumValue<Enum extends ITSEnumLike, U extends ITSValueOf<Enum>> = Exclude<ITSValueOf<Enum>, U>;
```

**範例**:
```ts
enum Color { Red, Green, Blue }
type ExcludedRed = ITSExcludeEnumValue<Color, Color.Red>;
// 輸出結果：type ExcludedRed = Color.Green | Color.Blue
```

---

### ITSExtractEnumValue

- **位置**: `lib/helper/record/enum.ts`
- **功能**: 從列舉類型中提取指定值

**原始碼**:
```ts
export type ITSExtractEnumValue<Enum extends ITSEnumLike, U extends ITSValueOf<Enum>> = Extract<ITSValueOf<Enum>, U>;
```

**範例**:
```ts
enum Color { Red, Green, Blue }
type ExtractedRed = ITSExtractEnumValue<Color, Color.Red>;
// 輸出結果：type ExtractedRed = Color.Red
```

---

### ITSNumberEnumToNumber

- **位置**: `lib/helper/record/enum.ts`
- **功能**: 將數字列舉轉換為純數字類型

**原始碼**:
```ts
export type ITSNumberEnumToNumber<T extends number> = ITSStringInferToNumber<ITSToStringLiteral<Extract<T, number>>>
```

**範例**:
```ts
enum Status { Active = 1, Inactive = 2 }
type NumStatus = ITSNumberEnumToNumber<Status>;
// 輸出結果：type NumStatus = 1 | 2
```

---

### ITSNumberEnumAndNumber

- **位置**: `lib/helper/record/enum.ts`
- **功能**: 數字列舉與數字的聯合類型

**原始碼**:
```ts
export type ITSNumberEnumAndNumber<T extends number> = Extract<T, number> | ITSNumberEnumToNumber<T>
```

**範例**:
```ts
enum Status { Active = 1, Inactive = 2 }
type StatusValue = ITSNumberEnumAndNumber<Status>;
// 輸出結果：type StatusValue = 1 | 2 | number
```

---

## 7. 鍵提取 / Key Extraction

### ITSPickSame

- **位置**: `lib/type/record.ts`
- **功能**: 選擇 T 中與 U 相同的鍵

**原始碼**:
```ts
export type ITSPickSame<T, U> = Pick<T, ITSKeyofSame<T, U>>;
```

**範例**:
```ts
type A = { a: 1; b: 2; c: 3 };
type B = { a: 3; c: 4; d: 5 };
type Same = ITSPickSame<A, B>;
// 輸出結果：type Same = { a: 1; c: 3 }
```

---

### ITSPickDiff

- **位置**: `lib/type/record.ts`
- **功能**: 選擇 T 中與 U 不同的鍵

**原始碼**:
```ts
export type ITSPickDiff<T, U> = Pick<T, ITSKeyofDiff<T, U>>;
```

**範例**:
```ts
type A = { a: 1; b: 2; c: 3 };
type B = { a: 3; c: 4; d: 5 };
type Diff = ITSPickDiff<A, B>;
// 輸出結果：type Diff = { b: 2 }
```

---

### ITSPickBothSame

- **位置**: `lib/type/record.ts`
- **功能**: 選擇 T 和 U 共同擁有的鍵

**原始碼**:
```ts
export type ITSPickBothSame<T, U> = Pick<T & U, ITSKeyofBothSame<T, U>>;
```

**範例**:
```ts
type A = { a: 1; b: 2; c: 3 };
type B = { a: 3; c: 4; d: 5 };
type BothSame = ITSPickBothSame<A, B>;
// 輸出結果：type BothSame = { a: 1 | 3; c: 3 | 4 }
```

---

### ITSKeyOfRecordExtractReadonly

- **位置**: `lib/helper/record.ts`
- **功能**: 取得物件的唯讀鍵集合

**原始碼**:
```ts
export type ITSKeyOfRecordExtractReadonly<T> = {[K in keyof T]-?: (<U>() => U extends {-readonly [P in K]: T[K]} ? 1 : 2) extends (<U>() => U extends {[P in K]: T[K]} ? 1 : 2) ? never : K}[keyof T];
```

**範例**:
```ts
interface Todo {
  readonly title: string
  readonly description: string
  completed: boolean
}
type Keys = ITSKeyOfRecordExtractReadonly<Todo>;
// 輸出結果：type Keys = "title" | "description"
```

---

### ITSKeyOfRecordExcludeReadonly

- **位置**: `lib/helper/record.ts`
- **功能**: 取得物件的非唯讀鍵集合

**原始碼**:
```ts
export type ITSKeyOfRecordExcludeReadonly<T> = Exclude<keyof T, ITSKeyOfRecordExtractReadonly<T>>
```

**範例**:
```ts
interface Todo {
  readonly title: string
  readonly description: string
  completed: boolean
}
type Keys = ITSKeyOfRecordExcludeReadonly<Todo>;
// 輸出結果：type Keys = "completed"
```

---

## 8. 覆寫與合併 / Overwrite & Merge

### ITSOverwrite

- **位置**: `lib/type/record.ts`
- **功能**: 用 U 中的屬性覆寫 T 中的同名屬性

**原始碼**:
```ts
export type ITSOverwrite<T, U> = Omit<T, keyof U> & U;
```

**範例**:
```ts
interface Config { host: string; port: number }
type Updated = ITSOverwrite<Config, { port: string }>;
// 輸出結果：type Updated = { host: string; port: string }

// 新增屬性
type Added = ITSOverwrite<Config, { timeout: number }>;
// 輸出結果：type Added = { host: string; port: number; timeout: number }
```

---

### ITSMergeBoth

- **位置**: `lib/type/record.ts`
- **功能**: 合併兩個物件類型，處理衝突屬性

**原始碼**:
```ts
export type ITSMergeBoth<T, U> = ITSPickBothDiff<T, U> & Pick<T | U, ITSKeyofBothSame<T, U>>;
```

**範例**:
```ts
type A = { id: number; code: string; x: boolean };
type B = { id: string; code: number; y: number };
type Result = ITSMergeBoth<A, B>;
// 輸出結果：type Result = { id: string | number; code: string | number; x: boolean; y: number }
```

---

## 9. 選擇性鍵 / Optional Keys

### ITSRequireAtLeastOne

- **位置**: `lib/type/record.ts`
- **功能**: 確保物件至少具有指定鍵集合中的一個

**原始碼**:
```ts
export type ITSRequireAtLeastOne<T, Keys extends keyof T = keyof T> =
    Omit<T, Keys> & {
    [K in Keys]-?: ITSRequiredPick<T, K>
    & ITSPartialPick<T, Exclude<Keys, K>>
}[Keys];
```

**範例**:
```ts
interface User { name?: string; age?: number; }
type AtLeastOne = ITSRequireAtLeastOne<User, 'name' | 'age'>;
// 輸出結果：type AtLeastOne = { name: string; age?: never; } | { age: number; name?: never; }

// 有效
const user1: AtLeastOne = { name: 'John' };
const user2: AtLeastOne = { age: 25 };
const user3: AtLeastOne = { name: 'John', age: 25 }; // 也有效！

// 無效 - 必須至少提供一個
// const user4: AtLeastOne = {}; // Error!
```

---

### ITSPickNot

- **位置**: `lib/type/record.ts`
- **功能**: 排除指定鍵

**原始碼**:
```ts
export type ITSPickNot<T, K extends keyof T> = Omit<T, K>;
```

**範例**:
```ts
interface User { name: string; age: number; email: string; }
type WithoutName = ITSPickNot<User, 'name'>;
// 輸出結果：type WithoutName = { age: number; email: string; }

type WithoutNameAndAge = ITSPickNot<User, 'name' | 'age'>;
// 輸出結果：type WithoutNameAndAge = { email: string; }
```

---

## 10. 移除鍵 / Key Removal

### ITSOmitIndexSignatures

- **位置**: `lib/helper/record/omit-index.ts`
- **功能**: 移除索引簽名

**原始碼**:
```ts
export type ITSOmitIndexSignatures<T extends Record<any, any>> = {
    [K in keyof T as {} extends Record<K, unknown> ? never : K]: T[K]
};
```

**範例**:
```ts
interface WithIndex { name: string; [key: string]: any; }
type WithoutIndex = ITSOmitIndexSignatures<WithIndex>;
// 輸出結果：type WithoutIndex = { name: string }
```

---

### ITSKnownKeys

- **位置**: `lib/helper/record/omit-index.ts`
- **功能**: 取得物件的已知鍵（排除索引簽名）

**原始碼**:
```ts
export type ITSKnownKeys<T extends Record<any, any>> = keyof ITSOmitIndexSignatures<T>;
```

**範例**:
```ts
interface WithIndex { name: string; [key: string]: any; }
type Known = ITSKnownKeys<WithIndex>;
// 輸出結果：type Known = "name"
```

---

## 11. 邏輯類型 / Logic Types

### ITSLogicIsAny

- **位置**: `lib/logic/any.ts`
- **功能**: 檢測是否為 any 類型

**原始碼**:
```ts
export type ITSLogicIsAny<T, Y = true, N = false> = 0 extends (1 & T) ? Y : N;
```

**範例**:
```ts
type Result1 = ITSLogicIsAny<any>;
// 輸出結果：type Result1 = true

type Result2 = ITSLogicIsAny<string>;
// 輸出結果：type Result2 = false

type Result3 = ITSLogicIsAny<unknown>;
// 輸出結果：type Result3 = false
```

---

### ITSLogicNotAny

- **位置**: `lib/logic/any.ts`
- **功能**: 檢測是否不為 any 類型

**原始碼**:
```ts
export type ITSLogicNotAny<T, Y = true, N = false> = ITSLogicIsAny<T, N, Y>;
```

**範例**:
```ts
type Result1 = ITSLogicNotAny<any>;
// 輸出結果：type Result1 = false

type Result2 = ITSLogicNotAny<string>;
// 輸出結果：type Result2 = true
```

---

### ITSLogicIsNever

- **位置**: `lib/logic/never.ts`
- **功能**: 檢測是否為 never 類型

**原始碼**:
```ts
export type ITSLogicIsNever<T, Y = true, N = false> = [T] extends [never] ? Y : N;
```

**範例**:
```ts
type Result1 = ITSLogicIsNever<never>;
// 輸出結果：type Result1 = true

type Result2 = ITSLogicIsNever<string>;
// 輸出結果：type Result2 = false
```

---

## 12. 陣列類型 / Array Types

### ITSValueOfArray

- **位置**: `lib/helper/key-value.ts`
- **功能**: 取得陣列的元素類型

**原始碼**:
```ts
export type ITSValueOf<T> = T[keyof T];
export type ITSValueOfArray<T extends readonly any[]> = ITSValueOf<T>;
```

**範例**:
```ts
type Arr = string[];
type Element = ITSValueOfArray<Arr>;
// 輸出結果：type Element = string

type Arr2 = [string, number, boolean];
type Element2 = ITSValueOfArray<Arr2>;
// 輸出結果：type Element2 = string | number | boolean
```

---

### ITSToReadonlyArray

- **位置**: `lib/helper/array/readonly.ts`
- **功能**: 將可寫陣列轉為唯讀陣列

**原始碼**:
```ts
export type ITSToReadonlyArray<T extends any[]> = T & readonly any[];
```

**範例**:
```ts
type Arr = string[];
type ReadonlyArr = ITSToReadonlyArray<Arr>;
// 輸出結果：type ReadonlyArr = readonly string[]
```

---

### ITSToWriteableArray

- **位置**: `lib/helper/array/readonly.ts`
- **功能**: 將唯讀陣列轉為可寫陣列

**原始碼**:
```ts
export type ITSToWriteableArray<T extends readonly any[]> = T extends readonly (infer U)[] ? U[] : never;
```

**範例**:
```ts
type Arr = readonly string[];
type WritableArr = ITSToWriteableArray<Arr>;
// 輸出結果：type WritableArr = string[]
```

---

## 13. 字串類型 / String Types

### ITSToStringLiteral

- **位置**: `lib/helper/string.ts`
- **功能**: 將類型轉為字面量類型

**原始碼**:
```ts
export type ITSToStringLiteral<T> = string extends T ? string : T & string;
```

**範例**:
```ts
type Result = ITSToStringLiteral<123>;
// 輸出結果：type Result = "123"

type Result2 = ITSToStringLiteral<'hello'>;
// 輸出結果：type Result2 = "hello"

type Result3 = ITSToStringLiteral<string>;
// 輸出結果：type Result3 = string
```

---

### ITSCamelCase

- **位置**: `lib/helper/string/literal-string.ts`
- **功能**: 轉為駝峰式命名

**原始碼**:
```ts
export type ITSCamelCase<S extends string> =
    string extends S ? string :
    S extends `${infer T}-${infer U}` ? `${T}${ITSPascalCase<U>}` : S;
```

**範例**:
```ts
type Result = ITSCamelCase<'hello_world'>;
// 輸出結果：type Result = "helloWorld"

type Result2 = ITSCamelCase<'hello-world'>;
// 輸出結果：type Result2 = "helloWorld"
```

---

### ITSPascalCase

- **位置**: `lib/helper/string/literal-string.ts`
- **功能**: 轉為帕斯卡命名

**原始碼**:
```ts
export type ITSPascalCase<S extends string> =
    string extends S ? string :
    S extends `${infer T}-${infer U}` ? `${Capitalize<T>}${ITSPascalCase<U>}` : Capitalize<S>;
```

**範例**:
```ts
type Result = ITSPascalCase<'hello_world'>;
// 輸出結果：type Result = "HelloWorld"

type Result2 = ITSPascalCase<'hello-world'>;
// 輸出結果：type Result2 = "HelloWorld"
```

---

## 14. Promise 類型 / Promise Types

### ITSAwaitedReturnType

- **位置**: `lib/helper/promise.ts`
- **功能**: 解析 Promise 的返回類型

**原始碼**:
```ts
export type ITSAwaitedReturnType<T extends ITSAnyFunction> = ITSAwaitedLazy<ReturnType<T>>;
```

**範例**:
```ts
declare function fetch(): Promise<string>;
type Result = ITSAwaitedReturnType<typeof fetch>;
// 輸出結果：type Result = string

declare function fetch2(): Promise<Promise<number>>;
type Result2 = ITSAwaitedReturnType<typeof fetch2>;
// 輸出結果：type Result2 = number
```

---

### ITSDeferred

- **位置**: `lib/type/promise.ts`
- **功能**: 延遲物件類型

**原始碼**:
```ts
export type ITSDeferred<T> = {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
};
```

**範例**:
```ts
type Def = ITSDeferred<string>;
// 輸出結果：type Def = { promise: Promise<string>; resolve: (value: string) => void; reject: (reason?: any) => void; }
```

---

## 15. 函數類型 / Function Types

### ITSOverwriteReturnType

- **位置**: `lib/helper.ts`
- **功能**: 覆寫函數返回值類型

**原始碼**:
```ts
export type ITSOverwriteReturnType<T extends (...args: any[]) => any, R extends unknown> = (...args: Parameters<T>) => R;
```

**範例**:
```ts
declare function f(a: number): number;
type Result = ITSOverwriteReturnType<typeof f, string>;
// 輸出結果：type Result = (a: number) => string
```

---

### ITSUnionToIntersection

- **位置**: `lib/helper/intersection.ts`
- **功能**: 將聯合類型轉為交集類型

**原始碼**:
```ts
export type ITSUnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
```

**範例**:
```ts
type Union = { a: string } | { b: number };
type Intersection = ITSUnionToIntersection<Union>;
// 輸出結果：type Intersection = { a: string } & { b: number }
```
