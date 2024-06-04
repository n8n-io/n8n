import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { defineStore } from 'pinia';
import {
	deleteDestinationFromDb,
	getDestinationsFromBackend,
	getEventNamesFromBackend,
	hasDestinationId,
	saveDestinationToDb,
	sendTestMessageToDestination,
} from '../api/eventbus.ee';
import { useRootStore } from './n8nRoot.store';

export interface EventSelectionItem {
	selected: boolean;
	indeterminate: boolean;
	name: string;
	label: string;
}

interface EventSelectionGroup extends EventSelectionItem {
	children: EventSelectionItem[];
}

interface DestinationStoreItem {
	destination: MessageEventBusDestinationOptions;
	selectedEvents: Set<string>;
	eventGroups: EventSelectionGroup[];
	isNew: boolean;
}

export interface DestinationSettingsStore {
	[key: string]: DestinationStoreItem;
}

export const useLogStreamingStore = defineStore('logStreaming', {
	state: () => ({
		items: {} as DestinationSettingsStore,
		eventNames: new Set<string>(),
	}),
	getters: {},
	actions: {
		addDestination(destination: MessageEventBusDestinationOptions) {
			if (destination.id && this.items[destination.id]) {
				this.items[destination.id].destination = destination;
			} else {
				this.setSelectionAndBuildItems(destination);
			}
		},
		getDestination(destinationId: string): MessageEventBusDestinationOptions | undefined {
			if (this.items[destinationId]) {
				return this.items[destinationId].destination;
			} else {
				return;
			}
		},
		getAllDestinations(): MessageEventBusDestinationOptions[] {
			const destinations: MessageEventBusDestinationOptions[] = [];
			for (const key of Object.keys(this.items)) {
				destinations.push(this.items[key].destination);
			}
			return destinations;
		},
		updateDestination(destination: MessageEventBusDestinationOptions) {
			if (destination.id && this.items[destination.id]) {
				this.$patch((state) => {
					if (destination.id && this.items[destination.id]) {
						state.items[destination.id].destination = destination;
					}
					// to trigger refresh
					state.items = { ...state.items };
				});
			}
		},
		removeDestination(destinationId: string) {
			if (!destinationId) return;
			delete this.items[destinationId];
			if (this.items[destinationId]) {
				this.$patch({
					items: {
						...this.items,
					},
				});
			}
		},
		clearDestinations() {
			this.items = {};
		},
		addEventName(name: string) {
			this.eventNames.add(name);
		},
		removeEventName(name: string) {
			this.eventNames.delete(name);
		},
		clearEventNames() {
			this.eventNames.clear();
		},
		addSelectedEvent(id: string, name: string) {
			this.items[id]?.selectedEvents?.add(name);
			this.setSelectedInGroup(id, name, true);
		},
		removeSelectedEvent(id: string, name: string) {
			this.items[id]?.selectedEvents?.delete(name);
			this.setSelectedInGroup(id, name, false);
		},
		getSelectedEvents(destinationId: string): string[] {
			const selectedEvents: string[] = [];
			if (this.items[destinationId]) {
				for (const group of this.items[destinationId].eventGroups) {
					if (group.selected) {
						selectedEvents.push(group.name);
					}
					for (const event of group.children) {
						if (event.selected) {
							selectedEvents.push(event.name);
						}
					}
				}
			}
			return selectedEvents;
		},
		setSelectedInGroup(destinationId: string, name: string, isSelected: boolean) {
			if (this.items[destinationId]) {
				const groupName = eventGroupFromEventName(name);
				const groupIndex = this.items[destinationId].eventGroups.findIndex(
					(e) => e.name === groupName,
				);
				if (groupIndex > -1) {
					if (groupName === name) {
						this.$patch((state) => {
							state.items[destinationId].eventGroups[groupIndex].selected = isSelected;
						});
					} else {
						const eventIndex = this.items[destinationId].eventGroups[groupIndex].children.findIndex(
							(e) => e.name === name,
						);
						if (eventIndex > -1) {
							this.$patch((state) => {
								state.items[destinationId].eventGroups[groupIndex].children[eventIndex].selected =
									isSelected;
								if (isSelected) {
									state.items[destinationId].eventGroups[groupIndex].indeterminate = isSelected;
								} else {
									let anySelected = false;
									for (
										let i = 0;
										i < state.items[destinationId].eventGroups[groupIndex].children.length;
										i++
									) {
										anySelected =
											anySelected ||
											state.items[destinationId].eventGroups[groupIndex].children[i].selected;
									}
									state.items[destinationId].eventGroups[groupIndex].indeterminate = anySelected;
								}
							});
						}
					}
				}
			}
		},
		removeDestinationItemTree(id: string) {
			delete this.items[id];
		},
		clearDestinationItemTrees() {
			this.items = {} as DestinationSettingsStore;
		},
		setSelectionAndBuildItems(destination: MessageEventBusDestinationOptions) {
			if (destination.id) {
				if (!this.items[destination.id]) {
					this.items[destination.id] = {
						destination,
						selectedEvents: new Set<string>(),
						eventGroups: [],
						isNew: false,
					} as DestinationStoreItem;
				}
				this.items[destination.id]?.selectedEvents?.clear();
				if (destination.subscribedEvents) {
					for (const eventName of destination.subscribedEvents) {
						this.items[destination.id]?.selectedEvents?.add(eventName);
					}
				}
				this.items[destination.id].eventGroups = eventGroupsFromStringList(
					this.eventNames,
					this.items[destination.id]?.selectedEvents,
				);
			}
		},
		async saveDestination(destination: MessageEventBusDestinationOptions): Promise<boolean> {
			if (!hasDestinationId(destination)) {
				return false;
			}

			const rootStore = useRootStore();
			const selectedEvents = this.getSelectedEvents(destination.id);
			try {
				await saveDestinationToDb(rootStore.getRestApiContext, destination, selectedEvents);
				this.updateDestination(destination);
				return true;
			} catch (e) {
				return false;
			}
		},
		async sendTestMessage(destination: MessageEventBusDestinationOptions) {
			if (!hasDestinationId(destination)) {
				return false;
			}

			const rootStore = useRootStore();
			const testResult = await sendTestMessageToDestination(
				rootStore.getRestApiContext,
				destination,
			);
			return testResult;
		},
		async fetchEventNames(): Promise<string[]> {
			const rootStore = useRootStore();
			return await getEventNamesFromBackend(rootStore.getRestApiContext);
		},
		async fetchDestinations(): Promise<MessageEventBusDestinationOptions[]> {
			const rootStore = useRootStore();
			return await getDestinationsFromBackend(rootStore.getRestApiContext);
		},
		async deleteDestination(destinationId: string) {
			const rootStore = useRootStore();
			await deleteDestinationFromDb(rootStore.getRestApiContext, destinationId);
			this.removeDestination(destinationId);
		},
	},
});

export function eventGroupFromEventName(eventName: string): string | undefined {
	const matches = eventName.match(/^[\w\s]+\.[\w\s]+/);
	if (matches && matches?.length > 0) {
		return matches[0];
	}
	return undefined;
}

function prettifyEventName(label: string, group = ''): string {
	label = label.replace(group + '.', '');
	if (label.length > 0) {
		label = label[0].toUpperCase() + label.substring(1);
		label = label.replaceAll('.', ' ');
	}
	return label;
}

export function eventGroupsFromStringList(
	dottedList: Set<string>,
	selectionList: Set<string> = new Set(),
) {
	const result = [] as EventSelectionGroup[];
	const eventNameArray = Array.from(dottedList.values());

	const groups: Set<string> = new Set<string>();

	// since a Set returns iteration items on the order they were added, we can make sure workflow and nodes come first
	groups.add('n8n.workflow');
	groups.add('n8n.node');

	for (const eventName of eventNameArray) {
		const matches = eventName.match(/^[\w\s]+\.[\w\s]+/);
		if (matches && matches?.length > 0) {
			groups.add(matches[0]);
		}
	}

	for (const group of groups) {
		const collection: EventSelectionGroup = {
			children: [],
			label: group,
			name: group,
			selected: selectionList.has(group),
			indeterminate: false,
		};
		const eventsOfGroup = eventNameArray.filter((e) => e.startsWith(group));
		for (const event of eventsOfGroup) {
			if (!collection.selected && selectionList.has(event)) {
				collection.indeterminate = true;
			}
			const subCollection: EventSelectionItem = {
				label: prettifyEventName(event, group),
				name: event,
				selected: selectionList.has(event),
				indeterminate: false,
			};
			collection.children.push(subCollection);
		}
		result.push(collection);
	}
	return result;
}
