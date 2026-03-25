
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_nodecloneattributescopied";
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
    Retrieve the second acronym element and invoke
    the cloneNode method.   The
    duplicate node returned by the method should copy the
    attributes associated with this node.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-84CF096
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=236
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=184
*/
function hc_nodecloneattributescopied() {
   var success;
    if(checkInitialization(builder, "hc_nodecloneattributescopied") != null) return;
    var doc;
      var elementList;
      var addressNode;
      var clonedNode;
      var attributes;
      var attributeNode;
      var attributeName;
      var result = new Array();

      htmlExpected = new Array();
      htmlExpected[0] = "class";
      htmlExpected[1] = "title";

      expected = new Array();
      expected[0] = "class";
      expected[1] = "title";
      expected[2] = "dir";

      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      elementList = doc.getElementsByTagName("acronym");
      addressNode = elementList.item(1);
      clonedNode = addressNode.cloneNode(false);
      attributes = clonedNode.attributes;

      for(var indexN10076 = 0;indexN10076 < attributes.length; indexN10076++) {
      attributeNode = attributes.item(indexN10076);
      attributeName = attributeNode.name;

      result[result.length] = attributeName;

	}
   
	if(
	
	(builder.contentType == "text/html")

	) {
	assertEqualsCollection("nodeNames_html",toLowerArray(htmlExpected),toLowerArray(result));
       
	}
	
		else {
			assertEqualsCollection("nodeNames",expected,result);
       
		}
	
}




function runTest() {
   hc_nodecloneattributescopied();
}
