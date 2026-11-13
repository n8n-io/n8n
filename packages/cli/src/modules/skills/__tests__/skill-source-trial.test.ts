import type { TransactionRunner, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { SkillSourceRepository } from '../database/repositories/skill-source.repository';
import type { SkillRepository } from '../database/repositories/skill.repository';
import type { SkillAccessService } from '../services/skill-access.service';
import { SkillSecurityScanner } from '../services/skill-security-scanner.service';
import type { SkillSourceCredentialsProxy } from '../services/skill-source-credentials-proxy.service';
import { SkillSourceService } from '../services/skill-source.service';
import type { SkillSyncFlagGate } from '../services/skill-sync-flag-gate';
import type { SkillService } from '../services/skill.service';
import type { SkillsTelemetry } from '../services/skills-telemetry.service';
import { SkillSourceClientRegistry } from '../sources/skill-source-client-registry.service';
import type { SkillContent } from '../utils/skill-content-hash';
import { InMemoryPagesStore } from './test-utils/in-memory-pages-store';
import { InMemorySkillSourceClient } from './test-utils/in-memory-skill-source-client';

const content: SkillContent = {
	name: 'writing',
	description: 'Write clear messages.',
	instructions: 'Use short sentences.',
	frontmatter: null,
	files: [],
};

function setup(skills: SkillContent[] = [content]) {
	const store = new InMemoryPagesStore();
	const url = store.publishDatabase(skills);
	const clients = new SkillSourceClientRegistry();
	clients.register(new InMemorySkillSourceClient(store));
	const flag = mock<SkillSyncFlagGate>();
	const skillService = mock<SkillService>();
	const sourceRepository = mock<SkillSourceRepository>();
	const transactions = mock<TransactionRunner>();
	const service = new SkillSourceService(
		flag,
		mock<SkillAccessService>(),
		skillService,
		mock<SkillRepository>(),
		sourceRepository,
		clients,
		transactions,
		mock<SkillsTelemetry>(),
		new SkillSecurityScanner(),
		mock<SkillSourceCredentialsProxy>(),
	);
	return { service, url, flag, skillService, sourceRepository, transactions };
}

describe('Reading a public skill for a trial', () => {
	const user = mock<User>({ id: 'user-1' });
	it('returns checked content without creating a skill or source', async () => {
		const { service, url, skillService, sourceRepository, transactions } = setup();
		await expect(service.readPublicSkill(user, url, 'writing')).resolves.toMatchObject({
			skill: { name: 'writing', instructions: content.instructions },
			contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
			check: { verdict: 'pass' },
		});
		expect(skillService.createTrusted).not.toHaveBeenCalled();
		expect(sourceRepository.findSameSources).not.toHaveBeenCalled();
		expect(transactions.run).not.toHaveBeenCalled();
	});
	it.each([[content, content], [{ ...content, name: 'different' }]])(
		'requires one exact name match',
		async (...skills) => {
			const { service, url } = setup(skills);
			await expect(service.readPublicSkill(user, url, 'writing')).rejects.toThrow(
				'Could not match',
			);
		},
	);
	it('refuses invalid content before it reaches an agent', async () => {
		const { service, url } = setup([{ ...content, instructions: '' }]);
		await expect(service.readPublicSkill(user, url, 'writing')).rejects.toThrow('did not pass');
	});
	it('requires the skill sync feature', async () => {
		const { service, url, flag } = setup();
		flag.assertEnabled.mockRejectedValue(new Error('Feature disabled'));
		await expect(service.readPublicSkill(user, url, 'writing')).rejects.toThrow('Feature disabled');
	});
});
