/*
Copyright (c) 2001-2005 World Wide Web Consortium,
(Massachusetts Institute of Technology, Institut National de
Recherche en Informatique et en Automatique, Keio University). All
Rights Reserved. This program is distributed under the W3C's Software
Intellectual Property License. This program is distributed in the
hope that it will be useful, but WITHOUT ANY WARRANTY; without even
the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
PURPOSE.
See W3C License http://www.w3.org/Consortium/Legal/ for more details.
*/

function assertSize(descr, expected, actual) {
  var actualSize;
  assertNotNull(descr, actual);
  actualSize = actual.length;
  assertEquals(descr, expected, actualSize);
}

function assertEqualsAutoCase(context, descr, expected, actual) {
  if (builder.contentType == "text/html") {
    if(context == "attribute") {
      assertEquals(descr, expected.toLowerCase(), actual.toLowerCase());
    } 
    else {
      assertEquals(descr, expected.toUpperCase(), actual);
    }
  } 
  else {
    assertEquals(descr, expected, actual); 
  }
}


  function assertEqualsCollectionAutoCase(context, descr, expected, actual) {
  //
  // if they aren't the same size, they aren't equal
  assertEquals(descr, expected.length, actual.length);

  //
  // if there length is the same, then every entry in the expected list
  // must appear once and only once in the actual list
  var expectedLen = expected.length;
  var expectedValue;
  var actualLen = actual.length;
  var i;
  var j;
  var matches;
  for(i = 0; i < expectedLen; i++) {
    matches = 0;
    expectedValue = expected[i];
    for(j = 0; j < actualLen; j++) {
      if (builder.contentType == "text/html") {
        if (context == "attribute") {
          if (expectedValue.toLowerCase() == actual[j].toLowerCase()) {
            matches++;
          }
        }
        else {
          if (expectedValue.toUpperCase() == actual[j]) {
            matches++;
          }
        }
      } 
      else {
        if(expectedValue == actual[j]) {
            matches++;
        }
      }
    }
    if(matches == 0) {
      assert(descr + ": No match found for " + expectedValue,false);
    }
    if(matches > 1) {
      assert(descr + ": Multiple matches found for " + expectedValue, false);
    }
  }
}

function assertEqualsCollection(descr, expected, actual) {
  //
  // if they aren't the same size, they aren't equal
  assertEquals(descr, expected.length, actual.length);
  //
  // if there length is the same, then every entry in the expected list
  // must appear once and only once in the actual list
  var expectedLen = expected.length;
  var expectedValue;
  var actualLen = actual.length;
  var i;
  var j;
  var matches;
  for(i = 0; i < expectedLen; i++) {
    matches = 0;
    expectedValue = expected[i];
    for(j = 0; j < actualLen; j++) {
      if(expectedValue == actual[j]) {
        matches++;
      }
    }
    if(matches == 0) {
      assert(descr + ": No match found for " + expectedValue,false);
    }
    if(matches > 1) {
      assert(descr + ": Multiple matches found for " + expectedValue, false);
    }
  }
}


function assertEqualsListAutoCase(context, descr, expected, actual) {
  var minLength = expected.length;
  if (actual.length < minLength) {
    minLength = actual.length;
  }
  //
  for(var i = 0; i < minLength; i++) {
    assertEqualsAutoCase(context, descr, expected[i], actual[i]);
  }
  //
  // if they aren't the same size, they aren't equal
  assertEquals(descr, expected.length, actual.length);
}

function assertEqualsList(descr, expected, actual) {
  var minLength = expected.length;
  if (actual.length < minLength) {
    minLength = actual.length;
  }
  //
  for(var i = 0; i < minLength; i++) {
    if(expected[i] != actual[i]) {
      assertEquals(descr, expected[i], actual[i]);
    }
  }
  //
  // if they aren't the same size, they aren't equal
  assertEquals(descr, expected.length, actual.length);
}

function assertInstanceOf(descr, type, obj) {
  if(type == "Attr") {
    assertEquals(descr,2,obj.nodeType);
    var specd = obj.specified;
  }
}

function assertSame(descr, expected, actual) {
  if(expected != actual) {
    assertEquals(descr, expected.nodeType, actual.nodeType);
    assertEquals(descr, expected.nodeValue, actual.nodeValue);
  }
}

function assertURIEquals(assertID, scheme, path, host, file, name, query, fragment, isAbsolute, actual) {
  //
  // URI must be non-null
  assertNotNull(assertID, actual);

  var uri = actual;

  var lastPound = actual.lastIndexOf("#");
  var actualFragment = "";
  if(lastPound != -1) {
    //
    //  substring before pound
    //
    uri = actual.substring(0,lastPound);
    actualFragment = actual.substring(lastPound+1);
  }
  if(fragment != null) assertEquals(assertID,fragment, actualFragment);

  var lastQuestion = uri.lastIndexOf("?");
  var actualQuery = "";
  if(lastQuestion != -1) {
    //
    //  substring before pound
    //
    uri = actual.substring(0,lastQuestion);
    actualQuery = actual.substring(lastQuestion+1);
  }
  if(query != null) assertEquals(assertID, query, actualQuery);

  var firstColon = uri.indexOf(":");
  var firstSlash = uri.indexOf("/");
  var actualPath = uri;
  var actualScheme = "";
  if(firstColon != -1 && firstColon < firstSlash) {
    actualScheme = uri.substring(0,firstColon);
    actualPath = uri.substring(firstColon + 1);
  }

  if(scheme != null) {
    assertEquals(assertID, scheme, actualScheme);
  }

  if(path != null) {
    assertEquals(assertID, path, actualPath);
  }

  if(host != null) {
    var actualHost = "";
    if(actualPath.substring(0,2) == "//") {
      var termSlash = actualPath.substring(2).indexOf("/") + 2;
      actualHost = actualPath.substring(0,termSlash);
    }
    assertEquals(assertID, host, actualHost);
  }

  if(file != null || name != null) {
    var actualFile = actualPath;
    var finalSlash = actualPath.lastIndexOf("/");
    if(finalSlash != -1) {
      actualFile = actualPath.substring(finalSlash+1);
    }
    if (file != null) {
      assertEquals(assertID, file, actualFile);
    }
    if (name != null) {
      var actualName = actualFile;
      var finalDot = actualFile.lastIndexOf(".");
      if (finalDot != -1) {
        actualName = actualName.substring(0, finalDot);
      }
      assertEquals(assertID, name, actualName);
    }
  }

  if(isAbsolute != null) {
    assertEquals(assertID + ' ' + actualPath, isAbsolute, actualPath.substring(0,1) == "/");
  }
}


// size() used by assertSize element
function size(collection) {
  return collection.length;
}

function same(expected, actual) {
  return expected === actual;
}

function getSuffix(contentType) {
  switch(contentType) {
    case "text/html":
    return ".html";

    case "text/xml":
    return ".xml";

    case "application/xhtml+xml":
    return ".xhtml";

    case "image/svg+xml":
    return ".svg";

    case "text/mathml":
    return ".mml";
  }
  return ".html";
}

function equalsAutoCase(context, expected, actual) {
  if (builder.contentType == "text/html") {
    if (context == "attribute") {
      return expected.toLowerCase() == actual;
    }
    return expected.toUpperCase() == actual;
  }
  return expected == actual;
}

function catchInitializationError(blder, ex) {
  if (blder == null) {
    alert(ex);
  }
  else {
    blder.initializationError = ex;
    blder.initializationFatalError = ex;
  }
}

function checkInitialization(blder, testname) {
    if (blder.initializationError != null) {
        if (blder.skipIncompatibleTests) {
          info(testname + " not run:" + blder.initializationError);
          return blder.initializationError;
        }
        else {
          //
          //  if an exception was thrown
          //    rethrow it and do not run the test
            if (blder.initializationFatalError != null) {
            throw blder.initializationFatalError;
          } else {
            //
            //  might be recoverable, warn but continue the test
            warn(testname + ": " +  blder.initializationError);
          }
        }
    }
    return null;
}

function createTempURI(scheme) {
  if (scheme == "http") {
   return "http://localhost:8080/webdav/tmp" + Math.floor(Math.random() * 100000) + ".xml";
  }
  return "file:///tmp/domts" + Math.floor(Math.random() * 100000) + ".xml";
}


function EventMonitor() {
  this.atEvents = new Array();
  this.bubbledEvents = new Array();
  this.capturedEvents = new Array();
  this.allEvents = new Array();
}

EventMonitor.prototype.handleEvent = function(evt) {
    switch(evt.eventPhase) {
       case 1:
       monitor.capturedEvents[monitor.capturedEvents.length] = evt;
       break;
       
       case 2:
       monitor.atEvents[monitor.atEvents.length] = evt;
       break;

       case 3:
       monitor.bubbledEvents[monitor.bubbledEvents.length] = evt;
       break;
    }
    monitor.allEvents[monitor.allEvents.length] = evt;
}

function DOMErrorImpl(err) {
  this.severity = err.severity;
  this.message = err.message;
  this.type = err.type;
  this.relatedException = err.relatedException;
  this.relatedData = err.relatedData;
  this.location = err.location;
}



function DOMErrorMonitor() {
  this.allErrors = new Array();
}

DOMErrorMonitor.prototype.handleError = function(err) {
    errorMonitor.allErrors[errorMonitor.allErrors.length] = new DOMErrorImpl(err);
}

DOMErrorMonitor.prototype.assertLowerSeverity = function(id, severity) {
    var i;
    for (i = 0; i < errorMonitor.allErrors.length; i++) {
        if (errorMonitor.allErrors[i].severity >= severity) {
           assertEquals(id, severity - 1, errorMonitor.allErrors[i].severity);
        }
    }
}

function UserDataNotification(operation, key, data, src, dst) {
    this.operation = operation;
    this.key = key;
    this.data = data;
    this.src = src;
    this.dst = dst;
}

function UserDataMonitor() {
  this.allNotifications = new Array();
}

UserDataMonitor.prototype.handle = function(operation, key, data, src, dst) {
    userDataMonitor.allNotifications[this.allNotifications.length] =
         new UserDataNotification(operation, key, data, src, dst);
}




function checkFeature(feature, version)
{
  if (!builder.hasFeature(feature, version))
  {
    //
    //  don't throw exception so that users can select to ignore the precondition
    //
    builder.initializationError = "builder does not support feature " + feature + " version " + version;
  }
}

function preload(frame, varname, url) {
  return builder.preload(frame, varname, url);
}

function load(frame, varname, url) {
    return builder.load(frame, varname, url);
}

function getImplementationAttribute(attr) {
    return builder.getImplementationAttribute(attr);
}


function setImplementationAttribute(attribute, value) {
    builder.setImplementationAttribute(attribute, value);
}

function setAsynchronous(value) {
    if (builder.supportsAsyncChange) {
      builder.async = value;
    } else {
      update();
    }
}


function toLowerArray(src) {
   var newArray = new Array();
   var i;
   for (i = 0; i < src.length; i++) {
      newArray[i] = src[i].toLowerCase();
   }
   return newArray;
}

function getImplementation() {
    return builder.getImplementation();
}

function warn(msg) {
  //console.log(msg);
}
