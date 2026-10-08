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
import {
	classifyMcpWorkflowAccessFailure,
	packageToolError,
	reasonForClient,
} from '../package-tool-error';

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
			isError: true,
		});
	});

	it('gives only the message when the error has no description', () => {
		const result = packageToolError(new UserError('Workflow not found'));

		expect(result?.content).toEqual([{ type: 'text', text: 'Workflow not found' }]);
		expect(result?.isError).toBe(true);
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

		expect(result).toEqual({
			content: [
				{ type: 'text', text: `Import blocked: 1 issue(s). Issues: ${JSON.stringify([issue])}` },
			],
			isError: true,
		});
	});

	it('gives no issues when the metadata of the error has none', () => {
		const result = packageToolError(
			new ConflictError('Conflict', undefined, { issues: 'not a list' }),
		);

		expect(result).toEqual({ content: [{ type: 'text', text: 'Conflict' }], isError: true });
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

describe('reasonForClient', () => {
	it.each([
		['a user error', new UserError('The project is archived')],
		['a client response error', new ForbiddenError('You cannot import into this project')],
		[
			'a workflow access error',
			new WorkflowAccessError('Workflow is archived', 'workflow_archived'),
		],
	])('gives the message of %s', (_case, error) => {
		expect(reasonForClient(error)).toBe(error.message);
	});

	it('leaves out the final full stop of the message, so that a sentence can hold it', () => {
		expect(reasonForClient(new UserError('You cannot update the workflow.'))).toBe(
			'You cannot update the workflow',
		);
		expect(reasonForClient(new UserError('Version 1.2 is too old'))).toBe('Version 1.2 is too old');
	});

	it.each([
		['a server error', new InternalServerError('SQLITE_BUSY: database table "workflow_entity"')],
		['an unexpected error', new UnexpectedError('Bug in step 3')],
		['an operational error', new OperationalError('Timeout of pool "db"')],
		['a plain error', new Error('relation "credentials_entity" does not exist')],
		['a thrown string', 'failed'],
	])('gives a general reason instead of the message of %s', (_case, error) => {
		expect(reasonForClient(error)).toBe(
			'an internal error occurred. The server log has the details',
		);
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
