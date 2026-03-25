import { onMounted } from "vue";

//#region src/Dialog/utils.ts
const DEFAULT_TITLE_NAME = "DialogTitle";
const DEFAULT_CONTENT_NAME = "DialogContent";
function useWarning({ titleName = DEFAULT_TITLE_NAME, contentName = DEFAULT_CONTENT_NAME, componentLink = "dialog.html#title", titleId, descriptionId, contentElement }) {
	const TITLE_MESSAGE = `Warning: \`${contentName}\` requires a \`${titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://www.reka-ui.com/docs/components/${componentLink}`;
	const DESCRIPTION_MESSAGE = `Warning: Missing \`Description\` or \`aria-describedby="undefined"\` for ${contentName}.`;
	onMounted(() => {
		const hasTitle = document.getElementById(titleId);
		if (!hasTitle) console.warn(TITLE_MESSAGE);
		const describedById = contentElement.value?.getAttribute("aria-describedby");
		if (descriptionId && describedById) {
			const hasDescription = document.getElementById(descriptionId);
			if (!hasDescription) console.warn(DESCRIPTION_MESSAGE);
		}
	});
}

//#endregion
export { useWarning };
//# sourceMappingURL=utils.js.map