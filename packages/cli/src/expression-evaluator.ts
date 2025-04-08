import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { ExpressionEvaluatorProxy } from 'n8n-workflow';

import config from '@/config';

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
