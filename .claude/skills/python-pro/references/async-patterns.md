# Async Programming Patterns

## Basic Async/Await

```python
import asyncio
from collections.abc import Coroutine

# Basic async function
async def fetch_data(url: str) -> dict[str, str]:
    await asyncio.sleep(1)  # Simulate I/O
    return {"url": url, "status": "ok"}

# Running async code
async def main() -> None:
    result = await fetch_data("https://api.example.com")
    print(result)

if __name__ == "__main__":
    asyncio.run(main())

# Multiple concurrent operations
async def fetch_all(urls: list[str]) -> list[dict[str, str]]:
    tasks = [fetch_data(url) for url in urls]
    return await asyncio.gather(*tasks)

# Error handling with gather
async def safe_fetch_all(urls: list[str]) -> list[dict[str, str] | None]:
    tasks = [fetch_data(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r if not isinstance(r, Exception) else None for r in results]
```

## Task Groups (Python 3.11+)

```python
from asyncio import TaskGroup

# Task groups for structured concurrency
async def process_batch(items: list[int]) -> list[int]:
    results: list[int] = []

    async with TaskGroup() as tg:
        tasks = [tg.create_task(process_item(item)) for item in items]

    # All tasks complete before this line
    return [task.result() for task in tasks]

# Error handling with TaskGroup
async def robust_processing(items: list[str]) -> tuple[list[str], list[Exception]]:
    results: list[str] = []
    errors: list[Exception] = []

    try:
        async with TaskGroup() as tg:
            for item in items:
                tg.create_task(process_item_safe(item))
    except ExceptionGroup as eg:
        for exc in eg.exceptions:
            errors.append(exc)

    return results, errors
```

## Async Context Managers

```python
from typing import Self
from collections.abc import AsyncIterator

class AsyncDatabaseConnection:
    def __init__(self, url: str) -> None:
        self.url = url
        self._conn: Connection | None = None

    async def __aenter__(self) -> Self:
        self._conn = await connect(self.url)
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: Any,
    ) -> None:
        if self._conn:
            await self._conn.close()

    async def query(self, sql: str) -> list[dict[str, Any]]:
        if not self._conn:
            raise RuntimeError("Not connected")
        return await self._conn.execute(sql)

# Usage
async def get_users() -> list[dict[str, Any]]:
    async with AsyncDatabaseConnection("postgresql://...") as db:
        return await db.query("SELECT * FROM users")

# Async context manager with contextlib
from contextlib import asynccontextmanager

@asynccontextmanager
async def get_db_session() -> AsyncIterator[Session]:
    session = await create_session()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
```

## Async Generators

```python
from collections.abc import AsyncIterator

# Async generator for streaming data
async def read_lines(filepath: str) -> AsyncIterator[str]:
    async with aiofiles.open(filepath) as f:
        async for line in f:
            yield line.strip()

# Process stream
async def process_file(filepath: str) -> int:
    count = 0
    async for line in read_lines(filepath):
        await process_line(line)
        count += 1
    return count

# Async generator with cleanup
async def fetch_paginated(url: str) -> AsyncIterator[dict[str, Any]]:
    page = 1
    session = await create_session()
    try:
        while True:
            data = await session.get(f"{url}?page={page}")
            if not data:
                break
            yield data
            page += 1
    finally:
        await session.close()
```

## Async Comprehensions

```python
# Async list comprehension
async def fetch_all_users(user_ids: list[int]) -> list[User]:
    return [user async for user in fetch_users(user_ids)]

# Async dict comprehension
async def build_user_map(user_ids: list[int]) -> dict[int, User]:
    return {
        user.id: user
        async for user in fetch_users(user_ids)
    }

# Conditional async comprehension
async def get_active_users(user_ids: list[int]) -> list[User]:
    return [
        user
        async for user in fetch_users(user_ids)
        if user.is_active
    ]
```

## Synchronization Primitives

```python
import asyncio

# Lock for critical sections
class SharedResource:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._data: dict[str, Any] = {}

    async def update(self, key: str, value: Any) -> None:
        async with self._lock:
            # Critical section
            current = self._data.get(key, 0)
            await asyncio.sleep(0.1)  # Simulate processing
            self._data[key] = current + value

# Semaphore for rate limiting
class RateLimiter:
    def __init__(self, max_concurrent: int) -> None:
        self._semaphore = asyncio.Semaphore(max_concurrent)

    async def process(self, item: str) -> str:
        async with self._semaphore:
            return await expensive_operation(item)

# Event for coordination
class AsyncWorker:
    def __init__(self) -> None:
        self._ready = asyncio.Event()
        self._shutdown = asyncio.Event()

    async def start(self) -> None:
        # Initialization
        await self._initialize()
        self._ready.set()

        # Wait for shutdown
        await self._shutdown.wait()

    async def wait_ready(self) -> None:
        await self._ready.wait()

    def stop(self) -> None:
        self._shutdown.set()
```

## Async Queue Patterns

```python
from asyncio import Queue

# Producer-consumer pattern
async def producer(queue: Queue[int], n: int) -> None:
    for i in range(n):
        await queue.put(i)
        await asyncio.sleep(0.1)

async def consumer(queue: Queue[int], name: str) -> None:
    while True:
        item = await queue.get()
        try:
            await process_item(item)
        finally:
            queue.task_done()

async def run_pipeline(num_items: int, num_workers: int) -> None:
    queue: Queue[int] = Queue(maxsize=10)

    # Start producer and consumers
    async with TaskGroup() as tg:
        tg.create_task(producer(queue, num_items))
        for i in range(num_workers):
            tg.create_task(consumer(queue, f"worker-{i}"))

        # Wait for all items to be processed
        await queue.join()
```

## Async Timeouts

```python
# Timeout for single operation
async def fetch_with_timeout(url: str, timeout: float) -> dict[str, Any]:
    try:
        async with asyncio.timeout(timeout):
            return await fetch_data(url)
    except TimeoutError:
        return {"error": "timeout"}

# Timeout for multiple operations
async def fetch_all_with_timeout(
    urls: list[str],
    timeout: float
) -> list[dict[str, Any] | None]:
    try:
        async with asyncio.timeout(timeout):
            return await fetch_all(urls)
    except TimeoutError:
        return [None] * len(urls)
```

## Background Tasks

```python
from asyncio import create_task, Task

class BackgroundTaskManager:
    def __init__(self) -> None:
        self._tasks: set[Task[None]] = set()

    def create_task(self, coro: Coroutine[None, None, None]) -> Task[None]:
        task = create_task(coro)
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return task

    async def shutdown(self) -> None:
        # Cancel all background tasks
        for task in self._tasks:
            task.cancel()
        # Wait for cancellation
        await asyncio.gather(*self._tasks, return_exceptions=True)

# Usage
manager = BackgroundTaskManager()
manager.create_task(background_job())
```

## Async Iteration Protocol

```python
class AsyncRange:
    def __init__(self, start: int, end: int) -> None:
        self.start = start
        self.end = end
        self.current = start

    def __aiter__(self) -> Self:
        return self

    async def __anext__(self) -> int:
        if self.current >= self.end:
            raise StopAsyncIteration
        await asyncio.sleep(0.1)  # Simulate async work
        value = self.current
        self.current += 1
        return value

# Usage
async for i in AsyncRange(0, 5):
    print(i)
```

## Mixing Sync and Async

```python
from concurrent.futures import ThreadPoolExecutor
import functools

# Run sync code in executor
async def run_in_executor(func: Callable[..., T], *args: Any) -> T:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, func, *args)

# Run async code from sync context
def sync_wrapper(coro: Coroutine[None, None, T]) -> T:
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

# Async wrapper for sync function
def to_async(func: Callable[..., T]) -> Callable[..., Coroutine[None, None, T]]:
    @functools.wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> T:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None,
            functools.partial(func, *args, **kwargs)
        )
    return wrapper
```
