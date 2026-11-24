# Performance Optimization

## React.memo

```tsx
import { memo } from 'react';

// Memoize component - only re-renders when props change
const ExpensiveList = memo(function ExpensiveList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
});

// Custom comparison function
const UserCard = memo(
  function UserCard({ user }: { user: User }) {
    return <div>{user.name}</div>;
  },
  (prevProps, nextProps) => prevProps.user.id === nextProps.user.id
);
```

## Preventing Re-renders

```tsx
// Problem: New object/function on each render
function Parent() {
  // ❌ Creates new object every render
  return <Child style={{ color: 'red' }} onClick={() => doSomething()} />;
}

// Solution: Memoize or lift out
const style = { color: 'red' }; // Lifted out

function Parent() {
  const handleClick = useCallback(() => doSomething(), []);
  return <Child style={style} onClick={handleClick} />;
}
```

## Code Splitting with lazy()

```tsx
import { lazy, Suspense } from 'react';

// Split heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));
const AdminPanel = lazy(() => import('./AdminPanel'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      {showChart && <HeavyChart data={data} />}
    </Suspense>
  );
}

// Route-based splitting (React Router)
const routes = [
  {
    path: '/admin',
    element: (
      <Suspense fallback={<Loading />}>
        <AdminPanel />
      </Suspense>
    ),
  },
];
```

## Virtualization

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: virtualItem.size,
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## useMemo for Expensive Calculations

```tsx
function Analytics({ data }: { data: DataPoint[] }) {
  // Only recalculate when data changes
  const stats = useMemo(() => ({
    total: data.reduce((sum, d) => sum + d.value, 0),
    average: data.reduce((sum, d) => sum + d.value, 0) / data.length,
    max: Math.max(...data.map(d => d.value)),
  }), [data]);

  return <StatsDisplay stats={stats} />;
}
```

## useTransition for Non-urgent Updates

```tsx
import { useTransition } from 'react';

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value); // Urgent: update input immediately

    startTransition(() => {
      // Non-urgent: can be interrupted
      setResults(filterItems(e.target.value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? <Spinner /> : <Results items={results} />}
    </>
  );
}
```

## Quick Reference

| Technique | When to Use |
|-----------|-------------|
| `memo()` | Prevent re-renders from unchanged props |
| `useMemo()` | Cache expensive calculations |
| `useCallback()` | Stable function references |
| `lazy()` | Code split heavy components |
| `useTransition()` | Keep UI responsive during updates |
| Virtualization | Large lists (1000+ items) |

| Anti-pattern | Fix |
|--------------|-----|
| Inline objects | Lift out or useMemo |
| Inline functions | useCallback |
| Large bundle | lazy() + Suspense |
| Long lists | Virtualization |
