import { Tournament } from '../src/index';
import { FunctionEvaluator } from '../src/FunctionEvaluator';
import { testExpressionsWithEvaluator } from './utils';

const evaluator = new Tournament(() => {});

describe('Expression', () => {
	describe('Test all expression evaluation fixtures', () => {
		testExpressionsWithEvaluator(FunctionEvaluator);
	});

	describe('Should throw error when using import', () => {
		expect(() =>
			evaluator.execute('{{ import("").then(fs => fs.writeFileSync("/tmp/flag", "flag")) }}', {}),
		).toThrow('Imports are not supported');
	});
});
