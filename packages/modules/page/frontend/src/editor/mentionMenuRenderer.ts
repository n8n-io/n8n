import MentionMenu from './MentionMenu.vue';
import { createSuggestionMenuRenderer } from './suggestionMenuRenderer';
import type { ResourceSearchResult } from '../resources/resource.api';

/** Renders the `@` menu of one suggestion session. Enter inserts the selected result. */
export const createMentionMenuRenderer =
	createSuggestionMenuRenderer<ResourceSearchResult>(MentionMenu);
