import { ExpressionEvaluatorProxy } from 'n8n-workflow';
import Container from 'typedi';

import config from '@/config';
import { ErrorReporter } from '@/error-reporter';

export const initExpressionEvaluator = () => {
	ExpressionEvaluatorProxy.setEvaluator(config.getEnv('expression.evaluator'));
	ExpressionEvaluatorProxy.setDifferEnabled(config.getEnv('expression.reportDifference'));
	ExpressionEvaluatorProxy.setDiffReporter((expr) => {
		Container.get(ErrorReporter).warn('Expression difference', {
			extra: {
				expression: expr,
			},
		});
	});
};
