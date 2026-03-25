// https://github.com/eslint/espree/blob/6b7d0b8100537dcd5c84a7fb17bbe28edcabe05d/lib/token-translator.js#L20
const tokenTypesNeedsSemicolon = new Set([
	'String',
	'Null',
	'Boolean',
	'Numeric',
	'RegularExpression',
]);

const charactersMightNeedsSemicolon = new Set([
	'[',
	'(',
	'/',
	'`',
	'+',
	'-',
	'*',
	',',
	'.',
]);

/**
Determines if a semicolon needs to be inserted before `code`, in order to avoid a SyntaxError.

@param {Token} tokenBefore Token before `code`.
@param {SourceCode} sourceCode
@param {String} [code] Code text to determine.
@returns {boolean} `true` if a semicolon needs to be inserted before `code`.
*/
export default function needsSemicolon(tokenBefore, sourceCode, code) {
	if (
		code === ''
		|| (code && !charactersMightNeedsSemicolon.has(code.charAt(0)))
	) {
		return false;
	}

	if (!tokenBefore) {
		return false;
	}

	const {type, value} = tokenBefore;
	const range = sourceCode.getRange(tokenBefore);
	const lastBlockNode = sourceCode.getNodeByRangeIndex(range[0]);
	if (type === 'Punctuator') {
		if (value === ';') {
			return false;
		}

		if (value === ']') {
			return true;
		}

		if (value === ')') {
			switch (lastBlockNode.type) {
				case 'IfStatement': {
					if (sourceCode.getTokenBefore(lastBlockNode.consequent) === tokenBefore) {
						return false;
					}

					break;
				}

				case 'ForStatement':
				case 'ForInStatement':
				case 'ForOfStatement':
				case 'WhileStatement':
				case 'DoWhileStatement':
				case 'WithStatement': {
					if (lastBlockNode.body && sourceCode.getTokenBefore(lastBlockNode.body) === tokenBefore) {
						return false;
					}

					break;
				}
				// No default
			}

			return true;
		}
	}

	if (tokenTypesNeedsSemicolon.has(type)) {
		return true;
	}

	if (type === 'Template') {
		return value.endsWith('`');
	}

	if (lastBlockNode.type === 'ObjectExpression') {
		return true;
	}

	if (type === 'Identifier') {
		// `for...of`
		if (value === 'of' && lastBlockNode.type === 'ForOfStatement') {
			return false;
		}

		// `await`
		if (value === 'await' && lastBlockNode.type === 'AwaitExpression') {
			return false;
		}

		return true;
	}

	return false;
}
