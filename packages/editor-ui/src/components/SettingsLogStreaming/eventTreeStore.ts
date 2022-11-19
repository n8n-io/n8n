import { defineStore } from "pinia";
import { EventNamesTreeCollection } from '@/components/SettingsLogStreaming/EventTree.vue';

export const useEventTreeStore = defineStore('eventTree', {
  state: () => ({
		items: new EventNamesTreeCollection(),
		eventNames: new Set<string>(),
		selected: new Set<string>(),
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
		addSelected(name: string) {
			this.selected.add(name);
		},
		removeSelected(name: string) {
			this.selected.delete(name);
		},
		setSelectionAndBuildItems(selectedEventNames: string[]) {
			this.selected.clear();
			for (const eventName of selectedEventNames) {
				this.selected.add(eventName);
			}
			this.buildItemsFromEventNames(this.eventNames, this.selected);
		},
		buildItemsFromEventNames(eventNames?: Set<string>, selectionList?: Set<string>) {
			this.items = treeCollectionFromStringList(
				eventNames ?? this.eventNames, selectionList ?? this.selected);
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
