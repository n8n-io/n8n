import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import { AgentExpressionContextService } from '../agent-expression-context.service';

const getBaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/workflow-execute-additional-data', () => ({ getBase: getBaseMock }));

describe('AgentExpressionContextService', () => {
	const projectId = 'project-1';
	let service: AgentExpressionContextService;

	beforeEach(() => {
		getBaseMock.mockReset();
		const nodeTypes = mock<NodeTypes>();
		nodeTypes.getByNameAndVersion.mockReturnValue(undefined as never);
		service = new AgentExpressionContextService(nodeTypes);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('snapshots and freezes project variables while exposing supported expression keys only', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-30T12:00:00.000Z'));
		const backingVariables = {
			SNAPSHOT_VALUE: 'before',
			NESTED_VALUE: { value: 'nested-before' },
		};
		getBaseMock.mockResolvedValue({ variables: backingVariables });

		const context = await service.createForProject(projectId);
		backingVariables.SNAPSHOT_VALUE = 'after';
		backingVariables.NESTED_VALUE.value = 'nested-after';

		expect(getBaseMock).toHaveBeenCalledWith({ projectId });
		expect(Object.isFrozen(context.variables)).toBe(true);
		expect(Object.isFrozen(context.variables.NESTED_VALUE)).toBe(true);
		await expect(
			context.resolveValue(
				{
					variable: '={{ $vars.SNAPSHOT_VALUE }}',
					nested: '={{ $vars.NESTED_VALUE.value }}',
					total: '={{ 2 + 3 }}',
				},
				'agent.config',
			),
		).resolves.toEqual({ variable: 'before', nested: 'nested-before', total: 5 });
		await expect(
			context.resolveText(
				'={{ $now.toISODate() }} / {{ $today.toISODate() }}',
				'agent.instructions',
			),
		).resolves.toBe('2026-07-30 / 2026-07-30');
		await expect(context.resolveValue('={{ $secrets }}', 'agent.instructions')).resolves.toBe(
			undefined,
		);
	});

	it('sanitizes expression failures', async () => {
		getBaseMock.mockResolvedValue({ variables: {} });
		const context = await service.createForProject(projectId);
		const rawExpression = '={{ "PRIVATE_SENTINEL" + }}';
		let caught: unknown;

		try {
			await context.resolveValue(rawExpression, 'agent.instructions');
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(UserError);
		if (!(caught instanceof UserError)) throw new Error('Expected UserError');
		expect([caught.message, caught.description, caught.extra, caught.cause]).toEqual([
			'Could not resolve expression for "agent.instructions"',
			undefined,
			undefined,
			undefined,
		]);
		expect(caught.message).not.toContain('PRIVATE_SENTINEL');
	});

	it('rejects non-text results without exposing their contents', async () => {
		getBaseMock.mockResolvedValue({ variables: {} });
		const context = await service.createForProject(projectId);

		await expect(
			context.resolveText('={{ { private: "PRIVATE_SENTINEL" } }}', 'agent.instructions'),
		).rejects.toThrow(/^Expression for "agent\.instructions" did not resolve to text$/);
	});
});
