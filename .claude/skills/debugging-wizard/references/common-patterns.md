# Common Bug Patterns

## Pattern Recognition

| Pattern | Symptom | Likely Cause |
|---------|---------|--------------|
| Race condition | Intermittent failures | Missing await, async timing |
| Off-by-one | Missing first/last item | `<` vs `<=`, array bounds |
| Null reference | "undefined is not..." | Missing null check |
| Memory leak | Growing memory | Uncleaned listeners/intervals |
| N+1 queries | Slow with more data | Fetching in loop |
| Type coercion | Unexpected behavior | `==` instead of `===` |
| Closure issue | Wrong variable value | Loop variable capture |
| Stale state | Old value used | React state closure |

## Race Condition

```typescript
// BUG: Race condition
let data;
fetchData().then(result => { data = result; });
console.log(data); // undefined!

// FIX: Await the result
const data = await fetchData();
console.log(data);
```

## Off-by-One

```typescript
// BUG: Skips last element
for (let i = 0; i < array.length - 1; i++) { }

// FIX: Include last element
for (let i = 0; i < array.length; i++) { }

// BUG: Array index out of bounds
const last = array[array.length]; // undefined

// FIX: Correct index
const last = array[array.length - 1];
```

## Null Reference

```typescript
// BUG: Crashes if user is null
const name = user.profile.name;

// FIX: Optional chaining
const name = user?.profile?.name ?? 'Unknown';

// FIX: Guard clause
if (!user?.profile) {
  return 'Unknown';
}
return user.profile.name;
```

## Memory Leak

```typescript
// BUG: Listener never removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// FIX: Cleanup function
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// BUG: Interval never cleared
setInterval(pollData, 1000);

// FIX: Store and clear
const intervalId = setInterval(pollData, 1000);
return () => clearInterval(intervalId);
```

## Closure in Loop

```typescript
// BUG: All callbacks use i = 5
for (var i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}

// FIX: Use let (block scoped)
for (let i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}

// FIX: Capture in closure
for (var i = 0; i < 5; i++) {
  ((j) => setTimeout(() => console.log(j), 100))(i);
}
```

## React Stale State

```typescript
// BUG: count is stale in closure
const [count, setCount] = useState(0);
useEffect(() => {
  setInterval(() => {
    setCount(count + 1); // Always uses initial count
  }, 1000);
}, []);

// FIX: Use functional update
setCount(prev => prev + 1);

// FIX: Include in dependency array with cleanup
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

## Quick Reference

| Symptom | First Check |
|---------|-------------|
| "undefined is not..." | Null check missing |
| Works sometimes | Race condition |
| Wrong value in callback | Closure/stale state |
| Gets slower over time | Memory leak, N+1 |
| Off by one item | Loop bounds, array index |
| Type mismatch | `==` vs `===`, coercion |
