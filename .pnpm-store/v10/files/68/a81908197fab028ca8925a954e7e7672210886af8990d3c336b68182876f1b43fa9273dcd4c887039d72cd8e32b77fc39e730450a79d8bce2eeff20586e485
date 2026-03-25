"use strict";

var hrefInfo   = require("./hrefInfo");
var parseHost  = require("./host");
var parsePath  = require("./path");
var parsePort  = require("./port");
var parseQuery = require("./query");
var parseUrlString = require("./urlstring");
var pathUtils      = require("../util/path");



function parseFromUrl(url, options, fallback)
{
	if (url)
	{
		var urlObj = parseUrl(url, options);
		
		// Because the following occurs in the relate stage for "to" URLs,
		// such had to be mostly duplicated here
		
		var pathArray = pathUtils.resolveDotSegments(urlObj.path.absolute.array);
		
		urlObj.path.absolute.array  = pathArray;
		urlObj.path.absolute.string = "/" + pathUtils.join(pathArray);
		
		return urlObj;
	}
	else
	{
		return fallback;
	}
}



function parseUrl(url, options)
{
	var urlObj = parseUrlString(url, options);
	
	if (urlObj.valid===false) return urlObj;
	
	parseHost(urlObj, options);
	parsePort(urlObj, options);
	parsePath(urlObj, options);
	parseQuery(urlObj, options);
	hrefInfo(urlObj);
	
	return urlObj;
}



module.exports =
{
	from: parseFromUrl,
	to:   parseUrl
};
