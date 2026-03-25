const [major, minor] = process.versions.node.split('.').map((str) => parseInt(str, 10));
export const oneShotCallback = major >= 16 || (major === 15 && minor >= 13);
export const rsaPssParams = !('electron' in process.versions) && (major >= 17 || (major === 16 && minor >= 9));
export const jwkExport = major >= 16 || (major === 15 && minor >= 9);
export const jwkImport = major >= 16 || (major === 15 && minor >= 12);
