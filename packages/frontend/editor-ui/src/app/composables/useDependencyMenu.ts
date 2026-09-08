import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import type { DropdownMenuItemProps, IconName } from '@n8n/design-system';
import type { DependencyType, ResolvedDependency } from '@n8n/api-types';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';
import { DATA_TABLE_DETAILS } from '@/features/core/dataTable/constants';

const typeConfig: Record<DependencyType, { icon: IconName; labelKey: BaseTextKey }> = {
	credentialId: {
		icon: 'key-round',
		labelKey: 'workflows.dependencies.type.credentials' as BaseTextKey,
	},
	dataTableId: {
		icon: 'table',
		labelKey: 'workflows.dependencies.type.dataTables' as BaseTextKey,
	},
	agentUsage: {
		icon: 'bot',
		labelKey: 'workflows.dependencies.type.agents' as BaseTextKey,
	},
	errorWorkflow: {
		icon: 'bug',
		labelKey: 'workflows.dependencies.type.errorWorkflow' as BaseTextKey,
	},
	errorWorkflowParent: {
		icon: 'bug',
		labelKey: 'workflows.dependencies.type.errorWorkflowParent' as BaseTextKey,
	},
	workflowCall: {
		icon: 'log-in',
		labelKey: 'workflows.dependencies.type.subWorkflows' as BaseTextKey,
	},
	workflowParent: {
		icon: 'log-in',
		labelKey: 'workflows.dependencies.type.parentWorkflows' as BaseTextKey,
	},
};

const displayOrder: DependencyType[] = [
	'credentialId',
	'dataTableId',
	'workflowCall',
	'workflowParent',
	'agentUsage',
	'errorWorkflow',
	'errorWorkflowParent',
];

/** Shared building blocks for dependency dropdowns (dependency pill, workflow menu). */
export function useDependencyMenu() {
	const i18n = useI18n();
	const router = useRouter();
	const uiStore = useUIStore();

	/** Menu items grouped by type, with a disabled header per group. Item ids are `<type>:<id>`. */
	function buildDependencyMenuItems(
		deps: ResolvedDependency[],
		query = '',
	): Array<DropdownMenuItemProps<string>> {
		if (deps.length === 0) return [];

		const normalizedQuery = query.toLowerCase().trim();
		const filtered = normalizedQuery
			? deps.filter((dep) => dep.name.toLowerCase().includes(normalizedQuery))
			: deps;

		const groups: Record<DependencyType, ResolvedDependency[]> = {
			credentialId: [],
			dataTableId: [],
			agentUsage: [],
			errorWorkflow: [],
			errorWorkflowParent: [],
			workflowCall: [],
			workflowParent: [],
		};
		for (const dep of filtered) {
			groups[dep.type].push(dep);
		}

		const items: Array<DropdownMenuItemProps<string>> = [];
		for (const typeKey of displayOrder) {
			const groupDeps = groups[typeKey];
			if (groupDeps.length === 0) continue;

			const config = typeConfig[typeKey];
			// Add a disabled "header" item as group label, with divider if not the first group
			items.push({
				id: `header-${typeKey}`,
				label: i18n.baseText(config.labelKey),
				icon: { type: 'icon', value: config.icon },
				disabled: true,
				divided: items.length > 0,
			});

			for (const dep of groupDeps) {
				items.push({
					id: `${dep.type}:${dep.id}`,
					label: dep.name,
				});
			}
		}

		return items;
	}

	/** The dependency a menu item id (`<type>:<id>`) points to, or undefined. */
	function resolveDependencyMenuId(
		deps: ResolvedDependency[],
		value: string,
	): ResolvedDependency | undefined {
		const [type, id] = value.split(':');
		if (!type || !id) return undefined;
		return deps.find((dep) => dep.type === type && dep.id === id);
	}

	/** Open the resource behind a dependency (credential modal, or a new tab). */
	function openDependency(dep: ResolvedDependency): void {
		switch (dep.type) {
			case 'credentialId':
				uiStore.openExistingCredential(dep.id);
				break;
			case 'workflowCall':
			case 'workflowParent':
			case 'errorWorkflow':
			case 'errorWorkflowParent': {
				const href = router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId: dep.id } }).href;
				window.open(href, '_blank');
				break;
			}
			case 'dataTableId':
				if (dep.projectId) {
					const href = router.resolve({
						name: DATA_TABLE_DETAILS,
						params: { projectId: dep.projectId, id: dep.id },
					}).href;
					window.open(href, '_blank');
				}
				break;
			case 'agentUsage':
				if (dep.projectId) {
					const href = router.resolve({
						name: AGENT_BUILDER_VIEW,
						params: { projectId: dep.projectId, agentId: dep.id },
					}).href;
					window.open(href, '_blank');
				}
				break;
		}
	}

	return { buildDependencyMenuItems, resolveDependencyMenuId, openDependency };
}
