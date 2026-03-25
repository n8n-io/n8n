/*
Copyright (c) 2010 Jeremy Faivre

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
(function(){
/**
 * Exception class thrown when an error occurs during parsing.
 *
 * @author Fabien Potencier <fabien@symfony.com>
 *
 * @api
 */
 
/**
 * Constructor.
 *
 * @param string	message	The error message
 * @param integer   parsedLine The line where the error occurred
 * @param integer   snippet	The snippet of code near the problem
 * @param string	parsedFile The file name where the error occurred
 */

var YamlParseException = function(message, parsedLine, snippet, parsedFile){

		this.rawMessage = message;
		this.parsedLine = (parsedLine !== undefined) ? parsedLine : -1;
		this.snippet = (snippet !== undefined) ? snippet : null;
		this.parsedFile = (parsedFile !== undefined) ? parsedFile : null;

		this.updateRepr();
		
		this.message = message;

};
YamlParseException.prototype =
{

	name: 'YamlParseException',
	message: null,
	
	parsedFile: null,
	parsedLine: -1,
	snippet: null,
	rawMessage: null,

	isDefined: function(input)
	{
		return input != undefined && input != null;
	},

	/**
	* Gets the snippet of code near the error.
	*
	* @return string The snippet of code
	*/
	getSnippet: function()
	{
		return this.snippet;
	},

	/**
	* Sets the snippet of code near the error.
	*
	* @param string snippet The code snippet
	*/
	setSnippet: function(snippet)
	{
		this.snippet = snippet;

		this.updateRepr();
	},

	/**
	* Gets the filename where the error occurred.
	*
	* This method returns null if a string is parsed.
	*
	* @return string The filename
	*/
	getParsedFile: function()
	{
		return this.parsedFile;
	},

	/**
	* Sets the filename where the error occurred.
	*
	* @param string parsedFile The filename
	*/
	setParsedFile: function(parsedFile)
	{
		this.parsedFile = parsedFile;

		this.updateRepr();
	},

	/**
	* Gets the line where the error occurred.
	*
	* @return integer The file line
	*/
	getParsedLine: function()
	{
		return this.parsedLine;
	},

	/**
	* Sets the line where the error occurred.
	*
	* @param integer parsedLine The file line
	*/
	setParsedLine: function(parsedLine)
	{
		this.parsedLine = parsedLine;

		this.updateRepr();
	},

	updateRepr: function()
	{
		this.message = this.rawMessage;

		var dot = false;
		if ('.' === this.message.charAt(this.message.length - 1)) {
			this.message = this.message.substring(0, this.message.length - 1);
			dot = true;
		}

		if (null !== this.parsedFile) {
			this.message += ' in ' + JSON.stringify(this.parsedFile);
		}

		if (this.parsedLine >= 0) {
			this.message += ' at line ' + this.parsedLine;
		}

		if (this.snippet) {
			this.message += ' (near "' + this.snippet + '")';
		}

		if (dot) {
			this.message += '.';
		}
	}
}
/**
 * Yaml offers convenience methods to parse and dump YAML.
 *
 * @author Fabien Potencier <fabien@symfony.com>
 *
 * @api
 */

var YamlRunningUnderNode = false;
var Yaml = function(){};
Yaml.prototype =
{

	/**
	 * Parses YAML into a JS representation.
	 *
	 * The parse method, when supplied with a YAML stream (file),
	 * will do its best to convert YAML in a file into a JS representation.
	 *
	 *	Usage:
	 *	<code>
	 *	 obj = yaml.parseFile('config.yml');
	 *	</code>
	 *
	 * @param string input Path of YAML file
	 *
	 * @return array The YAML converted to a JS representation
	 *
	 * @throws YamlParseException If the YAML is not valid
	 */
	parseFile: function(file /* String */, callback /* Function */)
	{
		if ( callback == null )
		{
			var input = this.getFileContents(file);
			var ret = null;
			try
			{
				ret = this.parse(input);
			}
			catch ( e )
			{
				if ( e instanceof YamlParseException ) {
					e.setParsedFile(file);
				}
				throw e;
			}
			return ret;
		}
		
		this.getFileContents(file, function(data)
		{
			callback(new Yaml().parse(data));
		});
	},

	/**
	 * Parses YAML into a JS representation.
	 *
	 * The parse method, when supplied with a YAML stream (string),
	 * will do its best to convert YAML into a JS representation.
	 *
	 *	Usage:
	 *	<code>
	 *	 obj = yaml.parse(...);
	 *	</code>
	 *
	 * @param string input string containing YAML
	 *
	 * @return array The YAML converted to a JS representation
	 *
	 * @throws YamlParseException If the YAML is not valid
	 */
	parse: function(input /* String */)
	{
		var yaml = new YamlParser();

		return yaml.parse(input);
	},

	/**
	 * Dumps a JS representation to a YAML string.
	 *
	 * The dump method, when supplied with an array, will do its best
	 * to convert the array into friendly YAML.
	 *
	 * @param array	 array JS representation
	 * @param integer inline The level where you switch to inline YAML
	 *
	 * @return string A YAML string representing the original JS representation
    *
    * @api
    */
	dump: function(array, inline, spaces)
	{
		if ( inline == null ) inline = 2;

		var yaml = new YamlDumper();
		if (spaces) {
		    yaml.numSpacesForIndentation = spaces;
		}

		return yaml.dump(array, inline);
	},
	
	getXHR: function()
	{
		if ( window.XMLHttpRequest )
			return new XMLHttpRequest();
		 
		if ( window.ActiveXObject )
		{
			var names = [
			"Msxml2.XMLHTTP.6.0",
			"Msxml2.XMLHTTP.3.0",
			"Msxml2.XMLHTTP",
			"Microsoft.XMLHTTP"
			];
			
			for ( var i = 0; i < 4; i++ )
			{
				try{ return new ActiveXObject(names[i]); }
				catch(e){}
			}
		}
		return null;
	},
	
	getFileContents: function(file, callback)
	{
	    if ( YamlRunningUnderNode )
	    {
	        var fs = require('fs');
	        if ( callback == null )
	        {
	            var data = fs.readFileSync(file);
	            if (data == null) return null;
	            return ''+data;
	        }
	        else
	        {
	            fs.readFile(file, function(err, data)
	            {
	                if (err)
	                    callback(null);
	                else
	                    callback(data);
	            });
	        }
	    }
	    else
	    {
    		var request = this.getXHR();
		
    		// Sync
    		if ( callback == null )
    		{
    			request.open('GET', file, false);                  
    			request.send(null);

    			if ( request.status == 200 || request.status == 0 )
    				return request.responseText;
			
    			return null;
    		}
		
    		// Async
    		request.onreadystatechange = function()
    		{
    			if ( request.readyState == 4 )
    				if ( request.status == 200 || request.status == 0 )
    					callback(request.responseText);
    				else
    					callback(null);
    		};
    		request.open('GET', file, true);                  
    		request.send(null);
	    }
	}
};

var YAML =
{
	/*
	 * @param integer inline The level where you switch to inline YAML
	 */
	 
	stringify: function(input, inline, spaces)
	{
		return new Yaml().dump(input, inline, spaces);
	},
	
	parse: function(input)
	{
		return new Yaml().parse(input);
	},
	
	load: function(file, callback)
	{
		return new Yaml().parseFile(file, callback);
	}
};

// Handle node.js case
if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = YAML;
        YamlRunningUnderNode = true;
        
        // Add require handler
        (function () {
            var require_handler = function (module, filename) {
                // fill in result
                module.exports = YAML.load(filename);
            };

            // register require extensions only if we're on node.js
            // hack for browserify
            if ( undefined !== require.extensions ) {
                require.extensions['.yml'] = require_handler;
                require.extensions['.yaml'] = require_handler;
            }
        }());
    }
}

// Handle browser case
if ( typeof(window) != "undefined" )
{
    window.YAML = YAML;
}

/**
 * YamlInline implements a YAML parser/dumper for the YAML inline syntax.
 */
var YamlInline = function(){};
YamlInline.prototype =
{
	i: null,
	
	/**
	 * Convert a YAML string to a JS object.
	 *
	 * @param string value A YAML string
	 *
	 * @return object A JS object representing the YAML string
	 */
	parse: function(value)
	{
		var result = null;
		value = this.trim(value);

		if ( 0 == value.length )
		{
			return '';
		}

		switch ( value.charAt(0) )
		{
			case '[':
				result = this.parseSequence(value);
				break;
			case '{':
				result = this.parseMapping(value);
				break;
			default:
				result = this.parseScalar(value);
		}

		// some comment can end the scalar
		if ( value.substr(this.i+1).replace(/^\s*#.*$/, '') != '' ) {
		    console.log("oups "+value.substr(this.i+1));
			throw new YamlParseException('Unexpected characters near "'+value.substr(this.i)+'".');
		}

		return result;
	},

	/**
	 * Dumps a given JS variable to a YAML string.
	 *
	 * @param mixed value The JS variable to convert
	 *
	 * @return string The YAML string representing the JS object
	 */
	dump: function(value)
	{
		if ( undefined == value || null == value )
			return 'null';	
		if ( value instanceof Date)
			return value.toISOString();
		if ( typeof(value) == 'object')
			return this.dumpObject(value);
		if ( typeof(value) == 'boolean' )
			return value ? 'true' : 'false';
		if ( /^\d+$/.test(value) )
			return typeof(value) == 'string' ? "'"+value+"'" : parseInt(value);
		if ( this.isNumeric(value) )
			return typeof(value) == 'string' ? "'"+value+"'" : parseFloat(value);
		if ( typeof(value) == 'number' )
			return value == Infinity ? '.Inf' : ( value == -Infinity ? '-.Inf' : ( isNaN(value) ? '.NAN' : value ) );
		var yaml = new YamlEscaper();
		if ( yaml.requiresDoubleQuoting(value) )
			return yaml.escapeWithDoubleQuotes(value);
		if ( yaml.requiresSingleQuoting(value) )
			return yaml.escapeWithSingleQuotes(value);
		if ( '' == value )
			return '""';
		if ( this.getTimestampRegex().test(value) )
			return "'"+value+"'";
		if ( this.inArray(value.toLowerCase(), ['null','~','true','false']) )
			return "'"+value+"'";
		// default
			return value;
	},

	/**
	 * Dumps a JS object to a YAML string.
	 *
	 * @param object value The JS array to dump
	 *
	 * @return string The YAML string representing the JS object
	 */
	dumpObject: function(value)
	{
		var keys = this.getKeys(value);
		var output = null;
		var i;
		var len = keys.length;

		// array
		if ( value instanceof Array )
			/*( 1 == len && '0' == keys[0] )
			||
			( len > 1 && this.reduceArray(keys, function(v,w){return Math.floor(v+w);}, 0) == len * (len - 1) / 2) )*/
		{
			output = [];
			for ( i = 0; i < len; i++ )
			{
				output.push(this.dump(value[keys[i]]));
			}

			return '['+output.join(', ')+']';
		}

		// mapping
		output = [];
		for ( i = 0; i < len; i++ )
		{
			output.push(this.dump(keys[i])+': '+this.dump(value[keys[i]]));
		}

		return '{ '+output.join(', ')+' }';
	},

	/**
	 * Parses a scalar to a YAML string.
	 *
	 * @param scalar scalar
	 * @param string delimiters
	 * @param object stringDelimiters
	 * @param integer i
	 * @param boolean evaluate
	 *
	 * @return string A YAML string
	 *
	 * @throws YamlParseException When malformed inline YAML string is parsed
	 */
	parseScalar: function(scalar, delimiters, stringDelimiters, i, evaluate)
	{
		if ( delimiters == undefined ) delimiters = null;
		if ( stringDelimiters == undefined ) stringDelimiters = ['"', "'"];
		if ( i == undefined ) i = 0;
		if ( evaluate == undefined ) evaluate = true;
		
		var output = null;
		var pos = null;
		var matches = null;
		
		if ( this.inArray(scalar[i], stringDelimiters) )
		{
			// quoted scalar
			output = this.parseQuotedScalar(scalar, i);
			i = this.i;
			if (null !== delimiters) {
				var tmp = scalar.substr(i).replace(/^\s+/, '');
				if (!this.inArray(tmp.charAt(0), delimiters)) {
					throw new YamlParseException('Unexpected characters ('+scalar.substr(i)+').');
				}
			}
		}
		else
		{
			// "normal" string
			if ( !delimiters )
			{
				output = (scalar+'').substring(i);
				
				i += output.length;

				// remove comments
				pos = output.indexOf(' #');
				if ( pos != -1 )
				{
					output = output.substr(0, pos).replace(/\s+$/g,'');
				}
			}
			else if ( matches = new RegExp('^(.+?)('+delimiters.join('|')+')').exec((scalar+'').substring(i)) )
			{
				output = matches[1];
				i += output.length;
			}
			else
			{
				throw new YamlParseException('Malformed inline YAML string ('+scalar+').');
			}
			output = evaluate ? this.evaluateScalar(output) : output;
		}

		this.i = i;
		
		return output;
	},

	/**
	 * Parses a quoted scalar to YAML.
	 *
	 * @param string	scalar
	 * @param integer i
	 *
	 * @return string A YAML string
	 *
	 * @throws YamlParseException When malformed inline YAML string is parsed
	 */
	parseQuotedScalar: function(scalar, i)
	{
		var matches = null;
		//var item = /^(.*?)['"]\s*(?:[,:]|[}\]]\s*,)/.exec((scalar+'').substring(i))[1];
		
		if ( !(matches = new RegExp('^'+YamlInline.REGEX_QUOTED_STRING).exec((scalar+'').substring(i))) )
		{
			throw new YamlParseException('Malformed inline YAML string ('+(scalar+'').substring(i)+').');
		}

		var output = matches[0].substr(1, matches[0].length - 2);
		
		var unescaper = new YamlUnescaper();

		if ( '"' == (scalar+'').charAt(i) )
		{
			output = unescaper.unescapeDoubleQuotedString(output);
		}
		else
		{
			output = unescaper.unescapeSingleQuotedString(output);
		}

		i += matches[0].length;

		this.i = i;
		return output;
	},

	/**
	 * Parses a sequence to a YAML string.
	 *
	 * @param string sequence
	 * @param integer i
	 *
	 * @return string A YAML string
	 *
	 * @throws YamlParseException When malformed inline YAML string is parsed
	 */
	parseSequence: function(sequence, i)
	{
		if ( i == undefined ) i = 0;
		
		var output = [];
		var len = sequence.length;
		i += 1;

		// [foo, bar, ...]
		while ( i < len )
		{
			switch ( sequence.charAt(i) )
			{
				case '[':
					// nested sequence
					output.push(this.parseSequence(sequence, i));
					i = this.i;
					break;
				case '{':
					// nested mapping
					output.push(this.parseMapping(sequence, i));
					i = this.i;
					break;
				case ']':
					this.i = i;
					return output;
				case ',':
				case ' ':
					break;
				default:
					var isQuoted = this.inArray(sequence.charAt(i), ['"', "'"]);
					var value = this.parseScalar(sequence, [',', ']'], ['"', "'"], i);
					i = this.i;
					
					if ( !isQuoted && (value+'').indexOf(': ') != -1 )
					{
						// embedded mapping?
						try
						{
							value = this.parseMapping('{'+value+'}');
						}
						catch ( e )
						{
							if ( !(e instanceof YamlParseException ) ) throw e;
							// no, it's not
						}
					}

					output.push(value);

					i--;
			}

			i++;
		}

		throw new YamlParseException('Malformed inline YAML string "'+sequence+'"');
	},

	/**
	 * Parses a mapping to a YAML string.
	 *
	 * @param string mapping
	 * @param integer i
	 *
	 * @return string A YAML string
	 *
	 * @throws YamlParseException When malformed inline YAML string is parsed
	 */
	parseMapping: function(mapping, i)
	{
		if ( i == undefined ) i = 0;
		var output = {};
		var len = mapping.length;
		i += 1;
		var done = false;
		var doContinue = false;

		// {foo: bar, bar:foo, ...}
		while ( i < len )
		{
			doContinue = false;
			
			switch ( mapping.charAt(i) )
			{
				case ' ':
				case ',':
					i++;
					doContinue = true;
					break;
				case '}':
					this.i = i;
					return output;
			}
			
			if ( doContinue ) continue;

			// key
			var key = this.parseScalar(mapping, [':', ' '], ['"', "'"], i, false);
			i = this.i;

			// value
			done = false;
			while ( i < len )
			{
				switch ( mapping.charAt(i) )
				{
					case '[':
						// nested sequence
						output[key] = this.parseSequence(mapping, i);
						i = this.i;
						done = true;
						break;
					case '{':
						// nested mapping
						output[key] = this.parseMapping(mapping, i);
						i = this.i;
						done = true;
						break;
					case ':':
					case ' ':
						break;
					default:
						output[key] = this.parseScalar(mapping, [',', '}'], ['"', "'"], i);
						i = this.i;
						done = true;
						i--;
				}

				++i;

				if ( done )
				{
					doContinue = true;
					break;
				}
			}
			
			if ( doContinue ) continue;
		}

		throw new YamlParseException('Malformed inline YAML string "'+mapping+'"');
	},

	/**
	 * Evaluates scalars and replaces magic values.
	 *
	 * @param string scalar
	 *
	 * @return string A YAML string
	 */
	evaluateScalar: function(scalar)
	{
		scalar = this.trim(scalar);
		
		var raw = null;
		var cast = null;

		if (	( 'null' == scalar.toLowerCase() ) ||
				( '' == scalar ) ||
				( '~' == scalar ) )
			return null;
		if ( (scalar+'').indexOf('!str ') == 0 )
			return (''+scalar).substring(5);
		if ( (scalar+'').indexOf('! ') == 0 )
			return parseInt(this.parseScalar((scalar+'').substr(2)));
		if ( /^\d+$/.test(scalar) )
		{
			raw = scalar;
			cast = parseInt(scalar);
			return '0' == scalar.charAt(0) ? this.octdec(scalar) : (( ''+raw == ''+cast ) ? cast : raw);
		}
		if ( 'true' == (scalar+'').toLowerCase() )
			return true;
		if ( 'false' == (scalar+'').toLowerCase() )
			return false;
		if ( this.isNumeric(scalar) )
			return '0x' == (scalar+'').substr(0, 2) ? this.hexdec(scalar) : parseFloat(scalar);
		if ( scalar.toLowerCase() == '.inf' )
			return Infinity;
		if ( scalar.toLowerCase() == '.nan' )
			return NaN;
		if ( scalar.toLowerCase() == '-.inf' )
			return -Infinity;
		if ( /^(-|\+)?[0-9,]+(\.[0-9]+)?$/.test(scalar) )
			return parseFloat(scalar.split(',').join(''));
		if ( this.getTimestampRegex().test(scalar) )
			return new Date(this.strtotime(scalar));
		//else
			return ''+scalar;
	},

	/**
	 * Gets a regex that matches an unix timestamp
	 *
	 * @return string The regular expression
	 */
	getTimestampRegex: function()
	{
		return new RegExp('^'+
		'([0-9][0-9][0-9][0-9])'+
		'-([0-9][0-9]?)'+
		'-([0-9][0-9]?)'+
		'(?:(?:[Tt]|[ \t]+)'+
		'([0-9][0-9]?)'+
		':([0-9][0-9])'+
		':([0-9][0-9])'+
		'(?:\.([0-9]*))?'+
		'(?:[ \t]*(Z|([-+])([0-9][0-9]?)'+
		'(?::([0-9][0-9]))?))?)?'+
		'$','gi');
	},
	
	trim: function(str /* String */)
	{
		return (str+'').replace(/^\s+/,'').replace(/\s+$/,'');
	},
	
	isNumeric: function(input)
	{
		return (input - 0) == input && input.length > 0 && input.replace(/\s+/g,'') != '';
	},
	
	inArray: function(key, tab)
	{
		var i;
		var len = tab.length;
		for ( i = 0; i < len; i++ )
		{
			if ( key == tab[i] ) return true;
		}
		return false;
	},
	
	getKeys: function(tab)
	{
		var ret = [];
		
		for ( var name in tab )
		{
			if ( tab.hasOwnProperty(name) )
			{
				ret.push(name);
			}
		}
		
		return ret;
	},
	
	/*reduceArray: function(tab, fun)
	{
		var len = tab.length;
		if (typeof fun != "function")
			throw new YamlParseException("fun is not a function");
		
		// no value to return if no initial value and an empty array
		if (len == 0 && arguments.length == 1)
			throw new YamlParseException("empty array");
		
		var i = 0;
		if (arguments.length >= 2)
		{
			var rv = arguments[1];
		}
		else
		{
			do
			{
				if (i in tab)
				{
					rv = tab[i++];
					break;
				}
		
				// if array contains no values, no initial value to return
				if (++i >= len)
					throw new YamlParseException("no initial value to return");
			}
			while (true);
		}

		for (; i < len; i++)
		{
			if (i in tab)
				rv = fun.call(null, rv, tab[i], i, tab);
		}

		return rv;
	},*/
	
	octdec: function(input)
	{
	    return parseInt((input+'').replace(/[^0-7]/gi, ''), 8);
	},
	
	hexdec: function(input)
	{
		input = this.trim(input);
		if ( (input+'').substr(0, 2) == '0x' ) input = (input+'').substring(2);
	    return parseInt((input+'').replace(/[^a-f0-9]/gi, ''), 16);
	},
	
	/**
	 * @see http://phpjs.org/functions/strtotime
	 * @note we need timestamp with msecs so /1000 removed
	 * @note original contained binary | 0 (wtf?!) everywhere, which messes everything up 
	 */
	strtotime: function (h,b){var f,c,g,k,d="";h=(h+"").replace(/\s{2,}|^\s|\s$/g," ").replace(/[\t\r\n]/g,"");if(h==="now"){return b===null||isNaN(b)?new Date().getTime()||0:b||0}else{if(!isNaN(d=Date.parse(h))){return d||0}else{if(b){b=new Date(b)}else{b=new Date()}}}h=h.toLowerCase();var e={day:{sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6},mon:["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]};var a=function(i){var o=(i[2]&&i[2]==="ago");var n=(n=i[0]==="last"?-1:1)*(o?-1:1);switch(i[0]){case"last":case"next":switch(i[1].substring(0,3)){case"yea":b.setFullYear(b.getFullYear()+n);break;case"wee":b.setDate(b.getDate()+(n*7));break;case"day":b.setDate(b.getDate()+n);break;case"hou":b.setHours(b.getHours()+n);break;case"min":b.setMinutes(b.getMinutes()+n);break;case"sec":b.setSeconds(b.getSeconds()+n);break;case"mon":if(i[1]==="month"){b.setMonth(b.getMonth()+n);break}default:var l=e.day[i[1].substring(0,3)];if(typeof l!=="undefined"){var p=l-b.getDay();if(p===0){p=7*n}else{if(p>0){if(i[0]==="last"){p-=7}}else{if(i[0]==="next"){p+=7}}}b.setDate(b.getDate()+p);b.setHours(0,0,0,0)}}break;default:if(/\d+/.test(i[0])){n*=parseInt(i[0],10);switch(i[1].substring(0,3)){case"yea":b.setFullYear(b.getFullYear()+n);break;case"mon":b.setMonth(b.getMonth()+n);break;case"wee":b.setDate(b.getDate()+(n*7));break;case"day":b.setDate(b.getDate()+n);break;case"hou":b.setHours(b.getHours()+n);break;case"min":b.setMinutes(b.getMinutes()+n);break;case"sec":b.setSeconds(b.getSeconds()+n);break}}else{return false}break}return true};g=h.match(/^(\d{2,4}-\d{2}-\d{2})(?:\s(\d{1,2}:\d{2}(:\d{2})?)?(?:\.(\d+))?)?$/);if(g!==null){if(!g[2]){g[2]="00:00:00"}else{if(!g[3]){g[2]+=":00"}}k=g[1].split(/-/g);k[1]=e.mon[k[1]-1]||k[1];k[0]=+k[0];k[0]=(k[0]>=0&&k[0]<=69)?"20"+(k[0]<10?"0"+k[0]:k[0]+""):(k[0]>=70&&k[0]<=99)?"19"+k[0]:k[0]+"";return parseInt(this.strtotime(k[2]+" "+k[1]+" "+k[0]+" "+g[2])+(g[4]?g[4]:""),10)}var j="([+-]?\\d+\\s(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday)|(last|next)\\s(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday))(\\sago)?";g=h.match(new RegExp(j,"gi"));if(g===null){return false}for(f=0,c=g.length;f<c;f++){if(!a(g[f].split(" "))){return false}}return b.getTime()||0}
	 
};

/*
 * @note uses only non-capturing sub-patterns (unlike PHP original)
 */
YamlInline.REGEX_QUOTED_STRING = '(?:"(?:[^"\\\\]*(?:\\\\.[^"\\\\]*)*)"|\'(?:[^\']*(?:\'\'[^\']*)*)\')';


/**
 * YamlParser parses YAML strings to convert them to JS objects
 * (port of Yaml Symfony Component)
 */
var YamlParser = function(offset /* Integer */)
{
		this.offset = (offset !== undefined) ? offset : 0;
};
YamlParser.prototype =
{
	offset: 0,
	lines: [],
	currentLineNb: -1,
	currentLine: '',
	refs: {},
	
	/**
	 * Parses a YAML string to a JS value.
	 *
	 * @param String value A YAML string
	 *
	 * @return mixed A JS value
	 */
	parse: function(value /* String */)
	{
		this.currentLineNb = -1;
		this.currentLine = '';
		this.lines = this.cleanup(value).split("\n");
		
		var data = null;
      var context = null;
      		
		while ( this.moveToNextLine() )
		{
			if ( this.isCurrentLineEmpty() )
			{
				continue;
			}
			
			// tab?
			if ( this.currentLine.charAt(0) == '\t' )
			{
				throw new YamlParseException('A YAML file cannot contain tabs as indentation.', this.getRealCurrentLineNb() + 1, this.currentLine);
			}
			
			var isRef = false;
			var isInPlace = false;
			var isProcessed = false;
			var values = null;
			var matches = null;
			var c = null;
			var parser = null;
			var block = null;
			var key = null;
			var parsed = null;
			var len = null;
			var reverse = null;
			
			if ( values = /^\-((\s+)(.+?))?\s*$/.exec(this.currentLine) )
			{

				if (context && 'mapping' == context) {
					throw new YamlParseException('You cannot define a sequence item when in a mapping', this.getRealCurrentLineNb() + 1, this.currentLine);
				}
				context = 'sequence';

				if ( !this.isDefined(data) ) data = [];
				//if ( !(data instanceof Array) ) throw new YamlParseException("Non array entry", this.getRealCurrentLineNb() + 1, this.currentLine);
				
				values = {leadspaces: values[2], value: values[3]};
				
				if ( this.isDefined(values.value) && ( matches = /^&([^ ]+) *(.*)/.exec(values.value) ) )
				{
					matches = {ref: matches[1], value: matches[2]};
					isRef = matches.ref;
					values.value = matches.value;
				}
				
				// array
				if ( !this.isDefined(values.value) || '' == this.trim(values.value) || values.value.replace(/^ +/,'').charAt(0) == '#' )
				{
					c = this.getRealCurrentLineNb() + 1;
					parser = new YamlParser(c);
					parser.refs = this.refs;
					data.push(parser.parse(this.getNextEmbedBlock()));
					this.refs = parser.refs;
				}
				else
				{
					if ( this.isDefined(values.leadspaces) && 
						' ' == values.leadspaces && 
						( matches = new RegExp('^('+YamlInline.REGEX_QUOTED_STRING+'|[^ \'"\{\[].*?) *\:(\\s+(.+?))?\\s*$').exec(values.value) ) 
					) {
						matches = {key: matches[1], value: matches[3]};
						// this is a compact notation element, add to next block and parse
						c = this.getRealCurrentLineNb();
						parser = new YamlParser(c);
						parser.refs = this.refs;
						block = values.value;
						
						if ( !this.isNextLineIndented() )
						{
							block += "\n"+this.getNextEmbedBlock(this.getCurrentLineIndentation() + 2);
						}

						data.push(parser.parse(block));
						this.refs = parser.refs;
					}
					else
					{
						data.push(this.parseValue(values.value));
					}
				}
			}
			else if ( values = new RegExp('^('+YamlInline.REGEX_QUOTED_STRING+'|[^ \'"\[\{].*?) *\:(\\s+(.+?))?\\s*$').exec(this.currentLine) )
			{
				if ( !this.isDefined(data) ) data = {};
				if (context && 'sequence' == context) {
					throw new YamlParseException('You cannot define a mapping item when in a sequence', this.getRealCurrentLineNb() + 1, this.currentLine);
				}
				context = 'mapping';				
				//if ( data instanceof Array ) throw new YamlParseException("Non mapped entry", this.getRealCurrentLineNb() + 1, this.currentLine);
				
				values = {key: values[1], value: values[3]};
				
				try {
					key = new YamlInline().parseScalar(values.key);
				} catch (e) {
					if ( e instanceof YamlParseException ) {
						e.setParsedLine(this.getRealCurrentLineNb() + 1);
						e.setSnippet(this.currentLine);
					}
					throw e;
				}				
				
				
				if ( '<<' == key )
				{
					if ( this.isDefined(values.value) && '*' == (values.value+'').charAt(0) )
					{
						isInPlace = values.value.substr(1);
						if ( this.refs[isInPlace] == undefined )
						{
							throw new YamlParseException('Reference "'+value+'" does not exist', this.getRealCurrentLineNb() + 1, this.currentLine);
						}
					}
					else
					{
						if ( this.isDefined(values.value) && values.value != '' )
						{
							value = values.value;
						}
						else
						{
							value = this.getNextEmbedBlock();
						}
						
						c = this.getRealCurrentLineNb() + 1;
						parser = new YamlParser(c);
						parser.refs = this.refs;
						parsed = parser.parse(value);
						this.refs = parser.refs;
				
						var merged = [];
						if ( !this.isObject(parsed) )
						{
							throw new YamlParseException("YAML merge keys used with a scalar value instead of an array", this.getRealCurrentLineNb() + 1, this.currentLine);
						}
						else if ( this.isDefined(parsed[0]) )
						{
							// Numeric array, merge individual elements
							reverse = this.reverseArray(parsed);
							len = reverse.length;
							for ( var i = 0; i < len; i++ )
							{
								var parsedItem = reverse[i];
								if ( !this.isObject(reverse[i]) )
								{
									throw new YamlParseException("Merge items must be arrays", this.getRealCurrentLineNb() + 1, this.currentLine);
								}
								merged = this.mergeObject(reverse[i], merged);
							}
						}
						else
						{
							// Associative array, merge
							merged = this.mergeObject(merged, parsed);
						}
				
						isProcessed = merged;
					}
				}
				else if ( this.isDefined(values.value) && (matches = /^&([^ ]+) *(.*)/.exec(values.value) ) )
				{
					matches = {ref: matches[1], value: matches[2]};
					isRef = matches.ref;
					values.value = matches.value;
				}
				
				if ( isProcessed )
				{
					// Merge keys
					data = isProcessed;
				}
				// hash
				else if ( !this.isDefined(values.value) || '' == this.trim(values.value) || this.trim(values.value).charAt(0) == '#' )
				{
					// if next line is less indented or equal, then it means that the current value is null
					if ( this.isNextLineIndented() && !this.isNextLineUnIndentedCollection() )
					{
						data[key] = null;
					}
					else
					{
						c = this.getRealCurrentLineNb() + 1;
						parser = new YamlParser(c);
						parser.refs = this.refs;
						data[key] = parser.parse(this.getNextEmbedBlock());
						this.refs = parser.refs;
					}
				}
				else
				{
					if ( isInPlace )
					{
						data = this.refs[isInPlace];
					}
					else
					{
						data[key] = this.parseValue(values.value);
					}
				}
			}
			else
			{
				// 1-liner followed by newline
				if ( 2 == this.lines.length && this.isEmpty(this.lines[1]) )
				{
					try {
						value = new YamlInline().parse(this.lines[0]);
					} catch (e) {
						if ( e instanceof YamlParseException ) {
							e.setParsedLine(this.getRealCurrentLineNb() + 1);
							e.setSnippet(this.currentLine);
						}
						throw e;
					}
					
					if ( this.isObject(value) )
					{
						var first = value[0];
						if ( typeof(value) == 'string' && '*' == first.charAt(0) )
						{
							data = [];
							len = value.length;
							for ( var i = 0; i < len; i++ )
							{
								data.push(this.refs[value[i].substr(1)]);
							}
							value = data;
						}
					}
				
					return value;
				}
				
				throw new YamlParseException('Unable to parse.', this.getRealCurrentLineNb() + 1, this.currentLine);
			}
		
			if ( isRef )
			{
				if ( data instanceof Array )
					this.refs[isRef] = data[data.length-1];
				else
				{
					var lastKey = null;
					for ( var k in data )
					{
						if ( data.hasOwnProperty(k) ) lastKey = k;
					}
					this.refs[isRef] = data[k];
				}
			}
		}
		
		return this.isEmpty(data) ? null : data;
	},

	/**
	 * Returns the current line number (takes the offset into account).
	 *
	 * @return integer The current line number
	 */
	getRealCurrentLineNb: function()
	{
		return this.currentLineNb + this.offset;
	},

	/**
	 * Returns the current line indentation.
	 *
	 * @return integer The current line indentation
	 */
	getCurrentLineIndentation: function()
	{
		return this.currentLine.length - this.currentLine.replace(/^ +/g, '').length;
	},

	/**
	 * Returns the next embed block of YAML.
	 *
	 * @param integer indentation The indent level at which the block is to be read, or null for default
	 *
	 * @return string A YAML string
	 *
	 * @throws YamlParseException When indentation problem are detected
	 */
	getNextEmbedBlock: function(indentation)
	{
		this.moveToNextLine();
		var newIndent = null;
		var indent = null;

		if ( !this.isDefined(indentation) )
		{
			newIndent = this.getCurrentLineIndentation();
			
			var unindentedEmbedBlock = this.isStringUnIndentedCollectionItem(this.currentLine);

			if ( !this.isCurrentLineEmpty() && 0 == newIndent && !unindentedEmbedBlock )
			{
				throw new YamlParseException('Indentation problem A', this.getRealCurrentLineNb() + 1, this.currentLine);
			}
		}
		else
		{
			newIndent = indentation;
		}

		var data = [this.currentLine.substr(newIndent)];

		var isUnindentedCollection = this.isStringUnIndentedCollectionItem(this.currentLine);

		var continuationIndent = -1;
		if (isUnindentedCollection === true) {
			continuationIndent = 1 + /^\-((\s+)(.+?))?\s*$/.exec(this.currentLine)[2].length;
		}

		while ( this.moveToNextLine() )
		{

			if (isUnindentedCollection && !this.isStringUnIndentedCollectionItem(this.currentLine) && this.getCurrentLineIndentation() != continuationIndent) {
				this.moveToPreviousLine();
				break;
			}

			if ( this.isCurrentLineEmpty() )
			{
				if ( this.isCurrentLineBlank() )
				{
					data.push(this.currentLine.substr(newIndent));
				}

				continue;
			}

			indent = this.getCurrentLineIndentation();
			var matches;
			if ( matches = /^( *)$/.exec(this.currentLine) )
			{
				// empty line
				data.push(matches[1]);
			}
			else if ( indent >= newIndent )
			{
				data.push(this.currentLine.substr(newIndent));
			}
			else if ( 0 == indent )
			{
				this.moveToPreviousLine();

				break;
			}
			else
			{
				throw new YamlParseException('Indentation problem B', this.getRealCurrentLineNb() + 1, this.currentLine);
			}
		}

		return data.join("\n");
	},

	/**
	 * Moves the parser to the next line.
	 *
	 * @return Boolean
	 */
	moveToNextLine: function()
	{
		if ( this.currentLineNb >= this.lines.length - 1 )
		{
			return false;
		}

		this.currentLineNb++;
		this.currentLine = this.lines[this.currentLineNb];

		return true;
	},

	/**
	 * Moves the parser to the previous line.
	 */
	moveToPreviousLine: function()
	{
		this.currentLineNb--;
		this.currentLine = this.lines[this.currentLineNb];
	},

	/**
	 * Parses a YAML value.
	 *
	 * @param string value A YAML value
	 *
	 * @return mixed A JS value
	 *
	 * @throws YamlParseException When reference does not exist
	 */
	parseValue: function(value)
	{
		if ( '*' == (value+'').charAt(0) )
		{
			if ( this.trim(value).charAt(0) == '#' )
			{
				value = (value+'').substr(1, value.indexOf('#') - 2);
			}
			else
			{
				value = (value+'').substr(1);
			}

			if ( this.refs[value] == undefined )
			{
				throw new YamlParseException('Reference "'+value+'" does not exist', this.getRealCurrentLineNb() + 1, this.currentLine);
			}
			return this.refs[value];
		}

		var matches = null;
		if ( matches = /^(\||>)(\+|\-|\d+|\+\d+|\-\d+|\d+\+|\d+\-)?( +#.*)?$/.exec(value) )
		{
			matches = {separator: matches[1], modifiers: matches[2], comments: matches[3]};
			var modifiers = this.isDefined(matches.modifiers) ? matches.modifiers : '';

			return this.parseFoldedScalar(matches.separator, modifiers.replace(/\d+/g, ''), Math.abs(parseInt(modifiers)));
		}
		try {
			return new YamlInline().parse(value);
		} catch (e) {
			if ( e instanceof YamlParseException ) {
				e.setParsedLine(this.getRealCurrentLineNb() + 1);
				e.setSnippet(this.currentLine);
			}
			throw e;
		}
	},

	/**
	 * Parses a folded scalar.
	 *
	 * @param	string	separator	 The separator that was used to begin this folded scalar (| or >)
	 * @param	string	indicator	 The indicator that was used to begin this folded scalar (+ or -)
	 * @param	integer indentation  The indentation that was used to begin this folded scalar
	 *
	 * @return string	The text value
	 */
	parseFoldedScalar: function(separator, indicator, indentation)
	{
		if ( indicator == undefined ) indicator = '';
		if ( indentation == undefined ) indentation = 0;
		
		separator = '|' == separator ? "\n" : ' ';
		var text = '';
		var diff = null;

		var notEOF = this.moveToNextLine();

		while ( notEOF && this.isCurrentLineBlank() )
		{
			text += "\n";

			notEOF = this.moveToNextLine();
		}

		if ( !notEOF )
		{
			return '';
		}

		var matches = null;
		if ( !(matches = new RegExp('^('+(indentation ? this.strRepeat(' ', indentation) : ' +')+')(.*)$').exec(this.currentLine)) )
		{
			this.moveToPreviousLine();

			return '';
		}
		
		matches = {indent: matches[1], text: matches[2]};
		
		var textIndent = matches.indent;
		var previousIndent = 0;

		text += matches.text + separator;
		while ( this.currentLineNb + 1 < this.lines.length )
		{
			this.moveToNextLine();
			
			if ( matches = new RegExp('^( {'+textIndent.length+',})(.+)$').exec(this.currentLine) )
			{
				matches = {indent: matches[1], text: matches[2]};
				
				if ( ' ' == separator && previousIndent != matches.indent )
				{
					text = text.substr(0, text.length - 1)+"\n";
				}
				
				previousIndent = matches.indent;

				diff = matches.indent.length - textIndent.length;
				text += this.strRepeat(' ', diff) + matches.text + (diff != 0 ? "\n" : separator);
			}
			else if ( matches = /^( *)$/.exec(this.currentLine) )
			{
				text += matches[1].replace(new RegExp('^ {1,'+textIndent.length+'}','g'), '')+"\n";
			}
			else
			{
				this.moveToPreviousLine();

				break;
			}
		}

		if ( ' ' == separator )
		{
			// replace last separator by a newline
			text = text.replace(/ (\n*)$/g, "\n$1");
		}

		switch ( indicator )
		{
			case '':
				text = text.replace(/\n+$/g, "\n");
				break;
			case '+':
				break;
			case '-':
				text = text.replace(/\n+$/g, '');
				break;
		}

		return text;
	},

	/**
	 * Returns true if the next line is indented.
	 *
	 * @return Boolean Returns true if the next line is indented, false otherwise
	 */
	isNextLineIndented: function()
	{
		var currentIndentation = this.getCurrentLineIndentation();
		var notEOF = this.moveToNextLine();

		while ( notEOF && this.isCurrentLineEmpty() )
		{
			notEOF = this.moveToNextLine();
		}

		if ( false == notEOF )
		{
			return false;
		}

		var ret = false;
		if ( this.getCurrentLineIndentation() <= currentIndentation )
		{
			ret = true;
		}

		this.moveToPreviousLine();

		return ret;
	},

	/**
	 * Returns true if the current line is blank or if it is a comment line.
	 *
	 * @return Boolean Returns true if the current line is empty or if it is a comment line, false otherwise
	 */
	isCurrentLineEmpty: function()
	{
		return this.isCurrentLineBlank() || this.isCurrentLineComment();
	},

	/**
	 * Returns true if the current line is blank.
	 *
	 * @return Boolean Returns true if the current line is blank, false otherwise
	 */
	isCurrentLineBlank: function()
	{
		return '' == this.trim(this.currentLine);
	},

	/**
	 * Returns true if the current line is a comment line.
	 *
	 * @return Boolean Returns true if the current line is a comment line, false otherwise
	 */
	isCurrentLineComment: function()
	{
		//checking explicitly the first char of the trim is faster than loops or strpos
		var ltrimmedLine = this.currentLine.replace(/^ +/g, '');
		return ltrimmedLine.charAt(0) == '#';
	},

	/**
	 * Cleanups a YAML string to be parsed.
	 *
	 * @param string value The input YAML string
	 *
	 * @return string A cleaned up YAML string
	 */
	cleanup: function(value)
	{
		value = value.split("\r\n").join("\n").split("\r").join("\n");

		if ( !/\n$/.test(value) )
		{
			value += "\n";
		}

		// strip YAML header
		var count = 0;
		var regex = /^\%YAML[: ][\d\.]+.*\n/;
		while ( regex.test(value) )
		{
			value = value.replace(regex, '');
			count++;
		}
		this.offset += count;

		// remove leading comments
		regex = /^(#.*?\n)+/;
		if ( regex.test(value) )
		{
			var trimmedValue = value.replace(regex, '');
			
			// items have been removed, update the offset
			this.offset += this.subStrCount(value, "\n") - this.subStrCount(trimmedValue, "\n");
			value = trimmedValue;
		}

		// remove start of the document marker (---)
		regex = /^\-\-\-.*?\n/;
		if ( regex.test(value) )
		{
			trimmedValue = value.replace(regex, '');
			
			// items have been removed, update the offset
			this.offset += this.subStrCount(value, "\n") - this.subStrCount(trimmedValue, "\n");
			value = trimmedValue;

			// remove end of the document marker (...)
			value = value.replace(/\.\.\.\s*$/g, '');
		}

		return value;
	},

	/**
	 * Returns true if the next line starts unindented collection
	 *
	 * @return Boolean Returns true if the next line starts unindented collection, false otherwise
	 */
	isNextLineUnIndentedCollection: function()
	{
		var currentIndentation = this.getCurrentLineIndentation();
		var notEOF = this.moveToNextLine();

		while (notEOF && this.isCurrentLineEmpty()) {
			notEOF = this.moveToNextLine();
		}

		if (false === notEOF) {
			return false;
		}

		var ret = false;
		if (
			this.getCurrentLineIndentation() == currentIndentation
			&&
			this.isStringUnIndentedCollectionItem(this.currentLine)
		) {
			ret = true;
		}

		this.moveToPreviousLine();

		return ret;
	},

	/**
	 * Returns true if the string is unindented collection item
	 *
	 * @return Boolean Returns true if the string is unindented collection item, false otherwise
	 */
	isStringUnIndentedCollectionItem: function(string)
	{
		return (0 === this.currentLine.indexOf('- '));
	},
	
	isObject: function(input)
	{
		return typeof(input) == 'object' && this.isDefined(input);
	},
	
	isEmpty: function(input)
	{
		return input == undefined || input == null || input == '' || input == 0 || input == "0" || input == false;
	},
	
	isDefined: function(input)
	{
		return input != undefined && input != null;
	},
	
	reverseArray: function(input /* Array */)
	{
		var result = [];
		var len = input.length;
		for ( var i = len-1; i >= 0; i-- )
		{
			result.push(input[i]);
		}
		
		return result;
	},
	
	merge: function(a /* Object */, b /* Object */)
	{
		var c = {};
		var i;
		
		for ( i in a )
		{
			if ( a.hasOwnProperty(i) )
				if ( /^\d+$/.test(i) ) c.push(a);
				else c[i] = a[i];
		}
		for ( i in b )
		{
			if ( b.hasOwnProperty(i) )
				if ( /^\d+$/.test(i) ) c.push(b);
				else c[i] = b[i];
		}
		
		return c;
	},
	
	strRepeat: function(str /* String */, count /* Integer */)
	{
		var i;
		var result = '';
		for ( i = 0; i < count; i++ ) result += str;
		return result;
	},
	
	subStrCount: function(string, subString, start, length)
	{
		var c = 0;
		
		string = '' + string;
		subString = '' + subString;
		
		if ( start != undefined ) string = string.substr(start);
		if ( length != undefined ) string = string.substr(0, length); 
		
		var len = string.length;
		var sublen = subString.length;
		for ( var i = 0; i < len; i++ )
		{
			if ( subString == string.substr(i, sublen) )
				c++;
				i += sublen - 1;
		}
		
		return c;
	},
	
	trim: function(str /* String */)
	{
		return (str+'').replace(/^ +/,'').replace(/ +$/,'');
	}
};
/**
 * YamlEscaper encapsulates escaping rules for single and double-quoted
 * YAML strings.
 *
 * @author Matthew Lewinski <matthew@lewinski.org>
 */
YamlEscaper = function(){};
YamlEscaper.prototype =
{
	/**
	 * Determines if a JS value would require double quoting in YAML.
	 *
	 * @param string value A JS value
	 *
	 * @return Boolean True if the value would require double quotes.
	 */
	requiresDoubleQuoting: function(value)
	{
		return new RegExp(YamlEscaper.REGEX_CHARACTER_TO_ESCAPE).test(value);
	},

	/**
	 * Escapes and surrounds a JS value with double quotes.
	 *
	 * @param string value A JS value
	 *
	 * @return string The quoted, escaped string
	 */
	escapeWithDoubleQuotes: function(value)
	{
		value = value + '';
		var len = YamlEscaper.escapees.length;
		var maxlen = YamlEscaper.escaped.length;
		var esc = YamlEscaper.escaped;
		for (var i = 0; i < len; ++i)
			if ( i >= maxlen ) esc.push('');

		var ret = '';		
		ret = value.replace(new RegExp(YamlEscaper.escapees.join('|'),'g'), function(str){
			for(var i = 0; i < len; ++i){
				if( str == YamlEscaper.escapees[i] )
					return esc[i];
			}
		});
		return '"' + ret + '"'; 
	},

	/**
	 * Determines if a JS value would require single quoting in YAML.
	 *
	 * @param string value A JS value
	 *
	 * @return Boolean True if the value would require single quotes.
	 */
	requiresSingleQuoting: function(value)
	{
		return /[\s'":{}[\],&*#?]|^[-?|<>=!%@`]/.test(value);
	},

	/**
	 * Escapes and surrounds a JS value with single quotes.
	 *
	 * @param string value A JS value
	 *
	 * @return string The quoted, escaped string
	 */
	escapeWithSingleQuotes : function(value)
	{
		return "'" + value.replace(/'/g, "''") + "'";
	}
};

// Characters that would cause a dumped string to require double quoting.
YamlEscaper.REGEX_CHARACTER_TO_ESCAPE = "[\\x00-\\x1f]|\xc2\x85|\xc2\xa0|\xe2\x80\xa8|\xe2\x80\xa9";

// Mapping arrays for escaping a double quoted string. The backslash is
// first to ensure proper escaping. 
YamlEscaper.escapees = ['\\\\', '\\"', '"',
									 "\x00",  "\x01",  "\x02",  "\x03",  "\x04",  "\x05",  "\x06",  "\x07",
									 "\x08",  "\x09",  "\x0a",  "\x0b",  "\x0c",  "\x0d",  "\x0e",  "\x0f",
									 "\x10",  "\x11",  "\x12",  "\x13",  "\x14",  "\x15",  "\x16",  "\x17",
									 "\x18",  "\x19",  "\x1a",  "\x1b",  "\x1c",  "\x1d",  "\x1e",  "\x1f",
									 "\xc2\x85", "\xc2\xa0", "\xe2\x80\xa8", "\xe2\x80\xa9"];
YamlEscaper.escaped = ['\\"', '\\\\', '\\"',
									 "\\0",   "\\x01", "\\x02", "\\x03", "\\x04", "\\x05", "\\x06", "\\a",
									 "\\b",   "\\t",   "\\n",   "\\v",   "\\f",   "\\r",   "\\x0e", "\\x0f",
									 "\\x10", "\\x11", "\\x12", "\\x13", "\\x14", "\\x15", "\\x16", "\\x17",
									 "\\x18", "\\x19", "\\x1a", "\\e",   "\\x1c", "\\x1d", "\\x1e", "\\x1f",
									 "\\N", "\\_", "\\L", "\\P"];
/**
 * YamlUnescaper encapsulates unescaping rules for single and double-quoted
 * YAML strings.
 *
 * @author Matthew Lewinski <matthew@lewinski.org>
 */
var YamlUnescaper = function(){};
YamlUnescaper.prototype =
{
	/**
	 * Unescapes a single quoted string.
	 *
	 * @param string value A single quoted string.
	 *
	 * @return string The unescaped string.
	 */
	unescapeSingleQuotedString: function(value)
	{
		return value.replace(/''/g, "'");
	},

	/**
	 * Unescapes a double quoted string.
	 *
	 * @param string value A double quoted string.
	 *
	 * @return string The unescaped string.
	 */
	unescapeDoubleQuotedString: function(value)
	{
		var callback = function(m) {
			return new YamlUnescaper().unescapeCharacter(m);
		};

		// evaluate the string
		return value.replace(new RegExp(YamlUnescaper.REGEX_ESCAPED_CHARACTER, 'g'), callback);
	},

	/**
	 * Unescapes a character that was found in a double-quoted string
	 *
	 * @param string value An escaped character
	 *
	 * @return string The unescaped character
	 */
	unescapeCharacter: function(value)
	{
		switch (value.charAt(1)) {
			case '0':
				return String.fromCharCode(0);
			case 'a':
				return String.fromCharCode(7);
			case 'b':
				return String.fromCharCode(8);
			case 't':
				return "\t";
			case "\t":
				return "\t";
			case 'n':
				return "\n";
			case 'v':
				return String.fromCharCode(11);
			case 'f':
				return String.fromCharCode(12);
			case 'r':
				return String.fromCharCode(13);
			case 'e':
				return "\x1b";
			case ' ':
				return ' ';
			case '"':
				return '"';
			case '/':
				return '/';
			case '\\':
				return '\\';
			case 'N':
				// U+0085 NEXT LINE
				return "\x00\x85";
			case '_':
				// U+00A0 NO-BREAK SPACE
				return "\x00\xA0";
			case 'L':
				// U+2028 LINE SEPARATOR
				return "\x20\x28";
			case 'P':
				// U+2029 PARAGRAPH SEPARATOR
				return "\x20\x29";
			case 'x':
				return this.pack('n', new YamlInline().hexdec(value.substr(2, 2)));
			case 'u':
				return this.pack('n', new YamlInline().hexdec(value.substr(2, 4)));
			case 'U':
				return this.pack('N', new YamlInline().hexdec(value.substr(2, 8)));
		}
	},
	
	/**
	 * @see http://phpjs.org/functions/pack
	 * @warning only modes used above copied
	 */
	 pack: function(B){var g=0,o=1,m="",l="",z=0,p=[],E,s,C,I,h,c;var d,b,x,H,u,e,A,q,D,t,w,a,G,F,y,v,f;while(g<B.length){E=B.charAt(g);s="";g++;while((g<B.length)&&(B.charAt(g).match(/[\d\*]/)!==null)){s+=B.charAt(g);g++}if(s===""){s="1"}switch(E){case"n":if(s==="*"){s=arguments.length-o}if(s>(arguments.length-o)){throw new Error("Warning:  pack() Type "+E+": too few arguments")}for(z=0;z<s;z++){m+=String.fromCharCode(arguments[o]>>8&255);m+=String.fromCharCode(arguments[o]&255);o++}break;case"N":if(s==="*"){s=arguments.length-o}if(s>(arguments.length-o)){throw new Error("Warning:  pack() Type "+E+": too few arguments")}for(z=0;z<s;z++){m+=String.fromCharCode(arguments[o]>>24&255);m+=String.fromCharCode(arguments[o]>>16&255);m+=String.fromCharCode(arguments[o]>>8&255);m+=String.fromCharCode(arguments[o]&255);o++}break;default:throw new Error("Warning:  pack() Type "+E+": unknown format code")}}if(o<arguments.length){throw new Error("Warning: pack(): "+(arguments.length-o)+" arguments unused")}return m}
}

// Regex fragment that matches an escaped character in a double quoted
// string.
// why escape quotes, ffs!
YamlUnescaper.REGEX_ESCAPED_CHARACTER = '\\\\([0abt\tnvfre "\\/\\\\N_LP]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})';

/**
 * YamlDumper dumps JS variables to YAML strings.
 *
 * @author Fabien Potencier <fabien@symfony.com>
 */
var YamlDumper = function(){};
YamlDumper.prototype =
{
	/**
	 * Dumps a JS value to YAML.
	 *
	 * @param	mixed	 input	The JS value
	 * @param	integer inline The level where you switch to inline YAML
	 * @param	integer indent The level o indentation indentation (used internally)
	 *
	 * @return string	The YAML representation of the JS value
	 */
	dump: function(input, inline, indent)
	{
		if ( inline == null ) inline = 0;
		if ( indent == null ) indent = 0;
		var output = '';
		var prefix = indent ? this.strRepeat(' ', indent) : '';
		var yaml;
		if (!this.numSpacesForIndentation) this.numSpacesForIndentation = 2;

		if ( inline <= 0 || !this.isObject(input) || this.isEmpty(input) )
		{
			yaml = new YamlInline();
			output += prefix + yaml.dump(input);
		}
		else
		{
			var isAHash = !this.arrayEquals(this.getKeys(input), this.range(0,input.length - 1));
			var willBeInlined;
			
			for ( var key in input )
			{
				if ( input.hasOwnProperty(key) )
				{
					willBeInlined = inline - 1 <= 0 || !this.isObject(input[key]) || this.isEmpty(input[key]);
					
					if ( isAHash ) yaml = new YamlInline();
					
					output += 
						prefix + '' +
						(isAHash ? yaml.dump(key)+':' : '-') + '' +
						(willBeInlined ? ' ' : "\n") + '' +
						this.dump(input[key], inline - 1, (willBeInlined ? 0 : indent + this.numSpacesForIndentation)) + '' +
						(willBeInlined ? "\n" : '');
				}
			}
		}

		return output;
	},
	
	strRepeat: function(str /* String */, count /* Integer */)
	{
		var i;
		var result = '';
		for ( i = 0; i < count; i++ ) result += str;
		return result;
	},
	
	isObject: function(input)
	{
		return this.isDefined(input) && typeof(input) == 'object';
	},
	
	isEmpty: function(input)
	{
		var ret = input == undefined || input == null || input == '' || input == 0 || input == "0" || input == false;
		if ( !ret && typeof(input) == "object" && !(input instanceof Array)){
			var propCount = 0;
			for ( var key in input )
				if ( input.hasOwnProperty(key) ) propCount++;
			ret = !propCount;
		}
		return ret;
	},
	
	isDefined: function(input)
	{
		return input != undefined && input != null;
	},
	
	getKeys: function(tab)
	{
		var ret = [];
		
		for ( var name in tab )
		{
			if ( tab.hasOwnProperty(name) )
			{
				ret.push(name);
			}
		}
		
		return ret;
	},
	
	range: function(start, end)
	{
		if ( start > end ) return [];
		
		var ret = [];
		
		for ( var i = start; i <= end; i++ )
		{
			ret.push(i);
		}
		
		return ret;
	},
	
	arrayEquals: function(a,b)
	{
		if ( a.length != b.length ) return false;
		
		var len = a.length;
		
		for ( var i = 0; i < len; i++ )
		{
			if ( a[i] != b[i] ) return false;
		}
		
		return true;
	}
};
})();
