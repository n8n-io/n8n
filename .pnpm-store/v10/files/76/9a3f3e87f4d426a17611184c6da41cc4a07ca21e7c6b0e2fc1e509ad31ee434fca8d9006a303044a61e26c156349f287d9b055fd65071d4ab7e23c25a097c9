var xhr, xmlDocumentConstructor;
QUnit.module( "readyState handling", {
  beforeEach: function( assert ) {
    xhr = new FakeXMLHttpRequest();
  },
  afterEach: function( assert ) {
    xhr = undefined;
  }
} );

QUnit.test( "does not call onload and loadend if readyState not UNSENT or DONE", function( assert ) {
  var wasCalled = 0;

  xhr.onload = function() {
    wasCalled += 1;
  };
  xhr.onloadend = function( ev ) {
    wasCalled += 1;
  };

  [
    FakeXMLHttpRequest.OPENED,
    FakeXMLHttpRequest.HEADERS_RECEIVED,
    FakeXMLHttpRequest.LOADING
  ].forEach( function( state ) {
    xhr._readyStateChange( state );
  } );

  assert.strictEqual( wasCalled, 0 );
} );
