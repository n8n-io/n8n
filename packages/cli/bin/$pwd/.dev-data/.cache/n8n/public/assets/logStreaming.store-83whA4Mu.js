import { Nf as init_reactivity_esm_bundler, Vf as ref, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { bC as useRootStore, cw as getEventNamesFromBackend, dw as sendTestMessageToDestination, lw as hasDestinationId, ow as deleteDestinationFromDb, sw as getDestinationsFromBackend, uw as saveDestinationToDb } from "./app-D5flEmb-.js";
//#region src/features/integrations/logStreaming.ee/logStreaming.store.ts
init_reactivity_esm_bundler();
var eventGroupFromEventName = (eventName) => {
	const matches = eventName.match(/^[\w\s]+\.[\w\s]+/);
	if (matches && matches?.length > 0) return matches[0];
};
var prettifyEventName = (label, group = "") => {
	label = label.replace(group + ".", "");
	if (label.length > 0) {
		label = label[0].toUpperCase() + label.substring(1);
		label = label.replaceAll(".", " ");
	}
	return label;
};
var eventGroupsFromStringList = (dottedList, selectionList = /* @__PURE__ */ new Set()) => {
	const result = [];
	const eventNameArray = Array.from(dottedList.values());
	const groups = /* @__PURE__ */ new Set();
	groups.add("n8n.workflow");
	groups.add("n8n.node");
	for (const eventName of eventNameArray) {
		const matches = eventName.match(/^[\w\s]+\.[\w\s]+/);
		if (matches && matches?.length > 0) groups.add(matches[0]);
	}
	for (const group of groups) {
		const collection = {
			children: [],
			label: group,
			name: group,
			selected: selectionList.has(group),
			indeterminate: false
		};
		const eventsOfGroup = eventNameArray.filter((e) => e === group || e.startsWith(`${group}.`));
		for (const event of eventsOfGroup) {
			if (!collection.selected && selectionList.has(event)) collection.indeterminate = true;
			const subCollection = {
				label: prettifyEventName(event, group),
				name: event,
				selected: selectionList.has(event),
				indeterminate: false
			};
			collection.children.push(subCollection);
		}
		result.push(collection);
	}
	return result;
};
var useLogStreamingStore = defineStore("logStreaming", () => {
	const items = ref({});
	const eventNames = ref(/* @__PURE__ */ new Set());
	const rootStore = useRootStore();
	const setSelectionAndBuildItems = (destination) => {
		if (destination.id) {
			if (!items.value[destination.id]) items.value[destination.id] = {
				destination,
				selectedEvents: /* @__PURE__ */ new Set(),
				eventGroups: [],
				isNew: false
			};
			items.value[destination.id]?.selectedEvents?.clear();
			if (destination.subscribedEvents) for (const eventName of destination.subscribedEvents) items.value[destination.id]?.selectedEvents?.add(eventName);
			items.value[destination.id].eventGroups = eventGroupsFromStringList(eventNames.value, items.value[destination.id]?.selectedEvents);
		}
	};
	const addDestination = (destination) => {
		if (destination.id && items.value[destination.id]) items.value[destination.id].destination = destination;
		else setSelectionAndBuildItems(destination);
	};
	const getDestination = (destinationId) => {
		if (items.value[destinationId]) return items.value[destinationId].destination;
		else return;
	};
	const getAllDestinations = () => {
		return Object.values(items.value).map((item) => item.destination);
	};
	const clearDestinations = () => {
		items.value = {};
	};
	const addEventName = (name) => {
		eventNames.value.add(name);
	};
	const removeEventName = (name) => {
		eventNames.value.delete(name);
	};
	const clearEventNames = () => {
		eventNames.value.clear();
	};
	const setSelectedInGroup = (destinationId, name, isSelected) => {
		if (!items.value[destinationId]) return;
		const groupName = eventGroupFromEventName(name);
		const group = items.value[destinationId].eventGroups.find((e) => e.name === groupName);
		if (!group) return;
		const children = group.children;
		if (groupName === name) {
			group.selected = isSelected;
			group.indeterminate = false;
			children.forEach((e) => e.selected = false);
			return;
		}
		const event = children.find((e) => e.name === name);
		if (!event) return;
		event.selected = isSelected;
		if (!isSelected && group.selected) {
			group.selected = false;
			group.children.filter((e) => e !== event).forEach((e) => e.selected = true);
		}
		const selectedChildren = children.filter((e) => e.selected);
		if (isSelected && selectedChildren.length === children.length) {
			group.selected = true;
			group.children.forEach((e) => e.selected = false);
		}
		group.indeterminate = selectedChildren.length > 0 && selectedChildren.length < children.length;
	};
	const addSelectedEvent = (id, name) => {
		items.value[id]?.selectedEvents?.add(name);
		setSelectedInGroup(id, name, true);
	};
	const removeSelectedEvent = (id, name) => {
		items.value[id]?.selectedEvents?.delete(name);
		setSelectedInGroup(id, name, false);
	};
	const removeDestinationItemTree = (id) => {
		delete items.value[id];
	};
	const updateDestination = (destination) => {
		if (destination.id && items.value[destination.id]) items.value[destination.id].destination = destination;
	};
	const removeDestination = (destinationId) => {
		if (!destinationId) return;
		delete items.value[destinationId];
	};
	const getSelectedEvents = (destinationId) => {
		const selectedEvents = [];
		if (items.value[destinationId]) for (const group of items.value[destinationId].eventGroups) {
			if (group.selected) selectedEvents.push(group.name);
			for (const event of group.children) if (event.selected) selectedEvents.push(event.name);
		}
		return selectedEvents;
	};
	const saveDestination = async (destination) => {
		if (!hasDestinationId(destination)) return false;
		const selectedEvents = getSelectedEvents(destination.id);
		await saveDestinationToDb(rootStore.restApiContext, destination, selectedEvents);
		updateDestination(destination);
		return true;
	};
	const sendTestMessage = async (destination) => {
		if (!hasDestinationId(destination)) return false;
		return await sendTestMessageToDestination(rootStore.restApiContext, destination);
	};
	const fetchEventNames = async () => {
		return await getEventNamesFromBackend(rootStore.restApiContext);
	};
	const fetchDestinations = async () => {
		return await getDestinationsFromBackend(rootStore.restApiContext);
	};
	const deleteDestination = async (destinationId) => {
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
		items
	};
});
//#endregion
export { useLogStreamingStore as t };
