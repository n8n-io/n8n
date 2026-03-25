import isShorthandPropertyValue from './is-shorthand-property-value.js';

const isShorthandPropertyAssignmentPatternLeft = identifier =>
	identifier.parent.type === 'AssignmentPattern'
	&& identifier.parent.left === identifier
	&& isShorthandPropertyValue(identifier.parent);

export default isShorthandPropertyAssignmentPatternLeft;
