import type { LinkedInstanceSummary } from '@n8n/api-types';
import type { DropdownMenuExposed, DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, useTemplateRef, watch, type Ref } from 'vue';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

import { fetchLinkedInstances } from '../linkedInstances.api';
import { LINKED_INSTANCES_MODULE_ID, LINKED_INSTANCES_SCOPE } from '../linkedInstances.constants';
import type { TransferWorkflow } from './transferDialogState';
import { useSaveBeforeMove } from './useSaveBeforeMove';

/** Menu ids of the moves. No dependency type and no fixed action of the menu starts like this. */
export const MOVE_MENU_ID_PREFIX = 'move-to-linked-instance:';

/** The fields of the workflow header menu that decide whether a workflow can move. */
export interface MoveMenuWorkflow {
	id: string;
	name: string;
	isNewWorkflow: boolean;
	isArchived?: boolean;
	workflowPermissions: PermissionsRecord['workflow'];
}

/**
 * The props and listeners of the move dialog, bound with `v-bind` next to the menu. The menu does
 * not offer to turn on the copy there. Only a request for a live automation does, for example from
 * the Assistant.
 */
export interface MoveDialogBindings {
	open: boolean;
	workflow: TransferWorkflow;
	instance: LinkedInstanceSummary;
	'onUpdate:open': (open: boolean) => void;
	onClosed: () => void;
}

/**
 * The links of the user. Only the latest read counts. A failed read keeps the last list, because
 * the dialog checks the link again before anything moves. Without any list, the menu shows no move.
 */
function useMoveLinks(available: Readonly<Ref<boolean>>) {
	const rootStore = useRootStore();
	const links = ref<LinkedInstanceSummary[]>([]);
	let reads = 0;

	async function load(): Promise<void> {
		const current = ++reads;
		try {
			const list = await fetchLinkedInstances(rootStore.restApiContext);
			if (current === reads) links.value = list;
		} catch {
			// The menu works without the moves.
		}
	}

	// The menu shows the moves on the first open, so the list loads before that.
	watch(
		available,
		(on) => {
			if (on) void load();
		},
		{ immediate: true },
	);

	return { links, load };
}

/** The bindings of the move dialog. Its focus goes back to the menu after it closes. */
function useMoveDialog(workflow: MoveMenuWorkflow, focusMenu: () => void) {
	const documentStore = injectWorkflowDocumentStore();
	const dialog = ref<MoveDialogBindings>();

	function open(instance: LinkedInstanceSummary): void {
		dialog.value = {
			open: false,
			workflow: {
				id: workflow.id,
				name: workflow.name,
				liveHere: documentStore.value.active,
				canUnpublish: workflow.workflowPermissions.unpublish === true,
			},
			instance,
			'onUpdate:open': (isOpen) => {
				if (dialog.value) dialog.value.open = isOpen;
			},
			onClosed: focusMenu,
		};
		// Open after the menu has left the page, so the two layers do not fight for focus.
		requestAnimationFrame(() => {
			if (dialog.value?.instance.id === instance.id) dialog.value.open = true;
		});
	}

	return { dialog, open };
}

/**
 * The "Move to {name}" entries of the workflow header menu, one for each link. The server needs
 * the linked-instances module, the scope of its routes and the right to export the workflow. A new
 * or archived workflow cannot move.
 */
export function useMoveWorkflowMenu(
	workflow: MoveMenuWorkflow,
	/** The template ref of the menu in the host. Focus goes back to its trigger. */
	menuRef: string,
) {
	const menu = useTemplateRef<DropdownMenuExposed>(menuRef);
	const i18n = useI18n();
	const settingsStore = useSettingsStore();
	const rbacStore = useRBACStore();
	const { ensureSaved } = useSaveBeforeMove();

	const available = computed(
		() =>
			settingsStore.isModuleActive(LINKED_INSTANCES_MODULE_ID) &&
			rbacStore.hasScope(LINKED_INSTANCES_SCOPE),
	);
	const canMove = computed(
		() =>
			available.value &&
			!workflow.isNewWorkflow &&
			workflow.isArchived !== true &&
			workflow.workflowPermissions.export === true,
	);

	const focusMenu = () => menu.value?.focusTrigger();
	const { links, load } = useMoveLinks(available);
	const { dialog, open: openDialog } = useMoveDialog(workflow, focusMenu);

	const menuItems = computed<Array<DropdownMenuItemProps<string>>>(() =>
		canMove.value
			? links.value.map((link) => ({
					id: `${MOVE_MENU_ID_PREFIX}${link.id}`,
					label: i18n.baseText('linkedInstances.transfer.menu.moveTo', {
						interpolate: { name: link.name },
					}),
					icon: { type: 'icon', value: 'send' },
					// The dialog opens after the menu closes and puts focus back itself.
					suppressCloseAutoFocus: true,
				}))
			: [],
	);

	/** A link can change in another tab, so the list loads again on each open of the menu. */
	function onMenuToggle(isOpen: boolean): void {
		if (isOpen && available.value) void load();
	}

	async function startMove(instance: LinkedInstanceSummary): Promise<void> {
		if (await ensureSaved(instance.name)) openDialog(instance);
		else focusMenu();
	}

	/** @returns true when the action is a move. The move then starts. */
	function select(action: string): boolean {
		if (!action.startsWith(MOVE_MENU_ID_PREFIX)) return false;
		const id = action.slice(MOVE_MENU_ID_PREFIX.length);
		const instance = links.value.find((link) => link.id === id);
		if (instance && canMove.value) void startMove(instance);
		return true;
	}

	return { menuItems, onMenuToggle, select, dialog };
}
