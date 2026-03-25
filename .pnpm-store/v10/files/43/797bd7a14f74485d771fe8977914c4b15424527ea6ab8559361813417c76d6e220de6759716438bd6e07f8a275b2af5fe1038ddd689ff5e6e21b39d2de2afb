"use strict";

var findRelation = require("./findRelation");
var objUtils     = require("../util/object");
var pathUtils    = require("../util/path");



function absolutize(urlObj, siteUrlObj, options)
{
	findRelation.upToPath(urlObj, siteUrlObj, options);
	
	// Fill in relative URLs
	if (urlObj.extra.relation.minimumScheme) urlObj.scheme = siteUrlObj.scheme;
	if (urlObj.extra.relation.minimumAuth)   urlObj.auth   = siteUrlObj.auth;
	if (urlObj.extra.relation.minimumHost)   urlObj.host   = objUtils.clone(siteUrlObj.host);
	if (urlObj.extra.relation.minimumPort)   copyPort(urlObj, siteUrlObj);
	if (urlObj.extra.relation.minimumScheme) copyPath(urlObj, siteUrlObj);
	
	// Check remaining relativeness now that path has been copied and/or resolved
	findRelation.pathOn(urlObj, siteUrlObj, options);
	
	// Fill in relative URLs
	if (urlObj.extra.relation.minimumResource) copyResource(urlObj, siteUrlObj);
	if (urlObj.extra.relation.minimumQuery)    urlObj.query = objUtils.clone(siteUrlObj.query);
	if (urlObj.extra.relation.minimumHash)     urlObj.hash  = siteUrlObj.hash;
}



/*
	Get an absolute path that's relative to site url.
*/
function copyPath(urlObj, siteUrlObj)
{
	if (urlObj.extra.relation.maximumHost || !urlObj.extra.hrefInfo.minimumResourceOnly)
	{
		var pathArray = urlObj.path.absolute.array;
		var pathString = "/";
		
		// If not erroneous URL
		if (pathArray)
		{
			// If is relative path
			if (urlObj.extra.hrefInfo.minimumPathOnly && urlObj.path.absolute.string.indexOf("/")!==0)
			{
				// Append path to site path
				pathArray = siteUrlObj.path.absolute.array.concat(pathArray);
			}
			
			pathArray   = pathUtils.resolveDotSegments(pathArray);
			pathString += pathUtils.join(pathArray);
		}
		else
		{
			pathArray = [];
		}
		
		urlObj.path.absolute.array  = pathArray;
		urlObj.path.absolute.string = pathString;
	}
	else
	{
		// Resource-, query- or hash-only or empty
		urlObj.path = objUtils.clone(siteUrlObj.path);
	}
}



function copyPort(urlObj, siteUrlObj)
{
	urlObj.port = siteUrlObj.port;
	
	urlObj.extra.portIsDefault = siteUrlObj.extra.portIsDefault;
}



function copyResource(urlObj, siteUrlObj)
{
	urlObj.resource = siteUrlObj.resource;
	
	urlObj.extra.resourceIsIndex = siteUrlObj.extra.resourceIsIndex;
}



module.exports = absolutize;
