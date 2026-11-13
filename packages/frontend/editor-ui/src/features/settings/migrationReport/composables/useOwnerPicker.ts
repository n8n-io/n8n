import type { BreakingChangeRuleDetailWorkflow, BreakingChangeWorkflowOwner } from '@n8n/api-types';
import type { IUser } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useRootStore } from '@n8n/stores/useRootStore';
import { nextTick, ref } from 'vue';
import { withOwner, type UpdateRows } from '../findingRows';

type Row = BreakingChangeRuleDetailWorkflow;

function userOption(user: {
	id: string;
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
}): IUser {
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
	return {
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		fullName: fullName || undefined,
	};
}

/**
 * The owner picker of each row. It lists the users who can open the focused row's
 * workflow. One list serves every row, since only one picker is open at a time.
 */
export function useOwnerPicker(updateRows: UpdateRows) {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();

	const isLoadingUsers = ref(false);
	const activeWorkflowId = ref<string | undefined>();
	const memberOptions = ref<IUser[]>([]);

	// An owner that just came back from the server, registered as an option one
	// tick before the row takes it as its value, so the picker can resolve the label.
	const incomingOwners = ref(new Map<string, BreakingChangeWorkflowOwner>());

	/** The candidates for the row's workflow, plus the row's owner so the picker never shows a bare id. */
	function ownerOptionsFor(workflow: Row): IUser[] {
		const options = workflow.id === activeWorkflowId.value ? [...memberOptions.value] : [];
		for (const owner of [workflow.owner, incomingOwners.value.get(workflow.id)]) {
			// The picker needs an email on every option; an owner without one is left out.
			if (owner?.email && !options.some((option) => option.id === owner.id)) {
				options.push(userOption(owner));
			}
		}
		return options;
	}

	// A focus on another row can start a new load before the last one answered;
	// only the latest answer may fill the list.
	let memberRequestSequence = 0;

	async function loadMembers(workflowId: string) {
		const sequence = ++memberRequestSequence;
		isLoadingUsers.value = true;
		try {
			const candidates = await breakingChangesApi.getWorkflowOwnerCandidates(
				rootStore.restApiContext,
				workflowId,
			);
			if (sequence !== memberRequestSequence) return;
			// The picker needs an email on every option.
			memberOptions.value = candidates.filter((user) => user.email).map(userOption);
		} catch (error) {
			toast.showError(
				error,
				i18n.baseText('settings.migrationReport.detail.owner.search.error.title'),
			);
		} finally {
			if (sequence === memberRequestSequence) isLoadingUsers.value = false;
		}
	}

	function onOwnerPickerFocus(workflow: Row) {
		if (activeWorkflowId.value === workflow.id && memberOptions.value.length > 0) return;
		activeWorkflowId.value = workflow.id;
		memberOptions.value = [];
		void loadMembers(workflow.id);
	}

	// A quick second change can answer before the first; only the latest answer may land.
	const ownerRequestSequence = new Map<string, number>();

	async function onOwnerChange(workflow: Row, userId: string) {
		const sequence = (ownerRequestSequence.get(workflow.id) ?? 0) + 1;
		ownerRequestSequence.set(workflow.id, sequence);
		try {
			const { owner } = userId
				? await breakingChangesApi.assignWorkflowOwner(
						rootStore.restApiContext,
						workflow.id,
						userId,
					)
				: await breakingChangesApi.unassignWorkflowOwner(rootStore.restApiContext, workflow.id);
			if (ownerRequestSequence.get(workflow.id) !== sequence) return;
			if (owner) {
				incomingOwners.value = new Map(incomingOwners.value).set(workflow.id, owner);
				await nextTick();
			}
			updateRows((rows) => withOwner(rows, workflow.id, owner ?? undefined));
			const remaining = new Map(incomingOwners.value);
			remaining.delete(workflow.id);
			incomingOwners.value = remaining;
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.migrationReport.detail.owner.error.title'));
		}
	}

	return { isLoadingUsers, ownerOptionsFor, onOwnerPickerFocus, onOwnerChange };
}
