/*

  The MIT License (MIT)

  Copyright (c) 2007-2018 Einar Lielmanis, Liam Newman, and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

//
// simple unpacker/deobfuscator for scripts messed up with myobfuscate.com
// You really don't want to obfuscate your scripts there: they're tracking
// your unpackings, your script gets turned into something like this,
// as of 2011-04-25:
/*

    var _escape = 'your_script_escaped';
    var _111 = document.createElement('script');
    _111.src = 'http://api.www.myobfuscate.com/?getsrc=ok' +
        '&ref=' + encodeURIComponent(document.referrer) +
        '&url=' + encodeURIComponent(document.URL);
    var 000 = document.getElementsByTagName('head')[0];
    000.appendChild(_111);
    document.write(unescape(_escape));

*/
//
// written by Einar Lielmanis <einar@beautifier.io>
//
// usage:
//
// if (MyObfuscate.detect(some_string)) {
//     var unpacked = MyObfuscate.unpack(some_string);
// }
//
//

/*jshint strict:false */

var MyObfuscate = {
  detect: function(str) {
    if (/^var _?[0O1lI]{3}\=('|\[).*\)\)\);/.test(str)) {
      return true;
    }
    if (/^function _?[0O1lI]{3}\(_/.test(str) && /eval\(/.test(str)) {
      return true;
    }
    return false;
  },

  unpack: function(str) {
    if (MyObfuscate.detect(str)) {
      var __eval = eval;
      try {
        eval = function(unpacked) { // jshint ignore:line
          if (MyObfuscate.starts_with(unpacked, 'var _escape')) {
            // fetch the urlencoded stuff from the script,
            var matches = /'([^']*)'/.exec(unpacked);
            var unescaped = unescape(matches[1]);
            if (MyObfuscate.starts_with(unescaped, '<script>')) {
              unescaped = unescaped.substr(8, unescaped.length - 8);
            }
            if (MyObfuscate.ends_with(unescaped, '</script>')) {
              unescaped = unescaped.substr(0, unescaped.length - 9);
            }
            unpacked = unescaped;
          }
          // throw to terminate the script
          unpacked = "// Unpacker warning: be careful when using myobfuscate.com for your projects:\n" +
            "// scripts obfuscated by the free online version may call back home.\n" +
            "\n//\n" + unpacked;
          throw unpacked;
        }; // jshint ignore:line
        __eval(str); // should throw
      } catch (e) {
        // well, it failed. we'll just return the original, instead of crashing on user.
        if (typeof e === "string") {
          str = e;
        }
      }
      eval = __eval; // jshint ignore:line
    }
    return str;
  },

  starts_with: function(str, what) {
    return str.substr(0, what.length) === what;
  },

  ends_with: function(str, what) {
    return str.substr(str.length - what.length, what.length) === what;
  },

  run_tests: function(sanity_test) {
    var t = sanity_test || new SanityTest();

    return t;
  }


};
