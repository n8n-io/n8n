"use strict";

var ensureString = require("type/string/ensure");

module.exports = function (str) {
	var quote, i, char;
	str = ensureString(str);
	quote = str[0];
	if (quote !== "'" && quote !== "\"") return false;
	i = 0;
	char = str[++i];
	while (char) {
		if (char === quote) break;
		if (char === "\\") ++i;
		char = str[++i];
	}
	return Boolean(char && !str[i + 1]);
};
