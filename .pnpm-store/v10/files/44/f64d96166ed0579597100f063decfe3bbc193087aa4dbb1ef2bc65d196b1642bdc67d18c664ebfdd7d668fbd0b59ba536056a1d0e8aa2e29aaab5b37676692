import { BaseMessage } from "./base.js";
//#region src/messages/modifier.ts
/**
* Message responsible for deleting other messages.
*/
var RemoveMessage = class extends BaseMessage {
	type = "remove";
	/**
	* The ID of the message to remove.
	*/
	id;
	constructor(fields) {
		super({
			...fields,
			content: []
		});
		this.id = fields.id;
	}
	get _printableFields() {
		return {
			...super._printableFields,
			id: this.id
		};
	}
	static isInstance(obj) {
		return super.isInstance(obj) && obj.type === "remove";
	}
};
//#endregion
export { RemoveMessage };

//# sourceMappingURL=modifier.js.map