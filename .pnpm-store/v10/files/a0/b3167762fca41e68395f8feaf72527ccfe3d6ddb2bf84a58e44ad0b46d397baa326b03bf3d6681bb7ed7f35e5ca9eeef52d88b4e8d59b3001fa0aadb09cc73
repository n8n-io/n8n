var xhr;
QUnit.module( "aborting", {
  beforeEach: function( assert ) {
    xhr = new FakeXMLHttpRequest();
  },
  afterEach: function( assert ) {
    window.xhr = undefined;
  }
} );

QUnit.test( "sets aborted to true", function( assert ) {
  xhr.abort();
  assert.equal( xhr.aborted, true );
} );

QUnit.test( "sets responseText to null", function( assert ) {
  xhr.abort();
  assert.equal( xhr.responseText, null );
} );

QUnit.test( "sets response to null", function( assert ) {
  xhr.abort();
  assert.equal( xhr.response, null );
} );

QUnit.test( "sets errorFlag to true", function( assert ) {
  xhr.abort();
  assert.equal( xhr.errorFlag, true );
} );

QUnit.test( "sets requestHeaders to {}", function( assert ) {
  xhr.abort();
  assert.deepEqual( xhr.requestHeaders, {} );
} );

QUnit.test( "sets readyState to 0", function( assert ) {
  xhr.abort();
  assert.equal( xhr.readyState, 0 );
} );

QUnit.test( "calls the abort event", function( assert ) {
  var wasCalled = false;
  xhr.addEventListener( "abort", function() {
    wasCalled = true;
  } );

  xhr.abort();

  assert.ok( wasCalled );
} );

QUnit.test( "calls the onerror event", function( assert ) {
  var wasCalled = false;
  xhr.onerror = function() {
    wasCalled = true;
  };

  xhr.abort();

  assert.ok( wasCalled );
} );

QUnit.test( "does not call the onload event", function( assert ) {
  var wasCalled = false;
  xhr.onload = function() {
    wasCalled = true;
  };

  xhr.open( "POST", "/" );
  xhr.send( "data" );

  xhr.abort();

  assert.notOk( wasCalled );
} );

QUnit.test( "calls the loadend event", function( assert ) {
  var wasCalled = false;
  xhr.onloadend = function() {
    wasCalled = true;
  };

  xhr.open( "POST", "/" );
  xhr.send( "data" );

  xhr.abort();

  assert.ok( wasCalled );
} );
