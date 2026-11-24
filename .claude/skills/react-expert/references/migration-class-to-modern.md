# Class to Modern React Migration Guide

---

## When to Use This Guide

**Migrate when:**
- Adopting React 18+ features (concurrent rendering, Suspense)
- Improving code reusability and composition
- Reducing bundle size (hooks generally smaller)
- Enabling Server Components in Next.js 13+
- Team standardizing on modern patterns
- Performance optimization opportunities exist
- Testing complexity needs reduction

**Do NOT migrate when:**
- Error boundaries (still require class components)
- Legacy codebase with no maintenance budget
- Component works perfectly and isn't changing
- Team lacks hooks expertise
- Third-party library requires class inheritance
- Migration risk exceeds benefit

**Migration Priority:**
1. New features (write with hooks)
2. Frequently modified components
3. Components with reusable logic
4. Performance bottlenecks
5. Stable, working components (lowest priority)

---

## Lifecycle to Hooks Concept Map

| Class Component | Modern React Equivalent | Notes |
|----------------|------------------------|-------|
| `constructor` | `useState` initialization | No separate constructor needed |
| `componentDidMount` | `useEffect(() => {}, [])` | Empty dependency array |
| `componentDidUpdate` | `useEffect(() => {})` | Runs after every render |
| `componentWillUnmount` | `useEffect` cleanup | Return cleanup function |
| `shouldComponentUpdate` | `React.memo` | Wrap component, custom comparator |
| `getDerivedStateFromProps` | Avoid or use render-time calculation | Usually an anti-pattern |
| `getSnapshotBeforeUpdate` | `useLayoutEffect` | Rarely needed |
| `componentDidCatch` | No hook equivalent | Keep class component |
| `this.forceUpdate()` | `useState` + setter toggle | Avoid, fix architecture |
| `this.state` | `useState` or `useReducer` | Multiple state slices |
| `this.setState` callback | `useEffect` watching state | Separate effect |

---

## Pattern 1: Constructor and State → useState

### Class Component

```tsx
interface Props {
  initialCount: number;
  userId: string;
}

interface State {
  count: number;
  user: User | null;
  isLoading: boolean;
}

class Counter extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      count: props.initialCount,
      user: null,
      isLoading: false,
    };
  }

  increment = () => {
    this.setState({ count: this.state.count + 1 });
  };

  render() {
    return (
      <div>
        <p>Count: {this.state.count}</p>
        <button onClick={this.increment}>Increment</button>
      </div>
    );
  }
}
```

### Modern React

```tsx
interface Props {
  initialCount: number;
  userId: string;
}

interface User {
  id: string;
  name: string;
}

function Counter({ initialCount, userId }: Props) {
  // Separate state slices for better granularity
  const [count, setCount] = useState(initialCount);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Arrow functions no longer need binding
  const increment = () => {
    setCount(prev => prev + 1); // Functional update for safety
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

**Key Differences:**
- No constructor needed
- Lazy initialization: `useState(() => expensiveComputation())`
- Functional updates prevent stale closure bugs
- Separate `useState` calls improve re-render optimization

---

## Pattern 2: Lifecycle Methods → useEffect

### Class Component

```tsx
class UserProfile extends React.Component<{ userId: string }, State> {
  state = {
    user: null as User | null,
    posts: [] as Post[],
  };

  async componentDidMount() {
    await this.fetchUser();
    await this.fetchPosts();
    window.addEventListener('resize', this.handleResize);
  }

  async componentDidUpdate(prevProps: Props) {
    if (prevProps.userId !== this.props.userId) {
      await this.fetchUser();
      await this.fetchPosts();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  fetchUser = async () => {
    const user = await api.getUser(this.props.userId);
    this.setState({ user });
  };

  fetchPosts = async () => {
    const posts = await api.getPosts(this.props.userId);
    this.setState({ posts });
  };

  handleResize = () => {
    // Handle resize
  };

  render() {
    return <div>{this.state.user?.name}</div>;
  }
}
```

### Modern React

```tsx
interface Props {
  userId: string;
}

interface User {
  id: string;
  name: string;
}

interface Post {
  id: string;
  title: string;
}

function UserProfile({ userId }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  // Fetch user when userId changes
  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      const userData = await api.getUser(userId);
      if (!cancelled) {
        setUser(userData);
      }
    }

    fetchUser();

    // Cleanup to prevent state updates after unmount
    return () => {
      cancelled = true;
    };
  }, [userId]); // Re-run when userId changes

  // Fetch posts when userId changes
  useEffect(() => {
    let cancelled = false;

    async function fetchPosts() {
      const postsData = await api.getPosts(userId);
      if (!cancelled) {
        setPosts(postsData);
      }
    }

    fetchPosts();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Event listener with cleanup
  useEffect(() => {
    function handleResize() {
      // Handle resize
    }

    window.addEventListener('resize', handleResize);

    // Cleanup removes listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty array = mount/unmount only

  return <div>{user?.name}</div>;
}
```

**Critical Points:**
- Separate effects for separate concerns
- Always include cleanup for subscriptions
- Cancellation flags prevent memory leaks
- Dependencies array must include all used values
- Empty array `[]` = mount/unmount only
- No array = after every render (rarely needed)

---

## Pattern 3: shouldComponentUpdate → React.memo

### Class Component

```tsx
class ExpensiveList extends React.Component<Props> {
  shouldComponentUpdate(nextProps: Props) {
    return (
      nextProps.items !== this.props.items ||
      nextProps.filter !== this.props.filter
    );
  }

  render() {
    const { items, filter } = this.props;
    const filtered = items.filter(item => item.includes(filter));
    return (
      <ul>
        {filtered.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
}
```

### Modern React

```tsx
interface Props {
  items: string[];
  filter: string;
  onItemClick?: (item: string) => void;
}

// React.memo with custom comparison
const ExpensiveList = React.memo<Props>(
  ({ items, filter, onItemClick }) => {
    // useMemo for expensive calculations
    const filtered = useMemo(
      () => items.filter(item => item.includes(filter)),
      [items, filter]
    );

    return (
      <ul>
        {filtered.map(item => (
          <li key={item} onClick={() => onItemClick?.(item)}>
            {item}
          </li>
        ))}
      </ul>
    );
  },
  // Custom comparison function (optional)
  (prevProps, nextProps) => {
    return (
      prevProps.items === nextProps.items &&
      prevProps.filter === nextProps.filter &&
      prevProps.onItemClick === nextProps.onItemClick
    );
  }
);

ExpensiveList.displayName = 'ExpensiveList';
```

**Optimization Checklist:**
- `React.memo` prevents re-renders when props unchanged
- `useMemo` caches expensive calculations
- `useCallback` stabilizes function references
- Custom comparator for complex props
- Shallow comparison is default

---

## Pattern 4: Complex State → useReducer

### Class Component

```tsx
class TodoManager extends React.Component<{}, State> {
  state = {
    todos: [] as Todo[],
    filter: 'all' as Filter,
    editingId: null as string | null,
  };

  addTodo = (text: string) => {
    this.setState(prev => ({
      todos: [...prev.todos, { id: uuid(), text, completed: false }],
    }));
  };

  toggleTodo = (id: string) => {
    this.setState(prev => ({
      todos: prev.todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    }));
  };

  deleteTodo = (id: string) => {
    this.setState(prev => ({
      todos: prev.todos.filter(todo => todo.id !== id),
    }));
  };

  setFilter = (filter: Filter) => {
    this.setState({ filter });
  };
}
```

### Modern React

```tsx
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

type Filter = 'all' | 'active' | 'completed';

interface State {
  todos: Todo[];
  filter: Filter;
  editingId: string | null;
}

type Action =
  | { type: 'ADD_TODO'; text: string }
  | { type: 'TOGGLE_TODO'; id: string }
  | { type: 'DELETE_TODO'; id: string }
  | { type: 'SET_FILTER'; filter: Filter }
  | { type: 'START_EDITING'; id: string }
  | { type: 'STOP_EDITING' };

function todoReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [
          ...state.todos,
          { id: crypto.randomUUID(), text: action.text, completed: false },
        ],
      };

    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.id
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      };

    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id !== action.id),
      };

    case 'SET_FILTER':
      return { ...state, filter: action.filter };

    case 'START_EDITING':
      return { ...state, editingId: action.id };

    case 'STOP_EDITING':
      return { ...state, editingId: null };

    default:
      return state;
  }
}

function TodoManager() {
  const [state, dispatch] = useReducer(todoReducer, {
    todos: [],
    filter: 'all',
    editingId: null,
  });

  // Action creators
  const addTodo = (text: string) => {
    dispatch({ type: 'ADD_TODO', text });
  };

  const toggleTodo = (id: string) => {
    dispatch({ type: 'TOGGLE_TODO', id });
  };

  // Derived state with useMemo
  const visibleTodos = useMemo(() => {
    switch (state.filter) {
      case 'active':
        return state.todos.filter(t => !t.completed);
      case 'completed':
        return state.todos.filter(t => t.completed);
      default:
        return state.todos;
    }
  }, [state.todos, state.filter]);

  return (
    <div>
      {visibleTodos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={() => toggleTodo(todo.id)}
        />
      ))}
    </div>
  );
}
```

**When to use useReducer:**
- Multiple related state values
- Complex state transitions
- Next state depends on previous
- Testing state logic separately
- Redux-like predictability needed

---

## Pattern 5: Refs Migration

### Class Component

```tsx
class FormWithFocus extends React.Component {
  inputRef = React.createRef<HTMLInputElement>();
  timeoutId: number | null = null;

  componentDidMount() {
    this.inputRef.current?.focus();
  }

  componentWillUnmount() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  handleSubmit = () => {
    const value = this.inputRef.current?.value;
    console.log(value);
  };

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <input ref={this.inputRef} />
      </form>
    );
  }
}
```

### Modern React

```tsx
function FormWithFocus() {
  // DOM ref
  const inputRef = useRef<HTMLInputElement>(null);

  // Mutable value ref (persists across renders)
  const timeoutIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Focus on mount
    inputRef.current?.focus();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value;
    console.log(value);
  };

  const handleDelayedAction = () => {
    timeoutIdRef.current = window.setTimeout(() => {
      console.log('Delayed action');
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} />
      <button type="button" onClick={handleDelayedAction}>
        Delayed
      </button>
    </form>
  );
}
```

**Ref Use Cases:**
- DOM access (focus, scroll, measurements)
- Storing mutable values (timers, subscriptions)
- Previous value tracking
- Instance variables replacement

---

## Pattern 6: HOC → Custom Hooks

### Class Component with HOC

```tsx
// HOC
function withAuth<P extends object>(
  Component: React.ComponentType<P & { user: User }>
) {
  return class extends React.Component<P> {
    state = { user: null as User | null };

    componentDidMount() {
      this.fetchUser();
    }

    fetchUser = async () => {
      const user = await auth.getCurrentUser();
      this.setState({ user });
    };

    render() {
      if (!this.state.user) return <div>Loading...</div>;
      return <Component {...this.props} user={this.state.user} />;
    }
  };
}

// Usage
class Dashboard extends React.Component<{ user: User }> {
  render() {
    return <div>Welcome {this.props.user.name}</div>;
  }
}

export default withAuth(Dashboard);
```

### Modern React with Custom Hook

```tsx
// Custom hook
function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      try {
        const userData = await auth.getCurrentUser();
        if (!cancelled) {
          setUser(userData);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Auth failed'));
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
  }, []);

  return { user, loading, error, logout };
}

// Usage
function Dashboard() {
  const { user, loading, error, logout } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <p>Welcome {user.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

**Custom Hook Benefits:**
- Easier composition (use multiple hooks)
- Better TypeScript inference
- No wrapper components (simpler tree)
- Easier testing in isolation
- More explicit dependencies

---

## Pattern 7: Render Props → Custom Hooks

### Class Component with Render Props

```tsx
interface MousePosition {
  x: number;
  y: number;
}

class Mouse extends React.Component<
  { children: (pos: MousePosition) => React.ReactNode },
  MousePosition
> {
  state = { x: 0, y: 0 };

  handleMouseMove = (e: MouseEvent) => {
    this.setState({ x: e.clientX, y: e.clientY });
  };

  componentDidMount() {
    window.addEventListener('mousemove', this.handleMouseMove);
  }

  componentWillUnmount() {
    window.removeEventListener('mousemove', this.handleMouseMove);
  }

  render() {
    return this.props.children(this.state);
  }
}

// Usage
<Mouse>
  {({ x, y }) => (
    <div>
      Mouse at {x}, {y}
    </div>
  )}
</Mouse>
```

### Modern React with Custom Hook

```tsx
interface MousePosition {
  x: number;
  y: number;
}

function useMouse(): MousePosition {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      setPosition({ x: e.clientX, y: e.clientY });
    }

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return position;
}

// Usage
function MouseTracker() {
  const { x, y } = useMouse();

  return (
    <div>
      Mouse at {x}, {y}
    </div>
  );
}
```

**Hook Advantages:**
- No extra nesting
- Clearer data flow
- Combine multiple hooks easily
- Better performance (no wrapper render)

---

## Pattern 8: Context Migration

### Class Component

```tsx
const ThemeContext = React.createContext<Theme>('light');

class ThemedButton extends React.Component {
  static contextType = ThemeContext;
  declare context: React.ContextType<typeof ThemeContext>;

  render() {
    return <button className={this.context}>{this.props.children}</button>;
  }
}

// Or with Consumer
class ThemedButton2 extends React.Component {
  render() {
    return (
      <ThemeContext.Consumer>
        {theme => <button className={theme}>{this.props.children}</button>}
      </ThemeContext.Consumer>
    );
  }
}
```

### Modern React

```tsx
type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined
);

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Usage
function ThemedButton({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button className={theme} onClick={toggleTheme}>
      {children}
    </button>
  );
}
```

**Context Best Practices:**
- Custom hook for consuming context
- Memoize context value to prevent re-renders
- Split contexts by update frequency
- Provide type safety with undefined check

---

## Server Components Migration

Modern Next.js 13+ supports Server Components, which cannot use hooks.

### Client Component (Hooks)

```tsx
'use client';

import { useState, useEffect } from 'react';

export function ClientCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Client-side effect');
  }, []);

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Server Component (Async)

```tsx
// app/page.tsx - Server Component by default
interface User {
  id: string;
  name: string;
}

async function getUser(id: string): Promise<User> {
  const res = await fetch(`https://api.example.com/users/${id}`, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });
  return res.json();
}

export default async function UserProfile({ params }: { params: { id: string } }) {
  const user = await getUser(params.id);

  return (
    <div>
      <h1>{user.name}</h1>
      {/* Client component for interactivity */}
      <ClientCounter />
    </div>
  );
}
```

**Server vs Client Decision Tree:**
- Need interactivity (onClick, state)? → Client Component
- Need browser APIs (localStorage, window)? → Client Component
- Need effects or hooks? → Client Component
- Fetching data, reading files, database? → Server Component
- SEO-critical content? → Server Component
- Large dependencies? → Server Component (smaller client bundle)

See reference: `references/server-components.md`

---

## Common Pitfalls

### 1. Stale Closures

**Problem:**
```tsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count); // Always logs 0!
      setCount(count + 1); // Always sets 1!
    }, 1000);

    return () => clearInterval(id);
  }, []); // Missing dependency

  return <div>{count}</div>;
}
```

**Solution:**
```tsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // Functional update - always has latest state
      setCount(prev => prev + 1);
    }, 1000);

    return () => clearInterval(id);
  }, []); // Now safe

  return <div>{count}</div>;
}
```

### 2. Missing Effect Dependencies

**Problem:**
```tsx
function UserSearch({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId); // userId is a dependency!
  }, []); // Bug: won't refetch when userId changes

  return <div>{user?.name}</div>;
}
```

**Solution:**
```tsx
function UserSearch({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      const data = await fetchUser(userId);
      if (!cancelled) setUser(data);
    }

    fetch();

    return () => {
      cancelled = true;
    };
  }, [userId]); // Correct dependency

  return <div>{user?.name}</div>;
}
```

### 3. Over-Memoization

**Problem:**
```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  // Unnecessary - React is already fast
  const memoizedTodos = useMemo(() => todos, [todos]);

  // Unnecessary - simple function
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return (
    <ul>
      {memoizedTodos.map(todo => (
        <li key={todo.id} onClick={handleClick}>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

**Solution:**
```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  // Only memoize expensive computations
  const completedCount = useMemo(
    () => todos.filter(t => t.completed).length,
    [todos]
  );

  // Only useCallback for props to memoized children
  return (
    <div>
      <p>Completed: {completedCount}</p>
      <ul>
        {todos.map(todo => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>
    </div>
  );
}
```

**Memoization Rules:**
- Measure before optimizing
- Memoize expensive calculations only
- Memoize callbacks passed to memoized children
- Don't memoize everything by default

---

## Migration Checklist

**Before Migration:**
- [ ] Add tests to current class component
- [ ] Identify all lifecycle methods used
- [ ] Document props, state, and behavior
- [ ] Check for error boundary requirements
- [ ] Verify no third-party class inheritance

**During Migration:**
- [ ] Convert constructor/state to useState
- [ ] Map lifecycle methods to useEffect
- [ ] Convert methods to functions or useCallback
- [ ] Replace this.setState with state setters
- [ ] Update ref usage to useRef
- [ ] Add proper effect dependencies
- [ ] Add cleanup functions where needed

**After Migration:**
- [ ] All tests pass
- [ ] No eslint-disable comments added
- [ ] Performance equivalent or better
- [ ] TypeScript types complete
- [ ] Code review completed
- [ ] Documentation updated

---

## Gradual Migration Strategy

**Phase 1: New Code**
- Write all new components with hooks
- Establish team patterns and conventions

**Phase 2: Leaf Components**
- Migrate components with no children first
- Build confidence and muscle memory

**Phase 3: Container Components**
- Migrate parent components
- Extract custom hooks for reusable logic

**Phase 4: Core Infrastructure**
- Migrate providers and contexts
- Update routing and state management

**Never:**
- Don't migrate everything at once
- Don't migrate stable code unnecessarily
- Don't break working features for purity

---

This migration guide provides practical patterns for modernizing React codebases while avoiding common pitfalls and maintaining code quality throughout the transition.
