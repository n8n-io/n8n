'use strict';

// Based on https://docs.python.org/2/library/binascii.html
var binascii = (function(){

  var hexlify = function(str) {
    var result = '';
    var padding = '00';
    for (var i=0, l=str.length; i<l; i++) {
      var digit = str.charCodeAt(i).toString(16);
      var padded = (padding+digit).slice(-2);
      result += padded;
    }
    return result;
  };

  var unhexlify = function(str) {
    var result = '';
    for (var i=0, l=str.length; i<l; i+=2) {
      result += String.fromCharCode(parseInt(str.substr(i, 2), 16));
    }
    return result;
  };


  return {
    b2a_hex: hexlify,
    hexlify: hexlify,

    a2b_hex: unhexlify,
    unhexlify: unhexlify
  };

})();

module.exports = binascii;
