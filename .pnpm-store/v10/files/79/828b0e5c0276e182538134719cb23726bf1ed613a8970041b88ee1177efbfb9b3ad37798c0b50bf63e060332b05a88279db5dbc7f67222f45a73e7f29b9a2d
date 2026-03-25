'use strict'

exports['string/varchar'] = {
  format: 'text',
  id: 1043,
  tests: [
    ['bang', 'bang']
  ]
}

exports['integer/int4'] = {
  format: 'text',
  id: 23,
  tests: [
    ['2147483647', 2147483647]
  ]
}

exports['smallint/int2'] = {
  format: 'text',
  id: 21,
  tests: [
    ['32767', 32767]
  ]
}

exports['bigint/int8'] = {
  format: 'text',
  id: 20,
  tests: [
    ['9223372036854775807', '9223372036854775807']
  ]
}

exports.oid = {
  format: 'text',
  id: 26,
  tests: [
    ['103', 103]
  ]
}

var bignum = '31415926535897932384626433832795028841971693993751058.16180339887498948482045868343656381177203091798057628'
exports.numeric = {
  format: 'text',
  id: 1700,
  tests: [
    [bignum, bignum]
  ]
}

exports['real/float4'] = {
  format: 'text',
  id: 700,
  tests: [
    ['123.456', 123.456]
  ]
}

exports['double precision / float 8'] = {
  format: 'text',
  id: 701,
  tests: [
    ['12345678.12345678', 12345678.12345678]
  ]
}

exports.boolean = {
  format: 'text',
  id: 16,
  tests: [
    ['TRUE', true],
    ['t', true],
    ['true', true],
    ['y', true],
    ['yes', true],
    ['on', true],
    ['1', true],
    ['f', false],
    [null, null]
  ]
}

exports.timestamptz = {
  format: 'text',
  id: 1184,
  tests: [
    [
      '2010-10-31 14:54:13.74-05:30',
      dateEquals(2010, 9, 31, 20, 24, 13, 740)
    ],
    [
      '2011-01-23 22:05:00.68-06',
       dateEquals(2011, 0, 24, 4, 5, 0, 680)
    ],
    [
      '2010-10-30 14:11:12.730838Z',
      dateEquals(2010, 9, 30, 14, 11, 12, 730)
    ],
    [
      '2010-10-30 13:10:01+05',
      dateEquals(2010, 9, 30, 8, 10, 1, 0)
    ]
  ]
}

exports.timestamp = {
  format: 'text',
  id: 1114,
  tests: [
    [
      '2010-10-31 00:00:00',
      function (t, value) {
        t.equal(
          value.toUTCString(),
          new Date(2010, 9, 31, 0, 0, 0, 0, 0).toUTCString()
        )
        t.equal(
          value.toString(),
          new Date(2010, 9, 31, 0, 0, 0, 0, 0, 0).toString()
        )
      }
    ]
  ]
}

exports.date = {
  format: 'text',
  id: 1082,
  tests: [
    ['2010-10-31', function (t, value) {
      var now = new Date(2010, 9, 31)
      dateEquals(
        2010,
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(), 0, 0, 0)(t, value)
      t.equal(value.getHours(), now.getHours())
    }]
  ]
}

exports.inet = {
  format: 'text',
  id: 869,
  tests: [
    ['8.8.8.8', '8.8.8.8'],
    ['2001:4860:4860::8888', '2001:4860:4860::8888'],
    ['127.0.0.1', '127.0.0.1'],
    ['fd00:1::40e', 'fd00:1::40e'],
    ['1.2.3.4', '1.2.3.4']
  ]
}

exports.cidr = {
  format: 'text',
  id: 650,
  tests: [
    ['172.16.0.0/12', '172.16.0.0/12'],
    ['fe80::/10', 'fe80::/10'],
    ['fc00::/7', 'fc00::/7'],
    ['192.168.0.0/24', '192.168.0.0/24'],
    ['10.0.0.0/8', '10.0.0.0/8']
  ]
}

exports.macaddr = {
  format: 'text',
  id: 829,
  tests: [
    ['08:00:2b:01:02:03', '08:00:2b:01:02:03'],
    ['16:10:9f:0d:66:00', '16:10:9f:0d:66:00']
  ]
}

exports.numrange = {
  format: 'text',
  id: 3906,
  tests: [
    ['[,]', '[,]'],
    ['(,)', '(,)'],
    ['(,]', '(,]'],
    ['[1,)', '[1,)'],
    ['[,1]', '[,1]'],
    ['(1,2)', '(1,2)'],
    ['(1,20.5]', '(1,20.5]']
  ]
}

exports.interval = {
  format: 'text',
  id: 1186,
  tests: [
    ['01:02:03', function (t, value) {
      t.equal(value.toPostgres(), '3 seconds 2 minutes 1 hours')
      t.deepEqual(value, {hours: 1, minutes: 2, seconds: 3})
    }],
    ['01:02:03.456', function (t, value) {
      t.deepEqual(value, {hours: 1, minutes:2, seconds: 3, milliseconds: 456})
    }],
    ['1 year -32 days', function (t, value) {
      t.equal(value.toPostgres(), '-32 days 1 years')
      t.deepEqual(value, {years: 1, days: -32})
    }],
    ['1 day -00:00:03', function (t, value) {
      t.equal(value.toPostgres(), '-3 seconds 1 days')
      t.deepEqual(value, {days: 1, seconds: -3})
    }]
  ]
}

exports.bytea = {
  format: 'text',
  id: 17,
  tests: [
    ['foo\\000\\200\\\\\\377', function (t, value) {
      var buffer = new Buffer([102, 111, 111, 0, 128, 92, 255])
      t.ok(buffer.equals(value))
    }],
    ['', function (t, value) {
      var buffer = new Buffer(0)
      t.ok(buffer.equals(value))
    }]
  ]
}

exports['array/boolean'] = {
    format: 'text',
    id: 1000,
    tests: [
        ['{true,false}', function (t, value) {
            t.deepEqual(value, [true, false])
        }]
    ]
}

exports['array/char'] = {
  format: 'text',
  id: 1014,
  tests: [
    ['{foo,bar}', function (t, value) {
      t.deepEqual(value, ['foo', 'bar'])
    }]
  ]
}

exports['array/varchar'] = {
  format: 'text',
  id: 1015,
  tests: [
    ['{foo,bar}', function (t, value) {
      t.deepEqual(value, ['foo', 'bar'])
    }]
  ]
}

exports['array/text'] = {
  format: 'text',
  id: 1008,
  tests: [
    ['{foo}', function (t, value) {
      t.deepEqual(value, ['foo'])
    }]
  ]
}

exports['array/bytea'] = {
  format: 'text',
  id: 1001,
  tests: [
    ['{"\\\\x00000000"}', function (t, value) {
      var buffer = new Buffer('00000000', 'hex')
      t.ok(Array.isArray(value))
      t.equal(value.length, 1)
      t.ok(buffer.equals(value[0]))
    }],
    ['{NULL,"\\\\x4e554c4c"}', function (t, value) {
      var buffer = new Buffer('4e554c4c', 'hex')
      t.ok(Array.isArray(value))
      t.equal(value.length, 2)
      t.equal(value[0], null)
      t.ok(buffer.equals(value[1]))
    }],
  ]
}

exports['array/numeric'] = {
  format: 'text',
  id: 1231,
  tests: [
    ['{1.2,3.4}', function (t, value) {
      t.deepEqual(value, [1.2, 3.4])
    }]
  ]
}

exports['array/int2'] = {
  format: 'text',
  id: 1005,
  tests: [
    ['{-32768, -32767, 32766, 32767}', function (t, value) {
      t.deepEqual(value, [-32768, -32767, 32766, 32767])
    }]
  ]
}

exports['array/int4'] = {
  format: 'text',
  id: 1005,
  tests: [
    ['{-2147483648, -2147483647, 2147483646, 2147483647}', function (t, value) {
      t.deepEqual(value, [-2147483648, -2147483647, 2147483646, 2147483647])
    }]
  ]
}

exports['array/int8'] = {
  format: 'text',
  id: 1016,
  tests: [
    [
      '{-9223372036854775808, -9223372036854775807, 9223372036854775806, 9223372036854775807}',
      function (t, value) {
        t.deepEqual(value, [
          '-9223372036854775808',
          '-9223372036854775807',
          '9223372036854775806',
          '9223372036854775807'
        ])
      }
    ]
  ]
}

exports['array/json'] = {
  format: 'text',
  id: 199,
  tests: [
    [
      '{{1,2},{[3],"[4,5]"},{null,NULL}}',
      function (t, value) {
        t.deepEqual(value, [
          [1, 2],
          [[3], [4, 5]],
          [null, null],
        ])
      }
    ]
  ]
}

exports['array/jsonb'] = {
  format: 'text',
  id: 3807,
  tests: exports['array/json'].tests
}

exports['array/point'] = {
  format: 'text',
  id: 1017,
  tests: [
    ['{"(25.1,50.5)","(10.1,40)"}', function (t, value) {
      t.deepEqual(value, [{x: 25.1, y: 50.5}, {x: 10.1, y: 40}])
    }]
  ]
}

exports['array/oid'] = {
  format: 'text',
  id: 1028,
  tests: [
    ['{25864,25860}', function (t, value) {
      t.deepEqual(value, [25864, 25860])
    }]
  ]
}

exports['array/float4'] = {
  format: 'text',
  id: 1021,
  tests: [
    ['{1.2, 3.4}', function (t, value) {
      t.deepEqual(value, [1.2, 3.4])
    }]
  ]
}

exports['array/float8'] = {
  format: 'text',
  id: 1022,
  tests: [
    ['{-12345678.1234567, 12345678.12345678}', function (t, value) {
      t.deepEqual(value, [-12345678.1234567, 12345678.12345678])
    }]
  ]
}

exports['array/date'] = {
  format: 'text',
  id: 1182,
  tests: [
    ['{2014-01-01,2015-12-31}', function (t, value) {
      var expecteds = [new Date(2014, 0, 1), new Date(2015, 11, 31)]
      t.equal(value.length, 2)
      value.forEach(function (date, index) {
        var expected = expecteds[index]
        dateEquals(
          expected.getUTCFullYear(),
          expected.getUTCMonth(),
          expected.getUTCDate(),
          expected.getUTCHours(), 0, 0, 0)(t, date)
      })
    }]
  ]
}

exports['array/interval'] = {
  format: 'text',
  id: 1187,
  tests: [
    ['{01:02:03,1 day -00:00:03}', function (t, value) {
      var expecteds = [{hours: 1, minutes: 2, seconds: 3},
                       {days: 1, seconds: -3}]
      t.equal(value.length, 2)
      t.deepEqual(value, expecteds);
    }]
  ]
}

exports['array/inet'] = {
  format: 'text',
  id: 1041,
  tests: [
    ['{8.8.8.8}', function (t, value) {
      t.deepEqual(value, ['8.8.8.8']);
    }],
    ['{2001:4860:4860::8888}', function (t, value) {
      t.deepEqual(value, ['2001:4860:4860::8888']);
    }],
    ['{127.0.0.1,fd00:1::40e,1.2.3.4}', function (t, value) {
      t.deepEqual(value, ['127.0.0.1', 'fd00:1::40e', '1.2.3.4']);
    }]
  ]
}

exports['array/cidr'] = {
  format: 'text',
  id: 651,
  tests: [
    ['{172.16.0.0/12}', function (t, value) {
      t.deepEqual(value, ['172.16.0.0/12']);
    }],
    ['{fe80::/10}', function (t, value) {
      t.deepEqual(value, ['fe80::/10']);
    }],
    ['{10.0.0.0/8,fc00::/7,192.168.0.0/24}', function (t, value) {
      t.deepEqual(value, ['10.0.0.0/8', 'fc00::/7', '192.168.0.0/24']);
    }]
  ]
}

exports['array/macaddr'] = {
  format: 'text',
  id: 1040,
  tests: [
    ['{08:00:2b:01:02:03,16:10:9f:0d:66:00}', function (t, value) {
      t.deepEqual(value, ['08:00:2b:01:02:03', '16:10:9f:0d:66:00']);
    }]
  ]
}

exports['array/numrange'] = {
  format: 'text',
  id: 3907,
  tests: [
    ['{"[1,2]","(4.5,8)","[10,40)","(-21.2,60.3]"}', function (t, value) {
      t.deepEqual(value, ['[1,2]', '(4.5,8)', '[10,40)', '(-21.2,60.3]']);
    }],
    ['{"[,20]","[3,]","[,]","(,35)","(1,)","(,)"}', function (t, value) {
      t.deepEqual(value, ['[,20]', '[3,]', '[,]', '(,35)', '(1,)', '(,)']);
    }],
    ['{"[,20)","[3,)","[,)","[,35)","[1,)","[,)"}', function (t, value) {
      t.deepEqual(value, ['[,20)', '[3,)', '[,)', '[,35)', '[1,)', '[,)']);
    }]
  ]
}

exports['binary-string/varchar'] = {
  format: 'binary',
  id: 1043,
  tests: [
    ['bang', 'bang']
  ]
}

exports['binary-integer/int4'] = {
  format: 'binary',
  id: 23,
  tests: [
    [[0, 0, 0, 100], 100]
  ]
}

exports['binary-smallint/int2'] = {
  format: 'binary',
  id: 21,
  tests: [
    [[0, 101], 101]
  ]
}

exports['binary-bigint/int8'] = {
  format: 'binary',
  id: 20,
  tests: [
    [new Buffer([0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]), '9223372036854775807']
  ]
}

exports['binary-oid'] = {
  format: 'binary',
  id: 26,
  tests: [
    [[0, 0, 0, 103], 103]
  ]
}

exports['binary-numeric'] = {
  format: 'binary',
  id: 1700,
  tests: [
    [
      [0, 2, 0, 0, 0, 0, 0, hex('0x64'), 0, 12, hex('0xd'), hex('0x48'), 0, 0, 0, 0],
      12.34
    ]
  ]
}

exports['binary-real/float4'] = {
  format: 'binary',
  id: 700,
  tests: [
    [['0x41', '0x48', '0x00', '0x00'].map(hex), 12.5]
  ]
}

exports['binary-boolean'] = {
  format: 'binary',
  id: 16,
  tests: [
    [[1], true],
    [[0], false],
    [null, null]
  ]
}

exports['binary-string'] = {
  format: 'binary',
  id: 25,
  tests: [
    [
      new Buffer(['0x73', '0x6c', '0x61', '0x64', '0x64', '0x61'].map(hex)),
      'sladda'
    ]
  ]
}

exports.point = {
  format: 'text',
  id: 600,
  tests: [
    ['(25.1,50.5)', function (t, value) {
      t.deepEqual(value, {x: 25.1, y: 50.5})
    }]
  ]
}

exports.circle = {
  format: 'text',
  id: 718,
  tests: [
    ['<(25,10),5>', function (t, value) {
      t.deepEqual(value, {x: 25, y: 10, radius: 5})
    }]
  ]
}

function hex (string) {
  return parseInt(string, 16)
}

function dateEquals () {
  var timestamp = Date.UTC.apply(Date, arguments)
  return function (t, value) {
    t.equal(value.toUTCString(), new Date(timestamp).toUTCString())
  }
}
