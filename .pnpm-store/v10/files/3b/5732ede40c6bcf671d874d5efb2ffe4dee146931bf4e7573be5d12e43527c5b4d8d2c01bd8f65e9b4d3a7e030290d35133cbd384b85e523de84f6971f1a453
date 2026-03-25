/**
 * Return copy of object, only keeping allowlisted properties.
 */
export function pick<T, K extends keyof T>(o: T, props: K[] | ReadonlyArray<K>): Pick<T, K> {
	return Object.assign(
		{},
		...props.map((prop) => {
			if (o[prop] !== undefined) {
				return { [prop]: o[prop] };
			}
		})
	);
}
