
/*
Copyright Â© 2001-2004 World Wide Web Consortium, 
(Massachusetts Institute of Technology, European Research Consortium 
for Informatics and Mathematics, Keio University). All 
Rights Reserved. This work is distributed under the W3CÂ® Software License [1] in the 
hope that it will be useful, but WITHOUT ANY WARRANTY; without even 
the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 

[1] http://www.w3.org/Consortium/Legal/2002/copyright-software-20021231
*/



   /**
    *  Gets URI that identifies the test.
    *  @return uri identifier of test
    */
function getTargetURI() {
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_elementretrieveallattributes";
   }

var docsLoaded = -1000000;
var builder = null;

//
//   This function is called by the testing framework before
//      running the test suite.
//
//   If there are no configuration exceptions, asynchronous
//        document loading is started.  Otherwise, the status
//        is set to complete and the exception is immediately
//        raised when entering the body of the test.
//
function setUpPage() {
   setUpPageStatus = 'running';
   try {
     //
     //   creates test document builder, may throw exception
     //
     builder = createConfiguredBuilder();

      docsLoaded = 0;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      docsLoaded += preload(docRef, "doc", "hc_staff");
        
       if (docsLoaded == 1) {
          setUpPageStatus = 'complete';
       }
    } catch(ex) {
    	catchInitializationError(builder, ex);
        setUpPageStatus = 'complete';
    }
}



//
//   This method is called on the completion of 
//      each asychronous load started in setUpTests.
//
//   When every synchronous loaded document has completed,
//      the page status is changed which allows the
//      body of the test to be executed.
function loadComplete() {
    if (++docsLoaded == 1) {
        setUpPageStatus = 'complete';
    }
}


/**
* 
   Create a list of all the attributes of the last child
   of the first "p" element by using the "getAttributes()"
   method.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-84CF096
* @see http://lists.w3.org/Archives/Public/www-dom-ts/2002Mar/0002.html
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=184
*/
function hc_elementretrieveallattributes() {
   var success;
    if(checkInitialization(builder, "hc_elementretrieveallattributes") != null) return;
    var doc;
      var addressList;
      var testAddress;
      var attributes;
      var attribute;
      var attributeName;
      var actual = new Array();

      htmlExpected = new Array();
      htmlExpected[0] = "title";

      expected = new Array();
      expected[0] = "title";
      expected[1] = "dir";

      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      addressList = doc.getElementsByTagName("acronym");
      testAddress = addressList.item(0);
      attributes = testAddress.attributes;

      for(var indexN1006B = 0;indexN1006B < attributes.length; indexN1006B++) {
      attribute = attributes.item(indexN1006B);
      attributeName = attribute.name;

      actual[actual.length] = attributeName;

	}
   
	if(
	
	(builder.contentType == "text/html")

	) {
	assertEqualsCollection("htmlAttributeNames",toLowerArray(htmlExpected),toLowerArray(actual));
       
	}
	
		else {
			assertEqualsCollection("attributeNames",toLowerArray(expected),toLowerArray(actual));
       
		}
	
}




function runTest() {
   hc_elementretrieveallattributes();
}
