import getVariableIdentifiers from '../utils/get-variable-identifiers.js';
import replaceReferenceIdentifier from './replace-reference-identifier.js';

const renameVariable = (variable, name, fixer) => getVariableIdentifiers(variable)
	.map(identifier => replaceReferenceIdentifier(identifier, name, fixer));

export default renameVariable;
