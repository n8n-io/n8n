const escapeTemplateElementRaw = string => string.replaceAll(
	/(?<=(?:^|[^\\])(?:\\\\)*)(?<symbol>(?:`|\$(?={)))/g,
	String.raw`\$<symbol>`,
);

export default escapeTemplateElementRaw;
