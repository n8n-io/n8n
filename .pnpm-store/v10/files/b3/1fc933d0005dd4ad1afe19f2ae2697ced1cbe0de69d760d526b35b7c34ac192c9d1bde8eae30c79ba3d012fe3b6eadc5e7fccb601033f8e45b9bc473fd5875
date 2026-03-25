var xhr, xmlDocumentConstructor;
QUnit.module( "responding", {
  beforeEach: function( assert ) {
    xhr = new FakeXMLHttpRequest();
    xmlDocumentConstructor = makeXMLDocument().constructor;
  },
  afterEach: function( assert ) {
    xhr = undefined;
    xmlDocumentConstructor = undefined;
  }
} );

// Different browsers report different constructors for XML Documents.
// Chrome 45.0.2454 and Firefox 40.0.0 report `XMLDocument`,
// PhantomJS 1.9.8 reports `Document`.
// Make a dummy xml document to determine what constructor to
// compare against in the tests below.
// This function is taken from `parseXML` in the src/
function makeXMLDocument() {
  var xmlDoc, text = "<some>xml</some>";

  if ( typeof DOMParser != "undefined" ) {
    var parser = new DOMParser();
    xmlDoc = parser.parseFromString( text, "text/xml" );
  } else {
    xmlDoc = new ActiveXObject( "Microsoft.XMLDOM" );
    xmlDoc.async = "false";
    xmlDoc.loadXML( text );
  }

  return xmlDoc;
}

QUnit.test( "defaults responseHeaders to {} if not passed", function( assert ) {
  xhr.respond( 200 );
  assert.deepEqual( xhr.responseHeaders, {} );
} );

QUnit.test( "sets responseHeaders", function( assert ) {
  xhr.respond( 200, { "Content-Type":"application/json" } );
  assert.deepEqual( xhr.responseHeaders, { "Content-Type":"application/json" } );
} );

QUnit.test( "sets body", function( assert ) {
  xhr.respond( 200, { "Content-Type":"application/json" }, JSON.stringify( { a: "key" } ) );
  assert.equal( xhr.responseText, '{"a":"key"}' );
  assert.equal( xhr.response, '{"a":"key"}' );
} );

QUnit.test( "parses the body if it's XML and no content-type is set", function( assert ) {
  xhr.respond( 200, {}, "<key>value</key>" );
  assert.equal( xhr.responseXML.constructor, xmlDocumentConstructor );
} );

QUnit.test( "parses the body if it's XML and xml content type is set", function( assert ) {
  xhr.respond( 200, { "Content-Type":"application/xml" }, "<key>value</key>" );
  assert.equal( xhr.responseXML.constructor, xmlDocumentConstructor );
} );

QUnit.test( "does not parse the body if it's XML and another content type is set", function( assert ) {
  xhr.respond( 200, { "Content-Type":"application/json" }, "<key>value</key>" );
  assert.equal( xhr.responseXML, undefined );
} );

QUnit.test( "calls the onload callback once", function( assert ) {
  var wasCalled = 0;

  xhr.onload = function( ev ) {
    wasCalled += 1;
  };

  xhr.respond( 200, {}, "" );

  assert.strictEqual( wasCalled, 1 );
} );

QUnit.test( "calls the onloadend callback once", function( assert ) {
  var wasCalled = 0;

  xhr.onloadend = function( ev ) {
    wasCalled += 1;
  };

  xhr.respond( 200, {}, "" );

  assert.strictEqual( wasCalled, 1 );
} );

QUnit.test( "passes event target as context to onload", function( assert ) {
  var context;
  var event;

  xhr.onload = function( ev ) {
    event = ev;
    context = this;
  };

  xhr.respond( 200, {}, "" );

  assert.deepEqual( context, event.target );
} );

QUnit.test( "calls onreadystatechange for each state change", function( assert ) {
  var states = [];

  xhr.onreadystatechange = function() {
    states.push( this.readyState );
  };

  xhr.open( "get", "/some/url" );

  xhr.respond( 200, {}, "" );

  var expectedStates = [
    FakeXMLHttpRequest.OPENED,
    FakeXMLHttpRequest.HEADERS_RECEIVED,
    FakeXMLHttpRequest.LOADING,
    FakeXMLHttpRequest.DONE
  ];
  assert.deepEqual( states, expectedStates );
} );

QUnit.test( "passes event to onreadystatechange", function( assert ) {
  var event = null;
  xhr.onreadystatechange = function( e ) {
    event = e;
  };
  xhr.open( "get", "/some/url" );
  xhr.respond( 200, {}, "" );

  assert.ok( event && event.type === "readystatechange",
     'passes event with type "readystatechange"' );
} );

QUnit.test( "overrideMimeType overrides content-type responseHeader", function( assert ) {
  xhr.overrideMimeType( "text/plain" );
  xhr.respond( 200, { "Content-Type":"application/json" } );
  assert.deepEqual( xhr.responseHeaders, { "Content-Type":"text/plain" } );
} );

QUnit.test( "parses the body if it's XML and overrideMimeType is set to xml", function( assert ) {
  xhr.overrideMimeType( "application/xml" );
  xhr.respond( 200, { "Content-Type":"text/plain" }, "<key>value</key>" );
  assert.equal( xhr.responseXML.constructor, xmlDocumentConstructor );
} );

QUnit.test( "does not parse the body if it's XML and overrideMimeType is set to another content type", function( assert ) {
  xhr.overrideMimeType( "text/plain" );
  xhr.respond( 200, { "Content-Type":"application/xml" }, "<key>value</key>" );
  assert.equal( xhr.responseXML, undefined );
} );
