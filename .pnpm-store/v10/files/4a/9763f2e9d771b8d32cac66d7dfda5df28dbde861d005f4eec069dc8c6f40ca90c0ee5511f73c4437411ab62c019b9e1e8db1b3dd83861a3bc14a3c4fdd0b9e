const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_utils_assert = require('../utils/assert.cjs');
const require_utils_dom = require('../utils/dom.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Splitter/utils/composables/useWindowSplitterBehavior.ts
function useWindowSplitterResizeHandlerBehavior({ disabled, handleId, resizeHandler, panelGroupElement }) {
	(0, vue.watchEffect)((onCleanup) => {
		const _panelGroupElement = panelGroupElement.value;
		if (disabled.value || resizeHandler.value === null || _panelGroupElement === null) return;
		const handleElement = require_utils_dom.getResizeHandleElement(handleId, _panelGroupElement);
		if (handleElement == null) return;
		const onKeyDown = (event) => {
			if (event.defaultPrevented) return;
			switch (event.key) {
				case "ArrowDown":
				case "ArrowLeft":
				case "ArrowRight":
				case "ArrowUp":
				case "End":
				case "Home": {
					event.preventDefault();
					resizeHandler.value?.(event);
					break;
				}
				case "F6": {
					event.preventDefault();
					const groupId = handleElement.getAttribute("data-panel-group-id");
					require_utils_assert.assert(groupId);
					const handles = require_utils_dom.getResizeHandleElementsForGroup(groupId, _panelGroupElement);
					const index = require_utils_dom.getResizeHandleElementIndex(groupId, handleId, _panelGroupElement);
					require_utils_assert.assert(index !== null);
					const nextIndex = event.shiftKey ? index > 0 ? index - 1 : handles.length - 1 : index + 1 < handles.length ? index + 1 : 0;
					const nextHandle = handles[nextIndex];
					nextHandle.focus();
					break;
				}
			}
		};
		handleElement.addEventListener("keydown", onKeyDown);
		onCleanup(() => {
			handleElement.removeEventListener("keydown", onKeyDown);
		});
	});
}

//#endregion
Object.defineProperty(exports, 'useWindowSplitterResizeHandlerBehavior', {
  enumerable: true,
  get: function () {
    return useWindowSplitterResizeHandlerBehavior;
  }
});
//# sourceMappingURL=useWindowSplitterBehavior.cjs.map