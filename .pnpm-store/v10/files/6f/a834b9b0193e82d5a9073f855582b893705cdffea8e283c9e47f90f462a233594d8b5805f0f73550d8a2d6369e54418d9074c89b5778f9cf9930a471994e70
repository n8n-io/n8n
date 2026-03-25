'use strict';
describe('basic mark in large documents', function() {
  var $ctx, err, start, end, diff;

  var browser = {
    isIe: function() {
      return navigator.appVersion.indexOf('MSIE') != -1;
    },
    navigator: navigator.appVersion,
    getVersion: function() {
      var version = 999; // we assume a sane browser
      if (navigator.appVersion.indexOf('MSIE') != -1) {
        version = parseFloat(navigator.appVersion.split('MSIE')[1]);
      }
      return version;
    }
  };
  var time = browser.isIe() && browser.getVersion() <= 9 ? 30000 : 10000;

  beforeEach(function(done) {
    loadFixtures('basic/large-document.html');

    $ctx = $('.basic-large-document');
    err = false;
    start = new Date();
    try {
      new Mark($ctx[0]).mark('lorem', {
        'diacritics': false,
        'separateWordSearch': false,
        'done': function() {
          end = new Date();
          diff = end.getTime() - start.getTime();
          done();
        }
      });
    } catch (e) {
      err = true;
    }
  }, 60000);

  it('should not throw a recursion error', function() {
    expect(err).toBe(false);
  });
  it('should wrap matches', function() {
    expect($ctx.find('mark')).toHaveLength(9569);
  });
  it('should be faster than ' + time + ' ms', function() {
    expect(diff).toBeLessThan(time);
  });
});
