export namespace RegExpStringTransformer {
	export function to(value: RegExp): string {
		return value.toString();
	}

	export function from(value: string): RegExp {
		const match = value.match(/^\/(.*)\/(.*)$/);
		if (match) {
			const [, pattern, flags] = match;
			return new RegExp(pattern, flags);
		} else {
			throw new Error(`"${value}" is not a regular expression`);
		}
	}
}
