# 內建類型 / Built-in Types

## 概述 / Overview

重新導出 TypeScript 內建類型，並提供包裝類型以增強 IDE 識別能力。

Re-exports TypeScript built-in types and provides wrapper types to enhance IDE recognition.

## 來源 / Source

- [`lib/_build-in.ts`](../lib/_build-in.ts)

---

## 類型列表 / Type List

### ITSParameters

**取得函數的參數類型**

取得函數參數的元組類型。

```typescript
function greet(name: string, age: number): string {
  return `Hello, ${name}! You are ${age} years old.`;
}

type GreetParams = ITSParameters<typeof greet>;
// type GreetParams = [name: string, age: number]
```

---

### ITSConstructorParameters

**取得建構函數的參數類型**

取得建構函數參數的元組類型。

```typescript
class User {
  constructor(name: string, age: number) {}
}

type UserConstructorParams = ITSConstructorParameters<typeof User>;
// type UserConstructorParams = [name: string, age: number]
```

---

### ITSPartial

**將類型的所有屬性設為可選**

```typescript
interface User {
  name: string;
  age: number;
}

type PartialUser = ITSPartial<User>;
// type PartialUser = { name?: string; age?: number; }
```

---

### ITSPick

**從類型 T 中選取指定的屬性 K**

```typescript
interface User {
  name: string;
  age: number;
  email: string;
}

type UserName = ITSPick<User, 'name'>;
// type UserName = { name: string; }
```

---

### ITSInstanceType

**取得建構函數實例的類型**

```typescript
class User {
  name: string;
}

type UserInstance = ITSInstanceType<typeof User>;
// type UserInstance = User
```

---

### ITSClassDecorator

**類別裝飾器類型**

```typescript
type MyClassDecorator = ITSClassDecorator;
// type MyClassDecorator = <TFunction extends Function>(target: TFunction) => TFunction | void;
```

---

### ITSPropertyDecorator

**屬性裝飾器類型**

```typescript
type MyPropertyDecorator = ITSPropertyDecorator;
// type MyPropertyDecorator = (target: object, propertyKey: string | symbol) => void;
```

---

### ITSMethodDecorator

**方法裝飾器類型**

```typescript
type MyMethodDecorator = ITSMethodDecorator;
// type MyMethodDecorator = <T>(target: object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void;
```

---

### ITSParameterDecorator

**參數裝飾器類型**

```typescript
type MyParameterDecorator = ITSParameterDecorator;
// type MyParameterDecorator = (target: object, propertyKey: string | symbol, parameterIndex: number) => void;
```

---

### ITSNonNullable

**從 T 中排除 null 和 undefined**

```typescript
type NullableString = string | null | undefined;
type NonNullString = ITSNonNullable<NullableString>;
// type NonNullString = string
```

---

## 裝飾器使用範例 / Decorator Usage Examples

### 類別裝飾器

```typescript
function LogClass(target: any): any {
  console.log(`Class ${target.name} was defined`);
  return target;
}

const MyDecorator: ITSClassDecorator = LogClass;

@MyDecorator
class MyClass {}
```

### 屬性裝飾器

```typescript
function LogProperty(target: any, propertyKey: string | symbol): void {
  console.log(`Property ${String(propertyKey)} was accessed`);
}

class MyClass {
  @LogProperty
  myProperty: string;
}
```

### 方法裝飾器

```typescript
function LogMethod(target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> {
  const originalMethod = descriptor.value;
  descriptor.value = function(...args: any[]) {
    console.log(`Method ${String(propertyKey)} called with args:`, args);
    return originalMethod.apply(this, args);
  };
  return descriptor;
}

class MyClass {
  @LogMethod
  myMethod() {}
}
```
