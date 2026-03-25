var urljoin = require('../lib/url-join');
var assert = require('assert');

describe('url join', function () {
  it('should work for simple case', function () {
    urljoin('http://www.google.com/', 'foo/bar', '?test=123')
      .should.eql('http://www.google.com/foo/bar?test=123');
  });

  it('should work for simple case with new syntax', function () {
    urljoin(['http://www.google.com/', 'foo/bar', '?test=123'])
      .should.eql('http://www.google.com/foo/bar?test=123');
  });

  it('should work for hashbang urls', function () {
    urljoin(['http://www.google.com', '#!', 'foo/bar', '?test=123'])
      .should.eql('http://www.google.com/#!/foo/bar?test=123');
  });

  it('should be able to join protocol', function () {
    urljoin('http:', 'www.google.com/', 'foo/bar', '?test=123')
      .should.eql('http://www.google.com/foo/bar?test=123');
  });

  it('should be able to join protocol with slashes', function () {
    urljoin('http://', 'www.google.com/', 'foo/bar', '?test=123')
      .should.eql('http://www.google.com/foo/bar?test=123');
  });

  it('should remove extra slashes', function () {
    urljoin('http:', 'www.google.com///', 'foo/bar', '?test=123')
      .should.eql('http://www.google.com/foo/bar?test=123');
  });

  it('should not remove extra slashes in an encoded URL', function () {
    urljoin('http:', 'www.google.com///', 'foo/bar', '?url=http%3A//Ftest.com')
      .should.eql('http://www.google.com/foo/bar?url=http%3A//Ftest.com');

    urljoin('http://a.com/23d04b3/', '/b/c.html')
      .should.eql('http://a.com/23d04b3/b/c.html')
      .should.not.eql('http://a.com/23d04b3//b/c.html');
  });

  it('should support anchors in urls', function () {
    urljoin('http:', 'www.google.com///', 'foo/bar', '?test=123', '#faaaaa')
      .should.eql('http://www.google.com/foo/bar?test=123#faaaaa');
  });

  it('should support protocol-relative urls', function () {
    urljoin('//www.google.com', 'foo/bar', '?test=123')
      .should.eql('//www.google.com/foo/bar?test=123')
  });

  it('should support file protocol urls', function () {
    urljoin('file:/', 'android_asset', 'foo/bar')
      .should.eql('file://android_asset/foo/bar')

    urljoin('file:', '/android_asset', 'foo/bar')
      .should.eql('file://android_asset/foo/bar')
  });

  it('should support absolute file protocol urls', function () {
    urljoin('file:', '///android_asset', 'foo/bar')
      .should.eql('file:///android_asset/foo/bar')

    urljoin('file:///', 'android_asset', 'foo/bar')
      .should.eql('file:///android_asset/foo/bar')

    urljoin('file:///', '//android_asset', 'foo/bar')
      .should.eql('file:///android_asset/foo/bar')

    urljoin('file:///android_asset', 'foo/bar')
      .should.eql('file:///android_asset/foo/bar')
  });

  it('should merge multiple query params properly', function () {
    urljoin('http:', 'www.google.com///', 'foo/bar', '?test=123', '?key=456')
      .should.eql('http://www.google.com/foo/bar?test=123&key=456');

    urljoin('http:', 'www.google.com///', 'foo/bar', '?test=123', '?boom=value', '&key=456')
      .should.eql('http://www.google.com/foo/bar?test=123&boom=value&key=456');

    urljoin('http://example.org/x', '?a=1', '?b=2', '?c=3', '?d=4')
      .should.eql('http://example.org/x?a=1&b=2&c=3&d=4');
  });

  it('should merge slashes in paths correctly', function () {
    urljoin('http://example.org', 'a//', 'b//', 'A//', 'B//')
      .should.eql('http://example.org/a/b/A/B/');
  });

  it('should merge colons in paths correctly', function () {
    urljoin('http://example.org/', ':foo:', 'bar')
      .should.eql('http://example.org/:foo:/bar');
  });

  it('should merge just a simple path without URL correctly', function() {
    urljoin('/', 'test')
      .should.eql('/test');
  });

  it('should fail with segments that are not string', function() {
    assert.throws(() => urljoin(true),
                  /Url must be a string. Received true/);
    assert.throws(() => urljoin('http://blabla.com/', 1),
                  /Url must be a string. Received 1/);
    assert.throws(() => urljoin('http://blabla.com/', undefined, 'test'),
                  /Url must be a string. Received undefined/);
    assert.throws(() => urljoin('http://blabla.com/', null, 'test'),
                  /Url must be a string. Received null/);
    assert.throws(() => urljoin('http://blabla.com/', { foo: 123 }, 'test'),
                  /Url must be a string. Received \[object Object\]/);
  });

  it('should merge a path with colon properly', function(){
    urljoin('/users/:userId', '/cars/:carId')
      .should.eql('/users/:userId/cars/:carId');
  });

  it('should merge slashes in protocol correctly', function () {
    urljoin('http://example.org', 'a')
      .should.eql('http://example.org/a');
    urljoin('http:', '//example.org', 'a')
      .should.eql('http://example.org/a');
    urljoin('http:///example.org', 'a')
      .should.eql('http://example.org/a');
    urljoin('file:///example.org', 'a')
      .should.eql('file:///example.org/a');

    urljoin('file:example.org', 'a')
      .should.eql('file://example.org/a');

    urljoin('file:/', 'example.org', 'a')
      .should.eql('file://example.org/a');
    urljoin('file:', '/example.org', 'a')
      .should.eql('file://example.org/a');
    urljoin('file:', '//example.org', 'a')
      .should.eql('file://example.org/a');
  });

  it('should skip empty strings', function() {
    urljoin('http://foobar.com', '', 'test')
      .should.eql('http://foobar.com/test');
    urljoin('', 'http://foobar.com', '', 'test')
      .should.eql('http://foobar.com/test');
  });

  it('should return an empty string if no arguments are supplied', function() {
    urljoin().should.eql('');
  });
});
