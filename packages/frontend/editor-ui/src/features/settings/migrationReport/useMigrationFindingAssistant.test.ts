import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { computed, defineComponent } from 'vue';

import { rowAssistantAction, useMigrationFindingAssistant } from './useMigrationFindingAssistant';

const mocks = vi.hoisted(() => ({ start: vi.fn(), track: vi.fn() }));

vi.mock('@/features/ai/instanceAi/composables/useMigrationReportAssistantHandoff', () => ({
	useMigrationReportAssistantHandoff: () => ({
		available: computed(() => true),
		start: mocks.start,
	}),
}));
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.track }),
}));

const rule = {
	ruleId: 'function-removed-v3',
	ruleTitle: 'Function node removed',
	ruleImpact: 'executionsFail' as const,
};
const workflow = {
	id: 'workflow-1',
	name: 'Invoice sync',
	active: true,
	numberOfExecutions: 3,
	lastUpdatedAt: new Date('2026-10-01'),
	issues: [],
	homeProjectId: 'project-1',
};

function createAssistant() {
	let assistant: ReturnType<typeof useMigrationFindingAssistant> | undefined;
	createComponentRenderer(
		defineComponent({
			setup() {
				assistant = useMigrationFindingAssistant();
				return () => null;
			},
		}),
	)();
	if (!assistant) throw new Error('The assistant was not initialized.');
	return assistant;
}

describe('rowAssistantAction', () => {
	it('offers the action the rule declares when it has no automated migration', () => {
		expect(rowAssistantAction({ migratable: false, assistantAction: 'fix' })).toBe('fix');
		expect(rowAssistantAction({ migratable: false, assistantAction: 'review' })).toBe('review');
	});

	it('offers nothing on the row for a rule with an automated migration', () => {
		expect(rowAssistantAction({ migratable: true, assistantAction: 'fix' })).toBeUndefined();
	});

	it('offers nothing for a rule whose fix lives outside the workflow', () => {
		expect(rowAssistantAction({ migratable: false, assistantAction: 'none' })).toBeUndefined();
	});
});

describe('useMigrationFindingAssistant', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('opens the finding and tracks the click from the row with the hand-off result', async () => {
		mocks.start.mockResolvedValue('started');

		await createAssistant().open({ rule, workflow });

		expect(mocks.start).toHaveBeenCalledWith({
			ruleId: 'function-removed-v3',
			ruleTitle: 'Function node removed',
			workflow: { id: 'workflow-1', name: 'Invoice sync', homeProjectId: 'project-1' },
			automatedMigration: undefined,
		});
		expect(mocks.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.MIGRATION_REPORT.USER_OPENED_MIGRATION_FINDING_IN_ASSISTANT,
			{
				rule_id: 'function-removed-v3',
				workflow_id: 'workflow-1',
				impact: 'executionsFail',
				entry_point: 'finding_row',
				outcome: 'started',
			},
		);
	});

	it('tracks a click after an automated migration with what it left', async () => {
		mocks.start.mockResolvedValue('setup');

		await createAssistant().open({
			rule,
			workflow,
			automatedMigration: { outcome: 'refused', message: 'Refused.' },
		});

		expect(mocks.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.MIGRATION_REPORT.USER_OPENED_MIGRATION_FINDING_IN_ASSISTANT,
			expect.objectContaining({
				entry_point: 'automated_migration_result',
				automated_migration: 'refused',
				outcome: 'setup',
			}),
		);
	});
});
