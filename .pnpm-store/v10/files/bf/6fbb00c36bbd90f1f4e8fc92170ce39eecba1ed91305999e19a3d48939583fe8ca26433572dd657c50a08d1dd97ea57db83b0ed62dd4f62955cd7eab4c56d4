"use strict";
const pattern = /-(\w|$)/g;

const callback = (dashChar, char) => char.toUpperCase();



const camelCaseCSS = property =>
{
	property = property.toLowerCase();

	// NOTE :: IE8's "styleFloat" is intentionally not supported
	if (property === "float")
	{
		return "cssFloat";
	}
	// Microsoft vendor-prefixes are uniquely cased
	else if (property.startsWith("-ms-"))
	{
		return property.substr(1).replace(pattern, callback);
	}
	else
	{
		return property.replace(pattern, callback);
	}
};



module.exports = camelCaseCSS;
