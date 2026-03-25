
//#region src/shared/handleAndDispatchCustomEvent.ts
function handleAndDispatchCustomEvent(name, handler, detail) {
	const target = detail.originalEvent.target;
	const event = new CustomEvent(name, {
		bubbles: false,
		cancelable: true,
		detail
	});
	if (handler) target.addEventListener(name, handler, { once: true });
	target.dispatchEvent(event);
}

//#endregion
Object.defineProperty(exports, 'handleAndDispatchCustomEvent', {
  enumerable: true,
  get: function () {
    return handleAndDispatchCustomEvent;
  }
});
//# sourceMappingURL=handleAndDispatchCustomEvent.cjs.map