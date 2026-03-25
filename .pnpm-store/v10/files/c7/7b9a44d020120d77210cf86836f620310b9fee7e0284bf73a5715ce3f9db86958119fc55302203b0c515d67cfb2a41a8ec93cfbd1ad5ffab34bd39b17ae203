var upload;
var xhr;

QUnit.module( "upload", {
  beforeEach: function( assert ) {
    xhr = new FakeXMLHttpRequest();
    upload = xhr.upload;
  }
} );

QUnit.test( "the upload property of a fake xhr is defined", function( assert ) {
  assert.ok( upload );
} );

QUnit.test( "_progress triggers the onprogress event", function( assert ) {
  var event;
  upload.onprogress = function( e ) {
    event = e;
  };
  upload._progress( true, 10, 100 );
  assert.ok( event, "A progress event was fired" );
  assert.ok( event.lengthComputable, "ProgressEvent.lengthComputable" );
  assert.equal( event.loaded, 10, "ProgressEvent.loaded" );
  assert.equal( event.total, 100, "ProgressEvent.total" );
} );
