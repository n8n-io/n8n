//#region src/runnables/utils.ts
function isRunnableInterface(thing) {
	return thing ? thing.lc_runnable : false;
}
/**
* Utility to filter the root event in the streamEvents implementation.
* This is simply binding the arguments to the namespace to make save on
* a bit of typing in the streamEvents implementation.
*
* TODO: Refactor and remove.
*/
var _RootEventFilter = class {
	includeNames;
	includeTypes;
	includeTags;
	excludeNames;
	excludeTypes;
	excludeTags;
	constructor(fields) {
		this.includeNames = fields.includeNames;
		this.includeTypes = fields.includeTypes;
		this.includeTags = fields.includeTags;
		this.excludeNames = fields.excludeNames;
		this.excludeTypes = fields.excludeTypes;
		this.excludeTags = fields.excludeTags;
	}
	includeEvent(event, rootType) {
		let include = this.includeNames === void 0 && this.includeTypes === void 0 && this.includeTags === void 0;
		const eventTags = event.tags ?? [];
		if (this.includeNames !== void 0) include = include || this.includeNames.includes(event.name);
		if (this.includeTypes !== void 0) include = include || this.includeTypes.includes(rootType);
		if (this.includeTags !== void 0) include = include || eventTags.some((tag) => this.includeTags?.includes(tag));
		if (this.excludeNames !== void 0) include = include && !this.excludeNames.includes(event.name);
		if (this.excludeTypes !== void 0) include = include && !this.excludeTypes.includes(rootType);
		if (this.excludeTags !== void 0) include = include && eventTags.every((tag) => !this.excludeTags?.includes(tag));
		return include;
	}
};
const toBase64Url = (str) => {
	return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
//#endregion
export { _RootEventFilter, isRunnableInterface, toBase64Url };

//# sourceMappingURL=utils.js.map