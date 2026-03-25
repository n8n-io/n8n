const isShorthandPropertyValue = identifier =>
	identifier.parent.type === 'Property'
	&& identifier.parent.shorthand
	&& identifier === identifier.parent.value;

export default isShorthandPropertyValue;
