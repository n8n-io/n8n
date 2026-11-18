import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { VueRenderer } from '@tiptap/vue-3';
import type { Component } from 'vue';

const SELECTION_STEPS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };

/** Moves the selection by `step` and wraps at both ends of the list. */
function stepIndex(index: number, step: number, count: number): number {
	return count === 0 ? 0 : (index + step + count) % count;
}

/**
 * Builds the renderer of a suggestion menu that shows `menuComponent`.
 * The component gets the props `items`, `selectedIndex` and `isLoading`, and emits `select`.
 * Each suggestion session gets its own menu and its own selection.
 * Up and down move the selection. Enter runs the selected item.
 */
export function createSuggestionMenuRenderer<Item>(menuComponent: Component) {
	return function renderSuggestionMenu() {
		let menu: VueRenderer | undefined;
		let unmount: (() => void) | undefined;
		let latest: SuggestionProps<Item, Item> | undefined;
		let selectedIndex = 0;

		function toMenuProps() {
			return {
				items: latest?.items ?? [],
				isLoading: latest?.loading ?? false,
				selectedIndex,
				onSelect: (item: Item) => latest?.command(item),
			};
		}

		function renderMenu(): void {
			menu?.updateProps(toMenuProps());
		}

		function showResults(props: SuggestionProps<Item, Item>): void {
			latest = props;
			selectedIndex = 0;
			renderMenu();
		}

		function moveSelection(step: number): void {
			selectedIndex = stepIndex(selectedIndex, step, latest?.items?.length ?? 0);
			renderMenu();
		}

		function runSelected(): boolean {
			const item = latest?.items?.[selectedIndex];
			if (item !== undefined) {
				latest?.command(item);
			}
			return item !== undefined;
		}

		/** The arrow keys belong to the menu only when it has something to select. */
		function handleSelectionKey(key: string): boolean {
			const step = SELECTION_STEPS[key];
			const canMove = step !== undefined && (latest?.items?.length ?? 0) > 0;
			if (canMove) {
				moveSelection(step);
			}
			return canMove;
		}

		return {
			onStart(props: SuggestionProps<Item, Item>): void {
				showResults(props);
				menu = new VueRenderer(menuComponent, { editor: props.editor, props: toMenuProps() });
				if (menu.element instanceof HTMLElement) {
					unmount = props.mount(menu.element);
				}
			},

			onUpdate: showResults,

			onKeyDown({ event }: SuggestionKeyDownProps): boolean {
				return event.key === 'Enter' ? runSelected() : handleSelectionKey(event.key);
			},

			onExit(): void {
				unmount?.();
				menu?.destroy();
				menu = undefined;
				unmount = undefined;
				latest = undefined;
			},
		};
	};
}
