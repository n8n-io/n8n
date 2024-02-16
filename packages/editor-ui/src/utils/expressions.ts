import { ExpressionParser } from 'n8n-workflow';

export const isExpression = (expr: unknown) => {
	if (typeof expr !== 'string') return false;
	return expr.startsWith('=');
};

export const isTestableExpression = (expr: string) => {
	return ExpressionParser.splitExpression(expr).every((c) => {
		if (c.type === 'text') {
			return true;
		}
		return /\$secrets(\.[a-zA-Z0-9_]+)+$/.test(c.text.trim());
	});
};
