"use strict";

/*
	Deep-clone an object.
*/
function clone(obj)
{
	if (obj instanceof Object)
	{
		var clonedObj = (obj instanceof Array) ? [] : {};
		
		for (var i in obj)
		{
			if ( obj.hasOwnProperty(i) )
			{
				clonedObj[i] = clone( obj[i] );
			}
		}
		
		return clonedObj;
	}
	
	return obj;
}



/*
	https://github.com/jonschlinkert/is-plain-object
*/
function isPlainObject(obj)
{
	return !!obj && typeof obj==="object" && obj.constructor===Object;
}



/*
	Shallow-merge two objects.
*/
function shallowMerge(target, source)
{
	if (target instanceof Object && source instanceof Object)
	{
		for (var i in source)
		{
			if ( source.hasOwnProperty(i) )
			{
				target[i] = source[i];
			}
		}
	}
	
	return target;
}



module.exports =
{
	clone: clone,
	isPlainObject: isPlainObject,
	shallowMerge: shallowMerge
};
