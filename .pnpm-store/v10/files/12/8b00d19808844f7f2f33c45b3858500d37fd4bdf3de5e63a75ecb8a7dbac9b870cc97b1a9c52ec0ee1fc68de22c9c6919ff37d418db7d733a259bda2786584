import {isSemicolonToken} from '@eslint-community/eslint-utils';

export default function * addParenthesizesToReturnOrThrowExpression(fixer, node, sourceCode) {
	if (node.type !== 'ReturnStatement' && node.type !== 'ThrowStatement') {
		return;
	}

	const returnOrThrowToken = sourceCode.getFirstToken(node);
	yield fixer.insertTextAfter(returnOrThrowToken, ' (');
	const lastToken = sourceCode.getLastToken(node);
	if (!isSemicolonToken(lastToken)) {
		yield fixer.insertTextAfter(node, ')');
		return;
	}

	yield fixer.insertTextBefore(lastToken, ')');
}
