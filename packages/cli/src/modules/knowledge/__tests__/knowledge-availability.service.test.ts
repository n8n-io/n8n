import { NotFoundError } from '@n8n/errors';

import { makeKnowledgeAvailabilityService } from './test-utils/knowledge-availability.service';

describe('KnowledgeAvailabilityService', () => {
	it.each([
		{ isKnowledgeActive: true, isSandboxEnabled: true, fileKnowledgeEnabled: true },
		{ isKnowledgeActive: true, isSandboxEnabled: false, fileKnowledgeEnabled: false },
		{ isKnowledgeActive: false, isSandboxEnabled: true, fileKnowledgeEnabled: false },
		{ isKnowledgeActive: false, isSandboxEnabled: false, fileKnowledgeEnabled: false },
	])(
		'enables file knowledge only when the module ($isKnowledgeActive) and the sandbox ($isSandboxEnabled) are both on',
		({ isKnowledgeActive, isSandboxEnabled, fileKnowledgeEnabled }) => {
			const availability = makeKnowledgeAvailabilityService({
				isKnowledgeActive,
				isSandboxEnabled,
			});

			expect(availability.isModuleActive()).toBe(isKnowledgeActive);
			expect(availability.isFileKnowledgeEnabled()).toBe(fileKnowledgeEnabled);
		},
	);

	it('asserts the module alone, so file cleanup still runs on a sandbox-off instance', () => {
		expect(() =>
			makeKnowledgeAvailabilityService({ isSandboxEnabled: false }).assertModuleActive(),
		).not.toThrow();
		expect(() =>
			makeKnowledgeAvailabilityService({ isKnowledgeActive: false }).assertModuleActive(),
		).toThrow(NotFoundError);
	});
});
