import { ConflictError, NotFoundError, ServiceUnavailableError } from '@n8n/errors';

import { McpServerNotFoundError } from '../errors/mcp-server-not-found.error';
import { McpServerToolDraftUnavailableError } from '../errors/mcp-server-tool-draft-unavailable.error';
import { McpServerToolNameTakenError } from '../errors/mcp-server-tool-name-taken.error';
import { McpServerToolNotFoundError } from '../errors/mcp-server-tool-not-found.error';
import { McpServerUrlTakenError } from '../errors/mcp-server-url-taken.error';
import { McpServerWorkflowToolTakenError } from '../errors/mcp-server-workflow-tool-taken.error';

// The REST routes return these statuses and messages. The integration tests check only the status.
describe('named errors of the MCP servers module', () => {
	it.each([
		{
			error: new McpServerNotFoundError(),
			base: NotFoundError,
			status: 404,
			message: 'MCP server not found',
		},
		{
			error: new McpServerToolNotFoundError(),
			base: NotFoundError,
			status: 404,
			message: 'Tool not found',
		},
		{
			error: new McpServerUrlTakenError(),
			base: ConflictError,
			status: 409,
			message: 'Another MCP server uses this URL. Choose another URL.',
		},
		{
			error: new McpServerToolNameTakenError(),
			base: ConflictError,
			status: 409,
			message: 'The server already has a tool with this name.',
		},
		{
			error: new McpServerWorkflowToolTakenError('workflow-1'),
			base: ConflictError,
			status: 409,
			message: 'The server already has the workflow "workflow-1" as a tool.',
		},
		{
			error: new McpServerToolDraftUnavailableError(),
			base: ServiceUnavailableError,
			status: 503,
			message: 'The n8n Assistant could not write a draft. Try again.',
		},
	])(
		'$error.constructor.name is a $status with its message',
		({ error, base, status, message }) => {
			expect(error).toBeInstanceOf(base);
			expect(error.httpStatusCode).toBe(status);
			expect(error.message).toBe(message);
		},
	);

	it('keeps the workflow ID on McpServerWorkflowToolTakenError', () => {
		expect(new McpServerWorkflowToolTakenError('workflow-1').workflowId).toBe('workflow-1');
	});
});
