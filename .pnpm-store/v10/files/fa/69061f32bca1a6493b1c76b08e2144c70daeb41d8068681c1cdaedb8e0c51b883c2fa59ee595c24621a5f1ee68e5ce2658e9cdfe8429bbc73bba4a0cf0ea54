export default class Queue<ValueType> implements Iterable<ValueType> {
	/**
	The size of the queue.
	*/
	readonly size: number;

	/**
	Tiny queue data structure.

	The instance is an [`Iterable`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols), which means you can iterate over the queue front to back with a “for…of” loop, or use spreading to convert the queue to an array. Don't do this unless you really need to though, since it's slow.

	@example
	```
	import Queue from 'yocto-queue';

	const queue = new Queue();

	queue.enqueue('🦄');
	queue.enqueue('🌈');

	console.log(queue.size);
	//=> 2

	console.log(...queue);
	//=> '🦄 🌈'

	console.log(queue.dequeue());
	//=> '🦄'

	console.log(queue.dequeue());
	//=> '🌈'
	```
	*/
	constructor();

	/**
	The instance is an [`Iterable`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols), which means you can iterate over the queue front to back with a “for…of” loop. Using the iterator will not remove the items from the queue. If you want that, use `drain()` instead.
 
	You can also use spreading to convert the queue to an array. Don't do this unless you really need to though, since it's slow.
	*/
	[Symbol.iterator](): IterableIterator<ValueType>;

	/**
	Returns an iterator that dequeues items as you consume it.

	This allows you to empty the queue while processing its items.

	If you want to not remove items as you consume it, use the `Queue` object as an iterator.
	*/
	drain(): IterableIterator<ValueType>;

	/**
	Add a value to the queue.
	*/
	enqueue(value: ValueType): void;

	/**
	Remove the next value in the queue.

	@returns The removed value or `undefined` if the queue is empty.
	*/
	dequeue(): ValueType | undefined;

	/**
	Get the next value in the queue without removing it.

	@returns The value or `undefined` if the queue is empty.
	*/
	peek(): ValueType | undefined;

	/**
	Clear the queue.
	*/
	clear(): void;
}
