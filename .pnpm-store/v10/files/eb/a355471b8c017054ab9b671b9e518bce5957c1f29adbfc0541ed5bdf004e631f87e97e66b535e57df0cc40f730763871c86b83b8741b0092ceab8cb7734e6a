//#region src/documents/document.ts
/**
* Interface for interacting with a document.
*/
var Document = class {
	pageContent;
	metadata;
	/**
	* An optional identifier for the document.
	*
	* Ideally this should be unique across the document collection and formatted
	* as a UUID, but this will not be enforced.
	*/
	id;
	constructor(fields) {
		this.pageContent = fields.pageContent !== void 0 ? fields.pageContent.toString() : "";
		this.metadata = fields.metadata ?? {};
		this.id = fields.id;
	}
};
//#endregion
export { Document };

//# sourceMappingURL=document.js.map