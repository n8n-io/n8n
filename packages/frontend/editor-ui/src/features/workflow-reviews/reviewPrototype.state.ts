import { reactive } from 'vue';

/**
 * Page-local review requirements for the prototype.
 * Instance flags live on the settings store. These are the project and workflow extras.
 */
export const reviewPrototypeState = reactive({
	projectPublishing: false,
	projectPromoting: false,
	workflowPublishing: {} as Record<string, boolean>,
	workflowPromoting: {} as Record<string, boolean>,
});
