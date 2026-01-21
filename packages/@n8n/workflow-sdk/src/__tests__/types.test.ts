import type {
	WorkflowBuilder,
	NodeInstance,
	TriggerInstance,
	MergeComposite,
	Expression,
	ExpressionContext,
	WorkflowSettings,
	CredentialReference,
	NodeConfig,
	StickyNoteConfig,
	SplitInBatchesBuilder,
} from '../types/base';

describe('Base Types', () => {
	describe('WorkflowSettings', () => {
		it('should support all workflow settings properties', () => {
			const settings: WorkflowSettings = {
				timezone: 'America/New_York',
				errorWorkflow: 'error-handler-123',
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'none',
				saveManualExecutions: true,
				saveExecutionProgress: false,
				executionTimeout: 3600,
				executionOrder: 'v1',
				callerPolicy: 'workflowsFromSameOwner',
				callerIds: 'workflow1,workflow2',
			};
			expect(settings.timezone).toBe('America/New_York');
			expect(settings.executionOrder).toBe('v1');
		});
	});

	describe('CredentialReference', () => {
		it('should have name and id properties', () => {
			const cred: CredentialReference = {
				name: 'My API Key',
				id: 'cred-123',
			};
			expect(cred.name).toBe('My API Key');
			expect(cred.id).toBe('cred-123');
		});
	});

	describe('NodeConfig', () => {
		it('should support all node configuration properties', () => {
			const config: NodeConfig = {
				parameters: { url: 'https://example.com' },
				credentials: { httpBasicAuth: { name: 'My Creds', id: '123' } },
				name: 'HTTP Request',
				position: [100, 200],
				disabled: false,
				notes: 'Fetches data from API',
				notesInFlow: true,
				executeOnce: false,
				retryOnFail: true,
				alwaysOutputData: true,
				onError: 'continueErrorOutput',
			};
			expect(config.parameters).toBeDefined();
			expect(config.onError).toBe('continueErrorOutput');
		});
	});

	describe('StickyNoteConfig', () => {
		it('should support sticky note configuration', () => {
			const config: StickyNoteConfig = {
				color: 4,
				position: [80, -176],
				width: 300,
				height: 200,
				name: 'My Note',
			};
			expect(config.color).toBe(4);
			expect(config.position).toEqual([80, -176]);
		});
	});

	describe('Expression', () => {
		it('should be a function that takes ExpressionContext and returns typed value', () => {
			const expr: Expression<string> = ($) => $.json.name;
			// Type checking: expression is callable with ExpressionContext
			expect(typeof expr).toBe('function');
		});
	});
});
