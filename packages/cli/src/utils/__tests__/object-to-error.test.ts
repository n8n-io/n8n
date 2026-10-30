import type { INode, Workflow } from 'n8n-workflow';
import { NodeOperationError, WorkflowOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { objectToError } from '../object-to-error';

describe('objectToError', () => {
	describe('node error handling', () => {
		it('should create `NodeOperationError` when node is found', () => {
			const errorObject = {
				message: 'Test error',
				node: {
					name: 'testNode',
				},
			};
			const workflow = mock<Workflow>();
			const node = mock<INode>();
			workflow.getNode.mockReturnValue(node);

			const result = objectToError(errorObject, workflow);

			expect(workflow.getNode).toHaveBeenCalledWith('testNode');
			expect(result).toBeInstanceOf(NodeOperationError);
		});

		it('should create `Error` when node is not found', () => {
			const errorObject = {
				message: 'Test error',
				node: {
					// missing `name`
				},
			};
			const workflow = mock<Workflow>();

			const result = objectToError(errorObject, workflow);

			expect(workflow.getNode).not.toHaveBeenCalled();
			expect(result).toBeInstanceOf(Error);
			expect(result).not.toBeInstanceOf(NodeOperationError);
			expect(result.message).toBe('Test error');
		});
	});

	describe('error level', () => {
		it.each(['warning', 'info'] as const)(
			'should keep the `%s` level so the error reporter can drop the error',
			(level) => {
				const errorObject = {
					message: 'Test error',
					description: 'Test description',
					level,
				};
				const workflow = mock<Workflow>();

				const result = objectToError(errorObject, workflow);

				expect(result).toBeInstanceOf(WorkflowOperationError);
				expect(result).toMatchObject({
					level,
					message: 'Test error',
					description: 'Test description',
				});
			},
		);

		it.each(['error', undefined])(
			'should create a plain `Error` when the level is `%s`',
			(level) => {
				const errorObject = { message: 'Test error', level };
				const workflow = mock<Workflow>();

				const result = objectToError(errorObject, workflow);

				expect(result).not.toBeInstanceOf(WorkflowOperationError);
				expect(Object.hasOwn(result, 'level')).toBe(false);
			},
		);
	});

	describe('policy violations', () => {
		it('should copy `violations` from the error object', () => {
			const violation = {
				kind: 'node-type-unavailable',
				checkId: 'node-type-availability',
				message: 'Node type "n8n-nodes-base.set" is blocked by a project policy',
				subject: 'n8n-nodes-base.set',
				subjectType: 'nodeType',
				scope: 'project',
				projectId: 'project-1',
				optInAvailable: false,
			};
			const errorObject = {
				message: 'Test error',
				violations: [violation],
			};
			const workflow = mock<Workflow>();

			const result = objectToError(errorObject, workflow);

			expect((result as unknown as { violations: unknown[] }).violations).toEqual([violation]);
		});

		it('should not copy `isPolicyRefusal`', () => {
			const errorObject = {
				message: 'Test error',
				isPolicyRefusal: true,
			};
			const workflow = mock<Workflow>();

			const result = objectToError(errorObject, workflow);

			expect(Object.hasOwn(result, 'isPolicyRefusal')).toBe(false);
		});
	});
});
