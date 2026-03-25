"use strict";

var absolutize = require("./absolutize");
var relativize = require("./relativize");



function relateUrl(siteUrlObj, urlObj, options)
{
	absolutize(urlObj, siteUrlObj, options);
	relativize(urlObj, siteUrlObj, options);
	
	return urlObj;
}



module.exports = relateUrl;
