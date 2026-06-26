export enum Order {
	FIRST = 'first',
	SECOND = 'second',
	THIRD = 'third',
}

export namespace Order {
	export function from(value: string): Order {
		switch (value) {
			case '_1':
				return Order.FIRST;
			case '_2':
				return Order.SECOND;
			case '_3':
				return Order.THIRD;
			default:
				return Order.FIRST;
		}
	}
}
