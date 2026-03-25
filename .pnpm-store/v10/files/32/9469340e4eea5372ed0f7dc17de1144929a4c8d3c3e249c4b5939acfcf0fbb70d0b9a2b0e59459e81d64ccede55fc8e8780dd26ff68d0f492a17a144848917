/*! https://mths.be/quoted-printable v1.0.1 by @mathias | MIT license */
;(function(root) {

	// Detect free variables `exports`.
	var freeExports = typeof exports == 'object' && exports;

	// Detect free variable `module`.
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;

	// Detect free variable `global`, from Node.js or Browserified code, and use
	// it as `root`.
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/*--------------------------------------------------------------------------*/

	var stringFromCharCode = String.fromCharCode;
	var decode = function(input) {
		return input
			// https://tools.ietf.org/html/rfc2045#section-6.7, rule 3:
			// “Therefore, when decoding a `Quoted-Printable` body, any trailing white
			// space on a line must be deleted, as it will necessarily have been added
			// by intermediate transport agents.”
			.replace(/[\t\x20]$/gm, '')
			// Remove hard line breaks preceded by `=`. Proper `Quoted-Printable`-
			// encoded data only contains CRLF line  endings, but for compatibility
			// reasons we support separate CR and LF too.
			.replace(/=(?:\r\n?|\n|$)/g, '')
			// Decode escape sequences of the form `=XX` where `XX` is any
			// combination of two hexidecimal digits. For optimal compatibility,
			// lowercase hexadecimal digits are supported as well. See
			// https://tools.ietf.org/html/rfc2045#section-6.7, note 1.
			.replace(/=([a-fA-F0-9]{2})/g, function($0, $1) {
				var codePoint = parseInt($1, 16);
				return stringFromCharCode(codePoint);
			});
	};

	var handleTrailingCharacters = function(string) {
		return string
			.replace(/\x20$/, '=20') // Handle trailing space.
			.replace(/\t$/, '=09') // Handle trailing tab.
	};

	var regexUnsafeSymbols = /[\0-\x08\n-\x1F=\x7F-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
	var encode = function(string) {

		// Encode symbols that are definitely unsafe (i.e. unsafe in any context).
		var encoded = string.replace(regexUnsafeSymbols, function(symbol) {
			if (symbol > '\xFF') {
				throw RangeError(
					'`quotedPrintable.encode()` expects extended ASCII input only. ' +
					'Don\u2019t forget to encode the input first using a character ' +
					'encoding like UTF-8.'
				);
			}
			var codePoint = symbol.charCodeAt(0);
			var hexadecimal = codePoint.toString(16).toUpperCase();
			return '=' + ('0' + hexadecimal).slice(-2);
		});

		// Limit lines to 76 characters (not counting the CRLF line endings).
		var lines = encoded.split(/\r\n?|\n/g);
		var lineIndex = -1;
		var lineCount = lines.length;
		var result = [];
		while (++lineIndex < lineCount) {
			var line = lines[lineIndex];
			// Leave room for the trailing `=` for soft line breaks.
			var LINE_LENGTH = 75;
			var index = 0;
			var length = line.length;
			while (index < length) {
				var buffer = encoded.slice(index, index + LINE_LENGTH);
				// If this line ends with `=`, optionally followed by a single uppercase
				// hexadecimal digit, we broke an escape sequence in half. Fix it by
				// moving these characters to the next line.
				if (/=$/.test(buffer)) {
					buffer = buffer.slice(0, LINE_LENGTH - 1);
					index += LINE_LENGTH - 1;
				} else if (/=[A-F0-9]$/.test(buffer)) {
					buffer = buffer.slice(0, LINE_LENGTH - 2);
					index += LINE_LENGTH - 2;
				} else {
					index += LINE_LENGTH;
				}
				result.push(buffer);
			}
		}

		// Encode space and tab characters at the end of encoded lines. Note that
		// with the current implementation, this can only occur at the very end of
		// the encoded string — every other line ends with `=` anyway.
		var lastLineLength = buffer.length;
		if (/[\t\x20]$/.test(buffer)) {
			// There’s a space or a tab at the end of the last encoded line. Remove
			// this line from the `result` array, as it needs to change.
			result.pop();
			if (lastLineLength + 2 <= LINE_LENGTH + 1) {
				// It’s possible to encode the character without exceeding the line
				// length limit.
				result.push(
					handleTrailingCharacters(buffer)
				);
			} else {
				// It’s not possible to encode the character without exceeding the line
				// length limit. Remvoe the character from the line, and insert a new
				// line that contains only the encoded character.
				result.push(
					buffer.slice(0, lastLineLength - 1),
					handleTrailingCharacters(
						buffer.slice(lastLineLength - 1, lastLineLength)
					)
				);
			}
		}

		// `Quoted-Printable` uses CRLF.
		return result.join('=\r\n');
	};

	var quotedPrintable = {
		'encode': encode,
		'decode': decode,
		'version': '1.0.1'
	};

	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define(function() {
			return quotedPrintable;
		});
	}	else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = quotedPrintable;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (var key in quotedPrintable) {
				quotedPrintable.hasOwnProperty(key) && (freeExports[key] = quotedPrintable[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.quotedPrintable = quotedPrintable;
	}

}(this));
