<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading size="2xlarge">{{ $locale.baseText('settings.logstreaming') }}</n8n-heading>
		</div>
		<div>
			<div :class="$style.sectionHeader">
				<n8n-heading size="large">{{ $locale.baseText('settings.personal.security') }}</n8n-heading>
			</div>
			<div>
				<n8n-input-label :label="$locale.baseText('auth.password')">
					<n8n-link @click="getDestinationDataFromREST">{{ $locale.baseText('auth.changePassword') }}</n8n-link>
				</n8n-input-label>
			</div>
		</div>
		<ul id="tree">
      <event-tree
				v-for="(child, index) in treeData.children"
        class="item"
				:key="index"
        :item="child"
        @make-folder="makeFolder"
      ></event-tree>
    </ul>
	</div>
</template>


<script lang="ts">
import { showMessage } from '@/components/mixins/showMessage';
import { CHANGE_PASSWORD_MODAL_KEY, N8N_IO_BASE_URL } from '@/constants';
import { IFormInputs, INodeUi, ITableData, IUser, NDVState } from '@/Interface';
import { useUIStore } from '@/stores/ui';
import { useUsersStore } from '@/stores/users';
import { mapStores } from 'pinia';
import Vue, { PropType } from 'vue';
import mixins from 'vue-typed-mixins';
import { get } from '../api/helpers';
import { restApi } from '@/components/mixins/restApi';
import { useWorkflowsStore } from '../stores/workflows';
import { useNDVStore } from '../stores/ndv';
import { getPairedItemId } from '../pairedItemUtils';
import { GenericValue, IDataObject, INodeExecutionData } from 'n8n-workflow';
import EventTree from '@/components/SettingsLogStreaming/EventTree.vue';

interface StringIndexedChild {
  name: string;
  children: StringIndexedChild[];
}


export default mixins(
	showMessage,
	restApi,
).extend({
	name: 'SettingsLogStreamingView',
	props: {},
	data() {
		return {
			hasAnyChanges: false,
			formInputs: null as null | IFormInputs,
			formBus: new Vue(),
			readyToSubmit: false,
			activeColumn: -1,
			draggedColumn: false,
			draggingPath: null as null | string,
			hoveringPath: null as null | string,
			mappingHintVisible: false,
			activeRow: null as number | null,
			columnLimitExceeded: false,
			isOpen: false,
			treeData: {} as StringIndexedChild,
			item: {} as StringIndexedChild,
		};
	},
	mounted() {
		this.getDestinationDataFromREST();
		this.getEventConstantsFromREST();
	},
	components: {
		EventTree,
	},
	computed: {
		...mapStores(
			useUIStore,
			useUsersStore,
						useNDVStore,
			useWorkflowsStore,
		),
		currentUser(): IUser | null {
			return this.usersStore.currentUser;
		},
		isFolder() {

			// return this.treeData && this.treeData._;
			return true;
		},
	},
	methods: {
		onInput() {
			this.hasAnyChanges = true;
		},
		onReadyToSubmit(ready: boolean) {
			this.readyToSubmit = ready;
		},
		async onSubmit(form: { firstName: string, lastName: string, email: string }) {
			if (!this.hasAnyChanges || !this.usersStore.currentUserId) {
				return;
			}
			try {
				await this.usersStore.updateUser({
					id: this.usersStore.currentUserId,
					firstName: form.firstName,
					lastName: form.lastName,
					email: form.email,
				});
				this.$showToast({
					title: this.$locale.baseText('settings.personal.personalSettingsUpdated'),
					message: '',
					type: 'success',
				});
				this.hasAnyChanges = false;
			}
			catch (e) {
				this.$showError(e, this.$locale.baseText('settings.personal.personalSettingsUpdatedError'));
			}
		},
		onSaveClick() {
			// this.formBus.$emit('submit');
		},
		openPasswordModal() {
			// this.uiStore.openModal(CHANGE_PASSWORD_MODAL_KEY);
		},
		async getDestinationDataFromREST(destinationId?: string): Promise<any> {
			const restResult = await this.restApi().makeRestApiRequest('get', '/eventbus/destination');
			console.log(restResult);
		},
		async getEventConstantsFromREST(destinationId?: string): Promise<any> {
			const restResult = await this.restApi().makeRestApiRequest('get', '/eventbus/constants');
			if ('events' in restResult) {
				this.treeData = restResult.events;
				console.log(restResult.events, restResult.levels);
			}
		},
		toggle() {
			if (this.isFolder) {
				this.isOpen = !this.isOpen;
			}
		},
		makeFolder() {
			if (!this.isFolder) {
				this.$emit("make-folder", this.item);
				this.isOpen = true;
			}
		},
	},
});
</script>

<style lang="scss" module>

.item {
  cursor: pointer;
}
.bold {
  font-weight: bold;
}

ul {
  padding-left: 1em;
  line-height: 1.5em;
  list-style-type: dot;
	margin-bottom: 0;
}

.container {
	> * {
		margin-bottom: var(--spacing-2xl);
	}
	padding-bottom: 100px;
}

.header {
	display: flex;
	align-items: center;
	white-space: nowrap;

	*:first-child {
		flex-grow: 1;
	}
}

.user {
	display: flex;
	align-items: center;

	@media (max-width: $breakpoint-2xs) {
		display: none;
	}
}


.username {
	margin-right: var(--spacing-s);
	text-align: right;

	@media (max-width: $breakpoint-sm) {
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.sectionHeader {
	margin-bottom: var(--spacing-s);
}
</style>
