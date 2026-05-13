import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { mockReset } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';

import { warnOnMissingEnvRefs } from '../env-scan';
import type { ParsedWorkflow } from '../parse';

const logger = mockInstance(Logger);

const node = (overrides: Partial<INode>): INode => ({
	id: 'n',
	name: 'n',
	type: 'n8n-nodes-base.set',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

const workflow = (name: string, nodes: INode[]): ParsedWorkflow => ({
	name,
	nodes,
	connections: {},
});

/**
 * Save and restore process.env entries used by a test. Returns a tuple of
 * (set, restore) helpers so each test fully owns its env-var lifecycle and
 * tests don't leak state into one another.
 */
function envSandbox(...names: string[]) {
	const snapshot = new Map<string, string | undefined>();
	for (const name of names) snapshot.set(name, process.env[name]);

	return {
		set(name: string, value: string) {
			process.env[name] = value;
		},
		unset(name: string) {
			delete process.env[name];
		},
		restore() {
			for (const [name, original] of snapshot) {
				if (original === undefined) delete process.env[name];
				else process.env[name] = original;
			}
		},
	};
}

describe('warnOnMissingEnvRefs', () => {
	beforeEach(() => {
		mockReset(logger);
	});

	it('emits one warning naming the env var, node, and workflow when $env.X is unset', () => {
		const env = envSandbox('MY_TOKEN');
		env.unset('MY_TOKEN');
		try {
			const wf = workflow('Daily Sync', [
				node({
					name: 'HTTP Request',
					parameters: { url: '={{ $env.MY_TOKEN }}' },
				}),
			]);

			warnOnMissingEnvRefs([wf]);

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'$env.MY_TOKEN referenced in node "HTTP Request" of workflow "Daily Sync" — not set',
			);
		} finally {
			env.restore();
		}
	});

	it('emits two warnings when the same env var is referenced in two nodes', () => {
		const env = envSandbox('SHARED_KEY');
		env.unset('SHARED_KEY');
		try {
			const wf = workflow('Multi', [
				node({ name: 'A', parameters: { url: '={{ $env.SHARED_KEY }}' } }),
				node({ name: 'B', parameters: { headers: '={{ $env.SHARED_KEY }}' } }),
			]);

			warnOnMissingEnvRefs([wf]);

			expect(logger.warn).toHaveBeenCalledTimes(2);
			expect(logger.warn).toHaveBeenCalledWith(
				'$env.SHARED_KEY referenced in node "A" of workflow "Multi" — not set',
			);
			expect(logger.warn).toHaveBeenCalledWith(
				'$env.SHARED_KEY referenced in node "B" of workflow "Multi" — not set',
			);
		} finally {
			env.restore();
		}
	});

	it('does not warn when the referenced env var is set', () => {
		const env = envSandbox('PRESENT_VAR');
		env.set('PRESENT_VAR', 'value');
		try {
			const wf = workflow('Has Env', [
				node({ name: 'X', parameters: { url: '={{ $env.PRESENT_VAR }}' } }),
			]);

			warnOnMissingEnvRefs([wf]);

			expect(logger.warn).not.toHaveBeenCalled();
		} finally {
			env.restore();
		}
	});

	it('warns only for unresolved refs in a mixed workflow', () => {
		const env = envSandbox('SET_VAR', 'UNSET_VAR');
		env.set('SET_VAR', 'value');
		env.unset('UNSET_VAR');
		try {
			const wf = workflow('Mixed', [
				node({ name: 'WithSet', parameters: { url: '={{ $env.SET_VAR }}' } }),
				node({ name: 'WithUnset', parameters: { url: '={{ $env.UNSET_VAR }}' } }),
			]);

			warnOnMissingEnvRefs([wf]);

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'$env.UNSET_VAR referenced in node "WithUnset" of workflow "Mixed" — not set',
			);
		} finally {
			env.restore();
		}
	});

	it('logs nothing for a workflow with no expressions', () => {
		const wf = workflow('No Expressions', [
			node({ name: 'Plain', parameters: { value: 'literal string', count: 42 } }),
		]);

		warnOnMissingEnvRefs([wf]);

		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('traverses nested objects and arrays inside parameters', () => {
		const env = envSandbox('DEEP_VAR');
		env.unset('DEEP_VAR');
		try {
			const wf = workflow('Nested', [
				node({
					name: 'Deep',
					parameters: {
						options: {
							headers: {
								values: [{ name: 'Authorization', value: '={{ "Bearer " + $env.DEEP_VAR }}' }],
							},
						},
					},
				}),
			]);

			warnOnMissingEnvRefs([wf]);

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'$env.DEEP_VAR referenced in node "Deep" of workflow "Nested" — not set',
			);
		} finally {
			env.restore();
		}
	});

	it('detects the $env["X"] bracket syntax', () => {
		const env = envSandbox('BRACKET_VAR');
		env.unset('BRACKET_VAR');
		try {
			const wf = workflow('Bracket', [
				node({
					name: 'B',
					parameters: { url: "={{ $env['BRACKET_VAR'] }}" },
				}),
			]);

			warnOnMissingEnvRefs([wf]);

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'$env.BRACKET_VAR referenced in node "B" of workflow "Bracket" — not set',
			);
		} finally {
			env.restore();
		}
	});
});
