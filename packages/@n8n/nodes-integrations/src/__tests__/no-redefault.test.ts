import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');

const source = `import { defineNode, t } from '@n8n/node-sdk';

const node = defineNode({ id: 'probe', displayName: 'Probe' });

export const probe = node.action('read', {
	action: 'Read',
	summary: 'Read.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: {
		paging: t.obj({ size: t.int().default(50) }).default({}),
		header: t.obj({ row: t.int().default(1) }).optional(),
		name: t.str().optional(),
	},
	output: t.obj({ size: t.int(), row: t.int(), name: t.str() }),
	run: async ({ input }) => {
		const paging = input.paging ?? { size: 50 };
		const size = input.paging.size ?? 50;
		const row = input.header ? (input.header.row ?? 1) : (input.header?.row ?? 0);
		const name = input.name ?? 'none';
		const { size: pageSize = 50 } = input.paging;
		const { name: label = 'none' } = input;
		return await Promise.resolve({ size: paging.size + size + pageSize, row, name: name + label });
	},
});
`;

interface LintResult {
	messages: Array<{ ruleId: string | null; line: number; message: string }>;
}

describe('n8n-contract/no-redefault', () => {
	it('reports a fallback for a field with a default, at any depth', () => {
		// Type-aware lint needs a file of the project; stdin replaces its text.
		const { stdout, stderr } = spawnSync(
			'npx',
			[
				'--no-install',
				'eslint',
				'--format',
				'json',
				'--stdin',
				'--stdin-filename',
				'src/nodes/slack/actions/user.get.ts',
			],
			{ cwd: root, input: source, encoding: 'utf8' },
		);
		expect(stdout, stderr).toMatch(/^\[/);
		const [result] = JSON.parse(stdout) as LintResult[];
		const reported = result.messages.filter(({ ruleId }) => ruleId === 'n8n-contract/no-redefault');

		expect(reported.map(({ line, message }) => `${line}: ${message}`)).toEqual([
			'16: `input.paging` is always set. Remove the fallback.',
			'17: `input.paging.size` is always set. Remove the fallback.',
			'18: `input.header.row` is always set. Remove the fallback.',
			'20: `size` is always set. Remove the fallback.',
		]);
	}, 120_000);
});
