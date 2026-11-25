//#region src/features/shared/toolsConnection/mcpRegistryIcon.ts
function iconForMcpRegistryServer(icons, appliedTheme) {
	const themed = icons.find((icon) => icon.theme === appliedTheme);
	const untagged = icons.find((icon) => icon.theme === void 0);
	const src = (themed ?? untagged ?? icons[0])?.src;
	return src ? {
		type: "file",
		src
	} : {
		type: "icon",
		name: "mcp"
	};
}
//#endregion
export { iconForMcpRegistryServer as t };
