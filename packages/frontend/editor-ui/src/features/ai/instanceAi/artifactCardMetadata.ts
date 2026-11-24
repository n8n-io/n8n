import { i18n } from '@n8n/i18n';

function formatRelativeTime(isoTime: string): string {
	const diffMs = Date.now() - new Date(isoTime).getTime();
	const diffMin = Math.floor(diffMs / 60_000);
	if (diffMin < 1) {
		return i18n.baseText('instanceAi.artifactCard.updatedJustNow');
	}
	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 1) {
		const key =
			diffMin === 1 ? 'instanceAi.artifactCard.minute' : 'instanceAi.artifactCard.minutes';
		const time = i18n.baseText(key, {
			interpolate: { count: `${diffMin}` },
		});
		return i18n.baseText('instanceAi.artifactCard.updatedAgo', { interpolate: { time } });
	}
	const key = diffHours === 1 ? 'instanceAi.artifactCard.hour' : 'instanceAi.artifactCard.hours';
	const time = i18n.baseText(key, {
		interpolate: { count: `${diffHours}` },
	});
	return i18n.baseText('instanceAi.artifactCard.updatedAgo', { interpolate: { time } });
}

function formatCreatedDate(isoTime: string): string {
	const date = new Date(isoTime).toLocaleDateString(i18n.locale, {
		day: 'numeric',
		month: 'long',
	});
	return i18n.baseText('instanceAi.artifactCard.createdAt', { interpolate: { date } });
}

/** The metadata line of an artifact card, from the time of the tool call that produced it. */
export function formatArtifactMetadata(completedAt: string | undefined): string {
	const parts: string[] = [];

	if (completedAt) {
		parts.push(formatRelativeTime(completedAt));
		parts.push(formatCreatedDate(completedAt));
	} else {
		parts.push(i18n.baseText('instanceAi.artifactCard.updatedJustNow'));
	}

	return parts.join(' │ ');
}
