import type { CallToolResult } from '@modelcontextprotocol/server';
import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import {
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	InstanceAiConfirmRequestDto,
	type InstanceAiPermissionMode,
	type InstanceAiPermissions,
} from '@n8n/api-types';
import { User } from '@n8n/db';
import { isRecord } from '@n8n/utils/is-record';
import fc from 'fast-check';
import { jsonParse } from 'n8n-workflow';
import z from 'zod';

import {
	type CapabilityAnswer,
	type CapabilityAssistantOptions,
	type CapabilityCallRunner,
	type CapabilityToolDefinition,
	defineCapability,
} from '../capability';
import { BLOCKED_MESSAGE, DEFAULT_CAPABILITY_ANSWER_SCHEMA } from '../capability-confirmation';

// A test-only capability. The card answer chooses whether the new workflow is also
// published, and so which admin permission applies.
const saveShape = {
	name: z.string().min(1),
	publish: z.boolean().optional(),
} satisfies z.ZodRawShape;

type SaveArgs = { name: string; publish?: boolean };
type SaveOptions = CapabilityAssistantOptions<typeof saveShape>;

const permissionOf = (args: SaveArgs) =>
	args.publish === true ? ('publishWorkflow' as const) : ('createWorkflow' as const);

const applyPublish = (args: SaveArgs, answer: CapabilityAnswer): SaveArgs => {
	const chosen = isRecord(answer.values) ? answer.values.publish : undefined;
	return { ...args, publish: typeof chosen === 'boolean' ? chosen : args.publish };
};

const publishCard = async () => ({
	message: 'Save "Invoices"?',
	severity: 'warning' as const,
	offered: { publish: [true, false] },
});

const withModes = (create: InstanceAiPermissionMode, publish: InstanceAiPermissionMode) => ({
	...DEFAULT_INSTANCE_AI_PERMISSIONS,
	createWorkflow: create,
	publishWorkflow: publish,
});

const SUSPENDED = { suspended: true };

describe('capability confirmation', () => {
	const user = Object.assign(new User(), { id: 'alice' });
	const handler = vi.fn<(args: SaveArgs) => CallToolResult>();
	// The bridge records the audit event in this runner, so a call that it never sees
	// sends no audit event.
	const auditedCall = vi.fn<CapabilityCallRunner>(async (_name, _args, invoke) => await invoke());
	const input = { name: 'Invoices' };

	const buildTool = (options: SaveOptions, permissions: InstanceAiPermissions): BuiltTool =>
		defineCapability({
			name: 'save_workflow',
			scope: 'workflow:write',
			assistant: options,
			build: (): CapabilityToolDefinition<typeof saveShape> => ({
				name: 'save_workflow',
				config: { description: 'Saves a workflow', inputSchema: saveShape },
				handler: async (args) => handler(args),
			}),
		}).toAssistantTool({ user, permissions, runCall: auditedCall }).tool;

	const call = async (tool: BuiltTool, ctx: InterruptibleToolContext) => {
		if (!tool.handler) throw new Error('The tool has no handler');
		return await tool.handler(input, ctx);
	};

	/**
	 * Makes the first call. When it shows a card, approves the card with `values` from the
	 * payload that the JSON checkpoint restores.
	 */
	const approveWith = async (
		values: Record<string, string | boolean>,
		permissions: InstanceAiPermissions,
		options: SaveOptions,
	) => {
		const suspend = vi.fn(async (_payload: unknown) => SUSPENDED as never);
		const first = await call(buildTool(options, permissions), { suspend, resumeData: undefined });
		if (first !== SUSPENDED) return { first, output: first };
		const suspendPayload = jsonParse<unknown>(JSON.stringify(suspend.mock.calls[0][0]));
		const output = await call(buildTool(options, permissions), {
			suspend: vi.fn(),
			resumeData: { approved: true, values },
			suspendPayload,
		});
		return { first, output };
	};

	beforeEach(() => {
		handler.mockReset();
		handler.mockReturnValue({ content: [], structuredContent: { saved: true } });
		auditedCall.mockClear();
	});

	describe('permission of the applied arguments', () => {
		const options = { confirm: publishCard, applyAnswer: applyPublish, permission: permissionOf };

		it('refuses an approved answer that maps to a blocked permission', async () => {
			const { first, output } = await approveWith(
				{ publish: true },
				withModes('always_allow', 'blocked'),
				options,
			);

			expect(first).toBe(SUSPENDED);
			expect(output).toEqual({ denied: true, message: BLOCKED_MESSAGE });
			expect(handler).not.toHaveBeenCalled();
			expect(auditedCall).not.toHaveBeenCalled();
		});

		it('runs an approved answer that maps to a permission that is not blocked', async () => {
			const { first, output } = await approveWith(
				{ publish: false },
				withModes('always_allow', 'blocked'),
				options,
			);

			expect(first).toBe(SUSPENDED);
			expect(output).toEqual({ saved: true });
			expect(handler).toHaveBeenCalledWith({ name: 'Invoices', publish: false });
			expect(auditedCall).toHaveBeenCalledTimes(1);
		});

		it('validates the applied arguments before it reads their permission', async () => {
			const permission = vi.fn(permissionOf);

			const result = approveWith({ publish: true }, withModes('always_allow', 'always_allow'), {
				confirm: publishCard,
				applyAnswer: (args) => ({ ...args, name: '' }),
				permission,
			});

			await expect(result).rejects.toThrow('Invalid input for save_workflow: name');
			expect(permission).not.toHaveBeenCalledWith(expect.objectContaining({ name: '' }));
			expect(handler).not.toHaveBeenCalled();
		});

		it('never runs the handler when the original or the applied permission is blocked', async () => {
			const mode = fc.constantFrom<InstanceAiPermissionMode>(
				'always_allow',
				'require_approval',
				'blocked',
			);

			await fc.assert(
				fc.asyncProperty(mode, mode, fc.boolean(), async (create, publish, chosen) => {
					handler.mockClear();
					const permissions = withModes(create, publish);
					const blocked = create === 'blocked' || (chosen ? publish : create) === 'blocked';

					const { output } = await approveWith({ publish: chosen }, permissions, options);

					expect(handler).toHaveBeenCalledTimes(blocked ? 0 : 1);
					expect(output).toEqual(
						blocked ? { denied: true, message: BLOCKED_MESSAGE } : { saved: true },
					);
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe('default answer schema', () => {
		/** The `capabilityDecision` kind of the wire DTO, without its kind. */
		const acceptsOnTheWire = (answer: object) =>
			InstanceAiConfirmRequestDto.safeParse({ kind: 'capabilityDecision', ...answer }).success;

		it.each([
			['a key of 128 characters', { ['k'.repeat(128)]: true }, true],
			['a key of 129 characters', { ['k'.repeat(129)]: true }, false],
			['a value of 2048 characters', { target: 'v'.repeat(2048) }, true],
			['a value of 2049 characters', { target: 'v'.repeat(2049) }, false],
			['a number', { target: 3 }, false],
		])('accepts %s only when the confirm DTO accepts it', (_label, values, accepted) => {
			const answer = { approved: true, values };

			expect(DEFAULT_CAPABILITY_ANSWER_SCHEMA.safeParse(answer).success).toBe(accepted);
			expect(acceptsOnTheWire(answer)).toBe(accepted);
		});
	});
});
