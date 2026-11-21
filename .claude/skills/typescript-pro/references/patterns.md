# TypeScript Patterns

## Builder Pattern

```typescript
// Type-safe builder with progressive types
class UserBuilder {
  private data: Partial<User> = {};

  setName(name: string): this {
    this.data.name = name;
    return this;
  }

  setEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  setAge(age: number): this {
    this.data.age = age;
    return this;
  }

  build(): User {
    if (!this.data.name || !this.data.email) {
      throw new Error('Name and email are required');
    }
    return this.data as User;
  }
}

// Fluent API with type safety
const user = new UserBuilder()
  .setName('John')
  .setEmail('john@example.com')
  .setAge(30)
  .build();

// Advanced builder with compile-time validation
type Builder<T, K extends keyof T = never> = {
  [P in keyof T as `set${Capitalize<string & P>}`]: (
    value: T[P]
  ) => Builder<T, K | P>;
} & {
  build: K extends keyof T ? () => T : never;
};

function createBuilder<T>(): Builder<T> {
  const data = {} as T;

  return new Proxy({} as Builder<T>, {
    get(_, prop: string) {
      if (prop === 'build') {
        return () => data;
      }
      if (prop.startsWith('set')) {
        const key = prop.slice(3).toLowerCase();
        return (value: any) => {
          (data as any)[key] = value;
          return this;
        };
      }
    }
  });
}
```

## Factory Pattern

```typescript
// Abstract factory with type safety
interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }
}

class FileLogger implements Logger {
  constructor(private filename: string) {}

  log(message: string): void {
    // Write to file
  }
}

type LoggerType = 'console' | 'file';
type LoggerConfig<T extends LoggerType> = T extends 'file'
  ? { type: T; filename: string }
  : { type: T };

class LoggerFactory {
  static create<T extends LoggerType>(config: LoggerConfig<T>): Logger {
    switch (config.type) {
      case 'console':
        return new ConsoleLogger();
      case 'file':
        return new FileLogger(config.filename);
      default:
        throw new Error('Unknown logger type');
    }
  }
}

const consoleLogger = LoggerFactory.create({ type: 'console' });
const fileLogger = LoggerFactory.create({ type: 'file', filename: 'app.log' });

// Generic factory with dependency injection
type Constructor<T> = new (...args: any[]) => T;

class Container {
  private instances = new Map<Constructor<any>, any>();

  register<T>(token: Constructor<T>, instance: T): void {
    this.instances.set(token, instance);
  }

  resolve<T>(token: Constructor<T>): T {
    const instance = this.instances.get(token);
    if (!instance) {
      throw new Error(`No instance registered for ${token.name}`);
    }
    return instance;
  }
}
```

## Repository Pattern

```typescript
// Type-safe repository with generic CRUD
interface Entity {
  id: string | number;
}

interface Repository<T extends Entity> {
  find(id: T['id']): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: T['id'], data: Partial<Omit<T, 'id'>>): Promise<T>;
  delete(id: T['id']): Promise<void>;
}

class UserRepository implements Repository<User> {
  async find(id: User['id']): Promise<User | null> {
    // Database query
    return null;
  }

  async findAll(): Promise<User[]> {
    return [];
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    // Insert into database
    return { id: 1, ...data };
  }

  async update(id: User['id'], data: Partial<Omit<User, 'id'>>): Promise<User> {
    // Update database
    return { id, name: '', email: '', ...data };
  }

  async delete(id: User['id']): Promise<void> {
    // Delete from database
  }
}

// Query builder with type safety
class QueryBuilder<T> {
  private conditions: Array<(item: T) => boolean> = [];

  where<K extends keyof T>(key: K, value: T[K]): this {
    this.conditions.push(item => item[key] === value);
    return this;
  }

  execute(items: T[]): T[] {
    return items.filter(item =>
      this.conditions.every(condition => condition(item))
    );
  }
}

const query = new QueryBuilder<User>()
  .where('email', 'john@example.com')
  .where('age', 30);
```

## Type-Safe API Client

```typescript
// REST API client with type safety
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type ApiEndpoints = {
  '/users': {
    GET: { response: User[] };
    POST: { body: CreateUserDto; response: User };
  };
  '/users/:id': {
    GET: { params: { id: string }; response: User };
    PUT: { params: { id: string }; body: UpdateUserDto; response: User };
    DELETE: { params: { id: string }; response: void };
  };
  '/posts': {
    GET: { query: { userId?: string }; response: Post[] };
    POST: { body: CreatePostDto; response: Post };
  };
};

type ExtractParams<T extends string> =
  T extends `${infer _Start}/:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractParams<`/${Rest}`>
    : T extends `${infer _Start}/:${infer Param}`
    ? { [K in Param]: string }
    : {};

class ApiClient {
  async request<
    Path extends keyof ApiEndpoints,
    Method extends keyof ApiEndpoints[Path]
  >(
    method: Method,
    path: Path,
    options?: ApiEndpoints[Path][Method] extends { body: infer B }
      ? { body: B }
      : ApiEndpoints[Path][Method] extends { params: infer P }
      ? { params: P }
      : ApiEndpoints[Path][Method] extends { query: infer Q }
      ? { query: Q }
      : never
  ): Promise<
    ApiEndpoints[Path][Method] extends { response: infer R } ? R : never
  > {
    // Make HTTP request
    return null as any;
  }
}

const client = new ApiClient();

// Type-safe API calls
const users = await client.request('GET', '/users');
const user = await client.request('GET', '/users/:id', { params: { id: '1' } });
const newUser = await client.request('POST', '/users', {
  body: { name: 'John', email: 'john@example.com' }
});
```

## State Machine Pattern

```typescript
// Type-safe state machine
type State = 'idle' | 'loading' | 'success' | 'error';

type Event =
  | { type: 'FETCH' }
  | { type: 'SUCCESS'; data: any }
  | { type: 'ERROR'; error: Error }
  | { type: 'RETRY' };

type StateMachine = {
  [S in State]: {
    [E in Event['type']]?: State;
  };
};

const machine: StateMachine = {
  idle: { FETCH: 'loading' },
  loading: { SUCCESS: 'success', ERROR: 'error' },
  success: { FETCH: 'loading' },
  error: { RETRY: 'loading' }
};

class StateManager<S extends string, E extends { type: string }> {
  constructor(
    private state: S,
    private transitions: Record<S, Partial<Record<E['type'], S>>>
  ) {}

  getState(): S {
    return this.state;
  }

  dispatch(event: E): S {
    const nextState = this.transitions[this.state][event.type];
    if (nextState === undefined) {
      throw new Error(`Invalid transition from ${this.state} on ${event.type}`);
    }
    this.state = nextState;
    return this.state;
  }
}

const manager = new StateManager<State, Event>('idle', machine);
manager.dispatch({ type: 'FETCH' }); // 'loading'
manager.dispatch({ type: 'SUCCESS', data: {} }); // 'success'
```

## Decorator Pattern

```typescript
// Method decorators with type safety
function Log(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with`, args);
    const result = originalMethod.apply(this, args);
    console.log(`Result:`, result);
    return result;
  };

  return descriptor;
}

function Memoize(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  const cache = new Map<string, any>();

  descriptor.value = function (...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = originalMethod.apply(this, args);
    cache.set(key, result);
    return result;
  };

  return descriptor;
}

class Calculator {
  @Log
  @Memoize
  fibonacci(n: number): number {
    if (n <= 1) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }
}
```

## Result/Either Pattern

```typescript
// Type-safe error handling
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

function ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

async function fetchUser(id: string): Promise<Result<User, string>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      return err('User not found');
    }
    const user = await response.json();
    return ok(user);
  } catch (error) {
    return err('Network error');
  }
}

// Usage with pattern matching
const result = await fetchUser('123');
if (result.success) {
  console.log(result.value.name); // Type-safe access
} else {
  console.error(result.error); // Type-safe error
}

// Either monad
class Either<L, R> {
  private constructor(
    private readonly value: L | R,
    private readonly isRight: boolean
  ) {}

  static left<L, R>(value: L): Either<L, R> {
    return new Either<L, R>(value, false);
  }

  static right<L, R>(value: R): Either<L, R> {
    return new Either<L, R>(value, true);
  }

  map<T>(fn: (value: R) => T): Either<L, T> {
    if (this.isRight) {
      return Either.right(fn(this.value as R));
    }
    return Either.left(this.value as L);
  }

  flatMap<T>(fn: (value: R) => Either<L, T>): Either<L, T> {
    if (this.isRight) {
      return fn(this.value as R);
    }
    return Either.left(this.value as L);
  }

  getOrElse(defaultValue: R): R {
    return this.isRight ? (this.value as R) : defaultValue;
  }
}
```

## Singleton Pattern

```typescript
// Type-safe singleton
class Database {
  private static instance: Database;
  private constructor() {
    // Private constructor prevents instantiation
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  query<T>(sql: string): Promise<T[]> {
    // Execute query
    return Promise.resolve([]);
  }
}

const db = Database.getInstance();

// Generic singleton factory
function singleton<T>(factory: () => T): () => T {
  let instance: T | undefined;
  return () => {
    if (!instance) {
      instance = factory();
    }
    return instance;
  };
}

const getConfig = singleton(() => ({
  apiUrl: process.env.API_URL,
  apiKey: process.env.API_KEY
}));
```

## Quick Reference

| Pattern | Use Case |
|---------|----------|
| Builder | Construct complex objects step by step |
| Factory | Create objects without specifying exact class |
| Repository | Abstract data access layer |
| API Client | Type-safe HTTP requests |
| State Machine | Manage state transitions |
| Decorator | Add behavior to methods |
| Result/Either | Type-safe error handling |
| Singleton | Ensure single instance |
| Query Builder | Type-safe database queries |
| Container | Dependency injection |
