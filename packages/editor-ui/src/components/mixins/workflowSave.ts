import {
	IWorkflowData,
} from '../../Interface';

import { restApi } from '@/components/mixins/restApi';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import mixins from 'vue-typed-mixins';

export const workflowSave = mixins(
	nodeHelpers,
	restApi,
	showMessage,
	workflowHelpers,
)
	.extend({
		methods: {
			// Saves the currently loaded workflow to the database.
			async saveCurrentWorkflow (withNewName = false) {
				const currentWorkflow = this.$route.params.name;
				let workflowName: string | null | undefined = '';
				if (currentWorkflow === undefined || withNewName === true) {
					// Currently no workflow name is set to get it from user
					workflowName = await this.$prompt(
						'Enter workflow name',
						'Name',
						{
							confirmButtonText: 'Save',
							cancelButtonText: 'Cancel',
						},
					)
						.then((data) => {
							// @ts-ignore
							return data.value;
						})
						.catch(() => {
							// User did cancel
							return undefined;
						});

					if (workflowName === undefined) {
						// User did cancel
						return;
					} else if (['', null].includes(workflowName)) {
						// User did not enter a name
						this.$showMessage({
							title: 'Name missing',
							message: `No name for the workflow got entered and could so not be saved!`,
							type: 'error',
						});
						return;
					}
				}

				try {
					this.$store.commit('addActiveAction', 'workflowSaving');

					let workflowData: IWorkflowData = await this.getWorkflowDataToSave();

					if (currentWorkflow === undefined || withNewName === true) {
						// Workflow is new or is supposed to get saved under a new name
						// so create a new entry in database
						workflowData.name = workflowName!.trim() as string;

						if (withNewName === true) {
							// If an existing workflow gets resaved with a new name
							// make sure that the new ones is not active
							workflowData.active = false;
						}

						workflowData = await this.restApi().createNewWorkflow(workflowData);

						this.$store.commit('setActive', workflowData.active || false);
						this.$store.commit('setWorkflowId', workflowData.id);
						this.$store.commit('setWorkflowName', {name: workflowData.name, setStateDirty: false});
						this.$store.commit('setWorkflowSettings', workflowData.settings || {});
					} else {
						// Workflow exists already so update it
						await this.restApi().updateWorkflow(currentWorkflow, workflowData);
					}

					if (this.$route.params.name !== workflowData.id) {
						this.$router.push({
							name: 'NodeViewExisting',
							params: { name: workflowData.id as string, action: 'workflowSave' },
						});
					}

					this.$store.commit('removeActiveAction', 'workflowSaving');
					this.$store.commit('setStateDirty', false);
					this.$showMessage({
						title: 'Workflow saved',
						message: `The workflow "${workflowData.name}" got saved!`,
						type: 'success',
					});
				} catch (e) {
					this.$store.commit('removeActiveAction', 'workflowSaving');

					this.$showMessage({
						title: 'Problem saving workflow',
						message: `There was a problem saving the workflow: "${e.message}"`,
						type: 'error',
					});
				}
			},
		},
	});
