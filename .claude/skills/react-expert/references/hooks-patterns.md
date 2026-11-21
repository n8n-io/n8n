# Hooks Patterns

## Custom Hook Pattern

```tsx
// useApi - Data fetching hook
function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(err => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [url]);

  return { data, error, loading };
}
```

## useDebounce

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// Usage
function Search() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) search(debouncedQuery);
  }, [debouncedQuery]);
}
```

## useLocalStorage

```tsx
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

## useMediaQuery

```tsx
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Usage
function Layout() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  return isMobile ? <MobileNav /> : <DesktopNav />;
}
```

## useCallback & useMemo

```tsx
// useCallback: Memoize functions (for child dependencies)
const handleClick = useCallback((id: string) => {
  setSelected(id);
}, []); // Empty deps = stable reference

// useMemo: Memoize expensive calculations
const sortedItems = useMemo(() =>
  [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// When to use:
// - useCallback: When passing to memoized children
// - useMemo: When calculation is expensive AND deps rarely change
```

## Effect Cleanup

```tsx
useEffect(() => {
  const subscription = api.subscribe(handler);

  // Cleanup function
  return () => subscription.unsubscribe();
}, []);

// Async effect pattern
useEffect(() => {
  let cancelled = false;

  async function fetchData() {
    const data = await api.getData();
    if (!cancelled) setData(data);
  }

  fetchData();
  return () => { cancelled = true };
}, []);
```

## Quick Reference

| Hook | Purpose |
|------|---------|
| useState | Component state |
| useEffect | Side effects, subscriptions |
| useCallback | Memoize functions |
| useMemo | Memoize values |
| useRef | Mutable ref, DOM access |
| useContext | Read context |
| useReducer | Complex state logic |

| Custom Hook | Use Case |
|-------------|----------|
| useDebounce | Input delay |
| useLocalStorage | Persistent state |
| useMediaQuery | Responsive logic |
| useApi | Data fetching |
