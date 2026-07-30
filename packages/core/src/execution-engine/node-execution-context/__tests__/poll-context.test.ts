import type {
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	IDataObject,
	INode,
	INodeType,
	INodeTypes,
	IPollFunctions,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	WorkflowExpression,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { PollContext } from '../poll-context';

describe('PollContext', () => {
	const testCredentialType = 'testCredential';
	const nodeType = mock<INodeType>({
		description: {
			credentials: [
				{
					name: testCredentialType,
					required: true,
				},
			],
			properties: [
				{
					name: 'testParameter',
					required: true,
				},
			],
		},
	});
	const nodeTypes = mock<INodeTypes>();
	const expression = mock<WorkflowExpression>();
	const workflow = mock<Workflow>({ expression, nodeTypes });
	const node = mock<INode>({
		credentials: {
			[testCredentialType]: {
				id: 'testCredentialId',
			},
		},
	});
	node.parameters = {
		testParameter: 'testValue',
	};
	const credentialsHelper = mock<ICredentialsHelper>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ credentialsHelper });
	const mode: WorkflowExecuteMode = 'manual';
	const activation: WorkflowActivateMode = 'init';

	const pollContext = new PollContext(workflow, node, additionalData, mode, activation);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getActivationMode', () => {
		it('should return the activation property', () => {
			const result = pollContext.getActivationMode();
			expect(result).toBe(activation);
		});
	});

	describe('getCredentials', () => {
		it('should get decrypted credentials', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });
			credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);

			const credentials =
				await pollContext.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentials).toEqual({ secret: 'token' });
		});
	});

	describe('getNodeParameter', () => {
		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			expression.getParameterValue.mockImplementation((value) => value);
		});

		it('should return parameter value when it exists', () => {
			const parameter = pollContext.getNodeParameter('testParameter');

			expect(parameter).toBe('testValue');
		});

		it('should return the fallback value when the parameter does not exist', () => {
			const parameter = pollContext.getNodeParameter('otherParameter', 'fallback');

			expect(parameter).toBe('fallback');
		});
	});

	describe('getExecutionContext', () => {
		it('should return undefined', () => {
			expect(pollContext.getExecutionContext()).toBeUndefined();
		});
	});

	describe('default cursor accessors', () => {
		const buildContext = (nodeStaticData: IDataObject) => {
			const cursorWorkflow = mock<Workflow>({ expression, nodeTypes });
			cursorWorkflow.getStaticData.mockReturnValue(nodeStaticData);
			return new PollContext(cursorWorkflow, node, additionalData, mode, activation);
		};

		it('should resolve getCursor to null when the node has never polled', async () => {
			const context = buildContext({});

			await expect(context.getCursor()).resolves.toBeNull();
		});

		it('should read back through the static data what setCursor staged', async () => {
			const nodeStaticData: IDataObject = {};
			const context = buildContext(nodeStaticData);

			context.setCursor({ lastItemId: 'a' });

			await expect(context.getCursor()).resolves.toEqual({ lastItemId: 'a' });
			expect(nodeStaticData).toEqual({ lastItemId: 'a' });
		});

		it('should return the existing static-data blob as the cursor', async () => {
			const context = buildContext({ lastTimeChecked: '2026-07-28T10:00:00.000Z' });

			await expect(context.getCursor()).resolves.toEqual({
				lastTimeChecked: '2026-07-28T10:00:00.000Z',
			});
		});

		it('should merge a staged cursor onto the keys already in the static data', async () => {
			const nodeStaticData: IDataObject = { lastTimeChecked: '2026-07-28T10:00:00.000Z' };
			const context = buildContext(nodeStaticData);

			context.setCursor({ lastItemId: 'a' });

			await expect(context.getCursor()).resolves.toEqual({
				lastTimeChecked: '2026-07-28T10:00:00.000Z',
				lastItemId: 'a',
			});
		});

		it('should still resolve getCursor to null after staging a cursor with no keys', async () => {
			const context = buildContext({});

			context.setCursor({});

			await expect(context.getCursor()).resolves.toBeNull();
		});

		it('should leave the static data untouched when __commitCursor is called', async () => {
			const nodeStaticData: IDataObject = { lastItemId: 'a' };
			const context = buildContext(nodeStaticData);

			await expect(context.__commitCursor()).resolves.toBeUndefined();

			expect(nodeStaticData).toEqual({ lastItemId: 'a' });
		});
	});

	describe('injected cursor accessors', () => {
		const buildContext = (
			nodeStaticData: IDataObject,
			overrides: {
				getCursor: IPollFunctions['getCursor'];
				setCursor: IPollFunctions['setCursor'];
				commitCursor: IPollFunctions['__commitCursor'];
			},
		) => {
			const cursorWorkflow = mock<Workflow>({ expression, nodeTypes });
			cursorWorkflow.getStaticData.mockReturnValue(nodeStaticData);
			return new PollContext(
				cursorWorkflow,
				node,
				additionalData,
				mode,
				activation,
				undefined,
				undefined,
				overrides.getCursor,
				overrides.setCursor,
				overrides.commitCursor,
			);
		};

		it('should read the cursor from the injected getCursor instead of the static data', async () => {
			const context = buildContext(
				{ lastItemId: 'from-static-data' },
				{
					getCursor: vi.fn().mockResolvedValue({ lastItemId: 'from-injected' }),
					setCursor: vi.fn(),
					commitCursor: vi.fn().mockResolvedValue(undefined),
				},
			);

			await expect(context.getCursor()).resolves.toEqual({ lastItemId: 'from-injected' });
		});

		it('should hand a staged cursor to the injected setCursor and not to the static data', () => {
			const nodeStaticData: IDataObject = {};
			const setCursor = vi.fn();
			const context = buildContext(nodeStaticData, {
				getCursor: vi.fn().mockResolvedValue(null),
				setCursor,
				commitCursor: vi.fn().mockResolvedValue(undefined),
			});

			context.setCursor({ lastItemId: 'a' });

			expect(setCursor).toHaveBeenCalledWith({ lastItemId: 'a' });
			expect(nodeStaticData).toEqual({});
		});

		it('should delegate __commitCursor to the injected implementation', async () => {
			const commitCursor = vi.fn().mockResolvedValue(undefined);
			const context = buildContext(
				{},
				{
					getCursor: vi.fn().mockResolvedValue(null),
					setCursor: vi.fn(),
					commitCursor,
				},
			);

			await context.__commitCursor();

			expect(commitCursor).toHaveBeenCalledTimes(1);
		});
	});
});
