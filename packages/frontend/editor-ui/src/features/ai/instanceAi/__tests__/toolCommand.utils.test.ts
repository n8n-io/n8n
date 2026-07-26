import { describe, expect, it } from 'vitest';
import { extractExecuteCommandArgs, extractExecuteCommandResult } from '../toolCommand.utils';

describe('extractExecuteCommandArgs', () => {
	it('extracts command and cwd', () => {
		expect(
			extractExecuteCommandArgs('workspace_execute_command', {
				command: 'ls -la',
				cwd: '/home/daytona/workspace',
			}),
		).toEqual({
			command: 'ls -la',
			cwd: '/home/daytona/workspace',
		});
	});

	it('returns undefined while command is still streaming', () => {
		expect(
			extractExecuteCommandArgs('workspace_execute_command', {
				cwd: '/tmp',
			}),
		).toBeUndefined();
	});
});

describe('extractExecuteCommandResult', () => {
	it('extracts stdout/stderr streams', () => {
		expect(
			extractExecuteCommandResult('workspace_execute_command', {
				success: true,
				exitCode: 0,
				stdout: 'hello\nworld',
				stderr: '',
				executionTimeMs: 12,
			}),
		).toEqual({
			success: true,
			exitCode: 0,
			stdout: 'hello\nworld',
			stderr: '',
			executionTimeMs: 12,
		});
	});

	it('returns undefined for unrelated tools', () => {
		expect(
			extractExecuteCommandResult('workspace_read_file', {
				stdout: 'x',
				stderr: '',
			}),
		).toBeUndefined();
	});
});
