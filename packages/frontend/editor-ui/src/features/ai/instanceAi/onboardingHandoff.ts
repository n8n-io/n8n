import { validate as isUuid, version } from 'uuid';

export function parseOnboardingHandoff(hash: string | undefined) {
	const match = /^#onboarding(Build|Draft)=([\w-]+)$/.exec(hash ?? '');
	if (!match || !isUuid(match[2]) || version(match[2]) !== 4) return;
	return { id: match[2], isDraft: match[1] === 'Draft' };
}
