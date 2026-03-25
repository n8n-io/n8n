var xhr;
QUnit.module( "FakeXMLHttpRequest construction", {
  beforeEach: function( assert ) {
    xhr = new FakeXMLHttpRequest();
  },
  afterEach: function( assert ) {
    xhr = undefined;
  }
} );

QUnit.test( "readyState is 0", function( assert ) {
  assert.equal( xhr.readyState, 0 );
} );

QUnit.test( "requestHeaders are {}", function( assert ) {
  assert.deepEqual( xhr.requestHeaders, {} );
} );

QUnit.test( "requestBody is null", function( assert ) {
  assert.equal( xhr.requestBody, null );
} );

QUnit.test( "status is 0", function( assert ) {
  assert.equal( xhr.status, 0 );
} );

QUnit.test( "statusText is empty", function( assert ) {
  assert.equal( xhr.status, "" );
} );

QUnit.test( "withCredentials is false", function( assert ) {
  assert.equal( xhr.withCredentials, false );
} );

QUnit.test( "onabort is null", function( assert ) {
  assert.equal( xhr.onabort, null );
});

QUnit.test( "onerror is null", function( assert ) {
  assert.equal( xhr.onerror, null );
});

QUnit.test( "onload is null", function( assert ) {
  assert.equal( xhr.onload, null );
});

QUnit.test( "onloadend is null", function( assert ) {
  assert.equal( xhr.onloadend, null );
});

QUnit.test( "onloadstart is null", function( assert ) {
  assert.equal( xhr.onloadstart, null );
});

QUnit.test( "onprogress is null", function( assert ) {
  assert.equal( xhr.onprogress, null );
});

QUnit.test( "onreadystatechange is null", function( assert ) {
  assert.equal( xhr.onreadystatechange, null );
});

QUnit.test( "ontimeout is null", function( assert ) {
  assert.equal( xhr.ontimeout, null );
});
