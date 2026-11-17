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

	describe('isCollectionsEnabled', () => {
		it.each([
			{ collectionsFlag: true, isKnowledgeActive: true, collectionsEnabled: true },
			{ collectionsFlag: true, isKnowledgeActive: false, collectionsEnabled: false },
			{ collectionsFlag: false, isKnowledgeActive: true, collectionsEnabled: false },
			{ collectionsFlag: 'variant', isKnowledgeActive: true, collectionsEnabled: false },
		])(
			'is $collectionsEnabled with the flag $collectionsFlag and the module active $isKnowledgeActive',
			async ({ collectionsFlag, isKnowledgeActive, collectionsEnabled }) => {
				const availability = makeKnowledgeAvailabilityService({
					isKnowledgeActive,
					collectionsFlag,
				});

				expect(await availability.isCollectionsEnabled()).toBe(collectionsEnabled);
			},
		);

		it.each([
			{ isKnowledgeActive: true, collectionsEnabled: true },
			{ isKnowledgeActive: false, collectionsEnabled: false },
		])(
			'is $collectionsEnabled with the override on, the flag off and the module active $isKnowledgeActive',
			async ({ isKnowledgeActive, collectionsEnabled }) => {
				const availability = makeKnowledgeAvailabilityService({
					isKnowledgeActive,
					collectionsFlag: false,
					collectionsOverride: true,
				});

				expect(await availability.isCollectionsEnabled()).toBe(collectionsEnabled);
			},
		);

		it('does not need the sandbox', async () => {
			const availability = makeKnowledgeAvailabilityService({ isSandboxEnabled: false });

			expect(await availability.isCollectionsEnabled()).toBe(true);
		});
	});

	it('asserts the module alone, so file cleanup still runs on a sandbox-off instance', () => {
		expect(() =>
			makeKnowledgeAvailabilityService({ isSandboxEnabled: false }).assertModuleActive(),
		).not.toThrow();
		expect(() =>
			makeKnowledgeAvailabilityService({ isKnowledgeActive: false }).assertModuleActive(),
		).toThrow(NotFoundError);
	});
});
