# Type Guards and Narrowing

## Type Predicates

```typescript
// Basic type predicate
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function processValue(value: string | number) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // value is string
  } else {
    console.log(value.toFixed(2)); // value is number
  }
}

// Generic type predicate
function isArray<T>(value: T | T[]): value is T[] {
  return Array.isArray(value);
}

// Narrowing to specific interface
interface User {
  type: 'user';
  name: string;
  email: string;
}

interface Admin {
  type: 'admin';
  name: string;
  permissions: string[];
}

function isAdmin(account: User | Admin): account is Admin {
  return account.type === 'admin';
}
```

## Discriminated Unions

```typescript
// Tagged union pattern
type Result<T, E = Error> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: E }
  | { status: 'loading' };

function handleResult<T>(result: Result<T>) {
  switch (result.status) {
    case 'success':
      console.log(result.data); // Narrowed to success
      break;
    case 'error':
      console.error(result.error); // Narrowed to error
      break;
    case 'loading':
      console.log('Loading...'); // Narrowed to loading
      break;
  }
}

// Complex discriminated union
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    case 'triangle':
      return (shape.base * shape.height) / 2;
  }
}

// Exhaustive checking
function assertNever(x: never): never {
  throw new Error('Unexpected value: ' + x);
}

function processShape(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return shape.radius;
    case 'rectangle':
      return shape.width;
    case 'triangle':
      return shape.base;
    default:
      return assertNever(shape); // Compile error if not exhaustive
  }
}
```

## Built-in Type Guards

```typescript
// typeof narrowing
function printValue(value: string | number | boolean) {
  if (typeof value === 'string') {
    console.log(value.toUpperCase());
  } else if (typeof value === 'number') {
    console.log(value.toFixed(2));
  } else {
    console.log(value ? 'yes' : 'no');
  }
}

// instanceof narrowing
class Dog {
  bark() { console.log('woof'); }
}

class Cat {
  meow() { console.log('meow'); }
}

function makeSound(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark();
  } else {
    animal.meow();
  }
}

// in operator narrowing
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ('swim' in animal) {
    animal.swim();
  } else {
    animal.fly();
  }
}

// Truthiness narrowing
function printLength(value: string | null | undefined) {
  if (value) {
    console.log(value.length); // Narrowed to string
  }
}

// Equality narrowing
function compare(x: string | number, y: string | boolean) {
  if (x === y) {
    // x and y are both string
    console.log(x.toUpperCase(), y.toUpperCase());
  }
}
```

## Assertion Functions

```typescript
// Basic assertion function
function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function processUser(user: unknown) {
  assert(typeof user === 'object' && user !== null);
  assert('name' in user && typeof user.name === 'string');
  console.log(user.name.toUpperCase()); // user is narrowed
}

// Type assertion function
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Value is not a string');
  }
}

function greet(name: unknown) {
  assertIsString(name);
  console.log(`Hello, ${name.toUpperCase()}`); // name is string
}

// Generic assertion function
function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error('Value is null or undefined');
  }
}

function processValue(value: string | null) {
  assertIsDefined(value);
  console.log(value.length); // value is string
}

// Assert with type predicate
function assertIsUser(value: unknown): asserts value is User {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('type' in value) ||
    value.type !== 'user'
  ) {
    throw new Error('Not a user');
  }
}
```

## Control Flow Analysis

```typescript
// Assignment narrowing
let x: string | number = Math.random() > 0.5 ? 'hello' : 42;

if (typeof x === 'string') {
  x; // string
} else {
  x; // number
}

// Return statement narrowing
function getValue(flag: boolean): string | number {
  if (flag) {
    return 'hello';
  }
  return 42; // TypeScript knows this must be number
}

// Throw statement narrowing
function processValue(value: string | null) {
  if (!value) {
    throw new Error('Value is required');
  }
  console.log(value.length); // value is string (null thrown above)
}

// Type guards in array methods
const mixed: (string | number)[] = ['a', 1, 'b', 2];
const strings = mixed.filter((x): x is string => typeof x === 'string');
// strings is string[]
```

## Branded Types

```typescript
// Nominal typing with branded types
type Brand<K, T> = K & { __brand: T };

type UserId = Brand<string, 'UserId'>;
type Email = Brand<string, 'Email'>;
type Url = Brand<string, 'Url'>;

// Constructor functions
function createUserId(id: string): UserId {
  return id as UserId;
}

function createEmail(email: string): Email {
  if (!email.includes('@')) {
    throw new Error('Invalid email');
  }
  return email as Email;
}

// Usage prevents mixing
const userId: UserId = createUserId('user-123');
const email: Email = createEmail('user@example.com');

// const wrongAssignment: UserId = email; // Error!

// Type guard for branded types
function isUserId(value: string): value is UserId {
  return /^user-\d+$/.test(value);
}

// Branded numbers
type Positive = Brand<number, 'Positive'>;
type Integer = Brand<number, 'Integer'>;

function createPositive(n: number): Positive {
  if (n <= 0) throw new Error('Must be positive');
  return n as Positive;
}

function createInteger(n: number): Integer {
  if (!Number.isInteger(n)) throw new Error('Must be integer');
  return n as Integer;
}
```

## Advanced Narrowing Patterns

```typescript
// Array.isArray with generics
function processInput<T>(input: T | T[]): T[] {
  return Array.isArray(input) ? input : [input];
}

// Object key narrowing
function getProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K
): T[K] {
  return obj[key];
}

// Mapped type narrowing
type Nullable<T> = { [K in keyof T]: T[K] | null };

function isComplete<T extends object>(
  obj: Nullable<T>
): obj is T {
  return Object.values(obj).every((v) => v !== null);
}

// Custom narrowing with type maps
type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
};

function is<K extends keyof TypeMap>(
  type: K,
  value: unknown
): value is TypeMap[K] {
  return typeof value === type;
}

if (is('string', someValue)) {
  someValue.toUpperCase(); // someValue is string
}
```

## Quick Reference

| Pattern | Use Case |
|---------|----------|
| `value is Type` | Type predicate function |
| `asserts condition` | Assertion function |
| `asserts value is Type` | Type assertion function |
| Discriminated union | Tagged union with literal type |
| `typeof` guard | Primitive type checking |
| `instanceof` guard | Class instance checking |
| `in` operator | Property existence check |
| `assertNever` | Exhaustive switch checking |
| Branded types | Nominal typing simulation |
| `NonNullable<T>` | Remove null/undefined |
