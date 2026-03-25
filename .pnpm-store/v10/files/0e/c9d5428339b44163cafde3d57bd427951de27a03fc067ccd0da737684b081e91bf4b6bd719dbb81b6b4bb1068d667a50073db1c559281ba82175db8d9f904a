const require_shared_handleAndDispatchCustomEvent = require('../shared/handleAndDispatchCustomEvent.cjs');

//#region src/RadioGroup/utils.ts
const RADIO_SELECT = "radio.select";
function handleSelect(event, value, callback) {
	const eventDetail = {
		originalEvent: event,
		value
	};
	require_shared_handleAndDispatchCustomEvent.handleAndDispatchCustomEvent(RADIO_SELECT, callback, eventDetail);
}

//#endregion
Object.defineProperty(exports, 'handleSelect', {
  enumerable: true,
  get: function () {
    return handleSelect;
  }
});
//# sourceMappingURL=utils.cjs.map