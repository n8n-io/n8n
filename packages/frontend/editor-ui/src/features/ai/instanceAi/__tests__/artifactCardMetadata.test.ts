import { afterEach, describe, expect, it } from 'vitest';
import { i18nInstance } from '@n8n/i18n';
import { formatArtifactMetadata } from '@/features/ai/instanceAi/artifactCardMetadata';

describe('formatArtifactMetadata', () => {
	const originalLocale = i18nInstance.global.locale.value;

	afterEach(() => {
		i18nInstance.global.locale.value = originalLocale;
	});

	it('writes the created date in the format of the active locale', () => {
		i18nInstance.global.locale.value = 'es';

		expect(formatArtifactMetadata('2026-11-24T12:00:00.000Z')).toContain('24 de noviembre');
	});
});
