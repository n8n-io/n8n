/**
 * The `n8n-nodes-testing.testData` node of n8n's node tests
 * (`packages/core/nodes-testing/test-data-node.ts`). It emits the items of its
 * `data` parameter (a JSON array or one object) once, when it gets input
 * items. The converter writes the items as a literal.
 */
import { literal } from './code.ts';
import type { NodeContext } from './context.ts';
import { NodeFailure } from './context.ts';
import { INDEX, ITEM, isExpression } from './expression.ts';
import { isRecord } from './types.ts';

export const TEST_DATA_TYPE = 'n8n-nodes-testing.testData';

export function lowerTestData(c: NodeContext): void {
	const data = c.parameters.data ?? '[]';
	const out = c.output(0);
	if (isExpression(data)) {
		// v1 reads the parameter for item 0.
		const t = c.compiled(data, 'data');
		const value = c.local('Data');
		c.w.line(`let ${value}: Json = [];`);
		c.w.open(`if (${c.input}.length > 0) {`);
		c.w.line(`const ${ITEM} = ${c.input}[0];`);
		if (t.usage.index) c.w.line(`const ${INDEX} = 0;`);
		c.w.block(`${value} = ${c.print(t.code, `${value} = `)};`);
		c.w.close();
		c.w.line(`if (typeof ${value} === 'string') ${value} = JSON.parse(${value});`);
		c.w.line(
			`const ${out}: Json[] = (Array.isArray(${value}) ? ${value} : [${value}]).filter((x: Json) => x !== null && typeof x === 'object' && !Array.isArray(x));`,
		);
		return;
	}
	let parsed: unknown = data;
	if (typeof data === 'string') {
		try {
			parsed = JSON.parse(data);
		} catch {
			throw new NodeFailure('test-data', 'The data parameter is not valid JSON.', 'data');
		}
	}
	const list = (Array.isArray(parsed) ? parsed : [parsed]).filter(isRecord);
	c.w.block(
		`const ${out}: Json[] = ${c.input}.length > 0 ? ${c.print(literal(list), `const ${out}: Json[] = ${c.input}.length > 0 ? `)} : [];`,
	);
}
