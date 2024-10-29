export class StringArray<T extends string> extends Array<T> {
	constructor(str: string) {
		super();
		const parsed = str.split(',') as StringArray<T>;
		return parsed.every((i) => typeof i === 'string') ? parsed : [];
	}
}
