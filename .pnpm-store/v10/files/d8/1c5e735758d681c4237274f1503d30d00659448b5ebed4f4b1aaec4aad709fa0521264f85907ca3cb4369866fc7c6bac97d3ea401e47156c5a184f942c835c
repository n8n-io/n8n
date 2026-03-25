import {getParenthesizedRange} from '../utils/parentheses.js';

export default function replaceArgument(fixer, node, text, sourceCode) {
	return fixer.replaceTextRange(getParenthesizedRange(node, sourceCode), text);
}
