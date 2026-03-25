
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_textparseintolistofelements";
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
    Retrieve the textual data from the last child of the 
    second employee.   That node is composed of two   
    EntityReference nodes and two Text nodes.   After
    the content node is parsed, the "acronym" Element
    should contain four children with each one of the
    EntityReferences containing one child.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-1451460987
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-11C98490
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-745549614
*/
function hc_textparseintolistofelements() {
   var success;
    if(checkInitialization(builder, "hc_textparseintolistofelements") != null) return;
    var doc;
      var elementList;
      var addressNode;
      var childList;
      var child;
      var value;
      var grandChild;
      var length;
      var result = new Array();

      expectedNormal = new Array();
      expectedNormal[0] = "β";
      expectedNormal[1] = " Dallas, ";
      expectedNormal[2] = "γ";
      expectedNormal[3] = "\n 98554";

      expectedExpanded = new Array();
      expectedExpanded[0] = "β Dallas, γ\n 98554";

      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      elementList = doc.getElementsByTagName("acronym");
      addressNode = elementList.item(1);
      childList = addressNode.childNodes;

      length = childList.length;

      for(var indexN1007C = 0;indexN1007C < childList.length; indexN1007C++) {
      child = childList.item(indexN1007C);
      value = child.nodeValue;

      
	if(
	
	(value == null)

	) {
	grandChild = child.firstChild;

      assertNotNull("grandChildNotNull",grandChild);
value = grandChild.nodeValue;

      result[result.length] = value;

	}
	
		else {
			result[result.length] = value;

		}
	
	}
   
	if(
	(1 == length)
	) {
	assertEqualsList("assertEqCoalescing",expectedExpanded,result);
       
	}
	
		else {
			assertEqualsList("assertEqNormal",expectedNormal,result);
       
		}
	
}




function runTest() {
   hc_textparseintolistofelements();
}
