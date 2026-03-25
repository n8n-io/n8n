"use strict";

var pathUtils = require("../util/path");



/*
	Get a path relative to the site path.
*/
function relatePath(absolutePath, siteAbsolutePath)
{
	var relativePath = [];
	
	// At this point, it's related to the host/port
	var related = true;
	var parentIndex = -1;
	
	// Find parents
	siteAbsolutePath.forEach( function(siteAbsoluteDir, i)
	{
		if (related)
		{
			if (absolutePath[i] !== siteAbsoluteDir)
			{
				related = false;
			}
			else
			{
				parentIndex = i;
			}
		}
		
		if (!related)
		{
			// Up one level
			relativePath.push("..");
		}
	});
	
	// Form path
	absolutePath.forEach( function(dir, i)
	{
		if (i > parentIndex)
		{
			relativePath.push(dir);
		}
	});
	
	return relativePath;
}



function relativize(urlObj, siteUrlObj, options)
{
	if (urlObj.extra.relation.minimumScheme)
	{
		var pathArray = relatePath(urlObj.path.absolute.array, siteUrlObj.path.absolute.array);
		
		urlObj.path.relative.array  = pathArray;
		urlObj.path.relative.string = pathUtils.join(pathArray);
	}
}



module.exports = relativize;
