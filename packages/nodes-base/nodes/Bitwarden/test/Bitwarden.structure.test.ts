import { eventOperations } from '../descriptions/EventDescription';

describe('Bitwarden Node Structure', () => {
	it('event operation default should be one of its options', () => {
		const operation = eventOperations[0];
		const values = (operation.options as Array<{ value: string }>).map((o) => o.value);
		expect(values).toContain(operation.default);
	});
});
