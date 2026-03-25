
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_nodeelementnodeattributes";
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
    Retrieve the third "acronym" element and evaluate Node.attributes.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-84CF096
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=236
* @see http://lists.w3.org/Archives/Public/www-dom-ts/2003Jun/0011.html
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=184
*/
function hc_nodeelementnodeattributes() {
   var success;
    if(checkInitialization(builder, "hc_nodeelementnodeattributes") != null) return;
    var doc;
      var elementList;
      var testAddr;
      var addrAttr;
      var attrNode;
      var attrName;
      var attrList = new Array();

      htmlExpected = new Array();
      htmlExpected[0] = "title";
      htmlExpected[1] = "class";

      expected = new Array();
      expected[0] = "title";
      expected[1] = "class";
      expected[2] = "dir";

      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      elementList = doc.getElementsByTagName("acronym");
      testAddr = elementList.item(2);
      addrAttr = testAddr.attributes;

      for(var indexN10070 = 0;indexN10070 < addrAttr.length; indexN10070++) {
      attrNode = addrAttr.item(indexN10070);
      attrName = attrNode.name;

      attrList[attrList.length] = attrName;

	}
   
	if(
	
	(builder.contentType == "text/html")

	) {
	assertEqualsCollection("attrNames_html",toLowerArray(htmlExpected),toLowerArray(attrList));
       
	}
	
		else {
			assertEqualsCollection("attrNames",expected,attrList);
       
		}
	
}




function runTest() {
   hc_nodeelementnodeattributes();
}
