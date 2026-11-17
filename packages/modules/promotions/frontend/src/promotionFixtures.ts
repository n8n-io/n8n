import type { PromotionDirection } from '@n8n/api-types';

/**
 * Development only: `?fixture=<name>` on a preview page replaces the server with the fixtures
 * of the proof of concept. The condition is constant at build time, so a production build
 * holds neither the fixtures nor the import.
 */
const importFixtures = import.meta.env.DEV
	? async () => await import('./__fixtures__/dependencyReport.fixtures')
	: undefined;

/** The fixture that the URL asks for. Always `undefined` in a production build. */
export function promotionFixtureName(query: unknown): string | undefined {
	return importFixtures && typeof query === 'string' && query !== '' ? query : undefined;
}

/** `projectId` is the project of the page. It stands in for the main project of the fixture. */
export async function loadPromotionFixture(
	name: string,
	direction: PromotionDirection,
	projectId?: string,
) {
	if (!importFixtures) throw new Error('Promotion fixtures are not part of this build');
	const { createPromotionFixture } = await importFixtures();
	return createPromotionFixture(name, direction, projectId);
}
