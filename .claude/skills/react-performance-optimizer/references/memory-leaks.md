# React Memory Leaks Guide

Common memory leak patterns in React and how to detect and fix them.

## What Are Memory Leaks?

**Definition**: Memory that's allocated but never freed, causing increasing memory usage over time.

**Symptoms**:
- Page becomes slower over time
- Browser tab crashes after extended use
- High memory usage in Task Manager
- Performance degrades after navigation

**Impact**:
- 100MB leak → Tab crash after 30 minutes
- 10MB leak → Noticeable slowdown after 1 hour

---

## Detecting Memory Leaks

### Method 1: Chrome DevTools Memory Profiler

```
1. Open DevTools → Memory tab
2. Take heap snapshot (baseline)
3. Interact with app (open/close components, navigate)
4. Take second snapshot
5. Compare snapshots
6. Look for objects that should have been freed
```

**What to look for**:
- Detached DOM nodes (should be 0)
- Event listeners still attached
- Timers still running
- Components in memory after unmount

---

### Method 2: Performance Monitor

```
1. Open DevTools → Performance Monitor
2. Watch "JS heap size"
3. Interact with app
4. Heap should return to baseline after actions
```

**Normal**: Memory spikes then drops (garbage collected)
**Leak**: Memory increases steadily, never drops

---

### Method 3: Automated Detection

```typescript
// Add to development environment
if (process.env.NODE_ENV === 'development') {
  let previousHeap = 0;

  setInterval(() => {
    const current = (performance as any).memory?.usedJSHeapSize || 0;

    if (current > previousHeap * 1.5) {
      console.warn('Possible memory leak detected', {
        previous: previousHeap,
        current,
        increase: current - previousHeap
      });
    }

    previousHeap = current;
  }, 5000);
}
```

---

## Common Leak Patterns

### Pattern 1: Event Listeners Not Cleaned Up

**Problem**: Event listener remains after component unmounts

**❌ Leaking Code**:
```typescript
function SearchBox() {
  useEffect(() => {
    // Add listener
    window.addEventListener('resize', handleResize);

    // ❌ Missing cleanup
  }, []);

  return <input />;
}
```

**Why it leaks**: `handleResize` references component, preventing garbage collection

**✅ Fixed Code**:
```typescript
function SearchBox() {
  useEffect(() => {
    const handleResize = () => {
      // Handle resize
    };

    window.addEventListener('resize', handleResize);

    // ✅ Clean up on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <input />;
}
```

---

### Pattern 2: Timers Not Cleared

**Problem**: setInterval/setTimeout continues after unmount

**❌ Leaking Code**:
```typescript
function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Start interval
    setInterval(() => {
      setTime(new Date());
    }, 1000);

    // ❌ Interval never cleared
  }, []);

  return <div>{time.toLocaleTimeString()}</div>;
}
```

**Why it leaks**: Interval continues forever, calling `setTime` on unmounted component

**✅ Fixed Code**:
```typescript
function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // ✅ Clear interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return <div>{time.toLocaleTimeString()}</div>;
}
```

---

### Pattern 3: Subscriptions Not Unsubscribed

**Problem**: WebSocket/EventEmitter/Observable subscription persists

**❌ Leaking Code**:
```typescript
function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = io(`/rooms/${roomId}`);

    socket.on('message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    // ❌ Socket never disconnected
  }, [roomId]);

  return <MessageList messages={messages} />;
}
```

**✅ Fixed Code**:
```typescript
function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = io(`/rooms/${roomId}`);

    socket.on('message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    // ✅ Disconnect and clean up
    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  return <MessageList messages={messages} />;
}
```

---

### Pattern 4: State Updates on Unmounted Components

**Problem**: Async operation completes after unmount, tries to update state

**❌ Leaking Code**:
```typescript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(data => {
      setUser(data);  // ❌ Might run after unmount
    });
  }, [userId]);

  return <div>{user?.name}</div>;
}
```

**Warning in console**: "Can't perform a React state update on an unmounted component"

**✅ Fixed Code (Option 1: Cleanup flag)**:
```typescript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;

    fetchUser(userId).then(data => {
      if (isMounted) {
        setUser(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return <div>{user?.name}</div>;
}
```

**✅ Fixed Code (Option 2: AbortController)**:
```typescript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchUser(userId, { signal: controller.signal })
      .then(data => setUser(data))
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      });

    return () => {
      controller.abort();
    };
  }, [userId]);

  return <div>{user?.name}</div>;
}
```

---

### Pattern 5: Closures Capturing Large Objects

**Problem**: Callback holds reference to large data structure

**❌ Leaking Code**:
```typescript
function DataGrid({ data }) {  // data is 10MB array
  const [selected, setSelected] = useState(null);

  const handleClick = useCallback((id) => {
    // ❌ Closure captures entire 'data' array
    const item = data.find(d => d.id === id);
    setSelected(item);
  }, [data]);  // data is in dependency array

  return <Table data={data} onRowClick={handleClick} />;
}
```

**Why it leaks**: Every re-render creates new function capturing 10MB data

**✅ Fixed Code**:
```typescript
function DataGrid({ data }) {
  const [selected, setSelected] = useState(null);

  // Create lookup map (smaller memory footprint)
  const dataMap = useMemo(() => {
    return new Map(data.map(d => [d.id, d]));
  }, [data]);

  const handleClick = useCallback((id) => {
    // ✅ Closure only captures Map reference
    const item = dataMap.get(id);
    setSelected(item);
  }, [dataMap]);

  return <Table data={data} onRowClick={handleClick} />;
}
```

---

### Pattern 6: DOM References Not Cleared

**Problem**: Ref holds reference to detached DOM node

**❌ Leaking Code**:
```typescript
function ImageGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    // Store refs to all images
    imageRefs.current = Array.from(
      containerRef.current?.querySelectorAll('img') || []
    );

    // ❌ Image refs never cleared
  }, []);

  return (
    <div ref={containerRef}>
      {/* Images render here */}
    </div>
  );
}
```

**✅ Fixed Code**:
```typescript
function ImageGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    imageRefs.current = Array.from(
      containerRef.current?.querySelectorAll('img') || []
    );

    // ✅ Clear refs on unmount
    return () => {
      imageRefs.current = [];
    };
  }, []);

  return (
    <div ref={containerRef}>
      {/* Images render here */}
    </div>
  );
}
```

---

### Pattern 7: Global State Not Cleaned

**Problem**: Component adds data to global store but never removes it

**❌ Leaking Code**:
```typescript
function UserSession({ userId }) {
  useEffect(() => {
    // Add user to global cache
    globalCache.set(userId, fetchUser(userId));

    // ❌ Never removed from cache
  }, [userId]);

  return <div>Session active</div>;
}
```

**Why it leaks**: Cache grows indefinitely as users navigate

**✅ Fixed Code**:
```typescript
function UserSession({ userId }) {
  useEffect(() => {
    globalCache.set(userId, fetchUser(userId));

    // ✅ Clean up on unmount
    return () => {
      globalCache.delete(userId);
    };
  }, [userId]);

  return <div>Session active</div>;
}
```

---

### Pattern 8: Third-Party Library Instances

**Problem**: Library instance not destroyed

**❌ Leaking Code**:
```typescript
import mapboxgl from 'mapbox-gl';

function MapView() {
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11'
    });

    // ❌ Map instance never destroyed
  }, []);

  return <div id="map" />;
}
```

**✅ Fixed Code**:
```typescript
import mapboxgl from 'mapbox-gl';

function MapView() {
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11'
    });

    // ✅ Destroy map on unmount
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div id="map" />;
}
```

**Common libraries that need cleanup**:
- Mapbox GL: `map.remove()`
- Chart.js: `chart.destroy()`
- Monaco Editor: `editor.dispose()`
- Three.js: `renderer.dispose()`, `geometry.dispose()`

---

## Advanced Debugging

### Using Chrome DevTools Memory Allocation Timeline

```
1. DevTools → Performance tab
2. Check "Memory" checkbox
3. Click record
4. Interact with app (open/close modal 10 times)
5. Stop recording
6. Look at heap size graph
```

**Healthy pattern**: Sawtooth (allocate, GC, allocate, GC)
**Leak pattern**: Steady increase (allocate, allocate, allocate)

---

### Heap Snapshot Comparison

```
1. Take snapshot A
2. Open modal
3. Take snapshot B
4. Close modal
5. Force GC (DevTools → Memory → Collect garbage icon)
6. Take snapshot C
7. Compare B and C
```

**What to look for**:
- Objects from modal still in snapshot C
- Event listeners still attached
- Timers still running

**Filter by**:
- Constructor name (e.g., "Timer", "Listener")
- Retained size (objects holding most memory)

---

### React DevTools Profiler

```
1. React DevTools → Profiler
2. Enable "Record why each component rendered"
3. Navigate to page
4. Navigate away
5. Force GC
6. Check if components still in memory
```

---

## Testing for Memory Leaks

### Automated Test (Jest + Puppeteer)

```typescript
import puppeteer from 'puppeteer';

test('Modal does not leak memory', async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:3000');

  // Take baseline heap size
  const baseline = await page.evaluate(() => {
    return (performance as any).memory.usedJSHeapSize;
  });

  // Open/close modal 20 times
  for (let i = 0; i < 20; i++) {
    await page.click('[data-testid="open-modal"]');
    await page.waitForSelector('[data-testid="modal"]');
    await page.click('[data-testid="close-modal"]');
    await page.waitForSelector('[data-testid="modal"]', { hidden: true });
  }

  // Force garbage collection
  await page.evaluate(() => {
    if ((window as any).gc) {
      (window as any).gc();
    }
  });

  // Check final heap size
  const final = await page.evaluate(() => {
    return (performance as any).memory.usedJSHeapSize;
  });

  // Memory should not increase by more than 10MB
  const increase = final - baseline;
  expect(increase).toBeLessThan(10 * 1024 * 1024);

  await browser.close();
});
```

**Run with**:
```bash
node --expose-gc node_modules/.bin/jest memory.test.ts
```

---

## Prevention Checklist

```
□ All event listeners cleaned up in useEffect return
□ All timers (setTimeout/setInterval) cleared
□ All subscriptions (WebSocket, EventEmitter) closed
□ AbortController used for fetch requests
□ Third-party library instances destroyed (.remove(), .destroy(), .dispose())
□ Global state cleaned up on unmount
□ Large objects not captured in closures
□ DOM refs cleared on unmount
□ Tested with heap snapshots (no growth after actions)
□ Automated memory leak test in CI
```

---

## Common Libraries and Cleanup

| Library | Cleanup Method |
|---------|----------------|
| Socket.IO | `socket.disconnect()` |
| RxJS | `subscription.unsubscribe()` |
| Chart.js | `chart.destroy()` |
| Mapbox GL | `map.remove()` |
| Monaco Editor | `editor.dispose()` |
| Three.js | `renderer.dispose()`, `geometry.dispose()`, `material.dispose()` |
| Video.js | `player.dispose()` |
| Swiper | `swiper.destroy()` |

---

## Real-World Example

### Problem: Dashboard Leaking 50MB per Navigation

**Symptoms**:
- Page slow after 5-10 navigation cycles
- Chrome DevTools shows heap growing from 50MB → 500MB
- Tab crashes after 15 minutes

**Investigation**:
1. Heap snapshot comparison revealed:
   - 1000+ event listeners still attached
   - Chart.js instances not destroyed
   - WebSocket connections not closed

**Leaking Code**:
```typescript
function Dashboard() {
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    // Create chart
    chartRef.current = new Chart(ctx, config);

    // Subscribe to updates
    socket.on('data', updateChart);

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // ❌ Nothing cleaned up
  }, []);

  return <canvas ref={canvasRef} />;
}
```

**Fixed Code**:
```typescript
function Dashboard() {
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    chartRef.current = new Chart(ctx, config);
    socket.on('data', updateChart);
    window.addEventListener('resize', handleResize);

    // ✅ Clean up everything
    return () => {
      chartRef.current?.destroy();
      socket.off('data', updateChart);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} />;
}
```

**Result**:
- Memory stable at ~50MB regardless of navigation
- No crashes after extended use
- Page remains fast

---

## Resources

- [Chrome DevTools Memory Profiling](https://developer.chrome.com/docs/devtools/memory-problems/)
- [React useEffect Cleanup](https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development)
- [JavaScript Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management)
