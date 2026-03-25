import { handleAndDispatchCustomEvent } from "../shared/handleAndDispatchCustomEvent.js";

//#region src/RadioGroup/utils.ts
const RADIO_SELECT = "radio.select";
function handleSelect(event, value, callback) {
	const eventDetail = {
		originalEvent: event,
		value
	};
	handleAndDispatchCustomEvent(RADIO_SELECT, callback, eventDetail);
}

//#endregion
export { handleSelect };
//# sourceMappingURL=utils.js.map