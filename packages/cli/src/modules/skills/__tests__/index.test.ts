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
			'SkillNameTakenError',
			'SkillRuntimeService',
			'SkillService',
			'SkillUsage',
			'SkillUsageProxy',
			'SkillsGate',
			'findIntroducedNameClashes',
			'findNameClashGroups',
			'getSkillHash',
			'renameIntroducesClash',
			'skillNameTakenToolMessage',
			'toSkillToolRefusal',
			'withTrimmedName',
		]);
		// The import loads every skills service, which takes seconds under a full test run.
	}, 30_000);
});
