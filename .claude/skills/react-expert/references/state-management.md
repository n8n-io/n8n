# State Management

## Local State (useState)

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  // Functional update for derived state
  const increment = () => setCount(prev => prev + 1);

  return <button onClick={increment}>{count}</button>;
}
```

## Context for Simple Global State

```tsx
interface ThemeContext {
  theme: 'light' | 'dark';
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContext | null>(null);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggle = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be inside ThemeProvider');
  return context;
}
```

## Zustand (Recommended)

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  total: () => number;
}

const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => ({
        items: [...state.items, item]
      })),
      removeItem: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id)
      })),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price, 0),
    }),
    { name: 'cart-storage' }
  )
);

// Component usage
function Cart() {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total());
  const clear = useCartStore((state) => state.clear);

  return (
    <div>
      {items.map(item => <CartItem key={item.id} item={item} />)}
      <p>Total: ${total}</p>
      <button onClick={clear}>Clear Cart</button>
    </div>
  );
}
```

## Redux Toolkit

```tsx
import { createSlice, configureStore, PayloadAction } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1 },
    decrement: (state) => { state.value -= 1 },
    incrementBy: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});

const store = configureStore({
  reducer: { counter: counterSlice.reducer },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

// Typed hooks
const useAppSelector = useSelector.withTypes<RootState>();
const useAppDispatch = useDispatch.withTypes<AppDispatch>();

function Counter() {
  const count = useAppSelector((state) => state.counter.value);
  const dispatch = useAppDispatch();

  return (
    <button onClick={() => dispatch(counterSlice.actions.increment())}>
      {count}
    </button>
  );
}
```

## TanStack Query (Server State)

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function UserProfile({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Error error={error} />;

  return <UserCard user={data} onUpdate={mutation.mutate} />;
}
```

## Quick Reference

| Solution | Best For |
|----------|----------|
| useState | Local component state |
| Context | Theme, auth, simple globals |
| Zustand | Medium complexity, minimal boilerplate |
| Redux Toolkit | Complex state, middleware, devtools |
| TanStack Query | Server state, caching |
