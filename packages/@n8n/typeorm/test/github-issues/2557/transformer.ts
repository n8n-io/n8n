export class WrappedNumber {
	constructor(private wrapped: number) {}

	getWrapped(): number {
		return this.wrapped;
	}
}

export const transformer = {
	lastValue: undefined as any,
	from(val: number) {
		return new WrappedNumber(val);
	},
	to(w: WrappedNumber) {
		transformer.lastValue = w;
		return w.getWrapped();
	},
};
