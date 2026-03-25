var xhr;
QUnit.module( "setting unsafe header mirrors browser behavior and throws", {
  beforeEach: function( assert ) {
    xhr = new FakeXMLHttpRequest();
    xhr.open( "GET", "/" );
  },
  afterEach: function( assert ) {
    window.xhr = undefined;
  }
} );

QUnit.test( "Accept-Charset", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Accept-Charset", "..." );
  }, /Refused to set unsafe header.*Accept\-Charset/ );
} );

QUnit.test( "Accept-Encoding", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Accept-Encoding", "..." );
  }, /Refused to set unsafe header.*Accept\-Encoding/ );
} );

QUnit.test( "Connection", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Connection", "..." );
  }, /Refused to set unsafe header.*Connection/ );
} );

QUnit.test( "Content-Length", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Content\-Length", "..." );
  }, /Refused to set unsafe header.*Content\-Length/ );
} );

QUnit.test( "Cookie", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Cookie", "..." );
  }, /Refused to set unsafe header.*Cookie/ );
} );

QUnit.test( "Cookie2", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Cookie2", "..." );
  }, /Refused to set unsafe header.*Cookie2/ );
} );

QUnit.test( "Content-Transfer-Encoding", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Content-Transfer-Encoding", "..." );
  }, /Refused to set unsafe header.*Content\-Transfer\-Encoding/ );
} );

QUnit.test( "Date", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Date", "..." );
  }, /Refused to set unsafe header.*Date/ );
} );

QUnit.test( "Expect", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Expect", "..." );
  }, /Refused to set unsafe header.*Expect/ );
} );

QUnit.test( "Host", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Host", "..." );
  }, /Refused to set unsafe header.*Host/ );
} );

QUnit.test( "Keep-Alive", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Keep-Alive", "..." );
  }, /Refused to set unsafe header.*Keep-Alive/ );
} );

QUnit.test( "Referer", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Referer", "..." );
  }, /Refused to set unsafe header.*Referer/ );
} );

QUnit.test( "TE", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "TE", "..." );
  }, /Refused to set unsafe header.*TE/ );
} );

QUnit.test( "Trailer", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Trailer", "..." );
  }, /Refused to set unsafe header.*Trailer/ );
} );

QUnit.test( "Transfer-Encoding", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Transfer-Encoding", "..." );
  }, /Refused to set unsafe header.*Transfer\-Encoding/ );
} );

QUnit.test( "Upgrade", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Upgrade", "..." );
  }, /Refused to set unsafe header.*Upgrade/ );
} );

QUnit.test( "User-Agent", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "User-Agent", "..." );
  }, /Refused to set unsafe header.*User\-Agent/ );
} );

QUnit.test( "Via", function( assert ) {
  assert.throws( function() {
    xhr.setRequestHeader( "Via", "..." );
  }, /Refused to set unsafe header.*Via/ );
} );
