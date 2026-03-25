var xhr;
QUnit.module( "event listeners", {
  beforeEach: function( assert ) {
    xhr = new FakeXMLHttpRequest();
  },
  afterEach: function( assert ) {
    window.xhr = undefined;
  }
} );

QUnit.test( "adding a listener", function( assert ) {
  var wasCalled = false;
  xhr.addEventListener( "somethingHappened", function() {
    wasCalled = true;
  } );

  xhr.dispatchEvent( { type: "somethingHappened" } );

  assert.ok( wasCalled, "the listener was called" );
} );

QUnit.test( "removing a listener", function( assert ) {
  var wasCalled = false;
  var listener = xhr.addEventListener( "somethingHappened", function() {
    wasCalled = true;
  } );

  xhr.dispatchEvent( { type: "somethingHappened" } );

  assert.ok( wasCalled, "the listener was called" );
} );
