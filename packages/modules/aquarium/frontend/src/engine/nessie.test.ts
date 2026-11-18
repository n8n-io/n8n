import type { AquariumEntity } from '../aquarium.types';
import { emptyMetrics } from '../sources/source.utils';
import { analyzeWorkflow } from './design';
import { nessieKey } from './nessie';

const tangledDesign = {
	...analyzeWorkflow([]),
	nodeCount: 22,
	duplicateNodeCount: 4,
	branchNodeCount: 9,
};

const workflow = (
	key: string,
	complexity: number,
	design = tangledDesign,
	kind: AquariumEntity['kind'] = 'workflow',
): AquariumEntity => ({
	key,
	id: key,
	kind,
	name: key,
	metrics: { ...emptyMetrics(), complexity },
	design,
});

describe('nessieKey', () => {
	it('picks the biggest workflow that is hard to maintain', () => {
		const key = nessieKey([workflow('a', 30), workflow('b', 60), workflow('c', 45)]);
		expect(key).toBe('b');
	});

	it('skips a bigger workflow that is easy to maintain', () => {
		const key = nessieKey([workflow('tidy', 90, analyzeWorkflow([])), workflow('tangled', 30)]);
		expect(key).toBe('tangled');
	});

	it('gives a tie to the worse score, then to the first key', () => {
		const worse = { ...tangledDesign, codeNodeCount: 8 };
		expect(nessieKey([workflow('a', 40), workflow('b', 40, worse)])).toBe('b');
		expect(nessieKey([workflow('b', 40), workflow('a', 40)])).toBe('a');
	});

	it('finds no Loch Ness monster when all workflows are easy to maintain', () => {
		expect(nessieKey([workflow('tidy', 90, analyzeWorkflow([]))])).toBeUndefined();
	});

	it('ignores agents', () => {
		expect(nessieKey([workflow('agent', 90, tangledDesign, 'agent')])).toBeUndefined();
	});
});
