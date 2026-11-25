import { parseYaml } from '../spec/parse-yaml';

describe('parseYaml', () => {
	it('should replace an alias to an ancestor with an empty object', () => {
		const document = parseYaml(['schema: &value', '  type: array', '  items: *value'].join('\n'));

		expect(document).toEqual({ schema: { type: 'array', items: {} } });
	});

	it('should keep an object that two aliases use without a cycle', () => {
		const document = parseYaml(
			['first: &shared', '  type: string', 'list:', '  - *shared'].join('\n'),
		);

		expect(document).toEqual({ first: { type: 'string' }, list: [{ type: 'string' }] });
	});
});
