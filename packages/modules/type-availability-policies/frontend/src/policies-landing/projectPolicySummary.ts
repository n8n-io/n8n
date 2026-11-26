import type { ProjectPolicyRuleCounts, ProjectPolicySummary } from '@n8n/api-types';
import { i18n } from '@n8n/i18n';

function typeList(
	project: ProjectPolicySummary,
	field: keyof ProjectPolicyRuleCounts,
): string | undefined {
	const parts = (['node', 'credential'] as const)
		.filter((kind) => project[kind][field] > 0)
		.map((kind) =>
			i18n.baseText(`typeAvailabilityPolicies.landing.projects.summary.${kind}Count`, {
				adjustToNumber: project[kind][field],
				interpolate: { count: project[kind][field] },
			}),
		);
	if (parts.length < 2) return parts[0];
	return i18n.baseText('typeAvailabilityPolicies.landing.projects.summary.and', {
		interpolate: { first: parts[0], second: parts[1] },
	});
}

export function projectPolicySummary(project: ProjectPolicySummary): string {
	const restricted = typeList(project, 'restricted');
	const optedIn = typeList(project, 'optedIn');
	const parts: string[] = [];
	if (restricted) {
		parts.push(
			i18n.baseText('typeAvailabilityPolicies.landing.projects.summary.restricts', {
				interpolate: { types: restricted },
			}),
		);
	}
	if (optedIn) {
		parts.push(
			i18n.baseText('typeAvailabilityPolicies.landing.projects.summary.optedIn', {
				interpolate: { types: optedIn },
			}),
		);
	}

	return parts.length > 0
		? parts.join(' · ')
		: i18n.baseText('typeAvailabilityPolicies.landing.projects.summary.none');
}
