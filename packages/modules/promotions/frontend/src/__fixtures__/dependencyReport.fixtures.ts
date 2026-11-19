import type {
	ApplyPackageResultDto,
	PromoteSelectionResultDto,
	PromotionDependencyReport,
	PromotionDirection,
	PromotionEnvironmentChanges,
	PromotionGap,
	PromotionHardBlock,
	PromotionPreview,
	PromotionPreviewCheck,
	PromotionReferenceConsumer,
	PromotionResource,
	PromotionResourceDetail,
	PromotionResourceDetails,
} from '@n8n/api-types';

import type { PromotionPreviewEnvironment } from '../composables/usePromotionPreview';
import type { PromotionOwnerRequester } from '../promotionDependencies';

/**
 * Development fixtures for the dependency report and the changes view across projects. No
 * production path imports this file: `promotionFixtures.ts` loads it only in a development
 * build, for `?fixture=<name>` on a preview page.
 *
 * Names: `gaps` (the default, also for a name that is not listed), `blocked` (hard blocks),
 * `changed` (the first submit answers that the gaps changed) and `clean` (no gap, only what
 * an Apply confirms).
 *
 * Cast: Sales owns the workflows "Sync orders" and "Daily report". Platform owns the
 * credential "CRM key". Ops owns the sub-workflow "Notify on-call". The user can only read
 * Finance. An open review holds the changes of Support.
 */

const COMMIT_SHA = 'c'.repeat(40);
const REVISION = 'a'.repeat(64);
const ENVIRONMENT_ID = 'fixture-environment';

const sales = { id: 'p-sales', name: 'Sales' };
const platform = { id: 'p-platform', name: 'Platform' };
const ops = { id: 'p-ops', name: 'Ops' };
const finance = { id: 'p-finance', name: 'Finance' };
const support = { id: 'p-support', name: 'Support' };

type Project = typeof sales;

function resource(
	key: string,
	name: string,
	project: Project | null,
	overrides: Partial<PromotionResource> = {},
): PromotionResource {
	const [type, ...idParts] = key.split(':');
	const id = idParts.join(':');
	const change = overrides.change ?? 'unchanged';
	return {
		key,
		// The key starts with the type of the resource.
		type: type as PromotionResource['type'],
		id,
		name,
		parentKey: project ? `project:${project.id}` : null,
		...(project ? { projectId: project.id, projectName: project.name } : {}),
		change,
		selectable: type === 'workflow',
		revision: {
			before: change === 'added' ? null : `${id}-before`,
			after: change === 'deleted' ? null : `${id}-after`,
		},
		...overrides,
	};
}

function resources(direction: PromotionDirection): PromotionResource[] {
	const projectRow = (project: Project) =>
		resource(`project:${project.id}`, project.name, project, { parentKey: null });
	return [
		projectRow(sales),
		resource('folder:f-orders', 'Orders', sales),
		resource('workflow:wf-sync', 'Sync orders', sales, {
			change: 'modified',
			parentKey: 'folder:f-orders',
		}),
		resource('workflow:wf-daily', 'Daily report', sales, { change: 'added' }),
		resource('workflow:wf-format', 'Format order', sales, { change: 'added' }),
		resource('credential:cred-salesdb', 'Sales DB', sales, { change: 'modified' }),
		projectRow(platform),
		resource('credential:cred-crm', 'CRM key', platform, { change: 'added' }),
		resource('workflow:wf-refresh', 'Refresh CRM cache', platform, { change: 'modified' }),
		projectRow(ops),
		resource('workflow:wf-notify', 'Notify on-call', ops, { change: 'added' }),
		resource('workflow:wf-normalize', 'Normalize', ops, { change: 'modified' }),
		...(direction === 'apply'
			? [resource('workflow:wf-legacy', 'Legacy alerts', ops, { change: 'deleted' })]
			: []),
		projectRow(finance),
		resource('workflow:wf-close', 'Month-end close', finance, { change: 'modified' }),
		resource('tag:t-orders', 'orders', null, { change: 'added' }),
	];
}

const dependencies = [
	{ workflowKey: 'workflow:wf-sync', resourceKey: 'credential:cred-salesdb', included: true },
	{ workflowKey: 'workflow:wf-sync', resourceKey: 'tag:t-orders', included: true },
	{ workflowKey: 'workflow:wf-sync', resourceKey: 'workflow:wf-format', included: false },
	{ workflowKey: 'workflow:wf-sync', resourceKey: 'workflow:wf-notify', included: false },
];

const syncOrders: PromotionReferenceConsumer = {
	kind: 'workflow',
	id: 'wf-sync',
	name: 'Sync orders',
	projectId: sales.id,
};
const dailyReport: PromotionReferenceConsumer = {
	kind: 'workflow',
	id: 'wf-daily',
	name: 'Daily report',
	projectId: sales.id,
};

const crmKey = {
	kind: 'credential' as const,
	id: 'cred-crm',
	name: 'CRM key',
	credentialType: 'hubspotApi',
};

/** The gaps that Promote and Apply share. */
function sharedGaps(direction: PromotionDirection): PromotionGap[] {
	const missing = direction === 'promote' ? 'not-on-branch' : 'missing-on-destination';
	return [
		{
			id: 'gap:wf-sync:workflow:wf-format',
			consumer: syncOrders,
			target: { kind: 'workflow', id: 'wf-format', name: 'Format order', project: sales },
			usage: 'sub-workflow',
			group: 'same-project',
			state: missing,
			exits: ['include'],
			include: { projectId: sales.id, resourceKey: 'workflow:wf-format' },
		},
		{
			id: 'gap:wf-sync:credential:cred-crm',
			consumer: syncOrders,
			target: { ...crmKey, project: platform },
			usage: 'credential',
			group: 'other-project',
			state: missing,
			exits: ['include'],
			include: { projectId: platform.id, resourceKey: 'credential:cred-crm' },
		},
		{
			id: 'gap:wf-daily:credential:cred-crm',
			consumer: dailyReport,
			target: { ...crmKey, project: platform },
			usage: 'credential',
			group: 'other-project',
			state: missing,
			exits: ['include'],
			include: { projectId: platform.id, resourceKey: 'credential:cred-crm' },
		},
		{
			id: 'gap:wf-sync:workflow:wf-notify',
			consumer: syncOrders,
			target: { kind: 'workflow', id: 'wf-notify', name: 'Notify on-call', project: ops },
			usage: 'sub-workflow',
			group: 'other-project',
			state: missing,
			exits: ['include'],
			include: { projectId: ops.id, resourceKey: 'workflow:wf-notify' },
		},
		{
			id: 'gap:wf-daily:credential:cred-mailer',
			consumer: dailyReport,
			target: {
				kind: 'credential',
				id: 'cred-mailer',
				name: 'Mailer',
				credentialType: 'smtp',
				project: platform,
			},
			usage: 'credential',
			group: 'other-project',
			state: 'in-open-review',
			review: {
				reviewId: 'review-42',
				webUrl: 'https://gitlab.example.com/acme/n8n-environments/-/merge_requests/42',
			},
			exits: ['open-review'],
		},
		{
			id: 'gap:wf-daily:credential:cred-tax',
			consumer: dailyReport,
			target: {
				kind: 'credential',
				id: 'cred-tax',
				name: 'Tax rates API',
				credentialType: 'httpHeaderAuth',
				project: finance,
			},
			usage: 'credential',
			group: 'read-only-project',
			state: missing,
			exits: ['ask-owner'],
		},
		{
			id: 'gap:wf-sync:workflow:Qx81LmZ0pRt2',
			consumer: syncOrders,
			target: { kind: 'workflow', id: 'Qx81LmZ0pRt2' },
			usage: 'sub-workflow',
			group: 'no-access',
			exits: ['ask-owner'],
		},
		{
			id: 'gap:wf-sync:credential:cred-warehouse',
			consumer: syncOrders,
			target: {
				kind: 'credential',
				id: 'cred-warehouse',
				name: 'Warehouse API',
				credentialType: 'httpBasicAuth',
			},
			usage: 'credential',
			group: 'no-access',
			exits: ['ask-owner'],
			ownerRequestSent: true,
			...(direction === 'apply' ? { placeholder: true } : {}),
		},
		{
			id: 'gap:wf-sync:credential:cred-alice',
			consumer: syncOrders,
			target: {
				kind: 'credential',
				id: 'cred-alice',
				name: "Alice's token",
				credentialType: 'githubApi',
			},
			usage: 'credential',
			group: 'personal',
			exits: ['move-to-team-project'],
			...(direction === 'apply' ? { placeholder: true } : {}),
		},
		{
			id: 'gap:wf-daily:workflow:wf-audit',
			consumer: dailyReport,
			target: {
				kind: 'workflow',
				id: 'wf-audit',
				name: 'Audit trail',
				project: { id: 'p-legal', name: 'Legal' },
			},
			usage: 'error-workflow',
			group: 'outside-environment',
			exits: ['add-project'],
		},
	];
}

/** The gaps that only an Apply can have. */
const applyGaps: PromotionGap[] = [
	{
		id: 'gap:wf-sync:credential:cred-billing',
		consumer: syncOrders,
		target: {
			kind: 'credential',
			id: 'cred-billing',
			name: 'Billing API',
			credentialType: 'stripeApi',
		},
		usage: 'credential',
		group: 'not-on-branch',
		state: 'not-on-branch',
		exits: [],
		placeholder: true,
	},
	{
		id: 'gap:wf-sync:workflow:wf-escalate',
		consumer: syncOrders,
		target: { kind: 'workflow', id: 'wf-escalate', name: 'Escalate incident', project: ops },
		usage: 'error-workflow',
		group: 'archived-on-destination',
		exits: ['restore'],
	},
	{
		id: 'gap:wf-daily:credential:cred-dwh',
		consumer: dailyReport,
		target: {
			kind: 'credential',
			id: 'cred-dwh',
			name: 'Data warehouse',
			credentialType: 'postgres',
			project: platform,
		},
		usage: 'credential',
		group: 'access-not-grantable',
		exits: [],
	},
	{
		id: 'gap:wf-sync:workflow:wf-legacy',
		consumer: syncOrders,
		target: { kind: 'workflow', id: 'wf-legacy', name: 'Legacy alerts', project: ops },
		usage: 'sub-workflow',
		group: 'deleted-by-apply',
		exits: ['remove-deletion'],
	},
	{
		id: 'gap:wf-daily:workflow:wf-normalize',
		consumer: dailyReport,
		target: { kind: 'workflow', id: 'wf-normalize', name: 'Normalize', project: ops },
		usage: 'sub-workflow',
		group: 'caller-policy',
		exits: ['change-policy'],
	},
];

function hardBlocks(direction: PromotionDirection): PromotionHardBlock[] {
	const ambiguous: PromotionHardBlock = {
		code: 'ambiguous-credential-owner',
		target: {
			kind: 'credential',
			id: 'cred-ftp-shared',
			name: 'Shared FTP',
			credentialType: 'ftp',
		},
		consumer: dailyReport,
	};
	if (direction === 'promote') return [ambiguous];
	return [
		{
			code: 'credential-type-mismatch',
			target: { ...crmKey, project: platform },
			consumer: syncOrders,
			detail: { sourceType: 'hubspotApi', destinationType: 'hubspotOAuth2Api' },
		},
		ambiguous,
		{
			code: 'instance-credential-missing',
			target: { kind: 'credential', id: 'cred-smtp', name: 'Shared SMTP', credentialType: 'smtp' },
			consumer: syncOrders,
		},
		{
			code: 'incompatible-usage-scope',
			target: {
				kind: 'credential',
				id: 'cred-slack',
				name: 'Slack bot',
				credentialType: 'slackApi',
			},
			consumer: dailyReport,
		},
		{
			code: 'placeholder-create-forbidden',
			target: {
				kind: 'credential',
				id: 'cred-billing',
				name: 'Billing API',
				credentialType: 'stripeApi',
			},
			consumer: syncOrders,
		},
		{
			code: 'credential-move-forbidden',
			target: {
				kind: 'credential',
				id: 'cred-export',
				name: 'Billing export',
				credentialType: 'sftp',
			},
		},
	];
}

function report(name: string, direction: PromotionDirection): PromotionDependencyReport {
	const clean = name === 'clean';
	const gaps = clean ? [] : [...sharedGaps(direction), ...(direction === 'apply' ? applyGaps : [])];
	const blocks = name === 'blocked' ? hardBlocks(direction) : [];
	const forApply = direction === 'apply';
	return {
		blocked: blocks.length > 0,
		gaps,
		warnings: clean
			? []
			: [
					{
						id: 'warning:wf-daily:workflow:gone-123',
						consumer: dailyReport,
						target: { kind: 'workflow', id: 'gone-123' },
						usage: 'sub-workflow',
						code: 'broken-on-source',
					},
					...(forApply
						? [
								{
									id: 'warning:wf-sync:workflow:wf-old-helper',
									consumer: syncOrders,
									target: { kind: 'workflow' as const, id: 'wf-old-helper', name: 'Old helper' },
									usage: 'sub-workflow' as const,
									code: 'legacy-workflow-reference' as const,
								},
							]
						: []),
				],
		notes: [
			{
				consumer: syncOrders,
				target: {
					kind: 'credential',
					id: 'cred-smtp',
					name: 'Shared SMTP',
					credentialType: 'smtp',
				},
				usage: 'credential',
				code: 'instance-credential',
			},
			{ consumer: syncOrders, usage: 'sub-workflow', code: 'expression-not-checked' },
		],
		grants: forApply
			? [
					{
						id: 'grant:cred-mailer:p-sales',
						credential: { id: 'cred-mailer', name: 'Mailer', type: 'smtp' },
						project: sales,
						consumers: [{ id: dailyReport.id, name: dailyReport.name }],
					},
					{
						id: 'grant:cred-crm:p-sales',
						credential: { id: 'cred-crm', name: 'CRM key', type: 'hubspotApi' },
						project: sales,
						consumers: [
							{ id: syncOrders.id, name: syncOrders.name },
							{ id: dailyReport.id, name: dailyReport.name },
						],
					},
				]
			: [],
		credentialMoves: forApply
			? [
					{
						credential: { id: 'cred-crm', name: 'CRM key', type: 'hubspotApi' },
						toProject: platform,
						fromProject: sales,
						placeholder: true,
						allowed: true,
					},
					{
						credential: { id: 'cred-geo', name: 'Geocoder', type: 'httpHeaderAuth' },
						toProject: ops,
						placeholder: false,
						allowed: true,
					},
					{
						credential: { id: 'cred-export', name: 'Billing export', type: 'sftp' },
						toProject: platform,
						placeholder: false,
						allowed: false,
					},
				]
			: [],
		deletionCallers: forApply
			? [
					{
						target: { id: 'wf-legacy', name: 'Legacy alerts' },
						callers: [
							{ id: 'wf-pager', name: 'Pager sync', projectId: ops.id },
							{ id: 'wf-normalize', name: 'Normalize', projectId: ops.id, publishedOnly: true },
						],
						hiddenCallerCount: 1,
					},
				]
			: [],
		keptWorkflows: forApply
			? [
					{
						id: 'wf-logger',
						name: 'Shared logger',
						projectId: ops.id,
						referencedBy: [{ id: syncOrders.id, name: syncOrders.name }],
					},
				]
			: [],
		credentialHomeChoices: forApply
			? [
					{
						credential: { id: 'cred-partner-ftp', name: 'Partner FTP', type: 'ftp' },
						candidateProjects: [sales, platform],
					},
				]
			: [],
		hardBlocks: blocks,
	};
}

const emptyCheck: PromotionPreviewCheck = {
	missingProjects: [],
	missingBindings: [],
	accessRequirements: [],
	conflicts: [],
	warnings: [],
	movedWorkflows: [],
	movedFolders: [],
};

/** A small before and after for each row, so the cards have something to show. */
function detail(row: PromotionResource): PromotionResourceDetail | undefined {
	const side = <Content>(content: Content) => ({
		before: row.revision.before === null ? null : content,
		after: row.revision.after === null ? null : content,
		revision: row.revision,
	});
	switch (row.type) {
		case 'workflow':
			return {
				key: row.key,
				type: 'workflow',
				...side({
					id: row.id,
					name: row.name,
					nodes: [],
					connections: {},
					parentFolderId: null,
					isArchived: false,
				}),
			};
		case 'credential':
			return {
				key: row.key,
				type: 'credential',
				...side({ id: row.id, name: row.name, type: 'hubspotApi' }),
			};
		case 'tag':
			return { key: row.key, type: 'tag', ...side({ id: row.id, name: row.name }) };
		default:
			return undefined;
	}
}

const applied = (gaps: PromotionGap[]): ApplyPackageResultDto => ({
	status: 'applied',
	environmentId: ENVIRONMENT_ID,
	git: { branchName: 'main', commitSha: COMMIT_SHA },
	counts: {
		projects: { created: 0, updated: 0, skipped: 3, deleted: 0 },
		folders: { created: 0, updated: 0, skipped: 1, moved: 0, renamed: 0, removed: 0 },
		workflows: {
			created: 2,
			updated: 3,
			skipped: 0,
			moved: 0,
			archived: 0,
			deleted: 0,
			publishing: { published: 0, unpublished: 0, unchanged: 5, blocked: 0, failed: 0 },
		},
		credentials: { matched: 1, stubbed: 2, updated: 0 },
		dataTables: { matched: 0, created: 0, updated: 0 },
		variables: { matched: 0, created: 0, updated: 0, stubbed: 0, missing: 0 },
		tags: { matched: 0, created: 1, renamed: 0, reconciled: 0, skipped: 0 },
	},
	warnings: [],
	placeholders: gaps
		.filter(({ placeholder }) => placeholder)
		.map(({ target, consumer }) => ({
			id: target.id,
			name: target.name ?? target.id,
			type: target.credentialType ?? '',
			projectId: consumer.projectId,
		})),
});

// The `changed` fixture answers once that the gaps changed, then it lets the operation pass.
let changedOnce = false;

/**
 * `salesProjectId` is the project of the page that shows the fixture. It stands in for Sales,
 * so the fixture also works on the page of a real project.
 */
export function createPromotionFixture(
	name: string,
	direction: PromotionDirection,
	salesProjectId: string = sales.id,
) {
	const swap = <Value>(value: Value): Value =>
		salesProjectId === sales.id
			? value
			: (JSON.parse(JSON.stringify(value).replaceAll(sales.id, salesProjectId)) as Value);
	const dependencyReport = swap(report(name, direction));
	const rows = swap(resources(direction));
	const environment: PromotionPreviewEnvironment = {
		id: ENVIRONMENT_ID,
		name: direction === 'promote' ? 'Staging' : 'Development',
		direction,
		providerType: 'gitlab',
		branchName: 'main',
		createBranchOnPromotion: direction === 'promote',
	};
	const changes: PromotionEnvironmentChanges = swap({
		direction,
		commitSha: COMMIT_SHA,
		source: { environmentId: ENVIRONMENT_ID, branchName: 'main' },
		projects: [
			{ ...sales, canOperate: true },
			{ ...platform, canOperate: true },
			{ ...ops, canOperate: true },
			{ ...finance, canOperate: false },
			...(direction === 'promote' ? [{ ...support, canOperate: true }] : []),
		],
		resources: rows,
		dependencies,
		...(direction === 'promote'
			? { blockers: [{ code: 'reviewOpen' as const, reviewId: 'review-7', projectId: support.id }] }
			: { check: emptyCheck }),
		dependencyReport,
		revision: REVISION,
	});

	/** The gaps of a request that confirmed `confirmedGapIds`, when they differ from the report. */
	function changedGaps(confirmedGapIds: string[]): PromotionDependencyReport | undefined {
		if (name !== 'changed' || changedOnce || confirmedGapIds.length === 0) return undefined;
		changedOnce = true;
		const added: PromotionGap = {
			id: 'gap:wf-daily:workflow:wf-archive',
			consumer: swap(dailyReport),
			target: { kind: 'workflow', id: 'wf-archive', name: 'Archive orders', project: ops },
			usage: 'sub-workflow',
			group: 'other-project',
			state: direction === 'promote' ? 'not-on-branch' : 'missing-on-destination',
			exits: ['ask-owner'],
		};
		const gaps = [...dependencyReport.gaps.filter(({ id }) => confirmedGapIds.includes(id)), added];
		return { ...dependencyReport, gaps };
	}

	return {
		environment,
		changes,
		/** The preview of one project page: the rows of the project and the gaps of its workflows. */
		projectPreview(projectId: string): PromotionPreview {
			const {
				projects: _projects,
				blockers: _blockers,
				direction: _direction,
				...preview
			} = changes;
			return {
				...preview,
				resources: rows.filter((row) => row.projectId === projectId || row.projectId === undefined),
				dependencies: dependencies.filter(
					({ resourceKey }) => resourceKey !== 'workflow:wf-notify',
				),
				dependencyReport: {
					...dependencyReport,
					gaps: dependencyReport.gaps.filter(({ consumer }) => consumer.projectId === projectId),
				},
			};
		},
		details(keys: string[]): PromotionResourceDetails {
			const details = keys.flatMap((key) => {
				const row = rows.find((candidate) => candidate.key === key);
				return (row && detail(row)) ?? [];
			});
			const loaded = new Set(details.map(({ key }) => key));
			return { details, missingKeys: keys.filter((key) => !loaded.has(key)) };
		},
		promote(confirmedGapIds: string[]): PromoteSelectionResultDto {
			const changed = changedGaps(confirmedGapIds);
			if (changed) {
				return { status: 'gaps-changed', environmentId: ENVIRONMENT_ID, dependencyReport: changed };
			}
			return {
				status: 'promoted',
				environmentId: ENVIRONMENT_ID,
				counts: { workflows: 5, folders: 1, credentials: 2, dataTables: 0, variables: 0, tags: 1 },
				git: { commitSha: COMMIT_SHA, branchName: 'n8n-promotion/fixture' },
				review: {
					reviewId: 'review-43',
					['number']: 43,
					webUrl: 'https://gitlab.example.com/acme/n8n-environments/-/merge_requests/43',
				},
			};
		},
		apply(confirmedGapIds: string[]): ApplyPackageResultDto {
			const changed = changedGaps(confirmedGapIds);
			if (changed) {
				return {
					status: 'gaps-changed',
					environmentId: ENVIRONMENT_ID,
					git: { branchName: 'main', commitSha: COMMIT_SHA },
					dependencyReport: changed,
				};
			}
			return applied(dependencyReport.gaps.filter(({ id }) => confirmedGapIds.includes(id)));
		},
		/** "Ask the owner" without a server: the request goes through after a short wait. */
		ownerRequester: (async () => {
			await new Promise((resolve) => setTimeout(resolve, 600));
			return true;
		}) satisfies PromotionOwnerRequester,
	};
}
