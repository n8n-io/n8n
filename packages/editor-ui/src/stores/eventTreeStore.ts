import { defineStore } from "pinia";
import { EventNamesTreeCollection } from '@/components/SettingsLogStreaming/EventTree.vue';
import { AbstractMessageEventBusDestination } from "../components/SettingsLogStreaming/types";

export interface TreeAndSelectionStoreItem {
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
	}),
  getters: {
  },
  actions: {
		addEventName(name: string) {
			this.eventNames.add(name);
		},
		removeEventName(name: string) {
			this.eventNames.delete(name);
		},
		addSelectedEvent(id:string, name: string) {
			this.items[id]?.selectedEvents?.add(name);
		},
		removeSelectedEvent(id:string, name: string) {
			this.items[id]?.selectedEvents?.delete(name);
		},
		addSelectedLevel(id:string, name: string) {
			this.items[id]?.selectedLevels?.add(name);
		},
		removeSelectedLevel(id:string, name: string) {
			this.items[id]?.selectedLevels?.delete(name);
		},
		removeDestination(id: string) {
			delete this.items[id];
		},
		setSelectionAndBuildItems(destination: AbstractMessageEventBusDestination) {
			if (!(destination.id in this.items)) {
				this.items[destination.id] = {
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
				if (foundChild) {
					children = foundChild.children;
				} else {
					partialName += part;
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
