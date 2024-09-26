import { ErrorReporterProxy, ExpressionEvaluatorProxy } from 'n8n-workflow';

import config from '@/config';

export const initExpressionEvaluator = () => {
	ExpressionEvaluatorProxy.setEvaluator(config.getEnv('expression.evaluator'));
	ExpressionEvaluatorProxy.setDifferEnabled(config.getEnv('expression.reportDifference'));
	ExpressionEvaluatorProxy.setDiffReporter((expr) => {
		ErrorReporterProxy.warn('Expression difference', {
			extra: {
				expression: expr,
			},
		});
	});
};
