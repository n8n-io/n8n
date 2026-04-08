export function isEventBindingElementAttribute(
	_attributeValue: unknown,
	attributeName: string,
): _attributeValue is (...args: unknown[]) => {} {
	return /^on[A-Z]/.test(attributeName);
}
