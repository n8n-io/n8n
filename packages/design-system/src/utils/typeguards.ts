export function isEventBindingElementAttribute(
	attribute: unknown,
	attributeName: string,
): attribute is (...args: unknown[]) => {} {
	return /^on[A-Z]/.test(attributeName) && typeof attribute === 'function';
}
