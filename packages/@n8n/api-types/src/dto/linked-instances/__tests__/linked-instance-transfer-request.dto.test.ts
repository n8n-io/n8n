import { LINKED_INSTANCE_TRANSFER_INPUT_MESSAGES as MESSAGES } from '../linked-instance-transfer.schema';
import { LinkedInstancePullRequestDto } from '../pull-workflow-request.dto';
import { LinkedInstanceTransferPreflightRequestDto } from '../transfer-preflight-request.dto';
import { LinkedInstanceTransferRequestDto } from '../transfer-workflow-request.dto';

const firstIssue = (result: { success: boolean; error?: { issues: unknown[] } }) =>
	result.error?.issues[0];

// Nanoids (the current format), legacy numeric ids and UUIDs.
const VALID_IDS = [
	'a',
	'Xk3pQ9aZ1bC2dE4f',
	'42',
	'a'.repeat(36),
	'6bd0d6a4-8f43-4a8e-a5b6-1c2d3e4f5a6b',
];

const INVALID_IDS: Array<[string, unknown]> = [
	['an empty id', ''],
	['an id over 36 characters', 'a'.repeat(37)],
	['an id with a slash', '../workflows'],
	['an id with a space', 'a b'],
	['an id with a query', 'a?b=1'],
	['a number', 42],
	['null', null],
];

describe('LinkedInstanceTransferPreflightRequestDto', () => {
	it.each(VALID_IDS)('accepts the workflow id %j', (workflowId) => {
		expect(LinkedInstanceTransferPreflightRequestDto.safeParse({ workflowId }).data).toEqual({
			workflowId,
		});
	});

	it.each(INVALID_IDS)('rejects %s with the en-GB workflow message', (_, workflowId) => {
		const result = LinkedInstanceTransferPreflightRequestDto.safeParse({ workflowId });

		expect(firstIssue(result)).toMatchObject({ path: ['workflowId'] });
		if (typeof workflowId === 'string') {
			expect(firstIssue(result)).toMatchObject({ message: MESSAGES.workflowId });
		}
	});

	it('requires the workflow id', () => {
		expect(firstIssue(LinkedInstanceTransferPreflightRequestDto.safeParse({}))).toMatchObject({
			path: ['workflowId'],
		});
	});
});

describe('LinkedInstanceTransferRequestDto', () => {
	it('accepts a move with no options and leaves the options out', () => {
		expect(LinkedInstanceTransferRequestDto.safeParse({ workflowId: 'wf1' }).data).toEqual({
			workflowId: 'wf1',
		});
	});

	it('accepts both options', () => {
		const body = { workflowId: 'wf1', publish: true, deactivateLocal: false };

		expect(LinkedInstanceTransferRequestDto.safeParse(body).data).toEqual(body);
	});

	it.each(['publish', 'deactivateLocal'])('rejects %s that is not a boolean', (option) => {
		const result = LinkedInstanceTransferRequestDto.safeParse({
			workflowId: 'wf1',
			[option]: 'yes',
		});

		expect(firstIssue(result)).toMatchObject({ path: [option] });
	});

	it.each(INVALID_IDS)('rejects %s as the workflow id', (_, workflowId) => {
		const result = LinkedInstanceTransferRequestDto.safeParse({ workflowId });

		expect(firstIssue(result)).toMatchObject({ path: ['workflowId'] });
	});

	it('drops fields that the server decides, such as the target project', () => {
		const result = LinkedInstanceTransferRequestDto.safeParse({
			workflowId: 'wf1',
			projectId: 'p1',
			sourceWorkflowId: 'other',
		});

		expect(result.data).toEqual({ workflowId: 'wf1' });
	});
});

describe('LinkedInstancePullRequestDto', () => {
	it('accepts a remote workflow without a project, and with one', () => {
		expect(LinkedInstancePullRequestDto.safeParse({ remoteWorkflowId: 'r1' }).data).toEqual({
			remoteWorkflowId: 'r1',
		});
		expect(
			LinkedInstancePullRequestDto.safeParse({ remoteWorkflowId: 'r1', projectId: 'p1' }).data,
		).toEqual({ remoteWorkflowId: 'r1', projectId: 'p1' });
	});

	it.each(INVALID_IDS)('rejects %s as the remote workflow id', (_, remoteWorkflowId) => {
		const result = LinkedInstancePullRequestDto.safeParse({ remoteWorkflowId });

		expect(firstIssue(result)).toMatchObject({ path: ['remoteWorkflowId'] });
		if (typeof remoteWorkflowId === 'string') {
			expect(firstIssue(result)).toMatchObject({ message: MESSAGES.remoteWorkflowId });
		}
	});

	it.each(INVALID_IDS)('rejects %s as the project id', (_, projectId) => {
		const result = LinkedInstancePullRequestDto.safeParse({ remoteWorkflowId: 'r1', projectId });

		expect(firstIssue(result)).toMatchObject({ path: ['projectId'] });
		if (typeof projectId === 'string') {
			expect(firstIssue(result)).toMatchObject({ message: MESSAGES.projectId });
		}
	});
});
