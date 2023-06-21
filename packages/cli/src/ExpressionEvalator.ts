import config from '@/config';
import { ExpressionEvaluatorProxy } from 'n8n-workflow';

export const initExpressionEvaluator = () => {
	ExpressionEvaluatorProxy.setEvaluator(config.getEnv('expression.evaluator'));
};
