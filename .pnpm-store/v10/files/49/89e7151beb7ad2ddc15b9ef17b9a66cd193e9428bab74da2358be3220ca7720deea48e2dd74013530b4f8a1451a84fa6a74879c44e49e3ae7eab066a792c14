(function(md4) {
  Array.prototype.toHexString = ArrayBuffer.prototype.toHexString = function () {
    var array = new Uint8Array(this);
    var hex = '';
    for (var i = 0; i < array.length; ++i) {
      var c = array[i].toString('16');
      hex += c.length === 1 ? '0' + c : c;
    }
    return hex;
  };

  var testCases = {
    'ascii': {
      '31d6cfe0d16ae931b73c59d7e0c089c0': '',
      '1bee69a46ba811185c194762abaeae90': 'The quick brown fox jumps over the lazy dog',
      '2812c6c7136898c51f6f6739ad08750e': 'The quick brown fox jumps over the lazy dog.'
    },
    'ascii more than 64 bytes': {
      'e995876fc5a7870c478d20312edf17da': 'The MD5 message-digest algorithm is a widely used cryptographic hash function producing a 128-bit (16-byte) hash value, typically expressed in text format as a 32 digit hexadecimal number. MD5 has been utilized in a wide variety of cryptographic applications, and is also commonly used to verify data integrity.'
    },
    'UTF8': {
      '223088bf7bd45a16436b15360c5fc5a0': '中文',
      '0b1f6347ef0be74383f7ae7547359a4c': 'aécio',
      'cb17a223ccf45757d08260b6bfab78ab': '𠜎'
    },
    'UTF8 more than 64 bytes': {
      '968bd34f00469adbddbe6d803b28cff9': '訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一',
      '2e03bd374f7be036d4fa838cb9662597': '訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一（又譯雜湊演算法、摘要演算法等），主流程式語言普遍已有MD5的實作。'
    },
    'special length': {
      '91df808c37b8c5544391a3aa2196114e': '0123456780123456780123456780123456780123456780123456780',
      '3825a0afe234b8029ccad9a31ec5f8ee': '01234567801234567801234567801234567801234567801234567801',
      'f9b968c94ec709be9f306d90cd424228': '0123456780123456780123456780123456780123456780123456780123456780',
      '08b0ded59615dc18407569a9ceb263ba': '01234567801234567801234567801234567801234567801234567801234567801234567',
      '9c637e494a39f7920c7e83b665284f03': '012345678012345678012345678012345678012345678012345678012345678012345678',
      '47eebbaaa1fca842a7bff2d3b7c9f0c6': '012345678012345678012345678012345678012345678012345678012345678012345678012345678012345678012345678012345678012345678012345678012345678012345678'
    },
    'Array': {
      '31d6cfe0d16ae931b73c59d7e0c089c0': [],
      '47c61a0fa8738ba77308a8a600f88e4b': [0],
      '1bee69a46ba811185c194762abaeae90': [84, 104, 101, 32, 113, 117, 105, 99, 107, 32, 98, 114, 111, 119, 110, 32, 102, 111, 120, 32, 106, 117, 109, 112, 115, 32, 111, 118, 101, 114, 32, 116, 104, 101, 32, 108, 97, 122, 121, 32, 100, 111, 103],
      '4c832b90373e2d3f4a8ce06172989e2b': [72, 69, 76, 76, 79]
    },
    'Uint8Array': {
      '1bee69a46ba811185c194762abaeae90': new Uint8Array([84, 104, 101, 32, 113, 117, 105, 99, 107, 32, 98, 114, 111, 119, 110, 32, 102, 111, 120, 32, 106, 117, 109, 112, 115, 32, 111, 118, 101, 114, 32, 116, 104, 101, 32, 108, 97, 122, 121, 32, 100, 111, 103]),
      '4c832b90373e2d3f4a8ce06172989e2b': new Uint8Array([72, 69, 76, 76, 79])
    },
    'Int8Array': {
      '1bee69a46ba811185c194762abaeae90': new Int8Array([84, 104, 101, 32, 113, 117, 105, 99, 107, 32, 98, 114, 111, 119, 110, 32, 102, 111, 120, 32, 106, 117, 109, 112, 115, 32, 111, 118, 101, 114, 32, 116, 104, 101, 32, 108, 97, 122, 121, 32, 100, 111, 103]),
      '4c832b90373e2d3f4a8ce06172989e2b': new Int8Array([72, 69, 76, 76, 79])
    },
    'ArrayBuffer': {
      '47c61a0fa8738ba77308a8a600f88e4b': new ArrayBuffer(1)
    },
    'Object': {
      '31d6cfe0d16ae931b73c59d7e0c089c0': {what: 'ever'}
    }
  };

  var methods = [
    {
      name: 'md4',
      call: md4,
    },
    {
      name: 'md4.hex',
      call: md4.hex
    },
    {
      name: 'md4.array',
      call: function (message) {
        return md4.array(message).toHexString();
      }
    },
    {
      name: 'md4.digest',
      call: function (message) {
        return md4.digest(message).toHexString();
      }
    },
    {
      name: 'md4.buffer',
      call: function (message) {
        return md4.buffer(message).toHexString();
      }
    }
  ];

  var classMethods = [
    {
      name: 'create',
      call: function (message) {
        return md4.create().update(message).toString();
      }
    },
    {
      name: 'update',
      call: function (message) {
        return md4.update(message).toString();
      }
    },
    {
      name: 'hex',
      call: function (message) {
        return md4.update(message).hex();
      }
    },
    {
      name: 'array',
      call: function (message) {
        return md4.update(message).array().toHexString();
      }
    },
    {
      name: 'digest',
      call: function (message) {
        return md4.update(message).digest().toHexString();
      }
    },
    {
      name: 'arrayBuffer',
      call: function (message) {
        return md4.update(message).arrayBuffer().toHexString();
      }
    },
    {
      name: 'finalize',
      call: function (message) {
        var hash = md4.update(message);
        hash.hex();
        hash.update(message);
        return hash.hex();
      }
    }
  ];

  if (typeof JS_MD4_NO_ARRAY_BUFFER !== 'undefined') {
    classMethods = classMethods.filter(function (method) {
      return method.name != 'arrayBuffer';
    });
    delete testCases['ArrayBuffer'];
  }

  describe('Md4', function () {
    methods.forEach(function (method) {
      describe('#' + method.name, function() {
        for (var testCaseName in testCases) {
          (function (testCaseName) {
            var testCase = testCases[testCaseName];
            context('when ' + testCaseName, function() {
              for(var hash in testCase) {
                (function (message, hash) {
                  it('should be equal', function() {
                    expect(method.call(message)).to.be(hash);
                  });
                })(testCase[hash], hash);
              }
            });
          })(testCaseName);
        }
      });
    });

    classMethods.forEach(function (method) {
      describe('#' + method.name, function() {
        for (var testCaseName in testCases) {
          (function (testCaseName) {
            var testCase = testCases[testCaseName];
            context('when ' + testCaseName, function() {
              for(var hash in testCase) {
                (function (message, hash) {
                  it('should be equal', function() {
                    expect(method.call(message)).to.be(hash);
                  });
                })(testCase[hash], hash);
              }
            });
          })(testCaseName);
        }
      });
    });
  });
})(md4);
