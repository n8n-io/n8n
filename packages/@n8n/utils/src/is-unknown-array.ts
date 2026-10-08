// `Array.isArray` narrows an `unknown` to `any[]`; this keeps the elements
// opaque so downstream checks have to narrow them explicitly.
export function isUnknownArray(value: unknown): value is readonly unknown[] {
	return Array.isArray(value);
}
