import { NotFoundError } from '@n8n/errors';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { RuleRegistry } from '../../breaking-changes.rule-registry.service';
import type { MigrationFindingRepository } from '../../database/repositories/migration-finding.repository';
import type { IBreakingChangeRule } from '../../types';
import { MigrationFindingTriageService } from '../migration-finding-triage.service';

describe('MigrationFindingTriageService', () => {
	let ruleRegistry: MockProxy<RuleRegistry>;
	let findingRepository: MockProxy<MigrationFindingRepository>;
	let service: MigrationFindingTriageService;

	// Plain objects, not proxies: the service tells rule kinds apart by their methods.
	function registerRule(ruleId: string, version: 'v2' | 'v3', kind: 'workflow' | 'instance') {
		const getMetadata = () => ({ version }) as ReturnType<IBreakingChangeRule['getMetadata']>;
		const rule =
			kind === 'workflow'
				? { id: ruleId, getMetadata, detectWorkflow: vi.fn() }
				: { id: ruleId, getMetadata, detect: vi.fn() };
		ruleRegistry.getRule.calledWith(ruleId).mockReturnValue(rule as unknown as IBreakingChangeRule);
	}

	beforeEach(() => {
		ruleRegistry = mock<RuleRegistry>();
		findingRepository = mock<MigrationFindingRepository>();
		service = new MigrationFindingTriageService(ruleRegistry, findingRepository);
	});

	it("sets the status for the rule's version", async () => {
		registerRule('removed-nodes-v3', 'v3', 'workflow');
		findingRepository.setTriageStatus.mockResolvedValue(true);

		await expect(
			service.setStatus('removed-nodes-v3', 'wf-1', 'wont_fix'),
		).resolves.toBeUndefined();

		expect(findingRepository.setTriageStatus).toHaveBeenCalledWith(
			'v3',
			'removed-nodes-v3',
			'wf-1',
			'wont_fix',
			expect.anything(),
		);
	});

	it('rejects an unknown rule with not-found before writing', async () => {
		ruleRegistry.getRule.mockReturnValue(undefined);

		await expect(service.setStatus('unknown', 'wf-1', 'wont_fix')).rejects.toBeInstanceOf(
			NotFoundError,
		);
		expect(findingRepository.setTriageStatus).not.toHaveBeenCalled();
	});

	it('rejects an instance rule with not-found before writing', async () => {
		registerRule('docker-only-deployment-v3', 'v3', 'instance');

		await expect(
			service.setStatus('docker-only-deployment-v3', 'wf-1', 'open'),
		).rejects.toBeInstanceOf(NotFoundError);
		expect(findingRepository.setTriageStatus).not.toHaveBeenCalled();
	});

	it('rejects with not-found when no finding can take the status', async () => {
		registerRule('removed-nodes-v2', 'v2', 'workflow');
		findingRepository.setTriageStatus.mockResolvedValue(false);

		await expect(service.setStatus('removed-nodes-v2', 'wf-1', 'open')).rejects.toBeInstanceOf(
			NotFoundError,
		);
		expect(findingRepository.setTriageStatus).toHaveBeenCalledWith(
			'v2',
			'removed-nodes-v2',
			'wf-1',
			'open',
			expect.anything(),
		);
	});
});
