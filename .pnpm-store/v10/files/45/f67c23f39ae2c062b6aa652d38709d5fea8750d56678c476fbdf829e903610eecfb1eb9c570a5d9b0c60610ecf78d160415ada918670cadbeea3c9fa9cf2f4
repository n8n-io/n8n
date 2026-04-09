# 字串與數字類型工具 / String & Number Type Utilities

## 概述 / Overview

提供字串和數字類型的操作工具，包括字面量類型轉換，大小寫轉換、類型推斷等。

Provides string and number type manipulation utilities, including literal type conversion, case conversion, type inference, and more.

## 來源 / Source

- [`lib/helper/string.ts`](../lib/helper/string.ts)
- [`lib/helper/string/infer.ts`](../lib/helper/string/infer.ts)
- [`lib/helper/string/literal-string.ts`](../lib/helper/string/literal-string.ts)
- [`lib/helper/number.ts`](../lib/helper/number.ts)

---

## 字串類型工具 / String Type Utilities

### ITSToStringLiteral

**將類型轉換為字面量類型**

```typescript
type Str = ITSToStringLiteral<'hello'>;
// type Str = "hello"

type Num = ITSToStringLiteral<42>;
// type Num = "42"
```

---

### ITSTypeAndStringLiteral

**原始類型與其字面量類型的聯合**

適合用在 enum 或 string literal union，可以接受 enum 的字面量或基底類型。

```typescript
// 應用於 string literal union
type Status = 'active' | 'inactive' | 'pending';
type IStatus = ITSTypeAndStringLiteral<Status>;
// type IStatus = "active" | "inactive" | "pending" | string

// 應用於 enum
enum EnumPackageManager {
  'yarn' = 'yarn',
  'npm' = 'npm',
  'pnpm' = 'pnpm',
}

type IPackageManager = ITSTypeAndStringLiteral<EnumPackageManager>;
// type IPackageManager = EnumPackageManager | string

// 應用於 number，可接受數字或數字字串
type INumber = ITSTypeAndStringLiteral<number>;
// type INumber = number | `${number}`
```

---

### ITSAndStringLiteral

**原始類型 S 與 T 的字面量類型的聯合**

```typescript
// 應用於數字字面量聯合
type Result = ITSAndStringLiteral<1 | 2 | 3, number>;
// type Result = number | "1" | "2" | "3"
```

---

### ITSAndTypeAndStringLiteral

**原始類型 S、T 與 T 的字面量類型的聯合**

```typescript
// 應用於數字字面量聯合
type Result = ITSAndTypeAndStringLiteral<1 | 2 | 3, number>;
// type Result = number | "1" | "2" | "3"
```

---

### ITSPascalCase

**將連字符命名字符串轉換為 PascalCase**

```typescript
type Pascal = ITSPascalCase<'foo-bar'>;
// type Pascal = "FooBar"

type Multiple = ITSPascalCase<'foo-bar-baz'>;
// type Multiple = "FooBarBaz"
```

---

### ITSCamelCase

**將連字符命名字符串轉換為 camelCase**

```typescript
type Camel = ITSCamelCase<'foo-bar'>;
// type Camel = "fooBar"

type Multiple = ITSCamelCase<'foo-bar-baz'>;
// type Multiple = "fooBarBaz"
```

---

### ITSStringInferToNumber

**從字串推斷數字類型**

```typescript
type Num = ITSStringInferToNumber<'123'>;
// type Num = 123
```

---

### ITSStringInferToBoolean

**從字串推斷布林類型**

```typescript
type Bool = ITSStringInferToBoolean<'true'>;
// type Bool = true
```

---

### ITSStringInferToNull

**從字串推斷 null 類型**

```typescript
type Null = ITSStringInferToNull<'null'>;
// type Null = null
```

---

### ITSStringInferToUndefined

**從字串推斷 undefined 類型**

```typescript
type Undefined = ITSStringInferToUndefined<'undefined'>;
// type Undefined = undefined
```

---

## 數字類型工具 / Number Type Utilities

### ITSNumberString

**將數字轉換為字串字面量類型**

```typescript
type NumStr = ITSNumberString<42>;
// type NumStr = "42"
```

---

### ITSUnpackNumberString

**從字串中解包出數字類型**

```typescript
type Test = ITSNumberString<123>;
type Result = ITSUnpackNumberString<Test>;
// type Result = 123
```

---

### ITSNumberValue

**數字值類型：數字或字串**

```typescript
type NumVal = ITSNumberValue;
// type NumVal = number | string
```

---

### ITSNumberValue2

**數字值類型2：數字或數字字串**

```typescript
type NumVal2 = ITSNumberValue2;
// type NumVal2 = number | "42" (字面量)
```

---

## 使用範例 / Usage Examples

### 字符串大小寫轉換

```typescript
import { ITSPascalCase, ITSCamelCase } from 'ts-type';

// 轉為 PascalCase
type ComponentName = ITSPascalCase<'my-component'>;
// type ComponentName = "MyComponent"

// 轉為 camelCase
type variableName = ITSCamelCase<'my-variable'>;
// type variableName = "myVariable"
```

### 字串推斷類型

```typescript
import { ITSStringInferToNumber, ITSStringInferToBoolean } from 'ts-type';

// 從字面量推斷數字
type Age = ITSStringInferToNumber<'25'>;
// type Age = 25

// 從字面量推斷布林
type IsActive = ITSStringInferToBoolean<'true'>;
// type IsActive = true
```

### 數字與字串互轉

```typescript
import { ITSNumberString, ITSUnpackNumberString } from 'ts-type';

// 數字轉字串
type StrNum = ITSNumberString<100>;
// type StrNum = "100"

// 字串轉數字
type Num = ITSUnpackNumberString<'42'>;
// type Num = 42
```

### 應用在 String Literal Union

```typescript
import { ITSTypeAndStringLiteral } from 'ts-type';

// 定義 string literal union
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// 可以接受 string literal 或 string 類型
type IOrderStatus = ITSTypeAndStringLiteral<OrderStatus>;

// 有效
const status1: IOrderStatus = 'pending';
const status2: IOrderStatus = 'processing';
const status3: IOrderStatus = 'any-string-value'; // 接受任意字串

// 這是有效的，因為 string 是基底類型
function updateStatus(status: IOrderStatus): void {
  console.log(`Status: ${status}`);
}

updateStatus('delivered');
updateStatus('random-status'); // 合法
```

### 應用在 Enum

```typescript
import { ITSTypeAndStringLiteral } from 'ts-type';

enum EnumPackageManager {
  yarn = 'yarn',
  npm = 'npm',
  pnpm = 'pnpm',
}

// 可以接受 enum 的字面量或基底類型
type IPackageManager = ITSTypeAndStringLiteral<EnumPackageManager>;

// 有效
const manager1: IPackageManager = 'yarn';
const manager2: IPackageManager = 'npm';
const manager3: IPackageManager = EnumPackageManager.yarn;

// 這也是有效的，因為 string 是基底類型
const manager4: IPackageManager = 'pnpm';

// 不會接受其他未在 enum 中定義的字串
// const invalid: IPackageManager = 'bun'; // Error!
```

### 應用在數字類型

```typescript
import { ITSTypeAndStringStringLiteral, ITSLiteral, ITSAndAndTypeAndStringLiteral } from 'ts-type';

// 接受數字或數字字串
type INumber = ITSTypeAndStringLiteral<number>;
// type INumber = number | `${number}`

const num1: INumber = 42;
const num2: INumber = '42';

// 數字字面量聯合
type Result1 = ITSAndStringLiteral<1 | 2 | 3, number>;
// type Result1 = number | "1" | "2" | "3"

const val1: Result1 = 1;
const val2: Result1 = '2';

type Result2 = ITSAndTypeAndStringLiteral<1 | 2 | 3, number>;
// type Result2 = number | "1" | "2" | "3"

const val3: Result2 = 3;
const val4: Result2 = '1';
```
