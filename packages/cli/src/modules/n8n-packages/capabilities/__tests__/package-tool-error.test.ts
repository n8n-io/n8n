import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	InternalServerError,
	OperationalError,
	UnexpectedError,
	UnprocessableRequestError,
	UserError,
} from '@n8n/errors';

import { WorkflowAccessError } from '@/modules/mcp/mcp.errors';

import { PackageExportBlockedError } from '../../entities/package-export.errors';
import { classifyMcpWorkflowAccessFailure, packageToolError } from '../package-tool-error';

const issue = {
	type: 'credential-unresolved',
	kind: 'type_mismatch',
	sourceId: 'src-1',
	usedByWorkflows: ['wf-1'],
};

describe('packageToolError', () => {
	it('keeps the description of an error that the user can fix', () => {
		const error = new PackageExportBlockedError(
			'1 workflow dependency not included in the package. Export aborted.',
			{ description: 'Workflow IDs not included in the package: wf-sub' },
		);

		expect(packageToolError(error)).toEqual({
			content: [
				{
					type: 'text',
					text: '1 workflow dependency not included in the package. Export aborted. Workflow IDs not included in the package: wf-sub',
				},
			],
			structuredContent: {
				error: '1 workflow dependency not included in the package. Export aborted.',
			},
			isError: true,
		});
	});

	it('gives only the message when the error has no description', () => {
		const result = packageToolError(new UserError('Workflow not found'));

		expect(result?.content).toEqual([{ type: 'text', text: 'Workflow not found' }]);
		expect(result?.structuredContent).toEqual({ error: 'Workflow not found' });
	});

	it('adds no space for an empty description', () => {
		const result = packageToolError(new UserError('Workflow not found', { description: '' }));

		expect(result?.content).toEqual([{ type: 'text', text: 'Workflow not found' }]);
	});

	it.each([
		[
			'a conflict',
			new ConflictError('Import blocked: 1 issue(s).', undefined, { issues: [issue] }),
		],
		[
			'an unprocessable package',
			new UnprocessableRequestError('Import blocked: 1 issue(s).', undefined, { issues: [issue] }),
		],
	])('lists the blocking issues of %s', (_case, error) => {
		const result = packageToolError(error);

		expect(result?.isError).toBe(true);
		expect(result?.content).toEqual([
			{ type: 'text', text: `Import blocked: 1 issue(s). Issues: ${JSON.stringify([issue])}` },
		]);
		expect(result?.structuredContent).toEqual({
			error: 'Import blocked: 1 issue(s).',
			issues: [issue],
		});
	});

	it('gives no issues when the metadata of the error has none', () => {
		const result = packageToolError(
			new ConflictError('Conflict', undefined, { issues: 'not a list' }),
		);

		expect(result?.structuredContent).toEqual({ error: 'Conflict' });
		expect(result?.content).toEqual([{ type: 'text', text: 'Conflict' }]);
	});

	it.each([
		[
			'a forbidden project',
			new ForbiddenError('You do not have permission to import into this project.'),
		],
		['an invalid package', new BadRequestError('Package manifest failed validation')],
	])('gives a tool error for %s', (_case, error) => {
		expect(packageToolError(error)).toEqual({
			content: [{ type: 'text', text: error.message }],
			structuredContent: { error: error.message },
			isError: true,
		});
	});

	it.each([
		['a server error', new InternalServerError('Database is down')],
		['an unexpected error', new UnexpectedError('Bug')],
		['an operational error', new OperationalError('Timeout')],
		['a plain error', new Error('Something failed')],
		['a thrown string', 'failed'],
	])('leaves %s to the MCP SDK', (_case, error) => {
		expect(packageToolError(error)).toBeUndefined();
	});
});

describe('classifyMcpWorkflowAccessFailure', () => {
	it.each([
		['not_available_in_mcp', 'access-denied'],
		['workflow_archived', 'blocked'],
		['no_permission', 'entity-not-found'],
		['workflow_does_not_exist', 'entity-not-found'],
	] as const)('gives the reason of a workflow access error "%s" as %s', (reason, expected) => {
		expect(classifyMcpWorkflowAccessFailure(new WorkflowAccessError('No access', reason))).toBe(
			expected,
		);
	});

	it.each([
		['a forbidden error', new ForbiddenError('No access')],
		['an export block', new PackageExportBlockedError('Too large')],
		['a plain error', new Error('Something failed')],
	])('leaves %s to the package classifier', (_case, error) => {
		expect(classifyMcpWorkflowAccessFailure(error)).toBeUndefined();
	});
});
