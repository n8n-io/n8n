var xhr;
QUnit.module( "open", {
  beforeEach: function( assert ) {
    xhr = new FakeXMLHttpRequest();
  },
  afterEach: function( assert ) {
    xhr = undefined;
  }
} );

QUnit.test( "open sets the method property", function( assert ) {
  xhr.open( "get", "/some/url" );
  assert.equal( xhr.method, "get" );
} );

QUnit.test( "open sets the url property", function( assert ) {
  xhr.open( "get", "/some/url" );
  assert.equal( xhr.url, "/some/url" );
} );

QUnit.test( "open sets the async property", function( assert ) {
  xhr.open( "get", "/some/url", false );
  assert.equal( xhr.async, false );
} );

QUnit.test( "open sets the async property to true if a boolean isn't passed", function( assert ) {
  xhr.open( "get", "/some/url", "whatisthisidontevent" );
  assert.equal( xhr.url, "/some/url", false );
} );

QUnit.test( "open sets the username property", function( assert ) {
  xhr.open( "get", "/some/url", true, "johndoe" );
  assert.equal( xhr.username, "johndoe" );
} );

QUnit.test( "open sets the password property", function( assert ) {
  xhr.open( "get", "/some/url", true, "johndoe", "password" );
  assert.equal( xhr.password, "password" );
} );

QUnit.test( "initializes the responseText as null", function( assert ) {
  xhr.open( "get", "/some/url" );
  assert.equal( xhr.responseText, null );
} );

QUnit.test( "initializes the response as null", function( assert ) {
  xhr.open( "get", "/some/url" );
  assert.equal( xhr.response, null );
} );

QUnit.test( "initializes the responseXML as null", function( assert ) {
  xhr.open( "get", "/some/url" );
  assert.equal( xhr.responseXML, null );
} );

QUnit.test( "initializes the responseURL as the opened url", function( assert ) {
  xhr.open( "get", "/some/url" );
  assert.equal( xhr.responseURL, "/some/url" );
} );

QUnit.test( "initializes the requestHeaders property as empty object", function( assert ) {
  xhr.open( "get", "/some/url" );
  assert.deepEqual( xhr.requestHeaders, {} );

} );

QUnit.test( "open sets the ready state to 1", function( assert ) {
  xhr.open( "get", "/some/url" );
  assert.equal( xhr.readyState, 1 );
} );

QUnit.test( "triggers the onreadystatechange event with OPENED readyState", function( assert ) {
  var readyState = null;

  xhr.onreadystatechange = function() {
    readyState = this.readyState;
  };

  xhr.open( "get", "/some/url" );

  assert.equal( readyState, FakeXMLHttpRequest.OPENED );
} );
