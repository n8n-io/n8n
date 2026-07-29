import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { defineStore } from 'pinia';
import {
	deleteDestinationFromDb,
	getDestinationsFromBackend,
	getEventNamesFromBackend,
	hasDestinationId,
	saveDestinationToDb,
	sendTestMessageToDestination,
} from '@n8n/rest-api-client/api/eventbus.ee';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref } from 'vue';

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

const eventGroupFromEventName = (eventName: string): string | undefined => {
	const matches = eventName.match(/^[\w\s]+\.[\w\s]+/);
	if (matches && matches?.length > 0) {
		return matches[0];
	}
	return undefined;
};

const prettifyEventName = (label: string, group = ''): string => {
	label = label.replace(group + '.', '');
	if (label.length > 0) {
		label = label[0].toUpperCase() + label.substring(1);
		label = label.replaceAll('.', ' ');
	}
	return label;
};

const eventGroupsFromStringList = (
	dottedList: Set<string>,
	selectionList: Set<string> = new Set(),
) => {
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
};

export const useLogStreamingStore = defineStore('logStreaming', () => {
	const items = ref<DestinationSettingsStore>({});
	const eventNames = ref(new Set<string>());

	const rootStore = useRootStore();

	const setSelectionAndBuildItems = (destination: MessageEventBusDestinationOptions) => {
		if (destination.id) {
			if (!items.value[destination.id]) {
				items.value[destination.id] = {
					destination,
					selectedEvents: new Set<string>(),
					eventGroups: [],
					isNew: false,
				} as DestinationStoreItem;
			}
			items.value[destination.id]?.selectedEvents?.clear();
			if (destination.subscribedEvents) {
				for (const eventName of destination.subscribedEvents) {
					items.value[destination.id]?.selectedEvents?.add(eventName);
				}
			}
			items.value[destination.id].eventGroups = eventGroupsFromStringList(
				eventNames.value,
				items.value[destination.id]?.selectedEvents,
			);
		}
	};

	const addDestination = (destination: MessageEventBusDestinationOptions) => {
		if (destination.id && items.value[destination.id]) {
			items.value[destination.id].destination = destination;
		} else {
			setSelectionAndBuildItems(destination);
		}
	};

	const getDestination = (destinationId: string) => {
		if (items.value[destinationId]) {
			return items.value[destinationId].destination;
		} else {
			return;
		}
	};

	const getAllDestinations = () => {
		const destinations: MessageEventBusDestinationOptions[] = Object.values(items.value).map(
			(item) => item.destination,
		);
		return destinations;
	};

	const clearDestinations = () => {
		items.value = {};
	};

	const addEventName = (name: string) => {
		eventNames.value.add(name);
	};

	const removeEventName = (name: string) => {
		eventNames.value.delete(name);
	};

	const clearEventNames = () => {
		eventNames.value.clear();
	};

	const setSelectedInGroup = (destinationId: string, name: string, isSelected: boolean) => {
		if (!items.value[destinationId]) return;

		const groupName = eventGroupFromEventName(name);
		const group = items.value[destinationId].eventGroups.find((e) => e.name === groupName);
		if (!group) return;

		const children = group.children;
		if (groupName === name) {
			group.selected = isSelected;
			group.indeterminate = false;
			// if the whole group is toggled, all children are unselected
			children.forEach((e) => (e.selected = false));
			return;
		}

		const event = children.find((e) => e.name === name);
		if (!event) return;

		event.selected = isSelected;

		// If whole group is selected and the event is unselected,
		// we unselect the group but keep other children selected
		if (!isSelected && group.selected) {
			group.selected = false;
			group.children.filter((e) => e !== event).forEach((e) => (e.selected = true));
		}

		// If all children are selected, we select the group
		// and unselect all children
		const selectedChildren = children.filter((e) => e.selected);
		if (isSelected && selectedChildren.length === children.length) {
			group.selected = true;
			group.children.forEach((e) => (e.selected = false));
		}

		group.indeterminate = selectedChildren.length > 0 && selectedChildren.length < children.length;
	};

	const addSelectedEvent = (id: string, name: string) => {
		items.value[id]?.selectedEvents?.add(name);
		setSelectedInGroup(id, name, true);
	};

	const removeSelectedEvent = (id: string, name: string) => {
		items.value[id]?.selectedEvents?.delete(name);
		setSelectedInGroup(id, name, false);
	};

	const removeDestinationItemTree = (id: string) => {
		delete items.value[id];
	};

	const updateDestination = (destination: MessageEventBusDestinationOptions) => {
		if (destination.id && items.value[destination.id]) {
			items.value[destination.id].destination = destination;
		}
	};

	const removeDestination = (destinationId: string) => {
		if (!destinationId) return;
		delete items.value[destinationId];
	};

	const getSelectedEvents = (destinationId: string): string[] => {
		const selectedEvents: string[] = [];
		if (items.value[destinationId]) {
			for (const group of items.value[destinationId].eventGroups) {
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
	};

	const saveDestination = async (
		destination: MessageEventBusDestinationOptions,
	): Promise<boolean> => {
		if (!hasDestinationId(destination)) {
			return false;
		}

		const selectedEvents = getSelectedEvents(destination.id);
		try {
			await saveDestinationToDb(rootStore.restApiContext, destination, selectedEvents);
			updateDestination(destination);
			return true;
		} catch {
			return false;
		}
	};

	const sendTestMessage = async (
		destination: MessageEventBusDestinationOptions,
	): Promise<boolean> => {
		if (!hasDestinationId(destination)) {
			return false;
		}

		const testResult = await sendTestMessageToDestination(rootStore.restApiContext, destination);
		return testResult;
	};

	const fetchEventNames = async () => {
		return await getEventNamesFromBackend(rootStore.restApiContext);
	};

	const fetchDestinations = async (): Promise<MessageEventBusDestinationOptions[]> => {
		return await getDestinationsFromBackend(rootStore.restApiContext);
	};

	const deleteDestination = async (destinationId: string) => {
		await deleteDestinationFromDb(rootStore.restApiContext, destinationId);
		removeDestination(destinationId);
	};

	return {
		addDestination,
		setSelectionAndBuildItems,
		getDestination,
		getAllDestinations,
		clearDestinations,
		addEventName,
		removeEventName,
		clearEventNames,
		addSelectedEvent,
		removeSelectedEvent,
		setSelectedInGroup,
		removeDestinationItemTree,
		updateDestination,
		removeDestination,
		getSelectedEvents,
		saveDestination,
		sendTestMessage,
		fetchEventNames,
		fetchDestinations,
		deleteDestination,
		items,
	};
});
