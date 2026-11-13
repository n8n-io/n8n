import type { ExecutionLedgerFoldStep } from '../fold-step';
import { FoldStepRegistry } from '../fold-step.registry';

const step = (name: string): ExecutionLedgerFoldStep => ({ name, fold: async () => undefined });

describe('FoldStepRegistry', () => {
	it('returns steps in registration order', () => {
		const registry = new FoldStepRegistry();
		const insights = step('insights');
		const limits = step('execution_limits');

		registry.register(insights);
		registry.register(limits);

		expect(registry.getAll()).toEqual([insights, limits]);
	});

	it('rejects a second step with the same name', () => {
		const registry = new FoldStepRegistry();
		registry.register(step('insights'));

		expect(() => registry.register(step('insights'))).toThrow(
			'Fold step "insights" is already registered',
		);
	});

	it.each(['Insights', '1step', 'a-b', 'a"; DROP', 'a'.repeat(49), ''])(
		'rejects the invalid name %j',
		(name) => {
			expect(() => new FoldStepRegistry().register(step(name))).toThrow('Invalid fold step name');
		},
	);
});
