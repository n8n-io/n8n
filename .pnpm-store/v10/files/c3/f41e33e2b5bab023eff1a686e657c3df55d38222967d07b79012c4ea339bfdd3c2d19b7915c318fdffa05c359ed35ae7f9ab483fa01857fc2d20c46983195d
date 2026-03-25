"use strict";

var constants  = require("./constants");
var formatUrl  = require("./format");
var getOptions = require("./options");
var objUtils   = require("./util/object");
var parseUrl   = require("./parse");
var relateUrl  = require("./relate");



function RelateUrl(from, options)
{
	this.options = getOptions(options,
	{
		defaultPorts: {ftp:21, http:80, https:443},
		directoryIndexes: ["index.html"],
		ignore_www: false,
		output: RelateUrl.SHORTEST,
		rejectedSchemes: ["data","javascript","mailto"],
		removeAuth: false,
		removeDirectoryIndexes: true,
		removeEmptyQueries: false,
		removeRootTrailingSlash: true,
		schemeRelative: true,
		site: undefined,
		slashesDenoteHost: true
	});
	
	this.from = parseUrl.from(from, this.options, null);
}



/*
	Usage: instance=new RelateUrl(); instance.relate();
*/
RelateUrl.prototype.relate = function(from, to, options)
{
	// relate(to,options)
	if ( objUtils.isPlainObject(to) )
	{
		options = to;
		to = from;
		from = null;
	}
	// relate(to)
	else if (!to)
	{
		to = from;
		from = null;
	}
	
	options = getOptions(options, this.options);
	from = from || options.site;
	from = parseUrl.from(from, options, this.from);
	
	if (!from || !from.href)
	{
		throw new Error("from value not defined.");
	}
	else if (from.extra.hrefInfo.minimumPathOnly)
	{
		throw new Error("from value supplied is not absolute: "+from.href);
	}
	
	to = parseUrl.to(to, options);
	
	if (to.valid===false) return to.href;
	
	to = relateUrl(from, to, options);
	to = formatUrl(to, options);
	
	return to;
}



/*
	Usage: RelateUrl.relate();
*/
RelateUrl.relate = function(from, to, options)
{
	return new RelateUrl().relate(from, to, options);
}



// Make constants accessible from API
objUtils.shallowMerge(RelateUrl, constants);



module.exports = RelateUrl;
