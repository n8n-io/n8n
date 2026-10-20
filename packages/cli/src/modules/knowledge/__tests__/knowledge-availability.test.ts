import { NotFoundError } from '@n8n/errors';

import { makeKnowledgeAvailability } from './test-utils/knowledge-availability';

describe('KnowledgeAvailability', () => {
	it.each([
		{ knowledgeActive: true, sandboxEnabled: true, fileKnowledgeEnabled: true },
		{ knowledgeActive: true, sandboxEnabled: false, fileKnowledgeEnabled: false },
		{ knowledgeActive: false, sandboxEnabled: true, fileKnowledgeEnabled: false },
		{ knowledgeActive: false, sandboxEnabled: false, fileKnowledgeEnabled: false },
	])(
		'enables file knowledge only when the module ($knowledgeActive) and the sandbox ($sandboxEnabled) are both on',
		({ knowledgeActive, sandboxEnabled, fileKnowledgeEnabled }) => {
			const availability = makeKnowledgeAvailability({ knowledgeActive, sandboxEnabled });

			expect(availability.isModuleActive()).toBe(knowledgeActive);
			expect(availability.isFileKnowledgeEnabled()).toBe(fileKnowledgeEnabled);
		},
	);

	it('asserts the module alone, so file cleanup still runs on a sandbox-off instance', () => {
		expect(() =>
			makeKnowledgeAvailability({ sandboxEnabled: false }).assertModuleActive(),
		).not.toThrow();
		expect(() =>
			makeKnowledgeAvailability({ knowledgeActive: false }).assertModuleActive(),
		).toThrow(NotFoundError);
	});
});
