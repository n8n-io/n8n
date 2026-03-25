"use strict";

function isDirectoryIndex(resource, options)
{
	var verdict = false;
	
	options.directoryIndexes.every( function(index)
	{
		if (index === resource)
		{
			verdict = true;
			return false;
		}
		
		return true;
	});
	
	return verdict;
}



function parsePath(urlObj, options)
{
	var path = urlObj.path.absolute.string;
	
	if (path)
	{
		var lastSlash = path.lastIndexOf("/");
		
		if (lastSlash > -1)
		{
			if (++lastSlash < path.length)
			{
				var resource = path.substr(lastSlash);
				
				if (resource!=="." && resource!=="..")
				{
					urlObj.resource = resource;
					path = path.substr(0, lastSlash);
				}
				else
				{
					path += "/";
				}
			}
			
			urlObj.path.absolute.string = path;
			urlObj.path.absolute.array = splitPath(path);
		}
		else if (path==="." || path==="..")
		{
			// "..?var", "..#anchor", etc ... not "..index.html"
			path += "/";
			
			urlObj.path.absolute.string = path;
			urlObj.path.absolute.array = splitPath(path);
		}
		else
		{
			// Resource-only
			urlObj.resource = path;
			urlObj.path.absolute.string = null;
		}
		
		urlObj.extra.resourceIsIndex = isDirectoryIndex(urlObj.resource, options);
	}
	// Else: query/hash-only or empty
}



function splitPath(path)
{
	// TWEAK :: condition only for speed optimization
	if (path !== "/")
	{
		var cleaned = [];
		
		path.split("/").forEach( function(dir)
		{
			// Cleanup -- splitting "/dir/" becomes ["","dir",""]
			if (dir !== "")
			{
				cleaned.push(dir);
			}
		});
		
		return cleaned;
	}
	else
	{
		// Faster to skip the above block and just create an array
		return [];
	}
}



module.exports = parsePath;
