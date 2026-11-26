import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

describe('public API', () => {
	it('exports the services, gates, contract and helpers, and does not register the module', async () => {
		const moduleMetadata = Container.get(ModuleMetadata);

		expect(moduleMetadata.get('skills')).toBeUndefined();

		const publicApi = await import('../index.js');

		expect(moduleMetadata.get('skills')).toBeUndefined();
		expect(Object.keys(publicApi).sort()).toEqual([
			'AssistantSkillsFlagGate',
			'SkillAccessService',
			'SkillAgentNameTakenError',
			'SkillNameTakenError',
			'SkillRuntimeService',
			'SkillService',
			'SkillSourceCredentials',
			'SkillSourceCredentialsProxy',
			'SkillSourceService',
			'SkillSyncFlagGate',
			'SkillUsage',
			'SkillUsageProxy',
			'SkillsGate',
			'WorkflowsInSkillsFlagGate',
			'findIntroducedNameClashes',
			'findNameClashGroups',
			'getSkillHash',
			'isSameSkillTarget',
			'renameIntroducesClash',
			'skillContentHashOf',
			'skillNameTakenToolMessage',
			'skillScopeOf',
			'skillSourceReasonOf',
			'toSkillToolRefusal',
			'withTrimmedName',
			'withUnsentSkillFiles',
		]);
		// The import loads every skills service, which takes seconds under a full test run.
	}, 30_000);
});
