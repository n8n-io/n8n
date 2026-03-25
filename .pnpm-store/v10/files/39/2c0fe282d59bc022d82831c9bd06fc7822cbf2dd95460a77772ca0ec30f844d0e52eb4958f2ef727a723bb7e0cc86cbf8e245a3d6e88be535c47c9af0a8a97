# queue-lit

This package is a tiny queue data structure in case you `Array#push()` or
`Array#shift()` on large arrays very often.  
`Array#shift()` has linear time complexity `O(n)` while `Queue#push()` has
constant time complexity `O(1)`.

## Requirements

  - Node v12+

## Installation

```bash
$ npm i queue-lit
# or
$ yarn add queue-lit
```

## Usage

```js
import { Queue } from 'queue-lit';

const queue = new Queue();

queue.push('Hello');
queue.push('World');

console.log(queue.size);
// => 2

console.log(...queue);
// => 'Hello World'

console.log(queue.pop());
//=> 'Hello'

console.log(queue.pop());
//=> 'World'
```

## API

### `queue = new Queue()`

The instance is an [`Iterable`], which means you can iterate over the queue
front to back with a `for...of` loop, or use spreading to convert the queue to
an array.

#### `.push(value)`

Adds one element to the end of the queue and returns the new length of
the queue.  
This method changes the size of the queue.

#### `.pop()`

Pop removes the last element from the queue and returns that element.  
This method changes the size of the queue.

Returns `undefined` if the queue is empty.

#### `.clear()`

Clears the queue and removes all elements.  
This method changes the size of the queue.

#### `.size`

Static method that returns the size of the queue.


## Development

(1) Install dependencies

```bash
$ npm i
# or
$ yarn
```

(2) Run initial validation

```bash
$ ./Taskfile.sh validate
```

(3) Start developing. See [`./Taskfile.sh`](./Taskfile.sh) for more tasks to
    help you develop.

---

_This project was set up by @jvdx/core_

[`Iterable`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols