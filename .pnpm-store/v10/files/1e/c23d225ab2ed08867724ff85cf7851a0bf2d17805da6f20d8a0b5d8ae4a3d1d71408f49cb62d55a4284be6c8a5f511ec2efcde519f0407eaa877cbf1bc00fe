"use strict";
// This grammar is from the XML and XML Namespace specs. It specifies whether
// a string (such as an element or attribute name) is a valid Name or QName.
//
// Name           ::= NameStartChar (NameChar)*
// NameStartChar  ::= ":" | [A-Z] | "_" | [a-z] |
//                    [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] |
//                    [#x370-#x37D] | [#x37F-#x1FFF] |
//                    [#x200C-#x200D] | [#x2070-#x218F] |
//                    [#x2C00-#x2FEF] | [#x3001-#xD7FF] |
//                    [#xF900-#xFDCF] | [#xFDF0-#xFFFD] |
//                    [#x10000-#xEFFFF]
//
// NameChar       ::= NameStartChar | "-" | "." | [0-9] |
//                    #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
//
// QName          ::= PrefixedName| UnprefixedName
// PrefixedName   ::= Prefix ':' LocalPart
// UnprefixedName ::= LocalPart
// Prefix         ::= NCName
// LocalPart      ::= NCName
// NCName         ::= Name - (Char* ':' Char*)
//                    # An XML Name, minus the ":"
//

exports.isValidName = isValidName;
exports.isValidQName = isValidQName;

// Most names will be ASCII only. Try matching against simple regexps first
var simplename = /^[_:A-Za-z][-.:\w]+$/;
var simpleqname = /^([_A-Za-z][-.\w]+|[_A-Za-z][-.\w]+:[_A-Za-z][-.\w]+)$/;

// If the regular expressions above fail, try more complex ones that work
// for any identifiers using codepoints from the Unicode BMP
var ncnamestartchars = "_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02ff\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD";
var ncnamechars = "-._A-Za-z0-9\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02ff\u0300-\u037D\u037F-\u1FFF\u200C\u200D\u203f\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD";

var ncname = "[" + ncnamestartchars + "][" + ncnamechars + "]*";
var namestartchars = ncnamestartchars + ":";
var namechars = ncnamechars + ":";
var name = new RegExp("^[" + namestartchars + "]" + "[" + namechars + "]*$");
var qname = new RegExp("^(" + ncname + "|" + ncname + ":" + ncname + ")$");

// XML says that these characters are also legal:
// [#x10000-#xEFFFF].  So if the patterns above fail, and the
// target string includes surrogates, then try the following
// patterns that allow surrogates and then run an extra validation
// step to make sure that the surrogates are in valid pairs and in
// the right range.  Note that since the characters \uf0000 to \u1f0000
// are not allowed, it means that the high surrogate can only go up to
// \uDB7f instead of \uDBFF.
var hassurrogates = /[\uD800-\uDB7F\uDC00-\uDFFF]/;
var surrogatechars = /[\uD800-\uDB7F\uDC00-\uDFFF]/g;
var surrogatepairs = /[\uD800-\uDB7F][\uDC00-\uDFFF]/g;

// Modify the variables above to allow surrogates
ncnamestartchars += "\uD800-\uDB7F\uDC00-\uDFFF";
ncnamechars += "\uD800-\uDB7F\uDC00-\uDFFF";
ncname = "[" + ncnamestartchars + "][" + ncnamechars + "]*";
namestartchars = ncnamestartchars + ":";
namechars = ncnamechars + ":";

// Build another set of regexps that include surrogates
var surrogatename = new RegExp("^[" + namestartchars + "]" + "[" + namechars + "]*$");
var surrogateqname = new RegExp("^(" + ncname + "|" + ncname + ":" + ncname + ")$");

function isValidName(s) {
  if (simplename.test(s)) return true; // Plain ASCII
  if (name.test(s)) return true; // Unicode BMP

  // Maybe the tests above failed because s includes surrogate pairs
  // Most likely, though, they failed for some more basic syntax problem
  if (!hassurrogates.test(s)) return false;

  // Is the string a valid name if we allow surrogates?
  if (!surrogatename.test(s)) return false;

  // Finally, are the surrogates all correctly paired up?
  var chars = s.match(surrogatechars), pairs = s.match(surrogatepairs);
  return pairs !== null && 2*pairs.length === chars.length;
}

function isValidQName(s) {
  if (simpleqname.test(s)) return true; // Plain ASCII
  if (qname.test(s)) return true; // Unicode BMP

  if (!hassurrogates.test(s)) return false;
  if (!surrogateqname.test(s)) return false;
  var chars = s.match(surrogatechars), pairs = s.match(surrogatepairs);
  return pairs !== null && 2*pairs.length === chars.length;
}
