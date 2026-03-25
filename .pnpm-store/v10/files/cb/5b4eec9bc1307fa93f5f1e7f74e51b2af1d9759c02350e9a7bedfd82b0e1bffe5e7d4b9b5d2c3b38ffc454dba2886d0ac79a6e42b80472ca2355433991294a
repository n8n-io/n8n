"use strict";

var objUtils = require("./util/object");



function getOptions(options, defaults)
{
	if ( objUtils.isPlainObject(options) )
	{
		var newOptions = {};
		
		for (var i in defaults)
		{
			if ( defaults.hasOwnProperty(i) )
			{
				if (options[i] !== undefined)
				{
					newOptions[i] = mergeOption(options[i], defaults[i]);
				}
				else
				{
					newOptions[i] = defaults[i];
				}
			}
		}
		
		return newOptions;
	}
	else
	{
		return defaults;
	}
}



function mergeOption(newValues, defaultValues)
{
	if (defaultValues instanceof Object && newValues instanceof Object)
	{
		if (defaultValues instanceof Array && newValues instanceof Array)
		{
			return defaultValues.concat(newValues);
		}
		else
		{
			return objUtils.shallowMerge(newValues, defaultValues);
		}
	}
	
	return newValues;
}



module.exports = getOptions;
