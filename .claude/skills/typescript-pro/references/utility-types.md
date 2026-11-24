# Utility Types

## Built-in Utility Types

```typescript
// Partial - All properties optional
interface User {
  id: number;
  name: string;
  email: string;
}

type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string; }

function updateUser(id: number, updates: Partial<User>) {
  // Only pass fields to update
}

// Required - All properties required
type RequiredUser = Required<PartialUser>;
// { id: number; name: string; email: string; }

// Readonly - All properties readonly
type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string; readonly email: string; }

// Pick - Select specific properties
type UserSummary = Pick<User, 'id' | 'name'>;
// { id: number; name: string; }

// Omit - Exclude specific properties
type UserWithoutEmail = Omit<User, 'email'>;
// { id: number; name: string; }

// Record - Create object type with specific keys
type UserRoles = Record<string, 'admin' | 'user' | 'guest'>;
// { [key: string]: 'admin' | 'user' | 'guest' }

type PageInfo = Record<'home' | 'about' | 'contact', { title: string }>;
// { home: { title: string }, about: { title: string }, contact: { title: string } }
```

## Type Extraction Utilities

```typescript
// Extract - Extract types from union
type AllTypes = 'a' | 'b' | 'c' | 1 | 2 | 3;
type StringTypes = Extract<AllTypes, string>; // 'a' | 'b' | 'c'
type NumberTypes = Extract<AllTypes, number>; // 1 | 2 | 3

// Exclude - Remove types from union
type WithoutNumbers = Exclude<AllTypes, number>; // 'a' | 'b' | 'c'

// NonNullable - Remove null and undefined
type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>; // string

// ReturnType - Extract function return type
function getUser() {
  return { id: 1, name: 'John' };
}

type User = ReturnType<typeof getUser>; // { id: number; name: string }

// Parameters - Extract function parameter types
function createUser(name: string, age: number) {
  return { name, age };
}

type CreateUserParams = Parameters<typeof createUser>; // [string, number]

// ConstructorParameters - Extract constructor parameters
class Point {
  constructor(public x: number, public y: number) {}
}

type PointParams = ConstructorParameters<typeof Point>; // [number, number]

// InstanceType - Extract instance type from constructor
type PointInstance = InstanceType<typeof Point>; // Point
```

## Custom Utility Types

```typescript
// DeepPartial - Recursive partial
type DeepPartial<T> = T extends object ? {
  [K in keyof T]?: DeepPartial<T[K]>;
} : T;

interface Config {
  database: {
    host: string;
    port: number;
    credentials: {
      username: string;
      password: string;
    };
  };
}

type PartialConfig = DeepPartial<Config>;
// All nested properties are optional

// DeepReadonly - Recursive readonly
type DeepReadonly<T> = T extends object ? {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
} : T;

// Mutable - Remove readonly
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

type MutableUser = Mutable<ReadonlyUser>;

// PickByType - Pick properties by value type
type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

interface Mixed {
  id: number;
  name: string;
  age: number;
  email: string;
}

type StringProps = PickByType<Mixed, string>; // { name: string; email: string }
type NumberProps = PickByType<Mixed, number>; // { id: number; age: number }

// OmitByType - Omit properties by value type
type OmitByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};

type NoStrings = OmitByType<Mixed, string>; // { id: number; age: number }
```

## Function Utilities

```typescript
// Promisify - Convert sync to async
type Promisify<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => Promise<ReturnType<T>>;

function syncFunction(x: number): string {
  return x.toString();
}

type AsyncVersion = Promisify<typeof syncFunction>;
// (x: number) => Promise<string>

// Awaited - Unwrap promise type
type AwaitedString = Awaited<Promise<string>>; // string
type DeepAwaited = Awaited<Promise<Promise<number>>>; // number

// ThisParameterType - Extract this parameter
function greet(this: User, message: string) {
  return `${this.name}: ${message}`;
}

type ThisType = ThisParameterType<typeof greet>; // User

// OmitThisParameter - Remove this parameter
type GreetFunction = OmitThisParameter<typeof greet>;
// (message: string) => string
```

## Advanced Custom Utilities

```typescript
// Nullable - Add null and undefined
type Nullable<T> = T | null | undefined;

// ValueOf - Get union of all property values
type ValueOf<T> = T[keyof T];

interface Codes {
  success: 200;
  notFound: 404;
  error: 500;
}

type StatusCode = ValueOf<Codes>; // 200 | 404 | 500

// RequireAtLeastOne - Require at least one property
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

interface Options {
  id?: number;
  name?: string;
  email?: string;
}

type AtLeastOne = RequireAtLeastOne<Options>;
// Must have at least one of id, name, or email

// RequireOnlyOne - Require exactly one property
type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?:
      Required<Pick<T, K>> &
      Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

type OnlyOne = RequireOnlyOne<Options>;
// Must have exactly one of id, name, or email

// Merge - Deep merge two types
type Merge<T, U> = Omit<T, keyof U> & U;

interface Base {
  id: number;
  name: string;
}

interface Extension {
  name: string; // Override
  email: string; // Add
}

type Combined = Merge<Base, Extension>;
// { id: number; name: string; email: string }

// ConditionalKeys - Get keys matching condition
type ConditionalKeys<T, Condition> = {
  [K in keyof T]: T[K] extends Condition ? K : never;
}[keyof T];

type FunctionKeys = ConditionalKeys<typeof Math, Function>;
// 'abs' | 'acos' | 'sin' | ...
```

## Tuple Utilities

```typescript
// First - Get first element type
type First<T extends any[]> = T extends [infer F, ...any[]] ? F : never;

type FirstType = First<[string, number, boolean]>; // string

// Last - Get last element type
type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;

type LastType = Last<[string, number, boolean]>; // boolean

// Tail - Remove first element
type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never;

type TailTypes = Tail<[string, number, boolean]>; // [number, boolean]

// Prepend - Add element to beginning
type Prepend<T extends any[], U> = [U, ...T];

type WithString = Prepend<[number, boolean], string>; // [string, number, boolean]

// Reverse - Reverse tuple
type Reverse<T extends any[]> =
  T extends [infer First, ...infer Rest]
    ? [...Reverse<Rest>, First]
    : [];

type Reversed = Reverse<[1, 2, 3]>; // [3, 2, 1]
```

## String Utilities

```typescript
// Split - Split string into tuple
type Split<S extends string, D extends string> =
  S extends `${infer T}${D}${infer U}`
    ? [T, ...Split<U, D>]
    : [S];

type Parts = Split<'a-b-c', '-'>; // ['a', 'b', 'c']

// Join - Join tuple into string
type Join<T extends string[], D extends string> =
  T extends [infer F extends string, ...infer R extends string[]]
    ? R extends []
      ? F
      : `${F}${D}${Join<R, D>}`
    : '';

type Joined = Join<['a', 'b', 'c'], '-'>; // 'a-b-c'

// Replace - Replace substring
type Replace<
  S extends string,
  From extends string,
  To extends string
> = S extends `${infer L}${From}${infer R}`
  ? `${L}${To}${R}`
  : S;

type Replaced = Replace<'hello world', 'world', 'TypeScript'>;
// 'hello TypeScript'

// TrimLeft - Remove leading whitespace
type TrimLeft<S extends string> =
  S extends ` ${infer Rest}` ? TrimLeft<Rest> : S;

type Trimmed = TrimLeft<'  hello'>; // 'hello'
```

## Quick Reference

| Utility | Purpose |
|---------|---------|
| `Partial<T>` | Make all properties optional |
| `Required<T>` | Make all properties required |
| `Readonly<T>` | Make all properties readonly |
| `Pick<T, K>` | Select subset of properties |
| `Omit<T, K>` | Remove subset of properties |
| `Record<K, T>` | Create object type with keys K |
| `Extract<T, U>` | Extract types assignable to U |
| `Exclude<T, U>` | Remove types assignable to U |
| `NonNullable<T>` | Remove null and undefined |
| `ReturnType<T>` | Extract function return type |
| `Parameters<T>` | Extract function parameters |
| `Awaited<T>` | Unwrap Promise type |
