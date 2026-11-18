import { intBetween, sample, seeded } from './random';
import type { Member, Project, ProjectRole } from './types';
import { CURRENT_USER_ID, USERS } from './users';

const HAND_WRITTEN: Project[] = [
	{
		id: 'marketing',
		name: 'Marketing',
		description: 'Campaign automation, lead routing, and reporting for the marketing team.',
		icon: { type: 'icon', value: 'megaphone' },
	},
	{
		id: 'engineering',
		name: 'Engineering',
		description: 'Deploy alerts, on-call handoffs, and internal tooling.',
		icon: { type: 'icon', value: 'terminal' },
	},
	{
		id: 'finance',
		name: 'Finance',
		description: 'Invoicing, reconciliation, and month-end close.',
		icon: { type: 'icon', value: 'landmark' },
	},
	{
		id: 'customer-success',
		name: 'Customer success',
		description: 'Onboarding, health scores, and renewal reminders.',
		icon: { type: 'icon', value: 'headset' },
	},
];

export const HAND_WRITTEN_PROJECT_IDS: string[] = HAND_WRITTEN.map((project) => project.id);

/** The project the prototype opens on. */
export const DEFAULT_PROJECT_ID = 'marketing';

const TEAMS: Array<{ name: string; icon: string; description: string }> = [
	{
		name: 'Growth',
		icon: 'trending-up',
		description: 'Lead capture, enrichment, and lifecycle campaigns.',
	},
	{ name: 'Sales', icon: 'handshake', description: 'Pipeline hygiene, quotes, and deal alerts.' },
	{
		name: 'Support',
		icon: 'life-buoy',
		description: 'Ticket routing, escalations, and customer replies.',
	},
	{ name: 'Data', icon: 'database', description: 'Pipelines, exports, and scheduled reports.' },
	{
		name: 'Platform',
		icon: 'server',
		description: 'Deploy hooks, environment checks, and internal tooling.',
	},
	{
		name: 'Security',
		icon: 'shield',
		description: 'Access reviews, alert triage, and incident response.',
	},
	{ name: 'Legal', icon: 'scale', description: 'Contract intake, approvals, and renewals.' },
	{
		name: 'People',
		icon: 'users-round',
		description: 'Onboarding, offboarding, and time-off requests.',
	},
	{
		name: 'Product',
		icon: 'lightbulb',
		description: 'Feedback triage, release notes, and roadmap updates.',
	},
	{
		name: 'Design',
		icon: 'palette',
		description: 'Asset handoff, review requests, and library updates.',
	},
	{
		name: 'Partnerships',
		icon: 'globe',
		description: 'Partner onboarding, referrals, and co-marketing.',
	},
	{
		name: 'Procurement',
		icon: 'shopping-cart',
		description: 'Purchase requests, vendor checks, and approvals.',
	},
	{
		name: 'IT',
		icon: 'monitor',
		description: 'Device provisioning, access requests, and license audits.',
	},
	{
		name: 'Analytics',
		icon: 'chart-line',
		description: 'Dashboards, metric alerts, and data quality checks.',
	},
	{
		name: 'Revenue operations',
		icon: 'target',
		description: 'Forecasting, territory rules, and CRM cleanup.',
	},
	{
		name: 'Research',
		icon: 'microscope',
		description: 'Survey intake, interview scheduling, and synthesis.',
	},
	{
		name: 'Compliance',
		icon: 'gavel',
		description: 'Evidence collection, policy reminders, and audits.',
	},
	{
		name: 'Logistics',
		icon: 'truck',
		description: 'Shipment tracking, carrier updates, and delay alerts.',
	},
	{
		name: 'Field operations',
		icon: 'map',
		description: 'Dispatch, site reports, and schedule changes.',
	},
	{
		name: 'Content',
		icon: 'book-open',
		description: 'Publishing, translation, and review workflows.',
	},
];

const QUALIFIERS = [
	'EMEA',
	'Americas',
	'APAC',
	'DACH',
	'Nordics',
	'UK',
	'Enterprise',
	'SMB',
	'Internal',
	'Staging',
	'Sandbox',
	'Reporting',
	'Integrations',
	'Automation',
	'Labs',
	'Onboarding',
	'Migration',
	'Partners',
	'Alerts',
	'Archive',
];

const slug = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/**
 * Every team and qualifier pair exactly once. Inside a block of twenty the
 * qualifier advances by three per team, so the first generated projects
 * don't read as one team repeated ("Growth – EMEA", "Sales – DACH", …).
 */
function generate(total: number): Project[] {
	const projects: Project[] = [];
	for (let index = 0; index < total; index += 1) {
		const teamIndex = index % TEAMS.length;
		const block = Math.floor(index / TEAMS.length);
		const team = TEAMS[teamIndex];
		const qualifier = QUALIFIERS[(teamIndex * 3 + block) % QUALIFIERS.length];
		const name = `${team.name} – ${qualifier}`;
		projects.push({
			id: slug(name),
			name,
			description: team.description,
			icon: { type: 'icon', value: team.icon },
		});
	}
	return projects;
}

const ALL_PROJECTS: Project[] = [...HAND_WRITTEN, ...generate(400 - HAND_WRITTEN.length)];

export function projectsFor(count: 4 | 40 | 400): Project[] {
	return ALL_PROJECTS.slice(0, count).map((project) => ({
		...project,
		icon: { ...project.icon },
	}));
}

const MARKETING_MEMBERS: Member[] = [
	{ userId: 'u-sofia', role: 'project:admin' },
	// An instance admin: full access through the instance role, with a stored project role.
	{ userId: 'u-priya', role: 'project:editor' },
	{ userId: 'u-tomas', role: 'project:editor' },
	{ userId: 'u-mei', role: 'project:editor' },
	{ userId: 'u-amara', role: 'project:editor' },
	{ userId: 'u-chloe', role: 'custom:workflow-reviewer' },
	{ userId: 'u-kofi', role: 'custom:credential-manager' },
	{ userId: 'u-jonas', role: 'project:viewer' },
	{ userId: 'u-arjun', role: 'project:viewer' },
];

const ENGINEERING_MEMBERS: Member[] = [
	{ userId: 'u-daniel', role: 'project:admin' },
	{ userId: 'u-priya', role: 'project:admin' },
	{ userId: 'u-ethan', role: 'project:editor' },
	{ userId: 'u-hannah', role: 'project:editor' },
	{ userId: 'u-lucas', role: 'project:editor' },
	{ userId: 'u-yuki', role: 'project:editor' },
	{ userId: 'u-rafael', role: 'project:editor' },
	{ userId: 'u-zoe', role: 'custom:workflow-reviewer' },
	{ userId: 'u-ingrid', role: 'project:viewer' },
	{ userId: 'u-samuel', role: 'project:viewer' },
	{ userId: 'u-lena', role: 'project:viewer' },
];

const FINANCE_MEMBERS: Member[] = [
	{ userId: 'u-elena', role: 'project:admin' },
	{ userId: 'u-mateo', role: 'project:editor' },
	{ userId: 'u-aisha', role: 'custom:credential-manager' },
	{ userId: 'u-noah', role: 'project:viewer' },
	{ userId: 'u-olivia', role: 'project:viewer' },
];

const CUSTOMER_SUCCESS_MEMBERS: Member[] = [
	{ userId: 'u-nadia', role: 'project:admin' },
	{ userId: 'u-yuki', role: 'project:editor' },
	{ userId: 'u-freya', role: 'project:editor' },
	{ userId: 'u-liam', role: 'project:editor' },
	{ userId: 'u-amara', role: 'project:viewer' },
	{ userId: 'u-jonas', role: 'project:viewer' },
];

const HAND_WRITTEN_MEMBERS: Record<string, Member[]> = {
	marketing: MARKETING_MEMBERS,
	engineering: ENGINEERING_MEMBERS,
	finance: FINANCE_MEMBERS,
	'customer-success': CUSTOMER_SUCCESS_MEMBERS,
};

const OTHER_ROLES: ProjectRole[] = [
	'project:editor',
	'project:editor',
	'project:editor',
	'project:editor',
	'project:viewer',
	'project:viewer',
	'project:viewer',
	'custom:workflow-reviewer',
	'custom:credential-manager',
	'project:admin',
];

/**
 * The project's members, without the current user: their membership comes
 * from the `viewingAs` parameter. The first member is always a project admin.
 */
export function seedMembers(projectId: string): Member[] {
	const written = HAND_WRITTEN_MEMBERS[projectId];
	if (written) return written.map((member) => ({ ...member }));

	const next = seeded(`members:${projectId}`);
	const candidates = USERS.filter((entry) => entry.id !== CURRENT_USER_ID);
	const chosen = sample(next, candidates, intBetween(next, 4, 12));
	return chosen.map((entry, index) => ({
		userId: entry.id,
		role: index === 0 ? 'project:admin' : OTHER_ROLES[Math.floor(next() * OTHER_ROLES.length)],
	}));
}
