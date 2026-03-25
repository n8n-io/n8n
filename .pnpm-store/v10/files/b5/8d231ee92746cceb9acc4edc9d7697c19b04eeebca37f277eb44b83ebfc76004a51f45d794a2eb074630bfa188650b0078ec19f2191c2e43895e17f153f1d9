//#region src/util/load.ts
const loadFromFile = async (uri, loader, values = {}) => {
	try {
		const fs = await import("node:fs/promises");
		return loader(await fs.readFile(uri, { encoding: "utf-8" }), uri, values);
	} catch (e) {
		console.error(e);
		throw new Error(`Could not load file at ${uri}`);
	}
};

//#endregion
export { loadFromFile };
//# sourceMappingURL=load.js.map