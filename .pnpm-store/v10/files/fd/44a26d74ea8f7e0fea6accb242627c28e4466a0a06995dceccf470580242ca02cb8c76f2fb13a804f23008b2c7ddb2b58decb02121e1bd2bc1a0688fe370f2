# p-queue

> Promise queue with concurrency control

Useful for rate-limiting async (or sync) operations. For example, when interacting with a REST API or when doing CPU/memory intensive tasks.

For servers, you probably want a Redis-backed [job queue](https://github.com/sindresorhus/awesome-nodejs#job-queues) instead.

Note that the project is feature complete. We are happy to review pull requests, but we don't plan any further development. We are also not answering email support questions.

---

<br>
<div align="center">
	<p>
		<p>
			<sup>
				<a href="https://github.com/sponsors/sindresorhus">Sindre's open source work is supported by the community</a><br>Special thanks to:
			</sup>
		</p>
		<br>
		<br>
		<a href="https://fetchfox.ai?ref=sindre">
			<div>
				<img src="https://sindresorhus.com/assets/thanks/fetchfox-logo.svg" height="200"/>
			</div>
			<b>Scrape anything with FetchFox</b>
			<div>
				<sup>FetchFox is an AI powered scraping tool that lets you scrape data from any website</sup>
			</div>
		</a>
	</p>
	<br>
	<br>
</div>

---

## Install

```sh
npm install p-queue
```

**Warning:** This package is native [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) and no longer provides a CommonJS export. If your project uses CommonJS, you'll have to [convert to ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c). Please don't open issues for questions regarding CommonJS / ESM.

## Usage

Here we run only one promise at a time. For example, set `concurrency` to 4 to run four promises at the same time.

```js
import PQueue from 'p-queue';
import got from 'got';

const queue = new PQueue({concurrency: 1});

(async () => {
	await queue.add(() => got('https://sindresorhus.com'));
	console.log('Done: sindresorhus.com');
})();

(async () => {
	await queue.add(() => got('https://avajs.dev'));
	console.log('Done: avajs.dev');
})();
```

## API

### PQueue(options?)

Returns a new `queue` instance, which is an [`EventEmitter3`](https://github.com/primus/eventemitter3) subclass.

#### options

Type: `object`

##### concurrency

Type: `number`\
Default: `Infinity`\
Minimum: `1`

Concurrency limit.

##### timeout

Type: `number`\
Default: `undefined`

Per-operation timeout in milliseconds. Operations will throw a `TimeoutError` if they don't complete within the specified time.

The timeout begins when the operation is dequeued and starts execution, not while it's waiting in the queue.

Can be overridden per task using the `timeout` option in `.add()`:

```js
const queue = new PQueue({timeout: 5000});

// This task uses the global 5s timeout
await queue.add(() => fetchData());

// This task has a 10s timeout
await queue.add(() => slowTask(), {timeout: 10000});
```

##### autoStart

Type: `boolean`\
Default: `true`

Whether queue tasks within concurrency limit, are auto-executed as soon as they're added.

##### queueClass

Type: `Function`

Class with a `enqueue` and `dequeue` method, and a `size` getter. See the [Custom QueueClass](#custom-queueclass) section.

##### intervalCap

Type: `number`\
Default: `Infinity`\
Minimum: `1`

The max number of runs in the given interval of time.

##### interval

Type: `number`\
Default: `0`\
Minimum: `0`

The length of time in milliseconds before the interval count resets. Must be finite.

##### carryoverIntervalCount

Type: `boolean`\
Default: `false`

If `true`, specifies that any [pending](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) Promises, should be carried over into the next interval and counted against the `intervalCap`. If `false`, any of those pending Promises will not count towards the next `intervalCap`.

##### strict

Type: `boolean`\
Default: `false`

Whether to use strict mode for rate limiting (sliding window algorithm).

When enabled, ensures that no more than `intervalCap` tasks execute in any rolling `interval` window, rather than resetting the count at fixed intervals. This provides more predictable and evenly distributed execution.

For example, with `intervalCap: 2` and `interval: 1000`:
- **Default mode (fixed window)**: Tasks can burst at window boundaries. You could execute 2 tasks at 999ms and 2 more at 1000ms, resulting in 4 tasks within 1ms.
- **Strict mode (sliding window)**: Enforces that no more than 2 tasks execute in any 1000ms rolling window, preventing bursts.

> [!NOTE]
> Strict mode is more resource-intensive as it tracks individual execution timestamps. Use it when you need guaranteed rate-limit compliance, such as when interacting with APIs that enforce strict rate limits.

> [!NOTE]
> The `carryoverIntervalCount` option has no effect when `strict` mode is enabled, as strict mode tracks actual execution timestamps rather than counting pending tasks.

### queue

`PQueue` instance.

#### .add(fn, options?)

Adds a sync or async task to the queue.

Returns a promise that settles when the task completes, not when it's added to the queue. The promise resolves with the return value of `fn`.

> [!IMPORTANT]
> If you `await` this promise, you will wait for the task to finish running, which may defeat the purpose of using a queue for concurrency. See the [Usage](#usage) section for examples.

> [!NOTE]
> If your items can potentially throw an exception, you must handle those errors from the returned Promise or they may be reported as an unhandled Promise rejection and potentially cause your process to exit immediately.

##### fn

Type: `Function`

Promise-returning/async function. When executed, it will receive `{signal}` as the first argument.

#### options

Type: `object`

##### priority

Type: `number`\
Default: `0`

Priority of operation. Operations with greater priority will be scheduled first.

##### id

Type `string`

Unique identifier for the promise function, used to update its priority before execution. If not specified, it is auto-assigned an incrementing BigInt starting from `1n`.

##### signal

[`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) for cancellation of the operation. When aborted, it will be removed from the queue and the `queue.add()` call will reject with an [error](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/reason). If the operation is already running, the signal will need to be handled by the operation itself.

```js
import PQueue from 'p-queue';
import got, {CancelError} from 'got';

const queue = new PQueue();

const controller = new AbortController();

try {
	await queue.add(({signal}) => {
		const request = got('https://sindresorhus.com');

		signal.addEventListener('abort', () => {
			request.cancel();
		});

		try {
			return await request;
		} catch (error) {
			if (!(error instanceof CancelError)) {
				throw error;
			}
		}
	}, {signal: controller.signal});
} catch (error) {
	if (!(error instanceof DOMException)) {
		throw error;
	}
}
```

#### .addAll(fns, options?)

Same as `.add()`, but accepts an array of sync or async functions and returns a promise that resolves when all functions are resolved.

#### .pause()

Put queue execution on hold.

#### .start()

Start (or resume) executing enqueued tasks within concurrency limit. No need to call this if queue is not paused (via `options.autoStart = false` or by `.pause()` method.)

Returns `this` (the instance).

#### .onEmpty()

Returns a promise that settles when the queue becomes empty.

Can be called multiple times. Useful if you for example add additional items at a later time.

> [!NOTE]
> The promise returned by `.onEmpty()` resolves **once** when the queue becomes empty. If you want to be notified every time the queue becomes empty, use the `empty` event instead: `queue.on('empty', () => {})`.

#### .onIdle()

Returns a promise that settles when the queue becomes empty, and all promises have completed; `queue.size === 0 && queue.pending === 0`.

The difference with `.onEmpty` is that `.onIdle` guarantees that all work from the queue has finished. `.onEmpty` merely signals that the queue is empty, but it could mean that some promises haven't completed yet.

> [!NOTE]
> The promise returned by `.onIdle()` resolves **once** when the queue becomes idle. If you want to be notified every time the queue becomes idle, use the `idle` event instead: `queue.on('idle', () => {})`.

#### .onPendingZero()

Returns a promise that settles when all currently running tasks have completed; `queue.pending === 0`.

The difference with `.onIdle` is that `.onPendingZero` only waits for currently running tasks to finish, ignoring queued tasks. This is useful when you want to drain in-flight tasks before mutating shared state.

```js
queue.pause();
await queue.onPendingZero();
// All running tasks have finished, though the queue may still have items
```

#### .onRateLimit()

Returns a promise that settles when the queue becomes rate-limited due to `intervalCap`. If the queue is already rate-limited, the promise resolves immediately.

Useful for implementing backpressure to prevent memory issues when producers are faster than consumers.

```js
const queue = new PQueue({intervalCap: 5, interval: 1000});

// Add many tasks
for (let index = 0; index < 10; index++) {
	queue.add(() => someTask());
}

await queue.onRateLimit();
console.log('Queue is now rate-limited - time for maintenance tasks');
```

#### .onRateLimitCleared()

Returns a promise that settles when the queue is no longer rate-limited. If the queue is not currently rate-limited, the promise resolves immediately.

```js
const queue = new PQueue({intervalCap: 5, interval: 1000});

// Wait for rate limiting to be cleared
await queue.onRateLimitCleared();
console.log('Rate limit cleared - can add more tasks');
```

#### .onError()

Returns a promise that rejects when any task in the queue errors.

Use with `Promise.race([queue.onError(), queue.onIdle()])` to fail fast on the first error while still resolving normally when the queue goes idle.

> [!IMPORTANT]
> The promise returned by `add()` still rejects. You must handle each `add()` promise (for example, `.catch(() => {})`) to avoid unhandled rejections.

```js
import PQueue from 'p-queue';

const queue = new PQueue({concurrency: 2});

queue.add(() => fetchData(1)).catch(() => {});
queue.add(() => fetchData(2)).catch(() => {});
queue.add(() => fetchData(3)).catch(() => {});

// Stop processing on first error
try {
	await Promise.race([
		queue.onError(),
		queue.onIdle()
	]);
} catch (error) {
	queue.pause(); // Stop processing remaining tasks
	console.error('Queue failed:', error);
}
```

#### .onSizeLessThan(limit)

Returns a promise that settles when the queue size is less than the given limit: `queue.size < limit`.

If you want to avoid having the queue grow beyond a certain size you can `await queue.onSizeLessThan()` before adding a new item.

Note that this only limits the number of items waiting to start. There could still be up to `concurrency` jobs already running that this call does not include in its calculation.

#### .clear()

Clear the queue.

#### .size

Size of the queue, the number of queued items waiting to run.

#### .sizeBy(options)

Size of the queue, filtered by the given options.

For example, this can be used to find the number of items remaining in the queue with a specific priority level.

```js
import PQueue from 'p-queue';

const queue = new PQueue();

queue.add(async () => '🦄', {priority: 1});
queue.add(async () => '🦄', {priority: 0});
queue.add(async () => '🦄', {priority: 1});

console.log(queue.sizeBy({priority: 1}));
//=> 2

console.log(queue.sizeBy({priority: 0}));
//=> 1
```

#### .setPriority(id, priority)

Updates the priority of a promise function by its id, affecting its execution order. Requires a defined concurrency limit to take effect.

For example, this can be used to prioritize a promise function to run earlier.

```js
import PQueue from 'p-queue';

const queue = new PQueue({concurrency: 1});

queue.add(async () => '🦄', {priority: 1});
queue.add(async () => '🦀', {priority: 0, id: '🦀'});
queue.add(async () => '🦄', {priority: 1});
queue.add(async () => '🦄', {priority: 1});

queue.setPriority('🦀', 2);
```

In this case, the promise function with `id: '🦀'` runs second.

You can also deprioritize a promise function to delay its execution:

```js
import PQueue from 'p-queue';

const queue = new PQueue({concurrency: 1});

queue.add(async () => '🦄', {priority: 1});
queue.add(async () => '🦀', {priority: 1, id: '🦀'});
queue.add(async () => '🦄');
queue.add(async () => '🦄', {priority: 0});

queue.setPriority('🦀', -1);
```

Here, the promise function with `id: '🦀'` executes last.

#### .pending

Number of running items (no longer in the queue).

#### [.timeout](#timeout)

Type: `number | undefined`

Get or set the default timeout for all tasks. Can be changed at runtime.

Operations will throw a `TimeoutError` if they don't complete within the specified time.

The timeout begins when the operation is dequeued and starts execution, not while it's waiting in the queue.

```js
const queue = new PQueue({timeout: 5000});

// Change timeout for all future tasks
queue.timeout = 10000;
```

#### [.concurrency](#concurrency)

#### .isPaused

Whether the queue is currently paused.

#### .isRateLimited

Whether the queue is currently rate-limited due to `intervalCap`. Returns `true` when the number of tasks executed in the current interval has reached the `intervalCap` and there are still tasks waiting to be processed.

#### .isSaturated

Whether the queue is saturated. Returns `true` when:
- All concurrency slots are occupied and tasks are waiting, OR
- The queue is rate-limited and tasks are waiting

Useful for detecting backpressure and potential hanging tasks.

```js
import PQueue from 'p-queue';

const queue = new PQueue({concurrency: 2});

// Backpressure handling
if (queue.isSaturated) {
	console.log('Queue is saturated, waiting for capacity...');
	await queue.onSizeLessThan(queue.concurrency);
}

// Monitoring for stuck tasks
setInterval(() => {
	if (queue.isSaturated) {
		console.warn(`Queue saturated: ${queue.pending} running, ${queue.size} waiting`);
	}
}, 60000);
```

#### .runningTasks

The tasks currently being executed. Each task includes its `id`, `priority`, `startTime`, and `timeout` (if set).

Returns an array of task info objects.

```js
import PQueue from 'p-queue';

const queue = new PQueue({concurrency: 2});

// Add tasks with IDs for better debugging
queue.add(() => fetchUser(123), {id: 'user-123'});
queue.add(() => fetchPosts(456), {id: 'posts-456', priority: 1});

// Check what's running
console.log(queue.runningTasks);
/*
[
	{
		id: 'user-123',
		priority: 0,
		startTime: 1759253001716,
		timeout: undefined
	},
	{
		id: 'posts-456',
		priority: 1,
		startTime: 1759253001916,
		timeout: undefined
	}
]
*/
```

## Events

#### active

Emitted as each item is processed in the queue for the purpose of tracking progress.

```js
import delay from 'delay';
import PQueue from 'p-queue';

const queue = new PQueue({concurrency: 2});

let count = 0;
queue.on('active', () => {
	console.log(`Working on item #${++count}.  Size: ${queue.size}  Pending: ${queue.pending}`);
});

queue.add(() => Promise.resolve());
queue.add(() => delay(2000));
queue.add(() => Promise.resolve());
queue.add(() => Promise.resolve());
queue.add(() => delay(500));
```

#### completed

Emitted when an item completes without error.

```js
import delay from 'delay';
import PQueue from 'p-queue';

const queue = new PQueue({concurrency: 2});

queue.on('completed', result => {
	console.log(result);
});

queue.add(() => Promise.resolve('hello, world!'));
```

#### error

Emitted if an item throws an error. The promise returned by `add()` is still rejected, so you must handle both.

```js
import PQueue from 'p-queue';

const queue = new PQueue({concurrency: 2});

queue.on('error', error => {
	console.error(error);
});

// Handle the promise to prevent unhandled rejection
queue.add(() => Promise.reject(new Error('error'))).catch(() => {
	// Error already handled by event listener
});
```

#### empty

Emitted every time the queue becomes empty.

Useful if you for example add additional items at a later time.

#### idle

Emitted whenever the queue becomes idle: both empty and with zero running tasks (`size === 0 && pending === 0`). If no tasks are ever added, it never fires.

The difference with `empty` is that `idle` guarantees that all work from the queue has finished. `empty` merely signals that the queue is empty, but it could mean that some promises haven't completed yet.

#### pendingZero

Emitted every time the number of running tasks becomes zero; `queue.pending === 0`.

The difference with `idle` is that `pendingZero` is emitted even when the queue still has items waiting to run, whereas `idle` requires both an empty queue and no pending tasks.

```js
import delay from 'delay';
import PQueue from 'p-queue';

const queue = new PQueue();

queue.on('idle', () => {
	console.log(`Queue is idle.  Size: ${queue.size}  Pending: ${queue.pending}`);
});

const job1 = queue.add(() => delay(2000));
const job2 = queue.add(() => delay(500));

await job1;
await job2;
// => 'Queue is idle.  Size: 0  Pending: 0'

await queue.add(() => delay(600));
// => 'Queue is idle.  Size: 0  Pending: 0'
```

The `idle` event is emitted every time the queue reaches an idle state. On the other hand, the promise the `onIdle()` function returns resolves once the queue becomes idle instead of every time the queue is idle.

#### add

Emitted every time the add method is called and the number of pending or queued tasks is increased.

#### next

Emitted every time a task is completed and the number of pending or queued tasks is decreased. This is emitted regardless of whether the task completed normally or with an error.

```js
import delay from 'delay';
import PQueue from 'p-queue';

const queue = new PQueue();

queue.on('add', () => {
	console.log(`Task is added.  Size: ${queue.size}  Pending: ${queue.pending}`);
});

queue.on('next', () => {
	console.log(`Task is completed.  Size: ${queue.size}  Pending: ${queue.pending}`);
});

const job1 = queue.add(() => delay(2000));
const job2 = queue.add(() => delay(500));

await job1;
await job2;
//=> 'Task is added.  Size: 0  Pending: 1'
//=> 'Task is added.  Size: 0  Pending: 2'

await queue.add(() => delay(600));
//=> 'Task is completed.  Size: 0  Pending: 1'
//=> 'Task is completed.  Size: 0  Pending: 0'
```

#### rateLimit

Emitted when the queue becomes rate-limited due to `intervalCap`. This happens when the maximum number of tasks allowed per interval has been reached.

Useful for implementing backpressure to prevent memory issues when producers are faster than consumers.

```js
import delay from 'delay';
import PQueue from 'p-queue';

const queue = new PQueue({
	intervalCap: 2,
	interval: 1000
});

queue.on('rateLimit', () => {
	console.log('Queue is rate-limited - processing backlog or maintenance tasks');
});

// Add 3 tasks - third one triggers rate limiting
queue.add(() => delay(100));
queue.add(() => delay(100));
queue.add(() => delay(100));
```

#### rateLimitCleared

Emitted when the queue is no longer rate-limited—either because the interval reset and new tasks can start, or because the backlog was drained.

```js
import delay from 'delay';
import PQueue from 'p-queue';

const queue = new PQueue({
	intervalCap: 1,
	interval: 1000
});

queue.on('rateLimit', () => {
	console.log('Rate limited - waiting for interval to reset');
});

queue.on('rateLimitCleared', () => {
	console.log('Rate limit cleared - can process more tasks');
});

queue.add(() => delay(100));
queue.add(() => delay(100)); // This triggers rate limiting
```

## Advanced example

A more advanced example to help you understand the flow.

```js
import delay from 'delay';
import PQueue from 'p-queue';

const queue = new PQueue({concurrency: 1});

(async () => {
	await delay(200);

	console.log(`8. Pending promises: ${queue.pending}`);
	//=> '8. Pending promises: 0'

	(async () => {
		await queue.add(async () => '🐙');
		console.log('11. Resolved')
	})();

	console.log('9. Added 🐙');

	console.log(`10. Pending promises: ${queue.pending}`);
	//=> '10. Pending promises: 1'

	await queue.onIdle();
	console.log('12. All work is done');
})();

(async () => {
	await queue.add(async () => '🦄');
	console.log('5. Resolved')
})();
console.log('1. Added 🦄');

(async () => {
	await queue.add(async () => '🐴');
	console.log('6. Resolved')
})();
console.log('2. Added 🐴');

(async () => {
	await queue.onEmpty();
	console.log('7. Queue is empty');
})();

console.log(`3. Queue size: ${queue.size}`);
//=> '3. Queue size: 1`

console.log(`4. Pending promises: ${queue.pending}`);
//=> '4. Pending promises: 1'
```

```
$ node example.js
1. Added 🦄
2. Added 🐴
3. Queue size: 1
4. Pending promises: 1
5. Resolved 🦄
6. Resolved 🐴
7. Queue is empty
8. Pending promises: 0
9. Added 🐙
10. Pending promises: 1
11. Resolved 🐙
12. All work is done
```

## Handling timeouts

You can set a timeout for all tasks or override it per task. When a task times out, a `TimeoutError` is thrown.

```js
import PQueue, {TimeoutError} from 'p-queue';

// Set a global timeout for all tasks
const queue = new PQueue({
	concurrency: 2,
	timeout: 5000, // 5 seconds
});

(async () => {
	// This task will use the global timeout
	try {
		await queue.add(() => fetchData());
	} catch (error) {
		if (error instanceof TimeoutError) {
			console.log('Task timed out after 5 seconds');
		}
	}
})();

(async () => {
	// Override timeout for a specific task
	try {
		await queue.add(() => slowTask(), {
			timeout: 10000, // 10 seconds for this task only
		});
	} catch (error) {
		if (error instanceof TimeoutError) {
			console.log('Slow task timed out after 10 seconds');
		}
	}
})();

(async () => {
	// No timeout for this task
	await queue.add(() => verySlowTask(), {
		timeout: undefined,
	});
})();
```

## Custom QueueClass

For implementing more complex scheduling policies, you can provide a QueueClass in the options:

```js
import PQueue from 'p-queue';

class QueueClass {
	constructor() {
		this._queue = [];
	}

	enqueue(run, options) {
		this._queue.push(run);
	}

	dequeue() {
		return this._queue.shift();
	}

	get size() {
		return this._queue.length;
	}

	filter(options) {
		return this._queue;
	}
}

const queue = new PQueue({queueClass: QueueClass});
```

`p-queue` will call corresponding methods to put and get operations from this queue.

## FAQ

#### How do the `concurrency` and `intervalCap` options affect each other?

They are just different constraints. The `concurrency` option limits how many things run at the same time. The `intervalCap` option limits how many things run in total during the interval (over time).

#### When should I use `strict` mode for rate limiting?

Use `strict: true` when:
- You're interacting with APIs that enforce strict rate limits and will throttle or block you if you exceed them, even briefly
- You've experienced issues with the default fixed window mode (such as [#126](https://github.com/sindresorhus/p-queue/issues/126))
- You need guaranteed compliance with rate limits for any rolling time window

Use the default fixed window mode when:
- You don't have strict rate limit requirements
- Performance is more important than perfect rate limit distribution
- You're rate limiting for backpressure management rather than external API constraints

#### How do I implement backpressure?

Use `.onSizeLessThan()` to prevent the queue from growing unbounded and causing memory issues when producers are faster than consumers:

```js
const queue = new PQueue();

// Wait for queue to have space before adding more
await queue.onSizeLessThan(100);
queue.add(() => someTask());
```

Note: `.size` counts queued items, while `.pending` counts running items. The total is `queue.size + queue.pending`.

You can also use `.onRateLimit()` for backpressure during rate limiting. See the [`.onRateLimit()`](#onratelimit) docs.

#### How do I cancel or remove a queued task?

Use `AbortSignal` for targeted cancellation. Aborting removes a waiting task and rejects the `.add()` promise. For bulk operations, use `queue.clear()` or share one `AbortController` across tasks.

```js
import PQueue from 'p-queue';

const queue = new PQueue();
const controller = new AbortController();

const promise = queue.add(({signal}) => doWork({signal}), {signal: controller.signal});

controller.abort(); // Cancels if still queued; running tasks must handle `signal` themselves
```

Direct removal methods are not provided as they would leak internals and risk dangling promises.

#### How do I get results in the order they were added?

This package executes tasks in priority order, but doesn't guarantee completion order. If you need results in the order they were added, use `Promise.all()`, which maintains the order of the input array:

```js
import PQueue from 'p-queue';

const queue = new PQueue({concurrency: 4});

const tasks = [
	() => fetchData(1), // May finish third
	() => fetchData(2), // May finish first
	() => fetchData(3), // May finish second
];

const results = await Promise.all(
	tasks.map(task => queue.add(task))
);
// results = [result1, result2, result3] ✅ Always in input order

// Or more concisely:
const urls = ['url1', 'url2', 'url3'];
const results = await Promise.all(
	urls.map(url => queue.add(() => fetch(url)))
);
```

If you don't need `p-queue`'s advanced features, consider using [`p-map`](https://github.com/sindresorhus/p-map), which is specifically designed for this use case.

#### How do I stream results as they complete in order?

For progressive results that maintain input order, use [`pMapIterable`](https://github.com/sindresorhus/p-map#pmapiterable) from `p-map`:

```js
import {pMapIterable} from 'p-map';

// Stream results in order as they complete
for await (const result of pMapIterable(items, fetchItem, {concurrency: 4})) {
	console.log(result); // Results arrive in input order
}
```

You can combine it with `p-queue` when you need priorities or a shared concurrency cap:

```js
import PQueue from 'p-queue';
import {pMapIterable} from 'p-map';

// Let p-queue handle concurrency
const queue = new PQueue({concurrency: 4});

for await (const result of pMapIterable(
	items,
	item => queue.add(() => fetchItem(item), {priority: item.priority})
)) {
	console.log(result); // Still in input order
}
```

#### How do I debug a queue that stops processing tasks?

If your queue stops processing tasks after extended use, it's likely that some tasks are hanging indefinitely, exhausting the concurrency limit. Use the `.runningTasks` property to identify which specific tasks are stuck.

Common causes:
- Network requests without timeouts
- Database queries that hang
- File operations on unresponsive network drives
- Unhandled promise rejections

Debugging steps:

```js
// 1. Add timeouts to prevent hanging
const queue = new PQueue({
	concurrency: 2,
	timeout: 30000 // 30 seconds
});

// 2. Always add IDs to tasks for debugging
queue.add(() => processItem(item), {id: `item-${item.id}`});

// 3. Monitor for stuck tasks using runningTasks
setInterval(() => {
	const now = Date.now();
	const stuckTasks = queue.runningTasks.filter(task =>
		now - task.startTime > 30000 // Running for over 30 seconds
	);

	if (stuckTasks.length > 0) {
		console.error('Stuck tasks:', stuckTasks);
		// Consider aborting or logging more details
	}

	// Detect saturation (potential hanging if persistent)
	if (queue.isSaturated) {
		console.warn(`Queue saturated: ${queue.pending} running, ${queue.size} waiting`);
	}
}, 60000);

// 4. Track task lifecycle
queue.on('completed', result => {
	console.log('Task completed');
});
queue.on('error', error => {
	console.error('Task failed:', error);
});

// 5. Wrap tasks with debugging
const debugTask = async (fn, name) => {
	const start = Date.now();
	console.log(`Starting: ${name}`);
	try {
		const result = await fn();
		console.log(`Completed: ${name} (${Date.now() - start}ms)`);
		return result;
	} catch (error) {
		console.error(`Failed: ${name} (${Date.now() - start}ms)`, error);
		throw error;
	}
};

queue.add(() => debugTask(() => fetchData(), 'fetchData'), {id: 'fetchData'});
```

Prevention:
- Always use timeouts for I/O operations
- Ensure all async functions properly resolve or reject
- Use the `timeout` option to enforce task time limits
- Monitor `queue.size` and `queue.pending` in production

#### How do I test code that uses `p-queue` with Jest fake timers?

Jest fake timers don't work well with `p-queue` because it uses `queueMicrotask` internally.

Workaround:

```js
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

jest.useFakeTimers();

// ... your test code ...

await jest.runAllTimersAsync();
await flushPromises();
```

## Maintainers

- [Sindre Sorhus](https://github.com/sindresorhus)
- [Richie Bendall](https://github.com/Richienb)

## Related

- [p-limit](https://github.com/sindresorhus/p-limit) - Run multiple promise-returning & async functions with limited concurrency
- [p-throttle](https://github.com/sindresorhus/p-throttle) - Throttle promise-returning & async functions
- [p-debounce](https://github.com/sindresorhus/p-debounce) - Debounce promise-returning & async functions
- [p-all](https://github.com/sindresorhus/p-all) - Run promise-returning & async functions concurrently with optional limited concurrency
- [More…](https://github.com/sindresorhus/promise-fun)
