import { defineStore } from "pinia";
import { AbstractMessageEventBusDestination } from "../components/SettingsLogStreaming/types";

export class EventNamesTreeCollection {
	label = '';
	_selected? = false;
	_indeterminate? = false;
	_name = '';
	children: EventNamesTreeCollection[] = [];
}

export interface TreeAndSelectionStoreItem {
		destination: AbstractMessageEventBusDestination,
		tree: EventNamesTreeCollection,
		selectedEvents: Set<string>,
		selectedLevels: Set<string>,
}

export interface TreeAndSelectionStore {
	[key:string]: TreeAndSelectionStoreItem
}

export const useEventTreeStore = defineStore('eventTree', {
  state: () => ({
		items: {} as TreeAndSelectionStore,
		eventNames: new Set<string>(),
		eventLevels: new Set<string>(),
	}),
  getters: {
  },
  actions: {
		addDestination(destination: AbstractMessageEventBusDestination) {
			if (destination.id in this.items) {
				this.items[destination.id].destination = destination;
			} else {
				this.setSelectionAndBuildItems(destination);
			}
		},
		getDestination(destinationId: string): AbstractMessageEventBusDestination | undefined {
			if (destinationId in this.items) {
				return this.items[destinationId].destination;
			} else {
				return;
			}
		},
		updateDestination(destination: AbstractMessageEventBusDestination) {
			if (destination.id in this.items) {
				this.items[destination.id].destination = destination;
			}
		},
		removeDestination(destinationId: string) {
			delete this.items[destinationId];
			if (destinationId in this.items) {
				this.$patch({items: {
					...this.items,
				}});
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
		addEventLevel(name: string) {
			this.eventLevels.add(name);
		},
		removeEventLevel(name: string) {
			this.eventLevels.delete(name);
		},
		clearEventLevels() {
			this.eventLevels.clear();
		},
		addSelectedEvent(id:string, name: string) {
			this.items[id]?.selectedEvents?.add(name);
			this.setSelectedInTree(id, name, true);
		},
		removeSelectedEvent(id:string, name: string) {
			this.items[id]?.selectedEvents?.delete(name);
			this.setSelectedInTree(id, name, false);
		},
		setSelectedInTree(id: string, name: string, isSelected: boolean) {
			const parts = name.split('.');
			let part: string | undefined;
			let children = this.items[id].tree.children;
			while ((part = parts.shift())) {
				if (part) {
					const foundChild = children.find((e) => e.label === part);
					if (foundChild) {
						if (parts.length === 0) {
							foundChild._selected = isSelected;
						}
						children = foundChild.children;
					} else {
						break;
					}
				}
			}
		},
		setIndeterminateInTree(id: string, name: string, isIndeterminate: boolean) {
			const parts = name.split('.');
			let part: string | undefined;
			let children = this.items[id].tree.children;
			while ((part = parts.shift())) {
				if (part) {
					const foundChild = children.find((e) => e.label === part);
					if (foundChild) {
						if (parts.length === 0) {
							foundChild._indeterminate = isIndeterminate;
						}
						children = foundChild.children;
					} else {
						break;
					}
				}
			}
		},
		addSelectedLevel(id:string, name: string) {
			this.items[id]?.selectedLevels?.add(name);
		},
		removeSelectedLevel(id:string, name: string) {
			this.items[id]?.selectedLevels?.delete(name);
		},
		setSelectedLevels(id:string, levelCheckList: string[]) {
			if (id in this.items) {
				this.items[id].selectedLevels = new Set<string>(levelCheckList);
			}
		},
		getSelectedLevels(id:string): string[] {
			return Array.from(this.items[id]?.selectedLevels.values()) ?? [];
		},
		getEventTree(id:string): EventNamesTreeCollection {
			return this.items[id]?.tree ?? {};
		},
		removeDestinationItemTree(id: string) {
			delete this.items[id];
		},
		clearDestinationItemTrees() {
			this.items = {} as TreeAndSelectionStore;
		},
		setSelectionAndBuildItems(destination: AbstractMessageEventBusDestination) {
			if (!(destination.id in this.items)) {
				this.items[destination.id] = {
					destination,
					tree: new EventNamesTreeCollection(),
					selectedEvents: new Set<string>(),
					selectedLevels: new Set<string>(),
				} as TreeAndSelectionStoreItem;
			}
			this.items[destination.id]?.selectedEvents?.clear();
			for (const eventName of destination.subscribedEvents) {
				this.items[destination.id]?.selectedEvents?.add(eventName);
			}
			for (const eventLevel of destination.subscribedLevels) {
				this.items[destination.id]?.selectedLevels?.add(eventLevel);
			}
			this.items[destination.id].tree = treeCollectionFromStringList(this.eventNames, this.items[destination.id]?.selectedEvents);
			// this.items[destination.id].elTree = elTreeFromStringList(this.eventNames);
		},
	},
});

export function treeCollectionFromStringList(dottedList: Set<string>, selectionList: Set<string> = new Set()) {
	const conversionResult = new EventNamesTreeCollection();
	dottedList.forEach((dottedString: string) => {
		const parts = dottedString.split('.');

		let part: string | undefined;
		let children = conversionResult.children;
		let partialName = '';
		while ((part = parts.shift())) {
			if (part) {
				const foundChild = children.find((e) => e.label === part);
				partialName += part;
				if (foundChild) {
					children = foundChild.children;
				} else {
					let _indeterminate = false;
					selectionList.forEach((e)=>{if (e.startsWith(partialName)) _indeterminate = true;});
					const newChild: EventNamesTreeCollection = {
						label: part,
						_name: partialName,
						_indeterminate,
						_selected: selectionList.has(partialName),
						children: [],
					};
					children.push(newChild);
					children = newChild.children;
				}
			}
			partialName += '.';
		}
	});
	return conversionResult;
};
