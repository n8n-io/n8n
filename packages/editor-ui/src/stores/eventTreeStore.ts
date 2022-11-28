import { EventMessageLevel, MessageEventBusDestinationOptions } from "n8n-workflow";
import { defineStore } from "pinia";
// import { MessageEventBusDestinationOptions } from "../components/SettingsLogStreaming/types";

export class EventNamesTreeCollection {
	label = '';
	_selected? = false;
	_indeterminate? = false;
	_name = '';
	children: EventNamesTreeCollection[] = [];
}

export interface TreeAndSelectionStoreItem {
		destination: MessageEventBusDestinationOptions,
		tree: EventNamesTreeCollection,
		selectedEvents: Set<string>,
		selectedLevels: Set<EventMessageLevel>,
}

export interface TreeAndSelectionStore {
	[key:string]: TreeAndSelectionStoreItem
}

export const useEventTreeStore = defineStore('eventTree', {
  state: () => ({
		items: {} as TreeAndSelectionStore,
		eventNames: new Set<string>(),
	}),
  getters: {
  },
  actions: {
		addDestination(destination: MessageEventBusDestinationOptions) {
			if (destination.id && destination.id in this.items) {
				this.items[destination.id].destination = destination;
			} else {
				this.setSelectionAndBuildItems(destination);
			}
		},
		getDestination(destinationId: string): MessageEventBusDestinationOptions | undefined {
			if (destinationId in this.items) {
				return this.items[destinationId].destination;
			} else {
				return;
			}
		},
		updateDestination(destination: MessageEventBusDestinationOptions) {
			if (destination.id && destination.id in this.items) {
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
		addSelectedLevel(id:string, name: EventMessageLevel) {
			this.items[id]?.selectedLevels?.add(name);
		},
		removeSelectedLevel(id:string, name: EventMessageLevel) {
			this.items[id]?.selectedLevels?.delete(name);
		},
		setSelectedLevels(id:string, levelCheckList: EventMessageLevel[]) {
			if (id in this.items) {
				this.items[id].selectedLevels = new Set<EventMessageLevel>(levelCheckList);
			}
		},
		getSelectedLevels(id:string): EventMessageLevel[] {
			if (id in this.items) {
				return Array.from(this.items[id]?.selectedLevels.values()) ?? [];
			} else {
				return [];
			}
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
		setSelectionAndBuildItems(destination: MessageEventBusDestinationOptions) {
			if (destination.id) {
				if (!(destination.id in this.items)) {
					this.items[destination.id] = {
						destination,
						tree: new EventNamesTreeCollection(),
						selectedEvents: new Set<string>(),
						selectedLevels: new Set<string>(),
					} as TreeAndSelectionStoreItem;
				}
				this.items[destination.id]?.selectedEvents?.clear();
				if (destination.subscribedEvents) {
					for (const eventName of destination.subscribedEvents) {
						this.items[destination.id]?.selectedEvents?.add(eventName);
					}
				}
				if (destination.subscribedLevels) {
					for (const eventLevel of destination.subscribedLevels) {
						this.items[destination.id]?.selectedLevels?.add(eventLevel);
					}
				}
				this.items[destination.id].tree = treeCollectionFromStringList(this.eventNames, this.items[destination.id]?.selectedEvents);
				// this.items[destination.id].elTree = elTreeFromStringList(this.eventNames);
			}
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
