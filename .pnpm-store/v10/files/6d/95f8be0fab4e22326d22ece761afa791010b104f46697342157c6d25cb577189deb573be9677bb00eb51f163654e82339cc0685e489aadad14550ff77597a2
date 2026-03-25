'use strict'

const test = require('tap').test
const { parseHAR } = require('../lib/parseHAR')

test('should throw on empty HAR', (t) => {
  t.plan(1)

  t.throws(() => parseHAR(null), /Could not parse HAR content: no entries found/)
  t.end()
})

test('should throw on HAR with no entries', (t) => {
  t.plan(1)

  t.throws(() => parseHAR({
    log: {
      version: '1.2',
      creator: {
        name: 'Firefox',
        version: '80.0.1'
      },
      pages: [
        {
          startedDateTime: '2020-09-28T16:43:28.987+02:00',
          id: 'page_1',
          title: 'mcollina/autocannon: fast HTTP/1.1 benchmarking tool written in Node.js',
          pageTimings: {
            onContentLoad: 1234,
            onLoad: 1952
          }
        }
      ]
    }
  }), /Could not parse HAR content: no entries found/)
  t.end()
})

test('should throw on HAR with empty entries', (t) => {
  t.plan(1)

  t.throws(() => parseHAR({
    log: {
      version: '1.2',
      creator: {
        name: 'Firefox',
        version: '80.0.1'
      },
      pages: [
        {
          startedDateTime: '2020-09-28T16:43:28.987+02:00',
          id: 'page_1',
          title: 'mcollina/autocannon: fast HTTP/1.1 benchmarking tool written in Node.js',
          pageTimings: {
            onContentLoad: 1234,
            onLoad: 1952
          }
        }
      ],
      entries: []
    }
  }), /Could not parse HAR content: no entries found/)
  t.end()
})

test('should parse and return GET entries', (t) => {
  t.plan(1)

  t.strictSame(parseHAR(require('./fixtures/httpbin-get.json')).get('https://httpbin.org'), [{
    method: 'GET',
    origin: 'https://httpbin.org',
    path: '/get',
    headers: {
      Host: 'httpbin.org',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0',
      Accept: '*/*',
      'Accept-Language': 'fr,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://httpbin.org/',
      DNT: '1',
      Connection: 'keep-alive'
    }
  }, {
    method: 'GET',
    origin: 'https://httpbin.org',
    path: '/get?from=10&size=20&sort=+name',
    headers: {
      Host: 'httpbin.org',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0',
      Accept: '*/*',
      'Accept-Language': 'fr,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://httpbin.org/',
      DNT: '1',
      Connection: 'keep-alive',
      TE: 'Trailers'
    }
  }])
  t.end()
})

test('should throw on HAR with invalid entries', (t) => {
  t.plan(2)

  t.throws(() => parseHAR({
    log: {
      entries: ['invalid']
    }
  }), /Could not parse HAR content: invalid request in entry #1/)
  t.throws(() => parseHAR({
    log: {
      entries: [{ request: { headers: [], url: 'http://localhost' } }, { request: null }]
    }
  }), /Could not parse HAR content: invalid request in entry #2/)

  t.end()
})

test('should throw on HAR with invalid headers', (t) => {
  t.plan(2)
  const url = 'http://localhost'

  t.throws(() => parseHAR({
    log: {
      entries: [{ request: { headers: [], url } }, { request: { headers: ['foo'], url } }]
    }
  }), /Could not parse HAR content: invalid name or value in header #1 of entry #2/)
  t.throws(() => parseHAR({
    log: {
      entries: [{ request: { headers: null } }]
    }
  }), /Could not parse HAR content: invalid headers array in entry #1/)
  t.end()
})

test('should parse and return POST entries', (t) => {
  t.plan(1)

  t.strictSame(parseHAR(require('./fixtures/httpbin-post.json')).get('https://httpbin.org'), [{
    method: 'POST',
    origin: 'https://httpbin.org',
    path: '/post',
    headers: {
      Host: 'httpbin.org',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0',
      Accept: '*/*',
      'Accept-Language': 'fr,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://httpbin.org/',
      'Content-Type': 'multipart/form-data; boundary=---------------------------31420230025845772252453285324',
      Origin: 'https://httpbin.org',
      'Content-Length': '362',
      DNT: '1',
      Connection: 'keep-alive',
      TE: 'Trailers'
    },
    body: '-----------------------------31420230025845772252453285324\r\nContent-Disposition: form-data; name="text"\r\n\r\na text value\r\n-----------------------------31420230025845772252453285324\r\nContent-Disposition: form-data; name="file"; filename="blob"\r\nContent-Type: application/octet-stream\r\n\r\nHello World!\n\r\n-----------------------------31420230025845772252453285324--\r\n'
  }, {
    method: 'POST',
    origin: 'https://httpbin.org',
    path: '/post',
    headers: {
      Host: 'httpbin.org',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0',
      Accept: '*/*',
      'Accept-Language': 'fr,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://httpbin.org/',
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: 'https://httpbin.org',
      'Content-Length': '27',
      DNT: '1',
      Connection: 'keep-alive',
      TE: 'Trailers'
    },
    body: 'text=a+text+value&number=10'
  }])
  t.end()
})

test('should split requests per origin', (t) => {
  t.plan(2)

  const requetsPerOrigin = parseHAR(require('./fixtures/multi-domains.json'))
  t.strictSame(requetsPerOrigin.get('https://httpbin.org'), [{
    method: 'POST',
    origin: 'https://httpbin.org',
    path: '/post',
    headers: {
      Host: 'httpbin.org',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0',
      Accept: '*/*',
      'Accept-Language': 'fr,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://httpbin.org/',
      'Content-Type': 'multipart/form-data; boundary=---------------------------31420230025845772252453285324',
      Origin: 'https://httpbin.org',
      'Content-Length': '362',
      DNT: '1',
      Connection: 'keep-alive',
      TE: 'Trailers'
    },
    body: '-----------------------------31420230025845772252453285324\r\nContent-Disposition: form-data; name="text"\r\n\r\na text value\r\n-----------------------------31420230025845772252453285324\r\nContent-Disposition: form-data; name="file"; filename="blob"\r\nContent-Type: application/octet-stream\r\n\r\nHello World!\n\r\n-----------------------------31420230025845772252453285324--\r\n'
  }, {
    method: 'GET',
    origin: 'https://httpbin.org',
    path: '/get?from=10&size=20&sort=+name',
    headers: {
      Host: 'httpbin.org',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0',
      Accept: '*/*',
      'Accept-Language': 'fr,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://httpbin.org/',
      DNT: '1',
      Connection: 'keep-alive',
      TE: 'Trailers'
    }
  }])

  t.strictSame(requetsPerOrigin.get('https://github.com'), [{
    method: 'POST',
    origin: 'https://github.com',
    path: '/',
    headers: {
      Host: 'github.com',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0',
      Accept: '*/*',
      'Accept-Language': 'fr,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://github.com/',
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: 'https://github.com',
      'Content-Length': '27',
      DNT: '1',
      Connection: 'keep-alive',
      TE: 'Trailers'
    },
    body: 'text=a+text+value&number=10'
  }])
  t.end()
})
