interface Node {
	next: Node | null;
}

interface Constructor<T> {
	new(): T;
}

declare function reusify<T extends Node>(constructor: Constructor<T>): {
	get(): T;
	release(node: T): void;
};

export = reusify;
