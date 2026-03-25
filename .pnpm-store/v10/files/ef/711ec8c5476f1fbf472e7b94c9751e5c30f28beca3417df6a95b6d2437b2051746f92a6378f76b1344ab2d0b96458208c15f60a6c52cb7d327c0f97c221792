"use strict";

var _parseUrl = require("url").parse;



/*
	Customize the URL object that Node generates
	because:
	
	* necessary data for later
	* urlObj.host is useless
	* urlObj.hostname is too long
	* urlObj.path is useless
	* urlObj.pathname is too long
	* urlObj.protocol is inaccurate; should be called "scheme"
	* urlObj.search is mostly useless
*/
function clean(urlObj)
{
	var scheme = urlObj.protocol;
	
	if (scheme)
	{
		// Remove ":" suffix
		if (scheme.indexOf(":") === scheme.length-1)
		{
			scheme = scheme.substr(0, scheme.length-1);
		}
	}
	
	urlObj.host =
	{
		// TODO :: unescape(encodeURIComponent(s)) ? ... http://ecmanaut.blogspot.ca/2006/07/encoding-decoding-utf8-in-javascript.html
		full: urlObj.hostname,
		stripped: null
	};
	
	urlObj.path =
	{
		absolute:
		{
			array: null,
			string: urlObj.pathname
		},
		relative:
		{
			array: null,
			string: null
		}
	};
	
	urlObj.query =
	{
		object: urlObj.query,
		string:
		{
			full: null,
			stripped: null
		}
	};
	
	urlObj.extra =
	{
		hrefInfo:
		{
			minimumPathOnly: null,
			minimumResourceOnly: null,
			minimumQueryOnly: null,
			minimumHashOnly: null,
			empty: null,
			
			separatorOnlyQuery: urlObj.search==="?"
		},
		portIsDefault: null,
		relation:
		{
			maximumScheme: null,
			maximumAuth: null,
			maximumHost: null,
			maximumPort: null,
			maximumPath: null,
			maximumResource: null,
			maximumQuery: null,
			maximumHash: null,
			
			minimumScheme: null,
			minimumAuth: null,
			minimumHost: null,
			minimumPort: null,
			minimumPath: null,
			minimumResource: null,
			minimumQuery: null,
			minimumHash: null,
			
			overridesQuery: null
		},
		resourceIsIndex: null,
		slashes: urlObj.slashes
	};
	
	urlObj.resource = null;
	urlObj.scheme = scheme;
	delete urlObj.hostname;
	delete urlObj.pathname;
	delete urlObj.protocol;
	delete urlObj.search;
	delete urlObj.slashes;
	
	return urlObj;
}



function validScheme(url, options)
{
	var valid = true;
	
	options.rejectedSchemes.every( function(rejectedScheme)
	{
		valid = !(url.indexOf(rejectedScheme+":") === 0);
		
		// Break loop
		return valid;
	});
	
	return valid;
}



function parseUrlString(url, options)
{
	if ( validScheme(url,options) )
	{
		return clean( _parseUrl(url, true, options.slashesDenoteHost) );
	}
	else
	{
		return {href:url, valid:false};
	}
}



module.exports = parseUrlString;
